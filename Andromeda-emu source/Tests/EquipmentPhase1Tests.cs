// Standalone tests against the compiled emulator. No database initialization or game account is used.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Data;
using System.Reflection;
using System.Runtime.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;
using System.Text;
using OrbitReborn_Emulator;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Laboratory;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;

internal static class EquipmentPhase1Tests
{
    private const BindingFlags Fields = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static;
    private static int assertions;
    private static readonly List<string> Cases = new List<string>();

    private static void Check(bool condition, string name)
    {
        if (!condition) throw new Exception(name);
        assertions++;
        Cases.Add(name);
    }

    private static void Set(object instance, string field, object value)
    {
        instance.GetType().GetField(field, Fields).SetValue(instance, value);
    }

    private static void SetStatic(Type type, string field, object value)
    {
        type.GetField(field, Fields).SetValue(null, value);
    }

    private static object Call(string name, params object[] args)
    {
        try { return typeof(Fight).GetMethod(name, Fields).Invoke(null, args); }
        catch (TargetInvocationException e)
        {
            System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(e.InnerException).Throw();
            throw;
        }
    }

    private static void Equip(CharacterConfig config, EquipmentSnapshot equipment)
    {
        typeof(CharacterConfig).GetProperty("Equipment").SetValue(config, equipment, null);
    }

    private static EquipmentSnapshot Equipment(int shipCount, int droneCount, int capacity = 15, int shipLF2 = 0)
    {
        return new EquipmentSnapshot(capacity, shipCount, 0, 0, shipLF2, shipCount - shipLF2,
            droneCount, 0, 0, 0, droneCount);
    }

    // Initialize only the runtime fields used by the combat paths; no constructor SQL or login side effects.
    private static CharacterInfo Character()
    {
        var info = (CharacterInfo)FormatterServices.GetUninitializedObject(typeof(CharacterInfo));
        foreach (var field in typeof(CharacterInfo).GetFields(Fields))
        {
            if (field.IsStatic) continue;
            Type t = field.FieldType;
            if (t == typeof(object)) field.SetValue(info, new object());
            else if (t.IsGenericType && (t.GetGenericTypeDefinition() == typeof(CList<>)
                || t.GetGenericTypeDefinition() == typeof(Dictionary<,>)
                || t.GetGenericTypeDefinition() == typeof(ConcurrentDictionary<,>)
                || t.GetGenericTypeDefinition() == typeof(HashSet<>)))
                field.SetValue(info, Activator.CreateInstance(t));
        }
        Set(info, "mConfig1", new CharacterConfig(100000, 100000, 300, 3900));
        Set(info, "mConfig2", new CharacterConfig(100000, 100000, 300, 1200));
        Set(info, "mId", 900001);
        Set(info, "mShipMaxHp", 100000);
        info.ShipHp = 100000;
        info.ActiveConfig = 1;
        info.SelectedAmmo = 1;
        info.MapId = 1;
        info.FactionId = 1;
        info.LocX = 1000;
        info.LocY = 1000;
        info.LabInfos = new LabInfos();
        info.MultiplierAgainstNpcs = info.MultiplierAgainstPlayers = 1.0;
        info.RandomDamage = new FixedRandom(false);
        Equip(info.Config1, Equipment(10, 16));
        Equip(info.Config2, Equipment(8, 0));
        Stock(info, 100);
        return info;
    }

    private static void Stock(CharacterInfo info, long amount)
    {
        info.AmmoLcb10 = info.AmmoMcb25 = info.AmmoMcb50 = info.AmmoUcb100 = info.AmmoSab50 = info.AmmoRsb75 = amount;
        Set(info, "mPrimaryAmmoDirty", false);
    }

    private static long Amount(CharacterInfo info, int ammo)
    {
        return new[] { info.AmmoLcb10, info.AmmoMcb25, info.AmmoMcb50, info.AmmoUcb100, info.AmmoSab50, info.AmmoRsb75 }[ammo - 1];
    }

    private sealed class FixedRandom : Random
    {
        private readonly bool miss;
        private readonly Action onRoll;
        internal FixedRandom(bool miss, Action onRoll = null) { this.miss = miss; this.onRoll = onRoll; }
        public override int Next(int minValue, int maxValue)
        {
            if (minValue == 0 && maxValue == 100)
            {
                if (onRoll != null) onRoll();
                return miss ? 99 : 0;
            }
            return 0; // No damage spread, without altering the production formula.
        }
    }

    private static Session Player(CharacterInfo info, int sessionId = 900001)
    {
        var session = (Session)FormatterServices.GetUninitializedObject(typeof(Session));
        Set(session, "mId", sessionId);
        Set(session, "mCharacterInfo", info);
        Set(session, "mMapId", 1);
        Set(session, "mMapJoined", true);
        Set(session, "mMapAuthed", true);
        return session;
    }

    private static Npc Target(int distance = 10)
    {
        return new Npc(900100, "Equipment fixture", 1, 1000 + distance, 1000, 2,
            2000000, 2000000, 2000000, 2000000, 0, 0, 0);
    }

    private static void BasicSnapshots()
    {
        var info = Character();
        foreach (int n in new[] { 0, 1, 10, 18, 26 })
        {
            Equip(info.Config1, Equipment(Math.Min(n, 10), Math.Max(0, n - 10)));
            Stock(info, 100);
            var volley = info.CaptureLaserVolley();
            Check(volley.LaserCount == n, "actual cannon count " + n);
            Check(info.TryConsumeLaserAmmo(volley) == (n > 0), "admission for count " + n);
            Check(info.AmmoLcb10 == (n == 0 ? 100 : 100 - n), "debit for count " + n);
        }
        foreach (int drones in new[] { 16, 12, 0 })
        {
            Equip(info.Config1, Equipment(10, drones));
            Check(info.CaptureLaserVolley().LaserCount == 10 + drones, "mounted drones contribute " + drones);
        }
        var mixed = new EquipmentSnapshot(15, 4, 1, 1, 1, 1, 4, 1, 1, 1, 1);
        Check(mixed.TotalLaserCount == 8 && !mixed.IsShipFullLF3, "LF1/MP1/LF2/LF3 composition");
        Check(mixed.ShipLF1Count == 1 && mixed.DroneMP1Count == 1 && mixed.DroneLF2Count == 1 && mixed.ShipLF3Count == 1,
            "separate typed ship/drone counts");
        Check(Equipment(10, 0, 15).TotalLaserCount == 10, "capacity is not consumption");

        // NULL aggregates from LEFT JOIN represent genuinely empty configurations.
        var table = new DataTable();
        foreach (string column in new[] { "laser_capacity", "ship_count", "ship_lf1", "ship_mp1", "ship_lf2", "ship_lf3",
            "drone_count", "drone_lf1", "drone_mp1", "drone_lf2", "drone_lf3" }) table.Columns.Add(column, typeof(int));
        var row = table.NewRow(); row["laser_capacity"] = 15; table.Rows.Add(row);
        var empty = (EquipmentSnapshot)typeof(EquipmentSnapshot).GetMethod("FromRow", Fields).Invoke(null, new object[] { row });
        Check(empty.TotalLaserCount == 0 && !empty.IsShipFullLF3, "empty SQL aggregates are zero, not capacity");
        row["ship_count"] = 10; row["ship_lf3"] = 10; row["drone_count"] = 16; row["drone_lf3"] = 16;
        var loaded = (EquipmentSnapshot)typeof(EquipmentSnapshot).GetMethod("FromRow", Fields).Invoke(null, new object[] { row });
        Check(loaded.TotalLaserCount == 26 && !loaded.IsShipFullLF3, "SQL snapshot keeps ship and drone aggregates separate");
    }

    private static void ConsumptionAndColours()
    {
        var info = Character();
        for (int ammo = 1; ammo <= 6; ammo++)
        {
            info.SelectedAmmo = ammo;
            foreach (int stock in new[] { 27, 26, 25, 1, 0 })
            {
                Stock(info, stock);
                bool admitted = info.TryConsumeLaserAmmo(info.CaptureLaserVolley());
                Check(admitted == (stock >= 26), "ammo " + ammo + " stock " + stock + " admission");
                Check(Amount(info, ammo) == (stock >= 26 ? stock - 26 : stock), "ammo " + ammo + " stock " + stock + " exact delta");
            }
        }
        foreach (var item in new[] {
            new { Equipment = Equipment(14,16,15), Full = false, Label = "partial ship plus full drones" },
            new { Equipment = Equipment(15,16,15,1), Full = false, Label = "14 LF3 plus LF2" },
            new { Equipment = Equipment(15,0,15), Full = true, Label = "full LF3 ship" },
            new { Equipment = Equipment(0,16,0), Full = false, Label = "zero-capacity ship" } })
        {
            Check(item.Equipment.IsShipFullLF3 == item.Full, item.Label);
            int[] expected = item.Full ? new[] {1,1,2,3,4,6} : new[] {0,0,0,3,4,6};
            for (int ammo = 1; ammo <= 6; ammo++)
                Check(item.Equipment.GetVisualLaserType(ammo) == expected[ammo - 1], item.Label + " visual ammo " + ammo);
        }
        info = Character();
        foreach (int config in new[] {1,2,1})
        {
            info.ActiveConfig = config; Stock(info, 100);
            var volley = info.CaptureLaserVolley(); info.TryConsumeLaserAmmo(volley);
            Check(info.AmmoLcb10 == (config == 1 ? 74 : 92), "A/B switch debit config " + config);
            Check(volley.MaxDamage == (config == 1 ? 3900 : 1200), "A/B damage consistency " + config);
        }
        info.SelectedAmmo = 2;
        var captured = info.CaptureLaserVolley();
        info.ActiveConfig = 2; info.SelectedAmmo = 3;
        Check(captured.ActiveConfig == 1 && captured.AmmoId == 2 && captured.LaserCount == 26 && captured.MaxDamage == 3900,
            "captured volley remains immutable after A/B and ammo change");
        Check(info.CaptureLaserVolley().ActiveConfig == 2 && info.CaptureLaserVolley().AmmoId == 3,
            "next volley sees new config and ammo");
        Check(info.CaptureLaserVolley(6).AmmoId == 6 && info.SelectedAmmo == 3, "RSB activation does not replace selected battery");
        info = Character(); Stock(info, 26); int accepted = 0;
        Parallel.For(0, 100, i => { if (info.TryConsumeLaserAmmo(info.CaptureLaserVolley())) Interlocked.Increment(ref accepted); });
        Check(accepted == 1 && info.AmmoLcb10 == 0, "concurrent stock admits exactly one funded volley");
    }

    private static void CombatPaths()
    {
        // Empty map index avoids a network listener; packets are checked separately by the local integration bench.
        SetStatic(typeof(MapManager), "mMapInstances", new CDictionnary<int, MapInstance>());
        SetStatic(typeof(MapManager), "mMapInstancesByMapId", new Dictionary<int, MapInstance>());
        SetStatic(typeof(SessionManager), "mSessions", new ConcurrentDictionary<int, Session>());
        SetStatic(typeof(SessionManager), "mCharacterSessionIndex", new ConcurrentDictionary<int, int>());
        SetStatic(typeof(SessionManager), "mSyncRoot", new object());
        var info = Character(); var player = Player(info); var npc = Target();
        info.RandomDamage = new FixedRandom(true);
        Call("AttackNpc", null, player, npc, 0, true);
        Check(info.AmmoLcb10 == 74 && npc.ShipHp == 2000000 && npc.ShipShield == 2000000, "admitted MISS consumes 26 without damage");

        for (int ammo = 1; ammo <= 6; ammo++)
        {
            info = Character(); player = Player(info); npc = Target();
            info.SelectedAmmo = ammo; Stock(info, 26);
            Call("AttackNpc", null, player, npc, 0, true);
            Check(Amount(info, ammo) == 0 && npc.ShipHp + npc.ShipShield < 4000000,
                "combat exact stock 26 -> 0 with normal damage, ammo " + ammo);
            info = Character(); player = Player(info); npc = Target();
            info.SelectedAmmo = ammo; info.RandomDamage = new FixedRandom(true);
            Call("AttackNpc", null, player, npc, 0, true);
            Check(Amount(info, ammo) == 74 && npc.ShipHp + npc.ShipShield == 4000000,
                "combat MISS consumes 26, ammo " + ammo);
            if (ammo == 6)
            {
                Call("AttackNpc", null, player, npc, 0, true);
                Check(info.AmmoRsb75 == 74, "RSB MISS still starts its cooldown");
            }
        }

        info = Character(); player = Player(info); npc = Target(701);
        Call("AttackNpc", null, player, npc, 0, true);
        Check(info.AmmoLcb10 == 100 && npc.ShipHp == 2000000, "out of range consumes nothing");
        info = Character(); player = Player(info);
        Call("AttackNpc", null, player, null, 0, true);
        Check(info.AmmoLcb10 == 100, "invalid target consumes nothing");

        info = Character(); player = Player(info); npc = Target(); Stock(info, 25);
        Call("AttackNpc", null, player, npc, 0, true);
        Check(info.AmmoLcb10 == 25 && npc.ShipHp == 2000000 && npc.ShipShield == 2000000, "insufficient whole volley refuses damage");
        info = Character(); player = Player(info); npc = Target(); Equip(info.Config1, Equipment(0,0));
        Call("AttackNpc", null, player, npc, 0, true);
        Check(info.AmmoLcb10 == 100 && npc.ShipHp == 2000000 && !info.Attacking, "zero weapons stops combat despite stale damage cache");

        info = Character(); player = Player(info); npc = Target();
        Call("AttackNpc", null, player, npc, 0, false);
        Check(info.AmmoLcb10 == 100 && npc.ShipShield == 2000000, "visual-only laser has no ammo or damage debit");

        info = Character(); player = Player(info); npc = Target();
        info.RandomDamage = new FixedRandom(false, () => { info.ActiveConfig = 2; info.SelectedAmmo = 3; });
        Call("AttackNpc", null, player, npc, 0, true);
        Check(info.AmmoLcb10 == 74 && info.AmmoMcb50 == 100, "switch during hit resolution preserves captured battery and count");
        Check(npc.ShipHp + npc.ShipShield == 4000000 - 3900, "switch during hit resolution preserves captured A damage");
        info.RandomDamage = new FixedRandom(false);
        Call("AttackNpc", null, player, npc, 0, true);
        Check(info.AmmoMcb50 == 92 && npc.ShipHp + npc.ShipShield == 4000000 - 3900 - 3600,
            "next B x3 volley uses eight canons and B damage");

        info = Character(); player = Player(info); npc = Target(); info.SelectedAmmo = 5; info.Config1.Shield = 50000;
        Call("AttackNpc", null, player, npc, 0, true);
        Check(info.AmmoSab50 == 74 && npc.ShipHp == 2000000 && info.ShipShield == 50000 + 9360,
            "SAB costs 26 once and preserves 2.4 shield absorption");

        info = Character(); player = Player(info); npc = Target();
        Call("AttackNpc", null, player, npc, 6, true);
        Call("AttackNpc", null, player, npc, 6, true);
        Call("AttackNpc", null, player, npc, 6, false);
        Check(info.AmmoRsb75 == 74 && npc.ShipHp + npc.ShipShield == 4000000 - 23400,
            "RSB one activation, immediate repeat and visual effect debit once");

        info = Character(); player = Player(info); npc = Target();
        var entered = new ManualResetEventSlim(); var release = new ManualResetEventSlim();
        info.RandomDamage = new FixedRandom(true, () => { entered.Set(); release.Wait(); });
        var first = Task.Run(() => Call("AttackNpc", null, player, npc, 0, true));
        Check(entered.Wait(2000), "first callback reaches hit resolution");
        Call("AttackNpc", null, player, npc, 0, true);
        Call("AttackNpc", null, player, npc, 6, true);
        release.Set(); first.Wait();
        Check(info.AmmoLcb10 == 74 && info.AmmoRsb75 == 100, "overlapping timer and immediate RSB cannot double admit");

        info = Character(); player = Player(info); var enemy = Player(Character(), 900002);
        Set(enemy.CharacterInfo, "mId", 900002); enemy.CharacterInfo.PeaceZone = true;
        Call("AttackPlayer", null, player, enemy, 0, true);
        Check(info.AmmoLcb10 == 100, "PvP refusal consumes nothing");
    }

    private static void RuntimePerformance()
    {
        var info = Character();
        const int shots = 100000;
        Stock(info, shots * 26L);
        var clock = System.Diagnostics.Stopwatch.StartNew();
        for (int i = 0; i < shots; i++) info.TryConsumeLaserAmmo(info.CaptureLaserVolley());
        clock.Stop();
        Check(info.AmmoLcb10 == 0, "100000 runtime volleys consume exactly 2600000; no DB initialized");
        Console.WriteLine("Runtime capture + debit: " + shots + " iterations in " + clock.ElapsedMilliseconds + " ms (not full combat or DB benchmark).");
    }

    private static void ObserverPackets(string outputPath)
    {
        // Ephemeral loopback socket: real Session.SendData and map observer routing, no game server or account.
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        try
        {
            using (var receiver = new TcpClient())
            {
                receiver.Connect((IPEndPoint)listener.LocalEndpoint);
                receiver.ReceiveTimeout = 3000;
                using (var sender = listener.AcceptSocket())
                {
                    var observer = Player(Character(), 900002);
                    Set(observer.CharacterInfo, "mId", 900002);
                    observer.CharacterInfo.NpcInRange.Add(900100);
                    Set(observer, "mSocket", sender);
                    var sessions = new ConcurrentDictionary<int, Session>();
                    sessions[observer.Id] = observer;
                    SetStatic(typeof(SessionManager), "mSessions", sessions);
                    var map = (MapInstance)FormatterServices.GetUninitializedObject(typeof(MapInstance));
                    Set(map, "mActors", new CDictionnary<int, MapActor>());
                    Set(map, "mUserActorSnapshotCache", new[] {
                        new MapActor(1, MapActorType.UserCharacter, observer.Id, observer.CharacterId,
                            observer, new Vector2(1000,1000), map) });
                    var packets = new List<string>();
                    foreach (bool full in new[] { false, true })
                    foreach (int skilled in new[] { 0, 1 })
                    for (int ammo = 1; ammo <= 6; ammo++)
                    {
                        var info = Character();
                        Equip(info.Config1, Equipment(full ? 15 : 14, 16));
                        info.FatLasers = skilled;
                        info.SelectedAmmo = ammo;
                        Call("AttackNpc", map, Player(info), Target(), 0, false);
                        var bytes = new List<byte>();
                        int next;
                        do { next = receiver.GetStream().ReadByte(); if (next < 0) throw new Exception("Unexpected socket EOF"); bytes.Add((byte)next); }
                        while (next != 0);
                        string packet = Encoding.UTF8.GetString(bytes.ToArray()).TrimEnd('\0');
                        string[] parts = packet.Split('|');
                        int command = Array.IndexOf(parts, "a");
                        int expected = full ? new[] {1,1,2,3,4,6}[ammo-1] : new[] {0,0,0,3,4,6}[ammo-1];
                        Check(command >= 0 && parts[command+1] == "900001" && parts[command+2] == "900100"
                            && parts[command+3] == expected.ToString() && parts[command+5] == skilled.ToString(),
                            "observer socket packet full=" + full + " skilled=" + skilled + " ammo=" + ammo);
                        packets.Add(packet);
                    }
                    System.IO.File.WriteAllLines(outputPath, packets);
                    Set(observer, "mSocket", null);
                }
            }
        }
        finally { listener.Stop(); }
    }

    public static int Main(string[] args)
    {
        try
        {
            BasicSnapshots(); ConsumptionAndColours(); CombatPaths();
            RuntimePerformance();
            if (args.Length > 1) ObserverPackets(args[1]);
            Console.WriteLine("PASS: " + assertions + " assertions; no database initialized, no account mutation.");
            if (args.Length > 0) System.IO.File.WriteAllLines(args[0], Cases);
            return 0;
        }
        catch (Exception error) { Console.Error.WriteLine(error); return 1; }
    }
}
