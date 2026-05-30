

using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Config;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Chat;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Game.Moderation;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Network;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using ScreenShotDemo;
using System;
using System.Diagnostics;
using System.Drawing.Imaging;
using System.Net;
using System.Security.Permissions;
using System.Text;
using System.Threading;

namespace OrbitReborn_Emulator
{
    public static class Program
    {
        private static bool mAlive;
        private static System.Threading.Timer mServerMonitor;
        private static DateTime InitStart;
        private static SocketListener mServer;

        public static bool Alive
        {
            get
            {
                return !Environment.HasShutdownStarted && Program.mAlive;
            }
        }

        [SecurityPermission(SecurityAction.Demand, Flags = SecurityPermissionFlag.ControlAppDomain)]
        public static void Main(string[] args)
        {
            AppDomain.CurrentDomain.UnhandledException += new UnhandledExceptionEventHandler(Program.CurrentDomain_UnhandledException);
            Console.OutputEncoding = Encoding.UTF8;
            Program.mAlive = true;

            GC.KeepAlive((object)Program.mServerMonitor);
            Program.InitStart = DateTime.Now;

            Output.InitializeStream(true, OutputLevel.DebugInformation);
            Output.WriteLine((object)"Initializing Andromeda's Emulator...");

            ConfigManager.Initialize(Constants.DataFileDirectory + "\\server-main.cfg");
            Output.SetVerbosityLevel((OutputLevel)ConfigManager.GetValue("output.verbositylevel"));

            Localization.Initialize(Constants.LangFileDirectory + "\\lang_" + ConfigManager.GetValue("lang") + ".lang");

            foreach (string str in args)
            {
                Output.WriteLine((object)Localization.GetValue("core.init.cmdarg", str));
                Input.ProcessInput(str.Split(' '));
            }

            try
            {
                Output.WriteLine((object)Localization.GetValue("core.init.mysql", (string[])null));
                SqlDatabaseManager.Initialize();

                Output.WriteLine((object)Localization.GetValue("core.init.net", ConfigManager.GetValue("net.bind.port").ToString()));
                Program.mServer = new SocketListener(
                    new IPEndPoint(IPAddress.Any, (int)ConfigManager.GetValue("net.bind.port")),
                    (int)ConfigManager.GetValue("net.backlog"),
                    new OnNewConnectionCallback(SessionManager.HandleIncomingConnection)
                );



                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    Output.WriteLine((object)Localization.GetValue("core.init.dbcleanup", (string[])null));
                    Program.PerformDatabaseCleanup(client);

                    Output.WriteLine((object)Localization.GetValue("core.init.game", (string[])null));
                    DataRouter.Initialize();
                    Handshake.Initialize();
                    SettingsHandlers.Initialize();
                    ShipMovement.Initialize();
                    Fight.Initialize();
                    SessionManager.Initialize();
                    CharacterInfoLoader.Initialize();
                    SelectAction.Initialize();
                    OrbitReborn_Emulator.Game.Handlers.Chat.Initialize();
                    Others.Initialize();
                    Laboratory.Initialize();
                    NpcManager.Initialize();
                    Spaceball.Initialize();
                    Survivor.Initialize();
                    PvPFarming.Initialize();
                    Invasion.Initialize();
                    Groupsystem.Initialize();
                    MapManager.Initialize(client);
                    MapInfoLoader.Initialize();
                    ChatManager.Initialize();
                    PortalManager.Initialize();
                    NpcAI.LaunchAI();
                    ModerationBanManager.Initialize(client);
                    CrossdomainPolicy.Initialize("Data\\crossdomain.xml");
                    StatisticsSyncUtil.Initialize();
                    _1v1.initialize();
                }
            }
            catch (Exception ex)
            {
                Program.HandleFatalError(Localization.GetValue("core.init.error.details", new string[2]
                {
                    ex.Message,
                    ex.StackTrace
                }));
                return;
            }

            Output.WriteLine(
                (object)Localization.GetValue("core.init.ok", Math.Round((DateTime.Now - Program.InitStart).TotalSeconds, 2).ToString()),
                OutputLevel.Notification
            );

            Output.WriteLine((object)Localization.GetValue("core.init.ok.cmdinfo", (string[])null), OutputLevel.Notification);

            Program.mServerMonitor = new System.Threading.Timer(
                new TimerCallback(Program.ServerMonitor),
                (object)null,
                TimeSpan.FromSeconds(5.0),
                TimeSpan.FromSeconds(5.0)
            );

            Input.Listen();
        }

        private static void PerformDatabaseCleanup(SqlDatabaseClient MySqlClient)
        {
            MySqlClient.ExecuteNonQuery("UPDATE users SET online = 0");
        }

        private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Output.WriteLine((object)(e.ExceptionObject as Exception).ToString());
            ScreenCapture screenCapture = new ScreenCapture();
            screenCapture.CaptureScreen();

            IntPtr mainWindowHandle = Process.GetCurrentProcess().MainWindowHandle;
            string str = DateTime.Now.ToString("dd-MM-yy [HH\\hmm]");
            screenCapture.CaptureWindowToFile(mainWindowHandle, "C:\\" + str + "_error.gif", ImageFormat.Gif);
        }

        public static void HandleFatalError(string Message)
        {
            Output.WriteLine((object)Message, OutputLevel.CriticalError);
            Output.WriteLine((object)Localization.GetValue("core.init.error.pressanykey", (string[])null), OutputLevel.CriticalError);
            Console.ReadKey(true);
            Program.Stop();
        }

        public static void ServerMonitor(object state)
        {
            Console.Title = "Andromeda | uptime : " +
                string.Format("{0:%d}d {0:%h}h {0:%m}m {0:%s}s", (object)(DateTime.Now - Program.InitStart)) +
                " | Sessions : " + (object)SessionManager.ActiveConnections +
                " | Players : " + (object)SessionManager.ConnectedUserData.Count +
                " | Running timer : " + (object)TimerManager.TimerRunning +
                " | " + (object)Math.Round((double)GC.GetTotalMemory(false) / 1048576.0, 2) + " MB ";
        }

        public static void Stop()
        {
            Output.WriteLine((object)Localization.GetValue("core.uninit", (string[])null));
            Program.mAlive = false;
            SqlDatabaseManager.Uninitialize();
            Program.mServer.Dispose();
            Program.mServer = (SocketListener)null;
            Environment.Exit(0);
        }
    }
}
