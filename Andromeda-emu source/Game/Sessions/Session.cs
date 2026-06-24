

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Characters;
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
        private const int RX_CHUNK_SIZE = 8192;
        private const int RX_BUFFER_MAX = 1024 * 1024;

        private const byte DELIM_NULL = 0x00;
        private const byte DELIM_BS = (byte)'\\';
        private const byte DELIM_CHAR0 = (byte)'0';

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
        private int mMapId;
        private bool mMapAuthed;
        private bool mMapJoined;
        private bool mStopped;
        private bool mIsChat;
        private int mCurrentChatRoom;
        private bool mGlobalChatNoticeSent;
        private Session mReconnectHandoffTarget;
        private bool mReconnectHandoffPending;
        private double mLastReconnectHandoffTimestamp;

        public int Id => this.mId;

        public int CharacterId => this.mCharacterInfo != null ? this.mCharacterInfo.Id : 0;

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

        public bool Authenticated => this.mCharacterInfo != null && this.mAuthProcessed;

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
            if (incomingSession == null || object.ReferenceEquals(incomingSession, this))
                return false;

            Socket newSocket = incomingSession.DetachSocketForReconnectHandoff();
            if (newSocket == null)
                return false;

            Socket oldSocket = this.mSocket;
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
            this.mLastReconnectHandoffTimestamp = UnixTimestamp.GetCurrent();

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

        public void TryAuthenticate(string Ticket, string RemoteAddress)
        {
            Output.WriteLine((object)("[AUTH] TryAuthenticate sessionId=" + this.mId + " remote=" + RemoteAddress), OutputLevel.DebugInformation);
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                int CharacterId = SingleSignOnAuthenticator.TryAuthenticate(client, Ticket, RemoteAddress);
                if (CharacterId <= 0)
                {
                    Output.WriteLine((object)("[AUTH] Reject sessionId=" + this.mId + ": invalid SSO/ticket for remote=" + RemoteAddress), OutputLevel.Warning);
                    SessionManager.StopSession(this.mId);
                    return;
                }

                Session existingGameplaySession = SessionManager.GetSessionByCharacterId(CharacterId);
                if (existingGameplaySession != null && !object.ReferenceEquals(existingGameplaySession, this))
                {
                    if (existingGameplaySession.AttachSocketFromReconnect(this))
                    {
                        existingGameplaySession.CharacterInfo.AuthTicket = Ticket;
                        existingGameplaySession.CharacterInfo.TimestampLastOnline = UnixTimestamp.GetCurrent();
                        existingGameplaySession.CharacterInfo.Disconnected = false;
                        existingGameplaySession.mAuthProcessed = true;
                        SessionManager.RegisterAuthenticatedSession(existingGameplaySession);

                        this.mReconnectHandoffTarget = existingGameplaySession;
                        Output.WriteLine((object)("[AUTH] Reconnect handoff sessionId=" + this.mId + " -> sessionId=" + existingGameplaySession.Id + " charId=" + CharacterId), OutputLevel.DebugInformation);
                        SessionManager.StopSession(this.mId);
                        return;
                    }
                }

                CharacterInfo characterInfo = CharacterInfoLoader.GetCharacterInfo(client, CharacterId, this.mId, Ticket, true);
                if (characterInfo == null || !characterInfo.HasLinkedSession)
                {
                    Output.WriteLine((object)("[AUTH] Reject sessionId=" + this.mId + ": linked session invalid (charId=" + CharacterId + ", hasInfo=" + (characterInfo != null) + ", linkedSessionId=" + (characterInfo != null ? characterInfo.SessionId : 0) + ")"), OutputLevel.Warning);
                    SessionManager.StopSession(this.mId);
                    return;
                }

                this.mCharacterInfo = characterInfo;
                this.mCharacterInfo.TimestampLastOnline = UnixTimestamp.GetCurrent();
                CharacterResolverCache.AddToCache(this.mCharacterInfo.Id, this.mCharacterInfo.Username, true);
                this.mAuthProcessed = true;
                SessionManager.RegisterAuthenticatedSession(this);
                Output.WriteLine((object)("[AUTH] OK sessionId=" + this.mId + " charId=" + this.mCharacterInfo.Id), OutputLevel.DebugInformation);
            }
        }

        private void BeginReceive()
        {
            try
            {
                Socket socket = this.mSocket;
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
                SessionManager.StopSession(this.mId);
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
                SessionManager.StopSession(this.mId);
                return;
            }

            PerformanceProfiler.RecordNetworkReceiveBytes(ByteCount);
            this.ProcessData(this.mBuffer, 0, ByteCount);
            this.BeginReceive();
        }

        public void SendData(ServerMessage Message) => this.SendData(Message.ToDeltas());

        public void SendData(byte[] Data)
        {
            try
            {
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
                    SessionManager.StopSession(this.mId);
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

        private void ProcessData(byte[] Data, int Offset, int Count)
        {
            if (Data == null || Count <= 0) return;
            if (this.mSocket == null) return;

            lock (this.mRxBuffer)
            {
                for (int i = 0; i < Count; i++)
                    this.mRxBuffer.Add(Data[Offset + i]);

                if (this.mRxBuffer.Count - this.mRxHead > RX_BUFFER_MAX)
                {
                    Output.WriteLine((object)"[RX] Buffer overflow (>1MB). Closing session.", OutputLevel.Warning);
                    SessionManager.StopSession(this.mId);
                    return;
                }

                int delimIndex, delimLen;
                while (this.TryFindDelimiter(out delimIndex, out delimLen))
                {
                    int packetLength = delimIndex - this.mRxHead;

                    if (packetLength == 0)
                    {
                        this.mRxHead += delimLen;
                        this.CompactRxBufferIfNeeded();
                        continue;
                    }

                    PerformanceProfiler.RecordNetworkIncomingPacket(packetLength);
                    byte[] packetBytes = new byte[packetLength];
                    this.mRxBuffer.CopyTo(this.mRxHead, packetBytes, 0, packetLength);

                    this.mRxHead = delimIndex + delimLen;
                    this.CompactRxBufferIfNeeded();

                    if (packetBytes[0] == (byte)'<')
                    {
                        this.SendData(CrossdomainPolicy.GetBytes());
                        SessionManager.StopSession(this.mId);
                        return;
                    }

                    if (packetBytes[0] <= 0)
                    {
                        SessionManager.StopSession(this.mId);
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
                        SessionManager.StopSession(this.mId);
                        return;
                    }

                    if (Message == null) continue;

                    string currentHeader = "?";
                    try
                    {
                        currentHeader = Message.Header;
                        DataRouter.HandleData(this, Message);
                    }
                    catch (Exception ex)
                    {
                        Output.WriteLine((object)("Critical error in HandleData stack (header=" + currentHeader + ", remote=" + this.RemoteAddress + "): " + ex.Message + "\n\n" + ex.StackTrace), OutputLevel.CriticalError);
                        SessionManager.StopSession(this.mId);
                        return;
                    }
                }

                this.CompactRxBufferIfNeeded();
            }
        }

        public void Stop(SqlDatabaseClient MySqlClient)
        {
            if (this.Stopped) return;

            if (!this.StoppedPlayer
                && this.mCharacterInfo != null
                && !this.mCharacterInfo.Disconnected
                && this.mLastReconnectHandoffTimestamp > 0.0
                && UnixTimestamp.GetCurrent() - this.mLastReconnectHandoffTimestamp < 2.0)
                return;

            SessionManager.UnregisterAuthenticatedSession(this);

            try { this.mSocket.Close(); } catch { }
            this.mSocket = null;

            if (this.Authenticated)
                this.mCharacterInfo.SynchronizeStatistics(MySqlClient, 0);

            this.mStoppedTimestamp = UnixTimestamp.GetCurrent();
        }

        public void Dispose()
        {
            if (!this.Stopped)
                throw new InvalidOperationException("Cannot dispose of a session that has not been stopped");

            if (this.IsChat)
                ChatManager.RemovePlayerFromGlobalChannel(this);

            if (this.Authenticated)
            {
                SessionManager.UnregisterAuthenticatedSession(this);

                if (this.CurrentMapId > 0)
                    MapManager.RemoveUserFromMap(this);

                if (this.CharacterInfo != null)
                {
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
                    catch { }

                    try
                    {
                        this.CharacterInfo.FlushPendingSecondaryAmmoToDb();
                    }
                    catch { }

                    if (this.CharacterInfo.AmmoSyncTimer != null)
                    {
                        this.CharacterInfo.AmmoSyncTimer.Dispose();
                        this.CharacterInfo.AmmoSyncTimer = (Timer)null;
                    }
                    if (this.CharacterInfo.ConfigRefreshTimer != null)
                    {
                        this.CharacterInfo.ConfigRefreshTimer.Dispose();
                        this.CharacterInfo.ConfigRefreshTimer = (Timer)null;
                    }
                }
            }

            this.StoppedPlayer = true;
        }
    }
}
