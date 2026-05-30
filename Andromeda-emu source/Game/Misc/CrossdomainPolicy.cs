

using OrbitReborn_Emulator.Config;
using System;
using System.IO;
using System.Text;

namespace OrbitReborn_Emulator.Game.Misc
{
  public static class CrossdomainPolicy
  {
    private static string mPolicyText;

    public static string PolicyText
    {
      get
      {
        return CrossdomainPolicy.mPolicyText;
      }
    }

    public static void Initialize(string Path)
    {
      if (!File.Exists(Path))
        throw new ArgumentException("Crossdomain policy file not found at: " + Path + ".");
      CrossdomainPolicy.mPolicyText = File.ReadAllText(Path);
    }

    public static byte[] GetBytes()
    {
      return CrossdomainPolicy.GetBytes(Constants.DefaultEncoding);
    }

    public static byte[] GetBytes(Encoding Encoding)
    {
      return Encoding.GetBytes(CrossdomainPolicy.mPolicyText);
    }
  }
}
