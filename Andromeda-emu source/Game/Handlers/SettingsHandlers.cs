// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Handlers.SettingsHandlers
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using System;
using System.Text.RegularExpressions;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class SettingsHandlers
    {
        public static void Initialize()
        {
            DataRouter.RegisterHandler("7", new ProcessRequestCallback(SettingsHandlers.SetClientSettings), false);
            DataRouter.RegisterHandler("A", new ProcessRequestCallback(SettingsHandlers.SetAttribute), false);
        }

        private static void SyncSelectedWeaponsFromFlashSettings(Session Session, string FlashSet)
        {
            if (Session == null || Session.CharacterInfo == null || string.IsNullOrWhiteSpace(FlashSet))
                return;

            string[] strArray = FlashSet.Split('|');
            int selectedAmmo;
            if (strArray.Length > 15 && int.TryParse(strArray[15], out selectedAmmo) && selectedAmmo > 0)
            {
                Session.CharacterInfo.SelectedAmmo = selectedAmmo;
            }

            int selectedRocket;
            if (strArray.Length > 16 && int.TryParse(strArray[16], out selectedRocket)
                && (selectedRocket == 1 || selectedRocket == 2 || selectedRocket == 3 || selectedRocket == 10))
            {
                Session.CharacterInfo.SelectedRocket = selectedRocket;
                if (selectedRocket != 10)
                {
                    Session.CharacterInfo.SelectedRocketAuto = selectedRocket;
                }
                else if (Session.CharacterInfo.SelectedRocketAuto <= 0)
                {
                    Session.CharacterInfo.SelectedRocketAuto = 1;
                }

                Session.CharacterInfo.LastRocketShotType = selectedRocket;
            }
        }

        private static void SendDroneVisibilityPacket(Session session, CharacterInfo target)
        {
            if (session == null || session.CharacterInfo == null || target == null)
                return;

            if (session.CharacterInfo.Settings != null && session.CharacterInfo.Settings.ShowDrones == 1)
            {
                session.SendData(PacketComposer.Compose("n", "d|" + (object)target.Id + "|" + target.GetDronePacketString()));
            }
            else
            {
                int flax;
                int iris;
                target.GetDroneDisplayCounts(out flax, out iris);
                session.SendData(PacketComposer.Compose("n", "e|" + (object)target.Id + "|" + (object)flax + "/" + (object)iris));
            }
        }

        private static void RefreshDroneVisibility(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            Settings settings = session.CharacterInfo.Settings;
            if (settings == null)
                return;

            if (session.CurrentMapId <= 0)
            {
                SettingsHandlers.SendDroneVisibilityPacket(session, session.CharacterInfo);
                return;
            }

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(session.CurrentMapId);
            if (instanceByMapId == null)
            {
                SettingsHandlers.SendDroneVisibilityPacket(session, session.CharacterInfo);
                return;
            }

            SettingsHandlers.SendDroneVisibilityPacket(session, session.CharacterInfo);

            foreach (MapActor actor in (System.Collections.Generic.IEnumerable<MapActor>)instanceByMapId.Actors.Keys)
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter)
                    continue;

                CharacterInfo target = actor.ReferenceObject as CharacterInfo;
                if (target == null || target.Id == session.CharacterId)
                    continue;

                SettingsHandlers.SendDroneVisibilityPacket(session, target);
            }
        }

        private static void SetClientSettings(Session Session, ClientMessage Message)
        {
            string packet = Message.Packet;
            if (!(packet != ""))
                return;
            foreach (string str in Regex.Split(packet, "7\\|"))
            {
                if (str != "")
                {
                    string[] strArray = str.Split(new char[1] { '|' }, 1)[0].Split(new char[2]
                    {
            ',',
            '|'
                    }, 2);
                    if (strArray.Length > 1)
                    {
                        string rowName = strArray[0];
                        string value = strArray[1];
                        using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                            Session.CharacterInfo.UpdateSettings(client, rowName, value);

                        if (string.Equals(rowName, "SHOW_DRONES", StringComparison.OrdinalIgnoreCase))
                            SettingsHandlers.RefreshDroneVisibility(Session);
                    }
                }
            }
        }

        private static void SetAttribute(Session Session, ClientMessage Message)
        {
            if (!(Message.GetNextString(1) == "SET"))
                return;
            string[] strArray = Message.Packet.Split(new char[1]
            {
        '|'
            }, 3);
            if (strArray.Length < 3)
                return;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                Session.CharacterInfo.UpdateSettings(client, "flash_set", strArray[2]);
                SettingsHandlers.TryPersistAudioFlagsFromFlashSet(Session, client, strArray[2]);
            }
            SettingsHandlers.SyncSelectedWeaponsFromFlashSettings(Session, strArray[2]);
        }

        private static void TryPersistAudioFlagsFromFlashSet(Session Session, SqlDatabaseClient Client, string FlashSet)
        {
            if (Session == null || Session.CharacterInfo == null || Client == null || string.IsNullOrWhiteSpace(FlashSet))
                return;
            string[] strArray = FlashSet.Split('|');
            if (strArray.Length <= 12)
                return;
            int playSfx;
            int playMusic;
            if (!int.TryParse(strArray[11], out playSfx) || !int.TryParse(strArray[12], out playMusic))
                return;
            Session.CharacterInfo.UpdateSettings(Client, "play_sfx", playSfx != 0 ? "1" : "0");
            Session.CharacterInfo.UpdateSettings(Client, "play_music", playMusic != 0 ? "1" : "0");
        }
    }
}





