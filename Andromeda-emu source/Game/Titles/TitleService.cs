using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Titles
{
    public static class TitleService
    {
        public const string BeginnerTitleKey = "title_5";
        public const string MostWantedTitleKey = "title_14";
        public const string SpaceballChampionTitleKey = "title_400";
        public const string UberHunterTitleKey = "title_401";
        public const string BossSlayerTitleKey = "title_402";
        public const string ProtegitBreakerTitleKey = "title_403";
        public const string PvpHunterTitleKey = "title_404";
        public const string WeeklyGrinderTitleKey = "title_405";
        public const string AndromedaEliteTitleKey = "title_406";

        private const int UberHunterKillTarget = 500;
        private const int BossSlayerKillTarget = 25;
        private const int ProtegitBreakerKillTarget = 500;
        private const int PvpHunterKillTarget = 100;
        private const string MostWantedStateKey = "most_wanted";

        private static readonly object SchemaLock = new object();
        private static readonly object MostWantedLock = new object();
        private static readonly HashSet<string> ManagedTitleKeys = new HashSet<string>(StringComparer.Ordinal)
        {
            MostWantedTitleKey,
            SpaceballChampionTitleKey,
            UberHunterTitleKey,
            BossSlayerTitleKey,
            ProtegitBreakerTitleKey,
            PvpHunterTitleKey,
            WeeklyGrinderTitleKey,
            AndromedaEliteTitleKey
        };

        private static bool? mSchemaAvailable;
        private static DateTime mLastSchemaCheck = DateTime.MinValue;
        private static Timer mMostWantedTimer;

        public static void StartRuntime()
        {
            if (mMostWantedTimer == null)
            {
                mMostWantedTimer = new Timer(delegate { EnsureMostWantedHolder(); }, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
            }

            EnsureMostWantedHolder();
        }

        public static bool RefreshDisplayedTitle(Session session, bool notify)
        {
            if (session == null || session.CharacterInfo == null)
            {
                return false;
            }

            CharacterInfo information = session.CharacterInfo;
            string resolvedTitle = ResolveDisplayedTitle(information);
            bool changed = !string.Equals(information.GameTitle, resolvedTitle, StringComparison.Ordinal);

            if (changed)
            {
                information.GameTitle = resolvedTitle;
                UpdateUserGameTitle(information.Id, resolvedTitle);
            }

            if (notify || changed)
            {
                SendPlayerTitle(session, resolvedTitle);
            }

            return changed;
        }

        public static bool RefreshDisplayedTitle(CharacterInfo information)
        {
            if (information == null)
            {
                return false;
            }

            string resolvedTitle = ResolveDisplayedTitle(information);
            bool changed = !string.Equals(information.GameTitle, resolvedTitle, StringComparison.Ordinal);

            if (changed)
            {
                information.GameTitle = resolvedTitle;
                UpdateUserGameTitle(information.Id, resolvedTitle);
            }

            return changed;
        }

        public static string ResolveDisplayedTitle(CharacterInfo information)
        {
            if (information == null)
            {
                return string.Empty;
            }

            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (AreTitleTablesAvailable(client))
                    {
                        ExpireMostWantedIfNeeded(client);
                        RevokeExpiredTemporaryTitles(client, information.Id);

                        if (HasActiveTemporaryTitle(client, information.Id, MostWantedTitleKey))
                        {
                            return MostWantedTitleKey;
                        }

                        if (HasActiveTemporaryTitle(client, information.Id, SpaceballChampionTitleKey))
                        {
                            return SpaceballChampionTitleKey;
                        }

                        string selectedPermanentTitle = GetSelectedPermanentTitle(client, information.Id);
                        if (!string.IsNullOrEmpty(selectedPermanentTitle) && IsPermanentTitleUnlocked(client, information.Id, selectedPermanentTitle))
                        {
                            return selectedPermanentTitle;
                        }
                    }
                }
            }
            catch
            {
            }

            if (information.IsBeginner)
            {
                return BeginnerTitleKey;
            }

            if (!string.IsNullOrEmpty(information.GameTitle) && !ManagedTitleKeys.Contains(information.GameTitle))
            {
                return information.GameTitle;
            }

            return string.Empty;
        }

        public static bool TrackNpcKill(Session session, string npcName, int mapId)
        {
            if (session == null || session.CharacterInfo == null || mapId != 29)
            {
                return false;
            }

            string cleanName = CleanNpcName(npcName);
            int playerId = session.CharacterInfo.Id;

            if (cleanName.StartsWith("Uber ", StringComparison.OrdinalIgnoreCase))
            {
                return AddProgressAndUnlock(playerId, "uber_npc_map29", UberHunterKillTarget, UberHunterTitleKey, "map_29_uber_kills");
            }

            if (string.Equals(cleanName, "Boss Cubikon", StringComparison.OrdinalIgnoreCase))
            {
                return AddProgressAndUnlock(playerId, "boss_cubikon_map29", BossSlayerKillTarget, BossSlayerTitleKey, "map_29_boss_cubikon_kills");
            }

            if (string.Equals(cleanName, "Boss Protegit", StringComparison.OrdinalIgnoreCase))
            {
                return AddProgressAndUnlock(playerId, "boss_protegit_map29", ProtegitBreakerKillTarget, ProtegitBreakerTitleKey, "map_29_boss_protegit_kills");
            }

            return false;
        }

        public static bool TrackEligiblePvpKill(Session attacker, Session victim, bool rewardAsEnemy)
        {
            if (!IsEligiblePvpTitleKill(attacker, victim, rewardAsEnemy))
            {
                return false;
            }

            bool unlocked = AddProgressAndUnlock(attacker.CharacterInfo.Id, "eligible_pvp_kill", PvpHunterKillTarget, PvpHunterTitleKey, "eligible_pvp_kills");
            TryTransferMostWantedFromPlayer(attacker, victim);
            return unlocked;
        }

        public static void OnNpcDestroyed(Npc npc)
        {
            if (npc == null)
            {
                return;
            }

            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (!AreTitleTablesAvailable(client))
                    {
                        return;
                    }

                    lock (MostWantedLock)
                    {
                        DataRow state = GetMostWantedState(client);
                        if (state == null || !string.Equals(GetString(state, "holder_type"), "npc", StringComparison.OrdinalIgnoreCase) || GetInt(state, "holder_npc_id") != npc.Id)
                        {
                            return;
                        }

                        Session rewardOwner = SessionManager.GetSessionByCharacterId(npc.RewardOwnerId);
                        if (rewardOwner != null && rewardOwner.CharacterInfo != null)
                        {
                            TransferMostWantedToPlayer(client, rewardOwner);
                        }
                        else
                        {
                            AssignMostWantedToRandomNpc(client);
                        }
                    }
                }
            }
            catch
            {
            }
        }

        public static void EnsureMostWantedHolder()
        {
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (!AreTitleTablesAvailable(client))
                    {
                        return;
                    }

                    lock (MostWantedLock)
                    {
                        ExpireMostWantedIfNeeded(client);
                        DataRow state = GetMostWantedState(client);

                        if (state == null)
                        {
                            EnsureMostWantedStateRow(client);
                            AssignMostWantedToRandomNpc(client);
                            return;
                        }

                        string holderType = GetString(state, "holder_type");
                        if (string.Equals(holderType, "player", StringComparison.OrdinalIgnoreCase) && GetInt(state, "holder_player_id") > 0)
                        {
                            return;
                        }

                        if (string.Equals(holderType, "npc", StringComparison.OrdinalIgnoreCase))
                        {
                            Npc npc = FindNpcById(GetInt(state, "holder_npc_id"));
                            if (IsEligibleMostWantedNpc(npc))
                            {
                                SetNpcTitle(npc, MostWantedTitleKey, true);
                                return;
                            }
                        }

                        AssignMostWantedToRandomNpc(client);
                    }
                }
            }
            catch
            {
            }
        }

        public static void GrantSpaceballChampionToOnlineWinners(int factionId, int mapId)
        {
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (!AreTitleTablesAvailable(client))
                    {
                        return;
                    }

                    List<Session> winners = new List<Session>();
                    foreach (Session session in (IEnumerable<Session>)SessionManager.SessionsUser.Keys)
                    {
                        if (session != null && session.CharacterInfo != null && session.CharacterInfo.FactionId == factionId && session.CharacterInfo.MapId == mapId)
                        {
                            winners.Add(session);
                        }
                    }

                    foreach (Session winner in winners)
                    {
                        GrantTemporaryTitle(client, winner.CharacterInfo.Id, SpaceballChampionTitleKey, "spaceball_champion", null);
                        RefreshDisplayedTitle(winner, true);
                    }
                }
            }
            catch
            {
            }
        }

        public static void RevokeSpaceballChampionTitles()
        {
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (!AreTitleTablesAvailable(client))
                    {
                        return;
                    }

                    DataTable holders = client.ExecuteQueryTable("SELECT player_id FROM player_titles WHERE title_key = 'title_400' AND title_scope = 'temporary' AND revoked_at IS NULL");
                    client.ExecuteNonQuery("UPDATE player_titles SET revoked_at = UTC_TIMESTAMP() WHERE title_key = 'title_400' AND title_scope = 'temporary' AND revoked_at IS NULL");

                    if (holders == null)
                    {
                        return;
                    }

                    foreach (DataRow row in holders.Rows)
                    {
                        Session session = SessionManager.GetSessionByCharacterId(GetInt(row, "player_id"));
                        if (session != null)
                        {
                            RefreshDisplayedTitle(session, true);
                        }
                    }
                }
            }
            catch
            {
            }
        }

        private static bool IsEligiblePvpTitleKill(Session attacker, Session victim, bool rewardAsEnemy)
        {
            if (!rewardAsEnemy || attacker == null || victim == null || attacker.CharacterInfo == null || victim.CharacterInfo == null)
            {
                return false;
            }

            CharacterInfo attackerInfo = attacker.CharacterInfo;
            CharacterInfo victimInfo = victim.CharacterInfo;
            return attackerInfo != null && victimInfo != null && attackerInfo.FactionId != victimInfo.FactionId && victimInfo.Level >= 8;
        }

        private static void TryTransferMostWantedFromPlayer(Session attacker, Session victim)
        {
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (!AreTitleTablesAvailable(client))
                    {
                        return;
                    }

                    lock (MostWantedLock)
                    {
                        DataRow state = GetMostWantedState(client);
                        if (state == null || !string.Equals(GetString(state, "holder_type"), "player", StringComparison.OrdinalIgnoreCase) || GetInt(state, "holder_player_id") != victim.CharacterInfo.Id)
                        {
                            return;
                        }

                        TransferMostWantedToPlayer(client, attacker);
                    }
                }
            }
            catch
            {
            }
        }

        private static void TransferMostWantedToPlayer(SqlDatabaseClient client, Session newHolder)
        {
            if (newHolder == null || newHolder.CharacterInfo == null)
            {
                AssignMostWantedToRandomNpc(client);
                return;
            }

            DataRow state = GetMostWantedState(client);
            int oldPlayerId = state == null ? 0 : GetInt(state, "holder_player_id");
            int oldNpcId = state == null ? 0 : GetInt(state, "holder_npc_id");
            Session oldPlayerSession = oldPlayerId > 0 ? SessionManager.GetSessionByCharacterId(oldPlayerId) : null;

            if (oldNpcId > 0)
            {
                Npc oldNpc = FindNpcById(oldNpcId);
                if (oldNpc != null)
                {
                    SetNpcTitle(oldNpc, string.Empty, true);
                }
            }

            if (oldPlayerId > 0)
            {
                RevokeTemporaryTitle(client, oldPlayerId, MostWantedTitleKey);
            }

            GrantTemporaryTitle(client, newHolder.CharacterInfo.Id, MostWantedTitleKey, "most_wanted", "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY)");
            client.ClearParameters();
            client.SetParameter("playerId", newHolder.CharacterInfo.Id);
            client.ExecuteNonQuery("INSERT INTO title_runtime_state (state_key, title_key, holder_type, holder_player_id, holder_npc_id, holder_map_id, assigned_at, expires_at) VALUES ('most_wanted', 'title_14', 'player', @playerId, 0, 0, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY)) ON DUPLICATE KEY UPDATE title_key = VALUES(title_key), holder_type = VALUES(holder_type), holder_player_id = VALUES(holder_player_id), holder_npc_id = VALUES(holder_npc_id), holder_map_id = VALUES(holder_map_id), assigned_at = VALUES(assigned_at), expires_at = VALUES(expires_at)");

            if (oldPlayerSession != null && oldPlayerSession != newHolder)
            {
                RefreshDisplayedTitle(oldPlayerSession, true);
            }

            RefreshDisplayedTitle(newHolder, true);
        }

        private static void AssignMostWantedToRandomNpc(SqlDatabaseClient client)
        {
            ClearMostWantedFromNpcs();
            Npc npc = PickMostWantedNpc();

            if (npc == null)
            {
                client.ExecuteNonQuery("INSERT INTO title_runtime_state (state_key, title_key, holder_type, holder_player_id, holder_npc_id, holder_map_id, assigned_at, expires_at) VALUES ('most_wanted', 'title_14', 'none', 0, 0, 0, NULL, NULL) ON DUPLICATE KEY UPDATE holder_type = VALUES(holder_type), holder_player_id = VALUES(holder_player_id), holder_npc_id = VALUES(holder_npc_id), holder_map_id = VALUES(holder_map_id), assigned_at = VALUES(assigned_at), expires_at = VALUES(expires_at)");
                return;
            }

            SetNpcTitle(npc, MostWantedTitleKey, true);
            client.ClearParameters();
            client.SetParameter("npcId", npc.Id);
            client.SetParameter("mapId", npc.MapId);
            client.ExecuteNonQuery("INSERT INTO title_runtime_state (state_key, title_key, holder_type, holder_player_id, holder_npc_id, holder_map_id, assigned_at, expires_at) VALUES ('most_wanted', 'title_14', 'npc', 0, @npcId, @mapId, UTC_TIMESTAMP(), NULL) ON DUPLICATE KEY UPDATE title_key = VALUES(title_key), holder_type = VALUES(holder_type), holder_player_id = VALUES(holder_player_id), holder_npc_id = VALUES(holder_npc_id), holder_map_id = VALUES(holder_map_id), assigned_at = VALUES(assigned_at), expires_at = VALUES(expires_at)");
        }

        private static void ExpireMostWantedIfNeeded(SqlDatabaseClient client)
        {
            DataRow state = GetMostWantedState(client);
            if (state == null || !string.Equals(GetString(state, "holder_type"), "player", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            DateTime expiresAt = GetDateTime(state, "expires_at");
            if (expiresAt == DateTime.MinValue || expiresAt > DateTime.UtcNow)
            {
                return;
            }

            int playerId = GetInt(state, "holder_player_id");
            RevokeTemporaryTitle(client, playerId, MostWantedTitleKey);
            Session session = SessionManager.GetSessionByCharacterId(playerId);
            AssignMostWantedToRandomNpc(client);
            if (session != null)
            {
                RefreshDisplayedTitle(session, true);
            }
        }

        private static Npc PickMostWantedNpc()
        {
            List<Npc> candidates = new List<Npc>();
            foreach (Npc npc in NpcAI.NpcList.Keys)
            {
                if (IsEligibleMostWantedNpc(npc))
                {
                    candidates.Add(npc);
                }
            }

            if (candidates.Count == 0)
            {
                return null;
            }

            return candidates[RandomProvider.Current.Next(candidates.Count)];
        }

        private static bool IsEligibleMostWantedNpc(Npc npc)
        {
            if (npc == null || npc.IsDestroying || npc.ParentNpcId > 0 || npc.MapId <= 0)
            {
                return false;
            }

            if (npc.MapId == 1 || npc.MapId == 5 || npc.MapId == 9 || npc.MapId == 16 || npc.MapId == 80 || npc.MapId == 81 || npc.MapId == 83)
            {
                return false;
            }

            if (GalaxyGateWaveService.IsGateMap(npc.MapId))
            {
                return false;
            }

            string cleanName = CleanNpcName(npc.Name);
            return !string.Equals(cleanName, "Spaceball", StringComparison.OrdinalIgnoreCase);
        }

        private static Npc FindNpcById(int npcId)
        {
            if (npcId <= 0)
            {
                return null;
            }

            foreach (Npc npc in NpcAI.NpcList.Keys)
            {
                if (npc != null && npc.Id == npcId)
                {
                    return npc;
                }
            }

            return null;
        }

        private static void ClearMostWantedFromNpcs()
        {
            foreach (Npc npc in NpcAI.NpcList.Keys)
            {
                if (npc != null && string.Equals(npc.GameTitle, MostWantedTitleKey, StringComparison.Ordinal))
                {
                    SetNpcTitle(npc, string.Empty, true);
                }
            }
        }

        private static void SetNpcTitle(Npc npc, string titleKey, bool notify)
        {
            if (npc == null || string.Equals(npc.GameTitle, titleKey, StringComparison.Ordinal))
            {
                return;
            }

            npc.GameTitle = titleKey ?? string.Empty;

            MapInstance instance = MapManager.GetInstanceByMapId(npc.MapId);
            if (notify && instance != null)
            {
                ServerMessage packet = PacketComposer.Compose("n", "pt|" + npc.Id + "|" + npc.GameTitle);
                instance.BroadcastMessageInRange(packet, npc.Id, false);
            }
        }

        private static bool AddProgressAndUnlock(int playerId, string progressKey, int targetAmount, string titleKey, string source)
        {
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (!AreTitleTablesAvailable(client))
                    {
                        return false;
                    }

                    client.ClearParameters();
                    client.SetParameter("playerId", playerId);
                    client.SetParameter("progressKey", progressKey);
                    object currentResult = client.ExecuteScalar("SELECT current_amount FROM player_title_progress WHERE player_id = @playerId AND progress_key = @progressKey LIMIT 1");
                    int currentAmount = currentResult == null ? 0 : Convert.ToInt32(currentResult);
                    int nextAmount = Math.Min(targetAmount, currentAmount + 1);

                    client.ClearParameters();
                    client.SetParameter("playerId", playerId);
                    client.SetParameter("progressKey", progressKey);
                    client.SetParameter("currentAmount", nextAmount);
                    client.ExecuteNonQuery("INSERT INTO player_title_progress (player_id, progress_key, current_amount) VALUES (@playerId, @progressKey, @currentAmount) ON DUPLICATE KEY UPDATE current_amount = VALUES(current_amount)");

                    if (currentAmount < targetAmount && nextAmount >= targetAmount)
                    {
                        return GrantPermanentTitle(client, playerId, titleKey, source);
                    }
                }
            }
            catch
            {
            }

            return false;
        }

        private static bool GrantPermanentTitle(SqlDatabaseClient client, int playerId, string titleKey, string source)
        {
            if (IsPermanentTitleUnlocked(client, playerId, titleKey))
            {
                return false;
            }

            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            client.SetParameter("titleKey", titleKey);
            client.SetParameter("source", source);
            client.ExecuteNonQuery("INSERT INTO player_titles (player_id, title_key, title_scope, source, expires_at, revoked_at) VALUES (@playerId, @titleKey, 'permanent', @source, NULL, NULL) ON DUPLICATE KEY UPDATE title_scope = 'permanent', source = VALUES(source), expires_at = NULL, revoked_at = NULL");

            string selectedTitle = GetSelectedPermanentTitle(client, playerId);
            if (string.IsNullOrEmpty(selectedTitle))
            {
                client.ClearParameters();
                client.SetParameter("playerId", playerId);
                client.SetParameter("titleKey", titleKey);
                client.ExecuteNonQuery("INSERT INTO player_title_selection (player_id, selected_title_key) VALUES (@playerId, @titleKey) ON DUPLICATE KEY UPDATE selected_title_key = IF(selected_title_key = '', VALUES(selected_title_key), selected_title_key)");

                Session session = SessionManager.GetSessionByCharacterId(playerId);
                if (session != null)
                {
                    RefreshDisplayedTitle(session, true);
                }
            }

            return true;
        }

        private static void GrantTemporaryTitle(SqlDatabaseClient client, int playerId, string titleKey, string source, string expiresExpression)
        {
            RevokeOtherTemporaryTitlesBeforeGrant(client, playerId, titleKey);
            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            client.SetParameter("titleKey", titleKey);
            client.SetParameter("source", source);
            string expiresSql = string.IsNullOrEmpty(expiresExpression) ? "NULL" : expiresExpression;
            client.ExecuteNonQuery("INSERT INTO player_titles (player_id, title_key, title_scope, source, expires_at, revoked_at) VALUES (@playerId, @titleKey, 'temporary', @source, " + expiresSql + ", NULL) ON DUPLICATE KEY UPDATE title_scope = 'temporary', source = VALUES(source), expires_at = VALUES(expires_at), revoked_at = NULL");
        }

        private static void RevokeOtherTemporaryTitlesBeforeGrant(SqlDatabaseClient client, int playerId, string titleKey)
        {
            bool returnsMostWantedToNpc = titleKey != MostWantedTitleKey && HasActiveTemporaryTitle(client, playerId, MostWantedTitleKey) && IsMostWantedHeldByPlayer(client, playerId);

            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            client.SetParameter("titleKey", titleKey);
            client.ExecuteNonQuery("UPDATE player_titles SET revoked_at = UTC_TIMESTAMP() WHERE player_id = @playerId AND title_scope = 'temporary' AND title_key <> @titleKey AND revoked_at IS NULL");

            if (returnsMostWantedToNpc)
            {
                AssignMostWantedToRandomNpc(client);
            }
        }

        private static bool IsMostWantedHeldByPlayer(SqlDatabaseClient client, int playerId)
        {
            DataRow state = GetMostWantedState(client);
            return state != null && string.Equals(GetString(state, "holder_type"), "player", StringComparison.OrdinalIgnoreCase) && GetInt(state, "holder_player_id") == playerId;
        }

        private static void RevokeTemporaryTitle(SqlDatabaseClient client, int playerId, string titleKey)
        {
            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            client.SetParameter("titleKey", titleKey);
            client.ExecuteNonQuery("UPDATE player_titles SET revoked_at = UTC_TIMESTAMP() WHERE player_id = @playerId AND title_key = @titleKey AND title_scope = 'temporary' AND revoked_at IS NULL");
        }

        private static void RevokeExpiredTemporaryTitles(SqlDatabaseClient client, int playerId)
        {
            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            client.ExecuteNonQuery("UPDATE player_titles SET revoked_at = UTC_TIMESTAMP() WHERE player_id = @playerId AND title_scope = 'temporary' AND revoked_at IS NULL AND expires_at IS NOT NULL AND expires_at <= UTC_TIMESTAMP()");
        }

        private static bool HasActiveTemporaryTitle(SqlDatabaseClient client, int playerId, string titleKey)
        {
            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            client.SetParameter("titleKey", titleKey);
            object result = client.ExecuteScalar("SELECT COUNT(*) FROM player_titles WHERE player_id = @playerId AND title_key = @titleKey AND title_scope = 'temporary' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())");
            return result != null && Convert.ToInt32(result) > 0;
        }

        private static bool IsPermanentTitleUnlocked(SqlDatabaseClient client, int playerId, string titleKey)
        {
            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            client.SetParameter("titleKey", titleKey);
            object result = client.ExecuteScalar("SELECT COUNT(*) FROM player_titles WHERE player_id = @playerId AND title_key = @titleKey AND title_scope = 'permanent' AND revoked_at IS NULL");
            return result != null && Convert.ToInt32(result) > 0;
        }

        private static string GetSelectedPermanentTitle(SqlDatabaseClient client, int playerId)
        {
            client.ClearParameters();
            client.SetParameter("playerId", playerId);
            object result = client.ExecuteScalar("SELECT selected_title_key FROM player_title_selection WHERE player_id = @playerId LIMIT 1");
            return result == null ? string.Empty : Convert.ToString(result);
        }

        private static DataRow GetMostWantedState(SqlDatabaseClient client)
        {
            DataTable table = client.ExecuteQueryTable("SELECT * FROM title_runtime_state WHERE state_key = 'most_wanted' LIMIT 1");
            return table == null || table.Rows.Count == 0 ? null : table.Rows[0];
        }

        private static void EnsureMostWantedStateRow(SqlDatabaseClient client)
        {
            client.ExecuteNonQuery("INSERT INTO title_runtime_state (state_key, title_key, holder_type, holder_player_id, holder_npc_id, holder_map_id, assigned_at, expires_at) VALUES ('most_wanted', 'title_14', 'none', 0, 0, 0, NULL, NULL) ON DUPLICATE KEY UPDATE title_key = VALUES(title_key)");
        }

        private static void UpdateUserGameTitle(int playerId, string titleKey)
        {
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("playerId", playerId);
                    client.SetParameter("titleKey", titleKey ?? string.Empty);
                    client.ExecuteNonQuery("UPDATE users SET game_title = @titleKey WHERE id = @playerId LIMIT 1");
                }
            }
            catch
            {
            }
        }

        private static void SendPlayerTitle(Session session, string titleKey)
        {
            if (session == null || session.CharacterInfo == null)
            {
                return;
            }

            ServerMessage packet = PacketComposer.Compose("n", "pt|" + session.CharacterInfo.Id + "|" + (titleKey ?? string.Empty));
            MapInstance instance = MapManager.GetInstanceByMapId(session.CurrentMapId);
            if (instance != null && session.MapJoined)
            {
                instance.BroadcastMessage(packet, false);
            }
            else
            {
                session.SendData(packet);
            }
        }

        private static bool AreTitleTablesAvailable(SqlDatabaseClient client)
        {
            lock (SchemaLock)
            {
                if (mSchemaAvailable.HasValue && (DateTime.UtcNow - mLastSchemaCheck).TotalSeconds < 60)
                {
                    return mSchemaAvailable.Value;
                }

                mLastSchemaCheck = DateTime.UtcNow;
                try
                {
                    string[] tableNames = { "player_titles", "player_title_selection", "player_title_progress", "title_runtime_state" };
                    foreach (string tableName in tableNames)
                    {
                        client.ClearParameters();
                        client.SetParameter("tableName", tableName);
                        object result = client.ExecuteScalar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = @tableName");
                        if (result == null || Convert.ToInt32(result) <= 0)
                        {
                            mSchemaAvailable = false;
                            return false;
                        }
                    }

                    mSchemaAvailable = true;
                    return true;
                }
                catch
                {
                    mSchemaAvailable = false;
                    return false;
                }
            }
        }

        private static string CleanNpcName(string npcName)
        {
            if (string.IsNullOrEmpty(npcName))
            {
                return string.Empty;
            }

            return npcName.Replace("-=[", string.Empty).Replace("]=-", string.Empty).Trim();
        }

        private static string GetString(DataRow row, string columnName)
        {
            return row == null || row[columnName] == DBNull.Value ? string.Empty : Convert.ToString(row[columnName]);
        }

        private static int GetInt(DataRow row, string columnName)
        {
            return row == null || row[columnName] == DBNull.Value ? 0 : Convert.ToInt32(row[columnName]);
        }

        private static DateTime GetDateTime(DataRow row, string columnName)
        {
            return row == null || row[columnName] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(row[columnName]).ToUniversalTime();
        }
    }
}
