

using System;

namespace OrbitReborn_Emulator.Communication
{
    public class ClientMessage
    {
        private string mHeader;
        private string mPacket;
        private string mtmpPacket;
        private string[] mSplittedPacket;

        public string Header
        {
            get { return this.mHeader; }
        }

        public string Packet
        {
            get { return this.mPacket; }
        }

        public ClientMessage(string _Data)
        {
            this.mPacket = _Data;
            this.mPacket = this.mPacket.Replace("\n", string.Empty).Replace("\0", string.Empty);
            this.mtmpPacket = this.mPacket;

            this.mSplittedPacket = this.mtmpPacket.Split(new char[3] { '|', '%', '@' });

            this.mHeader = this.mSplittedPacket[0];
            this.mHeader = this.Header.Replace("\r", string.Empty).Replace("\n", string.Empty).Replace("\0", string.Empty);
        }

        public int GetNextInt(int index)
        {
            try
            {
                int result;
                if (this.mSplittedPacket.Length > index && int.TryParse(this.mSplittedPacket[index], out result))
                    return result;
                return 0;
            }
            catch (Exception ex)
            {
                Output.WriteLine((object)("[INCOMING PACKET] Error while getting next int!\n\n" + ex.StackTrace), OutputLevel.CriticalError);
                return 0;
            }
        }

        public string GetNextString(int index)
        {
            try
            {
                if (this.mSplittedPacket.Length > index)
                    return this.mSplittedPacket[index];
                return "";
            }
            catch (Exception ex)
            {
                Output.WriteLine((object)("[INCOMING PACKET] Error while getting next string!\n\n" + ex.StackTrace), OutputLevel.CriticalError);
                return "";
            }
        }

        public override string ToString()
        {
            return this.mPacket;
        }
    }
}