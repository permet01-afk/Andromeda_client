

namespace OrbitReborn_Emulator.Game.Characters
{
  public class CharacterConfig
  {
    private int mShield;
    private int mMaxShield;
    private int mShipSpeed;
    private int mDamages;

    public int Shield
    {
      get
      {
        return this.mShield;
      }
      set
      {
        this.mShield = value;
      }
    }

    public int MaxShield
    {
      get
      {
        return this.mMaxShield;
      }
      set
      {
        this.mMaxShield = value;
      }
    }

    public int ShipSpeed
    {
      get
      {
        return this.mShipSpeed;
      }
      set
      {
        this.mShipSpeed = value;
      }
    }

    public int MinDamage
    {
      get
      {
        return this.mDamages;
      }
      set
      {
        this.mDamages = value;
      }
    }

    public int MaxDamage
    {
      get
      {
        return this.mDamages;
      }
      set
      {
        this.mDamages = value;
      }
    }

    public CharacterConfig(int Shield, int MaxShield, int ShipSpeed, int Damages)
    {
      this.mShield = Shield;
      this.mMaxShield = MaxShield;
      this.mShipSpeed = ShipSpeed;
      this.mDamages = Damages;
    }
  }
}
