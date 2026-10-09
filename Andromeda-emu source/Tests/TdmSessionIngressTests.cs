using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.Serialization;
using System.Text;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Sessions;

// Exercises the socket receive boundary, not just DataRouter. No SQL or server startup.
internal static class TdmSessionIngressTests
{
    const BindingFlags Fields = BindingFlags.Instance | BindingFlags.NonPublic;
    static void Set(object target, string field, object value)
    { target.GetType().GetField(field, Fields).SetValue(target, value); }
    static void Check(bool condition, string message)
    { if (!condition) throw new Exception(message); Console.WriteLine("PASS " + message); }
    static int Main()
    {
        var session = (Session)FormatterServices.GetUninitializedObject(typeof(Session));
        var character = (CharacterInfo)FormatterServices.GetUninitializedObject(typeof(CharacterInfo));
        Set(session, "mCharacterInfo", character);
        Set(session, "mAuthProcessed", true);
        Set(session, "mRxBuffer", new List<byte>());
        using (var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp))
        {
            Set(session, "mSocket", socket);
            int tdm = 0, gameplay = 0, ping = 0;
            DataRouter.Initialize();
            DataRouter.RegisterHandler("TDM", (s, m) => tdm++);
            DataRouter.RegisterHandler("a", (s, m) => gameplay++);
            DataRouter.RegisterHandler("PNG", (s, m) => ping++);
            Action<string> receive = text => {
                byte[] bytes = Encoding.UTF8.GetBytes(text);
                typeof(Session).GetMethod("ProcessData", Fields).Invoke(session, new object[] { bytes, 0, bytes.Length, socket });
            };
            character.Destroy = true; character.TdmDead = true;
            receive("a|535\0TDM|1|REPAIR|event|1|death\0PNG\0");
            Check(tdm == 1 && gameplay == 0 && ping == 1, "TDM death admits repair/ping after a blocked coalesced combat packet");
            receive("TDM|1|LE"); receive("AVE|event|2|\0");
            Check(tdm == 2, "fragmented TDM LEAVE crosses the receive boundary");
            character.TdmDead = false;
            receive("TDM|1|REPAIR|event|3|death\0PNG\0a|535\0");
            Check(tdm == 2 && ping == 1 && gameplay == 0, "normal ship destruction remains terminal");
            character.TdmDead = true; character.DeadCommitted = true;
            receive("TDM|1|REPAIR|event|4|death\0");
            Check(tdm == 2, "committed Phase5 death cannot use the TDM exception");
            character.DeadCommitted = false; Set(session, "mAuthProcessed", false);
            receive("TDM|1|REPAIR|event|5|death\0");
            Check(tdm == 2, "TDM still requires authentication");
            Set(session, "mAuthProcessed", true); character.Destroy = false; character.TdmDead = false;
            receive("a|535\0TDM|1|SYNC\0PNG\0");
            Check(tdm == 3 && gameplay == 1 && ping == 2, "live ship routing unchanged");
        }
        return 0;
    }
}
