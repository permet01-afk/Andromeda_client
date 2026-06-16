

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
        long perfStart = PerformanceProfiler.Start();
        try
        {
          using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("StatisticsSyncUtil.ProcessThread"))
          {
            client.ClearParameters();
            client.SetParameter("skey", (object) "active_connections");
            client.SetParameter("sval", (object) SessionManager.ConnectedUserData.Count);
            client.ExecuteNonQuery("UPDATE server_statistics SET sval = @sval WHERE skey = @skey LIMIT 1");
          }
        }
        finally
        {
          PerformanceProfiler.LogCleanup("StatisticsSyncUtil.ProcessThread", perfStart);
        }
        Thread.Sleep(60000);
      }
    }
  }
}
