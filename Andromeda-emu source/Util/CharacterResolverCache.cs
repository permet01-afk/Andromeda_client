

using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace OrbitReborn_Emulator.Util
{
  public static class CharacterResolverCache
  {
    private static CDictionnary<int, string> mNameCache = new CDictionnary<int, string>();

    public static void AddToCache(int Id, string Name, bool Override)
    {
      lock (CharacterResolverCache.mNameCache)
      {
        if (CharacterResolverCache.mNameCache.ContainsKey(Id))
        {
          if (!Override)
            return;
          CharacterResolverCache.mNameCache[Id] = Name;
        }
        else
          CharacterResolverCache.mNameCache.Add(Id, Name);
      }
    }

    public static string GetNameFromUid(int UserId)
    {
      lock (CharacterResolverCache.mNameCache)
      {
        if (CharacterResolverCache.mNameCache.ContainsKey(UserId))
          return CharacterResolverCache.mNameCache[UserId];
        using (SqlDatabaseClient resource_0 = SqlDatabaseManager.GetClient())
        {
          resource_0.ClearParameters();
          resource_0.SetParameter("id", (object) UserId);
          string local_1 = (string) resource_0.ExecuteScalar("SELECT username FROM users WHERE id = @id LIMIT 1");
          if (local_1 != null && local_1.Length > 0)
          {
            CharacterResolverCache.mNameCache.Add(UserId, local_1);
            return local_1;
          }
        }
      }
      return "Unknown User";
    }

    public static int GetUidFromName(string Name)
    {
      lock (CharacterResolverCache.mNameCache)
      {
        foreach (KeyValuePair<int, string> item_0 in (ConcurrentDictionary<int, string>) CharacterResolverCache.mNameCache)
        {
          if (string.Equals(item_0.Value, Name, System.StringComparison.OrdinalIgnoreCase))
            return item_0.Key;
        }
        using (SqlDatabaseClient resource_0 = SqlDatabaseManager.GetClient())
        {
          resource_0.ClearParameters();
          resource_0.SetParameter("username", (object) Name);
          object local_2 = resource_0.ExecuteScalar("SELECT id FROM users WHERE username = @username LIMIT 1");
          if (local_2 != null)
          {
            int local_3 = (int) local_2;
            CharacterResolverCache.mNameCache.Add(local_3, Name);
            return local_3;
          }
        }
      }
      return 0;
    }
  }
}
