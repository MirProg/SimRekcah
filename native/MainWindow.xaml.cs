using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Rekcah.Core;

namespace SimRekcahNative
{
    public partial class MainWindow : Window
    {
        private RekcahMatch _match;
        private HashSet<string> _selectedCards = new HashSet<string>();

        public MainWindow()
        {
            InitializeComponent();
            _match = new RekcahMatch(new[] { "human", "aggressive", "balanced", "threshold" });
            UpdateUI();
        }

        private void UpdateUI()
        {
            var snapshot = _match;
            
            ScoreList.ItemsSource = snapshot.Players.ToList();
            LogList.ItemsSource = snapshot.Log.ToList();
            
            var human = snapshot.Players[0];
            HandList.ItemsSource = human.Hand.ToList();
            
            RoundText.Text = $"Round: {snapshot.RoundNumber}";
            TurnText.Text = $"Turn: {snapshot.TurnNumber}";
            
            var current = snapshot.CurrentPlayer;
            TurnOwnerText.Text = snapshot.Phase == GamePhase.GameOver ? "GAME OVER" : current.Label.ToUpper();
            
            StockCountText.Text = snapshot.DrawPile.Count.ToString();
            var top = snapshot.DiscardPile.LastOrDefault();
            TopDiscardText.Text = top != null ? top.Rank.ToString().Substring(0, 1) + GetSuitSymbol(top.Suit) : "-";
            
            bool isHumanTurn = current.AgentId == "human";
            StockButton.IsEnabled = isHumanTurn && snapshot.Phase == GamePhase.Draw;
            DiscardButton.IsEnabled = isHumanTurn && snapshot.Phase == GamePhase.Draw && snapshot.DiscardPile.Count > 0;
            
            ShowBtn.IsEnabled = isHumanTurn && _match.CanShow();
            DiscardBtn.IsEnabled = isHumanTurn && snapshot.Phase == GamePhase.Action && _selectedCards.Count > 0;
            
            if (!isHumanTurn && snapshot.Phase != GamePhase.GameOver && snapshot.Phase != GamePhase.RoundOver)
            {
                // Simple auto-play for AI for now
                Application.Current.Dispatcher.InvokeAsync(async () => {
                    await System.Threading.Tasks.Task.Delay(500);
                    PerformAiMove();
                });
            }
        }

        private string GetSuitSymbol(Suit suit)
        {
            return suit switch
            {
                Suit.Hearts => "♥",
                Suit.Diamonds => "♦",
                Suit.Clubs => "♣",
                Suit.Spades => "♠",
                _ => "★"
            };
        }

        private void OnDrawStock(object sender, RoutedEventArgs e)
        {
            _match.DrawFromStock();
            UpdateUI();
        }

        private void OnDrawDiscard(object sender, RoutedEventArgs e)
        {
            _match.DrawFromDiscard();
            UpdateUI();
        }

        private void OnShow(object sender, RoutedEventArgs e)
        {
            _match.Show();
            UpdateUI();
            CheckRoundOver();
        }

        private void OnDiscard(object sender, RoutedEventArgs e)
        {
            try {
                _match.Discard(_selectedCards.ToList());
                _selectedCards.Clear();
                UpdateUI();
                CheckRoundOver();
            } catch (Exception ex) {
                _match.AddLog(ex.Message);
                UpdateUI();
            }
        }

        private void OnCardClick(object sender, RoutedEventArgs e)
        {
            var id = (string)((Button)sender).Tag;
            if (_selectedCards.Contains(id)) _selectedCards.Remove(id);
            else _selectedCards.Add(id);
            UpdateUI();
        }

        private void CheckRoundOver()
        {
            if (_match.Phase == GamePhase.RoundOver)
            {
                MessageBox.Show("Round Over! Proceeding to next round.");
                _match.StartRound();
                UpdateUI();
            }
        }

        private void OnExit(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }

        private void PerformAiMove()
        {
            var player = _match.CurrentPlayer;
            if (player.AgentId == "human") return;

            // Basic AI logic for now (matching Engine.cs logic)
            if (_match.Phase == GamePhase.Draw)
            {
                if (_match.CanShow()) _match.Show();
                else _match.DrawFromStock();
            }
            else if (_match.Phase == GamePhase.Action)
            {
                var cardToDiscard = _match.DrawnCard != null ? 
                    player.Hand.Concat(new[] { _match.DrawnCard }).OrderByDescending(c => c.Value).First() :
                    player.Hand.OrderByDescending(c => c.Value).First();
                
                _match.Discard(new[] { cardToDiscard.Id });
            }
            
            UpdateUI();
            CheckRoundOver();
        }
    }
}