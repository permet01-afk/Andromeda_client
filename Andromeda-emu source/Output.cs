// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Output
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Config;
using System;
using System.IO;
using System.Text;

namespace OrbitReborn_Emulator
{
    public static class Output
    {
        private static bool mEnableLogging;
        private static string mLogFilePath;
        private static OutputLevel mVerbosityLevel;
        private static object mWritebackSyncRoot;

        public static void InitializeStream(bool EnableLogging, OutputLevel VerbosityLevel)
        {
            Output.mEnableLogging = EnableLogging;
            Output.mVerbosityLevel = VerbosityLevel;
            Output.mWritebackSyncRoot = new object();
            if (EnableLogging)
            {
                DateTime now = DateTime.Now;
                string path = Constants.LogFileDirectory + "\\";
                Output.mLogFilePath = path + now.ToString("dd-MM-yy [HH\\hmm]") + ".log";
                try
                {
                    if (!Directory.Exists(path))
                        Directory.CreateDirectory(path);
                    File.WriteAllText(Output.mLogFilePath, Output.ComposeDefaultLogHeader(), Constants.DefaultEncoding);
                }
                catch (Exception)
                {
                    Output.mEnableLogging = false;
                }
            }
            Output.ClearStream();
            Output.WriteBanner();
        }

        public static void ClearStream()
        {
            Console.Clear();
            Console.Title = Constants.ConsoleTitle;
            Console.WindowWidth = Constants.ConsoleWindowWidth;
            Console.WindowHeight = Constants.ConsoleWindowHeight;
            Output.ResetColorScheme();
        }

        private static void ResetColorScheme()
        {
            Output.ApplyColorScheme(ConsoleColor.Gray, ConsoleColor.Black);
        }

        private static void ApplyColorScheme(ConsoleColor ForegroundColor)
        {
            Output.ApplyColorScheme(ForegroundColor, ConsoleColor.Black);
        }

        private static void ApplyColorScheme(ConsoleColor ForegroundColor, ConsoleColor BackgroundColor)
        {
            Console.ForegroundColor = ForegroundColor;
            Console.BackgroundColor = BackgroundColor;
        }

        private static void SetColorSchemeForSeverity(OutputLevel SeverityLevel)
        {
            switch (SeverityLevel)
            {
                case OutputLevel.DebugInformation:
                    Output.ApplyColorScheme(ConsoleColor.DarkGray);
                    break;
                case OutputLevel.Notification:
                    Output.ApplyColorScheme(ConsoleColor.Green);
                    break;
                case OutputLevel.Warning:
                    Output.ApplyColorScheme(ConsoleColor.Yellow);
                    break;
                case OutputLevel.CriticalError:
                    Output.ApplyColorScheme(ConsoleColor.Red);
                    break;
                default:
                    Output.ResetColorScheme();
                    break;
            }
        }

        public static void WriteBanner()
        {
            Output.ApplyColorScheme(ConsoleColor.Green);
            Console.WriteLine("Andromeda Reborn, Version 3.1.0 by Lefaucheur, credits mwK");
            Console.WriteLine();
            Output.ResetColorScheme();
        }

        private static string ComposeDefaultLogHeader()
        {
            StringBuilder stringBuilder = new StringBuilder("## OrbitReborn" + (object)Constants.LineBreakChar);
            stringBuilder.Append("## Server output log file" + (object)Constants.LineBreakChar);
            stringBuilder.Append("## " + DateTime.Now.ToLongDateString() + " " + DateTime.Now.ToLongTimeString() + (object)Constants.LineBreakChar);
            stringBuilder.Append(Constants.LineBreakChar);
            return stringBuilder.ToString();
        }

        private static void WriteLogIfNeeded(object Line)
        {
            if (!Output.mEnableLogging)
                return;
            lock (Output.mWritebackSyncRoot)
                File.AppendAllText(Output.mLogFilePath, Output.FormatTimestamp() + Line + (object)Constants.LineBreakChar, Constants.DefaultEncoding);
        }

        public static void WriteLine()
        {
            if (Output.mVerbosityLevel > OutputLevel.Notification)
                return;
            Console.WriteLine();
            Output.WriteLogIfNeeded((object)Constants.LineBreakChar.ToString());
        }

        public static void WriteLine(object Line)
        {
            Output.WriteLine(Line, OutputLevel.Informational);
        }

        public static void WriteLine(object Line, OutputLevel Level)
        {
            if (Output.mVerbosityLevel > Level)
                return;
            Console.Write(Output.FormatTimestamp());
            Output.SetColorSchemeForSeverity(Level);
            Console.WriteLine(Line);
            Output.ResetColorScheme();
            Output.WriteLogIfNeeded(Line);
        }

        private static string FormatTimestamp()
        {
            return DateTime.Now.ToString("[HH\\hmm\\sss\\mff]");
        }

        public static void SetVerbosityLevel(OutputLevel OutputLevel)
        {
            Output.mVerbosityLevel = OutputLevel;
        }
    }
}


