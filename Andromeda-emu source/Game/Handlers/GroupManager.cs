using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Game.Handlers
{
    class GroupManager
    {
        private static Object thisLock = new Object();
        private static List<int> groupList = new List<int>();
        private static readonly object groupChatRoomLock = new Object();
        private static readonly Dictionary<int, int> groupChatRoomByMemberId = new Dictionary<int, int>();
        private static readonly Dictionary<int, int> groupInvitationBehaviorByMemberId = new Dictionary<int, int>();
        private static int nextGroupChatRoomId = 600000;

        private const int GROUP_MAX_SIZE = 5;
        private const int INVITATION_BEHAVIOR_BOSS_ONLY = 0;
        private const int INVITATION_BEHAVIOR_FREE_FOR_ALL = 1;
        private const int DEFAULT_INVITATION_BEHAVIOR = INVITATION_BEHAVIOR_FREE_FOR_ALL;
        private const int LOOT_MODE_RANDOM = 1;

        public GroupManager() { }

        private static List<int> GetGroupCharacterIds(Session session)
        {
            List<int> ids = new List<int>();
            if (session == null || session.CharacterInfo == null)
                return ids;
            if (session.CharacterId > 0 && !ids.Contains(session.CharacterId))
                ids.Add(session.CharacterId);
            foreach (int memberId in session.CharacterInfo.Members.Keys)
            {
                if (memberId > 0 && !ids.Contains(memberId))
                    ids.Add(memberId);
            }
            return ids;
        }

        private static int NormalizeInvitationBehavior(int behavior)
        {
            return behavior == INVITATION_BEHAVIOR_BOSS_ONLY
                ? INVITATION_BEHAVIOR_BOSS_ONLY
                : INVITATION_BEHAVIOR_FREE_FOR_ALL;
        }

        private static int GetGroupInvitationBehavior(List<int> memberIds)
        {
            if (memberIds != null)
            {
                lock (thisLock)
                {
                    foreach (int memberId in memberIds)
                    {
                        int behavior;
                        if (groupInvitationBehaviorByMemberId.TryGetValue(memberId, out behavior))
                            return NormalizeInvitationBehavior(behavior);
                    }
                }
            }
            return DEFAULT_INVITATION_BEHAVIOR;
        }

        private static void SetGroupInvitationBehavior(List<int> memberIds, int behavior)
        {
            if (memberIds == null)
                return;

            behavior = NormalizeInvitationBehavior(behavior);
            lock (thisLock)
            {
                foreach (int memberId in memberIds)
                {
                    if (memberId > 0)
                        groupInvitationBehaviorByMemberId[memberId] = behavior;
                }
            }
        }

        private static void ClearGroupInvitationBehavior(IEnumerable<int> memberIds)
        {
            if (memberIds == null)
                return;

            lock (thisLock)
            {
                foreach (int memberId in memberIds)
                    groupInvitationBehaviorByMemberId.Remove(memberId);
            }
        }

        private static void RememberGroupMember(int characterId)
        {
            if (characterId <= 0)
                return;

            lock (thisLock)
            {
                if (!groupList.Contains(characterId))
                    groupList.Add(characterId);
            }
        }

        private static void ForgetGroupMember(int characterId)
        {
            if (characterId <= 0)
                return;

            lock (thisLock)
            {
                groupList.Remove(characterId);
                groupInvitationBehaviorByMemberId.Remove(characterId);
            }
        }

        private static void SendInviteError(Session session, string code)
        {
            if (session != null && !string.IsNullOrEmpty(code))
                session.SendData(PacketComposer.Compose("ps", "inv|err|" + code));
        }

        private static string BuildInvitePayload(Session inviter, Session candidate)
        {
            int inviterShip = inviter != null && inviter.CharacterInfo != null ? inviter.CharacterInfo.ShipId : 0;
            int candidateShip = candidate != null && candidate.CharacterInfo != null ? candidate.CharacterInfo.ShipId : 0;

            return "inv|new|"
                + inviter.CharacterInfo.Id + "|" + inviter.CharacterInfo.Username + "|" + inviterShip + "|"
                + candidate.CharacterInfo.Id + "|" + candidate.CharacterInfo.Username + "|" + candidateShip;
        }

        private static void ClearInvitationBetween(Session inviter, Session candidate, string reason)
        {
            if (inviter == null || inviter.CharacterInfo == null || candidate == null || candidate.CharacterInfo == null)
                return;

            inviter.CharacterInfo.InvitationSend.Remove(candidate.CharacterInfo.Id);
            candidate.CharacterInfo.InvitationReceive.Remove(inviter.CharacterInfo.Id);

            string packet = "inv|del|" + reason + "|" + inviter.CharacterInfo.Id + "|" + candidate.CharacterInfo.Id;
            inviter.SendData(PacketComposer.Compose("ps", packet));
            candidate.SendData(PacketComposer.Compose("ps", packet));
        }

        private static bool IsGroupFull(Session session)
        {
            return GetGroupCharacterIds(session).Count >= GROUP_MAX_SIZE;
        }

        private static bool CanSessionInvite(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return false;

            List<int> memberIds = GetGroupCharacterIds(session);
            if (memberIds.Count <= 1)
                return true;

            int behavior = GetGroupInvitationBehavior(memberIds);
            return behavior == INVITATION_BEHAVIOR_FREE_FOR_ALL || session.CharacterInfo.GroupLeader;
        }

        private static void SyncMembersList(List<int> memberIds, int leaderId)
        {
            if (memberIds == null || memberIds.Count <= 0)
                return;

            int behavior = GetGroupInvitationBehavior(memberIds);
            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession == null || memberSession.CharacterInfo == null)
                    continue;

                memberSession.CharacterInfo.Members.Clear();
                foreach (int syncId in memberIds)
                {
                    if (syncId > 0)
                        memberSession.CharacterInfo.Members.Add(syncId);
                }
                memberSession.CharacterInfo.GroupLeader = memberId == leaderId;
                RememberGroupMember(memberId);
            }
            SetGroupInvitationBehavior(memberIds, behavior);
        }

        private static void BroadcastInvitationBehavior(List<int> memberIds)
        {
            if (memberIds == null || memberIds.Count <= 0)
                return;

            int behavior = GetGroupInvitationBehavior(memberIds);
            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession != null && memberSession.CharacterInfo != null)
                    memberSession.SendData(PacketComposer.Compose("ps", "chib|" + behavior));
            }
        }

        private static int EnsureGroupChatRoomId(List<int> memberIds)
        {
            if (memberIds == null || memberIds.Count < 2)
                return 0;
            lock (groupChatRoomLock)
            {
                int existingRoomId;
                foreach (int memberId in memberIds)
                {
                    if (groupChatRoomByMemberId.TryGetValue(memberId, out existingRoomId) && existingRoomId > 0)
                    {
                        foreach (int syncId in memberIds)
                            groupChatRoomByMemberId[syncId] = existingRoomId;
                        return existingRoomId;
                    }
                }

                existingRoomId = ++nextGroupChatRoomId;
                foreach (int memberId in memberIds)
                    groupChatRoomByMemberId[memberId] = existingRoomId;
                return existingRoomId;
            }
        }

        private static void ClearGroupChatRoomIds(IEnumerable<int> memberIds)
        {
            if (memberIds == null)
                return;
            lock (groupChatRoomLock)
            {
                foreach (int memberId in memberIds)
                    groupChatRoomByMemberId.Remove(memberId);
            }
            ClearGroupInvitationBehavior(memberIds);
        }

        public static int GetGroupChatRoomId(Session session)
        {
            List<int> memberIds = GetGroupCharacterIds(session);
            if (memberIds.Count < 2)
                return 0;
            return EnsureGroupChatRoomId(memberIds);
        }

        public static bool IsGroupChatRoomFor(Session session, int roomId)
        {
            return roomId > 0 && roomId == GetGroupChatRoomId(session);
        }

        private static Session GetChatSessionForCharacter(int characterId)
        {
            Session gameSession = SessionManager.GetSessionByCharacterId(characterId);
            if (gameSession == null || gameSession.CharacterInfo == null)
                return null;
            return SessionManager.GetSessionByUsernameChat(gameSession.CharacterInfo.Username.ToLower());
        }

        private static void SendGroupChatRoomDescriptorToMember(int characterId, int roomId)
        {
            if (roomId <= 0)
                return;
            Session chatSession = GetChatSessionForCharacter(characterId);
            if (chatSession != null)
                chatSession.SendData(PacketComposer.ComposeChat("by%" + roomId + "|Group|" + roomId + "|-1#"));
        }

        private static int GetLeaderId(List<int> memberIds)
        {
            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession != null && memberSession.CharacterInfo != null && memberSession.CharacterInfo.GroupLeader)
                    return memberId;
            }
            return memberIds.Count > 0 ? memberIds[0] : 0;
        }

        private static string BuildGroupInitPayload(List<int> memberIds, int roomId)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("init|grp|");
            sb.Append(roomId);
            sb.Append("|");
            sb.Append(memberIds.Count);
            sb.Append("|").Append(GROUP_MAX_SIZE);
            sb.Append("|").Append(GetGroupInvitationBehavior(memberIds));
            sb.Append("|").Append(LOOT_MODE_RANDOM);
            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                bool isOffline = memberSession == null || memberSession.CharacterInfo == null || memberSession.Stopped;
                if (memberSession == null || memberSession.CharacterInfo == null)
                {
                    sb.Append("|Member ").Append(memberId)
                      .Append("|").Append(memberId)
                      .Append("|0|0|0|0|0|0|0|0|0|0|0|0||0|1|0");
                    continue;
                }

                var info = memberSession.CharacterInfo;
                sb.Append("|").Append(info.Username);
                sb.Append("|").Append(info.Id);
                sb.Append("|").Append(info.ShipHp);
                sb.Append("|").Append(info.ShipMaxHp);
                sb.Append("|").Append(info.ShipShield);
                sb.Append("|").Append(info.ShipMaxShield);
                sb.Append("|").Append(info.MapId);
                sb.Append("|").Append(info.LocX);
                sb.Append("|").Append(info.LocY);
                sb.Append("|").Append(info.Level);
                sb.Append("|1");
                sb.Append("|").Append(info.Invisible);
                sb.Append("|").Append(info.Attacking ? 1 : 0);
                sb.Append("|").Append(info.FactionId);
                sb.Append("|").Append(info.SelectedPlayer);
                sb.Append("|").Append(info.ClanTag ?? "");
                sb.Append("|").Append(info.ShipId);
                sb.Append("|").Append(isOffline ? 1 : 0);
                sb.Append("|").Append(info.GroupLeader ? 1 : 0);
            }
            return sb.ToString();
        }

        private static string BuildGroupMemberUpdatePayload(Session memberSession)
        {
            var info = memberSession.CharacterInfo;
            return "<1 hp=\"" + info.ShipHp + "\" hpM=\"" + info.ShipMaxHp + "\" sh=\"" + info.ShipShield + "\"  shM=\"" + info.ShipMaxShield + "\"  tgt=\"" + info.SelectedPlayer + "\"  fgt=\"" + GeneralFunctions.ToEnum(info.Attacking) + "\"  map=\"" + info.MapId + "\" pos=\"" + info.LocX + "," + info.LocY + "\" lev=\"" + info.Level + "\" fra=\"" + info.FactionId + "\" shp=\"" + info.ShipId + "\" act=\"" + GeneralFunctions.ToEnum(info.Destroy) + "\" clk=\"" + info.Invisible + "\" lgo=\"0\"></1>";
        }

        public static void BroadcastGroupMemberState(Session memberSession)
        {
            if (memberSession == null || memberSession.CharacterInfo == null)
                return;

            List<int> memberIds = GetGroupCharacterIds(memberSession);
            if (memberIds.Count < 2)
                return;

            string payload = BuildGroupMemberUpdatePayload(memberSession);
            string packet = "upd|" + memberSession.CharacterInfo.Id + "|" + payload;

            foreach (int memberId in memberIds)
            {
                if (memberId == memberSession.CharacterInfo.Id)
                    continue;

                Session targetSession = SessionManager.GetSessionByCharacterId(memberId);
                if (targetSession != null && targetSession.CharacterInfo != null)
                    targetSession.SendData(PacketComposer.Compose("ps", packet));
            }
        }

        public static void SendFullGroupStateToMembers(Session session)
        {
            List<int> memberIds = GetGroupCharacterIds(session);
            if (memberIds.Count < 2)
            {
                ClearGroupChatRoomIds(memberIds);
                return;
            }

            int roomId = EnsureGroupChatRoomId(memberIds);
            int leaderId = GetLeaderId(memberIds);
            string payload = BuildGroupInitPayload(memberIds, roomId);

            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession == null || memberSession.CharacterInfo == null)
                    continue;
                memberSession.SendData(PacketComposer.Compose("ps", payload));
                memberSession.SendData(PacketComposer.Compose("ps", "nl|" + leaderId));
                memberSession.SendData(PacketComposer.Compose("ps", "chib|" + GetGroupInvitationBehavior(memberIds)));
                SendGroupChatRoomDescriptorToMember(memberId, roomId);
                try { ShipMovement.CheckPlayerInRange(memberSession); } catch { }
            }
        }

        public static void BroadcastGroupChat(Session sender, string messageText)
        {
            if (sender == null || sender.CharacterInfo == null || string.IsNullOrEmpty(messageText))
                return;

            List<int> memberIds = GetGroupCharacterIds(sender);
            if (memberIds.Count < 2)
                return;

            int roomId = EnsureGroupChatRoomId(memberIds);
            string cleanClanTag = sender.CharacterInfo.ClanTag == null ? "" : sender.CharacterInfo.ClanTag;
            string packet = string.IsNullOrEmpty(cleanClanTag)
                ? "a%" + roomId + "@" + sender.CharacterInfo.Username + "@" + messageText + "#"
                : "a%" + roomId + "@" + sender.CharacterInfo.Username + "@" + messageText + "@" + cleanClanTag + "#";

            foreach (int memberId in memberIds)
            {
                Session chatSession = GetChatSessionForCharacter(memberId);
                if (chatSession != null)
                    chatSession.SendData(PacketComposer.ComposeChat(packet));
            }
        }


        #region Monitor (Head´s)
        public void Monitor(Session Session, ClientMessage Message)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            string head = Message.GetNextString(1);

            if (head.StartsWith("inv"))
            {
                string shead = Message.GetNextString(2);

                if (shead.StartsWith("name"))
                {
                    this.InvitePlayer(Session, Message);
                }
                else if (shead.StartsWith("ack"))
                {
                    this.AcceptInvite(Session, Message);
                }
                else if (shead.StartsWith("rjc"))
                {
                    this.RejectInvite(Session, Message);
                }
                else if (shead.StartsWith("rji"))
                {
                    this.RevokeInvite(Session, Message);
                }
            }
            else if (head.StartsWith("s"))
            {
                this.SetInvitationRestriction(Session, Message);
            }
            else if (head.StartsWith("blk"))
            {
                this.BlockInvite(Session, Message);
            }
            else if (head.StartsWith("lv"))
            {
                this.leaveGroup(Session);
            }
            else if (head.StartsWith("flw"))
            {
                this.FollowPlayer(Session, Message);
            }
            else if (head.StartsWith("lc"))
            {
                this.ChangeLeader(Session, Message);
            }
            else if (head.StartsWith("kick"))
            {
                this.KickPlayer(Session, Message);
            }
            else if (head.StartsWith("png"))
            {
                string head2 = Message.GetNextString(2);
                if (head2.StartsWith("usr"))
                {
                    this.PingPlayer(Session, Message);

                }
                else if (head2.StartsWith("pos"))
                {
                    this.PingMap(Session, Message);
                }
            }
        }
        #endregion

        #region Invitation Restriction
        private void SetInvitationRestriction(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            string setting = Message.GetNextString(2);
            if (!setting.StartsWith("i"))
                return;

            if (!Session.CharacterInfo.GroupLeader)
            {
                SendInviteError(Session, "boss");
                return;
            }

            List<int> memberIds = GetGroupCharacterIds(Session);
            if (memberIds.Count <= 1)
                return;

            int behavior = NormalizeInvitationBehavior(Message.GetNextInt(3));
            SetGroupInvitationBehavior(memberIds, behavior);
            BroadcastInvitationBehavior(memberIds);
        }
        #endregion

        #region Follow Player
        private void FollowPlayer(Session Session, ClientMessage Message)
        {
            int id = Message.GetNextInt(2);
            Session sessiontwo = SessionManager.GetSessionByCharacterId(id);

            if (!Session.CharacterInfo.Members.Contains(sessiontwo.CharacterInfo.Id))
                return;
            if (Session.CharacterInfo.MapId != sessiontwo.CharacterInfo.MapId)
            {
                Session.SendData(PacketComposer.Compose("A", "STD| Player is not on this Map!"));
                return;
            }
            else
            {
                double TimeTaken = ShipMovement.getTimeTaken(Session, sessiontwo.CharacterInfo.LocX, sessiontwo.CharacterInfo.LocY);
                if (TimeTaken == -1)
                    return;
                Session.CharacterInfo.NewLocX = sessiontwo.CharacterInfo.LocX;
                Session.CharacterInfo.NewLocY = sessiontwo.CharacterInfo.LocY;
                ShipMovement.MoveShip(Session, TimeTaken);
                Session.SendData(MapShipMovementComposer.Compose(Session.CharacterId, Session.CharacterInfo.NewLocX, Session.CharacterInfo.NewLocY, TimeTaken));
                ShipMovement.MovementToSeeEveryone(Session, TimeTaken);
            }
        }
        #endregion

        #region Ping Map
        private void PingMap(Session Session, ClientMessage Message)
        {
            string str1 = Message.GetNextString(3);
            string str2 = Message.GetNextString(4);
            foreach (int num in Session.CharacterInfo.Members.Keys)
            {
                Session sessionpingplayer = SessionManager.GetSessionByCharacterId(num);
                if (Session.CharacterInfo.MapId != sessionpingplayer.CharacterInfo.MapId)
                {
                    return;
                }
                else
                {
                    sessionpingplayer.SendData(PacketComposer.Compose("ps", "png|" + str1 + "|" + str2));
                }
            }
            return;
        }
        #endregion

        #region Ping Player
        private void PingPlayer(Session Session, ClientMessage Message)
        {
            int id = Message.GetNextInt(3);
            Session sessionping = SessionManager.GetSessionByCharacterId(id);
            try
            {
                if (id == 0)
                {
                    Session.SendData(PacketComposer.Compose("A", "STD| Error"));
                    return;
                }
                else
                {
                    if (Session.CharacterInfo.MapId != sessionping.CharacterInfo.MapId)
                    {
                        Session.SendData(PacketComposer.Compose("A", "STD| Player is not on this map"));
                        return;
                    }
                    else
                    {
                        if (Session.CharacterInfo.Members.Contains(id))
                        {
                            string posx = sessionping.CharacterInfo.LocX.ToString();
                            string posy = sessionping.CharacterInfo.LocY.ToString();
                            foreach (int num in Session.CharacterInfo.Members.Keys)
                            {
                                Session sessionpingplayer = SessionManager.GetSessionByCharacterId(num);
                                if (Session.CharacterInfo.MapId == sessionpingplayer.CharacterInfo.MapId)
                                {
                                    sessionpingplayer.SendData(PacketComposer.Compose("ps", "png|" + posx + "|" + posy));
                                }
                            }
                            return;
                        }
                    }
                }
            }
            catch (Exception)
            { }
        }
        #endregion

        #region Kick Player
        private void KickPlayer(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.CharacterInfo.GroupLeader)
                return;

            int id = Message.GetNextInt(2);
            Session sessiontwo = SessionManager.GetSessionByCharacterId(id);
            if (id == 0 || sessiontwo == null || sessiontwo.CharacterInfo == null)
            {
                Session.SendData(PacketComposer.Compose("A", "STD| Error"));
                return;
            }

            List<int> memberIds = GetGroupCharacterIds(Session);
            if (!memberIds.Contains(id) || id == Session.CharacterInfo.Id)
                return;

            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession != null && memberSession.CharacterInfo != null)
                    memberSession.SendData(PacketComposer.Compose("ps", "lp|kick|" + id));
            }

            memberIds.Remove(id);
            sessiontwo.CharacterInfo.Members.Clear();
            sessiontwo.CharacterInfo.GroupLeader = false;
            ForgetGroupMember(id);
            ClearGroupChatRoomIds(new List<int> { id });

            if (memberIds.Count <= 1)
            {
                foreach (int memberId in memberIds)
                {
                    Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                    if (memberSession != null && memberSession.CharacterInfo != null)
                    {
                        memberSession.SendData(PacketComposer.Compose("ps", "end|"));
                        memberSession.CharacterInfo.Members.Clear();
                        memberSession.CharacterInfo.GroupLeader = false;
                        ForgetGroupMember(memberId);
                    }
                }
                ClearGroupChatRoomIds(memberIds);
                return;
            }

            int leaderId = GetLeaderId(memberIds);
            if (leaderId <= 0 || !memberIds.Contains(leaderId))
                leaderId = memberIds[0];

            SyncMembersList(memberIds, leaderId);
            SendFullGroupStateToMembers(Session);
        }
        #endregion

        #region Change Leader
        private void ChangeLeader(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.CharacterInfo.GroupLeader)
                return;

            int id = Message.GetNextInt(2);
            Session sessiontwo = SessionManager.GetSessionByCharacterId(id);
            if (id == 0 || sessiontwo == null || sessiontwo.CharacterInfo == null)
            {
                Session.SendData(PacketComposer.Compose("A", "STD| Error"));
                return;
            }

            List<int> memberIds = GetGroupCharacterIds(Session);
            if (!memberIds.Contains(id))
                return;

            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession == null || memberSession.CharacterInfo == null)
                    continue;

                memberSession.CharacterInfo.GroupLeader = memberId == id;
                memberSession.SendData(PacketComposer.Compose("ps", "nl|" + id));
            }
        }
        #endregion

        #region Leave Group
        private void leaveGroup(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            List<int> memberIds = GetGroupCharacterIds(Session);
            if (memberIds.Count <= 1)
            {
                Session.CharacterInfo.Members.Clear();
                Session.CharacterInfo.GroupLeader = false;
                ForgetGroupMember(Session.CharacterInfo.Id);
                return;
            }

            int leavingId = Session.CharacterInfo.Id;
            foreach (int memberId in memberIds)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession != null && memberSession.CharacterInfo != null)
                    memberSession.SendData(PacketComposer.Compose("ps", "lp|lv|" + leavingId));
            }

            memberIds.Remove(leavingId);
            Session.CharacterInfo.Members.Clear();
            Session.CharacterInfo.GroupLeader = false;
            ForgetGroupMember(leavingId);
            ClearGroupChatRoomIds(new List<int> { leavingId });

            if (memberIds.Count <= 1)
            {
                foreach (int memberId in memberIds)
                {
                    Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                    if (memberSession != null && memberSession.CharacterInfo != null)
                    {
                        memberSession.SendData(PacketComposer.Compose("ps", "end|"));
                        memberSession.CharacterInfo.Members.Clear();
                        memberSession.CharacterInfo.GroupLeader = false;
                        ForgetGroupMember(memberId);
                    }
                }
                ClearGroupChatRoomIds(memberIds);
                return;
            }

            int leaderId = GetLeaderId(memberIds);
            if (leaderId <= 0 || !memberIds.Contains(leaderId))
                leaderId = memberIds[0];

            SyncMembersList(memberIds, leaderId);
            Session leaderSession = SessionManager.GetSessionByCharacterId(leaderId);
            if (leaderSession != null)
                SendFullGroupStateToMembers(leaderSession);
        }
        #endregion

        #region BlockInvite
        private void BlockInvite(Session Session, ClientMessage Message)
        {
            if (Session.CharacterInfo.Blk == 0)
            {
                Session.SendData(PacketComposer.Compose("ps", "blk|1"));
                Session.CharacterInfo.Blk = 1;
            }
            else
            {
                Session.SendData(PacketComposer.Compose("ps", "blk|0"));
                Session.CharacterInfo.Blk = 0;
            }

            this.removeAllInvitationReceive(Session);
        }
        #endregion

        public void removeAllInvitationReceive(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            List<int> incoming = new List<int>(Session.CharacterInfo.InvitationReceive.Keys);
            foreach (int num in incoming)
            {
                Session sessionBycharacterId = SessionManager.GetSessionByCharacterId(num);
                Session.SendData(PacketComposer.Compose("ps", "inv|del|none|" + num));
                if (sessionBycharacterId != null && sessionBycharacterId.CharacterInfo != null)
                {
                    sessionBycharacterId.SendData(PacketComposer.Compose("ps", "inv|del|none|" + num + "|" + Session.CharacterInfo.Id));
                    sessionBycharacterId.CharacterInfo.InvitationSend.Remove(Session.CharacterInfo.Id);
                }
            }
            Session.CharacterInfo.InvitationReceive.Clear();
        }

        #region Reject Invite
        private void RejectInvite(Session Session, ClientMessage Message)
        {
            int id = Message.GetNextInt(3);
            Session sessiontwo = SessionManager.GetSessionByCharacterId(id);
            if (id == 0 || sessiontwo == null || sessiontwo.CharacterInfo == null)
            {
                SendInviteError(Session, "noi");
                return;
            }

            ClearInvitationBetween(sessiontwo, Session, "rj");
        }
        #endregion

        #region Revoke Invite
        private void RevokeInvite(Session Session, ClientMessage Message)
        {
            int id = Message.GetNextInt(3);
            Session sessiontwo = SessionManager.GetSessionByCharacterId(id);
            if (id == 0 || sessiontwo == null || sessiontwo.CharacterInfo == null)
            {
                SendInviteError(Session, "noi");
                return;
            }

            ClearInvitationBetween(Session, sessiontwo, "rv");
        }
        #endregion

        #region Accept Invite
        private void AcceptInvite(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            int id = Message.GetNextInt(3);
            Session sessiontwo = SessionManager.GetSessionByCharacterId(id);
            if (id == 0 || sessiontwo == null || sessiontwo.CharacterInfo == null)
            {
                SendInviteError(Session, "noi");
                return;
            }

            if (!Session.CharacterInfo.InvitationReceive.Contains(id) || !sessiontwo.CharacterInfo.InvitationSend.Contains(Session.CharacterInfo.Id))
            {
                SendInviteError(Session, "noi");
                return;
            }

            if (Session.CharacterInfo.Members.Count > 0)
            {
                SendInviteError(Session, "cig");
                ClearInvitationBetween(sessiontwo, Session, "none");
                return;
            }

            List<int> oldMemberIds = GetGroupCharacterIds(sessiontwo);
            bool inviterAlreadyInGroup = oldMemberIds.Count > 1;
            if (inviterAlreadyInGroup && oldMemberIds.Count >= GROUP_MAX_SIZE)
            {
                SendInviteError(Session, "full");
                ClearInvitationBetween(sessiontwo, Session, "none");
                return;
            }

            int behavior = inviterAlreadyInGroup ? GetGroupInvitationBehavior(oldMemberIds) : DEFAULT_INVITATION_BEHAVIOR;
            int leaderId = inviterAlreadyInGroup ? GetLeaderId(oldMemberIds) : sessiontwo.CharacterInfo.Id;
            if (leaderId <= 0)
                leaderId = sessiontwo.CharacterInfo.Id;

            List<int> newMemberIds = new List<int>(oldMemberIds);
            if (!newMemberIds.Contains(sessiontwo.CharacterInfo.Id))
                newMemberIds.Add(sessiontwo.CharacterInfo.Id);
            if (!newMemberIds.Contains(Session.CharacterInfo.Id))
                newMemberIds.Add(Session.CharacterInfo.Id);

            SetGroupInvitationBehavior(newMemberIds, behavior);
            SyncMembersList(newMemberIds, leaderId);
            ClearInvitationBetween(sessiontwo, Session, "ack");
            this.removeAllInvitationReceive(Session);
            SendFullGroupStateToMembers(sessiontwo);
        }
        #endregion

        #region Invite Player
        private void InvitePlayer(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            string uname = Message.GetNextString(3).ToLower();
            Session sessionByUsername = SessionManager.GetSessionByUsername(uname);

            if (sessionByUsername == null || sessionByUsername.CharacterInfo == null)
            {
                SendInviteError(Session, "cnx");
                return;
            }

            Session sessiontwo = sessionByUsername;

            if (sessiontwo.CharacterInfo.Id == Session.CharacterInfo.Id)
            {
                SendInviteError(Session, "cna");
                return;
            }

            if (sessiontwo.CharacterInfo.Members.Count != 0)
            {
                SendInviteError(Session, "cig");
                return;
            }

            if (sessiontwo.CharacterInfo.Blk == 1)
            {
                SendInviteError(Session, "blk");
                return;
            }

            if (Session.CharacterInfo.InvitationSend.Contains(sessiontwo.CharacterInfo.Id) || sessiontwo.CharacterInfo.InvitationReceive.Contains(Session.CharacterInfo.Id))
            {
                SendInviteError(Session, "dpl");
                return;
            }

            List<int> memberIds = GetGroupCharacterIds(Session);
            if (memberIds.Count > 1)
            {
                if (memberIds.Count >= GROUP_MAX_SIZE)
                {
                    SendInviteError(Session, "full");
                    return;
                }

                if (!CanSessionInvite(Session))
                {
                    SendInviteError(Session, "boss");
                    return;
                }
            }

            string packet = BuildInvitePayload(Session, sessiontwo);
            sessiontwo.SendData(PacketComposer.Compose("ps", packet));
            Session.SendData(PacketComposer.Compose("ps", packet));
            sessiontwo.CharacterInfo.InvitationReceive.Add(Session.CharacterInfo.Id);
            Session.CharacterInfo.InvitationSend.Add(sessiontwo.CharacterInfo.Id);
        }
        #endregion

        private static void closeGroup(Session session)
        {
            List<int> formerMembers = GetGroupCharacterIds(session);
            foreach (int memberId in formerMembers)
            {
                Session memberSession = SessionManager.GetSessionByCharacterId(memberId);
                if (memberSession != null && memberSession.CharacterInfo != null)
                {
                    memberSession.SendData(PacketComposer.Compose("ps", "end|"));
                    memberSession.CharacterInfo.Members.Clear();
                    memberSession.CharacterInfo.GroupLeader = false;
                }
                ForgetGroupMember(memberId);
            }
            ClearGroupChatRoomIds(formerMembers);
        }

        #region Group Updater
        public static void UpdateGroup(object state)
        {
            Session Session = (Session)state;
            try
            {
                if (Session.CharacterInfo.Members.Count > 1)
                {
                    foreach (int key in Session.CharacterInfo.Members.Keys)
                    {
                        Session sessiongroup = SessionManager.GetSessionByCharacterId(key);
                        if (sessiongroup == null || sessiongroup.CharacterInfo == null)
                        {
                            Session.CharacterInfo.Members.Remove(key);
                            if (Session.CharacterInfo.Members.Count <= 1)
                                GroupManager.closeGroup(Session);
                            UpdateGroup(Session);
                            return;
                        }
                        if (sessiongroup.Stopped)
                        {
                            List<int> list = new List<int>();
                            Session.SendData(PacketComposer.Compose("ps", "lp|lv|" + sessiongroup.CharacterInfo.Id));

                            if (sessiongroup.CharacterInfo.GroupLeader)
                            {
                                sessiongroup.CharacterInfo.GroupLeader = false;

                                foreach (int num in sessiongroup.CharacterInfo.Members.Keys)
                                {
                                    Session sessionNewleader = SessionManager.GetSessionByCharacterId(num);

                                    if (sessionNewleader.CharacterInfo.Id != sessiongroup.CharacterInfo.Id)
                                    {
                                        sessionNewleader.CharacterInfo.GroupLeader = true;
                                        foreach (int index in sessiongroup.CharacterInfo.Members.Keys)
                                        {
                                            Session sessionByIndex = SessionManager.GetSessionByCharacterId(index);
                                            sessionByIndex.SendData(PacketComposer.Compose("ps", "nl|" + sessionNewleader.CharacterInfo.Id));
                                        }
                                        break;
                                    }
                                }
                            }
                            sessiongroup.CharacterInfo.Members.Clear();
                            Session.CharacterInfo.Members.Remove(sessiongroup.CharacterInfo.Id);
                        }
                        else
                        {
                            string str = BuildGroupMemberUpdatePayload(sessiongroup);
                            Session.SendData(PacketComposer.Compose("ps", "upd|" + key + "|" + str));
                        }
                    }
                    if (Session.CharacterInfo.Members.Count <= 1)
                        GroupManager.closeGroup(Session);
                }
                GroupManager.UpdateInvitiation(Session);
            }
            catch
            {
            }
        }
        #endregion

        private static void UpdateInvitiation(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            List<int> sent = new List<int>(Session.CharacterInfo.InvitationSend.Keys);
            foreach (int num in sent)
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(num);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null || sessionByCharacterId.Stopped)
                {
                    Session.SendData(PacketComposer.Compose("ps", "inv|del|none|" + Session.CharacterInfo.Id + "|" + num));
                    Session.CharacterInfo.InvitationSend.Remove(num);
                }
            }

            List<int> received = new List<int>(Session.CharacterInfo.InvitationReceive.Keys);
            foreach (int num in received)
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(num);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null || sessionByCharacterId.Stopped)
                {
                    Session.SendData(PacketComposer.Compose("ps", "inv|del|none|" + num));
                    Session.CharacterInfo.InvitationReceive.Remove(num);
                }
            }
        }
    }
}


