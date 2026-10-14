// Compiled emulator tests with constructor-free characters and synthetic map actors.
// No DB manager or game server is initialized. The reload bench uses an unconnected
// socket handle; it never binds, connects, listens or sends network traffic.
using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.Serialization;
using System.Threading;
using System.Threading.Tasks;
using OrbitReborn_Emulator;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Techs;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;

internal static class EquipmentAmmoRuntimeBoundaryTests
{
    private const BindingFlags F = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static;
    private static int assertions;
    private static void Check(bool value, string label)
    {
        if (!value) throw new Exception(label);
        assertions++; Console.WriteLine("PASS: " + label);
    }
    private static void Set(object owner, string field, object value) { owner.GetType().GetField(field, F).SetValue(owner, value); }
    private static object Get(object owner, string field) { return owner.GetType().GetField(field, F).GetValue(owner); }
    private static void SetStatic(Type type, string field, object value) { type.GetField(field, F).SetValue(null, value); }
    private static object Call(Type type, string name, object owner, params object[] args)
    {
        try { return type.GetMethod(name, F).Invoke(owner, args); }
        catch (TargetInvocationException error)
        {
            System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException).Throw();
            throw;
        }
    }
    private static CharacterInfo Character()
    {
        return (CharacterInfo)Call(typeof(EquipmentPhase1Tests), "Character", null);
    }
    private static Session Player(CharacterInfo info)
    {
        var session = (Session)Call(typeof(EquipmentPhase1Tests), "Player", null, info, info.Id);
        Set(session, "mAuthProcessed", true);
        Set(session, "TechState", new TechRuntimeState());
        return session;
    }
    private static void EmptyWorld()
    {
        SetStatic(typeof(MapManager), "mMapInstances", new CDictionnary<int, MapInstance>());
        SetStatic(typeof(MapManager), "mMapInstancesByMapId", new Dictionary<int, MapInstance>());
        SetStatic(typeof(SessionManager), "mSessions", new ConcurrentDictionary<int, Session>());
        SetStatic(typeof(SessionManager), "mCharacterSessionIndex", new ConcurrentDictionary<int, int>());
        SetStatic(typeof(SessionManager), "mSyncRoot", new object());
        ((IDictionary)typeof(Fight).GetField("RocketLauncherStates", F).GetValue(null)).Clear();
    }
    private static void DisposeTimer(CharacterInfo info, string field)
    {
        var timer = Get(info, field) as Timer;
        if (timer != null) timer.Dispose();
        Set(info, field, null);
    }
    private static void TerminalAndTdmRepair()
    {
        EmptyWorld(); var info = Character(); var session = Player(info);
        info.AmmoR310 = info.AmmoHstrm01 = 1;
        Set(session, "mMapId", 0);
        Check(!(bool)Get(info, "mPrimaryAmmoDirty") && !(bool)Get(info, "mSecondaryAmmoDirty"),
            "terminal fixture has no pending storage operation");
        // deferDroneRelease=true isolates callback disposal from SQL-owned lease release.
        Call(typeof(Session), "DisposeCore", session, false, true, false);
        Check(session.StoppedPlayer && (int)Get(info, "mAmmoConsumptionClosed") == 1,
            "actual authenticated terminal disposal closes ammo admission");
        Check(!info.TryConsumeLaserAmmo(info.CaptureLaserVolley()) && !info.TryConsumeRocketAmmo(1)
            && !info.TryConsumeLauncherRocketAmmo(7) && info.AmmoLcb10 == 100 && info.AmmoR310 == 1 && info.AmmoHstrm01 == 1,
            "terminal disposed character refuses laser rocket and launcher callbacks without changing stock");
        Call(typeof(TeamDeathMatch), "Restore", null, session);
        Check((int)Get(info, "mAmmoConsumptionClosed") == 1 && !info.TryConsumeRocketAmmo(1),
            "TDM Restore cannot reopen an already terminally disposed character");

        EmptyWorld(); info = Character(); session = Player(info);
        info.MapId = 83; Set(session, "mMapId", 83);
        info.TdmDead = info.Destroy = true; info.ShipHp = 0;
        info.AmmoR310 = info.AmmoHstrm01 = 1;
        var original = session.CharacterInfo;
        Call(typeof(TeamDeathMatch), "StopCombat", null, session);
        DisposeTimer(info, "mLaserAttackCanTimer");
        Call(typeof(TeamDeathMatch), "Restore", null, session);
        Check(ReferenceEquals(original, session.CharacterInfo) && !info.TdmDead && !info.Destroy
            && info.ShipHp == info.ShipMaxHp && (int)Get(info, "mAmmoConsumptionClosed") == 0,
            "actual TDM StopCombat and Restore retain the same open character after repair");
        Check(info.TryConsumeLaserAmmo(info.CaptureLaserVolley()) && info.TryConsumeRocketAmmo(1)
            && info.TryConsumeLauncherRocketAmmo(7) && info.AmmoLcb10 == 74 && info.AmmoR310 == 0 && info.AmmoHstrm01 == 0,
            "the repaired TDM character can admit new laser rocket and launcher ammo");
    }
    private static string RocketField(int rocket)
    {
        switch (rocket) { case 1: return "AmmoR310"; case 2: return "AmmoPlt2026"; case 3: return "AmmoPlt2021"; default: return "AmmoDcr250"; }
    }
    private static string LauncherField(int rocket)
    {
        return rocket == 7 ? "AmmoHstrm01" : rocket == 8 ? "AmmoUbr100" : "AmmoEco10";
    }
    private static void StockBoundaries()
    {
        foreach (int rocket in new[] { 1, 2, 3, 10 })
        {
            var info = Character(); string field = RocketField(rocket); Set(info, field, 1L);
            Check(info.TryConsumeRocketAmmo(rocket) && (long)Get(info, field) == 0 && !info.TryConsumeRocketAmmo(rocket),
                "standard rocket " + rocket + " exact stock 1 -> 0 admits once");
            info = Character(); Set(info, field, 0L);
            Check(!info.TryConsumeRocketAmmo(rocket) && (long)Get(info, field) == 0 && !(bool)Get(info, "mSecondaryAmmoDirty"),
                "standard rocket " + rocket + " zero stock never marks a pending debit");
        }
        foreach (int launcher in new[] { 7, 8, 9 })
        {
            var info = Character(); string field = LauncherField(launcher); Set(info, field, 4L);
            Check(!info.TryConsumeLauncherRocketAmmo(launcher, 5) && (long)Get(info, field) == 4 && !(bool)Get(info, "mSecondaryAmmoDirty"),
                "launcher " + launcher + " refuses an unfunded five-rocket salvo atomically");
            Set(info, field, 5L);
            Check(info.TryConsumeLauncherRocketAmmo(launcher, 5) && (long)Get(info, field) == 0 && !info.TryConsumeLauncherRocketAmmo(launcher),
                "launcher " + launcher + " exact stock 5 -> 0 admits one complete salvo");
        }
        var one = Character(); one.AmmoR310 = 1; int accepted = 0;
        Parallel.For(0, 100, i => { if (one.TryConsumeRocketAmmo(1)) Interlocked.Increment(ref accepted); });
        Check(accepted == 1 && one.AmmoR310 == 0, "concurrent standard rockets admit exactly one funded round");
        var salvo = Character(); salvo.AmmoHstrm01 = 5; accepted = 0;
        Parallel.For(0, 100, i => { if (salvo.TryConsumeLauncherRocketAmmo(7, 5)) Interlocked.Increment(ref accepted); });
        Check(accepted == 1 && salvo.AmmoHstrm01 == 0, "concurrent launcher salvos admit exactly one funded group of five");
    }
    private static Npc Target()
    {
        return (Npc)Call(typeof(EquipmentPhase1Tests), "Target", null, 10);
    }
    private static void LaserCadence()
    {
        EmptyWorld(); var info = Character(); var session = Player(info); var target = Target();
        Set(info, "mAttackSpeed", 1000);
        Call(typeof(Fight), "AttackNpc", null, null, session, target, 0, true);
        Check(info.AmmoLcb10 == 74 && (int)Call(typeof(Fight), "PrimaryLaserWait", null, info) > 0,
            "a normal admitted volley reserves the production weapon deadline");
        Set(info, "PrimaryLaserDeadline", Stopwatch.GetTimestamp() + Stopwatch.Frequency * 30L);
        info.SelectedAmmo = 2; info.ActiveConfig = 2;
        Call(typeof(Fight), "AttackNpc", null, null, session, target, 0, true);
        Check(info.AmmoLcb10 == 74 && info.AmmoMcb25 == 100,
            "immediate battery and config switches preserve the normal weapon cooldown");
        Set(info, "PrimaryLaserDeadline", Stopwatch.GetTimestamp() - 1);
        Call(typeof(Fight), "AttackNpc", null, null, session, target, 0, true);
        Check(info.AmmoLcb10 == 74 && info.AmmoMcb25 == 92,
            "an elapsed fixture deadline admits the next B-config volley with its current battery");

        info = Character(); session = Player(info); target = Target(); Set(info, "mAttackSpeed", 1000);
        Call(typeof(Fight), "AttackNpc", null, null, session, target, 0, true);
        long deadline = Stopwatch.GetTimestamp() + Stopwatch.Frequency * 30L; Set(info, "PrimaryLaserDeadline", deadline);
        Call(typeof(Fight), "AttackNpc", null, null, session, target, 6, true);
        Call(typeof(Fight), "AttackNpc", null, null, session, target, 6, true);
        Check(info.AmmoLcb10 == 74 && info.AmmoRsb75 == 74 && info.LastRSB75 > 0
            && (long)Get(info, "PrimaryLaserDeadline") == deadline,
            "immediate RSB has its own cooldown and leaves the normal weapon deadline intact");
        info.LastRSB75 = DateTime.Now.TimeOfDay.TotalMilliseconds - 3001;
        Call(typeof(Fight), "AttackNpc", null, null, session, target, 6, true);
        Check(info.AmmoRsb75 == 48 && (long)Get(info, "PrimaryLaserDeadline") == deadline,
            "an elapsed RSB fixture cooldown admits once while the normal weapon remains waiting");
    }
    private static void MapWithNpc(Npc npc)
    {
        var map = (MapInstance)FormatterServices.GetUninitializedObject(typeof(MapInstance));
        var info = (MapInfo)FormatterServices.GetUninitializedObject(typeof(MapInfo)); Set(info, "mId", 1);
        var actor = new MapActor(1, MapActorType.AiBot, 0, npc.Id, npc, new Vector2(npc.LocX, npc.LocY), map);
        var actors = new CDictionnary<int, MapActor>(); actors[1] = actor;
        var npcs = new CDictionnary<int, MapActor>(); npcs[npc.Id] = actor;
        Set(map, "mInfo", info); Set(map, "mActors", actors);
        Set(map, "mUserActorsByReferenceId", new CDictionnary<int, MapActor>()); Set(map, "mNpcActorsByReferenceId", npcs);
        Set(map, "mActorSnapshotCache", new[] { actor }); Set(map, "mUserActorSnapshotCache", new MapActor[0]); Set(map, "mNpcActorSnapshotCache", new[] { actor });
        var maps = new CDictionnary<int, MapInstance>(); maps[1] = map;
        SetStatic(typeof(MapManager), "mMapInstances", maps);
        SetStatic(typeof(MapManager), "mMapInstancesByMapId", new Dictionary<int, MapInstance> { { 1, map } });
    }
    private static void RocketCadence()
    {
        EmptyWorld(); var info = Character(); var session = Player(info); MapWithNpc(Target());
        info.SelectedRocket = 1; info.AmmoR310 = 2;
        Call(typeof(Fight), "RocketAttack", null, session, null); DisposeTimer(info, "mRocketAttackTimer");
        Call(typeof(Fight), "RocketAttack", null, session, null);
        Check(info.AmmoR310 == 1 && info.LastRocket > 0, "actual standard rocket handler blocks an immediate second round with its two-second cooldown");
        info.LastRocket = UnixTimestamp.GetCurrent() - 2.01;
        Call(typeof(Fight), "RocketAttack", null, session, null); DisposeTimer(info, "mRocketAttackTimer");
        Check(info.AmmoR310 == 0, "an elapsed standard rocket fixture cooldown admits the remaining funded round");
        info.SelectedRocket = 10; info.AmmoDcr250 = 2;
        Call(typeof(Fight), "RocketAttack", null, session, null); DisposeTimer(info, "mRocketAttackTimer");
        Call(typeof(Fight), "RocketAttack", null, session, null);
        Check(info.AmmoDcr250 == 1 && info.LastDcr250 > 0, "manual DCR uses its separate 240-second cooldown");
        info.LastDcr250 = UnixTimestamp.GetCurrent() - 240.01;
        Call(typeof(Fight), "RocketAttack", null, session, null); DisposeTimer(info, "mRocketAttackTimer");
        Check(info.AmmoDcr250 == 0, "an elapsed DCR fixture cooldown admits the remaining funded round");
    }
    private static int Loaded(object state)
    {
        lock (Get(state, "SyncRoot")) return (int)Get(state, "LoadedCount");
    }
    private static void LauncherReloadCadence()
    {
        EmptyWorld(); var info = Character(); var session = Player(info);
        Set(session, "mMapId", 0); Set(info, "mRocketLauncherTypeCfgA", 1);
        info.SelectedLauncherRocket = 7; info.AmmoHstrm01 = 5;
        using (var handle = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp))
        {
            Set(session, "mSocket", handle);
            var state = Call(typeof(Fight), "GetRocketLauncherState", null, session);
            try
            {
                var clock = Stopwatch.StartNew(); Call(typeof(Fight), "BeginRocketLauncherReload", null, session);
                Check(Loaded(state) == 0 && info.AmmoHstrm01 == 5, "starting actual launcher reload reserves no ammo before its first tick");
                Check(!SpinWait.SpinUntil(() => Loaded(state) > 0, 250), "launcher reload does not debit in the first quarter second");
                Check(SpinWait.SpinUntil(() => Loaded(state) >= 1, 2500) && Loaded(state) == 1 && info.AmmoHstrm01 == 4,
                    "the first actual one-second reload callback loads and consumes exactly one rocket");
                Console.WriteLine("Observed first launcher reload callback: " + clock.ElapsedMilliseconds + " ms.");
                Check(SpinWait.SpinUntil(() => Loaded(state) == 3, 3500) && info.AmmoHstrm01 == 2 && Get(state, "ReloadTimer") == null,
                    "actual periodic reload stops at HST1 capacity three with exact stock remaining");
                Call(typeof(Fight), "RocketLauncherReloadTick", null, session); Call(typeof(Fight), "RocketLauncherReloadTick", null, session);
                Check(Loaded(state) == 3 && info.AmmoHstrm01 == 2, "late reload callbacks after capacity consume no additional rockets");
                info.CloseAmmoConsumption(); Set(state, "LoadedCount", 0);
                Call(typeof(Fight), "RocketLauncherReloadTick", null, session);
                Check(Loaded(state) == 0 && info.AmmoHstrm01 == 2, "a queued actual reload callback cannot debit a terminally closed character");
                Check((int)Call(typeof(Fight), "GetRocketLauncherCapacity", null, 1) == 3
                    && (int)Call(typeof(Fight), "GetRocketLauncherCapacity", null, 2) == 5,
                    "HST1 and HST2 keep their production capacities three and five");
            }
            finally
            {
                var timer = Get(state, "ReloadTimer") as Timer; if (timer != null) timer.Dispose();
                Set(session, "mSocket", null);
            }
        }
    }
    public static int Main()
    {
        try
        {
            TerminalAndTdmRepair(); StockBoundaries(); LaserCadence(); RocketCadence(); LauncherReloadCadence();
            Console.WriteLine("PASS: " + assertions + " compiled production runtime assertions; no DB initialized, no network connection.");
            return 0;
        }
        catch (Exception error) { Console.Error.WriteLine(error); return 1; }
    }
}
