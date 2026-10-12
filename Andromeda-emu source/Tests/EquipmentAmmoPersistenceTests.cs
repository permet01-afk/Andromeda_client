// The runner inserts unchanged production ammo methods and owner-fence SQL.
// Runtime fields are fixtures; SQL transport and credit statements are simulated.
// This does not validate a real MySQL database or payment authorization.
using System;
using System.Collections.Generic;
using System.Data;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using OrbitReborn_Emulator.Game.Characters;

/*PRODUCTION_EXPERIENCE_SYSTEM*/

internal sealed class ShipGameplayLease
{
    internal string Token = "fixture-owner";
}

internal static class ShipLifecycleService
{
    /*PRODUCTION_OWNER_FENCE*/
}

internal sealed class LaserVolleySnapshot
{
    internal int AmmoId, LaserCount;
}

internal static class PerformanceProfiler
{
    internal static long Start() { return 0; }
    internal static void LogTimer(string name, int id, long started) { }
}

internal sealed class CharacterInfo
{
    private readonly object mPrimaryAmmoSyncLock = new object();
    private readonly object mPrimaryAmmoFlushLock = new object();
    private readonly object mSecondaryAmmoSyncLock = new object();
    private int mId = 900001;
    private long mCredits, mUridium, mExperience, mHonor;
    private int mLevel = 1;
    private bool mPrimaryAmmoDirty;
    private bool mSecondaryAmmoDirty;
    private int mAmmoConsumptionClosed;
    private int mAmmoSyncClientUpdatePending;
    public ShipGameplayLease GameplayLease = new ShipGameplayLease();
    public long AmmoLcb10, AmmoMcb25, AmmoMcb50, AmmoUcb100, AmmoSab50, AmmoRsb75;
    private long mDbAmmoLcb10, mDbAmmoMcb25, mDbAmmoMcb50, mDbAmmoUcb100, mDbAmmoSab50, mDbAmmoRsb75;
    public long AmmoR310, AmmoPlt2026, AmmoPlt2021, AmmoDcr250, AmmoHstrm01, AmmoUbr100, AmmoEco10, AmmoSmb01, AmmoIsh01, AmmoEmp01;
    private long mDbAmmoR310, mDbAmmoPlt2026, mDbAmmoPlt2021, mDbAmmoDcr250, mDbAmmoHstrm01, mDbAmmoUbr100, mDbAmmoEco10, mDbAmmoSmb01, mDbAmmoIsh01, mDbAmmoEmp01;

    internal CharacterInfo(long amount)
    {
        AmmoLcb10 = AmmoMcb25 = AmmoMcb50 = AmmoUcb100 = AmmoSab50 = AmmoRsb75 = amount;
        mDbAmmoLcb10 = mDbAmmoMcb25 = mDbAmmoMcb50 = mDbAmmoUcb100 = mDbAmmoSab50 = mDbAmmoRsb75 = amount;
        AmmoR310 = AmmoPlt2026 = AmmoPlt2021 = AmmoDcr250 = AmmoHstrm01 = AmmoUbr100 = AmmoEco10 = AmmoSmb01 = AmmoIsh01 = AmmoEmp01 = amount;
        mDbAmmoR310 = mDbAmmoPlt2026 = mDbAmmoPlt2021 = mDbAmmoDcr250 = mDbAmmoHstrm01 = mDbAmmoUbr100 = mDbAmmoEco10 = mDbAmmoSmb01 = mDbAmmoIsh01 = mDbAmmoEmp01 = amount;
    }
    internal bool Shoot(int amount) { return TryConsumePrimaryLaserColumn(ref AmmoLcb10, amount); }
    internal bool ShootAmmo(int ammo, int amount) { return TryConsumeLaserAmmo(new LaserVolleySnapshot { AmmoId = ammo, LaserCount = amount }); }
    internal static long CreditCap(string column) { return GetAmmoCreditCap(column); }
    /*PRODUCTION_METHODS*/
}

internal static class SqlDatabaseManager
{
    internal static readonly string[] PrimaryColumns = {"lcb10","mcb25","mcb50","ucb100","sab50","rsb75"};
    internal static readonly string[] SecondaryColumns = {"r310","plt2026","plt2021","dcr250","hstrm01","ubr100","eco10","smb01","ish01","emp01"};
    internal static readonly object Sync = new object();
    internal static readonly Dictionary<string,long> Values = new Dictionary<string,long>();
    internal static Action BeforeUpdate, BeforeRead, AfterReadSnapshot;
    internal static bool FailUpdate;
    internal static bool NullRead;
    internal static string OwnerToken;
    internal static int Updates, Reads, CreditWrites;
    internal static int ClientsOpened, ActiveClients;
    internal static SemaphoreSlim ClientPool;
    internal static ManualResetEventSlim PoolWaitEntered;
    internal static void Reset(long amount)
    {
        foreach (string column in PrimaryColumns) Values[column] = amount;
        foreach (string column in SecondaryColumns) Values[column] = amount;
        BeforeUpdate = BeforeRead = AfterReadSnapshot = null; FailUpdate = NullRead = false; Updates = Reads = CreditWrites = 0;
        OwnerToken = "fixture-owner";
        ClientsOpened = ActiveClients = 0; ClientPool = null; PoolWaitEntered = null;
    }
    internal static SqlDatabaseClient GetClient(string purpose = null)
    {
        var pool = ClientPool;
        if (pool != null && !pool.Wait(0))
        {
            if (PoolWaitEntered != null) PoolWaitEntered.Set();
            if (!pool.Wait(3000)) throw new InvalidOperationException("simulated bounded SQL pool wait timeout");
        }
        Interlocked.Increment(ref ClientsOpened); Interlocked.Increment(ref ActiveClients);
        return new SqlDatabaseClient(pool);
    }
    internal static int CommitCredits(IDictionary<string,long> credits)
    {
        lock (Sync)
        {
            foreach (var credit in credits) Values[credit.Key.Substring(5)] += credit.Value;
            CreditWrites++;
        }
        return 1;
    }
    internal static int CommitCredit(string column, long amount)
    {
        return CommitCredits(new Dictionary<string,long> { { column, amount } });
    }
}

internal sealed class SqlDatabaseClient : IDisposable
{
    private readonly Dictionary<string,object> parameters = new Dictionary<string,object>();
    private readonly SemaphoreSlim rentalPool;
    private int disposed;
    internal SqlDatabaseClient(SemaphoreSlim pool) { rentalPool = pool; }
    internal void ClearParameters() { parameters.Clear(); }
    internal void SetParameter(string key, object value) { parameters[key] = value; }
    internal int ExecuteNonQuery(string sql)
    {
        string[] columns = sql.StartsWith("UPDATE users SET ammo_lcb10=IF(") ? SqlDatabaseManager.PrimaryColumns
            : sql.StartsWith("UPDATE users SET ammo_r310=IF(") ? SqlDatabaseManager.SecondaryColumns : null;
        if (columns == null) throw new Exception("Unexpected simulated SQL");
        if (SqlDatabaseManager.BeforeUpdate != null) SqlDatabaseManager.BeforeUpdate();
        if (SqlDatabaseManager.FailUpdate) return -1;
        if (sql.Contains("@cooldown_owner") && Convert.ToString(parameters["cooldown_owner"]) != SqlDatabaseManager.OwnerToken)
            return 0;
        lock (SqlDatabaseManager.Sync)
        {
            foreach (string column in columns)
                SqlDatabaseManager.Values[column] = Math.Max(0, SqlDatabaseManager.Values[column] - Convert.ToInt64(parameters["consume_"+column]));
            SqlDatabaseManager.Updates++;
        }
        ClearParameters();
        return 1;
    }
    internal DataRow ExecuteQueryRow(string sql)
    {
        bool quest = sql.StartsWith("SELECT credits, uridium, experience, honor, ammo_lcb10,");
        string[] columns = sql.StartsWith("SELECT ammo_lcb10,") || quest ? SqlDatabaseManager.PrimaryColumns
            : sql.StartsWith("SELECT ammo_r310,") ? SqlDatabaseManager.SecondaryColumns : null;
        if (columns == null) throw new Exception("Unexpected simulated SQL");
        if ((sql.StartsWith("SELECT ammo_lcb10,") || quest) && sql.Contains("ammo_r310"))
        {
            var both = new List<string>(SqlDatabaseManager.PrimaryColumns);
            both.AddRange(SqlDatabaseManager.SecondaryColumns); columns = both.ToArray();
        }
        if (SqlDatabaseManager.BeforeRead != null) SqlDatabaseManager.BeforeRead();
        if (SqlDatabaseManager.NullRead) { ClearParameters(); return null; }
        var table = new DataTable();
        foreach (string column in columns) table.Columns.Add("ammo_"+column, typeof(long));
        if (quest) foreach (string column in new[] { "credits", "uridium", "experience", "honor" }) table.Columns.Add(column, typeof(long));
        DataRow row = table.NewRow();
        if (quest) foreach (string column in new[] { "credits", "uridium", "experience", "honor" }) row[column] = 0L;
        lock (SqlDatabaseManager.Sync)
        {
            foreach (string column in columns) row["ammo_"+column] = SqlDatabaseManager.Values[column];
            SqlDatabaseManager.Reads++;
        }
        table.Rows.Add(row); ClearParameters();
        if (SqlDatabaseManager.AfterReadSnapshot != null) SqlDatabaseManager.AfterReadSnapshot();
        return row;
    }
    public void Dispose()
    {
        if (Interlocked.Exchange(ref disposed, 1) != 0) return;
        Interlocked.Decrement(ref SqlDatabaseManager.ActiveClients);
        if (rentalPool != null) rentalPool.Release();
    }
}

internal static class EquipmentAmmoPersistenceTests
{
    private static int assertions;
    private static void Check(bool value, string label)
    {
        if (!value) throw new Exception(label);
        assertions++; Console.WriteLine("PASS: " + label);
    }
    private static void SecondaryRegression()
    {
        SqlDatabaseManager.Reset(100);
        var info = new CharacterInfo(100);
        for (int i = 0; i < 10; i++) info.TryConsumeRocketAmmo(1);
        var entered = new ManualResetEventSlim(); var release = new ManualResetEventSlim();
        SqlDatabaseManager.BeforeUpdate = () => { entered.Set(); if (!release.Wait(3000)) throw new Exception("secondary fixture timeout"); };
        var first = Task.Run(() => info.FlushPendingSecondaryAmmoToDb());
        Check(entered.Wait(2000), "secondary first flush reaches the storage boundary");
        var secondEntered = new ManualResetEventSlim();
        var second = Task.Run(() => { secondEntered.Set(); return info.FlushPendingSecondaryAmmoToDb(); });
        Check(secondEntered.Wait(2000), "secondary second flush requested while first is suspended");
        second.Wait(100); release.Set();
        Check(Task.WaitAll(new Task[] { first, second }, 5000), "secondary concurrent flushes finish within the fixture bound");
        Check(SqlDatabaseManager.Values["r310"] == 90 && info.AmmoR310 == 90 && SqlDatabaseManager.Updates == 1,
            "two concurrent secondary flushes persist a single 10-unit debit");

        SqlDatabaseManager.Reset(100); info = new CharacterInfo(100); info.TryConsumeRocketAmmo(1);
        SqlDatabaseManager.BeforeUpdate = () => {
            SqlDatabaseManager.Values["r310"] += 100; // Purchase independent of runtime.
            info.TryConsumeRocketAmmo(1); // A newly admitted rocket remains pending.
            SqlDatabaseManager.BeforeUpdate = null;
        };
        info.FlushPendingSecondaryAmmoToDb();
        Check(info.AmmoR310 == 198 && SqlDatabaseManager.Values["r310"] == 199,
            "secondary purchase retained and rocket admitted during UPDATE remains pending");
        info.FlushPendingSecondaryAmmoToDb();
        Check(info.AmmoR310 == 198 && SqlDatabaseManager.Values["r310"] == 198,
            "100 initial + 100 web - 1 - 1 = 198 after secondary second flush");

        SqlDatabaseManager.Reset(100); info = new CharacterInfo(100); info.TryConsumeRocketAmmo(1);
        SqlDatabaseManager.FailUpdate = true;
        bool rejected = false;
        try { info.FlushPendingSecondaryAmmoToDb(); } catch (InvalidOperationException) { rejected = true; }
        Check(rejected && SqlDatabaseManager.Values["r310"] == 100 && info.AmmoR310 == 99,
            "failed secondary UPDATE keeps the delta pending without restoring fired ammo");
        SqlDatabaseManager.FailUpdate = false; info.FlushPendingSecondaryAmmoToDb();
        Check(SqlDatabaseManager.Values["r310"] == 99, "retry after definite secondary UPDATE failure persists once");

        SqlDatabaseManager.Reset(100); info = new CharacterInfo(100); info.TryConsumeRocketAmmo(1);
        SqlDatabaseManager.BeforeRead = () => { throw new InvalidOperationException("simulated secondary read failure"); };
        try { info.FlushPendingSecondaryAmmoToDb(); } catch (InvalidOperationException) {}
        SqlDatabaseManager.BeforeRead = null; info.FlushPendingSecondaryAmmoToDb();
        Check(SqlDatabaseManager.Values["r310"] == 99 && SqlDatabaseManager.Updates == 1,
            "failed secondary SELECT after acknowledged debit does not repeat it");
        info.TryConsumeRocketAmmo(1); info.FlushPendingSecondaryAmmoToDb();
        Check(SqlDatabaseManager.Values["r310"] == 98 && info.AmmoR310 == 98,
            "next rocket after read failure persists normally");

        SqlDatabaseManager.Reset(100); info = new CharacterInfo(100); info.TryConsumeRocketAmmo(1);
        SqlDatabaseManager.NullRead = true; info.FlushPendingSecondaryAmmoToDb();
        SqlDatabaseManager.NullRead = false; info.FlushPendingSecondaryAmmoToDb();
        Check(SqlDatabaseManager.Values["r310"] == 99 && info.AmmoR310 == 99 && SqlDatabaseManager.Updates == 1,
            "missing secondary SELECT row after acknowledged debit does not repeat it");

        SqlDatabaseManager.Reset(5); info = new CharacterInfo(5);
        Check(info.TryConsumeRocketAmmo(1) && info.TryConsumeRocketAmmo(2) && info.TryConsumeRocketAmmo(3)
            && info.TryConsumeRocketAmmo(10), "all four standard rocket columns admit one funded rocket");
        Check(info.TryConsumeLauncherRocketAmmo(7, 5) && info.TryConsumeLauncherRocketAmmo(8, 5)
            && info.TryConsumeLauncherRocketAmmo(9, 5), "all three launcher columns admit their complete five-rocket salvo");
        Check(!info.TryConsumeLauncherRocketAmmo(7, 1) && !info.TryConsumeLauncherRocketAmmo(8, 1)
            && !info.TryConsumeLauncherRocketAmmo(9, 1), "zero launcher stock refuses the next salvo");
        Check(info.TryConsumeExplosiveAmmo("SMB") && info.TryConsumeExplosiveAmmo("ISH")
            && info.TryConsumeExplosiveAmmo("EMP"), "three explosive columns remain covered by secondary persistence");
        info.FlushPendingSecondaryAmmoToDb();
        bool exact = true;
        foreach (string column in SqlDatabaseManager.SecondaryColumns)
            exact &= SqlDatabaseManager.Values[column] == (column == "hstrm01" || column == "ubr100" || column == "eco10" ? 0 : 4);
        Check(exact, "one flush persists the exact debit across all ten secondary columns");
        Check(!info.TryConsumeRocketAmmo(99) && !info.TryConsumeLauncherRocketAmmo(99) && !info.TryConsumeExplosiveAmmo("unknown"),
            "unknown secondary ammunition never admits consumption");
    }
    private static long Amount(CharacterInfo info, string column)
    {
        return (long)typeof(CharacterInfo).GetField("Ammo" + column,
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase).GetValue(info);
    }
    private static void CreditRegression()
    {
        foreach (int amount in new[] { 10, 1000 })
        {
            SqlDatabaseManager.Reset(100); var info = new CharacterInfo(100); info.Shoot(26);
            bool credited = info.PersistAmmoCredit("ammo_lcb10", amount, () => SqlDatabaseManager.CommitCredit("ammo_lcb10", amount));
            Check(credited && info.AmmoLcb10 == 74 + amount && SqlDatabaseManager.Values["lcb10"] == 100 + amount && SqlDatabaseManager.CreditWrites == 1,
                "persisted credit " + amount + " keeps the earlier 26-unit primary debit pending");
            info.FlushPendingPrimaryAmmoToDb(); info.FlushPendingPrimaryAmmoToDb();
            Check(info.AmmoLcb10 == 74 + amount && SqlDatabaseManager.Values["lcb10"] == 74 + amount && SqlDatabaseManager.Updates == 1,
                "credit " + amount + " plus two primary flushes persists exactly initial - shot + purchase");
        }

        SqlDatabaseManager.Reset(100); var all = new CharacterInfo(100);
        for (int ammo = 1; ammo <= 6; ammo++) all.ShootAmmo(ammo, 26);
        foreach (int rocket in new[] { 1, 2, 3, 10 }) all.TryConsumeRocketAmmo(rocket);
        foreach (int launcher in new[] { 7, 8, 9 }) all.TryConsumeLauncherRocketAmmo(launcher, 5);
        foreach (string explosive in new[] { "SMB", "ISH", "EMP" }) all.TryConsumeExplosiveAmmo(explosive);
        var credits = new Dictionary<string,long>();
        foreach (string column in SqlDatabaseManager.PrimaryColumns) credits["ammo_" + column] = 7;
        foreach (string column in SqlDatabaseManager.SecondaryColumns) credits["ammo_" + column] = 7;
        Check(all.PersistAmmoCredits(credits, () => SqlDatabaseManager.CommitCredits(credits)),
            "one acknowledged multi-column credit supports all sixteen ammunition columns");
        all.FlushPendingPrimaryAmmoToDb(); all.FlushPendingSecondaryAmmoToDb();
        bool exact = true;
        foreach (string column in SqlDatabaseManager.PrimaryColumns)
            exact &= Amount(all, column) == 81 && SqlDatabaseManager.Values[column] == 81;
        foreach (string column in SqlDatabaseManager.SecondaryColumns)
        {
            long expected = column == "hstrm01" || column == "ubr100" || column == "eco10" ? 102 : 106;
            exact &= Amount(all, column) == expected && SqlDatabaseManager.Values[column] == expected;
        }
        Check(exact, "multi-column credit never acknowledges pending normal SAB RSB rocket launcher or explosive consumption");

        foreach (int affected in new[] { 0, -1 })
        {
            SqlDatabaseManager.Reset(100); var info = new CharacterInfo(100); info.Shoot(26); info.TryConsumeRocketAmmo(1);
            bool credited = info.PersistAmmoCredits(new Dictionary<string,long> { { "ammo_lcb10", 1000 }, { "ammo_r310", 1000 } }, () => affected);
            Check(!credited && info.AmmoLcb10 == 74 && info.AmmoR310 == 99 && SqlDatabaseManager.CreditWrites == 0,
                "unacknowledged credit affected=" + affected + " changes neither runtime stock nor baseline");
            info.FlushPendingPrimaryAmmoToDb(); info.FlushPendingSecondaryAmmoToDb();
            Check(SqlDatabaseManager.Values["lcb10"] == 74 && SqlDatabaseManager.Values["r310"] == 99,
                "pending primary and secondary consumption remains durable after credit refusal " + affected);
        }

        SqlDatabaseManager.Reset(100); var failureInfo = new CharacterInfo(100); failureInfo.Shoot(26);
        bool threw = false;
        try { failureInfo.PersistAmmoCredit("ammo_lcb10", 1000, () => { throw new InvalidOperationException("definite simulated credit failure"); }); }
        catch (InvalidOperationException) { threw = true; }
        failureInfo.FlushPendingPrimaryAmmoToDb();
        Check(threw && failureInfo.AmmoLcb10 == 74 && SqlDatabaseManager.Values["lcb10"] == 74,
            "definite credit exception preserves the pending debit without creating runtime ammo");
        int calls = 0;
        Check(!failureInfo.PersistAmmoCredit("unknown", 1, () => { calls++; return 1; })
            && !failureInfo.PersistAmmoCredit("ammo_lcb10", 0, () => { calls++; return 1; })
            && !failureInfo.PersistAmmoCredit("ammo_lcb10", -1, () => { calls++; return 1; }) && calls == 0,
            "unsupported zero and negative credits are rejected before invoking storage");

        SqlDatabaseManager.Reset(100); var overflowInfo = new CharacterInfo(100);
        var primaryBaseline = typeof(CharacterInfo).GetField("mDbAmmoLcb10", BindingFlags.Instance | BindingFlags.NonPublic);
        primaryBaseline.SetValue(overflowInfo, long.MaxValue - 1);
        calls = 0;
        bool overflowAccepted = overflowInfo.PersistAmmoCredit("ammo_lcb10", 2,
            () => { calls++; return SqlDatabaseManager.CommitCredit("ammo_lcb10", 2); });
        Check(!overflowAccepted && calls == 0 && SqlDatabaseManager.CreditWrites == 0
            && overflowInfo.AmmoLcb10 == 100 && (long)primaryBaseline.GetValue(overflowInfo) == long.MaxValue - 1
            && SqlDatabaseManager.Values["lcb10"] == 100,
            "obsolete baseline overflow is refused before the single-column credit callback and leaves all balances unchanged");

        SqlDatabaseManager.Reset(100); overflowInfo = new CharacterInfo(100); overflowInfo.AmmoEmp01 = int.MaxValue - 1L;
        var secondaryBaseline = typeof(CharacterInfo).GetField("mDbAmmoEmp01", BindingFlags.Instance | BindingFlags.NonPublic);
        var overflowingCredits = new Dictionary<string,long> { { "ammo_lcb10", 10 }, { "ammo_emp01", 2 } };
        calls = 0;
        overflowAccepted = overflowInfo.PersistAmmoCredits(overflowingCredits,
            () => { calls++; return SqlDatabaseManager.CommitCredits(overflowingCredits); });
        Check(!overflowAccepted && calls == 0 && SqlDatabaseManager.CreditWrites == 0 && overflowInfo.AmmoLcb10 == 100
            && (long)primaryBaseline.GetValue(overflowInfo) == 100 && overflowInfo.AmmoEmp01 == int.MaxValue - 1L
            && (long)secondaryBaseline.GetValue(overflowInfo) == 100
            && SqlDatabaseManager.Values["lcb10"] == 100 && SqlDatabaseManager.Values["emp01"] == 100,
            "a last-column runtime overflow refuses the entire credit batch before SQL or partial baseline acknowledgement");

        SqlDatabaseManager.Reset(100); var concurrentInfo = new CharacterInfo(100); concurrentInfo.Shoot(26);
        int accepted = 0;
        Parallel.Invoke(
            () => { if (concurrentInfo.PersistAmmoCredit("ammo_lcb10", 1000, () => SqlDatabaseManager.CommitCredit("ammo_lcb10", 1000))) Interlocked.Increment(ref accepted); },
            () => { if (concurrentInfo.PersistAmmoCredit("ammo_lcb10", 10, () => SqlDatabaseManager.CommitCredit("ammo_lcb10", 10))) Interlocked.Increment(ref accepted); });
        concurrentInfo.FlushPendingPrimaryAmmoToDb();
        Check(accepted == 2 && SqlDatabaseManager.CreditWrites == 2 && concurrentInfo.AmmoLcb10 == 1084 && SqlDatabaseManager.Values["lcb10"] == 1084,
            "two concurrent persisted credits retain both purchases and the earlier pending shot");

        SqlDatabaseManager.Reset(100); var gatedInfo = new CharacterInfo(100); gatedInfo.Shoot(26);
        var entered = new ManualResetEventSlim(); var release = new ManualResetEventSlim();
        SqlDatabaseManager.BeforeUpdate = () => { entered.Set(); if (!release.Wait(3000)) throw new Exception("credit flush fixture timeout"); };
        var flush = Task.Run(() => gatedInfo.FlushPendingPrimaryAmmoToDb());
        Check(entered.Wait(2000), "credit race primary flush is suspended at storage");
        var requested = new ManualResetEventSlim(); var creditSqlEntered = new ManualResetEventSlim();
        var creditTask = Task.Run(() => { requested.Set(); return gatedInfo.PersistAmmoCredit("ammo_lcb10", 1000,
            () => { creditSqlEntered.Set(); return SqlDatabaseManager.CommitCredit("ammo_lcb10", 1000); }); });
        Check(requested.Wait(2000), "credit requested while primary flush is suspended");
        bool serialized = !creditSqlEntered.Wait(100);
        release.Set();
        Check(Task.WaitAll(new Task[] { flush, creditTask }, 5000), "credit and suspended primary flush finish within the fixture bound");
        gatedInfo.FlushPendingPrimaryAmmoToDb();
        Check(serialized && creditTask.Result && gatedInfo.AmmoLcb10 == 1074 && SqlDatabaseManager.Values["lcb10"] == 1074,
            "credit SQL waits for the shared flush gate and cannot be applied twice during read reconciliation");

        SqlDatabaseManager.Reset(100); var inFlightInfo = new CharacterInfo(100); inFlightInfo.Shoot(26);
        entered = new ManualResetEventSlim(); release = new ManualResetEventSlim();
        creditTask = Task.Run(() => inFlightInfo.PersistAmmoCredit("ammo_lcb10", 1000, () => {
            entered.Set(); if (!release.Wait(3000)) throw new Exception("in-flight credit fixture timeout");
            return SqlDatabaseManager.CommitCredit("ammo_lcb10", 1000);
        }));
        Check(entered.Wait(2000), "persisted credit reaches suspended SQL before acknowledgement");
        var shot = Task.Run(() => inFlightInfo.Shoot(26));
        bool shotFinished = shot.Wait(1000); release.Set();
        Check(Task.WaitAll(new Task[] { creditTask, shot }, 5000), "credit and in-flight shot finish within the fixture bound");
        inFlightInfo.FlushPendingPrimaryAmmoToDb();
        Check(shotFinished && shot.Result && creditTask.Result && inFlightInfo.AmmoLcb10 == 1048 && SqlDatabaseManager.Values["lcb10"] == 1048,
            "a shot admitted during credit SQL remains pending and does not wait for the stock lock");
    }
    private static void SchemaCreditCaps()
    {
        // Independent schema contract: six signed INT stocks, ten signed BIGINT stocks.
        var expectedCaps = new Dictionary<string,long>();
        foreach (string column in SqlDatabaseManager.PrimaryColumns) expectedCaps["ammo_" + column] = long.MaxValue;
        foreach (string column in new[] { "r310", "plt2026", "plt2021", "dcr250" }) expectedCaps["ammo_" + column] = long.MaxValue;
        foreach (string column in new[] { "hstrm01", "ubr100", "eco10", "smb01", "ish01", "emp01" }) expectedCaps["ammo_" + column] = int.MaxValue;
        foreach (var expected in expectedCaps)
        {
            SqlDatabaseManager.Reset(100); var info = new CharacterInfo(100);
            string column = expected.Key.Substring(5);
            long initial = expected.Value - 10;
            var local = typeof(CharacterInfo).GetField("Ammo" + column, BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);
            var baseline = typeof(CharacterInfo).GetField("mDbAmmo" + column, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.IgnoreCase);
            local.SetValue(info, initial); baseline.SetValue(info, initial); SqlDatabaseManager.Values[column] = initial;
            int calls = 0;
            bool credited = info.PersistAmmoCredit(expected.Key, 15,
                () => { calls++; return SqlDatabaseManager.CommitCredit(expected.Key, 15); });
            Check(CharacterInfo.CreditCap(expected.Key) == expected.Value && !credited && calls == 0
                && SqlDatabaseManager.CreditWrites == 0 && (long)local.GetValue(info) == initial
                && (long)baseline.GetValue(info) == initial && SqlDatabaseManager.Values[column] == initial,
                "schema " + (expected.Value == int.MaxValue ? "INT" : "BIGINT") + " cap " + expected.Key
                    + " refuses MAX-10 + 15 before storage and preserves all balances");
            credited = info.PersistAmmoCredit(expected.Key, 10,
                () => { calls++; return SqlDatabaseManager.CommitCredit(expected.Key, 10); });
            Check(credited && calls == 1 && SqlDatabaseManager.CreditWrites == 1 && (long)local.GetValue(info) == expected.Value
                && (long)baseline.GetValue(info) == expected.Value && SqlDatabaseManager.Values[column] == expected.Value,
                "schema " + (expected.Value == int.MaxValue ? "INT" : "BIGINT") + " cap " + expected.Key
                    + " accepts MAX-10 + 10 exactly once at its declared maximum");
        }
    }
    private static void BoundedPoolRegression()
    {
        var borrowers = new[] {
            Tuple.Create<string,Func<CharacterInfo,bool>>("primary flush", value => value.FlushPendingPrimaryAmmoToDb()),
            Tuple.Create<string,Func<CharacterInfo,bool>>("secondary flush", value => value.FlushPendingSecondaryAmmoToDb()),
            Tuple.Create<string,Func<CharacterInfo,bool>>("ammo refresh", value => value.RefreshAmmoFromDbIfHigher()),
            Tuple.Create<string,Func<CharacterInfo,bool>>("quest refresh", value => value.RefreshQuestRewardData())
        };
        foreach (var borrower in borrowers)
        {
            SqlDatabaseManager.Reset(100); var info = new CharacterInfo(100); info.Shoot(26); info.TryConsumeRocketAmmo(1);
            SqlDatabaseManager.ClientPool = new SemaphoreSlim(1, 1);
            SqlDatabaseManager.PoolWaitEntered = new ManualResetEventSlim();
            Task<bool> waiting, credit;
            bool observedPoolWait, progressedBeforeRelease;
            using (var held = SqlDatabaseManager.GetClient("fixture writer keeps the only SQL client"))
            {
                waiting = Task.Run(() => borrower.Item2(info));
                observedPoolWait = SqlDatabaseManager.PoolWaitEntered.Wait(1500);
                credit = Task.Run(() => info.PersistAmmoCredit("ammo_lcb10", 1000,
                    () => SqlDatabaseManager.CommitCredit("ammo_lcb10", 1000)));
                // A gate acquired before GetClient would block this credit until
                // the holder returned its client, exposing the pool/gate cycle.
                progressedBeforeRelease = credit.Wait(1000) && credit.Result;
            }
            bool finished = Task.WaitAll(new Task[] { waiting, credit }, 5000);
            Check(observedPoolWait && progressedBeforeRelease && finished && SqlDatabaseManager.ActiveClients == 0,
                "bounded pool one: client holder credits while " + borrower.Item1 + " waits without holding the ammo gate");
            info.FlushPendingPrimaryAmmoToDb(); info.FlushPendingSecondaryAmmoToDb();
            Check(info.AmmoLcb10 == 1074 && info.AmmoR310 == 99 && SqlDatabaseManager.Values["lcb10"] == 1074
                && SqlDatabaseManager.Values["r310"] == 99 && SqlDatabaseManager.CreditWrites == 1
                && SqlDatabaseManager.Updates == 2 && SqlDatabaseManager.ActiveClients == 0,
                "bounded pool one: " + borrower.Item1 + " and client-holder credit preserve each pending debit once");
        }

        SqlDatabaseManager.Reset(100); var clean = new CharacterInfo(100);
        SqlDatabaseManager.ClientPool = new SemaphoreSlim(1, 1);
        Task<bool> noOp; bool completedWhileHeld;
        using (var held = SqlDatabaseManager.GetClient("fixture holds the only SQL client for no-op flushes"))
        {
            noOp = Task.Run(() => !clean.FlushPendingPrimaryAmmoToDb() && !clean.FlushPendingSecondaryAmmoToDb());
            completedWhileHeld = noOp.Wait(500) && noOp.Result;
        }
        Check(noOp.Wait(5000) && completedWhileHeld && SqlDatabaseManager.ClientsOpened == 1
            && SqlDatabaseManager.ActiveClients == 0 && SqlDatabaseManager.Updates == 0,
            "clean primary and secondary flushes never borrow a client from an exhausted bounded pool");
    }
    private static void RefreshAndTerminalRegression()
    {
        SqlDatabaseManager.Reset(100); var info = new CharacterInfo(100); info.Shoot(26); info.TryConsumeRocketAmmo(1);
        SqlDatabaseManager.Values["lcb10"] += 100; SqlDatabaseManager.Values["r310"] += 100;
        info.RefreshAmmoFromDbIfHigher();
        Check(info.AmmoLcb10 == 74 && info.AmmoR310 == 99, "refresh cannot overwrite pending primary or secondary consumption with purchased DB stock");
        info.FlushPendingPrimaryAmmoToDb(); info.FlushPendingSecondaryAmmoToDb();
        info.RefreshAmmoFromDbIfHigher(); info.RefreshAmmoFromDbIfHigher();
        Check(info.AmmoLcb10 == 174 && info.AmmoR310 == 199 && SqlDatabaseManager.Values["lcb10"] == 174 && SqlDatabaseManager.Values["r310"] == 199,
            "pending debit plus external purchase reconciles exactly once across repeated refreshes");

        SqlDatabaseManager.Reset(100); var staleInfo = new CharacterInfo(100); staleInfo.TryConsumeRocketAmmo(1);
        SqlDatabaseManager.Values["r310"] += 100;
        var captured = new ManualResetEventSlim(); var release = new ManualResetEventSlim();
        SqlDatabaseManager.AfterReadSnapshot = () => {
            captured.Set(); if (!release.Wait(3000)) throw new Exception("stale refresh fixture timeout");
            SqlDatabaseManager.AfterReadSnapshot = null;
        };
        var refresh = Task.Run(() => staleInfo.RefreshAmmoFromDbIfHigher());
        Check(captured.Wait(2000), "refresh captured purchased secondary stock before local application");
        var requested = new ManualResetEventSlim();
        var secondaryFlush = Task.Run(() => { requested.Set(); return staleInfo.FlushPendingSecondaryAmmoToDb(); });
        Check(requested.Wait(2000), "secondary flush requested while refresh holds a captured SELECT row");
        bool serialized = !secondaryFlush.Wait(100); release.Set();
        Check(Task.WaitAll(new Task[] { refresh, secondaryFlush }, 5000), "stale refresh and secondary flush finish within the fixture bound");
        Check(serialized && staleInfo.AmmoR310 == 199 && SqlDatabaseManager.Values["r310"] == 199,
            "captured stale refresh cannot resurrect a secondary debit acknowledged concurrently");

        SqlDatabaseManager.Reset(100); var closedInfo = new CharacterInfo(100);
        closedInfo.Shoot(26); closedInfo.TryConsumeRocketAmmo(1); closedInfo.TryConsumeLauncherRocketAmmo(7, 5);
        closedInfo.CloseAmmoConsumption();
        int accepted = 0;
        Parallel.For(0, 100, i => {
            if (closedInfo.Shoot(26)) Interlocked.Increment(ref accepted);
            if (closedInfo.TryConsumeRocketAmmo(1)) Interlocked.Increment(ref accepted);
            if (closedInfo.TryConsumeLauncherRocketAmmo(7)) Interlocked.Increment(ref accepted);
        });
        Check(accepted == 0 && closedInfo.AmmoLcb10 == 74 && closedInfo.AmmoR310 == 99 && closedInfo.AmmoHstrm01 == 95,
            "terminal close rejects late concurrent laser rocket and launcher admissions");
        closedInfo.FlushPendingPrimaryAmmoToDb(); closedInfo.FlushPendingSecondaryAmmoToDb();
        closedInfo.CloseAmmoConsumption(); closedInfo.FlushPendingPrimaryAmmoToDb(); closedInfo.FlushPendingSecondaryAmmoToDb();
        Check(SqlDatabaseManager.Values["lcb10"] == 74 && SqlDatabaseManager.Values["r310"] == 99
            && SqlDatabaseManager.Values["hstrm01"] == 95 && SqlDatabaseManager.Updates == 2,
            "terminal final flush persists earlier admissions once and repeated close is harmless");
        Check(!closedInfo.Shoot(26) && !closedInfo.TryConsumeRocketAmmo(1) && !closedInfo.TryConsumeLauncherRocketAmmo(7),
            "terminal admissions remain closed after the final persistence boundary");

        SqlDatabaseManager.Reset(100); var staleOwner = new CharacterInfo(100); staleOwner.Shoot(26); staleOwner.TryConsumeRocketAmmo(1);
        SqlDatabaseManager.OwnerToken = "replacement-owner";
        bool primaryRejected = false, secondaryRejected = false;
        try { staleOwner.FlushPendingPrimaryAmmoToDb(); } catch (InvalidOperationException) { primaryRejected = true; }
        try { staleOwner.FlushPendingSecondaryAmmoToDb(); } catch (InvalidOperationException) { secondaryRejected = true; }
        Check(primaryRejected && secondaryRejected && staleOwner.AmmoLcb10 == 74 && staleOwner.AmmoR310 == 99
            && SqlDatabaseManager.Values["lcb10"] == 100 && SqlDatabaseManager.Values["r310"] == 100 && SqlDatabaseManager.Updates == 0,
            "owner-fenced UPDATE zero affects no stock and never acknowledges either pending debit");
    }
    public static int Main()
    {
        try
        {
            SqlDatabaseManager.Reset(100);
            var info = new CharacterInfo(100); info.Shoot(26);
            var entered = new ManualResetEventSlim(); var release = new ManualResetEventSlim();
            SqlDatabaseManager.BeforeUpdate = () => { entered.Set(); if (!release.Wait(3000)) throw new Exception("fixture timeout"); };
            var first = Task.Run(() => info.FlushPendingPrimaryAmmoToDb());
            Check(entered.Wait(2000), "first flush reaches the storage boundary");
            var secondEntered = new ManualResetEventSlim();
            var second = Task.Run(() => { secondEntered.Set(); return info.FlushPendingPrimaryAmmoToDb(); });
            Check(secondEntered.Wait(2000), "second flush requested while first is suspended");
            // Give the second call the opportunity to expose the old duplicate-write race.
            second.Wait(100);
            release.Set(); Task.WaitAll(first,second);
            Check(SqlDatabaseManager.Values["lcb10"] == 74 && info.AmmoLcb10 == 74 && SqlDatabaseManager.Updates == 1,
                "two concurrent flushes persist a single 26-unit debit");

            SqlDatabaseManager.Reset(100); info = new CharacterInfo(100); info.Shoot(26);
            SqlDatabaseManager.BeforeUpdate = () => {
                SqlDatabaseManager.Values["lcb10"] += 100; // Concurrent web purchase, independent of runtime.
                info.Shoot(26); // Another admitted volley while database I/O is in progress.
                SqlDatabaseManager.BeforeUpdate = null;
            };
            info.FlushPendingPrimaryAmmoToDb();
            Check(info.AmmoLcb10 == 148 && SqlDatabaseManager.Values["lcb10"] == 174,
                "purchase retained and newly fired volley remains pending");
            info.FlushPendingPrimaryAmmoToDb();
            Check(info.AmmoLcb10 == 148 && SqlDatabaseManager.Values["lcb10"] == 148,
                "100 initial + 100 web - 26 - 26 = 148 after second flush");

            SqlDatabaseManager.Reset(100); info = new CharacterInfo(100); info.Shoot(26);
            SqlDatabaseManager.FailUpdate = true;
            bool rejected = false;
            try { info.FlushPendingPrimaryAmmoToDb(); } catch (InvalidOperationException) { rejected = true; }
            Check(rejected && SqlDatabaseManager.Values["lcb10"] == 100 && info.AmmoLcb10 == 74,
                "failed UPDATE leaves the delta pending");
            SqlDatabaseManager.FailUpdate = false; info.FlushPendingPrimaryAmmoToDb();
            Check(SqlDatabaseManager.Values["lcb10"] == 74, "retry after definite UPDATE failure persists once");

            SqlDatabaseManager.Reset(100); info = new CharacterInfo(100); info.Shoot(26);
            SqlDatabaseManager.BeforeRead = () => { throw new InvalidOperationException("simulated read failure"); };
            try { info.FlushPendingPrimaryAmmoToDb(); } catch (InvalidOperationException) {}
            SqlDatabaseManager.BeforeRead = null; info.FlushPendingPrimaryAmmoToDb();
            Check(SqlDatabaseManager.Values["lcb10"] == 74 && SqlDatabaseManager.Updates == 1,
                "failed SELECT after acknowledged debit does not repeat it");
            info.Shoot(26); info.FlushPendingPrimaryAmmoToDb();
            Check(SqlDatabaseManager.Values["lcb10"] == 48 && info.AmmoLcb10 == 48,
                "next volley after read failure persists normally");
            SecondaryRegression();
            CreditRegression(); SchemaCreditCaps(); RefreshAndTerminalRegression(); BoundedPoolRegression();
            Console.WriteLine("PASS: " + assertions + " assertions against production methods with simulated storage; no real DB.");
            return 0;
        }
        catch (Exception error) { Console.Error.WriteLine(error); return 1; }
    }
}
