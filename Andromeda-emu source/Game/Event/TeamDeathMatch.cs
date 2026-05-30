

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Game.Event
{
    public class TdmTeam
    {
        private string name;
        private int faction;
        private CList<int> members;

        public TdmTeam(Session creator, string name)
        {
            if (creator != null && creator.CharacterInfo != null)
            {
                this.faction = creator.CharacterInfo.FactionId;
                this.members = new CList<int>();
                this.members.Add(creator.CharacterId);
                this.name = name;
            }
        }

        public CList<int> getMembers()
        {
            return this.members;
        }

        public void addMember(int Member)
        {
            this.members.Add(Member);
        }

        public void removeMember(int member)
        {
            this.members.Remove(member);
        }

        public bool hasMember(int member)
        {
            return this.members.Contains(member);
        }

        public int countMembers()
        {
            return this.members.Count;
        }

        public string getName()
        {
            return this.name;
        }

        public int getFaction()
        {
            return this.faction;
        }

        public void displayChatMessage(string message)
        {
            foreach (int id in (IEnumerable<int>)this.members.Keys)
            {
                Session session = SessionManager.GetSessionByCharacterId(id);
                if (session != null && session.CharacterInfo != null)
                {
                    Output.WriteLine(session.Id);
                    session.SendData(PacketComposer.Compose("A", "STD|" + message));
                }

            }
        }
    }


    public static class TeamDeathMatch
    {
        public static int maxMember = 5;
        private static CDictionnary<string, TdmTeam> teams;
        private static bool mIsActive = false;
        private static Timer performSearching;
        private static Timer cooldown;
        private static Timer performMatch;
        private static TdmTeam Team1;
        private static TdmTeam Team2;
        private static double timeMatch;
        private static bool mSafeBattle = false;
        private static Timer performSearchingMsg;

        public static bool SafeBattle()
        {
            return TeamDeathMatch.mSafeBattle;
        }
        public static string DisplayTeam(string name)
        {
            string msg = "Team name: " + name;
            foreach (int id in (IEnumerable<int>)(TeamDeathMatch.teams[name].getMembers().Keys))
            {
                Session session = SessionManager.GetSessionByCharacterId(id);
                if (session != null && session.CharacterInfo != null)
                    msg = msg + ", " + session.CharacterInfo.Username;
            }
            msg = msg + ". Numbers: " + TeamDeathMatch.teams[name].countMembers();
            return msg;

        }

        private static void displayMessageTdm(string msg)
        {
            foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
            {
                if (!mapInstance.Unloaded)
                {
                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + msg), false);
                }
            }
        }
        private static void SearchTeam(object state)
        {
            if (!TeamDeathMatch.mIsActive)
            {
                if (TeamDeathMatch.performSearching != null)
                    TeamDeathMatch.performSearching.Dispose();
                return;
            }
            if (TeamDeathMatch.Team1 == null)
                TeamDeathMatch.Team1 = TeamDeathMatch.findTeam(TeamDeathMatch.Team2);
            if (TeamDeathMatch.Team2 == null)
                TeamDeathMatch.Team2 = TeamDeathMatch.findTeam(TeamDeathMatch.Team1);

            TeamDeathMatch.CheckTeamValid();

            if (TeamDeathMatch.Team1 != null && TeamDeathMatch.Team2 != null)
            {
                TeamDeathMatch.PrepareMatch();
                if (TeamDeathMatch.performSearching != null)
                    TeamDeathMatch.performSearching.Dispose();
                if (TeamDeathMatch.performSearchingMsg != null)
                    TeamDeathMatch.performSearchingMsg.Dispose();
            }
        }

        private static void CheckTeamValid()
        {
            if (TeamDeathMatch.Team1 != null)
            {
                CList<int> toRemoveT1 = new CList<int>();
                foreach (int num in Team1.getMembers().Keys)
                {
                    Session sessionByCharId = SessionManager.GetSessionByCharacterId(num);
                    if (sessionByCharId == null || sessionByCharId.CharacterInfo == null)
                    {
                        toRemoveT1.Add(num);
                    }
                }
                foreach (int num in toRemoveT1.Keys)
                    TeamDeathMatch.Team1.removeMember(num);
                toRemoveT1.Clear();
            }
            if (TeamDeathMatch.Team2 != null)
            {
                CList<int> toRemoveT2 = new CList<int>();
                foreach (int num in Team2.getMembers().Keys)
                {
                    Session sessionByCharId = SessionManager.GetSessionByCharacterId(num);
                    if (sessionByCharId == null || sessionByCharId.CharacterInfo == null)
                    {
                        toRemoveT2.Add(num);
                    }
                }
                foreach (int num in toRemoveT2.Keys)
                    TeamDeathMatch.Team2.removeMember(num);
                toRemoveT2.Clear();
            }

            if (TeamDeathMatch.Team1 != null && TeamDeathMatch.Team1.countMembers() != TeamDeathMatch.maxMember)
                TeamDeathMatch.Team1 = null;
            if (TeamDeathMatch.Team2 != null && TeamDeathMatch.Team2.countMembers() != TeamDeathMatch.maxMember)
                TeamDeathMatch.Team2 = null;
        }

        private static void SearchTeamMsg(object state)
        {
            TeamDeathMatch.displayMessageTdm("Searching teams for next match...");
        }

        private static TdmTeam findTeam(TdmTeam oponnent)
        {
            foreach (KeyValuePair<string, TdmTeam> entry in TeamDeathMatch.teams)
            {
                if (entry.Value.countMembers() == TeamDeathMatch.maxMember)
                {
                    if (oponnent == null)
                    {
                        return entry.Value;
                    }
                    else if (oponnent.getName() != entry.Value.getName())
                    {
                        return entry.Value;
                    }
                }
            }

            return null;
        }

        private static void PrepareMatch()
        {
            foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
            {
                if (!mapInstance.Unloaded)
                {
                    string str = "Match: " + TeamDeathMatch.Team1.getName() + " VS " + TeamDeathMatch.Team2.getName() + " will start in 10 sec !";
                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                }
            }
            TeamDeathMatch.cooldown = new Timer(new TimerCallback(TeamDeathMatch.StartCoolDown), (object)10, 5000, 0);
        }

        private static void StartCoolDown(object state)
        {
            int num = (int)state;
            if (num == 0)
            {
                TeamDeathMatch.BeginMatch();
            }
            else
            {
                foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
                {
                    if (mapInstance != null && !mapInstance.Unloaded)
                    {
                        string str = (object)num + " seconds left ...";
                        mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                    }
                }
                TeamDeathMatch.cooldown = new Timer(new TimerCallback(TeamDeathMatch.StartCoolDown), (object)(num - 1), 1000, 0);
            }
        }

        private static void BeginMatch()
        {
            foreach (int id in (IEnumerable<int>)(TeamDeathMatch.Team1.getMembers().Keys))
            {
                Session session = SessionManager.GetSessionByCharacterId(id);
                if (session != null && session.CharacterInfo != null)
                {
                    Session sessionByCharId = SessionManager.GetSessionByCharacterId(session.CharacterId);
                    sessionByCharId.CharacterInfo.LocX = 8600;
                    sessionByCharId.CharacterInfo.LocY = 6600;
                    sessionByCharId.CharacterInfo.NewLocX = sessionByCharId.CharacterInfo.LocX;
                    sessionByCharId.CharacterInfo.NewLocY = sessionByCharId.CharacterInfo.LocY;
                    sessionByCharId.CharacterInfo.PlayerInRange.Clear();
                    sessionByCharId.CharacterInfo.FactionId = 1;
                    sessionByCharId.CharacterInfo.ClanId = 0;
                    MapHandler.OpenPublicConnection(sessionByCharId, 83, (PortalInfo)null);
                }
            }

            foreach (int id in (IEnumerable<int>)TeamDeathMatch.Team2.getMembers().Keys)
            {
                Session session = SessionManager.GetSessionByCharacterId(id);
                if (session != null && session.CharacterInfo != null)
                {
                    Session sessionByCharId = SessionManager.GetSessionByCharacterId(session.CharacterId);
                    sessionByCharId.CharacterInfo.LocX = 12000;
                    sessionByCharId.CharacterInfo.LocY = 6600;
                    sessionByCharId.CharacterInfo.NewLocX = sessionByCharId.CharacterInfo.LocX;
                    sessionByCharId.CharacterInfo.NewLocY = sessionByCharId.CharacterInfo.LocY;
                    sessionByCharId.CharacterInfo.PlayerInRange.Clear();
                    sessionByCharId.CharacterInfo.FactionId = 2;
                    sessionByCharId.CharacterInfo.ClanId = 0;
                    MapHandler.OpenPublicConnection(sessionByCharId, 83, (PortalInfo)null);
                }
            }
            TeamDeathMatch.cooldown = new Timer(new TimerCallback(TeamDeathMatch.StartCoolDownSafe), (object)20, 5000, 0);
            TeamDeathMatch.mSafeBattle = true;
        }

        private static void StartCoolDownSafe(object state)
        {
            int num = (int)state;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(83);
            if (instanceByMapId == null)
            {
                TeamDeathMatch.Disable();
                return;
            }
            if (num == 0)
            {
                TeamDeathMatch.mSafeBattle = false;
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|FIGHT !"), false);
                TeamDeathMatch.timeMatch = UnixTimestamp.GetCurrent();
                TeamDeathMatch.performMatch = new Timer(new TimerCallback(TeamDeathMatch.Match), (object)null, 0, 5000);
            }
            else
            {
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|Fight begin in " + num + " seconds ..."), false);
                TeamDeathMatch.cooldown = new Timer(new TimerCallback(TeamDeathMatch.StartCoolDownSafe), (object)(num - 1), 1000, 0);
            }
        }
        private static void Match(object state)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(83);
            if (instanceByMapId == null)
            {
                TeamDeathMatch.Disable();
            }
            int nbLeftT1 = 0;
            int nbLeftT2 = 0;
            foreach (MapActor actor in (IEnumerable<MapActor>)instanceByMapId.Actors.Keys)
            {
                Session sessionById = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (sessionById == null || sessionById.CharacterInfo == null)
                    continue;
                if (TeamDeathMatch.Team1.hasMember(sessionById.CharacterId))
                    nbLeftT1 = nbLeftT1 + 1;
                else if (TeamDeathMatch.Team2.hasMember(sessionById.CharacterId))
                    nbLeftT2 = nbLeftT2 + 1;
            }
            bool finish = TeamDeathMatch.checkWinner(nbLeftT1, nbLeftT2);
            if (finish)
            {
                if (TeamDeathMatch.performMatch != null)
                    TeamDeathMatch.performMatch.Dispose();
                TeamDeathMatch.timeMatch = 0;
            }

        }

        private static bool checkWinner(int nbLeftT1, int nbLeftT2)
        {
            if (nbLeftT1 == 0 && nbLeftT2 > 0)
            {
                TeamDeathMatch.sendVictory(TeamDeathMatch.Team2, TeamDeathMatch.Team1);
                return true;
            }
            else if (nbLeftT1 > 0 && nbLeftT2 == 0)
            {
                TeamDeathMatch.sendVictory(TeamDeathMatch.Team1, TeamDeathMatch.Team2);
                return true;
            }
            else if (nbLeftT1 == 0 && nbLeftT2 == 0)
            {
                TeamDeathMatch.sendEquality();
                return true;
            }
            else if (UnixTimestamp.GetCurrent() - TeamDeathMatch.timeMatch >= 180.0)
            {
                if (nbLeftT1 > nbLeftT2)
                {
                    TeamDeathMatch.sendVictory(TeamDeathMatch.Team1, TeamDeathMatch.Team2);
                    return true;
                }
                else if (nbLeftT1 < nbLeftT2)
                {
                    TeamDeathMatch.sendVictory(TeamDeathMatch.Team2, TeamDeathMatch.Team1);
                    return true;
                }
                else
                {
                    TeamDeathMatch.sendEquality();
                    return true;
                }
            }
            return false;
        }

        private static void sendEquality()
        {
            TeamDeathMatch.BackAll();
            string msg = "Equality between " + TeamDeathMatch.Team1.getName() + " and " + TeamDeathMatch.Team2.getName();
            TeamDeathMatch.displayMessageTdm(msg);
            TeamDeathMatch.finishMatch();
        }

        private static void sendVictory(TdmTeam teamWon, TdmTeam teamLose)
        {
            foreach (int id in (IEnumerable<int>)teamWon.getMembers().Keys)
            {
                Session session = SessionManager.GetSessionByCharacterId(id);
                if (session != null && session.CharacterInfo != null)
                {
                    Session sessionById = SessionManager.GetSessionByCharacterId(session.CharacterId);
                    sessionById.SendData(PacketComposer.Compose("A", "STD|You won the match !"));
                    sessionById.SendData(PacketComposer.Compose("A", "STD|You receive 800 Rankpoints\n You receive 400 PvP Points !"));

                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        sessionById.CharacterInfo.AddTdmMatch(client, 1, 1);
                        sessionById.CharacterInfo.AddPvpPoints(client, 400);
                        sessionById.CharacterInfo.AddRankpoints(client, 800);
                    }
                }
            }
            foreach (int id in (IEnumerable<int>)teamLose.getMembers().Keys)
            {
                Session session = SessionManager.GetSessionByCharacterId(id);
                if (session != null && session.CharacterInfo != null)
                {
                    Session sessionById = SessionManager.GetSessionByCharacterId(session.CharacterId);
                    sessionById.SendData(PacketComposer.Compose("A", "STD|You losed the match ..."));
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        sessionById.CharacterInfo.AddTdmMatch(client, 0, 1);
                    }
                }
            }
            TeamDeathMatch.BackAll();
            TeamDeathMatch.displayMessageTdm(teamWon.getName() + " won against " + teamLose.getName() + " !");
            TeamDeathMatch.finishMatch();
        }

        private static void BackAll()
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(83);
            foreach (MapActor actor in (IEnumerable<MapActor>)instanceByMapId.Actors.Keys)
            {
                Session sessionByCharacterId = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null)
                    continue;
                sessionByCharacterId.CharacterInfo.FactionId = sessionByCharacterId.CharacterInfo.RealFaction;
                sessionByCharacterId.CharacterInfo.ClanId = sessionByCharacterId.CharacterInfo.RealClan;
                sessionByCharacterId.CharacterInfo.PlayerInRange.Clear();
                if (sessionByCharacterId.CharacterInfo.FactionId == 1)
                {
                    sessionByCharacterId.CharacterInfo.LocX = 2000;
                    sessionByCharacterId.CharacterInfo.LocY = 1100;
                    sessionByCharacterId.CharacterInfo.NewLocX = sessionByCharacterId.CharacterInfo.LocX;
                    sessionByCharacterId.CharacterInfo.NewLocY = sessionByCharacterId.CharacterInfo.LocY;
                    sessionByCharacterId.CharacterInfo.MapId = 1;
                }
                else if (sessionByCharacterId.CharacterInfo.FactionId == 2)
                {
                    sessionByCharacterId.CharacterInfo.LocX = 18500;
                    sessionByCharacterId.CharacterInfo.LocY = 1100;
                    sessionByCharacterId.CharacterInfo.NewLocX = sessionByCharacterId.CharacterInfo.LocX;
                    sessionByCharacterId.CharacterInfo.NewLocY = sessionByCharacterId.CharacterInfo.LocY;
                    sessionByCharacterId.CharacterInfo.MapId = 5;
                }
                else if (sessionByCharacterId.CharacterInfo.FactionId == 3)
                {
                    sessionByCharacterId.CharacterInfo.LocX = 19000;
                    sessionByCharacterId.CharacterInfo.LocY = 11300;
                    sessionByCharacterId.CharacterInfo.NewLocX = sessionByCharacterId.CharacterInfo.LocX;
                    sessionByCharacterId.CharacterInfo.NewLocY = sessionByCharacterId.CharacterInfo.LocY;
                    sessionByCharacterId.CharacterInfo.MapId = 9;
                }
                MapHandler.OpenPublicConnection(sessionByCharacterId, sessionByCharacterId.CharacterInfo.MapId, (PortalInfo)null);
            }
        }

        private static void finishMatch()
        {
            TeamDeathMatch.teams.Remove(TeamDeathMatch.Team1.getName());
            TeamDeathMatch.teams.Remove(TeamDeathMatch.Team2.getName());
            TeamDeathMatch.Team1 = null;
            TeamDeathMatch.Team2 = null;
            if (TeamDeathMatch.IsActive())
            {
                TeamDeathMatch.performSearching = new System.Threading.Timer(new TimerCallback(TeamDeathMatch.SearchTeam), (object)null, (int)0, 5000);
                TeamDeathMatch.performSearchingMsg = new System.Threading.Timer(new TimerCallback(TeamDeathMatch.SearchTeamMsg), (object)null, (int)0, 15000);
            }
        }

        public static bool IsActive()
        {
            return TeamDeathMatch.mIsActive;
        }

        public static bool CreateNewTeam(string name, Session creator)
        {
            if (TeamDeathMatch.teams.ContainsKey(name))
                return false;
            if (TeamDeathMatch.userTeam(creator) != null)
                return false;
            TeamDeathMatch.teams.Add(name, new TdmTeam(creator, name));
            return true;
        }

        public static string userTeam(Session user)
        {
            foreach (KeyValuePair<string, TdmTeam> entry in TeamDeathMatch.teams)
            {
                if (entry.Value.getMembers().Contains(user.CharacterId))
                {
                    return entry.Value.getName();
                }
            }
            return null;
        }

        public static bool JoinTeam(string name, Session joiner)
        {
            if (!TeamDeathMatch.teams.ContainsKey(name))
                return false;
            if (TeamDeathMatch.teams[name].countMembers() >= TeamDeathMatch.maxMember)
                return false;
            if (TeamDeathMatch.userTeam(joiner) != null)
                return false;
            TeamDeathMatch.teams[name].addMember(joiner.CharacterId);
            TeamDeathMatch.teams[name].displayChatMessage(joiner.CharacterInfo.Username + " joined the team. Number : " + TeamDeathMatch.teams[name].countMembers());
            return true;
        }

        public static bool LeaveTeam(string name, Session leaver)
        {
            if (!TeamDeathMatch.teams.ContainsKey(name))
                return false;
            if (!TeamDeathMatch.teams[name].hasMember(leaver.CharacterId))
                return false;
            TeamDeathMatch.teams[name].removeMember(leaver.CharacterId);
            if (TeamDeathMatch.teams[name].countMembers() <= 0)
                TeamDeathMatch.teams.Remove(name);
            else
                TeamDeathMatch.teams[name].displayChatMessage(leaver.CharacterInfo.Username + " left the team. Number : " + TeamDeathMatch.teams[name].countMembers());
            return true;
        }

        public static void Enable()
        {
            TeamDeathMatch.mIsActive = true;
            TeamDeathMatch.teams = new CDictionnary<string, TdmTeam>();
            if (TeamDeathMatch.performMatch == null)
            {
                TeamDeathMatch.Team1 = null;
                TeamDeathMatch.Team2 = null;
                TeamDeathMatch.performSearching = new System.Threading.Timer(new TimerCallback(TeamDeathMatch.SearchTeam), (object)null, (int)0, 5000);
                TeamDeathMatch.performSearchingMsg = new System.Threading.Timer(new TimerCallback(TeamDeathMatch.SearchTeamMsg), (object)null, (int)0, 15000);
            }
        }

        public static void Disable()
        {
            if (TeamDeathMatch.performSearching != null)
                TeamDeathMatch.performSearching.Dispose();
            if (TeamDeathMatch.performSearchingMsg != null)
                TeamDeathMatch.performSearchingMsg.Dispose();
            TeamDeathMatch.mIsActive = false;
            TeamDeathMatch.teams.Clear();
        }

        public static void removeUserFromTdm(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;
            string team = TeamDeathMatch.userTeam(Session);
            if (team == null)
                return;
            TeamDeathMatch.LeaveTeam(team, Session);
        }


    }
}
