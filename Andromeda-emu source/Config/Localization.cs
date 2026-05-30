

using OrbitReborn_Emulator.Libs;
using System.IO;

namespace OrbitReborn_Emulator.Config
{
  public static class Localization
  {
    private static string mLangPath;
    private static CDictionnary<string, string> mLangData;

    public static string LangPath
    {
      get
      {
        return Localization.mLangPath;
      }
    }

    public static void Initialize(string LangPath)
    {
      Localization.mLangPath = LangPath;
      Localization.mLangData = new CDictionnary<string, string>();
      if (File.Exists(Localization.mLangPath))
        Localization.RetrieveValuesFromFile();
      else
        Output.WriteLine((object) ("Server translation file is missing at " + Localization.mLangPath + "."), OutputLevel.Warning);
    }

    private static void RetrieveValuesFromFile()
    {
      foreach (string readAllLine in File.ReadAllLines(Localization.mLangPath, Constants.DefaultEncoding))
      {
        if (!readAllLine.StartsWith("#") && readAllLine.Contains("="))
        {
          string[] strArray = readAllLine.Split('=');
          string lower = strArray[0].ToLower();
          string empty = string.Empty;
          for (int index = 1; index < strArray.Length; ++index)
          {
            if (index > 1)
              empty += (string) (object) '=';
            empty += strArray[index];
          }
          if (!Localization.mLangData.ContainsKey(lower))
            Localization.mLangData.Add(lower, empty);
          else
            Localization.mLangData[lower] = empty;
        }
      }
    }

    public static string GetValue(string Key, string Arg)
    {
      return Localization.GetValue(Key, new string[1]
      {
        Arg
      });
    }

    public static string GetValue(string Key, string[] Args = null)
    {
      if (Localization.mLangData == null || !Localization.mLangData.ContainsKey(Key))
        return Key;
      string str = Localization.mLangData[Key];
      if (Args != null)
      {
        for (int index = 0; index < Args.Length; ++index)
          str = str.Replace("%" + (object) index + "%", Args[index]);
      }
      return str.Replace("<br>", "\n");
    }
  }
}
