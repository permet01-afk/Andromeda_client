// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Input
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Config;
using OrbitReborn_Emulator.Game.Sessions;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;

namespace OrbitReborn_Emulator
{
  public static class Input
  {
    public static Timer mTimer;

    public static void Listen()
    {
      while (Program.Alive)
      {
        if (Console.ReadKey(true).Key == ConsoleKey.Enter)
        {
          Console.Write("$" + Environment.UserName.ToLower() + "@Andromeda> ");
          string str = Console.ReadLine();
          if (str.Length > 0)
            Input.ProcessInput(str.Split(' '));
        }
      }
    }

    public static void StopDelay(object state)
    {
      int num = (int) state;
      if (num == 0)
      {
        Program.Stop();
      }
      else
      {
        foreach (Session key in (IEnumerable<Session>) SessionManager.SessionsUser.Keys)
        {
          if (key != null)
          {
            string str = "Server stopping in -= " + (object) num + " =-";
            key.SendData(PacketComposer.Compose("A", "STD|" + str));
          }
        }
        Input.mTimer = new Timer(new TimerCallback(Input.StopDelay), (object) (num - 1), 1000, 0);
      }
    }

    public static void ProcessInput(string[] Args)
    {
      switch (Args[0].ToLower())
      {
        case "delay":
          int result = 5000;
          if (Args.Length > 1)
            int.TryParse(Args[1], out result);
          Thread.Sleep(result);
          break;
        case "restart":
          Process.Start(Environment.CurrentDirectory + "\\OrbitReborn.exe", "\"delay 1500\"");
          Program.Stop();
          break;
        case "crash":
          Environment.FailFast(string.Empty);
          break;
        case "stop":
          Timer timer = new Timer(new TimerCallback(Input.StopDelay), (object) null, TimeSpan.FromSeconds(1.0), TimeSpan.FromSeconds(1.0));
          break;
        case "cls":
          Output.ClearStream();
          break;
        default:
          Output.WriteLine((object) Localization.GetValue("core.input.error", Args[0].ToLower()), OutputLevel.Warning);
          break;
      }
    }
  }
}
