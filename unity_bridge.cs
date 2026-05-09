using UnityEngine;
using Rekcah.Core;
using System.Collections.Generic;
using System.Linq;

public class RekcahUnityManager : MonoBehaviour
{
    private RekcahMatch _match;
    public string[] agents = { "human", "aggressive", "balanced", "threshold" };

    void Start()
    {
        // Initialize the portable C# core engine
        _match = new RekcahMatch(agents);
        Debug.Log("Rekcah Engine Initialized in Unity.");
        UpdateVisuals();
    }

    void Update()
    {
        // Example: Press Space to perform AI turn or process logic
        if (Input.GetKeyDown(KeyCode.Space))
        {
            if (_match.Phase == GamePhase.Action || _match.Phase == GamePhase.Draw)
            {
                PerformStep();
            }
        }
    }

    void PerformStep()
    {
        var player = _match.CurrentPlayer;
        if (player.AgentId == "human") return;

        // Use the same logic as our WPF app
        if (_match.Phase == GamePhase.Action)
        {
            // AI Discards
            var cardToDiscard = player.Hand.OrderByDescending(c => c.Value).First();
            _match.Discard(new[] { cardToDiscard.Id });
        }
        else if (_match.Phase == GamePhase.Draw)
        {
            if (_match.CanShow()) _match.Show();
            else _match.DrawFromStock();
        }

        UpdateVisuals();
    }

    void UpdateVisuals()
    {
        // Here you would spawn/animate card prefabs
        Debug.Log($"Current Phase: {_match.Phase}, Player: {_match.CurrentPlayer.Label}");
        foreach (var p in _match.Players)
        {
            Debug.Log($"{p.Label}: {p.HandValue} pts ({p.Hand.Count} cards)");
        }
    }
}
