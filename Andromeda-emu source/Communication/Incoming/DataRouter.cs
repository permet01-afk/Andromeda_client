// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Incoming.DataRouter
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Chat;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System.Collections.Generic;

namespace OrbitReborn_Emulator.Communication.Incoming
{
    public static class DataRouter
    {
        private static CDictionnary<string, ProcessRequestCallback> mCallbacks;
        private static CList<string> mCallbacksWithoutAuthentication;
        private static List<string> authorizedPacket = new List<string> { "UI", "RL", "fc", "PNG1", "jj", "jjj", "jjjj", "jj1", "j1" };
        public static bool HasToKick = false;

        public static void Initialize()
        {
            DataRouter.mCallbacks = new CDictionnary<string, ProcessRequestCallback>();
            DataRouter.mCallbacksWithoutAuthentication = new CList<string>();
        }

        public static bool RegisterHandler(string MessageHeader, ProcessRequestCallback Callback, bool PermitedUnauthenticated = false)
        {
            if (MessageHeader == "" || Callback == null)
                return false;
            if (!DataRouter.mCallbacks.TryAdd(MessageHeader, Callback))
                return false;
            if (PermitedUnauthenticated)
                DataRouter.mCallbacksWithoutAuthentication.Add(MessageHeader);
            return true;
        }

        public static void refreshGroup(Session Session) { }
        public static void kick(Session Session)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                if (Session.CharacterInfo != null)
                {
                    MapManager.RemoveUserFromMap(Session);
                    ChatManager.RemovePlayerFromEICChannel(Session);
                    ChatManager.RemovePlayerFromMMOChannel(Session);
                    ChatManager.RemovePlayerFromVRUChannel(Session);
                    ChatManager.RemovePlayerFromGlobalChannel(Session);
                    Session.CharacterInfo.Disconnected = true;
                }
                Session.Stop(client);
                Session.Dispose();
            }
        }
        public static void HandleData(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.Stopped || Message == null)
                Output.WriteLine((object)("Session is null or stopped or no message IP : " + Session.RemoteAddress), OutputLevel.Warning);
            else
            {
                ProcessRequestCallback callback;
                if (!DataRouter.mCallbacks.TryGetValue(Message.Header, out callback))
                {
                    Output.WriteLine((object)("Unhandled packet: " + Message.Header + " from :" + Session.RemoteAddress + ", no suitable handler found."), OutputLevel.Warning);
                    if (DataRouter.HasToKick && !DataRouter.authorizedPacket.Contains(Message.Header))
                    {
                        Output.WriteLine((object)(" " + Session.RemoteAddress + " kicked !"), OutputLevel.Warning);
                        DataRouter.kick(Session);
                    }
                    return;
                }

                if (!Session.Authenticated && !DataRouter.mCallbacksWithoutAuthentication.Contains(Message.Header))
                    return;
                callback(Session, Message);
            }
        }
    }
}
