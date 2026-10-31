

using MySqlConnector;
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
    private bool mFaulted;

    // A failed transport/reader cleanup cannot be returned as a healthy rental.
    internal bool IsReusable
    {
      get { return !this.mFaulted && this.mConnection != null && this.mConnection.State == ConnectionState.Open; }
    }

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

    private void ResetCommandAfterFailure()
    {
      // The connector can retain ActiveCommandId after a failed socket send.
      // Do not replace that original failure by assigning CommandText on it.
      if (this.mConnection == null || this.mConnection.State != ConnectionState.Open)
      { this.mFaulted = true; return; }
      try { this.ResetCommand(); }
      catch (Exception) { this.mFaulted = true; } // Preserve the original exception.
    }

    public int ExecuteNonQuery(string CommandText)
    {
            SqlFailureScope.ThrowIfCurrentFailed();
            try
            {
                this.mCommand.CommandText = CommandText;
                int num = this.mCommand.ExecuteNonQuery();
                this.ResetCommand();
                return num;
            } catch (Exception error)
            {
                this.ResetCommandAfterFailure();
                if (SqlFailureScope.Record(error, "SqlDatabaseClient.ExecuteNonQuery") || !this.IsReusable) throw;
                Console.WriteLine("SQL operation failed: " + error);
                return -1;
            }
    }

    public DataSet ExecuteQuerySet(string CommandText)
    {
      SqlFailureScope.ThrowIfCurrentFailed();
      try
      {
        DataSet dataSet = new DataSet();
        this.mCommand.CommandText = CommandText;
        using (MySqlDataAdapter mySqlDataAdapter = new MySqlDataAdapter(this.mCommand))
          mySqlDataAdapter.Fill(dataSet);
        this.ResetCommand();
        return dataSet;
      }
      catch (Exception error)
      {
        SqlFailureScope.Record(error, "SqlDatabaseClient.ExecuteQuerySet");
        this.ResetCommandAfterFailure();
        throw;
      }
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
      SqlFailureScope.ThrowIfCurrentFailed();
      try
      {
        this.mCommand.CommandText = CommandText;
        object obj = this.mCommand.ExecuteScalar();
        this.ResetCommand();
        return obj;
      }
      catch (Exception error)
      {
        SqlFailureScope.Record(error, "SqlDatabaseClient.ExecuteScalar");
        this.ResetCommandAfterFailure();
        throw;
      }
    }
  }
}
