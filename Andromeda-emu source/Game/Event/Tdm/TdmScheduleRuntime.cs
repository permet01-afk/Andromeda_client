using System;
using System.IO;
using System.Threading;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;

namespace OrbitReborn_Emulator.Game.Event.Tdm
{
    public static class TdmScheduleRuntime
    {
        private static readonly object Sync = new object();
        private static TdmScheduleService Service;
        private static Timer Pulse;
        private static string ConfigPath, LastConfig;
        private static DateTime LastConfigCheck;
        private static void Log(string text) { Output.WriteLine("[TDM schedule] " + text, OutputLevel.Notification); }
        public static void Initialize()
        {
            lock (Sync)
            {
                string data = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "data");
                ConfigPath = Path.Combine(data, "tdm_schedule.json");
                string state = Path.Combine(data, "tdm_schedule_state.json");
                try
                {
                    Service = new TdmScheduleService(() => DateTime.UtcNow, value => TdmAtomicFile.Write(state, value),
                        File.Exists(state) ? File.ReadAllText(state) : null,
                        id => TeamDeathMatch.Enable(id), () => TeamDeathMatch.Disable(), () => TeamDeathMatch.IsActive(),
                        text => SessionManager.BroadcastToUser(PacketComposer.Compose("A", "STD|" + text)), Log);
                    Reload(); Pulse = new Timer(_ => Tick(), null, 250, 250);
                }
                catch (Exception ex) { Service = null; Log("Unavailable; automatic/admin start blocked: " + ex.Message); }
            }
        }
        private static void Reload()
        {
            string text = File.ReadAllText(ConfigPath);
            if (text == LastConfig) return;
            Service.Reload(text); LastConfig = text; Log("Valid configuration loaded.");
        }
        private static void Tick()
        {
            lock (Sync)
            {
                if (Service == null) return;
                if (DateTime.UtcNow - LastConfigCheck >= TimeSpan.FromSeconds(5))
                {
                    LastConfigCheck = DateTime.UtcNow;
                    try { Reload(); } catch (Exception ex) { Log("Config reload rejected; keeping previous configuration: " + ex.Message); }
                }
                try { Service.Tick(); } catch (Exception ex) { Log("Tick failed: " + ex.Message); }
            }
        }
        public static void ManualStart() { Run(true); }
        public static void ManualStop() { Run(false); }
        private static void Run(bool start)
        {
            lock (Sync)
            {
                if (Service == null) { Log("Scheduler unavailable; command refused."); return; }
                try { if (start) Service.ManualStart(); else Service.ManualStop(); }
                catch (Exception ex) { Log("Command failed: " + ex.Message); }
            }
        }
        public static void Shutdown()
        {
            lock (Sync) { if (Pulse != null) Pulse.Dispose(); Pulse = null; Service = null; }
            // Preserve occurrence/cancellation state; shutdown is not manual STOP.
        }
    }
}
