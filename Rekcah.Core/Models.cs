using System;
using System.Collections.Generic;
using System.Linq;

namespace Rekcah.Core
{
    public enum Suit { Hearts, Diamonds, Clubs, Spades, Joker }

    public enum Rank
    {
        Ace = 1, Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Jack, Queen, King, Joker = 99
    }

    public class Card
    {
        public string Id { get; set; }
        public Rank Rank { get; set; }
        public Suit Suit { get; set; }
        public int Value => GetValue();

        private int GetValue()
        {
            if (Rank == Rank.Joker) return -1;
            if (Rank >= Rank.Ten && Rank <= Rank.King) return 10;
            return (int)Rank;
        }

        public override string ToString() => Rank == Rank.Joker ? "Joker" : $"{Rank} of {Suit}";
    }

    public class PlayerState
    {
        public string Id { get; set; }
        public string Label { get; set; }
        public string AgentId { get; set; }
        public int Score { get; set; }
        public List<Card> Hand { get; set; } = new List<Card>();
        public bool Eliminated { get; set; }
        public int Shows { get; set; }
        public int SuccessfulShows { get; set; }
        public int FailedShows { get; set; }

        public int HandValue => Hand.Sum(c => c.Value);
    }

    public class GameRules
    {
        public int ShowThreshold { get; set; } = 15;
        public int SuccessReward { get; set; } = -5;
        public int FailedShowPenalty { get; set; } = 15;
        public int EliminationScore { get; set; } = 100;
        public int StartingHandSize { get; set; } = 6;
        public int MinSequence { get; set; } = 4;
        public int MaxSequence { get; set; } = 5;
    }
}
