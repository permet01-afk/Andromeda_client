// The runner inserts the unchanged production ammo methods at the marker below.
// Only the SQL transport is simulated. This does not validate a real MySQL database.
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;

internal sealed class CharacterInfo
{
    private readonly object mPrimaryAmmoSyncLock = new object();
    private readonly object mPrimaryAmmoFlushLock = new object();
    private int mId = 900001;
    private bool mPrimaryAmmoDirty;
    private int mAmmoSyncClientUpdatePending;
    public long AmmoLcb10, AmmoMcb25, AmmoMcb50, AmmoUcb100, AmmoSab50, AmmoRsb75;
    private long mDbAmmoLcb10, mDbAmmoMcb25, mDbAmmoMcb50, mDbAmmoUcb100, mDbAmmoSab50, mDbAmmoRsb75;

    internal CharacterInfo(long amount)
    {
        AmmoLcb10 = AmmoMcb25 = AmmoMcb50 = AmmoUcb100 = AmmoSab50 = AmmoRsb75 = amount;
        mDbAmmoLcb10 = mDbAmmoMcb25 = mDbAmmoMcb50 = mDbAmmoUcb100 = mDbAmmoSab50 = mDbAmmoRsb75 = amount;
    }
    internal bool Shoot(int amount) { return TryConsumePrimaryLaserColumn(ref AmmoLcb10, amount); }
    /*PRODUCTION_METHODS*/
}

internal static class SqlDatabaseManager
{
    internal static readonly string[] Columns = {"lcb10","mcb25","mcb50","ucb100","sab50","rsb75"};
    internal static readonly object Sync = new object();
    internal static readonly Dictionary<string,long> Values = new Dictionary<string,long>();
    internal static Action BeforeUpdate, BeforeRead;
    internal static bool FailUpdate;
    internal static int Updates, Reads;
    internal static void Reset(long amount)
    {
        foreach (string column in Columns) Values[column] = amount;
        BeforeUpdate = BeforeRead = null; FailUpdate = false; Updates = Reads = 0;
    }
    internal static SqlDatabaseClient GetClient(string purpose) { return new SqlDatabaseClient(); }
}

internal sealed class SqlDatabaseClient : IDisposable
{
    private readonly Dictionary<string,object> parameters = new Dictionary<string,object>();
    internal void ClearParameters() { parameters.Clear(); }
    internal void SetParameter(string key, object value) { parameters[key] = value; }
    internal int ExecuteNonQuery(string sql)
    {
        if (!sql.StartsWith("UPDATE users SET ammo_lcb10=IF(")) throw new Exception("Unexpected simulated SQL");
        if (SqlDatabaseManager.BeforeUpdate != null) SqlDatabaseManager.BeforeUpdate();
        if (SqlDatabaseManager.FailUpdate) return -1;
        lock (SqlDatabaseManager.Sync)
        {
            foreach (string column in SqlDatabaseManager.Columns)
                SqlDatabaseManager.Values[column] = Math.Max(0, SqlDatabaseManager.Values[column] - Convert.ToInt64(parameters["consume_"+column]));
            SqlDatabaseManager.Updates++;
        }
        ClearParameters();
        return 1;
    }
    internal DataRow ExecuteQueryRow(string sql)
    {
        if (!sql.StartsWith("SELECT ammo_lcb10,")) throw new Exception("Unexpected simulated SQL");
        if (SqlDatabaseManager.BeforeRead != null) SqlDatabaseManager.BeforeRead();
        var table = new DataTable();
        foreach (string column in SqlDatabaseManager.Columns) table.Columns.Add("ammo_"+column, typeof(long));
        DataRow row = table.NewRow();
        lock (SqlDatabaseManager.Sync)
        {
            foreach (string column in SqlDatabaseManager.Columns) row["ammo_"+column] = SqlDatabaseManager.Values[column];
            SqlDatabaseManager.Reads++;
        }
        table.Rows.Add(row); ClearParameters(); return row;
    }
    public void Dispose() {}
}

internal static class EquipmentAmmoPersistenceTests
{
    private static int assertions;
    private static void Check(bool value, string label)
    {
        if (!value) throw new Exception(label);
        assertions++; Console.WriteLine("PASS: " + label);
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
            Console.WriteLine("PASS: " + assertions + " assertions against production methods with simulated storage; no real DB.");
            return 0;
        }
        catch (Exception error) { Console.Error.WriteLine(error); return 1; }
    }
}
