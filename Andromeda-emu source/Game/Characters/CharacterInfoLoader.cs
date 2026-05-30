// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Characters.CharacterInfoLoader
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Characters
{
  public static class CharacterInfoLoader
  {
    private const double CACHE_LIFE_TIME = 300.0;
    private static CDictionnary<int, CharacterInfo> mCharacterInfoCache;
    private static Timer mCacheMonitor;

    public static void Initialize()
    {
      CharacterInfoLoader.mCharacterInfoCache = new CDictionnary<int, CharacterInfo>();
      CharacterInfoLoader.mCacheMonitor = new Timer(new TimerCallback(CharacterInfoLoader.MonitorCache), (object) null, TimeSpan.FromSeconds(30.0), TimeSpan.FromSeconds(30.0));
    }

    private static void MonitorCache(object state)
    {
      lock (CharacterInfoLoader.mCharacterInfoCache)
      {
        CList<int> local_0 = new CList<int>();
        foreach (CharacterInfo item_0 in (IEnumerable<CharacterInfo>) CharacterInfoLoader.mCharacterInfoCache.Values)
        {
          if (SessionManager.ContainsCharacterId(item_0.Id) || item_0.CacheAge >= 300.0)
            local_0.Add(item_0.Id);
        }
        foreach (int item_1 in (IEnumerable<int>) local_0.Keys)
          CharacterInfoLoader.mCharacterInfoCache.Remove(item_1);
      }
    }

    private static CharacterInfo TryGetInfoFromCache(int CharacterId)
    {
      lock (CharacterInfoLoader.mCharacterInfoCache)
      {
        if (CharacterInfoLoader.mCharacterInfoCache.ContainsKey(CharacterId))
          return CharacterInfoLoader.mCharacterInfoCache[CharacterId];
      }
      return (CharacterInfo) null;
    }

        public static CharacterInfo GetCharacterInfo(SqlDatabaseClient MySqlClient, int CharacterId, int LinkedClientId, string Ticket, bool IgnoreCache)
    {
      if (SessionManager.ContainsCharacterIdCache(CharacterId))
      {
        Session characterIdCache = SessionManager.GetSessionByCharacterIdCache(CharacterId);
        if (characterIdCache != null)
          return characterIdCache.CharacterInfo;
        return (CharacterInfo) null;
      }
      if (!IgnoreCache)
      {
        CharacterInfo infoFromCache = CharacterInfoLoader.TryGetInfoFromCache(CharacterId);
        if (infoFromCache != null)
          return infoFromCache;
      }
      return CharacterInfoLoader.GenerateCharacterInfo(MySqlClient, CharacterId, LinkedClientId, Ticket);
    }

    public static CharacterInfo GenerateCharacterInfo(SqlDatabaseClient MySqlClient, int CharacterId, int LinkedClientId, string Ticket)
    {
      return new CharacterInfo(MySqlClient, LinkedClientId, CharacterId, Ticket);
    }
  }
}
