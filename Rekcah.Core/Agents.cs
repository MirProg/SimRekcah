using System;
using System.Collections.Generic;
using System.Linq;

namespace Rekcah.Core
{
    public interface IAgent
    {
        string Id { get; }
        bool ShouldShow(RekcahMatch match, PlayerState player);
        bool ShouldTakeDiscard(RekcahMatch match, PlayerState player, Card topDiscard);
        List<Card> ChooseDiscard(RekcahMatch match, PlayerState player, List<Card> availableCards);
    }

    public abstract class BaseAgent : IAgent
    {
        public abstract string Id { get; }
        public abstract bool ShouldShow(RekcahMatch match, PlayerState player);
        public abstract bool ShouldTakeDiscard(RekcahMatch match, PlayerState player, Card topDiscard);

        public virtual List<Card> ChooseDiscard(RekcahMatch match, PlayerState player, List<Card> availableCards)
        {
            // Simple logic: discard the highest value card that isn't part of a potential set/sequence
            // For now, just return the highest value card
            return new List<Card> { availableCards.OrderByDescending(c => c.Value).First() };
        }
    }

    public class AggressiveAgent : BaseAgent
    {
        public override string Id => "aggressive";
        public override bool ShouldShow(RekcahMatch match, PlayerState player) => player.HandValue <= match.Rules.ShowThreshold;
        public override bool ShouldTakeDiscard(RekcahMatch match, PlayerState player, Card topDiscard) => topDiscard.Value <= 5;
    }

    public class BalancedAgent : BaseAgent
    {
        public override string Id => "balanced";
        public override bool ShouldShow(RekcahMatch match, PlayerState player)
        {
            int turn = match.TurnNumber / match.Players.Count(p => !p.Eliminated);
            if (turn <= 2) return player.HandValue <= match.Rules.ShowThreshold;
            if (turn <= 5) return player.HandValue <= 10;
            return player.HandValue <= 5;
        }
        public override bool ShouldTakeDiscard(RekcahMatch match, PlayerState player, Card topDiscard) => topDiscard.Value <= 3;
    }
}
