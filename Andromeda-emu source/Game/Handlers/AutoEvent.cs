using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Game.Handlers
{
    class AutoEvent
    {

        private List<Timer> eventTimers;


        AutoEvent()
        {
            this.eventTimers = new List<Timer>();
        }

        public void Initialize()
        {
            List<Event> events = this.loadEvent();
            if (events == null)
            {
                return;
            }
        }

        private List<Timer> createTimersList(List<Event> events)
        {
            List<Timer> timers = new List<Timer>();
            return null;
        }

        private Timer createTimerbyEvent(Event e)
        {
            DateTime now = DateTime.Now;
            DateTime dateTime = DateTime.Today;
            dateTime = dateTime.AddHours(e.hours);
            double totalMilliseconds = (dateTime.TimeOfDay - now.TimeOfDay).TotalMilliseconds;
            switch (e.type)
            {
                case "hh":
                    return new Timer(new TimerCallback(this.HhTimer), (object)null, (long)totalMilliseconds, 0);
                case "inv":
                    return new Timer(new TimerCallback(this.InvTimer), (object)null, (long)totalMilliseconds, 0);
                default:
                    return null;
            }
        }

        private List<Event> loadEvent()
        {
            int day = this.convertDayToInt(new DateTime().DayOfWeek.ToString());
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("day", day);
                DataRowCollection dataRows = client.ExecuteQueryRows("SELECT * from event WHERE event_day = @day");
                if (dataRows == null)
                {
                    return null;
                }
                List<Event> events = new List<Event>();
                foreach (DataRow data in dataRows)
                {
                    events.Add(new Event((int)data["event_hours"], (string)data["event_type"]));
                }
                return events;
            }
        }

        private int convertDayToInt(string day)
        {
            switch (day.ToLower())
            {
                case "monday":
                    return 1;
                case "tuesday":
                    return 2;
                case "wednesday":
                    return 3;
                case "thursday":
                    return 4;
                case "friday":
                    return 5;
                case "saturday":
                    return 6;
                case "sunday":
                    return 7;
                default: return 0;
            }
        }

        private void InvTimer(object state)
        {
            if (!Invasion.Active)
                Invasion.StartInvasion();

        }

        private void HhTimer(object state)
        {
            HappyHour.Enabled = true;
        }
    }

    class Event
    {
        public int hours;
        public string type;

        public Event(int hours, string type)
        {
            this.hours = hours;
            this.type = type;
        }
    }
}
