using System;
using System.Collections.Generic;
using System.Linq;
using TorchSharp;
using static TorchSharp.torch;
using static TorchSharp.torch.nn;
using Tensor = TorchSharp.torch.Tensor;

namespace Rekcah.Core
{
    public class RekcahNet : Module<Tensor, Tensor>
    {
        private readonly Module<Tensor, Tensor> _layers;

        public RekcahNet(int inputSize, int hiddenSize, int outputSize) : base("RekcahNet")
        {
            _layers = Sequential(
                Linear(inputSize, hiddenSize),
                ReLU(),
                Linear(hiddenSize, hiddenSize),
                ReLU(),
                Linear(hiddenSize, outputSize)
            );
            RegisterComponents();
        }

        public override Tensor forward(Tensor input)
        {
            return _layers.forward(input);
        }
    }

    public class NeuralAgent : BaseAgent
    {
        public override string Id => "neural";
        private readonly RekcahNet _model;

        public NeuralAgent()
        {
            // Input: Hand Value, Score, Opponent Scores, Turn Number, etc.
            // Output: Probability of Showing
            _model = new RekcahNet(8, 32, 1);
            _model.eval(); // Default to evaluation mode
        }

        public override bool ShouldShow(RekcahMatch match, PlayerState player)
        {
            if (player.HandValue > match.Rules.ShowThreshold) return false;

            using (var disposeScope = torch.NewDisposeScope())
            {
                var input = PrepareInput(match, player);
                var output = _model.forward(input);
                float probability = output.sigmoid().item<float>();
                
                // If model predicts > 0.5 probability of success, show
                return probability > 0.5f;
            }
        }

        private Tensor PrepareInput(RekcahMatch match, PlayerState player)
        {
            float[] data = new float[8];
            data[0] = player.HandValue / 60.0f; // Normalized
            data[1] = player.Score / 100.0f;
            data[2] = match.TurnNumber / 100.0f;
            
            var opponents = match.Players.Where(p => !p.Eliminated && p.Id != player.Id).ToList();
            for (int i = 0; i < 4; i++)
            {
                data[3 + i] = i < opponents.Count ? opponents[i].Score / 100.0f : 0.0f;
            }
            data[7] = match.DiscardPile.Count / 54.0f;

            return torch.tensor(data).unsqueeze(0);
        }

        public override bool ShouldTakeDiscard(RekcahMatch match, PlayerState player, Card topDiscard)
        {
            // Use simple heuristic for now, or could use another model
            return topDiscard.Value <= 3;
        }
    }
}
