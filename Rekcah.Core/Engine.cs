using System;
using System.Collections.Generic;
using System.Linq;

namespace Rekcah.Core
{
    public enum GamePhase { Action, Draw, RoundOver, GameOver }

    public class RekcahMatch
    {
        public GameRules Rules { get; }
        public List<PlayerState> Players { get; }
        public int CurrentPlayerIndex { get; private set; }
        public GamePhase Phase { get; private set; }
        public Stack<Card> DrawPile { get; private set; }
        public List<Card> DiscardPile { get; private set; }
        public Card DrawnCard { get; private set; } // Note: In Discard-then-Draw, this is the card being picked up
        public int RoundNumber { get; private set; }
        public int TurnNumber { get; private set; }
        public PlayerState Winner { get; private set; }
        public List<string> Log { get; } = new List<string>();

        private Random _rng;

        public RekcahMatch(IEnumerable<string> agentIds, int? seed = null, GameRules rules = null)
        {
            Rules = rules ?? new GameRules();
            _rng = seed.HasValue ? new Random(seed.Value) : new Random();
            Players = agentIds.Select((id, index) => new PlayerState
            {
                Id = $"p{index}",
                Label = id == "human" ? "You" : $"Player {index + 1}",
                AgentId = id
            }).ToList();
            StartRound();
        }

        public void StartRound()
        {
            var active = Players.Where(p => !p.Eliminated).ToList();
            if (active.Count <= 1)
            {
                Winner = active.FirstOrDefault();
                Phase = GamePhase.GameOver;
                return;
            }

            RoundNumber++;
            TurnNumber = 1;
            
            var deckList = CreateDeckList();
            Shuffle(deckList);
            DrawPile = new Stack<Card>(deckList);

            foreach (var p in Players) p.Hand.Clear();

            for (int i = 0; i < Rules.StartingHandSize; i++)
            {
                foreach (var p in active)
                {
                    p.Hand.Add(DrawPile.Pop());
                }
            }

            DiscardPile = new List<Card> { DrawPile.Pop() };
            DrawnCard = null;
            
            CurrentPlayerIndex = Players.FindIndex(p => !p.Eliminated);
            Phase = GamePhase.Action;
            AddLog($"Round {RoundNumber} begins. {Players[CurrentPlayerIndex].Label} leads.");
        }

        private List<Card> CreateDeckList()
        {
            var deck = new List<Card>();
            foreach (Suit suit in Enum.GetValues(typeof(Suit)))
            {
                if (suit == Suit.Joker) continue;
                foreach (Rank rank in Enum.GetValues(typeof(Rank)))
                {
                    if (rank == Rank.Joker) continue;
                    deck.Add(new Card { Id = $"{rank}{suit}", Rank = rank, Suit = suit });
                }
            }
            deck.Add(new Card { Id = "Joker1", Rank = Rank.Joker, Suit = Suit.Joker });
            deck.Add(new Card { Id = "Joker2", Rank = Rank.Joker, Suit = Suit.Joker });
            return deck;
        }

        private void Shuffle<T>(IList<T> list)
        {
            int n = list.Count;
            while (n > 1)
            {
                n--;
                int k = _rng.Next(n + 1);
                T value = list[k];
                list[k] = list[n];
                list[n] = value;
            }
        }

        public void AddLog(string message)
        {
            Log.Insert(0, message);
            if (Log.Count > 100) Log.RemoveAt(Log.Count - 1);
        }

        public PlayerState CurrentPlayer => Players[CurrentPlayerIndex];

        public bool CanShow() => Phase == GamePhase.Action && CurrentPlayer.HandValue <= Rules.ShowThreshold;

        public void Show()
        {
            if (!CanShow()) throw new InvalidOperationException("Show is not legal at this time.");
            
            var caller = CurrentPlayer;
            var callerValue = caller.HandValue;
            var opponents = Players.Where(p => !p.Eliminated && p.Id != caller.Id).ToList();
            int lowestOpponent = opponents.Min(p => p.HandValue);
            bool success = callerValue < lowestOpponent;

            caller.Shows++;
            if (success) caller.SuccessfulShows++; else caller.FailedShows++;

            foreach (var p in Players.Where(p => !p.Eliminated))
            {
                int delta;
                if (p.Id == caller.Id)
                {
                    delta = success ? Rules.SuccessReward : (callerValue + Rules.FailedShowPenalty);
                }
                else
                {
                    delta = p.HandValue;
                }
                p.Score += delta;
            }

            var eliminated = Players.Where(p => !p.Eliminated && p.Score >= Rules.EliminationScore).ToList();
            foreach (var p in eliminated)
            {
                p.Eliminated = true;
                AddLog($"{p.Label} eliminated at {p.Score} points.");
            }

            AddLog($"{caller.Label} called show at {callerValue}. {(success ? "Success!" : "Failed.")}");
            
            if (Players.Count(p => !p.Eliminated) <= 1)
            {
                Winner = Players.FirstOrDefault(p => !p.Eliminated) ?? caller;
                Phase = GamePhase.GameOver;
            }
            else
            {
                Phase = GamePhase.RoundOver;
            }
        }

        public void Discard(IEnumerable<string> cardIds)
        {
            if (Phase != GamePhase.Action) throw new InvalidOperationException("Must be in action phase to discard.");
            
            var player = CurrentPlayer;
            var selected = cardIds.Select(id => player.Hand.FirstOrDefault(c => c.Id == id)).Where(c => c != null).ToList();

            if (selected.Count != cardIds.Count() || !IsValidDiscard(selected))
                throw new InvalidOperationException("Invalid discard group.");

            player.Hand = player.Hand.Where(c => !cardIds.Contains(c.Id)).ToList();
            
            foreach (var c in selected) DiscardPile.Add(c);
            
            Phase = GamePhase.Draw;
        }

        public void DrawFromStock()
        {
            if (Phase != GamePhase.Draw) throw new InvalidOperationException("Must be in draw phase.");
            if (DrawPile.Count == 0) ReshuffleDiscard();
            var card = DrawPile.Pop();
            CurrentPlayer.Hand.Add(card);
            AddLog($"{CurrentPlayer.Label} drew from stock.");
            AdvanceTurn();
        }

        public void DrawFromDiscard()
        {
            if (Phase != GamePhase.Draw) throw new InvalidOperationException("Must be in draw phase.");
            if (DiscardPile.Count == 0) throw new InvalidOperationException("Discard pile is empty.");
            var card = DiscardPile.Last();
            DiscardPile.RemoveAt(DiscardPile.Count - 1);
            CurrentPlayer.Hand.Add(card);
            AddLog($"{CurrentPlayer.Label} took {card} from discard.");
            AdvanceTurn();
        }

        private void AdvanceTurn()
        {
            do
            {
                CurrentPlayerIndex = (CurrentPlayerIndex + 1) % Players.Count;
            } while (Players[CurrentPlayerIndex].Eliminated);
            
            TurnNumber++;
            Phase = GamePhase.Action;
            DrawnCard = null;
        }

        private void ReshuffleDiscard()
        {
            var top = DiscardPile.Last();
            DiscardPile.RemoveAt(DiscardPile.Count - 1);
            var newStock = DiscardPile.ToList();
            Shuffle(newStock);
            DrawPile = new Stack<Card>(newStock);
            DiscardPile = new List<Card> { top };
            AddLog("Reshuffled discard pile into stock.");
        }

        public bool IsValidDiscard(List<Card> cards)
        {
            if (cards.Count == 0) return false;
            if (cards.Count == 1) return true;

            // Sets
            if (cards.All(c => c.Rank == cards[0].Rank)) return cards.Count >= 2;

            // Sequences
            if (cards.Count < Rules.MinSequence || cards.Count > Rules.MaxSequence) return false;
            if (cards.Any(c => c.Rank == Rank.Joker)) return false;
            if (cards.Any(c => c.Suit != cards[0].Suit)) return false;

            var ordered = cards.OrderBy(c => c.Rank).ToList();
            for (int i = 1; i < ordered.Count; i++)
            {
                if ((int)ordered[i].Rank != (int)ordered[i - 1].Rank + 1) return false;
            }
            return true;
        }
    }
}
