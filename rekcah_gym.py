import clr
import os
import sys
import httpx
import json

# 9router Configuration (Local AI Proxy)
ROUTER_ENDPOINT = "http://localhost:20128/v1/chat/completions"

# Path to the C# DLL
DLL_PATH = os.path.abspath("./Rekcah.Core/bin/Debug/net8.0/Rekcah.Core.dll")
if not os.path.exists(DLL_PATH):
    # Try alternative path for runtime
    DLL_PATH = os.path.abspath("./native/bin/Debug/net8.0-windows/Rekcah.Core.dll")

try:
    clr.AddReference(DLL_PATH)
    from Rekcah.Core import RekcahMatch, GameRules
except Exception as e:
    print(f"Error loading Rekcah.Core: {e}")

class RekcahEnv:
    def __init__(self, agent_ids=["aggressive", "conservative", "balanced", "threshold_aware"]):
        self.match = RekcahMatch(agent_ids)
        
    def reset(self):
        self.match.StartRound()
        return self._get_obs()

    def get_ai_insight(self, prompt):
        """
        Query the local 9router AI proxy for strategic analysis.
        9router handles fallback chains and token compression.
        """
        try:
            payload = {
                "model": "qwen2.5:7b-instruct", # Default research model
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2
            }
            response = httpx.post(ROUTER_ENDPOINT, json=payload, timeout=30.0)
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"9router Link Error: {e}"

    def _get_obs(self):
        player = self.match.CurrentPlayer
        return {
            "hand_value": player.HandValue,
            "score": player.Score,
            "turn": self.match.TurnNumber,
            "phase": str(self.match.Phase)
        }

if __name__ == "__main__":
    env = RekcahEnv()
    obs = env.reset()
    print(f"Industrial Environment Live: {obs}")
    
    # Test 9router Link
    insight = env.get_ai_insight("Explain the strategic risk of a 15-point show in Rekcah.")
    print(f"9router Insight: {insight}")
