#pragma once

#include <vector>
#include <string>
#include <algorithm>
#include <random>
#include <numeric>
#include <stdexcept>

namespace Rekcah {

    enum class Suit { Hearts, Diamonds, Clubs, Spades, Joker };
    enum class Rank { Ace = 1, Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Jack, Queen, King, Joker = 99 };

    struct Card {
        std::string id;
        Rank rank;
        Suit suit;

        int GetValue() const {
            if (rank == Rank.Joker) return -1;
            if ((int)rank >= 10 && (int)rank <= 13) return 10;
            return (int)rank;
        }
    };

    struct PlayerState {
        std::string id;
        std::string label;
        int score = 0;
        std::vector<Card> hand;
        bool eliminated = false;
        int shows = 0;

        int GetHandValue() const {
            int total = 0;
            for (const auto& card : hand) total += card.GetValue();
            return total;
        }
    };

    class Engine {
    public:
        Engine(const std::vector<std::string>& agentIds, int seed = 42) 
            : rng(seed) {
            for (size_t i = 0; i < agentIds.size(); ++i) {
                players.push_back({ "p" + std::to_string(i), agentIds[i] });
            }
            StartRound();
        }

        void StartRound() {
            // Implementation of 6-card deal and Discard-then-Draw logic
            roundNumber++;
            auto deck = CreateDeck();
            std::shuffle(deck.begin(), deck.end(), rng);

            for (auto& p : players) {
                p.hand.clear();
                if (!p.eliminated) {
                    for (int i = 0; i < 6; ++i) {
                        p.hand.push_back(deck.back());
                        deck.pop_back();
                    }
                }
            }
            discardPile = { deck.back() };
            deck.pop_back();
            drawPile = deck;
            
            phase = "Action";
        }

        bool CanShow(const std::string& playerId) {
            auto it = std::find_if(players.begin(), players.end(), [&](auto& p) { return p.id == playerId; });
            return phase == "Action" && it != players.end() && it->GetHandValue() <= 15;
        }

        void Show(const std::string& playerId) {
            if (!CanShow(playerId)) throw std::runtime_error("Invalid show");
            // Porting logic for successful/failed show and scoring...
        }

        // Add more porting logic here for Unreal integration...

    private:
        std::vector<Card> players;
        std::vector<Card> drawPile;
        std::vector<Card> discardPile;
        std::string phase;
        int roundNumber = 0;
        std::mt19937 rng;

        std::vector<Card> CreateDeck() {
            std::vector<Card> deck;
            // standard 54 card deck creation...
            return deck;
        }
    };
}
