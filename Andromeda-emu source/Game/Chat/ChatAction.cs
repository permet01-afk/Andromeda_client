using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Sessions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Game.Handlers
{
    static class ChatAction
    {
        public static void AskDuel(string entered, Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            string[] command = entered.Split(' ');
            if (command.Length < 2)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- Use /duel [name_of_player].#"));
                return;
            }

            if (TeamDeathMatch.IsActive())
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- Duels are disabled during TDM.#"));
                return;
            }

            if (!_1v1.HasDuelMapAvailable())
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- Duel arenas are not available.#"));
                return;
            }

            if (Session.CharacterInfo.IsBeginner)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You cannot duel while you are a beginner.#"));
                return;
            }

            if (_1v1.IsOnMap(Session.CharacterInfo.MapId) || _1v1.IsCharacterInMatch(Session.CharacterId))
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You are already in a duel.#"));
                return;
            }

            double now = UnixTimestamp.GetCurrent();
            if (now - Session.CharacterInfo.LastDuel <= 60.0)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You did a duel less than 1 minute ago.#"));
                return;
            }

            Session user = SessionManager.GetSessionByUsernameChat(command[1].ToLower());
            if (user == null || user.CharacterInfo == null)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- This player does not exist or is offline.#"));
                return;
            }

            if (user.CharacterId == Session.CharacterId)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You cannot invite yourself.#"));
                return;
            }

            if (user.CharacterInfo.IsBeginner)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You cannot invite a beginner to a duel.#"));
                return;
            }

            if (_1v1.IsOnMap(user.CharacterInfo.MapId) || _1v1.IsCharacterInMatch(user.CharacterId))
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- This player is already in a duel.#"));
                return;
            }

            if (now - user.CharacterInfo.LastDuel <= 60.0)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- This player did a duel less than 1 minute ago.#"));
                return;
            }

            if (!_1v1.canMatch())
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- There is no free duel arena. Please wait and try again.#"));
                return;
            }

            if (Session.CharacterInfo.duelSend.ContainsKey(user.CharacterId) &&
                (UnixTimestamp.GetCurrent() - Session.CharacterInfo.duelSend[user.CharacterId]) <= 120.0)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You already sent an invitation to this player.#"));
                return;
            }

            Session.CharacterInfo.duelSend.Add(user.CharacterId, UnixTimestamp.GetCurrent());
            user.CharacterInfo.DuelPending = Session.CharacterId;
            user.SendData(PacketComposer.ComposeChat("dq%- You received a duel invitation from " + Session.CharacterInfo.Username + ".#"));
            user.SendData(PacketComposer.ComposeChat("dq%- Type /duel_accept to accept the duel.#"));
            Session.SendData(PacketComposer.ComposeChat("dq%- You invited " + user.CharacterInfo.Username + " to a duel.#"));
        }

        public static void DuelAccept(string entered, Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            if (TeamDeathMatch.IsActive())
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- Duels are disabled during TDM.#"));
                return;
            }

            if (!_1v1.HasDuelMapAvailable())
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- Duel arenas are not available.#"));
                Session.CharacterInfo.DuelPending = 0;
                return;
            }

            if (Session.CharacterInfo.DuelPending == 0)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You did not receive any duel invitation.#"));
                return;
            }

            if (_1v1.IsOnMap(Session.CharacterInfo.MapId) || _1v1.IsCharacterInMatch(Session.CharacterId))
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- You are already in a duel.#"));
                return;
            }

            Session user1 = SessionManager.GetSessionByCharacterId(Session.CharacterInfo.DuelPending);
            if (user1 == null || user1.CharacterInfo == null)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- The sender of the duel is disconnected.#"));
                Session.CharacterInfo.DuelPending = 0;
                return;
            }

            if (_1v1.IsOnMap(user1.CharacterInfo.MapId) || _1v1.IsCharacterInMatch(user1.CharacterId))
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- The sender is already in a duel.#"));
                Session.CharacterInfo.DuelPending = 0;
                return;
            }

            if (!user1.CharacterInfo.duelSend.ContainsKey(Session.CharacterId)
                || (UnixTimestamp.GetCurrent() - user1.CharacterInfo.duelSend[Session.CharacterId]) >= 120.0)
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- Invitation from " + user1.CharacterInfo.Username + " has expired.#"));
                Session.CharacterInfo.DuelPending = 0;
                user1.CharacterInfo.duelSend.Remove(Session.CharacterId);
                return;
            }

            if (!_1v1.canMatch())
            {
                Session.SendData(PacketComposer.ComposeChat("dq%- There is no free duel arena. Please wait and try again.#"));
                return;
            }

            string msgduel = "You accepted the duel from " + user1.CharacterInfo.Username + "! Prepare!";
            Session.SendData(PacketComposer.ComposeChat("dq%- " + msgduel + "#"));
            user1.SendData(PacketComposer.Compose("A", "STD|" + Session.CharacterInfo.Username + " accepted your duel! Prepare!"));

            _1v1.initMatch(Session.CharacterId, Session.CharacterInfo.DuelPending);
            user1.CharacterInfo.duelSend.Remove(Session.CharacterId);
            Session.CharacterInfo.DuelPending = 0;
        }
    }
}
