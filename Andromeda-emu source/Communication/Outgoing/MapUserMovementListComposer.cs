// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Outgoing.MapUserMovementListComposer
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Libs;
using System;
using System.Collections.Generic;

namespace OrbitReborn_Emulator.Communication.Outgoing
{
  public static class MapUserMovementListComposer
  {
    public static ServerMessage Compose(CList<MapActor> Actors)
    {
      ServerMessage serverMessage = new ServerMessage();
      foreach (MapActor key in (IEnumerable<MapActor>) Actors.Keys)
      {
        if (((CharacterInfo) key.ReferenceObject).IsMoving)
        {
          int locX = ((CharacterInfo) key.ReferenceObject).LocX;
          int locY = ((CharacterInfo) key.ReferenceObject).LocY;
          int newLocX = ((CharacterInfo) key.ReferenceObject).NewLocX;
          int newLocY = ((CharacterInfo) key.ReferenceObject).NewLocY;
          double a = Math.Sqrt(Math.Pow((double) (locX - newLocX), 2.0) + Math.Pow((double) (locY - newLocY), 2.0)) / (double) ((CharacterInfo) key.ReferenceObject).ShipSpeed * 1000.0;
          serverMessage.AppendShort("0|1");
          serverMessage.Append(key.ReferenceId);
          serverMessage.Append(newLocX);
          serverMessage.Append(newLocY);
          serverMessage.Append(Math.Round(a).ToString());
          serverMessage.AppendBreak();
        }
      }
      return serverMessage;
    }

    public static ServerMessage ComposeIA(CList<MapActor> Actors)
    {
      ServerMessage serverMessage = new ServerMessage();
      int num = 0;
      foreach (MapActor key in (IEnumerable<MapActor>) Actors.Keys)
      {
        Npc referenceObject = (Npc) key.ReferenceObject;
        if (referenceObject.IsMoving)
        {
          double a = Math.Sqrt(Math.Pow((double) (referenceObject.LocX - referenceObject.NewLocX), 2.0) + Math.Pow((double) (referenceObject.LocY - referenceObject.NewLocY), 2.0)) / (double) referenceObject.ShipSpeed * 1000.0;
          serverMessage.AppendShort("0|1");
          serverMessage.Append(key.ReferenceId);
          serverMessage.Append(referenceObject.NewLocX);
          serverMessage.Append(referenceObject.NewLocY);
          serverMessage.Append(Math.Round(a).ToString());
          serverMessage.AppendBreak();
          ++num;
        }
      }
      if (num == 0)
      {
        serverMessage.AppendShort("");
        serverMessage.Append("");
        serverMessage.AppendBreak();
      }
      return serverMessage;
    }
  }
}
