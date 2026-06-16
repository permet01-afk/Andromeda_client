

using MySql.Data.MySqlClient;
using OrbitReborn_Emulator.Config;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Storage
{
  public static class SqlDatabaseManager
  {
    private static CDictionnary<int, SqlDatabaseClient> mClients;
    private static int mStarvationCounter;
    private static int mMinPoolSize;
    private static int mMaxPoolSize;
    private static int mPoolLifetime;
    private static int mClientIdGenerator;
    private static object mSyncRoot;
    private static ManualResetEvent mPoolWait;
    private static Timer mMonitorThread;

    public static int ClientCount
    {
      get
      {
        return SqlDatabaseManager.mClients.Count;
      }
    }

    public static bool TryGetPoolUsage(out int UsedClients, out int TotalClients, out int MaxClients)
    {
      UsedClients = 0;
      TotalClients = 0;
      MaxClients = SqlDatabaseManager.mMaxPoolSize;

      if (SqlDatabaseManager.mClients == null || SqlDatabaseManager.mSyncRoot == null)
        return false;

      lock (SqlDatabaseManager.mSyncRoot)
      {
        TotalClients = SqlDatabaseManager.mClients.Count;
        MaxClients = SqlDatabaseManager.mMaxPoolSize;
        UsedClients = SqlDatabaseManager.GetUsedClientCountUnsafe();
      }

      return true;
    }

    public static void Initialize()
    {
      SqlDatabaseManager.mClients = new CDictionnary<int, SqlDatabaseClient>();
      SqlDatabaseManager.mMinPoolSize = (int) ConfigManager.GetValue("mysql.pool.min");
      SqlDatabaseManager.mMaxPoolSize = (int) ConfigManager.GetValue("mysql.pool.max");
      SqlDatabaseManager.mPoolLifetime = (int) ConfigManager.GetValue("mysql.pool.lifetime");
      SqlDatabaseManager.mSyncRoot = new object();
      SqlDatabaseManager.mPoolWait = new ManualResetEvent(true);
      double monitorIntervalSeconds = Math.Max(1.0, SqlDatabaseManager.mPoolLifetime / 2.0);
      TimeSpan monitorInterval = TimeSpan.FromSeconds(monitorIntervalSeconds);
      SqlDatabaseManager.mMonitorThread = new Timer(new TimerCallback(SqlDatabaseManager.ProcessMonitorThread), (object) null, monitorInterval, monitorInterval);
      if (SqlDatabaseManager.mMinPoolSize < 0)
        throw new ArgumentException("(Sql) Invalid database pool size configured (less than zero).");
      SqlDatabaseManager.SetClientAmount(SqlDatabaseManager.mMinPoolSize, "server init");
    }

    public static void Uninitialize()
    {
      int num = 0;
      SpinWait shutdownWait = new SpinWait();
      while (SqlDatabaseManager.mClients.Count > 0)
      {
        lock (SqlDatabaseManager.mSyncRoot)
        {
          CList<int> local_1 = new CList<int>();
          foreach (SqlDatabaseClient item_0 in (IEnumerable<SqlDatabaseClient>) SqlDatabaseManager.mClients.Values)
          {
            if (item_0.Available || num > 15)
              local_1.Add(item_0.Id);
          }
          foreach (int item_1 in (IEnumerable<int>) local_1.Keys)
          {
            SqlDatabaseManager.mClients[item_1].Close();
            SqlDatabaseManager.mClients.Remove(item_1);
          }
        }
        if (SqlDatabaseManager.mClients.Count > 0)
        {
          Output.WriteLine((object) ("(Sql) Waiting for all database clients to release (" + (object) ++num + ")..."), OutputLevel.DebugInformation);
          shutdownWait.SpinOnce();
        }
      }
    }

    public static void ProcessMonitorThread(object state)
    {
      if (SqlDatabaseManager.ClientCount <= SqlDatabaseManager.mMinPoolSize)
        return;
      lock (SqlDatabaseManager.mSyncRoot)
      {
        CList<int> local_0 = new CList<int>();
        foreach (SqlDatabaseClient item_0 in (IEnumerable<SqlDatabaseClient>) SqlDatabaseManager.mClients.Values)
        {
          if (item_0.Available && item_0.TimeInactive >= (double) SqlDatabaseManager.mPoolLifetime)
            local_0.Add(item_0.Id);
        }
        foreach (int item_1 in (IEnumerable<int>) local_0.Keys)
        {
          SqlDatabaseManager.mClients[item_1].Close();
          SqlDatabaseManager.mClients.Remove(item_1);
        }
        if (local_0.Count > 0)
          Output.WriteLine((object) ("(Sql) Disconnected " + (object) local_0.Count + " inactive client(s)."), OutputLevel.DebugInformation);
      }
    }

    public static void SetClientAmount(int ClientAmount, string LogReason = "Unknown")
    {
      lock (SqlDatabaseManager.mSyncRoot)
      {
        int local_0 = ClientAmount - SqlDatabaseManager.ClientCount;
        if (local_0 > 0)
        {
          for (int local_1 = 0; local_1 < local_0; ++local_1)
          {
            int local_2 = SqlDatabaseManager.GenerateClientId();
            SqlDatabaseManager.mClients.Add(local_2, SqlDatabaseManager.CreateClient(local_2));
          }
        }
        else
        {
          int local_3 = -local_0;
          int local_4 = 0;
          foreach (SqlDatabaseClient item_0 in (IEnumerable<SqlDatabaseClient>) SqlDatabaseManager.mClients.Values)
          {
            if (item_0.Available)
            {
              if (local_4 < local_3 && SqlDatabaseManager.ClientCount > SqlDatabaseManager.mMinPoolSize)
              {
                item_0.Close();
                SqlDatabaseManager.mClients.Remove(item_0.Id);
                ++local_4;
              }
              else
                break;
            }
          }
        }
      }
    }

    public static SqlDatabaseClient GetClient()
    {
      return SqlDatabaseManager.GetClient(null);
    }

    public static SqlDatabaseClient GetClient(string Caller)
    {
      long perfStart = PerformanceProfiler.Start();
      return SqlDatabaseManager.GetClientInternal(perfStart, Caller);
    }

    private static SqlDatabaseClient GetClientInternal(long PerfStart, string Caller)
    {
      lock (SqlDatabaseManager.mSyncRoot)
      {
        foreach (SqlDatabaseClient item_0 in (IEnumerable<SqlDatabaseClient>) SqlDatabaseManager.mClients.Values)
        {
          if (item_0.Available)
          {
            item_0.Available = false;
            PerformanceProfiler.LogSqlPoolWait(Caller, PerfStart, SqlDatabaseManager.GetUsedClientCountUnsafe(), SqlDatabaseManager.mMaxPoolSize, false);
            return item_0;
          }
        }
        if (SqlDatabaseManager.mMaxPoolSize <= 0 || SqlDatabaseManager.ClientCount < SqlDatabaseManager.mMaxPoolSize)
        {
          SqlDatabaseManager.SetClientAmount(SqlDatabaseManager.ClientCount + 1, "out of assignable clients in GetClient()");
          return SqlDatabaseManager.GetClientInternal(PerfStart, Caller);
        }
        ++SqlDatabaseManager.mStarvationCounter;
        Output.WriteLine((object) ("(Sql) Client starvation; out of assignable clients/maximum pool size reached. Consider increasing the `mysql.pool.max` configuration value. Starvation count is " + (object) SqlDatabaseManager.mStarvationCounter + "."), OutputLevel.Warning);
        PerformanceProfiler.LogSqlPoolWait(Caller, PerfStart, SqlDatabaseManager.GetUsedClientCountUnsafe(), SqlDatabaseManager.mMaxPoolSize, true);
        Monitor.Wait(SqlDatabaseManager.mSyncRoot);
        return SqlDatabaseManager.GetClientInternal(PerfStart, Caller);
      }
    }

    private static int GetUsedClientCountUnsafe()
    {
      int usedClients = 0;

      if (SqlDatabaseManager.mClients == null)
        return usedClients;

      foreach (SqlDatabaseClient client in (IEnumerable<SqlDatabaseClient>) SqlDatabaseManager.mClients.Values)
      {
        if (client != null && !client.Available)
          ++usedClients;
      }

      return usedClients;
    }

    public static void PokeAllAwaiting()
    {
      lock (SqlDatabaseManager.mSyncRoot)
        Monitor.PulseAll(SqlDatabaseManager.mSyncRoot);
    }

    private static int GenerateClientId()
    {
      lock (SqlDatabaseManager.mSyncRoot)
        return SqlDatabaseManager.mClientIdGenerator++;
    }

    private static SqlDatabaseClient CreateClient(int Id)
    {
      MySqlConnection Connection = new MySqlConnection(SqlDatabaseManager.GenerateConnectionString());
      Connection.Open();
      return new SqlDatabaseClient(Id, Connection);
    }

    public static string GenerateConnectionString()
    {
      return new MySqlConnectionStringBuilder()
      {
        Server = ((string) ConfigManager.GetValue("mysql.host")),
        Port = ((uint) (int) ConfigManager.GetValue("mysql.port")),
        UserID = ((string) ConfigManager.GetValue("mysql.user")),
        Password = ((string) ConfigManager.GetValue("mysql.pass")),
        Database = ((string) ConfigManager.GetValue("mysql.dbname")),
        MinimumPoolSize = ((uint) (int) ConfigManager.GetValue("mysql.pool.min")),
        MaximumPoolSize = ((uint) (int) ConfigManager.GetValue("mysql.pool.max"))
      }.ToString();
    }
  }
}
