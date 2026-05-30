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
            public int Rings;
        }

        private static readonly Dictionary<int, GateReward> Rewards = new Dictionary<int, GateReward>()
        {
            { 1, new GateReward {
                Uridium = 20000,
                Experience = 4000000,
                Honor = 100000,
                Credits = 0,
                Seprom = 1000,
                Ucb100 = 30000,
                Rings = 1
            }},

            { 2, new GateReward {
                Uridium = 40000,
                Experience = 8000000,
                Honor = 200000,
                Credits = 0,
                Seprom = 2000,
                Ucb100 = 60000,
                Rings = 1
            }},

            { 3, new GateReward {
                Uridium = 60000,
                Experience = 12000000,
                Honor = 300000,
                Credits = 0,
                Seprom = 3000,
                Ucb100 = 90000,
                Rings = 1
            }},

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

        public static void GiveCompletionReward(Session session, int gateId)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            if (!Rewards.TryGetValue(gateId, out GateReward reward))
                reward = new GateReward();

            int completed = 0;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
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
                    return;

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

                client.ClearParameters();
                client.SetParameter("uid", (object)session.CharacterInfo.Id);
                client.SetParameter("gid", (object)gateId);

                client.ExecuteNonQuery(
                    "UPDATE player_galaxy_gates " +
                    "SET on_map=0, completed=0, current_wave=0, lives=0, parts='[]' " +
                    "WHERE user_id=@uid AND gate_id=@gid"
                );

                const int MAX_GG_RINGS = 4;

                int current = session.CharacterInfo.GGRings;
                int newRings = current;

                switch (gateId)
                {
                    case 1:
                        newRings = Math.Max(newRings, 1);
                        break;

                    case 2:
                        if (newRings >= 1)
                            newRings = Math.Max(newRings, 2);
                        break;

                    case 3:
                        if (newRings >= 2)
                            newRings = Math.Max(newRings, 3);
                        break;

                    case 4:
                        if (newRings >= 3)
                            newRings = Math.Max(newRings, 4);
                        break;
                }

                newRings = Math.Max(0, Math.Min(MAX_GG_RINGS, newRings));

                if (newRings != current)
                {
                    session.CharacterInfo.GGRings = newRings;

                    client.ClearParameters();
                    client.SetParameter("id", (object)session.CharacterInfo.Id);
                    client.SetParameter("rings", (object)newRings);
                    client.ExecuteNonQuery("UPDATE users SET gg_rings=@rings WHERE id=@id LIMIT 1");
                }
            }

            if (reward.Seprom > 0)
                session.CharacterInfo.AddCargo(14L, reward.Seprom);


            if (reward.Credits != 0)
                session.SendData(PacketComposer.Compose("y", "CRE|" + reward.Credits + "|" + session.CharacterInfo.Credits));

            if (reward.Uridium != 0)
                session.SendData(PacketComposer.Compose("y", "URI|" + reward.Uridium + "|" + session.CharacterInfo.Uridium));

            if (reward.Experience != 0)
                session.SendData(PacketComposer.Compose("y", "EP|" + reward.Experience + "|" + session.CharacterInfo.Experience + "|" + session.CharacterInfo.Level));

            if (reward.Honor != 0)
                session.SendData(PacketComposer.Compose("y", "HON|" + reward.Honor + "|" + session.CharacterInfo.Honor));

            if (reward.Seprom != 0)
                session.SendData(session.CharacterInfo.GetCargoMessage());

            if (reward.Ucb100 != 0)
                session.SendData(PacketComposer.Compose("B", session.CharacterInfo.GetPrimaryWeaponInfoPayload()));

            session.SendData(UserDataComposer.Compose(session));

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
