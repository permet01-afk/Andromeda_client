

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Techs;
using OrbitReborn_Emulator.Game.Chat;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Sessions
{
    public class Session : IDisposable
    {
        public readonly TechRuntimeState TechState = new TechRuntimeState();
        internal bool HasPendingGameplayDeath
        {
            get { return !IsChat && CharacterInfo != null && !CharacterInfo.TdmDead && !CharacterInfo.DroneWearPersistenceBlocked
                && (CharacterInfo.DroneDeathPublishing || (!CharacterInfo.DeadCommitted && (CharacterInfo.PendingDroneDeath != null || (DroneLifeEpoch > 0 && CharacterInfo.ShipHp <= 0)))); }
        }
        public readonly string DroneGameplayToken = Guid.NewGuid().ToString("N");
        public long DroneLifeEpoch;
        public long TdmLifeGeneration; // Never persisted as a drone/ship life epoch.
        public ShipGameplayLease ShipLease;

        private const int RX_CHUNK_SIZE = 8192;
        private const int RX_BUFFER_MAX = 1024 * 1024;

        private const byte DELIM_NULL = 0x00;
        private const byte DELIM_BS = (byte)'\\';
        private const byte DELIM_CHAR0 = (byte)'0';

        // A packet may admit a death of another player while owning its sender's
        // lifecycle. Finish those deaths after releasing the sender, on this same
        // thread and before the next packet. Normal packets allocate no list.
        [ThreadStatic] private static bool mDispatchingPacket;
        [ThreadStatic] private static List<Action> mPacketCompletions;
        internal static bool IsDispatchingPacket { get { return mDispatchingPacket; } }
        internal static void CompleteAfterPacket(Action completion)
        {
            if (!mDispatchingPacket) { completion(); return; }
            if (mPacketCompletions == null) mPacketCompletions = new List<Action>();
            mPacketCompletions.Add(completion);
        }

        private sealed class SendState
        {
            public Socket Socket;
            public int Length;
        }

        private int mId;
        private Socket mSocket;
        private byte[] mBuffer;

        private readonly List<byte> mRxBuffer = new List<byte>(RX_CHUNK_SIZE);
        private int mRxHead;

        private CharacterInfo mCharacterInfo;
        private bool mPongOk;
        private double mStoppedTimestamp;
        private bool mAuthProcessed;
        private int mAdmissionCharacterId;
        private volatile bool mGameplayReady;
        private bool mRewardFailure;
        private volatile bool mInitializingGameplay;
        internal bool GameplayReady
        {
            get
            {
                // Map/tech setup needs the prepared actor on the admission thread.
                // Other threads cannot observe gameplay until initialization returns.
                return this.mGameplayReady && !this.mStopped
                    && (!this.mInitializingGameplay || Monitor.IsEntered(TechInventoryService.SyncRoot(this.CharacterId)));
            }
        }
        internal bool RetirementIncomplete { get { return this.mShutdownRetirementIncomplete; } }
        internal Socket CurrentTransport { get { return this.mSocket; } }
        private bool mShutdownRetirementIncomplete;
        private int mMapId;
        private bool mMapAuthed;
        private bool mMapJoined;
        private bool mStopped;
        private bool mIsChat;
        // Chat follows one gameplay transport, including its death dialogue.
        // These references are memory-only; no ticket or SQL lease is copied.
        private volatile object mChatAuthorityEpoch = new object();
        private volatile bool mChatAuthorityRevoked;
        private Session mChatGameplayOwner;
        private object mBoundChatAuthorityEpoch;
        private int mCurrentChatRoom;
        private bool mGlobalChatNoticeSent;
        private Session mReconnectHandoffTarget;
        private bool mReconnectHandoffPending;


        public int Id => this.mId;

        public int CharacterId => this.mCharacterInfo != null ? this.mCharacterInfo.Id : this.mAdmissionCharacterId;

        public string RemoteAddress
        {
            get
            {
                if (this.mSocket == null || !this.mSocket.Connected) return string.Empty;
                return this.mSocket.RemoteEndPoint.ToString().Split(':')[0];
            }
        }

        public double TimeStopped => UnixTimestamp.GetCurrent() - this.mStoppedTimestamp;

        public bool Stopped => this.mSocket == null;

        public bool StoppedPlayer
        {
            get { return this.mStopped; }
            set { this.mStopped = value; }
        }

        public Session ReconnectHandoffTarget
        {
            get { return this.mReconnectHandoffTarget; }
        }

        public bool ConsumeReconnectHandoffFlag()
        {
            bool result = this.mReconnectHandoffPending;
            this.mReconnectHandoffPending = false;
            return result;
        }

        public bool Authenticated => this.mCharacterInfo != null && this.mAuthProcessed && this.mCharacterInfo.RuntimeDataLoaded;

        public CharacterInfo CharacterInfo
        {
            get { return this.mCharacterInfo; }
            set { this.mCharacterInfo = value; }
        }

        public bool LatencyTestOk
        {
            get { return this.mPongOk; }
            set { this.mPongOk = value; }
        }

        public bool InMap => this.CurrentMapId > 0;

        public int CurrentMapId => (!this.mMapJoined || !this.mMapAuthed) ? 0 : this.mMapId;

        public int AbsoluteMapId
        {
            get { return this.mMapId; }
            set { this.mMapId = value; }
        }

        public bool MapAuthed
        {
            get { return this.mMapAuthed; }
            set { this.mMapAuthed = value; }
        }

        public bool MapJoined
        {
            get { return this.mMapJoined; }
            set { this.mMapJoined = value; }
        }

        public bool IsChat
        {
            get { return this.mIsChat; }
            set { this.mIsChat = value; }
        }

        // Input calls this under the player lifecycle. Output/lookup may read it
        // without acquiring another player's lifecycle while holding a channel.
        internal bool HasCurrentChatAuthority
        {
            get
            {
                Session owner = this.mChatGameplayOwner;
                return this.IsChat && !this.Stopped && !this.StoppedPlayer
                    && this.CharacterInfo != null && owner != null
                    && !owner.mChatAuthorityRevoked
                    && object.ReferenceEquals(this.mBoundChatAuthorityEpoch, owner.mChatAuthorityEpoch)
                    && object.ReferenceEquals(this.CharacterInfo, owner.CharacterInfo);
            }
        }

        // Caller holds the player's lifecycle and has rechecked the live ticket.
        internal bool TryBindChatAuthority(Session owner)
        {
            if (this.CharacterInfo != null || this.Stopped || this.StoppedPlayer
                || owner == null || owner.IsChat || owner.CharacterInfo == null
                || !owner.Authenticated || !owner.GameplayReady || owner.Stopped || owner.StoppedPlayer
                || owner.mChatAuthorityRevoked)
                return false;
            this.mChatGameplayOwner = owner;
            this.mBoundChatAuthorityEpoch = owner.mChatAuthorityEpoch;
            this.CharacterInfo = owner.CharacterInfo;
            this.IsChat = true;
            return true;
        }

        public int CurrentChatRoom
        {
            get { return this.mCurrentChatRoom; }
            set { this.mCurrentChatRoom = value; }
        }

        public bool GlobalChatNoticeSent
        {
            get { return this.mGlobalChatNoticeSent; }
            set { this.mGlobalChatNoticeSent = value; }
        }

        public Session(int Id, Socket Socket)
        {
            this.mId = Id;
            this.mSocket = Socket;

            this.mBuffer = new byte[RX_CHUNK_SIZE];
            this.mPongOk = true;

            ConfigureSocket(this.mSocket);
        }

        // The manager publishes this fully initialized object before admitting
        // packets. A constructor callback must never observe a missing session.
        internal void StartReceiving()
        {
            if (!object.ReferenceEquals(SessionManager.GetSessionById(this.mId), this)) return;
            this.BeginReceive();
        }

        private static void ConfigureSocket(Socket socket)
        {
            if (socket == null)
                return;

            try
            {
                socket.NoDelay = true;
                socket.ReceiveBufferSize = RX_CHUNK_SIZE * 4;
                socket.SendBufferSize = RX_CHUNK_SIZE * 4;
                socket.Blocking = false;
            }
            catch { }
        }

        private Socket DetachSocketForReconnectHandoff()
        {
            Socket socket = this.mSocket;
            this.mSocket = null;
            this.mStoppedTimestamp = UnixTimestamp.GetCurrent();
            this.mStopped = true;
            return socket;
        }

        private bool AttachSocketFromReconnect(Session incomingSession)
        {
            if (incomingSession == null || object.ReferenceEquals(incomingSession, this)
                || this.StoppedPlayer || this.CharacterInfo == null || this.CharacterInfo.Disconnected)
                return false;

            Socket newSocket = incomingSession.DetachSocketForReconnectHandoff();
            if (newSocket == null)
                return false;

            Socket oldSocket = this.mSocket;
            // A handoff keeps Session/CharacterInfo but replaces their transport.
            this.mChatAuthorityEpoch = new object();
            this.mChatAuthorityRevoked = false;
            this.mSocket = newSocket;
            ConfigureSocket(this.mSocket);
            SessionManager.CancelStopSession(this.mId);

            lock (this.mRxBuffer)
            {
                this.mRxBuffer.Clear();
                this.mRxHead = 0;
            }

            this.mBuffer = new byte[RX_CHUNK_SIZE];
            this.mStopped = false;
            this.mStoppedTimestamp = 0.0;
            this.mReconnectHandoffTarget = null;
            this.mReconnectHandoffPending = true;


            if (this.mCharacterInfo != null)
                this.mCharacterInfo.Disconnected = false;

            try
            {
                if (oldSocket != null && !object.ReferenceEquals(oldSocket, newSocket))
                    oldSocket.Close();
            }
            catch { }

            this.BeginReceive();
            return true;
        }

        public void TryAuthenticate(string Ticket, string RemoteAddress, Action<Session> initialize)
        {
            Output.WriteLine((object)("[AUTH] TryAuthenticate sessionId=" + this.mId + " remote=" + RemoteAddress), OutputLevel.DebugInformation);
            if (initialize == null) throw new ArgumentNullException("initialize");
            // LOGIN authenticates a new transport; replaying it on an admitted
            // transport must not replace its CharacterInfo and abandon dirty ammo.
            if (this.mAuthProcessed || this.CharacterInfo != null) return;
            int CharacterId;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                CharacterId = SingleSignOnAuthenticator.TryAuthenticate(client, Ticket, RemoteAddress);
                if (CharacterId <= 0)
                {
                    Output.WriteLine((object)("[AUTH] Reject sessionId=" + this.mId + ": invalid SSO/ticket for remote=" + RemoteAddress), OutputLevel.Warning);
                    SessionManager.StopSession(this.mId);
                    return;
                }

            }
                this.mAdmissionCharacterId = CharacterId;
                // Never retain a pool client while waiting for the player lifecycle.
                // Retirement, handoff and fresh loading still serialize for this player.
                lock (TechInventoryService.SyncRoot(CharacterId))
                {
                    if (SessionManager.IsShuttingDown || this.Stopped || this.StoppedPlayer) return;
                    Session existingGameplaySession = SessionManager.GetSessionForAdmission(CharacterId);
                    if (existingGameplaySession != null && !object.ReferenceEquals(existingGameplaySession, this))
                    lock (existingGameplaySession.CharacterInfo.DroneImpactSyncRoot)
                    {
                        if (existingGameplaySession.HasPendingGameplayDeath)
                        {
                            SessionManager.StopSession(this.mId);
                            return; // Retry after the admitted death has finished publishing.
                        }
                        object activeShip;
                        using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                        {
                            client.ClearParameters();
                            client.SetParameter("id", CharacterId);
                            activeShip = client.ExecuteScalar("SELECT shipid FROM users WHERE id=@id LIMIT 1");
                        }
                        bool sameShip = activeShip != null && activeShip != DBNull.Value
                            && Convert.ToInt32(activeShip) == existingGameplaySession.CharacterInfo.ShipId;
                        LocalRewardOperations.Drain(existingGameplaySession);
                        if (existingGameplaySession.GameplayReady && !existingGameplaySession.RetirementIncomplete && !existingGameplaySession.CharacterInfo.Destroy && !existingGameplaySession.CharacterInfo.DeadCommitted && !existingGameplaySession.CharacterInfo.Disconnected && sameShip
                            && existingGameplaySession.AttachSocketFromReconnect(this))
                        {
                            existingGameplaySession.CharacterInfo.AuthTicket = Ticket;
                            existingGameplaySession.CharacterInfo.TimestampLastOnline = UnixTimestamp.GetCurrent();
                            existingGameplaySession.mAuthProcessed = true;
                            this.mReconnectHandoffTarget = existingGameplaySession;
                            Output.WriteLine((object)("[AUTH] Reconnect handoff sessionId=" + this.mId + " -> sessionId=" + existingGameplaySession.Id + " charId=" + CharacterId), OutputLevel.DebugInformation);
                            SessionManager.StopSession(this.mId);
                            existingGameplaySession.InitializeGameplay(initialize);
                            return;
                        }
                        existingGameplaySession.EndGameplay(false);
                    }

                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                    CharacterInfo characterInfo;
                    try
                    {
                        this.ShipLease = ShipLifecycleService.BeginGameplay(CharacterId, this.DroneGameplayToken);
                        this.DroneLifeEpoch = this.ShipLease.Epoch;
                        characterInfo = CharacterInfoLoader.GetCharacterInfo(client, CharacterId, this.mId, Ticket, true);
                    }
                    catch
                    {
                        AbortIncompleteGameplay();
                        throw;
                    }
                    if (characterInfo == null || !characterInfo.HasLinkedSession)
                    {
                        AbortIncompleteGameplay();
                        Output.WriteLine((object)("[AUTH] Reject sessionId=" + this.mId + ": linked session invalid (charId=" + CharacterId + ", hasInfo=" + (characterInfo != null) + ", linkedSessionId=" + (characterInfo != null ? characterInfo.SessionId : 0) + ")"), OutputLevel.Warning);
                        SessionManager.StopSession(this.mId);
                        return;
                    }

                    this.mCharacterInfo = characterInfo;
                    this.mCharacterInfo.TimestampLastOnline = UnixTimestamp.GetCurrent();
                    CharacterResolverCache.AddToCache(this.mCharacterInfo.Id, this.mCharacterInfo.Username, true);
                    this.mAuthProcessed = true;

                    Output.WriteLine((object)("[AUTH] OK sessionId=" + this.mId + " charId=" + this.mCharacterInfo.Id), OutputLevel.DebugInformation);
                    }
                    InitializeGameplay(initialize);
                }
        }

        private void InitializeGameplay(Action<Session> initialize)
        {
            // Called while holding this player's lifecycle, without a borrowed SQL client.
            // A handoff reuses an already admitted world instance. Keep it
            // discoverable so one-shot callbacks can wait for this lifecycle.
            // Only a fresh, never-loaded actor must stay hidden during setup.
            bool alreadyLoaded = this.CharacterInfo != null && this.CharacterInfo.RuntimeDataLoaded;
            this.mInitializingGameplay = !alreadyLoaded;
            this.mGameplayReady = alreadyLoaded;
            try
            {
                initialize(this);
                if (!this.GameplayReady) throw new InvalidOperationException("Gameplay initialization did not become ready.");
            }
            catch
            {
                if (this.CharacterInfo != null && this.CharacterInfo.RuntimeDataLoaded)
                    EndGameplay(false); // A loaded character still owes its legitimate final flush.
                else
                    AbortIncompleteGameplay();
                throw;
            }
            finally { this.mInitializingGameplay = false; }
        }

        internal void MarkGameplayReady()
        {
            // This is a one-time admission check, not a timer or a gameplay poll.
            Socket socket = this.mSocket;
            if (socket == null || this.StoppedPlayer || !socket.Connected
                || (socket.Poll(0, SelectMode.SelectRead) && socket.Available == 0))
                throw new InvalidOperationException("Gameplay transport closed during initialization.");
            this.CharacterInfo.MarkRuntimeDataLoaded();
            this.mGameplayReady = true;
            SessionManager.RetirePreviousChatSessions(this);
            SessionManager.RegisterAuthenticatedSession(this);
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient()) MarkOnline(client, this.CharacterId);
            LocalRewardOperations.Open(this);
        }

        private void AbortIncompleteGameplay()
        {
            // No runtime snapshot is valid before MarkRuntimeDataLoaded.
            this.mGameplayReady = false;
            this.mAuthProcessed = false;
            this.mStopped = true;
            this.mStoppedTimestamp = UnixTimestamp.GetCurrent();
            Socket socket = this.mSocket;
            this.mSocket = null;
            try { if (socket != null) socket.Close(); } catch { }
            if (this.ShipLease != null)
                DroneWearService.EndGameplay(this.CharacterId, this.DroneGameplayToken);
            SessionManager.ForgetSession(this);
        }

        // Called under this actor's lifecycle by failed local reward work. No
        // persistent quarantine: the next accepted login reloads committed SQL.
        internal void FailRewardOperation(Exception error)
        {
            this.mRewardFailure = true;
            this.mGameplayReady = false;
            this.mShutdownRetirementIncomplete = true;
            Output.WriteLine("[NPC reward] player=" + this.CharacterId + " failed; no replay; runtime snapshot will not be saved: " + error, OutputLevel.CriticalError);
            SessionManager.StopSession(this.mId, this.mSocket);
        }

        private static void MarkOnline(SqlDatabaseClient client, int characterId)
        {
            client.ClearParameters();
            client.SetParameter("id", characterId);
            int affectedRows = client.ExecuteNonQuery("UPDATE users SET online=1 WHERE id=@id LIMIT 1");
            if (affectedRows != 1) throw new InvalidOperationException("Cannot publish gameplay online state.");
        }

        // A completed logout is terminal. Network reconnects may still hand off a
        // live world instance, but never an instance with an obsolete active ship.
        public void EndGameplay(bool confirmLogout)
        {
            if (this.IsChat || this.CharacterInfo == null)
            {
                Stop();
                Dispose();
                SessionManager.ForgetSession(this);
                return;
            }
            EndGameplayCore(confirmLogout, true);
        }

        private void EndGameplayCore(bool confirmLogout, bool strictAmmoFlush)
        {
            lock (TechInventoryService.SyncRoot(this.CharacterId))
            lock (this.CharacterInfo != null ? this.CharacterInfo.DroneImpactSyncRoot : TechInventoryService.SyncRoot(this.CharacterId))
            using (TechInventoryService.BeginTransition(this))
            {
                if ((this.StoppedPlayer && !(strictAmmoFlush && this.mShutdownRetirementIncomplete)) || this.CharacterInfo == null || this.HasPendingGameplayDeath) return;
                if (!this.CharacterInfo.RuntimeDataLoaded) { AbortIncompleteGameplay(); return; }
                // Normal retirement is terminal for this owner's chat. Committed
                // death deliberately does not pass here and preserves opened chat.
                this.mChatAuthorityRevoked = true;
                LocalRewardOperations.CloseAndDrain(this);
                this.mGameplayReady = false;
                if (strictAmmoFlush) this.mShutdownRetirementIncomplete = true;
                this.CharacterInfo.Disconnected = true;
                LaserVisualService.Remove(this);
                this.CharacterInfo.StopBoosterAutoRefresh();
                Socket socket = this.mSocket;
                this.mStoppedTimestamp = UnixTimestamp.GetCurrent();
                bool awaitingClientClose = false;
                try
                {
                    foreach (int id in (IEnumerable<int>)this.CharacterInfo.PlayerInRange.Keys)
                    {
                        Session other = SessionManager.GetSessionByCharacterId(id);
                        if (other == null || other.CharacterInfo == null) continue;
                        other.CharacterInfo.PlayerInRange.Remove(this.CharacterId);
                        other.SendData(MapUserLeaveComposer.Compose(this.CharacterId));
                    }
                    MapManager.RemoveUserFromMap(this);
                    TeamDeathMatch.BeforeDisconnect(this, confirmLogout);
                    DisposeCore(true, true, strictAmmoFlush); // Stop callbacks and flush pending ammo before acknowledging logout.
                    if (!this.mRewardFailure)
                        using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                            this.CharacterInfo.SynchronizeStatistics(client, 0);
                    DroneWearService.EndGameplay(this.CharacterId, this.DroneGameplayToken);
                    if (strictAmmoFlush) this.mShutdownRetirementIncomplete = false;
                    if (confirmLogout && socket != null && !this.mRewardFailure)
                    {
                        // Keep only the transport until the client processes the confirmation.
                        // StoppedPlayer already prevents lookup/handoff and any gameplay packet.
                        this.SendData(PacketComposer.Compose("l", ""));
                        awaitingClientClose = true;
                    }
                }
                finally
                {
                    if (!awaitingClientClose)
                    {
                        try { if (socket != null) socket.Close(); } catch { }
                        this.mSocket = null;
                        if (!strictAmmoFlush || !this.mShutdownRetirementIncomplete) SessionManager.ForgetSession(this);
                    }
                }
            }
        }

        // Called only after the durable death. Keep web authentication untouched.
        public void EndCommittedDeath(Action publishExplosion = null)
        {
            if (CharacterInfo == null || !CharacterInfo.DeadCommitted) throw new InvalidOperationException("Death is not committed.");
            LocalRewardOperations.CloseAndDrain(this);
            this.mGameplayReady = false;
            CharacterInfo.Disconnected = true;
            LaserVisualService.Remove(this);
            CharacterInfo.CanMove = false;
            CharacterInfo.SelectedPlayer = 0;
            CharacterInfo.KillStrek = 0;
            CharacterInfo.IsRepairing = false;
            if (CharacterInfo.PathTime != null) { CharacterInfo.PathTime.Dispose(); CharacterInfo.PathTime = null; }
            if (CharacterInfo.InvincibilityTimer != null) { CharacterInfo.InvincibilityTimer.Dispose(); CharacterInfo.InvincibilityTimer = null; }
            if (CharacterInfo.SpeedDebuffTimer != null) { CharacterInfo.SpeedDebuffTimer.Dispose(); CharacterInfo.SpeedDebuffTimer = null; }
            CharacterInfo.StopBoosterAutoRefresh();
            CharacterInfo.DroneDeathPublishing = false;
            CharacterInfo.PendingDroneDeath = null;
            GroupManager.SuspendDestroyedMember(this);
            if (CharacterInfo.UpdateGroupTimer != null) { CharacterInfo.UpdateGroupTimer.Dispose(); CharacterInfo.UpdateGroupTimer = null; }
            using (var db = SqlDatabaseManager.GetClient()) CharacterInfo.SynchronizeShipSkillCooldowns(db);
            Socket socket = mSocket;
            DisposeCore(true, true); // Stop callbacks, flush ammo, then remove the actor.
            try { if (publishExplosion != null) publishExplosion(); }
            catch (Exception ex) { Output.WriteLine("[Ship death] explosion publication failed: " + ex, OutputLevel.Warning); }
            DroneWearService.EndGameplay(CharacterId, DroneGameplayToken);
            // Flash's original death dialogue. HTML5 also understands this terminal signal.
            SendData(PacketComposer.Compose("ERR", "1"));
            mStoppedTimestamp = UnixTimestamp.GetCurrent();
            // SendData is asynchronous: allow the queued terminal packet to drain.
            System.Threading.Tasks.Task.Delay(1000).ContinueWith(_ =>
            {
                try { if (socket != null) socket.Close(); } catch { }
                if (ReferenceEquals(mSocket,socket)) mSocket = null;
                SessionManager.ForgetSession(this);
            });
        }

        private void BeginReceive()
        {
            if (SessionManager.IsShuttingDown) return;
            Socket socket = this.mSocket;
            try
            {
                if (socket == null) return;

                socket.BeginReceive(
                    this.mBuffer, 0, this.mBuffer.Length,
                    SocketFlags.None,
                    new AsyncCallback(this.OnReceiveData),
                    socket
                );
            }
            catch
            {
                SessionManager.StopSession(this.mId, socket);
            }
        }

        private void OnReceiveData(IAsyncResult Result)
        {
            int ByteCount = 0;
            Socket receiveSocket = Result.AsyncState as Socket;

            if (receiveSocket == null || !object.ReferenceEquals(receiveSocket, this.mSocket))
                return;

            try
            {
                ByteCount = receiveSocket.EndReceive(Result);
            }
            catch
            {
            }

            if (!object.ReferenceEquals(receiveSocket, this.mSocket))
                return;

            if (ByteCount < 1)
            {
                SessionManager.StopSession(this.mId, receiveSocket);
                return;
            }

            PerformanceProfiler.RecordNetworkReceiveBytes(ByteCount);
            this.ProcessData(this.mBuffer, 0, ByteCount, receiveSocket);
            if (object.ReferenceEquals(receiveSocket, this.mSocket)) this.BeginReceive();
        }

        public void SendData(ServerMessage Message) => this.SendData(Message.ToDeltas());

        public void SendData(byte[] Data)
        {
            try
            {
                // Broadcasts may hold a channel lock. Never close a chat or take
                // a player lifecycle here: only reject an obsolete binding.
                if (this.IsChat && !this.HasCurrentChatAuthority) return;
                Socket socket = this.mSocket;
                if (socket == null || !socket.Connected) return;

                int dataLength = Data.Length;
                SendState sendState = new SendState { Socket = socket, Length = dataLength };
                socket.BeginSend(Data, 0, dataLength, SocketFlags.None, new AsyncCallback(this.OnDataSent), sendState);
                PerformanceProfiler.RecordNetworkSend(dataLength);
            }
            catch (Exception ex)
            {
                Output.WriteLine((object)("[SND] Socket send failed!\n\n" + ex.StackTrace), OutputLevel.CriticalError);
            }
        }

        private void OnDataSent(IAsyncResult Result)
        {
            SendState sendState = Result.AsyncState as SendState;
            Socket sentSocket = sendState != null ? sendState.Socket : Result.AsyncState as Socket;
            if (sentSocket == null || !object.ReferenceEquals(sentSocket, this.mSocket))
            {
                if (sendState != null)
                    PerformanceProfiler.RecordNetworkSendCompleted(sendState.Length);
                return;
            }

            try
            {
                sentSocket.EndSend(Result);
            }
            catch
            {
                if (object.ReferenceEquals(sentSocket, this.mSocket))
                    SessionManager.StopSession(this.mId, sentSocket);
            }
            finally
            {
                if (sendState != null)
                    PerformanceProfiler.RecordNetworkSendCompleted(sendState.Length);
            }
        }

        private bool TryFindDelimiter(out int index, out int delimLen)
        {
            index = -1;
            delimLen = 0;

            int count = this.mRxBuffer.Count;
            for (int i = this.mRxHead; i < count; i++)
            {
                byte current = this.mRxBuffer[i];
                if (current == DELIM_NULL)
                {
                    index = i;
                    delimLen = 1;
                    return true;
                }

                if (current == DELIM_BS && i + 1 < count && this.mRxBuffer[i + 1] == DELIM_CHAR0)
                {
                    index = i;
                    delimLen = 2;
                    return true;
                }
            }

            return false;
        }

        private void CompactRxBufferIfNeeded()
        {
            if (this.mRxHead <= 0)
                return;

            if (this.mRxHead == this.mRxBuffer.Count)
            {
                this.mRxBuffer.Clear();
                this.mRxHead = 0;
                return;
            }

            if (this.mRxHead >= RX_CHUNK_SIZE)
            {
                this.mRxBuffer.RemoveRange(0, this.mRxHead);
                this.mRxHead = 0;
            }
        }

        private void ProcessData(byte[] Data, int Offset, int Count, Socket receiveSocket)
        {
            if (Data == null || Count <= 0 || !SessionManager.TryEnterDispatch()) return;
            try { ProcessDataCore(Data, Offset, Count, receiveSocket); }
            finally { SessionManager.ExitDispatch(); }
        }

        private void ProcessDataCore(byte[] Data, int Offset, int Count, Socket receiveSocket)
        {
            if (Data == null || Count <= 0) return;
            var packets = new List<byte[]>();
            lock (this.mRxBuffer)
            {
                if (!object.ReferenceEquals(receiveSocket, this.mSocket)) return;
                for (int i = 0; i < Count; i++) this.mRxBuffer.Add(Data[Offset + i]);
                if (this.mRxBuffer.Count - this.mRxHead > RX_BUFFER_MAX)
                {
                    Output.WriteLine((object)"[RX] Buffer overflow (>1MB). Closing session.", OutputLevel.Warning);
                    SessionManager.StopSession(this.mId, receiveSocket);
                    return;
                }
                int delimIndex, delimLen;
                while (this.TryFindDelimiter(out delimIndex, out delimLen))
                {
                    int length = delimIndex - this.mRxHead;
                    if (length > 0)
                    {
                        byte[] bytes = new byte[length];
                        this.mRxBuffer.CopyTo(this.mRxHead, bytes, 0, length);
                        packets.Add(bytes);
                        PerformanceProfiler.RecordNetworkIncomingPacket(length);
                    }
                    this.mRxHead = delimIndex + delimLen;
                    this.CompactRxBufferIfNeeded();
                }
                this.CompactRxBufferIfNeeded();
            }
            // Never wait for a player lifecycle lock while holding the receive buffer:
            // reconnect acquires that lock before replacing/clearing the old socket buffer.
            foreach (byte[] packetBytes in packets)
            {
                bool previousDispatch = mDispatchingPacket;
                List<Action> previousCompletions = mPacketCompletions;
                mDispatchingPacket = true;
                mPacketCompletions = null;
                try
                {
                lock (this.CharacterId > 0 ? TechInventoryService.SyncRoot(this.CharacterId) : this)
                {
                    if (SessionManager.IsShuttingDown || !object.ReferenceEquals(receiveSocket, this.mSocket) || this.StoppedPlayer) return;
                    if (packetBytes[0] == (byte)'<')
                    {
                        this.SendData(CrossdomainPolicy.GetBytes());
                        SessionManager.StopSession(this.mId, receiveSocket);
                        return;
                    }

                    if (packetBytes[0] <= 0)
                    {
                        SessionManager.StopSession(this.mId, receiveSocket);
                        return;
                    }

                    ClientMessage Message;
                    try
                    {
                        string packet = Encoding.UTF8.GetString(packetBytes);
                        Message = new ClientMessage(packet);
                        string header = Message.Header;
                    }
                    catch
                    {
                        SessionManager.StopSession(this.mId, receiveSocket);
                        return;
                    }

                    if (Message == null) continue;

                    string currentHeader = "?";
                    try
                    {
                        currentHeader = Message.Header;
                        if (this.CharacterInfo != null && !this.IsChat && !this.GameplayReady && currentHeader != "LOGIN")
                            return;
                        // The same lifecycle remains held through dispatch, so
                        // logout/handoff cannot slip between this check and a command.
                        if (this.IsChat && !this.HasCurrentChatAuthority)
                        {
                            SessionManager.StopSession(this.mId, receiveSocket);
                            return;
                        }
                        if (!this.IsChat && this.CharacterInfo != null && (this.CharacterInfo.Destroy || this.CharacterInfo.DeadCommitted))
                        {
                            if (!this.CharacterInfo.TdmDead || this.CharacterInfo.DeadCommitted) return;
                            // TDM death keeps its transport alive for FREE REPAIR/LEAVE.
                            // Ignore combat without discarding a later TDM packet in the same TCP read.
                            if (currentHeader != "TDM" && currentHeader != "PNG") continue;
                        }
                        DataRouter.HandleData(this, Message);
                    }
                    catch (Exception ex)
                    {
                        Output.WriteLine((object)("Critical error in HandleData stack (header=" + currentHeader + ", remote=" + this.RemoteAddress + "): " + ex.Message + "\n\n" + ex.StackTrace), OutputLevel.CriticalError);
                        SessionManager.StopSession(this.mId, receiveSocket);
                        return;
                    }
                }
                }
                finally
                {
                    List<Action> completions = mPacketCompletions;
                    mDispatchingPacket = previousDispatch;
                    mPacketCompletions = previousCompletions;
                    if (completions != null)
                    {
                        if (previousDispatch)
                        {
                            if (mPacketCompletions == null) mPacketCompletions = new List<Action>();
                            mPacketCompletions.AddRange(completions);
                        }
                        else foreach (Action completion in completions)
                        {
                            try { completion(); }
                            catch (Exception error)
                            {
                                // Keep other admitted deaths progressing, but report the
                                // failure and retire the sender rather than hiding it.
                                try { Output.WriteLine("[Packet completion] " + error, OutputLevel.CriticalError); }
                                catch (Exception loggingError)
                                {
                                    // A broken output sink must not strand other admitted deaths.
                                    try { Console.Error.WriteLine("[Packet completion] " + error + "; logging failed: " + loggingError.Message); }
                                    catch { }
                                }
                                SessionManager.StopSession(this.mId, receiveSocket);
                            }
                        }
                    }
                }
            }
        }

        internal void Shutdown()
        {
            object lifecycle = TechInventoryService.SyncRoot(this.CharacterId);
            lock (lifecycle)
            {
                while (true)
                {
                    lock (this.CharacterInfo != null ? this.CharacterInfo.DroneImpactSyncRoot : lifecycle)
                    {
                        if (!this.HasPendingGameplayDeath)
                        {
                            if (this.CharacterInfo != null && !this.IsChat && (!this.StoppedPlayer || this.mShutdownRetirementIncomplete))
                                EndGameplayCore(false, true);
                            else
                            {
                                // Terminal/fail-closed lives must never save old ship
                                // statistics, but their admitted ammo still must flush.
                                if (this.CharacterInfo != null && !this.IsChat)
                                {
                                    this.CharacterInfo.CloseAmmoConsumption();
                                    this.CharacterInfo.FlushPendingPrimaryAmmoToDb();
                                    this.CharacterInfo.FlushPendingSecondaryAmmoToDb();
                                }
                                StopCore();
                                DisposeCore(false, false, true);
                            }
                            try { if (this.mSocket != null) this.mSocket.Close(); } catch { }
                            this.mSocket = null;
                            SessionManager.ForgetSession(this);
                            return;
                        }
                        if (this.CharacterInfo.PendingDroneDeath == null && !this.CharacterInfo.DroneDeathPublishing)
                            throw new InvalidOperationException("Cannot complete shutdown: lethal life has no admitted death owner.");
                    }
                    // Release the lifecycle while its admitted death finishes.
                    // No impact lock, SQL lease, timeout or polling is retained.
                    Monitor.Wait(lifecycle);
                }
            }
        }

        public void Stop()
        {
            StopTransport(this.mSocket);
        }

        internal void StopTransport(Socket expectedSocket)
        {
            if (this == null) return;
            lock (TechInventoryService.SyncRoot(this.CharacterId))
            lock (this.CharacterInfo != null ? this.CharacterInfo.DroneImpactSyncRoot : TechInventoryService.SyncRoot(this.CharacterId))
            using (TechInventoryService.BeginTransition(this))
            {
                if (!object.ReferenceEquals(this.mSocket, expectedSocket)) return;
                StopCore();
            }
        }

        private void StopCore()
        {
            if (this.Stopped || (this.CharacterInfo != null && this.HasPendingGameplayDeath)) return;
            if (this.IsChat)
            {
                Socket chatSocket = this.mSocket;
                this.mSocket = null;
                this.mStoppedTimestamp = UnixTimestamp.GetCurrent();
                try { if (chatSocket != null) chatSocket.Close(); } catch { }
                return; // Chat may share CharacterInfo; never retire the game.
            }
            LocalRewardOperations.Drain(this);

            LaserVisualService.Remove(this);
            TeamDeathMatch.BeforeDisconnect(this, false);
            TechInventoryService.Suspend(this);
            SessionManager.UnregisterAuthenticatedSession(this);

            Socket stoppedSocket;
            lock (LocalRewardOperations.AdmissionGate)
            {
                stoppedSocket = this.mSocket;
                this.mSocket = null;
            }
            try { if (stoppedSocket != null) stoppedSocket.Close(); } catch { }

            if (this.Authenticated && !this.StoppedPlayer && !this.mRewardFailure)
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    this.mCharacterInfo.SynchronizeStatistics(client, 0);

            this.mStoppedTimestamp = UnixTimestamp.GetCurrent();
        }

        public void Dispose()
        {
            if (this == null) return;
            lock (TechInventoryService.SyncRoot(this.CharacterId))
            lock (this.CharacterInfo != null ? this.CharacterInfo.DroneImpactSyncRoot : TechInventoryService.SyncRoot(this.CharacterId))
            using (TechInventoryService.BeginTransition(this))
                DisposeCore();
        }

        private void DisposeCore(bool keepSocket = false, bool deferDroneRelease = false, bool strictAmmoFlush = false)
        {
            if ((this.StoppedPlayer && !(strictAmmoFlush && this.mShutdownRetirementIncomplete))
                || (this.CharacterInfo != null && this.HasPendingGameplayDeath)) return;
            if (!this.Stopped && !keepSocket)
                throw new InvalidOperationException("Cannot dispose of a session that has not been stopped");

            if (this.IsChat)
            {
                ChatManager.RemovePlayerFromGlobalChannel(this);
                ChatManager.RemovePlayerFromMMOChannel(this);
                ChatManager.RemovePlayerFromEICChannel(this);
                ChatManager.RemovePlayerFromVRUChannel(this);
                this.StoppedPlayer = true;
                return; // Do not close ammo/timers or release the gameplay lease.
            }
            LocalRewardOperations.CloseAndDrain(this);

            if (this.Authenticated)
            {
                TechInventoryService.Suspend(this);
                SessionManager.UnregisterAuthenticatedSession(this);

                if (this.CharacterInfo != null)
                {
                    this.CharacterInfo.CloseAmmoConsumption();
                    // Dispose is terminal; live reconnect keeps this Session/info
                    // and never reaches this cleanup through the anonymous socket.
                    this.CharacterInfo.ClearActiveShipSkill();
                    if (this.CharacterInfo.AmmoSyncTimer != null)
                    {
                        this.CharacterInfo.AmmoSyncTimer.Dispose();
                        this.CharacterInfo.AmmoSyncTimer = (Timer)null;
                    }
                    ShipMovement.StopMovementTracking(this);
                    if (this.CharacterInfo.LaserAttackTimer != null)
                    {
                        this.CharacterInfo.LaserAttackTimer.Dispose();
                        --TimerManager.TimerRunning;
                        this.CharacterInfo.LaserAttackTimer = (Timer)null;
                    }
                    if (this.CharacterInfo.WarningZoneTimer != null)
                    {
                        this.CharacterInfo.WarningZoneTimer.Dispose();
                        --TimerManager.TimerRunning;
                        this.CharacterInfo.WarningZoneTimer = (Timer)null;
                    }
                    if (this.CharacterInfo.RepairTimer != null)
                    {
                        this.CharacterInfo.RepairTimer.Dispose();
                        --TimerManager.TimerRunning;
                        this.CharacterInfo.RepairTimer = (Timer)null;
                    }
                    if (this.CharacterInfo.DisconnectTimer != null)
                    {
                        this.CharacterInfo.DisconnectTimer.Dispose();
                        --TimerManager.TimerRunning;
                        this.CharacterInfo.DisconnectTimer = (Timer)null;
                    }
                    if (this.CharacterInfo.LaserAttackCanTimer != null)
                    {
                        this.CharacterInfo.LaserAttackCanTimer.Dispose();
                        --TimerManager.TimerRunning;
                        this.CharacterInfo.LaserAttackCanTimer = (Timer)null;
                    }
                    if (this.CharacterInfo.PortalJumpTimer != null)
                    {
                        this.CharacterInfo.PortalJumpTimer.Dispose();
                        --TimerManager.TimerRunning;
                        this.CharacterInfo.PortalJumpTimer = (Timer)null;
                    }
                    if (this.CharacterInfo.RocketAttackTimer != null)
                    {
                        this.CharacterInfo.RocketAttackTimer.Dispose();
                        --TimerManager.TimerRunning;
                        this.CharacterInfo.RocketAttackTimer = (Timer)null;
                    }

                    this.CharacterInfo.WaitForLaserAttackTickToFinish(250);
                    try
                    {
                        this.CharacterInfo.FlushPendingPrimaryAmmoToDb();
                    }
                    catch { if (strictAmmoFlush || this.CharacterInfo.DeadCommitted) throw; }

                    try
                    {
                        this.CharacterInfo.FlushPendingSecondaryAmmoToDb();
                    }
                    catch { if (strictAmmoFlush || this.CharacterInfo.DeadCommitted) throw; }

                    if (this.CharacterInfo.ConfigRefreshTimer != null)
                    {
                        this.CharacterInfo.ConfigRefreshTimer.Dispose();
                        this.CharacterInfo.ConfigRefreshTimer = (Timer)null;
                    }
                }
            }

            if (this.Authenticated && this.CurrentMapId > 0)
                MapManager.RemoveUserFromMap(this);

            this.StoppedPlayer = true;
            if (!deferDroneRelease && this.Authenticated && !this.IsChat)
                DroneWearService.EndGameplay(this.CharacterId, this.DroneGameplayToken);
        }
    }
}
