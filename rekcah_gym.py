import clr
import os
import sys

# Path to the C# DLL
DLL_PATH = os.path.abspath("./Rekcah.Core/bin/Debug/net8.0/Rekcah.Core.dll")
if not os.path.exists(DLL_PATH):
    print(f"Warning: DLL not found at {DLL_PATH}. Please build the Rekcah.Core project first.")

try:
    clr.AddReference(DLL_PATH)
    from Rekcah.Core import RekcahMatch, GameRules
except Exception as e:
    print(f"Error loading Rekcah.Core: {e}")

class RekcahEnv:
    """
    A Python wrapper for the C# Rekcah Engine.
    Designed for integration with PyTorch/RLlib.
    """
    def __init__(self, agent_ids=["human", "aggressive", "balanced"]):
        self.match = RekcahMatch(agent_ids)
        
    def reset(self):
        self.match.StartRound()
        return self._get_obs()

    def step(self, action):
        # action is an integer mapping to show, discard, draw, etc.
        # This would bridge to the match.Show(), match.Discard(), etc.
        pass

    def _get_obs(self):
        # Convert C# state to a numpy array for PyTorch
        player = self.match.CurrentPlayer
        return [player.HandValue, player.Score, self.match.TurnNumber]

if __name__ == "__main__":
    env = RekcahEnv()
    print(f"Environment Initialized. Current Hand Value: {env.reset()[0]}")
