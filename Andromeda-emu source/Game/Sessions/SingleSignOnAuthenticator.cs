// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Sessions.SingleSignOnAuthenticator
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Config;
using OrbitReborn_Emulator.Game.Moderation;
using OrbitReborn_Emulator.Storage;
using System;
using System.Data;

namespace OrbitReborn_Emulator.Game.Sessions
{
    public static class SingleSignOnAuthenticator
    {
        private static int mSuccessfulLoginCount;
        private static int mFailedLoginCount;
        private static object mAuthSyncRoot;

        public static int SuccessfulLoginCount
        {
            get
            {
                return SingleSignOnAuthenticator.mSuccessfulLoginCount;
            }
        }

        public static int FailedLoginCount
        {
            get
            {
                return SingleSignOnAuthenticator.mFailedLoginCount;
            }
        }

        public static int TotalLoginCount
        {
            get
            {
                return SingleSignOnAuthenticator.mSuccessfulLoginCount + SingleSignOnAuthenticator.mFailedLoginCount;
            }
        }

        public static void Initialize()
        {
            SingleSignOnAuthenticator.mSuccessfulLoginCount = 0;
            SingleSignOnAuthenticator.mFailedLoginCount = 0;
            SingleSignOnAuthenticator.mAuthSyncRoot = new object();
        }

        public static int TryAuthenticate(SqlDatabaseClient MySqlClient, string Ticket, string RemoteAddress)
        {
            Output.WriteLine((object)("sso : '" + Ticket + "'"));
            Ticket = Ticket.Trim();
            if (Ticket.Length <= 5)
            {
                ++SingleSignOnAuthenticator.mFailedLoginCount;
                Output.WriteLine((object)("Login from " + RemoteAddress + " rejected: SSO ticket too short."));
                return 0;
            }
            string str = (string)ConfigManager.GetValue("debug.sso");
            if (str.Length > 0 && Ticket == str)
                return 1;
            int num = 0;
            string empty = string.Empty;
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("ticket", (object)Ticket);
            DataRow dataRow = MySqlClient.ExecuteQueryRow("SELECT id,username FROM users WHERE AuthTicket = @ticket LIMIT 1");
            if (dataRow != null)
            {
                num = (int)dataRow["id"];
                empty = (string)dataRow["username"];
                SingleSignOnAuthenticator.RemoveTicket(MySqlClient, (int)dataRow["id"], RemoteAddress);
            }
            if (num <= 0)
            {
                ++SingleSignOnAuthenticator.mFailedLoginCount;
                Output.WriteLine((object)("Login from " + RemoteAddress + " rejected: invalid SSO ticket."));
                return 0;
            }
            if (ModerationBanManager.IsUserIdBlacklisted(num))
            {
                ++SingleSignOnAuthenticator.mFailedLoginCount;
                Output.WriteLine((object)("Login from " + RemoteAddress + " rejected: blacklisted ID."));
                return 0;
            }
            if (SessionManager.ContainsCharacterId(num))
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(num);
                if (sessionByCharacterId != null)
                {
                    try
                    {
                        if (sessionByCharacterId.CharacterInfo != null)
                            sessionByCharacterId.CharacterInfo.SynchronizeShipSkillCooldowns(MySqlClient);
                    }
                    catch (Exception ex)
                    {
                        Output.WriteLine((object)("SSO ship skill cooldown sync failed before reconnect handoff: " + ex.ToString()), OutputLevel.Warning);
                    }
                }
                Output.WriteLine((object)"SSO existing gameplay session found; keeping ship on map for reconnect handoff.");
            }
            Output.WriteLine((object)("User " + empty + " (ID " + (object)num + ") has logged in from " + RemoteAddress + "."));
            ++SingleSignOnAuthenticator.mSuccessfulLoginCount;
            return num;
        }

        private static void RemoveTicket(SqlDatabaseClient MySqlClient, int UserId, string AddressToLog)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)UserId);
            MySqlClient.SetParameter("lastip", (object)AddressToLog);
            MySqlClient.SetParameter("lastonline", (object)UnixTimestamp.GetCurrent());
            MySqlClient.ExecuteNonQuery("UPDATE users SET AuthTicket = '', ip = @lastip, lastlogin = @lastonline, online = 1 WHERE id = @id LIMIT 1");
        }
    }
}
