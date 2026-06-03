

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Chat;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Game.Moderation;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class Chat
    {
        public static void Initialize()
        {
            DataRouter.RegisterHandler("bu", new ProcessRequestCallback(OrbitReborn_Emulator.Game.Handlers.Chat.ChatInit), true);
            DataRouter.RegisterHandler("bz", new ProcessRequestCallback(OrbitReborn_Emulator.Game.Handlers.Chat.EnterRoom), true);
        }

        private static string[] SplitCommandArguments(string value)
        {
            if (value == null)
                return new string[0];
            return value.Split(new char[1] { ' ' }, System.StringSplitOptions.RemoveEmptyEntries);
        }

        private static void SendCommandUsage(Session Session, string usage)
        {
            Session.SendData(PacketComposer.ComposeChat("dq%" + usage + "#"));
        }

        private static bool TryParseIntArgument(Session Session, string[] commandParts, int index, string usage, out int value)
        {
            value = 0;
            if (commandParts.Length <= index || !int.TryParse(commandParts[index], out value))
            {
                OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, usage);
                return false;
            }
            return true;
        }

        private static void EnterRoom(Session Session, ClientMessage Message)
        {
            int nextInt = Message.GetNextInt(2);
            if (!Session.IsChat)
                return;
            if (Session.CharacterInfo.IsMod || Session.CharacterInfo.IsAdmin)
            {
                Session.CurrentChatRoom = nextInt;
                return;
            }
            if (nextInt == 1)
            {
                Session.CurrentChatRoom = 1;
                if (!Session.GlobalChatNoticeSent)
                {
                    string str = " <span class='mwLightblue'>Official global chat: <span class='mwCyan'>Respect the rules</span></span>";
                    Session.SendData(PacketComposer.ComposeChat("dq%" + str + "#"));
                    Session.GlobalChatNoticeSent = true;
                }
                return;
            }
            if (nextInt == 5 && Session.CharacterInfo.IsAdmin)
            {
                Session.CurrentChatRoom = 5;
                return;
            }
            if (nextInt == 2 && Session.CharacterInfo.FactionId == 1)
            {
                Session.CurrentChatRoom = 2;
                return;
            }
            if (nextInt == 3 && Session.CharacterInfo.FactionId == 2)
            {
                Session.CurrentChatRoom = 3;
                return;
            }
            if (nextInt == 4 && Session.CharacterInfo.FactionId == 3)
            {
                Session.CurrentChatRoom = 4;
                return;
            }

            int groupRoomId = GroupManager.GetGroupChatRoomId(Session);
            if (groupRoomId > 0 && nextInt == groupRoomId)
            {
                Session.CurrentChatRoom = groupRoomId;
                return;
            }

            if (nextInt > 100 && nextInt == Session.CharacterInfo.ClanId + 100)
            {
                Session.CurrentChatRoom = Session.CharacterInfo.ClanId + 100;
                return;
            }

            Session.CurrentChatRoom = 1;
        }

        private static void ChatInit(Session Session, ClientMessage Message)
        {
            Message.GetNextString(2);
            int num = int.Parse(Message.GetNextString(3));
            string nextString = Message.GetNextString(4);
            if (ModerationBanManager.IsUserIdChatBlacklisted(num))
            {
                Output.WriteLine((object)("Login from id " + (object)num + " rejected: banned from the chat."));
                string str = " You are banned from the chat.";
                Session.SendData(PacketComposer.ComposeChat("dq%" + str + "#"));
            }
            else
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(num);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo.AuthTicket != nextString)
                    return;
                Session.IsChat = true;
                Session.CharacterInfo = sessionByCharacterId.CharacterInfo;
                if (!Session.IsChat)
                    return;
                Session.SendData(PacketComposer.ComposeChat("bv%" + (object)Session.CharacterInfo.Id + "#"));
                ChatManager.AddPlayerToGlobalChannel(Session);
                Session.SendData(PacketComposer.ComposeChat("by%1|Global|0|-1#"));
                if (Session.CharacterInfo.IsAdmin)
                {
                    Session.SendData(PacketComposer.ComposeChat("by%5|Whispers|5|-1#"));
                }
                if (Session.CharacterInfo.IsAdmin || Session.CharacterInfo.IsMod)
                {
                    Session.SendData(PacketComposer.ComposeChat("by%2|MMO|1|-1#"));
                    ChatManager.AddPlayerToMMOChannel(Session);
                    Session.SendData(PacketComposer.ComposeChat("by%3|EIC|2|-1#"));
                    ChatManager.AddPlayerToEICChannel(Session);
                    Session.SendData(PacketComposer.ComposeChat("by%4|VRU|3|-1#"));
                    ChatManager.AddPlayerToVRUChannel(Session);
                }
                else
                {
                    Session.SendData(PacketComposer.ComposeChat("by%2|MMO|1|1#"));
                    Session.SendData(PacketComposer.ComposeChat("by%3|EIC|2|2#"));
                    Session.SendData(PacketComposer.ComposeChat("by%4|VRU|3|3#"));
                }
                if (Session.CharacterInfo.ClanId != 0)
                    Session.SendData(PacketComposer.ComposeChat("by%" + (object)(Session.CharacterInfo.ClanId + 100) + "|Clan|" + (object)(Session.CharacterInfo.ClanId + 100) + "|-1#"));
                int groupRoomId = GroupManager.GetGroupChatRoomId(Session);
                if (groupRoomId > 0)
                    Session.SendData(PacketComposer.ComposeChat("by%" + groupRoomId + "|Group|" + groupRoomId + "|-1#"));
                string str = " <span class='mwLightblue'>Welcome on <span class='mwCyan'>Andromeda</span></span>";
                Session.SendData(PacketComposer.ComposeChat("dq%" + str + "#"));
            }
        }

        public static void SendMessage(Session Session, ClientMessage Message)
        {
            if (ModerationBanManager.IsUserIdChatBlacklisted(Session.CharacterId) || ModerationBanManager.IsUserIdBlacklisted(Session.CharacterId))
                return;
            string nextString = Message.GetNextString(2);
            string[] commandParts = OrbitReborn_Emulator.Game.Handlers.Chat.SplitCommandArguments(nextString);
            if (commandParts.Length == 0)
                return;
            string str1 = commandParts[0];

            switch (str1)
            {
                case "/disable_pvp":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    PvpManager.PvpEnabled = false;
                    return;
                case "/test":
                    _1v1.initMatch(21147, 1);
                    return;
                case "/enable_pvp":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    PvpManager.PvpEnabled = true;
                    return;
                case "/stop_hh":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 4");
                    }
                    HappyHour.Enabled = false;
                    return;
                case "/start_hh":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        client.ExecuteNonQuery("UPDATE event_information SET isActif=1 WHERE id = 4");
                    }
                    HappyHour.Enabled = true;
                    return;
                case "/duel":
                    ChatAction.AskDuel(nextString, Session);
                    return;
                case "/duel_accept":
                    ChatAction.DuelAccept(nextString, Session);
                    return;
                case "/start_tdm":
                    if (!Session.CharacterInfo.IsAdmin || TeamDeathMatch.IsActive())
                        return;
                    TeamDeathMatch.Enable();
                    return;
                case "/stop_tdm":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    TeamDeathMatch.Disable();
                    return;
                case "/join_team":
                    if (!TeamDeathMatch.IsActive())
                        return;
                    if (nextString.Split(' ').Length < 2)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%- use /join_team nameOfTeam .#"));
                        return;
                    }
                    string msg = "Team doesnt exist or is full, or you are already on a team.";
                    string name = nextString.Split(' ')[1];
                    bool done = TeamDeathMatch.JoinTeam(name, Session);
                    if (done)
                        msg = "You succesfully joined the team.";
                    Session.SendData(PacketComposer.ComposeChat("dq%- " + msg + "#"));
                    return;
                case "/create_team":
                    if (!TeamDeathMatch.IsActive())
                        return;
                    if (nextString.Split(' ').Length < 2)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%- use /create_team nameOfTeam .#"));
                        return;
                    }
                    string msg1 = "Team already exist, or you are already on a team.";
                    string name1 = nextString.Split(' ')[1];
                    bool created = TeamDeathMatch.CreateNewTeam(name1, Session);
                    if (created)
                        msg1 = "You succesfully created the team.";
                    Session.SendData(PacketComposer.ComposeChat("dq%- " + msg1 + "#"));
                    return;
                case "/members_team":
                    if (!TeamDeathMatch.IsActive())
                        return;
                    string teamName = TeamDeathMatch.userTeam(Session);
                    if (teamName == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%- You are not on a team.#"));
                        return;
                    }
                    Session.SendData(PacketComposer.ComposeChat("dq%- " + TeamDeathMatch.DisplayTeam(teamName) + ".#"));
                    return;
                case "/leave_team":
                    if (!TeamDeathMatch.IsActive())
                        return;
                    string teamName1 = TeamDeathMatch.userTeam(Session);
                    if (teamName1 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%- You are not on a team.#"));
                        return;
                    }
                    bool leave = TeamDeathMatch.LeaveTeam(teamName1, Session);
                    if (!leave)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%- Problemn while leaving team, contact admin.#"));
                        return;
                    }
                    Session.SendData(PacketComposer.ComposeChat("dq%- You succesfully left your team.#"));
                    return;
                case "/setmap_maxusers":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    if (commandParts.Length <= 2)
                    {
                        OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, "Invalid command. Use /setmap_maxusers [mapid] [max users].");
                        return;
                    }
                    int MapId;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 1, "Invalid command. Use /setmap_maxusers [mapid] [max users].", out MapId))
                        return;
                    int num1;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 2, "Invalid command. Use /setmap_maxusers [mapid] [max users].", out num1))
                        return;
                    MapInstance instanceByMapId1 = MapManager.GetInstanceByMapId(MapId);
                    if (instanceByMapId1 != null)
                    {
                        instanceByMapId1.Info.MaxUsers = num1;
                        Session.SendData(PacketComposer.ComposeChat("dq% Map limit have been set to " + (object)num1 + ".#"));
                    }
                    else
                        Session.SendData(PacketComposer.ComposeChat("dq% Map is not loaded.#"));
                    return;
                case "/start_spaceball":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Spaceball.StartSpaceball();
                    return;
                case "/stop_spaceball":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Spaceball.StopSpaceball();
                    return;
                case "/start_survivor":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Survivor.StartSurvivor();
                    return;
                case "/start_pvpfarm":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    PvPFarming.StartPvPFarm();
                    return;
                case "/start_invasion":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Invasion.StartInvasion();
                    return;
                case "/stop_invasion":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Invasion.StopInvasion();
                    return;
                case "/join_survivor":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Session sessionByCharacterId4 = SessionManager.GetSessionByCharacterId(Session.CharacterId);
                    if (sessionByCharacterId4 != null)
                        MapHandler.OpenPublicConnection(sessionByCharacterId4, 80, (PortalInfo)null);
                    return;
                case "/invisible":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Session sessionByCharacterId6 = SessionManager.GetSessionByCharacterId(Session.CharacterInfo.Id);
                    sessionByCharacterId6.CharacterInfo.IsInvisibleForAll = true;
                    Session.SendData(PacketComposer.ComposeChat("dq%You are now invisible for everyone !#"));
                    MapInstance instanceByMapId3 = MapManager.GetInstanceByMapId(sessionByCharacterId6.CurrentMapId);
                    if (instanceByMapId3 == null)
                        return;
                    instanceByMapId3.BroadcastMovement(PacketComposer.Compose("R", sessionByCharacterId6.CharacterId.ToString()), sessionByCharacterId6.CharacterId, false);
                    return;
                case "/visible":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Session sessionByCharacterId7 = SessionManager.GetSessionByCharacterId(Session.CharacterInfo.Id);
                    sessionByCharacterId7.CharacterInfo.IsInvisibleForAll = false;
                    Session.SendData(PacketComposer.ComposeChat("dq%You are now visible for everyone !#"));
                    MapInstance instanceByMapId4 = MapManager.GetInstanceByMapId(sessionByCharacterId7.CurrentMapId);
                    if (instanceByMapId4 == null)
                        return;
                    instanceByMapId4.BroadcastMessageUserEnter(sessionByCharacterId7.CharacterInfo);
                    return;
                case "/invisible_npc":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Session.SendData(PacketComposer.ComposeChat("dq%You will not see npc anymore, jump a portal, to apply effect#"));
                    Session.CharacterInfo.DisableNpc = true;
                    Session.CharacterInfo.NpcInRange.Clear();
                    return;
                case "/visible_npc":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Session.SendData(PacketComposer.ComposeChat("dq%Npc are now visible !#"));
                    Session.CharacterInfo.DisableNpc = false;
                    ShipMovement.CheckAliensInRange(Session);
                    return;
                case "/commands":
                    if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
                        return;
                    Session.SendData(PacketComposer.ComposeChat("dq%- /getuserid [username].#"));
                    Session.SendData(PacketComposer.ComposeChat("dq%- /kick [id].#"));
                    Session.SendData(PacketComposer.ComposeChat("dq%- /chatban [id] [time in hours] [reason].#"));
                    if (Session.CharacterInfo.IsAdmin)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%- /ban [id] [time in hours] [reason].#"));
                        Session.SendData(PacketComposer.ComposeChat("dq%- /hp [amount].#"));
                        Session.SendData(PacketComposer.ComposeChat("dq%- /damages [amount].#"));
                        Session.SendData(PacketComposer.ComposeChat("dq%- /speed [amount].#"));
                        Session.SendData(PacketComposer.ComposeChat("dq%- /invisible .#"));
                        Session.SendData(PacketComposer.ComposeChat("dq%- /visible .#"));
                        Session.SendData(PacketComposer.ComposeChat("dq%- /invisible_npc .#"));
                        Session.SendData(PacketComposer.ComposeChat("dq%- /visible_npc .#"));
                    }
                    return;
                case "/getuserid":
                    if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
                        return;
                    if (nextString.Split(' ').Length <= 1)
                        return;
                    Session sessionByUsernameChat2 = SessionManager.GetSessionByUsernameChat(nextString.Split(new char[1]
                    {
            ' '
                    }, 2)[1].ToLower());
                    if (sessionByUsernameChat2 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    Session.SendData(PacketComposer.ComposeChat("dq%" + nextString.Split(new char[1]
                    {
            ' '
                    }, 2)[1] + " id is " + (object)sessionByUsernameChat2.CharacterInfo.Id + ".#"));
                    return;
                case "/chatban":
                    if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
                        return;
                    if (commandParts.Length <= 3)
                    {
                        OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, "Invalid command. Use /chatban [id] [time in hours] [reason].");
                        return;
                    }
                    int num2;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 1, "Invalid command. Use /chatban [id] [time in hours] [reason].", out num2))
                        return;
                    int chatBanHours;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 2, "Invalid command. Use /chatban [id] [time in hours] [reason].", out chatBanHours))
                        return;
                    double num3 = (double)chatBanHours;
                    string MessageText1 = string.Join(" ", commandParts, 3, commandParts.Length - 3);
                    Session sessionByCharacterId8 = SessionManager.GetSessionByCharacterId(num2);
                    if (sessionByCharacterId8 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    sessionByCharacterId8.SendData(PacketComposer.Compose("A", "STD|\n\n\n\n\n\n\nYou have been banned from the chat by " + Session.CharacterInfo.Username + " for " + (object)num3 + " hours.\nReason : " + MessageText1));
                    Session.SendData(PacketComposer.Compose("A", "STD|\n\n\n\n\n\n\nYou have banned from the chat " + sessionByCharacterId8.CharacterInfo.Username + " for " + (object)num3 + " hours.\nReason : " + MessageText1));
                    sessionByCharacterId8.SendData(PacketComposer.ComposeChat("dq%You have been banned from the chat by " + Session.CharacterInfo.Username + " for " + (object)num3 + " hours.\nReason : " + MessageText1 + ".#"));
                    Session.SendData(PacketComposer.ComposeChat("dq%You have banned from the chat " + sessionByCharacterId8.CharacterInfo.Username + " for " + (object)num3 + " hours.\nReason : " + MessageText1 + ".#"));
                    ChatManager.MutePlayer(sessionByCharacterId8.CharacterInfo.Id);
                    ChatManager.RemovePlayerFromEICChannel(sessionByCharacterId8);
                    ChatManager.RemovePlayerFromMMOChannel(sessionByCharacterId8);
                    ChatManager.RemovePlayerFromVRUChannel(sessionByCharacterId8);
                    ChatManager.RemovePlayerFromGlobalChannel(sessionByCharacterId8);
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        ModerationBanManager.ChatBanUser(client, num2, MessageText1, sessionByCharacterId8.RemoteAddress, Session.CharacterId, num3 * 3600.0);
                        ModerationBanManager.LogModerationAction(client, Session, "Chat banned user", "User '" + sessionByCharacterId8.CharacterInfo.Username + "' (ID " + (object)sessionByCharacterId8.CharacterId + ") for " + (object)num3 + " hours: '" + MessageText1 + "'");
                        return;
                    }
                case "/ban":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    if (commandParts.Length <= 3)
                    {
                        OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, "Invalid command. Use /ban [id] [time in hours] [reason].");
                        return;
                    }
                    int num5;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 1, "Invalid command. Use /ban [id] [time in hours] [reason].", out num5))
                        return;
                    int banHours;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 2, "Invalid command. Use /ban [id] [time in hours] [reason].", out banHours))
                        return;
                    double num6 = (double)banHours;
                    string MessageText3 = string.Join(" ", commandParts, 3, commandParts.Length - 3);
                    Session sessionByCharacterId9 = SessionManager.GetSessionByCharacterId(num5);
                    if (sessionByCharacterId9 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    sessionByCharacterId9.SendData(PacketComposer.Compose("A", "STD|\n\n\n\n\n\n\nYou have been banned by " + Session.CharacterInfo.Username + " for " + (object)num6 + " hours.\nReason : " + MessageText3));
                    Session.SendData(PacketComposer.Compose("A", "STD|\n\n\n\n\n\n\nYou have banned " + sessionByCharacterId9.CharacterInfo.Username + " for " + (object)num6 + " hours.\nReason : " + MessageText3 + ".#"));
                    sessionByCharacterId9.SendData(PacketComposer.ComposeChat("dq%You have been banned by " + Session.CharacterInfo.Username + " for " + (object)num6 + " hours.\nReason : " + MessageText3 + ".#"));
                    Session.SendData(PacketComposer.ComposeChat("dq%You have banned " + sessionByCharacterId9.CharacterInfo.Username + " for " + (object)num6 + " hours.\nReason : " + MessageText3 + ".#"));
                    ChatManager.MutePlayer(sessionByCharacterId9.CharacterInfo.Id);
                    ChatManager.RemovePlayerFromEICChannel(sessionByCharacterId9);
                    ChatManager.RemovePlayerFromMMOChannel(sessionByCharacterId9);
                    ChatManager.RemovePlayerFromVRUChannel(sessionByCharacterId9);
                    ChatManager.RemovePlayerFromGlobalChannel(sessionByCharacterId9);
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        ModerationBanManager.BanUser(client, num5, MessageText3, sessionByCharacterId9.RemoteAddress, Session.CharacterId, num6 * 3600.0);
                        ModerationBanManager.LogModerationAction(client, Session, "Banned user", "User '" + sessionByCharacterId9.CharacterInfo.Username + "' (ID " + (object)sessionByCharacterId9.CharacterId + ") for " + (object)num6 + " hours: '" + MessageText3 + "'");
                    }
                    sessionByCharacterId9.CharacterInfo.Disconnected = true;
                    MapManager.RemoveUserFromMap(sessionByCharacterId9);
                    SessionManager.StopSession(sessionByCharacterId9.Id);
                    return;
                case "/hp":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    if (commandParts.Length <= 1)
                    {
                        OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, "Invalid command. Use /hp [amount].");
                        return;
                    }
                    int newHP;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 1, "Invalid command. Use /hp [amount].", out newHP))
                        return;
                    Session sessionByCharacterId13 = SessionManager.GetSessionByCharacterId(Session.CharacterId);
                    if (sessionByCharacterId13 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    Session.SendData(PacketComposer.ComposeChat("dq%HP are now set to " + (object)newHP + ".#"));
                    sessionByCharacterId13.CharacterInfo.ShipHp = newHP;
                    sessionByCharacterId13.SendData(PacketComposer.Compose("A", "HL|1|" + (object)sessionByCharacterId13.CharacterInfo.Id + "|HPT|" + (object)sessionByCharacterId13.CharacterInfo.ShipHp + "|" + newHP));
                    return;
                case "/kickPacket":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    if (DataRouter.HasToKick)
                        DataRouter.HasToKick = false;
                    else
                        DataRouter.HasToKick = true;
                    Session.SendData(PacketComposer.Compose("A", "STD|Kick wrong packet : " + DataRouter.HasToKick));
                    break;
                case "/kick":
                    if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
                        return;
                    if (commandParts.Length <= 1)
                    {
                        OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, "Invalid command. Use /kick [id].");
                        return;
                    }
                    int kickTargetId;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 1, "Invalid command. Use /kick [id].", out kickTargetId))
                        return;
                    Session sessionByCharacterId10 = SessionManager.GetSessionByCharacterId(kickTargetId);
                    if (sessionByCharacterId10 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    sessionByCharacterId10.SendData(PacketComposer.Compose("A", "STD|\n\n\n\n\n\n\nYou have been kicked by " + Session.CharacterInfo.Username));
                    Session.SendData(PacketComposer.Compose("A", "STD|\n\n\n\n\n\n\nYou have kicked " + sessionByCharacterId10.CharacterInfo.Username));
                    sessionByCharacterId10.SendData(PacketComposer.ComposeChat("dq%You have been kicked by " + Session.CharacterInfo.Username + ".#"));
                    Session.SendData(PacketComposer.ComposeChat("dq%You have kicked " + sessionByCharacterId10.CharacterInfo.Username + ".#"));
                    ChatManager.MutePlayer(sessionByCharacterId10.CharacterInfo.Id);
                    ChatManager.RemovePlayerFromEICChannel(sessionByCharacterId10);
                    ChatManager.RemovePlayerFromMMOChannel(sessionByCharacterId10);
                    ChatManager.RemovePlayerFromVRUChannel(sessionByCharacterId10);
                    ChatManager.RemovePlayerFromGlobalChannel(sessionByCharacterId10);
                    sessionByCharacterId10.CharacterInfo.Disconnected = true;
                    MapManager.RemoveUserFromMap(sessionByCharacterId10);
                    SessionManager.StopSession(sessionByCharacterId10.Id);
                    return;
                case "/members":
                    foreach (int num in Session.CharacterInfo.Members.Keys)
                    {
                        Session sessionMembers1 = SessionManager.GetSessionByCharacterId(num);
                        Session.SendData(PacketComposer.ComposeChat("dq%Your Members are :" + sessionMembers1.CharacterInfo.Id + "  #"));

                    }
                    return;
                case "/speed":
                    if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
                        return;
                    if (commandParts.Length <= 1)
                    {
                        OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, "Invalid command. Use /speed [amount].");
                        return;
                    }
                    int num8;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 1, "Invalid command. Use /speed [amount].", out num8))
                        return;
                    Session sessionByCharacterId11 = SessionManager.GetSessionByCharacterId(Session.CharacterId);
                    if (sessionByCharacterId11 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    Session.SendData(PacketComposer.ComposeChat("dq%speed is now set to " + (object)num8 + ".#"));
                    sessionByCharacterId11.CharacterInfo.ShipSpeed = num8;
                    sessionByCharacterId11.SendData(PacketComposer.Compose("A", "v|" + (object)sessionByCharacterId11.CharacterInfo.ShipSpeed));
                    return;
                case "/damages":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    if (commandParts.Length <= 1)
                    {
                        OrbitReborn_Emulator.Game.Handlers.Chat.SendCommandUsage(Session, "Invalid command. Use /damages [amount].");
                        return;
                    }
                    int num9;
                    if (!OrbitReborn_Emulator.Game.Handlers.Chat.TryParseIntArgument(Session, commandParts, 1, "Invalid command. Use /damages [amount].", out num9))
                        return;
                    Session sessionByCharacterId12 = SessionManager.GetSessionByCharacterId(Session.CharacterId);
                    if (sessionByCharacterId12 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    Session.SendData(PacketComposer.ComposeChat("dq%damages are now set to " + (object)num9 + ".#"));
                    sessionByCharacterId12.CharacterInfo.Config1.MaxDamage = num9;
                    sessionByCharacterId12.CharacterInfo.Config2.MaxDamage = num9;
                    return;
                case "/stop":
                    if (!Session.CharacterInfo.IsAdmin)
                        return;
                    Session.SendData(PacketComposer.ComposeChat("dq%Stopping emulator...#"));
                    Input.mTimer = new Timer(new TimerCallback(Input.StopDelay), (object)10, 1000, 0);
                    return;
                case "/mute":
                    if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
                        return;
                    if (nextString.Split(' ').Length <= 1)
                        return;
                    Session sessionByUsernameChat6 = SessionManager.GetSessionByUsernameChat(nextString.Split(new char[1]
                    {
            ' '
                    }, 2)[1].ToLower());
                    if (sessionByUsernameChat6 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    ChatManager.MutePlayer(sessionByUsernameChat6.CharacterInfo.Id);
                    ChatManager.RemovePlayerFromEICChannel(sessionByUsernameChat6);
                    ChatManager.RemovePlayerFromMMOChannel(sessionByUsernameChat6);
                    ChatManager.RemovePlayerFromVRUChannel(sessionByUsernameChat6);
                    ChatManager.RemovePlayerFromGlobalChannel(sessionByUsernameChat6);
                    sessionByUsernameChat6.SendData(PacketComposer.ComposeChat("dq%You have been muted by " + Session.CharacterInfo.Username + ".#"));
                    Session.SendData(PacketComposer.ComposeChat("dq%You have muted " + sessionByUsernameChat6.CharacterInfo.Username + ".#"));
                    return;
                case "/unmute":
                    if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
                        return;
                    if (nextString.Split(' ').Length <= 1)
                        return;
                    Session sessionByUsernameChat7 = SessionManager.GetSessionByUsernameChat(nextString.Split(new char[1]
                    {
            ' '
                    }, 2)[1].ToLower());
                    if (sessionByUsernameChat7 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    ChatManager.UnmutePlayer(sessionByUsernameChat7.CharacterInfo.Id);
                    ChatManager.AddPlayerToEICChannel(sessionByUsernameChat7);
                    ChatManager.AddPlayerToMMOChannel(sessionByUsernameChat7);
                    ChatManager.AddPlayerToVRUChannel(sessionByUsernameChat7);
                    ChatManager.AddPlayerToGlobalChannel(sessionByUsernameChat7);
                    sessionByUsernameChat7.SendData(PacketComposer.ComposeChat("dq%You have been unmuted by " + Session.CharacterInfo.Username + ".#"));
                    Session.SendData(PacketComposer.ComposeChat("dq%You have unmuted " + sessionByUsernameChat7.CharacterInfo.Username + ".#"));
                    return;
                case "/muteall":
                    if (Session.CharacterInfo.IsAdmin || Session.CharacterInfo.IsMod)
                    {
                        ChatManager.ChatMuted = true;
                        Session.SendData(PacketComposer.ComposeChat("dq%Chat muted.#"));
                        return;
                    }
                    break;
                case "/unmuteall":
                    if (Session.CharacterInfo.IsAdmin || Session.CharacterInfo.IsMod)
                    {
                        ChatManager.ChatMuted = false;
                        Session.SendData(PacketComposer.ComposeChat("dq%Chat unmuted.#"));
                        return;
                    }
                    break;
                case "/users":
                    Session.SendData(PacketComposer.ComposeChat("dq%<span class='admin'>" + (object)SessionManager.ConnectedUserData.Count + " users online</span>.#"));
                    return;
                case "/send":
                    if (Session.CharacterInfo.IsAdmin)
                    {
                        Session.SendData(PacketComposer.Compose("A", "STD|~~~ Andromeda ~~~"));
                        Session.SendData(PacketComposer.ComposeChat("dq%<span class='admin'>Packet sent</span>.#"));
                        return;
                    }
                    break;
                case "/w":
                    if (nextString.Split(' ').Length <= 1)
                        return;
                    string str3 = nextString.Split(' ')[1];
                    int num10 = nextString.IndexOf(' ');
                    int num11 = nextString.IndexOf(' ', num10 + 1);
                    string str4 = nextString.Remove(0, num11 + 1);
                    if (Session.CharacterInfo.Username.ToLower() == str3.ToLower())
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%You can't whisper yourself.#"));
                        return;
                    }
                    Session sessionByUsernameChat8 = SessionManager.GetSessionByUsernameChat(str3.ToLower());
                    if (sessionByUsernameChat8 == null)
                    {
                        Session.SendData(PacketComposer.ComposeChat("dq%The user don't exist or is not online.#"));
                        return;
                    }
                    Session.SendData(PacketComposer.ComposeChat("cw%" + sessionByUsernameChat8.CharacterInfo.Username + "@ " + str4 + "#"));
                    sessionByUsernameChat8.SendData(PacketComposer.ComposeChat("cv%" + Session.CharacterInfo.Username + "@ " + str4 + "#"));

                    ChatManager.BroadcastMessage(PacketComposer.ComposeChat("a%" + (object)5 + "@[" + Session.CharacterInfo.Username + " TO " + sessionByUsernameChat8.CharacterInfo.Username + "]@" + str4 + "#"), false);
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        client.ClearParameters();
                        client.SetParameter("whisper", (object)Session.CharacterInfo.Id);
                        client.SetParameter("whispered", (object)sessionByUsernameChat8.CharacterInfo.Id);
                        client.SetParameter("message", (object)str4);
                        client.ExecuteNonQuery("INSERT INTO chat_whispers (id_whisper, message, id_whispered) VALUES (@whisper,@message, @whispered)");
                    }
                    return;
            }
            if (str1.StartsWith("/"))
                Session.SendData(PacketComposer.ComposeChat("dq%The command you entered does not exist.#"));
            else if (GroupManager.IsGroupChatRoomFor(Session, Session.CurrentChatRoom))
            {
                if (ChatManager.ChatMuted || ChatManager.IsMuted(Session.CharacterInfo.Id))
                    return;
                GroupManager.BroadcastGroupChat(Session, nextString);
            }
            else if (Session.CurrentChatRoom == 5)
            {
                return;
            }
            else if (Session.CharacterInfo.IsAdmin || Session.CharacterInfo.IsMod)
            {
                ChatManager.BroadcastMessage(PacketComposer.ComposeChat("j%" + (object)Session.CurrentChatRoom + "@" + Session.CharacterInfo.Username + "@" + nextString + "@3#"), false);
            }
            else
            {
                if (ChatManager.ChatMuted || ChatManager.IsMuted(Session.CharacterInfo.Id))
                    return;
                if (Session.CharacterInfo.ClanTag == "")
                {
                    ServerMessage msgNormal = PacketComposer.ComposeChat("a%" + (object)Session.CurrentChatRoom + "@" + Session.CharacterInfo.Username + "@" + nextString + "#");
                    ServerMessage msgAdmin = PacketComposer.ComposeChat("a%" + (object)Session.CurrentChatRoom + "@" + Session.CharacterInfo.Username + " - " + Session.CharacterId.ToString() + "@" + nextString + "#");
                    ChatManager.BroadcastMessageDifferentForAdmin(msgNormal, msgAdmin, false);
                }
                else
                {
                    ServerMessage msgNormal = PacketComposer.ComposeChat("a%" + (object)Session.CurrentChatRoom + "@" + Session.CharacterInfo.Username + "@" + nextString + "@" + Session.CharacterInfo.ClanTag + "#");
                    ServerMessage msgAdmin = PacketComposer.ComposeChat("a%" + (object)Session.CurrentChatRoom + "@" + Session.CharacterInfo.Username + " - " + Session.CharacterId.ToString() + "@" + nextString + "@" + Session.CharacterInfo.ClanTag + "#");
                    ChatManager.BroadcastMessageDifferentForAdmin(msgNormal, msgAdmin, false);
                }
            }
        }
    }
}




