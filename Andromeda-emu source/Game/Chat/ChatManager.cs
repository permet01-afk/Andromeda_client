

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using System.Collections.Generic;

namespace OrbitReborn_Emulator.Game.Chat
{
    public static class ChatManager
    {
        private static bool mChatMuted = false;
        private static CList<Session> mGlobalChannel;
        private static CList<Session> mMMOChannel;
        private static CList<Session> mEICChannel;
        private static CList<Session> mVRUChannel;
        private static CList<int> mMutedPlayers;

        public static bool ChatMuted
        {
            get
            {
                return ChatManager.mChatMuted;
            }
            set
            {
                ChatManager.mChatMuted = value;
            }
        }

        public static CList<Session> GlobalChannel
        {
            get
            {
                return ChatManager.mGlobalChannel;
            }
            set
            {
                ChatManager.mGlobalChannel = value;
            }
        }

        public static CList<int> MutedPlayers
        {
            get
            {
                return ChatManager.mMutedPlayers;
            }
            set
            {
                ChatManager.mMutedPlayers = value;
            }
        }

        public static void Initialize()
        {
            ChatManager.mGlobalChannel = new CList<Session>();
            ChatManager.mMMOChannel = new CList<Session>();
            ChatManager.mEICChannel = new CList<Session>();
            ChatManager.mVRUChannel = new CList<Session>();
            ChatManager.mMutedPlayers = new CList<int>();
        }

        public static void AddPlayerToGlobalChannel(Session Session)
        {
            lock (ChatManager.GlobalChannel)
            {
                if (ChatManager.GlobalChannel.Contains(Session))
                    return;
                ChatManager.GlobalChannel.Add(Session);
            }
        }

        public static void RemovePlayerFromGlobalChannel(Session Session)
        {
            lock (ChatManager.GlobalChannel)
            {
                if (!ChatManager.GlobalChannel.Contains(Session))
                    return;
                ChatManager.GlobalChannel.Remove(Session);
            }
        }

        public static void AddPlayerToMMOChannel(Session Session)
        {
            lock (ChatManager.mMMOChannel)
            {
                if (ChatManager.mMMOChannel.Contains(Session))
                    return;
                ChatManager.mMMOChannel.Add(Session);
            }
        }

        public static void RemovePlayerFromMMOChannel(Session Session)
        {
            lock (ChatManager.mMMOChannel)
            {
                if (!ChatManager.mMMOChannel.Contains(Session))
                    return;
                ChatManager.mMMOChannel.Remove(Session);
            }
        }

        public static void AddPlayerToEICChannel(Session Session)
        {
            lock (ChatManager.mEICChannel)
            {
                if (ChatManager.mEICChannel.Contains(Session))
                    return;
                ChatManager.mEICChannel.Add(Session);
            }
        }

        public static void RemovePlayerFromEICChannel(Session Session)
        {
            lock (ChatManager.mEICChannel)
            {
                if (!ChatManager.mEICChannel.Contains(Session))
                    return;
                ChatManager.mEICChannel.Remove(Session);
            }
        }

        public static void AddPlayerToVRUChannel(Session Session)
        {
            lock (ChatManager.mVRUChannel)
            {
                if (ChatManager.mVRUChannel.Contains(Session))
                    return;
                ChatManager.mVRUChannel.Add(Session);
            }
        }

        public static void RemovePlayerFromVRUChannel(Session Session)
        {
            lock (ChatManager.mVRUChannel)
            {
                if (!ChatManager.mVRUChannel.Contains(Session))
                    return;
                ChatManager.mVRUChannel.Remove(Session);
            }
        }

        public static void BroadcastMessage(ServerMessage Message, bool UsersWithRightsOnly = false)
        {
            lock (ChatManager.GlobalChannel)
            {
                foreach (Session item_0 in (IEnumerable<Session>)ChatManager.GlobalChannel.Keys)
                {
                    if (item_0 != null)
                        item_0.SendData(Message);
                }
            }
        }

        public static void BroadcastMessageDifferentForAdmin(ServerMessage MessageNormal, ServerMessage MessageAdmin, bool UsersWithRightsOnly = false)
        {
            lock (ChatManager.GlobalChannel)
            {
                foreach (Session item_0 in (IEnumerable<Session>)ChatManager.GlobalChannel.Keys)
                {
                    if (item_0 != null)
                    {
                        if (item_0.CharacterInfo.IsAdmin)
                            item_0.SendData(MessageAdmin);
                        else
                            item_0.SendData(MessageNormal);
                    }
                }
            }
        }

        public static bool IsMuted(int _Id)
        {
            return ChatManager.mMutedPlayers.Contains(_Id);
        }

        public static void MutePlayer(int _Id)
        {
            lock (ChatManager.mMutedPlayers)
            {
                if (ChatManager.mMutedPlayers.Contains(_Id))
                    return;
                ChatManager.mMutedPlayers.Add(_Id);
            }
        }

        public static void UnmutePlayer(int _Id)
        {
            lock (ChatManager.mMutedPlayers)
            {
                if (!ChatManager.mMutedPlayers.Contains(_Id))
                    return;
                ChatManager.mMutedPlayers.Remove(_Id);
            }
        }
    }
}
