// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Storage.SqlDatabaseClient
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using MySql.Data.MySqlClient;
using System;
using System.Data;

namespace OrbitReborn_Emulator.Storage
{
  public class SqlDatabaseClient: IDisposable
  {
    private int mId;
    private double mLastActivity;
    private MySqlConnection mConnection;
    private MySqlCommand mCommand;
    private bool mAvailable;

    public int Id
    {
      get
      {
        return this.mId;
      }
    }

    public bool Available
    {
      get
      {
        return this.mAvailable;
      }
      set
      {
        this.mAvailable = value;
      }
    }

    public double TimeInactive
    {
      get
      {
        return UnixTimestamp.GetCurrent() - this.mLastActivity;
      }
    }

    public SqlDatabaseClient(int Id, MySqlConnection Connection)
    {
      this.mId = Id;
      this.mConnection = Connection;
      this.mCommand = new MySqlCommand();
      this.mCommand.Connection = this.mConnection;
      this.mAvailable = true;
      this.UpdateLastActivity();
    }

    public void Dispose()
    {
      this.mAvailable = true;
      this.UpdateLastActivity();
      SqlDatabaseManager.PokeAllAwaiting();
    }

    public void Close()
    {
      this.mConnection.Close();
      this.mCommand.Dispose();
      this.mConnection = (MySqlConnection) null;
      this.mCommand = (MySqlCommand) null;
    }

    private void UpdateLastActivity()
    {
      this.mLastActivity = UnixTimestamp.GetCurrent();
    }

    public void ClearParameters()
    {
      this.mCommand.Parameters.Clear();
    }

    public void SetParameter(string Key, object Value)
    {
      this.mCommand.Parameters.Add(new MySqlParameter(Key, Value));
    }

    public void ResetCommand()
    {
      this.mCommand.CommandText = (string) null;
      this.ClearParameters();
    }

    public int ExecuteNonQuery(string CommandText)
    {
            try
            {
                this.mCommand.CommandText = CommandText;
                int num = this.mCommand.ExecuteNonQuery();
                this.ResetCommand();
                return num;
            } catch (Exception error)
            {
                Console.WriteLine("ERROR :", error);
                return -1;
            }
    }

    public DataSet ExecuteQuerySet(string CommandText)
    {
      DataSet dataSet = new DataSet();
      this.mCommand.CommandText = CommandText;
      using (MySqlDataAdapter mySqlDataAdapter = new MySqlDataAdapter(this.mCommand))
        mySqlDataAdapter.Fill(dataSet);
      this.ResetCommand();
      return dataSet;
    }

    public DataTable ExecuteQueryTable(string CommandText)
    {
      DataSet dataSet = this.ExecuteQuerySet(CommandText);
      return dataSet.Tables.Count > 0 ? dataSet.Tables[0] : (DataTable) null;
    }

    public DataRow ExecuteQueryRow(string CommandText)
    {
      DataTable dataTable = this.ExecuteQueryTable(CommandText);
      return dataTable.Rows.Count > 0 ? dataTable.Rows[0] : (DataRow) null;
    }

        public DataRowCollection ExecuteQueryRows(string CommandText)
        {
            DataTable dataTable = this.ExecuteQueryTable(CommandText);
            return dataTable.Rows.Count > 0 ? dataTable.Rows : null;
        }

        public object ExecuteScalar(string CommandText)
    {
      this.mCommand.CommandText = CommandText;
      object obj = this.mCommand.ExecuteScalar();
      this.ResetCommand();
      return obj;
    }
  }
}
