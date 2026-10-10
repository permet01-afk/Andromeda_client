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
        internal struct GateReward
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

        internal static bool TryGetReward(int gateId, out GateReward reward) { return Rewards.TryGetValue(gateId, out reward); }

        public static bool GiveCompletionReward(Session session, int gateId)
        {
            if (session == null || session.CharacterInfo == null) return false;
            GateReward reward;
            if (!Rewards.TryGetValue(gateId, out reward)) return false;
            GalaxyGateRewardReceipt receipt;
            try { receipt = session.CharacterInfo.ClaimGalaxyGateReward(gateId); }
            catch (Exception ex)
            {
                Console.Error.WriteLine("[GG reward] Claim deferred for player " + session.CharacterInfo.Id + ": " + ex.Message);
                session.SendData(PacketComposer.Compose("A", "STD|Reward could not be confirmed. Please retry the exit portal."));
                return false;
            }
            if (!receipt.Paid)
            {
                session.SendData(UserDataComposer.Compose(session));
                session.SendData(PacketComposer.Compose("B", session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                session.SendData(session.CharacterInfo.GetCargoMessage());
                return true;
            }

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
            return true;
        }
    }
}
