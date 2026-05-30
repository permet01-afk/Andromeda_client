

using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Specialized;

namespace OrbitReborn_Emulator.Game.Maps
{
  public class MapActor
  {
    private int mId;
    private int mReferenceId;
    private int mReferenceSessionId;
    private object mReferenceObject;
    private MapActorType mType;
    private MapInstance mInstance;
    private Vector2 mPosition;
    private int mIdleTime;
    private bool mIsSleeping;
    private object mMovementSyncRoot;

    public int Id
    {
      get
      {
        return this.mId;
      }
    }

    public int ReferenceSessionId
    {
      get
      {
        return this.mReferenceSessionId;
      }
    }

    public int ReferenceId
    {
      get
      {
        return this.mReferenceId;
      }
    }

    public object ReferenceObject
    {
      get
      {
        return this.mReferenceObject;
      }
    }

    public MapActorType Type
    {
      get
      {
        return this.mType;
      }
    }

    public bool IsBot
    {
      get
      {
        return this.mType != MapActorType.UserCharacter;
      }
    }

    public string Name
    {
      get
      {
        return ((CharacterInfo) this.mReferenceObject).Username;
      }
    }

    public Vector2 Position
    {
      get
      {
        return this.mPosition;
      }
      set
      {
        this.mPosition = value;
      }
    }

    public int IdleTime
    {
      get
      {
        return this.mIdleTime;
      }
    }

    public bool IsSleeping
    {
      get
      {
        return this.mIsSleeping;
      }
    }

    public MapActor(int Id, MapActorType Type, int ReferenceSessionId, int ReferenceId, object ReferenceObject, Vector2 Position, MapInstance Instance)
    {
      this.mId = Id;
      this.mType = Type;
      this.mReferenceSessionId = ReferenceSessionId;
      this.mReferenceId = ReferenceId;
      this.mReferenceObject = ReferenceObject;
      this.mPosition = Position;
      this.mInstance = Instance;
      this.mMovementSyncRoot = new object();
    }

    public static MapActor TryCreateActor(int Id, MapActorType Type, int ReferenceSessionId, int ReferenceId, object ReferenceObject, Vector2 Position, MapInstance Instance)
    {
      if (ReferenceObject == null)
        return (MapActor) null;
      return new MapActor(Id, Type, ReferenceSessionId, ReferenceId, ReferenceObject, Position, Instance);
    }

    public void IncreaseIdleTime()
    {
      ++this.mIdleTime;
      if (this.IsSleeping || this.mIdleTime < 50)
        return;
      this.mIsSleeping = true;
    }

    public void Unidle()
    {
      this.mIdleTime = 0;
      if (!this.mIsSleeping)
        return;
      this.mIsSleeping = false;
    }
  }
}
