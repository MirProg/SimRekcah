using System;
using System.Runtime.InteropServices;

namespace Rekcah.Core
{
    public static class UnrealBridge
    {
        private static RekcahMatch _activeMatch;

        // This attribute allows Unreal's C++ to call this C# function directly
        [UnmanagedCallersOnly(EntryPoint = "InitializeRekcah")]
        public static void InitializeRekcah()
        {
            _activeMatch = new RekcahMatch(new[] { "human", "aggressive", "balanced" });
            Console.WriteLine("C# Engine Initialized within Unreal Engine.");
        }

        [UnmanagedCallersOnly(EntryPoint = "GetPlayerHandValue")]
        public static int GetPlayerHandValue(int playerIndex)
        {
            if (_activeMatch == null) return 0;
            return _activeMatch.Players[playerIndex].HandValue;
        }

        [UnmanagedCallersOnly(EntryPoint = "PerformAction")]
        public static void PerformAction(int actionType)
        {
            // Logic to bridge Unreal input (actionType) to C# engine actions
            if (actionType == 1) _activeMatch.Show();
            else if (actionType == 2) _activeMatch.DrawFromStock();
        }
    }
}
