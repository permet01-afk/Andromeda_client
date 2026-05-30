using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class SelectAction
    {
        public static void Initialize()
        {
            DataRouter.RegisterHandler("S", new ProcessRequestCallback(SelectAction.Select), false);
        }

        public static void SendConfigurationRefresh(Session Session, bool includeUserData = false, bool broadcastSelectedTarget = true)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            bool restartAutoRocket = Session.CharacterInfo.ActiveAutoRocket;
            Session.CharacterInfo.ActiveAutoRocket = false;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                Session.CharacterInfo.RefreshEquippedExtras(client);
            }

            if (includeUserData)
                Session.SendData(UserDataComposer.Compose(Session));

            Session.SendData(PacketComposer.Compose("S", "CFG|" + Session.CharacterInfo.ActiveConfig));
            Session.SendData(PacketComposer.Compose("A", "v|" + Session.CharacterInfo.ShipSpeed));
            Session.SendData(PacketComposer.Compose("A", "HPT|" + Session.CharacterInfo.ShipHp + "|" + Session.CharacterInfo.ShipMaxHp));
            Session.SendData(PacketComposer.Compose("A", "SHD|" + Session.CharacterInfo.ShipShield + "|" + Session.CharacterInfo.ShipMaxShield));
            Session.SendData(PacketComposer.Compose("A", "c|" + Session.CharacterInfo.ShipMaxCargo));
            Session.SendData(PacketComposer.Compose("A", Session.CharacterInfo.GetCpuItemsPayload(Fight.ShouldAdvertiseRocketLauncherCpu(Session))));

            if (Session.CharacterInfo.HasAutoRocketCpu)
            {
                int state = (Session.CharacterInfo.AutoRocketSkill == 1) ? 1 : 0;
                Session.SendData(PacketComposer.Compose("A", "CPU|R|" + state));
            }
            else
            {
                Session.SendData(PacketComposer.Compose("A", "CPU|R|0"));
            }

            Session.SendData(PacketComposer.Compose("A", "CPU|C|100"));
            Fight.SendShipSkillStatus(Session);
            Fight.SendRocketLauncherProtocolState(Session, true);

            if (broadcastSelectedTarget)
            {
                MapInstance map = MapManager.GetInstanceByMapId(Session.CharacterInfo.MapId);
                if (map != null)
                    map.BroadcastToSelectedTarget(Session.CharacterId, FightSelectPlayerComposer.Compose(Session.CharacterInfo));
            }

            if (restartAutoRocket
                && Session.CharacterInfo.AutoRocketSkill == 1
                && Session.CharacterInfo.HasAutoRocketCpu)
            {
                Fight.TryStartAutoRocket(Session);
            }
        }

        private static void ChangeCfg(Session Session, ClientMessage Message)
        {
            int result;
            if (!int.TryParse(Message.GetNextString(2), out result))
                return;

            if (new CList<int>() { 1, 2 }.Contains(result) && Session.CharacterInfo.CanChangeConfig)
            {
                Session.CharacterInfo.ActiveConfig = result;
                Session.CharacterInfo.LastConfigChange = UnixTimestamp.GetCurrent();

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    Session.CharacterInfo.SynchronizeStatistics(client, Session.Stopped ? 0 : 1);
                }

                SelectAction.SendConfigurationRefresh(Session);

                int limitX = (Session.CharacterInfo.MapId == 16) ? 42500 : 22000;
                int limitY = (Session.CharacterInfo.MapId == 16) ? 28500 : 14000;

                if (Session.CharacterInfo.IsMoving && (Session.CharacterInfo.NewLocX != Session.CharacterInfo.LocX || Session.CharacterInfo.NewLocY != Session.CharacterInfo.LocY))
                {
                    double num = Math.Sqrt(Math.Pow((double)(Session.CharacterInfo.LocX - Session.CharacterInfo.NewLocX), 2.0) + Math.Pow((double)(Session.CharacterInfo.LocY - Session.CharacterInfo.NewLocY), 2.0));
                    if (num >= 50.0 && (Session.CharacterInfo.NewLocX <= limitX && Session.CharacterInfo.NewLocX >= -1000 && Session.CharacterInfo.NewLocY <= limitY && Session.CharacterInfo.NewLocY >= -1000))
                    {
                        double TimeTaken = num * 1000.0 / (double)Session.CharacterInfo.ShipSpeed;
                        foreach (int key in (IEnumerable<int>)Session.CharacterInfo.PlayerInRange.Keys)
                        {
                            Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key);
                            if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null)
                                sessionByCharacterId.SendData(MapShipMovementComposer.Compose(Session.CharacterId, Session.CharacterInfo.NewLocX, Session.CharacterInfo.NewLocY, TimeTaken));
                        }
                    }
                }
            }
            else
            {
                Session.SendData(PacketComposer.Compose("A", "STD|You must wait 4 seconds between each config change."));
            }
        }

        // ============================================================
        // ✅ ROB helpers: clean stop + update for "selected-by" players
        // ============================================================
        public static void StopRepair(Session session, string stdMessage = null)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            session.CharacterInfo.IsRepairing = false;

            if (session.CharacterInfo.RepairTimer != null)
            {
                session.CharacterInfo.RepairTimer.Dispose();
                session.CharacterInfo.RepairTimer = null;
            }

            // ✅ Flash expects RS can be "disabled"
            session.SendData(PacketComposer.Compose("A", "RS|-1"));

            // ✅ Resync self HUD
            session.SendData(PacketComposer.Compose("A", "HPT|" + session.CharacterInfo.ShipHp + "|" + session.CharacterInfo.ShipMaxHp));
            session.SendData(PacketComposer.Compose("A", "SHD|" + session.CharacterInfo.ShipShield + "|" + session.CharacterInfo.ShipMaxShield));

            // ✅ Resync zones (peace/trade/rad/portal)
            ShipMovement.SendPeacePortalInfos(session);

            // ✅ Update target window (Y) for everyone who has this player selected
            MapInstance inst = MapManager.GetInstanceByMapId(session.CharacterInfo.MapId);
            if (inst != null)
            {
                var y = PacketComposer.Compose("Y",
                    "0|" + session.CharacterId + "|L|" +
                    session.CharacterInfo.ShipHp + "|" +
                    session.CharacterInfo.ShipShield + "|0");

                inst.BroadcastToSelectedTarget(session.CharacterId, y);
            }

            if (!string.IsNullOrEmpty(stdMessage))
                session.SendData(PacketComposer.Compose("A", "STD|" + stdMessage));
        }

        private static void UseRob(Session Session)
        {
            // 1) Immediate sync (prevents Flash visual desync)
            Session.SendData(PacketComposer.Compose("A", "HPT|" + Session.CharacterInfo.ShipHp + "|" + Session.CharacterInfo.ShipMaxHp));
            Session.SendData(PacketComposer.Compose("A", "SHD|" + Session.CharacterInfo.ShipShield + "|" + Session.CharacterInfo.ShipMaxShield));

            // 2) Toggle: if already repairing -> stop
            if (Session.CharacterInfo.IsRepairing)
            {
                StopRepair(Session, "Repair canceled (manual).");
                return;
            }

            // 3) Block: moving
            if (Session.CharacterInfo.IsMoving)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|Cannot do that while moving!"));
                return;
            }

            // 4) Block: combat / radiation / etc
            if (Session.CharacterInfo.Attacked.Count > 0 ||
                Session.CharacterInfo.Attacking ||
                Session.CharacterInfo.WarningZone ||
                Session.CharacterInfo.NoFightTimer < 3)
            {
                string reason = "Recent combat (" + Session.CharacterInfo.NoFightTimer + "s)";
                if (Session.CharacterInfo.Attacked.Count > 0) reason = "You are taking damage";
                else if (Session.CharacterInfo.Attacking) reason = "You are attacking";
                else if (Session.CharacterInfo.WarningZone) reason = "Radiation zone";

                Session.SendData(PacketComposer.Compose("A", "STD|Cannot: " + reason));
                return;
            }

            // 5) HP already full
            if (Session.CharacterInfo.ShipHp >= Session.CharacterInfo.ShipMaxHp)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|Hitpoints are already at maximum."));
                return;
            }

            // 6) Start repair
            if (Session.CharacterInfo.RepairTimer != null)
            {
                Session.CharacterInfo.RepairTimer.Dispose();
                Session.CharacterInfo.RepairTimer = null;
            }

            Session.CharacterInfo.IsRepairing = true;

            // ✅ Repair bot display (big/small)
            if (Session.CharacterInfo.RepairBotHp >= 30000)
                Session.SendData(PacketComposer.Compose("A", "RS|1"));
            else
                Session.SendData(PacketComposer.Compose("A", "RS|0"));

            // ✅ Send correct D state (peace/trade/rad/portal) from server truth
            ShipMovement.SendPeacePortalInfos(Session);

            Session.SendData(PacketComposer.Compose("A", "STD|Repair started."));

            // ✅ DarkOrbit 2010: NO instant tick (prevents spam exploit)
            Session.CharacterInfo.RepairTimer = new Timer(new TimerCallback(SelectAction.RepairTimer), (object)Session, 1000, 1000);
        }

        private static bool ShouldReceiveActionVisualEffect(Session observer, Session source)
        {
            if (observer == null || observer.CharacterInfo == null || source == null || source.CharacterInfo == null)
                return false;

            if (observer.CurrentMapId != source.CurrentMapId)
                return false;

            if (observer.CharacterId == source.CharacterId)
                return true;

            // Preserve existing broad visibility in special combat maps/admin views while avoiding whole-map spam elsewhere.
            if (observer.CharacterInfo.IsAdmin || observer.CharacterInfo.MapId == 83 || _1v1.IsOnMap(observer.CharacterInfo.MapId))
                return true;

            if (observer.CharacterInfo.PlayerInRange != null && observer.CharacterInfo.PlayerInRange.Contains(source.CharacterId))
                return true;

            if (source.CharacterInfo.PlayerInRange != null && source.CharacterInfo.PlayerInRange.Contains(observer.CharacterId))
                return true;

            return false;
        }

        public static void SendPlayerVisualEffectPacketScoped(MapInstance instance, Session source, ServerMessage message, params Session[] forcedObservers)
        {
            if (instance == null || source == null || source.CharacterInfo == null || message == null)
                return;

            byte[] data = message.ToDeltas();
            HashSet<int> sentSessionIds = new HashSet<int>();

            if (source.Id > 0 && sentSessionIds.Add(source.Id))
                source.SendData(data);

            if (forcedObservers != null)
            {
                foreach (Session forced in forcedObservers)
                {
                    if (forced == null || forced.CharacterInfo == null || forced.Id <= 0)
                        continue;

                    if (forced.CurrentMapId != source.CurrentMapId)
                        continue;

                    if (sentSessionIds.Add(forced.Id))
                        forced.SendData(data);
                }
            }

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter || actor.ReferenceSessionId <= 0)
                    continue;

                if (!sentSessionIds.Add(actor.ReferenceSessionId))
                    continue;

                Session observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (ShouldReceiveActionVisualEffect(observer, source))
                    observer.SendData(data);
            }
        }

        private static void SendActionVisualEffectScoped(MapInstance instance, Session source, string effectCode)
        {
            if (instance == null || source == null || source.CharacterInfo == null || string.IsNullOrEmpty(effectCode))
                return;

            SendPlayerVisualEffectPacketScoped(instance, source, PacketComposer.Compose("n", effectCode + "|" + (object)source.CharacterId));
        }

        private static void UseIsh(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            if (Session.CharacterInfo.CoolDownISH > 0 || Session.CharacterInfo.ActiveISH)
                return;

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            // ✅ Consomme 1 ISH-01 (insta shield)
            if (!Session.CharacterInfo.TryConsumeExplosiveAmmo("ISH"))
            {
                Session.SendData(PacketComposer.Compose("A", "STD|You don't have any ISH-01."));
                // Resync client quantities
                Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                return;
            }

            // Update quantities on the client side
            Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));

            SendActionVisualEffectScoped(instanceByMapId, Session, "ISH");
            Session.CharacterInfo.LastISH = UnixTimestamp.GetCurrent();
            Session.SendData(PacketComposer.Compose("A", "CLD|ISH|" + (object)Session.CharacterInfo.CoolDownISH));
        }

        private static void UseSmb(Session Session)
        {
            if (!PvpManager.PvpEnabled || (Session == null || Session.CharacterInfo == null || Session.CharacterInfo.CoolDownSMB > 0) || Session.CharacterInfo.MapId == 81 && Invasion.Active && Invasion.SafeBattle)
                return;
            if (Session.CharacterInfo.MapId == 83 && TeamDeathMatch.SafeBattle())
                return;
            if (_1v1.IsOnMap(Session.CharacterInfo.MapId) && _1v1.isSafeBattle(Session.CharacterInfo.MapId) == true)
                return;

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            // ✅ Consomme 1 SMB-01 (smartbomb)
            if (!Session.CharacterInfo.TryConsumeExplosiveAmmo("SMB"))
            {
                Session.SendData(PacketComposer.Compose("A", "STD|You don't have any SMB-01."));
                Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                return;
            }

            // Update quantities on the client side
            Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));

            SendActionVisualEffectScoped(instanceByMapId, Session, "SMB");
            Session.CharacterInfo.LastSMB = UnixTimestamp.GetCurrent();
            Session.SendData(PacketComposer.Compose("A", "CLD|SMB|" + (object)Session.CharacterInfo.CoolDownSMB));
            Session.CharacterInfo.PeaceZone = false;

            foreach (MapActor key in (IEnumerable<MapActor>)instanceByMapId.Actors.Keys)
            {
                if (key.Type == MapActorType.UserCharacter && key.ReferenceId != Session.CharacterId)
                {
                    Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key.ReferenceId);
                    if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null
                        && (!sessionByCharacterId.CharacterInfo.ActiveISH && !sessionByCharacterId.CharacterInfo.PeaceZone
                            && Math.Sqrt(Math.Pow((double)(sessionByCharacterId.CharacterInfo.LocX - Session.CharacterInfo.LocX), 2.0)
                            + Math.Pow((double)(sessionByCharacterId.CharacterInfo.LocY - Session.CharacterInfo.LocY), 2.0)) < 600.0))
                    {
                        int smbDamages = Session.CharacterInfo.SmbDamages;

                        if (sessionByCharacterId.CharacterInfo.ShipHp - smbDamages > 0)
                        {
                            sessionByCharacterId.CharacterInfo.ShipHp -= smbDamages;

                            var msg = PacketComposer.Compose(
                                "Y",
                                "0|" + (object)sessionByCharacterId.CharacterId + "|L|"
                                + (object)sessionByCharacterId.CharacterInfo.ShipHp + "|"
                                + (object)sessionByCharacterId.CharacterInfo.ShipShield + "|"
                                + (object)smbDamages
                            );

                            // Attacker + victim (as before)
                            Session.SendData(msg);
                            sessionByCharacterId.SendData(msg);

                            // Everyone who has the victim selected (no duplicates)
                            foreach (MapActor a in (IEnumerable<MapActor>)instanceByMapId.Actors.Keys)
                            {
                                if (a.Type != MapActorType.UserCharacter)
                                    continue;

                                Session s = SessionManager.GetSessionById(a.ReferenceSessionId);
                                if (s != null && s.CharacterInfo != null
                                    && s.CharacterInfo.SelectedPlayer == sessionByCharacterId.CharacterId
                                    && s.CharacterId != Session.CharacterId
                                    && s.CharacterId != sessionByCharacterId.CharacterId)
                                {
                                    s.SendData(msg);
                                }
                            }
                        }
                    }
                }
            }
        }

        private static void UseEmp(Session Session)
        {
            if (UnixTimestamp.GetCurrent() - Session.CharacterInfo.LastEMP < 29.0)
                return;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            // ✅ Consomme 1 EMP-01
            if (!Session.CharacterInfo.TryConsumeExplosiveAmmo("EMP"))
            {
                Session.SendData(PacketComposer.Compose("A", "STD|You don't have any EMP-01."));
                Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                return;
            }

            // Update quantities on the client side
            Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));

            SendActionVisualEffectScoped(instanceByMapId, Session, "EMP");
            Session.CharacterInfo.LastEMP = UnixTimestamp.GetCurrent();
            Session.SendData(PacketComposer.Compose("A", "CLD|EMP|30"));
            foreach (MapActor key in (IEnumerable<MapActor>)instanceByMapId.Actors.Keys)
            {
                if (key.Type == MapActorType.UserCharacter && key.ReferenceId != Session.CharacterId)
                {
                    Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key.ReferenceId);
                    if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null)
                    {
                        if (sessionByCharacterId.CharacterInfo.SelectedPlayer == Session.CharacterInfo.Id)
                        {
                            sessionByCharacterId.SendData(PacketComposer.Compose("A", "STM|msg_own_targeting_harmed"));
                            Fight.StopLaser(sessionByCharacterId, Session);
                        }
                        if (sessionByCharacterId.CharacterInfo.Invisible == 1 && DistanceUtil.IsWithinRangeSquared(sessionByCharacterId.CharacterInfo.LocX, sessionByCharacterId.CharacterInfo.LocY, Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, 600))
                        {
                            sessionByCharacterId.CharacterInfo.Invisible = 0;
                            SendPlayerVisualEffectPacketScoped(
                                instanceByMapId,
                                sessionByCharacterId,
                                PacketComposer.Compose("n", "INV|" + (object)sessionByCharacterId.CharacterInfo.Id + "|" + (object)0),
                                Session
                            );
                        }
                    }
                }
            }

            // EMP/IEM : les joueurs perdaient déjà le lock, mais les NPC non.
            // Anti micro-freeze serveur : ne scanne que les NPC de la map/instance actuelle.
            foreach (MapActor npcActor in instanceByMapId.GetNpcActorSnapshot())
            {
                Npc npc = npcActor != null ? npcActor.ReferenceObject as Npc : null;
                if (npc != null
                    && !npc.IsDestroying
                    && npc.MapId == Session.CurrentMapId
                    && npc.TargetId == Session.CharacterInfo.Id)
                {
                    npc.BreakNpcLockByEmp(Session.CharacterInfo.Id);
                }
            }

            Fight.InterruptVenomOnTarget(Session, instanceByMapId);
        }

        private static void UseCloak(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            // Blocks if the player is currently attacking
            if (Session.CharacterInfo.Attacking)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|Cannot activate cloak while attacking."));
                return;
            }

            const int CLOAK_COST_URIDIUM = 500;
            const int CLOAK_COOLDOWN_SECONDS = 240; // 4 minutes

            int now = (int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds;

            // Cooldown
            if (Session.CharacterInfo.InvisibleCooldown > now)
            {
                int remaining = Session.CharacterInfo.InvisibleCooldown - now;
                int min = remaining / 60;
                int sec = remaining % 60;

                Session.SendData(PacketComposer.Compose("A", "STD|Cloak cooldown: " + min + "m " + sec + "s."));
                return;
            }

            // Already cloaked
            if (Session.CharacterInfo.Invisible == 1)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|Cloak already active."));
                return;
            }

            // Sync Uridium from DB and check (avoids desync if bought on website)
            long uridium = Session.CharacterInfo.GetUpdatedUridium();
            if (uridium < CLOAK_COST_URIDIUM)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|Not enough Uridium (" + CLOAK_COST_URIDIUM + " required)."));
                return;
            }

            // Immediate debit server-side (DB + memory)
            Session.CharacterInfo.RemoveReward(0, CLOAK_COST_URIDIUM);

            // Refresh client HUD (uridium)
            Session.SendData(UserDataComposer.Compose(Session));

            // Activate cloak + start cooldown
            Session.CharacterInfo.Invisible = 1;
            Session.CharacterInfo.InvisibleCooldown = now + CLOAK_COOLDOWN_SECONDS;

            // Scoped invisibility visual: Flash only updates ships that are visible to the client.
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CharacterInfo.MapId);
            if (instanceByMapId != null)
            {
                SendPlayerVisualEffectPacketScoped(
                    instanceByMapId,
                    Session,
                    PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)1)
                );
            }

            // Optional confirmation message
            Session.SendData(PacketComposer.Compose("A", "STD|Cloak activated (-" + CLOAK_COST_URIDIUM + " Uridium)."));
        }

        private static void Select(Session Session, ClientMessage Message)
        {
            string nextString = Message.GetNextString(1);
            switch (nextString)
            {
                case "CFG":
                    SelectAction.ChangeCfg(Session, Message);
                    break;
                case "ROB":
                    SelectAction.UseRob(Session);
                    break;
                case "ISH":
                    SelectAction.UseIsh(Session);
                    break;
                case "SMB":
                    SelectAction.UseSmb(Session);
                    break;
                case "EMP":
                    SelectAction.UseEmp(Session);
                    break;
                case "CLK":
                    SelectAction.UseCloak(Session);
                    break;
                case "ARL":
                    SelectAction.ToggleAutoRocketCpu(Session, Message);
                    break;
                case "RLC":
                    SelectAction.ToggleRocketLauncherAutoCpu(Session, Message);
                    break;
                default:
                    return;
            }
        }

        private static void ToggleAutoRocketCpu(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            // Flash : S|ARL|0/1
            int state;
            if (!int.TryParse(Message.GetNextString(2), out state))
                return;

            state = (state == 1) ? 1 : 0;

            // Safety: if the CPU isn't equipped on the active config, ignore it (client shouldn't send it)
            if (!Session.CharacterInfo.HasAutoRocketCpu)
                return;

            Session.CharacterInfo.AutoRocketSkill = state;

            // Persist en base (users.auto_rkt_skill)
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)Session.CharacterId);
                    client.SetParameter("state", (object)state);
                    client.ExecuteNonQuery("UPDATE users SET auto_rkt_skill = @state WHERE id = @id LIMIT 1");
                }
            }
            catch (Exception ex)
            {
                Output.WriteLine("auto_rkt_skill DB update failed: " + ex.Message);
            }

            // Response expected by the Flash client: A|CPU|R|0/1
            Session.SendData(PacketComposer.Compose("A", "CPU|R|" + state));

            // Expected message (client-side feedback)
            Session.SendData(PacketComposer.Compose("A", "STD|autorocket " + (state == 1 ? "on" : "off")));

            if (state == 0)
            {
                // Stop le loop si jamais il tournait
                Session.CharacterInfo.ActiveAutoRocket = false;
            }
            else
            {
                // If already attacking, start auto-rocket immediately
                Fight.TryStartAutoRocket(Session);
            }
        }


        private static void ToggleRocketLauncherAutoCpu(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            int state;
            if (!int.TryParse(Message.GetNextString(2), out state))
                return;

            if (!Session.CharacterInfo.HasRocketLauncherCpu)
                return;

            Fight.SetRocketLauncherAutoCpuState(Session, state == 1);
        }

        private static bool isbetween(int point_x, int point_y, int box_x, int box_y, int box_w, int box_h)
        {
            return point_x >= box_x && point_x < box_x + box_w && point_y >= box_y && point_y < box_y + box_h;
        }

        private static void RepairTimer(object state)
        {
            Session session = (Session)state;
            if (session == null || session.CharacterInfo == null)
                return;

            int repairPerTick = session.CharacterInfo.RepairBotHp;

            // --- STOP CONDITIONS ---
            if (session.CharacterInfo.Disconnected)
            {
                StopRepair(session);
                return;
            }

            if (!session.CharacterInfo.IsRepairing)
            {
                StopRepair(session);
                return;
            }

            if (session.CharacterInfo.IsMoving)
            {
                StopRepair(session, "Stopped: moving");
                return;
            }

            if (session.CharacterInfo.Attacked.Count > 0)
            {
                StopRepair(session, "Stopped: taking damage");
                return;
            }

            if (session.CharacterInfo.Attacking)
            {
                StopRepair(session, "Stopped: attacking");
                return;
            }

            if (session.CharacterInfo.WarningZone)
            {
                StopRepair(session, "Stopped: radiation zone");
                return;
            }

            if (session.CharacterInfo.NoFightTimer < 3)
            {
                StopRepair(session, "Stopped: recent combat");
                return;
            }

            // --- END IF HP FULL ---
            if (session.CharacterInfo.ShipHp >= session.CharacterInfo.ShipMaxHp)
            {
                StopRepair(session, "Repair complete.");
                return;
            }

            // --- APPLY HEAL ---
            int oldHp = session.CharacterInfo.ShipHp;
            int delta = repairPerTick;

            if (oldHp + delta > session.CharacterInfo.ShipMaxHp)
                delta = session.CharacterInfo.ShipMaxHp - oldHp;

            if (delta < 0) delta = 0;

            session.CharacterInfo.ShipHp = oldHp + delta;

            // ✅ Self HUD
            session.SendData(PacketComposer.Compose("A", "HPT|" + session.CharacterInfo.ShipHp + "|" + session.CharacterInfo.ShipMaxHp));
            session.SendData(PacketComposer.Compose("A", "SHD|" + session.CharacterInfo.ShipShield + "|" + session.CharacterInfo.ShipMaxShield));

            // ✅ (Optional) heal feedback
            session.SendData(PacketComposer.Compose("A",
                "HL|1|" + session.CharacterInfo.Id + "|HPT|" + session.CharacterInfo.ShipHp + "|" + delta));

            // ✅ Update target window for ALL selectors using Y
            MapInstance inst = MapManager.GetInstanceByMapId(session.CharacterInfo.MapId);
            if (inst != null)
            {
                var y = PacketComposer.Compose("Y",
                    "0|" + session.CharacterId + "|L|" +
                    session.CharacterInfo.ShipHp + "|" +
                    session.CharacterInfo.ShipShield + "|0");

                inst.BroadcastToSelectedTarget(session.CharacterId, y);
            }
        }
    }
}
