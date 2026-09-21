using System;
using System.Text;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Techs
{
    public sealed class TechRecord
    {
        public int TechId;
        public int Amount;
        public ulong Version;
        public double CooldownUntil;
        public double ActiveUntil;
        public string ActiveUseId;
    }

    public sealed class TechRuntimeState
    {
        public readonly string Generation = Guid.NewGuid().ToString("D");
        public TechRecord[] Records = new TechRecord[6];
        public readonly string[] TimerUseIds = new string[6];
        public bool Available;
        public bool Started;
        public int CallbackEpoch;
        public int TransitionDepth;
        public Timer RefreshTimer;
        public string LastStatus;
        public DateTime NextErrorLog;
    }

    /// <summary>Pure V1 rules, also used by the offline test executable.</summary>
    public static class TechRules
    {
        public const int MaxAmount = int.MaxValue;
        public static readonly string[] Codes = { "", "ELA", "ECI", "RPM", "SBU", "BRB" };
        public static bool IsKnown(int id) { return id >= 1 && id <= 5; }
        public static int Duration(int id) { return id == 1 ? 900 : id == 3 ? 600 : id == 5 ? 8 : 0; }
        public static int CooldownFromStart(int id) { return id == 1 ? 1800 : id == 2 ? 60 : id == 3 ? 960 : 45; }
        public static bool CanReserve(TechRecord record, double now)
        {
            return record != null && IsKnown(record.TechId) && record.Amount > 0
                && record.CooldownUntil <= now && record.ActiveUntil <= now;
        }
        public static int Seconds(double until, double now)
        {
            return (int)Math.Min(int.MaxValue, Math.Max(0, Math.Ceiling(until - now)));
        }
        public static void Status(TechRecord record, bool storageAvailable, bool runtimeActive, double now,
            out int status, out int amount, out int seconds)
        {
            amount = storageAvailable && record != null && record.Amount >= 0 ? record.Amount : 0;
            status = 0; seconds = 0;
            if (record == null || !IsKnown(record.TechId)) return;
            // Last charge may already be gone while the paid effect is still active.
            if (runtimeActive && record.ActiveUntil > now) { status = 2; seconds = Seconds(record.ActiveUntil, now); }
            else if (record.CooldownUntil > now) { status = 3; seconds = Seconds(record.CooldownUntil, now); }
            else if (storageAvailable && amount > 0) status = 1;
        }
        public static string Payload(TechRecord[] records, bool available, bool[] active, double now)
        {
            StringBuilder payload = new StringBuilder("S");
            for (int id = 1; id <= 5; ++id)
            {
                int status, amount, seconds;
                Status(records != null && records.Length > id ? records[id] : null, available,
                    active != null && active.Length > id && active[id], now, out status, out amount, out seconds);
                payload.Append('|').Append(status).Append('|').Append(amount).Append('|').Append(seconds);
            }
            return payload.ToString();
        }
    }
}
