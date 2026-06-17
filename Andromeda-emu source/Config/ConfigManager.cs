

using OrbitReborn_Emulator.Libs;
using System.Collections.Generic;
using System.Net;

namespace OrbitReborn_Emulator.Config
{
  public static class ConfigManager
  {
    private static string mConfigPath;
    private static CDictionnary<string, ConfigElement> mConfigData;

    public static string ConfigPath
    {
      get
      {
        return ConfigManager.mConfigPath;
      }
    }

    public static void Initialize(string ConfigPath)
    {
      ConfigManager.mConfigPath = ConfigPath;
      ConfigManager.mConfigData = new CDictionnary<string, ConfigElement>();
      ConfigManager.mConfigData.Add("output.enablelogfiles", new ConfigElement("output.enablelogfiles", ConfigElementType.Boolean, (object) true));
      ConfigManager.mConfigData.Add("output.verbositylevel", new ConfigElement("output.verbositylevel", ConfigElementType.Integer, (object) -1));
      ConfigManager.mConfigData.Add("performance.profiling.enabled", new ConfigElement("performance.profiling.enabled", ConfigElementType.Boolean, (object) false));
      ConfigManager.mConfigData.Add("performance.sql.wait.warn.ms", new ConfigElement("performance.sql.wait.warn.ms", ConfigElementType.Integer, (object) 100));
      ConfigManager.mConfigData.Add("performance.timer.warn.ms", new ConfigElement("performance.timer.warn.ms", ConfigElementType.Integer, (object) 100));
      ConfigManager.mConfigData.Add("performance.timer.callback.warn.ms", new ConfigElement("performance.timer.callback.warn.ms", ConfigElementType.Integer, (object) 50));
      ConfigManager.mConfigData.Add("performance.reward.warn.ms", new ConfigElement("performance.reward.warn.ms", ConfigElementType.Integer, (object) 250));
      ConfigManager.mConfigData.Add("performance.logwrite.warn.ms", new ConfigElement("performance.logwrite.warn.ms", ConfigElementType.Integer, (object) 100));
      ConfigManager.mConfigData.Add("performance.system.sample.seconds", new ConfigElement("performance.system.sample.seconds", ConfigElementType.Integer, (object) 30));
      ConfigManager.mConfigData.Add("performance.network.warn.bytes.per.sec", new ConfigElement("performance.network.warn.bytes.per.sec", ConfigElementType.Integer, (object) 0));
      ConfigManager.mConfigData.Add("performance.serverstall.warn.ms", new ConfigElement("performance.serverstall.warn.ms", ConfigElementType.Integer, (object) 300));
      ConfigManager.mConfigData.Add("performance.serverstall.probe.ms", new ConfigElement("performance.serverstall.probe.ms", ConfigElementType.Integer, (object) 150));
      ConfigManager.mConfigData.Add("performance.serverstall.log.throttle.ms", new ConfigElement("performance.serverstall.log.throttle.ms", ConfigElementType.Integer, (object) 1000));
      ConfigManager.mConfigData.Add("performance.map.warn.ms", new ConfigElement("performance.map.warn.ms", ConfigElementType.Integer, (object) 50));
      ConfigManager.mConfigData.Add("performance.cleanup.warn.ms", new ConfigElement("performance.cleanup.warn.ms", ConfigElementType.Integer, (object) 50));
      ConfigManager.mConfigData.Add("mysql.pool.min", new ConfigElement("mysql.pool.min", ConfigElementType.Integer, (object) 5));
      ConfigManager.mConfigData.Add("mysql.pool.max", new ConfigElement("mysql.pool.max", ConfigElementType.Integer, (object) 20));
      ConfigManager.mConfigData.Add("mysql.pool.lifetime", new ConfigElement("mysql.pool.lifetime", ConfigElementType.Integer, (object) 10));
      ConfigManager.mConfigData.Add("mysql.user", new ConfigElement("mysql.user", ConfigElementType.Text, (object) "root"));
      ConfigManager.mConfigData.Add("mysql.pass", new ConfigElement("mysql.pass", ConfigElementType.Text, (object)"lefaucheuristheking123"));
      ConfigManager.mConfigData.Add("mysql.host", new ConfigElement("mysql.host", ConfigElementType.Text, (object) "127.0.0.1"));
      ConfigManager.mConfigData.Add("mysql.port", new ConfigElement("mysql.port", ConfigElementType.Integer, (object) 3306));
      ConfigManager.mConfigData.Add("mysql.dbname", new ConfigElement("mysql.port", ConfigElementType.Text, (object) "andromeda"));
      ConfigManager.mConfigData.Add("net.backlog", new ConfigElement("net.backlog", ConfigElementType.Integer, (object) 50));
      ConfigManager.mConfigData.Add("net.bind.ip", new ConfigElement("net.bind.ip", ConfigElementType.IpAddress, (object) IPAddress.Any));
      ConfigManager.mConfigData.Add("net.bind.port", new ConfigElement("net.bind.port", ConfigElementType.Integer, (object) 8080));
      ConfigManager.mConfigData.Add("debug.sso", new ConfigElement("debug.sso", ConfigElementType.Text, (object) string.Empty));
      ConfigManager.mConfigData.Add("lang", new ConfigElement("lang", ConfigElementType.Text, (object) "en"));
      if (System.IO.File.Exists(ConfigManager.mConfigPath))
      {
        ConfigManager.RetrieveValuesFromFile();
        foreach (ConfigElement configElement in (IEnumerable<ConfigElement>) ConfigManager.mConfigData.Values)
        {
          if (!configElement.UserConfigured)
            Output.WriteLine((object) ("Configuration value '" + configElement.Key.ToLower() + "' missing; using default value."), OutputLevel.Warning);
        }
      }
      else
        Output.WriteLine((object) ("Configuration file is missing at " + ConfigManager.mConfigPath + "; using default values."), OutputLevel.Warning);
    }

    private static void RetrieveValuesFromFile()
    {
      foreach (string readAllLine in System.IO.File.ReadAllLines(ConfigManager.mConfigPath, Constants.DefaultEncoding))
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
          if (ConfigManager.mConfigData.ContainsKey(lower))
            ConfigManager.mConfigData[lower].CurrentValue = (object) empty;
        }
      }
    }

    public static object GetValue(string Key)
    {
      if (ConfigManager.mConfigData == null || !ConfigManager.mConfigData.ContainsKey(Key))
        throw new KeyNotFoundException();
      return ConfigManager.mConfigData[Key].CurrentValue;
    }
  }
}
