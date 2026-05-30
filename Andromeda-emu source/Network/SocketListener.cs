// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Network.SocketListener
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using System;
using System.Net;
using System.Net.Sockets;

namespace OrbitReborn_Emulator.Network
{
    public class SocketListener : IDisposable
    {
        private Socket mSocket;
        private OnNewConnectionCallback mCallback;

        public SocketListener(IPEndPoint LocalEndpoint, int Backlog, OnNewConnectionCallback Callback)
        {
            this.mCallback = Callback;
            this.mSocket = new Socket(LocalEndpoint.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            this.mSocket.Bind((EndPoint)LocalEndpoint);
            this.mSocket.Listen(Backlog);
            this.mSocket.Blocking = false;
            this.BeginAccept();
        }

        public void Dispose()
        {
            if (this.mSocket == null)
                return;
            this.mSocket.Dispose();
            this.mSocket = (Socket)null;
        }

        private void BeginAccept()
        {
            try
            {
                this.mSocket.BeginAccept(new AsyncCallback(this.OnAccept), (object)null);
            }
            catch (Exception)
            {
            }
        }

        private void OnAccept(IAsyncResult Result)
        {
            try
            {
                this.mCallback(this.mSocket.EndAccept(Result));
            }
            catch (Exception)
            {
            }
            this.BeginAccept();
        }
    }
}


