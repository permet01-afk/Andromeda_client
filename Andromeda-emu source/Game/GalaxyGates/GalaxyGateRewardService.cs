using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Quests;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Data;

namespace OrbitReborn_Emulator.Game.GalaxyGates
{
    public static class GalaxyGateRewardService
    {
        private struct GateReward
        {
            public int Uridium;
            public int Experience;
            public int Honor;
            public int Credits;
            public int Seprom;
            public int Ucb100;
            public int Rings; // Ring above the rank (1=Normal, etc.)
        }

        // =========================================================================
        // FINAL COMPLETION REWARD CONFIGURATION
        // =========================================================================
        private static readonly Dictionary<int, GateReward> Rewards = new Dictionary<int, GateReward>()
        {
            // ---------------------------------------------------------------------
            // ALPHA (x1) - Base
            // ---------------------------------------------------------------------
            { 1, new GateReward {
                Uridium = 20000,
                Experience = 4000000,
                Honor = 100000,
                Credits = 0,
                Seprom = 1000,
                Ucb100 = 30000,
                Rings = 1
            }},

            // ---------------------------------------------------------------------
            // BETA (x2) - Double Alpha
            // ---------------------------------------------------------------------
            { 2, new GateReward {
                Uridium = 40000,      // 20k * 2
                Experience = 8000000, // 4M * 2
                Honor = 200000,       // 100k * 2
                Credits = 0,
                Seprom = 2000,
                Ucb100 = 60000,
                Rings = 1
            }},

            // ---------------------------------------------------------------------
            // GAMMA (x3) - Triple Alpha
            // ---------------------------------------------------------------------
            { 3, new GateReward {
                Uridium = 60000,       // 20k * 3
                Experience = 12000000, // 4M * 3
                Honor = 300000,        // 100k * 3
                Credits = 0,
                Seprom = 3000,
                Ucb100 = 90000,
                Rings = 1
            }},

            // ---------------------------------------------------------------------
            // DELTA (Standard)
            // ---------------------------------------------------------------------
            { 4, new GateReward {
                Uridium = 45000,
                Experience = 9000000,
                Honor = 225000,
                Credits = 0,
                Seprom = 2500,
                Ucb100 = 75000,
                Rings = 1
            }},
        };

        /// <summary>
        /// Gives the completion reward + resets the DB state (on_map=0, clears parts, etc.).
        /// Call this right BEFORE returning to X-1 (so in Others.ChangeMap or WaveService).
        /// </summary>
        public static void GiveCompletionReward(Session session, int gateId)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            if (!Rewards.TryGetValue(gateId, out GateReward reward))
                reward = new GateReward(); // Safety: everything 0

            // Safety: only reward if the DB says "completed=1"
            // (set by WaveService at the end of the last wave)
            int completed = 0;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                // 1) Check gate state in DB
                client.ClearParameters();
                client.SetParameter("uid", (object)session.CharacterInfo.Id);
                client.SetParameter("gid", (object)gateId);

                DataTable dt = client.ExecuteQueryTable(
                    "SELECT completed FROM player_galaxy_gates WHERE user_id=@uid AND gate_id=@gid LIMIT 1"
                );

                if (dt == null || dt.Rows.Count == 0)
                    return;

                completed = Convert.ToInt32(dt.Rows[0]["completed"]);
                if (completed != 1)
                    return; // Not finished (or incorrect call)

                // 2) Apply rewards (DB + memory)
                if (reward.Credits != 0 || reward.Uridium != 0)
                    session.CharacterInfo.AddReward(client, reward.Credits, reward.Uridium);

                if (reward.Experience != 0)
                    session.CharacterInfo.AddExperience(client, reward.Experience);

                if (reward.Honor != 0)
                    session.CharacterInfo.AddHonor(client, reward.Honor);

                if (reward.Ucb100 != 0)
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)session.CharacterInfo.Id);
                    client.ExecuteNonQuery("UPDATE users SET ammo_ucb100 = ammo_ucb100 + " + reward.Ucb100 + " WHERE id=@id LIMIT 1");
                    session.CharacterInfo.AmmoUcb100 += (long)reward.Ucb100;
                }

                // 3) Reset gate in DB (removes X-1 portal + clears parts)
                client.ClearParameters();
                client.SetParameter("uid", (object)session.CharacterInfo.Id);
                client.SetParameter("gid", (object)gateId);

                // Reset parts='[]' to clear the gate pieces
                client.ExecuteNonQuery(
                    "UPDATE player_galaxy_gates " +
                    "SET on_map=0, completed=0, current_wave=0, lives=0, parts='[]' " +
                    "WHERE user_id=@uid AND gate_id=@gid"
                );

                // 4) Rings handling (GG rings above rank) — DarkOrbit 2010 behaviour
                //
                // Flash client (full_merge_as.txt) expects `galaxyGatesFinished` in [0..4] and displays
                // the icon "achievement_<n>" at x=-2,y=-14 on the nameplate.
                //
                // The value is a MILESTONE, not a counter:
                // 1 = Alpha done
                // 2 = Alpha + Beta done
                // 3 = Alpha + Beta + Gamma done
                // 4 = Alpha + Beta + Gamma + Delta done
                //
                // Repeating a gate must NOT increase this value.
                const int MAX_GG_RINGS = 4;

                int current = session.CharacterInfo.GGRings;
                int newRings = current;

                switch (gateId)
                {
                    case 1: // Alpha
                        newRings = Math.Max(newRings, 1);
                        break;

                    case 2: // Beta
                        if (newRings >= 1)
                            newRings = Math.Max(newRings, 2);
                        break;

                    case 3: // Gamma
                        if (newRings >= 2)
                            newRings = Math.Max(newRings, 3);
                        break;

                    case 4: // Delta
                        if (newRings >= 3)
                            newRings = Math.Max(newRings, 4);
                        break;
                }

                newRings = Math.Max(0, Math.Min(MAX_GG_RINGS, newRings));

                if (newRings != current)
                {
                    // Memory update
                    session.CharacterInfo.GGRings = newRings;

                    // DB save
                    client.ClearParameters();
                    client.SetParameter("id", (object)session.CharacterInfo.Id);
                    client.SetParameter("rings", (object)newRings);
                    client.ExecuteNonQuery("UPDATE users SET gg_rings=@rings WHERE id=@id LIMIT 1");
                }
            }

            if (reward.Seprom > 0)
                session.CharacterInfo.AddCargo(14L, reward.Seprom);

            // 5) Send packets to the client (visual feedback)

            // Credits / Uridium
            if (reward.Credits != 0)
                session.SendData(PacketComposer.Compose("y", "CRE|" + reward.Credits + "|" + session.CharacterInfo.Credits));

            if (reward.Uridium != 0)
                session.SendData(PacketComposer.Compose("y", "URI|" + reward.Uridium + "|" + session.CharacterInfo.Uridium));

            // XP (with level update if needed)
            if (reward.Experience != 0)
                session.SendData(PacketComposer.Compose("y", "EP|" + reward.Experience + "|" + session.CharacterInfo.Experience + "|" + session.CharacterInfo.Level));

            // Honor
            if (reward.Honor != 0)
                session.SendData(PacketComposer.Compose("y", "HON|" + reward.Honor + "|" + session.CharacterInfo.Honor));

            if (reward.Seprom != 0)
                session.SendData(session.CharacterInfo.GetCargoMessage());

            if (reward.Ucb100 != 0)
                session.SendData(PacketComposer.Compose("B", session.CharacterInfo.GetPrimaryWeaponInfoPayload()));

            // Refresh user data (speed, cargo, etc. if changed)
            session.SendData(UserDataComposer.Compose(session));

            // Final system message + Havok quest progress
            string gateName = gateId == 1 ? "Alpha" :
                              gateId == 2 ? "Beta" :
                              gateId == 3 ? "Gamma" :
                              gateId == 4 ? "Delta" : null;

            bool questProgressChanged = gateName != null &&
                QuestObjectiveProgress.AddGalaxyGateCompleteProgress(session.CharacterInfo.Id, gateName);

            string msg = gateName != null
                ? "STD|Galaxy Gate " + gateName + " finished! Rewards received."
                : "STD|Galaxy Gate finished! Rewards received.";

            if (reward.Seprom > 0)
                session.SendData(PacketComposer.Compose("A", "STD|You received " + reward.Seprom + " Seprom."));

            if (reward.Ucb100 > 0)
                session.SendData(PacketComposer.Compose("A", "STD|You received " + reward.Ucb100 + " UCB-100."));

            if (questProgressChanged)
                session.SendData(PacketComposer.Compose("QST", "UPD"));

            session.SendData(PacketComposer.Compose("A", msg));
        }
    }
}
