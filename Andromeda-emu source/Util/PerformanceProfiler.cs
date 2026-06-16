using OrbitReborn_Emulator.Config;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using System;
using System.Diagnostics;
using System.Threading;

namespace OrbitReborn_Emulator.Util
{
    public static class PerformanceProfiler
    {
        private static volatile bool mEnabled;
        private static int mSqlWaitWarnMs = 100;
        private static int mTimerWarnMs = 100;
        private static int mRewardWarnMs = 250;
        private static int mLogWriteWarnMs = 100;
        private static int mSystemSampleSeconds = 30;
        private static int mNetworkWarnBytesPerSecond;
        private static int mServerStallWarnMs = 1000;
        private static int mMapWarnMs = 100;
        private static int mCleanupWarnMs = 100;
        private static Timer mSampleTimer;
        private static Timer mServerStallTimer;
        private static DateTime mLastSampleUtc;
        private static DateTime mLastServerStallTickUtc;
        private static TimeSpan mLastProcessCpu;
        private static int mLastGc0Count;
        private static int mLastGc1Count;
        private static int mLastGc2Count;
        private const int ServerStallExpectedMs = 1000;
        private const int ServerStallJitterGuardMs = 100;

        private static long mInBytes;
        private static long mOutBytes;
        private static long mInPackets;
        private static long mOutPackets;
        private static long mPendingSends;
        private static long mPendingSendBytes;
        private static long mLastInBytes;
        private static long mLastOutBytes;
        private static long mLastInPackets;
        private static long mLastOutPackets;

        [ThreadStatic]
        private static bool mSuppressLogWriteProfiling;

        public static bool Enabled
        {
            get { return mEnabled; }
        }

        public static void Initialize()
        {
            mEnabled = GetBoolConfig("performance.profiling.enabled", false);
            mSqlWaitWarnMs = GetIntConfig("performance.sql.wait.warn.ms", 100);
            mTimerWarnMs = GetIntConfig("performance.timer.warn.ms", 100);
            mRewardWarnMs = GetIntConfig("performance.reward.warn.ms", 250);
            mLogWriteWarnMs = GetIntConfig("performance.logwrite.warn.ms", 100);
            mSystemSampleSeconds = GetIntConfig("performance.system.sample.seconds", 30);
            mNetworkWarnBytesPerSecond = GetIntConfig("performance.network.warn.bytes.per.sec", 0);
            mServerStallWarnMs = GetIntConfig("performance.serverstall.warn.ms", 1000);
            mMapWarnMs = GetIntConfig("performance.map.warn.ms", 100);
            mCleanupWarnMs = GetIntConfig("performance.cleanup.warn.ms", 100);

            if (!mEnabled)
                return;

            mLastServerStallTickUtc = DateTime.UtcNow;
            if (mServerStallWarnMs > 0)
            {
                mServerStallTimer = new Timer(
                    new TimerCallback(ServerStallTick),
                    null,
                    TimeSpan.FromMilliseconds(ServerStallExpectedMs),
                    TimeSpan.FromMilliseconds(ServerStallExpectedMs)
                );
            }

            if (mSystemSampleSeconds <= 0)
                return;

            mLastSampleUtc = DateTime.UtcNow;
            mLastProcessCpu = GetProcessCpuTime();
            mLastGc0Count = GC.CollectionCount(0);
            mLastGc1Count = GC.CollectionCount(1);
            mLastGc2Count = GC.CollectionCount(2);
            mSampleTimer = new Timer(
                new TimerCallback(SampleTick),
                null,
                TimeSpan.FromSeconds(mSystemSampleSeconds),
                TimeSpan.FromSeconds(mSystemSampleSeconds)
            );
        }

        public static void Uninitialize()
        {
            Timer timer = mSampleTimer;
            mSampleTimer = null;
            if (timer != null)
                timer.Dispose();

            Timer stallTimer = mServerStallTimer;
            mServerStallTimer = null;
            if (stallTimer != null)
                stallTimer.Dispose();
        }

        public static long Start()
        {
            if (!mEnabled)
                return 0L;

            return Stopwatch.GetTimestamp();
        }

        public static long ElapsedMilliseconds(long startTimestamp)
        {
            if (startTimestamp <= 0L)
                return 0L;

            long elapsedTicks = Stopwatch.GetTimestamp() - startTimestamp;
            return (long)((elapsedTicks * 1000.0) / Stopwatch.Frequency);
        }

        public static void LogSqlPoolWait(string caller, long startTimestamp, int usedClients, int maxClients, bool starvation)
        {
            if (!mEnabled)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (!starvation && elapsedMs < mSqlWaitWarnMs)
                return;

            string message = "[PERF][SQL_POOL] wait=" + elapsedMs + "ms used=" + usedClients + "/" + FormatLimit(maxClients);
            if (starvation)
                message += " starvation=1";
            message += " caller=" + NormalizeLabel(caller);
            WritePerf(message);
        }

        public static void LogTimer(string name, int userId, long startTimestamp)
        {
            if (!mEnabled || startTimestamp <= 0L)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (elapsedMs < mTimerWarnMs)
                return;

            string message = "[PERF][TIMER] " + NormalizeLabel(name);
            if (userId > 0)
                message += " user=" + userId;
            message += " duration=" + elapsedMs + "ms";
            WritePerf(message);
        }

        public static void LogTitle(string name, long startTimestamp)
        {
            if (!mEnabled || startTimestamp <= 0L)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (elapsedMs < mTimerWarnMs)
                return;

            WritePerf("[PERF][TITLE] name=" + NormalizeLabel(name) + " duration=" + elapsedMs + "ms");
        }

        public static void LogMapOperation(string action, int mapId, int instanceId, long startTimestamp)
        {
            if (!mEnabled || startTimestamp <= 0L)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (elapsedMs < mMapWarnMs)
                return;

            WritePerf(
                "[PERF][MAPMGR] action=" + NormalizeLabel(action) +
                " map=" + mapId +
                " instance=" + instanceId +
                " duration=" + elapsedMs + "ms"
            );
        }

        public static void LogCleanup(string name, long startTimestamp)
        {
            LogCleanup(name, 0, 0, startTimestamp);
        }

        public static void LogCleanup(string name, int mapId, int instanceId, long startTimestamp)
        {
            if (!mEnabled || startTimestamp <= 0L)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (elapsedMs < mCleanupWarnMs)
                return;

            string message = "[PERF][CLEANUP] name=" + NormalizeLabel(name) + " duration=" + elapsedMs + "ms";
            if (mapId > 0)
                message += " map=" + mapId;
            if (instanceId > 0)
                message += " instance=" + instanceId;
            WritePerf(message);
        }

        public static void LogNpcReward(string npcName, int playerId, long startTimestamp, long rewardMs, long logMs, long npcCountMs, long questMs, long titleMs)
        {
            if (!mEnabled || startTimestamp <= 0L)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (elapsedMs < mRewardWarnMs)
                return;

            WritePerf(
                "[PERF][NPC_REWARD] npc=" + NormalizeLabel(npcName) +
                " killer=" + playerId +
                " duration=" + elapsedMs + "ms" +
                " rewardDb=" + rewardMs + "ms" +
                " logDb=" + logMs + "ms" +
                " npcCountDb=" + npcCountMs + "ms" +
                " quest=" + questMs + "ms" +
                " title=" + titleMs + "ms"
            );
        }

        public static void LogPvpReward(int killerId, int victimId, long startTimestamp, long dbBlockMs, long questMs, long weeklyMs, long titleMs, long assistMs)
        {
            if (!mEnabled || startTimestamp <= 0L)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (elapsedMs < mRewardWarnMs)
                return;

            WritePerf(
                "[PERF][PVP_REWARD] killer=" + killerId +
                " victim=" + victimId +
                " duration=" + elapsedMs + "ms" +
                " dbBlock=" + dbBlockMs + "ms" +
                " quest=" + questMs + "ms" +
                " weekly=" + weeklyMs + "ms" +
                " title=" + titleMs + "ms" +
                " assists=" + assistMs + "ms"
            );
        }

        public static long BeginLogWrite()
        {
            if (!mEnabled || mSuppressLogWriteProfiling)
                return 0L;

            return Stopwatch.GetTimestamp();
        }

        public static void EndLogWrite(long startTimestamp, OutputLevel level)
        {
            if (!mEnabled || startTimestamp <= 0L || mSuppressLogWriteProfiling)
                return;

            long elapsedMs = ElapsedMilliseconds(startTimestamp);
            if (elapsedMs < mLogWriteWarnMs)
                return;

            try
            {
                mSuppressLogWriteProfiling = true;
                WritePerf("[PERF][LOG_WRITE] duration=" + elapsedMs + "ms level=" + level);
            }
            finally
            {
                mSuppressLogWriteProfiling = false;
            }
        }

        public static void RecordNetworkReceiveBytes(int bytes)
        {
            if (!mEnabled || bytes <= 0)
                return;

            Interlocked.Add(ref mInBytes, bytes);
        }

        public static void RecordNetworkIncomingPacket(int bytes)
        {
            if (!mEnabled)
                return;

            Interlocked.Increment(ref mInPackets);
        }

        public static void RecordNetworkSend(int bytes)
        {
            if (!mEnabled || bytes <= 0)
                return;

            Interlocked.Add(ref mOutBytes, bytes);
            Interlocked.Increment(ref mOutPackets);
            Interlocked.Add(ref mPendingSendBytes, bytes);
            Interlocked.Increment(ref mPendingSends);
        }

        public static void RecordNetworkSendCompleted(int bytes)
        {
            if (!mEnabled || bytes <= 0)
                return;

            Interlocked.Add(ref mPendingSendBytes, -bytes);
            Interlocked.Decrement(ref mPendingSends);
        }

        private static void ServerStallTick(object state)
        {
            if (!mEnabled)
                return;

            DateTime now = DateTime.UtcNow;
            DateTime previous = mLastServerStallTickUtc;
            mLastServerStallTickUtc = now;

            if (previous == DateTime.MinValue)
                return;

            long gapMs = (long)(now - previous).TotalMilliseconds;
            int effectiveThreshold = Math.Max(mServerStallWarnMs, ServerStallExpectedMs + ServerStallJitterGuardMs);
            if (gapMs <= effectiveThreshold)
                return;

            WritePerf("[PERF][SERVER_STALL] gap=" + gapMs + "ms expected=" + ServerStallExpectedMs + "ms");
        }

        private static void SampleTick(object state)
        {
            if (!mEnabled)
                return;

            DateTime now = DateTime.UtcNow;
            double elapsedSeconds = Math.Max(1.0, (now - mLastSampleUtc).TotalSeconds);
            mLastSampleUtc = now;

            long inBytes = Interlocked.Read(ref mInBytes);
            long outBytes = Interlocked.Read(ref mOutBytes);
            long inPackets = Interlocked.Read(ref mInPackets);
            long outPackets = Interlocked.Read(ref mOutPackets);

            double inPacketsPerSecond = (inPackets - mLastInPackets) / elapsedSeconds;
            double outPacketsPerSecond = (outPackets - mLastOutPackets) / elapsedSeconds;
            double inKbPerSecond = (inBytes - mLastInBytes) / 1024.0 / elapsedSeconds;
            double outKbPerSecond = (outBytes - mLastOutBytes) / 1024.0 / elapsedSeconds;
            long pendingSends = Interlocked.Read(ref mPendingSends);
            long pendingSendBytes = Interlocked.Read(ref mPendingSendBytes);

            mLastInBytes = inBytes;
            mLastOutBytes = outBytes;
            mLastInPackets = inPackets;
            mLastOutPackets = outPackets;

            int sqlUsed;
            int sqlTotal;
            int sqlMax;
            string sqlUsage = "n/a";
            if (SqlDatabaseManager.TryGetPoolUsage(out sqlUsed, out sqlTotal, out sqlMax))
                sqlUsage = sqlUsed + "/" + FormatLimit(sqlMax);

            ProcessSnapshot snapshot = GetProcessSnapshot(elapsedSeconds);
            int sessions = SafeGetActiveConnections();
            int players = SafeGetPlayerCount();

            WritePerf(
                "[PERF][SYSTEM] mem=" + snapshot.WorkingSetMb + "MB" +
                " private=" + snapshot.PrivateMemoryMb + "MB" +
                " gc=" + snapshot.GcMemoryMb + "MB" +
                " threads=" + snapshot.Threads +
                " timers=" + snapshot.Timers +
                " tpWorker=" + snapshot.ThreadPoolAvailableWorkers + "/" + snapshot.ThreadPoolMaxWorkers +
                " tpIO=" + snapshot.ThreadPoolAvailableIo + "/" + snapshot.ThreadPoolMaxIo +
                " gc0=" + snapshot.Gc0Count + "(+" + snapshot.Gc0Delta + ")" +
                " gc1=" + snapshot.Gc1Count + "(+" + snapshot.Gc1Delta + ")" +
                " gc2=" + snapshot.Gc2Count + "(+" + snapshot.Gc2Delta + ")" +
                " cpu=" + snapshot.CpuPercent.ToString("0.0") + "%" +
                " sql=" + sqlUsage +
                " sessions=" + sessions +
                " players=" + players
            );

            string netMessage =
                "[PERF][NET] inPackets=" + inPacketsPerSecond.ToString("0.0") + "/s" +
                " outPackets=" + outPacketsPerSecond.ToString("0.0") + "/s" +
                " inKB=" + inKbPerSecond.ToString("0.0") + "/s" +
                " outKB=" + outKbPerSecond.ToString("0.0") + "/s" +
                " pendingSends=" + pendingSends +
                " pendingKB=" + (pendingSendBytes / 1024.0).ToString("0.0") +
                " sessions=" + sessions;

            double totalBytesPerSecond = (inKbPerSecond + outKbPerSecond) * 1024.0;
            if (mNetworkWarnBytesPerSecond > 0 && totalBytesPerSecond >= mNetworkWarnBytesPerSecond)
                netMessage += " burst=1";

            WritePerf(netMessage);
        }

        private static ProcessSnapshot GetProcessSnapshot(double elapsedSeconds)
        {
            ProcessSnapshot snapshot = new ProcessSnapshot();
            snapshot.GcMemoryMb = (long)(GC.GetTotalMemory(false) / 1048576.0);
            snapshot.Gc0Count = GC.CollectionCount(0);
            snapshot.Gc1Count = GC.CollectionCount(1);
            snapshot.Gc2Count = GC.CollectionCount(2);
            snapshot.Gc0Delta = snapshot.Gc0Count - mLastGc0Count;
            snapshot.Gc1Delta = snapshot.Gc1Count - mLastGc1Count;
            snapshot.Gc2Delta = snapshot.Gc2Count - mLastGc2Count;
            mLastGc0Count = snapshot.Gc0Count;
            mLastGc1Count = snapshot.Gc1Count;
            mLastGc2Count = snapshot.Gc2Count;
            snapshot.Timers = TimerManager.TimerRunning;

            try
            {
                ThreadPool.GetAvailableThreads(out snapshot.ThreadPoolAvailableWorkers, out snapshot.ThreadPoolAvailableIo);
                ThreadPool.GetMaxThreads(out snapshot.ThreadPoolMaxWorkers, out snapshot.ThreadPoolMaxIo);
            }
            catch
            {
            }

            try
            {
                using (Process process = Process.GetCurrentProcess())
                {
                    snapshot.WorkingSetMb = process.WorkingSet64 / 1048576L;
                    snapshot.PrivateMemoryMb = process.PrivateMemorySize64 / 1048576L;
                    snapshot.Threads = process.Threads.Count;

                    TimeSpan cpu = process.TotalProcessorTime;
                    TimeSpan delta = cpu - mLastProcessCpu;
                    mLastProcessCpu = cpu;

                    if (elapsedSeconds > 0.0 && Environment.ProcessorCount > 0)
                        snapshot.CpuPercent = Math.Max(0.0, Math.Min(100.0, delta.TotalMilliseconds / (elapsedSeconds * 1000.0 * Environment.ProcessorCount) * 100.0));
                }
            }
            catch
            {
            }

            return snapshot;
        }

        private static TimeSpan GetProcessCpuTime()
        {
            try
            {
                using (Process process = Process.GetCurrentProcess())
                    return process.TotalProcessorTime;
            }
            catch
            {
                return TimeSpan.Zero;
            }
        }

        private static int SafeGetActiveConnections()
        {
            try
            {
                return SessionManager.ActiveConnections;
            }
            catch
            {
                return 0;
            }
        }

        private static int SafeGetPlayerCount()
        {
            try
            {
                return SessionManager.ConnectedUserData.Count;
            }
            catch
            {
                return 0;
            }
        }

        private static bool GetBoolConfig(string key, bool fallback)
        {
            try
            {
                return (bool)ConfigManager.GetValue(key);
            }
            catch
            {
                return fallback;
            }
        }

        private static int GetIntConfig(string key, int fallback)
        {
            try
            {
                return (int)ConfigManager.GetValue(key);
            }
            catch
            {
                return fallback;
            }
        }

        private static string FormatLimit(int maxClients)
        {
            if (maxClients <= 0)
                return "unlimited";

            return maxClients.ToString();
        }

        private static string NormalizeLabel(string value)
        {
            if (string.IsNullOrEmpty(value))
                return "unknown";

            char[] chars = value.Trim().ToCharArray();
            for (int i = 0; i < chars.Length; i++)
            {
                if (char.IsWhiteSpace(chars[i]) || chars[i] == '|')
                    chars[i] = '_';
            }

            string normalized = new string(chars);
            if (normalized.Length > 80)
                normalized = normalized.Substring(0, 80);

            return normalized;
        }

        private static void WritePerf(string message)
        {
            try
            {
                OrbitReborn_Emulator.Output.WriteLine((object)message, OutputLevel.Warning);
            }
            catch
            {
            }
        }

        private struct ProcessSnapshot
        {
            public long WorkingSetMb;
            public long PrivateMemoryMb;
            public long GcMemoryMb;
            public int Threads;
            public int Timers;
            public int ThreadPoolAvailableWorkers;
            public int ThreadPoolAvailableIo;
            public int ThreadPoolMaxWorkers;
            public int ThreadPoolMaxIo;
            public int Gc0Count;
            public int Gc1Count;
            public int Gc2Count;
            public int Gc0Delta;
            public int Gc1Delta;
            public int Gc2Delta;
            public double CpuPercent;
        }
    }
}
