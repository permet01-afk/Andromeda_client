

using System.Net;

namespace OrbitReborn_Emulator.Config
{
  public class ConfigElement
  {
    private string mKey;
    private ConfigElementType mType;
    private object mCurrentValue;
    private bool mUserConfigured;

    public string Key
    {
      get
      {
        return this.mKey;
      }
    }

    public ConfigElementType Type
    {
      get
      {
        return this.mType;
      }
    }

    public object CurrentValue
    {
      get
      {
        return this.mCurrentValue;
      }
      set
      {
        string str = value.ToString();
        switch (this.mType)
        {
          case ConfigElementType.Boolean:
            this.mCurrentValue = (object) false;
            if (str == "1" || str.ToLower() == "true")
            {
              this.mCurrentValue = (object) true;
              break;
            }
            break;
          case ConfigElementType.Integer:
            int result = 0;
            int.TryParse(str, out result);
            this.mCurrentValue = (object) result;
            break;
          case ConfigElementType.IpAddress:
            IPAddress address = IPAddress.Any;
            IPAddress.TryParse(str, out address);
            this.mCurrentValue = (object) address;
            break;
          default:
            this.mCurrentValue = (object) str;
            break;
        }
        this.mUserConfigured = true;
      }
    }

    public bool UserConfigured
    {
      get
      {
        return this.mUserConfigured;
      }
    }

    public ConfigElement(string Key, ConfigElementType Type, object DefaultValue)
    {
      this.mKey = Key;
      this.mType = Type;
      this.CurrentValue = DefaultValue;
      this.mUserConfigured = false;
    }
  }
}
