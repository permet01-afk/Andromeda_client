using OrbitReborn_Emulator.Game.Npcs;
using System.Threading;

namespace OrbitReborn_Emulator.Game.GalaxyGates
{
    // ANDROMEDA ADAPTATION: one principal bound to its assigned escort group.
    // The count includes pending spawn batches, so an unspawned escort cannot unlock ISH.
    public sealed class GalaxyGateProtection
    {
        private int remaining;
        public Npc Principal;
        public GalaxyGateProtection(int escortCount) { remaining = escortCount; }
        public bool IsProtected { get { return Volatile.Read(ref remaining) > 0; } }
        public int Remaining { get { return Volatile.Read(ref remaining); } }
        internal bool EscortDestroyed() { return Interlocked.Decrement(ref remaining) == 0; }
    }
}
