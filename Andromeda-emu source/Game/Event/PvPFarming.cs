

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Event
{
  internal static class PvPFarming
  {
    private static bool mActive;
    private static bool mSafeBattle;
    private static int mNpcCount;
    private static Timer mPerformUpdate;

    public static bool Active
    {
      get
      {
        return PvPFarming.mActive;
      }
      set
      {
        PvPFarming.mActive = value;
      }
    }

    public static bool SafeBattle
    {
      get
      {
        return PvPFarming.mSafeBattle;
      }
      set
      {
        PvPFarming.mSafeBattle = value;
      }
    }

    public static int NpcCount
    {
      get
      {
        return PvPFarming.mNpcCount;
      }
      set
      {
        PvPFarming.mNpcCount = value;
      }
    }

    public static Timer PerformUpdate
    {
      get
      {
        return PvPFarming.mPerformUpdate;
      }
      set
      {
        PvPFarming.mPerformUpdate = value;
      }
    }

    public static void Initialize()
    {
      PvPFarming.Active = false;
      PvPFarming.SafeBattle = false;
      PvPFarming.PerformUpdate = (Timer) null;
      PvPFarming.NpcCount = 0;
    }

    public static void StartPvPFarm()
    {
      foreach (MapInstance mapInstance in (IEnumerable<MapInstance>) MapManager.MapInstances.Values)
      {
        if (!mapInstance.Unloaded)
        {
          string str = "PvP Farm Event will start in 20 seconds. Prepare to farm !";
          mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
        }
      }
      PvPFarming.PerformUpdate = new Timer(new TimerCallback(PvPFarming.StartCoolDown), (object) 10, 10000, 0);
    }

    private static void StartCoolDown(object state)
    {
      int num = (int) state;
      if (num == 0)
      {
        PvPFarming.BeginPvPFarm();
      }
      else
      {
        foreach (MapInstance mapInstance in (IEnumerable<MapInstance>) MapManager.MapInstances.Values)
        {
          if (mapInstance != null && !mapInstance.Unloaded)
          {
            string str = "PvP Farm will start in " + (object) num + " seconds...";
            mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
          }
        }
        PvPFarming.PerformUpdate = new Timer(new TimerCallback(PvPFarming.StartCoolDown), (object) (num - 1), 1000, 0);
      }
    }

    private static void BeginPvPFarm()
    {
      PvPFarming.Active = true;
      MapInstance instanceByMapId = MapManager.GetInstanceByMapId(17);
      if (instanceByMapId != null)
      {
        string str = "Invaders detected in PvP map !";
        instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
      }
      List<string> npc1 = new List<string>()
      {
        "-=[ Super Invader ]=-",
        "2",
        "0",
        "0",
        "155",
        "60000000",
        "60000000",
        "45000000",
        "45000000",
        "150",
        "500000000",
        "400000",
        "0",
        "1",
        "0",
        "",
        "0",
        "0",
        "0",
        "0",
        "7000",
        "65000"
      };
      List<string> npc2 = new List<string>()
      {
        "-=[ Invader ]=-",
        "2",
        "0",
        "0",
        "148",
        "20000000",
        "20000000",
        "15000000",
        "15000000",
        "300",
        "180000000",
        "200000",
        "0",
        "1",
        "0",
        "",
        "0",
        "0",
        "0",
        "0",
        "2600",
        "55000"
      };
      NpcAI.CreateNpc(npc1, 17, 3, false);
      NpcAI.CreateNpc(npc2, 17, 9, false);
      PvPFarming.PerformUpdate = new Timer(new TimerCallback(PvPFarming.Monitor), (object) null, 0, 30000);
    }

    private static void Monitor(object state)
    {
      MapInstance instanceByMapId = MapManager.GetInstanceByMapId(17);
      if (instanceByMapId == null && PvPFarming.PerformUpdate != null)
      {
        PvPFarming.PerformUpdate.Dispose();
        PvPFarming.Active = false;
      }
      PvPFarming.NpcCount = 0;
      foreach (MapActor mapActor in (IEnumerable<MapActor>) instanceByMapId.Actors.Values)
      {
        if (mapActor.Type == MapActorType.AiBot)
        {
          Npc referenceObject = (Npc) instanceByMapId.GetActorByReferenceId(mapActor.ReferenceId, MapActorType.AiBot).ReferenceObject;
          if (referenceObject != null && !referenceObject.Respawn)
            ++PvPFarming.NpcCount;
        }
      }
      if (PvPFarming.NpcCount > 0)
      {
        foreach (MapActor mapActor in (IEnumerable<MapActor>) instanceByMapId.Actors.Values)
        {
          if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
          {
            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
            if (sessionById != null && sessionById.CharacterInfo != null)
            {
              string str = PvPFarming.NpcCount.ToString() + " Invaders left...";
              sessionById.SendData(PacketComposer.Compose("A", "STD|" + str));
            }
          }
        }
      }
      else
      {
        if (PvPFarming.PerformUpdate != null)
          PvPFarming.PerformUpdate.Dispose();
        foreach (MapActor mapActor in (IEnumerable<MapActor>) instanceByMapId.Actors.Values)
        {
          if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
          {
            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
            if (sessionById != null && sessionById.CharacterInfo != null)
            {
              foreach (MapInstance mapInstance in (IEnumerable<MapInstance>) MapManager.MapInstances.Values)
              {
                if (mapInstance != null && !mapInstance.Unloaded)
                {
                  string str = "Well played to you all, the Invaders lost !";
                  mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                }
              }
              PvPFarming.Active = false;
              break;
            }
          }
        }
      }
    }
  }
}
