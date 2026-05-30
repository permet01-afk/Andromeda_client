

using System.Collections.Generic;
using System.Text;

namespace OrbitReborn_Emulator.Communication
{
    public class ServerMessage
    {
        private static readonly byte[] SeparatorPipe = new byte[1]
        {
      (byte)124
        };
        private static readonly byte[] SeparatorNull = new byte[1]
        {
      (byte)0
        };
        private static readonly byte[] SeparatorPercent = new byte[1]
        {
      (byte)37
        };
        private static readonly byte[] SeparatorAt = new byte[1]
        {
      (byte)64
        };
        private List<byte> Message;

        public ServerMessage()
        {
            this.Message = new List<byte>();
        }

        public void AppendShort(string _Sign)
        {
            try
            {
                this.AppendDeltas(Encoding.UTF8.GetBytes(_Sign));
            }
            catch
            {
            }
        }

        public void AppendShortChat(string _Sign)
        {
            try
            {
                this.AppendDeltasChatMSG(Encoding.UTF8.GetBytes(_Sign));
            }
            catch
            {
            }
        }

        public void Append(int _Number)
        {
            try
            {
                this.AppendDeltas(Encoding.UTF8.GetBytes(_Number.ToString()));
            }
            catch
            {
            }
        }

        public void Append(string _String)
        {
            try
            {
                this.AppendDeltas(Encoding.UTF8.GetBytes(_String));
            }
            catch
            {
            }
        }

        public void LastAppend(string _String)
        {
            try
            {
                this.LastAppendDeltas(Encoding.UTF8.GetBytes(_String));
            }
            catch
            {
            }
        }

        public void AppendBreak()
        {
            this.Message.AddRange((IEnumerable<byte>)ServerMessage.SeparatorNull);
        }

        public void AppendChatMSG(string _String)
        {
            try
            {
                this.AppendDeltasChatMSG(Encoding.UTF8.GetBytes(_String));
            }
            catch
            {
            }
        }

        public void AppendChatATRIBUTE(string _String)
        {
            try
            {
                this.AppendDeltasChatATRIBUTE(Encoding.UTF8.GetBytes(_String));
            }
            catch
            {
            }
        }

        public void AppendChatPARAM(string _String)
        {
            try
            {
                this.AppendDeltasChatPARAM(Encoding.UTF8.GetBytes(_String));
            }
            catch
            {
            }
        }

        private void AppendDeltas(byte[] _Byte)
        {
            this.Message.AddRange((IEnumerable<byte>)_Byte);
            this.Message.AddRange((IEnumerable<byte>)ServerMessage.SeparatorPipe);
        }

        private void LastAppendDeltas(byte[] _Byte)
        {
            this.Message.AddRange((IEnumerable<byte>)_Byte);
        }

        private void AppendDeltasChatMSG(byte[] _Byte)
        {
            this.Message.AddRange((IEnumerable<byte>)_Byte);
            this.Message.AddRange((IEnumerable<byte>)ServerMessage.SeparatorPercent);
        }

        private void AppendDeltasChatATRIBUTE(byte[] _Byte)
        {
            this.Message.AddRange((IEnumerable<byte>)_Byte);
            this.Message.AddRange((IEnumerable<byte>)ServerMessage.SeparatorPipe);
        }

        private void AppendDeltasChatPARAM(byte[] _Byte)
        {
            this.Message.AddRange((IEnumerable<byte>)_Byte);
            this.Message.AddRange((IEnumerable<byte>)ServerMessage.SeparatorAt);
        }

        public byte[] ToDeltas()
        {
            int sourceCount = this.Message.Count;
            int payloadCount = sourceCount > 0 ? sourceCount - 1 : 0;
            byte[] buffer = new byte[payloadCount + 1];

            if (payloadCount > 0)
                this.Message.CopyTo(0, buffer, 0, payloadCount);

            buffer[payloadCount] = 0;
            return buffer;
        }


        public override string ToString()
        {
            return Encoding.UTF8.GetString(this.ToDeltas());
        }
    }
}