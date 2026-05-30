using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Util
{
    class GeneralFunctions
    {
        public static string ToEnum(bool isTrue)
        {
            return !isTrue ? "0" : "1";
        }
    }
}
