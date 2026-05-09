using UnityEngine;
using Rekcah.Core;
using System.Collections.Generic;

public class RekcahManager : MonoBehaviour
{
    private RekcahMatch _match;
    public GameObject cardPrefab;
    public Transform[] playerPositions;
    
    void Start()
    {
        // Initialize the Industrial C# Core
        _match = new RekcahMatch(new[] { "human", "aggressive", "balanced" });
        Debug.Log("Rekcah Core Engine Linked to Unity.");
        
        InitializeVisuals();
    }

    void InitializeVisuals()
    {
        // Spawn 3D card prefabs based on the C# engine state
        foreach (var player in _match.Players)
        {
            Debug.Log($"Spawning cards for {player.Label}");
            // Integration with Unity 3D Physics and Niagara would happen here
        }
    }

    public void OnPlayerDiscard(string[] cardIds)
    {
        _match.Discard(cardIds);
        UpdateUI();
    }

    void UpdateUI()
    {
        // Smoothly animate cards using Unity's DOTween or similar
    }
}
