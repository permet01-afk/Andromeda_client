

using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Data;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Moderation
{
  public static class ModerationBanManager
  {
    private static CList<int> mCharacterBlacklist;
    private static CList<string> mRemoteAddressBlacklist;
    private static CList<int> mChatBlacklist;
    private static Timer mWorker;
    private static object mSyncRoot;

    public static void Initialize(SqlDatabaseClient MySqlClient)
    {
      ModerationBanManager.mCharacterBlacklist = new CList<int>();
      ModerationBanManager.mRemoteAddressBlacklist = new CList<string>();
      ModerationBanManager.mChatBlacklist = new CList<int>();
      ModerationBanManager.mSyncRoot = new object();
      ModerationBanManager.mWorker = new Timer(new TimerCallback(ModerationBanManager.ProcessThread), (object) null, TimeSpan.FromMinutes(15.0), TimeSpan.FromMinutes(15.0));
      ModerationBanManager.ReloadCache(MySqlClient);
    }

    public static void ProcessThread(object state)
    {
      long perfStart = PerformanceProfiler.Start();
      try
      {
        using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("ModerationBanManager.ReloadCache"))
          ModerationBanManager.ReloadCache(client);
      }
      finally
      {
        PerformanceProfiler.LogCleanup("ModerationBanManager.ReloadCache", perfStart);
      }
    }

    public static void ReloadCache(SqlDatabaseClient MySqlClient)
    {
      lock (ModerationBanManager.mSyncRoot)
      {
        ModerationBanManager.mCharacterBlacklist.Clear();
        ModerationBanManager.mRemoteAddressBlacklist.Clear();
        ModerationBanManager.mChatBlacklist.Clear();
        MySqlClient.ClearParameters();
        MySqlClient.SetParameter("timestamp", (object) UnixTimestamp.GetCurrent());
        foreach (DataRow item_0 in (InternalDataCollectionBase) MySqlClient.ExecuteQueryTable("SELECT * FROM bans WHERE timestamp_expire > @timestamp").Rows)
        {
          int local_2 = (int) item_0["user_id"];
          string local_3 = (string) item_0["remote_address"];
          if (local_2 > 0 && !ModerationBanManager.mCharacterBlacklist.Contains(local_2))
            ModerationBanManager.mCharacterBlacklist.Add(local_2);
          if (local_3.Length > 0 && !ModerationBanManager.mRemoteAddressBlacklist.Contains(local_3))
            ModerationBanManager.mRemoteAddressBlacklist.Add(local_3);
        }
        MySqlClient.ClearParameters();
        MySqlClient.SetParameter("timestamp", (object) UnixTimestamp.GetCurrent());
        foreach (DataRow item_1 in (InternalDataCollectionBase) MySqlClient.ExecuteQueryTable("SELECT * FROM chat_bans WHERE timestamp_expire > @timestamp").Rows)
        {
          int local_2_1 = (int) item_1["user_id"];
          if (local_2_1 > 0 && !ModerationBanManager.mChatBlacklist.Contains(local_2_1))
            ModerationBanManager.mChatBlacklist.Add(local_2_1);
        }
      }
    }

    public static bool IsRemoteAddressBlacklisted(string RemoteAddressString)
    {
      lock (ModerationBanManager.mSyncRoot)
        return ModerationBanManager.mRemoteAddressBlacklist.Contains(RemoteAddressString);
    }

    public static bool IsUserIdBlacklisted(int UserId)
    {
      lock (ModerationBanManager.mSyncRoot)
        return ModerationBanManager.mCharacterBlacklist.Contains(UserId);
    }

    public static bool IsUserIdChatBlacklisted(int UserId)
    {
      lock (ModerationBanManager.mSyncRoot)
        return ModerationBanManager.mChatBlacklist.Contains(UserId);
    }

    public static void BanUser(SqlDatabaseClient MySqlClient, int UserId, string MessageText, string IP, int ModeratorId, double Length)
    {
      MySqlClient.ClearParameters();
      MySqlClient.SetParameter("userid", (object) UserId);
      MySqlClient.SetParameter("reason", (object) MessageText);
      MySqlClient.SetParameter("ip", (object) IP);
      MySqlClient.SetParameter("timestamp", (object) UnixTimestamp.GetCurrent());
      MySqlClient.SetParameter("timestampex", (object) (UnixTimestamp.GetCurrent() + Length));
      MySqlClient.SetParameter("moderator", (object) ModeratorId);
      MySqlClient.ExecuteNonQuery("INSERT INTO bans (user_id,remote_address,reason_text,timestamp_created,timestamp_expire,moderator_id) VALUES (@userid,@ip,@reason,@timestamp,@timestampex,@moderator)");
      lock (ModerationBanManager.mSyncRoot)
      {
        ModerationBanManager.mCharacterBlacklist.Add(UserId);
        ModerationBanManager.mRemoteAddressBlacklist.Add(IP);
      }
    }

    public static void ChatBanUser(SqlDatabaseClient MySqlClient, int UserId, string MessageText, string IP, int ModeratorId, double Length)
    {
      MySqlClient.ClearParameters();
      MySqlClient.SetParameter("userid", (object) UserId);
      MySqlClient.SetParameter("reason", (object) MessageText);
      MySqlClient.SetParameter("ip", (object) IP);
      MySqlClient.SetParameter("timestamp", (object) UnixTimestamp.GetCurrent());
      MySqlClient.SetParameter("timestampex", (object) (UnixTimestamp.GetCurrent() + Length));
      MySqlClient.SetParameter("moderator", (object) ModeratorId);
      MySqlClient.ExecuteNonQuery("INSERT INTO chat_bans (user_id,remote_address,reason_text,timestamp_created,timestamp_expire,moderator_id) VALUES (@userid,@ip,@reason,@timestamp,@timestampex,@moderator)");
      lock (ModerationBanManager.mSyncRoot)
        ModerationBanManager.mChatBlacklist.Add(UserId);
    }

    public static void LogModerationAction(SqlDatabaseClient MySqlClient, Session Session, string ActionDescr, string ActionDetail)
    {
      MySqlClient.ClearParameters();
      MySqlClient.SetParameter("userid", (object) Session.CharacterInfo.Id);
      MySqlClient.SetParameter("username", (object) Session.CharacterInfo.Username);
      MySqlClient.SetParameter("timestamp", (object) UnixTimestamp.GetCurrent());
      MySqlClient.SetParameter("actiondescr", (object) ActionDescr);
      MySqlClient.SetParameter("actiondetail", (object) ActionDetail);
      MySqlClient.ExecuteNonQuery("INSERT INTO moderation_action_log (moderator_id,moderator_name,action_descr,action_detail,timestamp) VALUES (@userid,@username,@actiondescr,@actiondetail,@timestamp)");
    }
  }
}
