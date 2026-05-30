// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Util.StatisticsSyncUtil
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using System.Threading;

namespace OrbitReborn_Emulator.Util
{
  public static class StatisticsSyncUtil
  {
    public static void Initialize()
    {
      new Thread(new ThreadStart(StatisticsSyncUtil.ProcessThread))
      {
        Priority = ThreadPriority.Lowest,
        Name = "StatisticsDbSyncThread"
      }.Start();
    }

    private static void ProcessThread()
    {
      while (Program.Alive)
      {
        using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
        {
          client.ClearParameters();
          client.SetParameter("skey", (object) "active_connections");
          client.SetParameter("sval", (object) SessionManager.ConnectedUserData.Count);
          client.ExecuteNonQuery("UPDATE server_statistics SET sval = @sval WHERE skey = @skey LIMIT 1");
        }
        Thread.Sleep(60000);
      }
    }
  }
}
