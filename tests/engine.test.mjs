import assert from "node:assert/strict";
import {
  RULES,
  RekcahMatch,
  cardDisplay,
  createDeck,
  createRng,
  findValidDiscards,
  handValue,
  isValidDiscardGroup,
  runSimulationBatch
} from "../src/rekcah.js";

const deck = createDeck();
assert.equal(deck.length, 54, "deck should include 52 cards plus two jokers");
assert.equal(deck.filter((card) => card.rank === "Joker").length, 2, "deck should include two jokers");
assert.equal(deck.reduce((total, card) => total + card.value, 0), 338, "deck value should match the research notes");
assert.equal(cardDisplay(deck.find((card) => card.id === "KH")).rank, "King", "face cards should expose proper display names");
assert.equal(cardDisplay(deck.find((card) => card.id === "QD")).symbol.charCodeAt(0), 0x2666, "cards should render suit symbols instead of letters");

const heartsRun = ["4H", "5H", "6H", "7H"].map((id) => deck.find((card) => card.id === id));
assert.equal(isValidDiscardGroup(heartsRun), true, "four-card suited sequence should be valid");

const sixRun = ["4H", "5H", "6H", "7H", "8H", "9H"].map((id) => deck.find((card) => card.id === id));
assert.equal(isValidDiscardGroup(sixRun), false, "six-card sequence should exceed the cap");

const kings = ["KH", "KD", "KC"].map((id) => deck.find((card) => card.id === id));
assert.equal(isValidDiscardGroup(kings), true, "same-rank set should be valid");

const jokerSet = [deck.find((card) => card.id === "Joker1"), deck.find((card) => card.id === "Joker2")];
assert.equal(isValidDiscardGroup(jokerSet), false, "jokers are scoring cards, not wild sets");

const lowHand = ["AH", "2H", "3H", "4H", "5H", "Joker1"].map((id) => deck.find((card) => card.id === id));
assert.equal(handValue(lowHand), 14);
assert.ok(findValidDiscards(lowHand).length > 0, "low hand should still produce legal discards");

const match = new RekcahMatch({
  agentIds: ["human", "aggressive"],
  rng: createRng(8)
});
assert.equal(match.players.length, 2);
assert.equal(match.players[0].hand.length, RULES.startingHandSize);
assert.equal(match.phase, "action");
assert.throws(() => match.drawFromStock(), /only draw/, "players should not draw to start the game");
const firstCard = match.players[0].hand[0];
match.discard([firstCard.id]);
assert.equal(match.phase, "draw", "discarding should give the next player a draw choice");
assert.equal(match.currentPlayer().id, "p1", "the next player should act after a discard");
assert.equal(match.topDiscard().id, firstCard.id, "the discarded card should be available to the next player");
assert.equal(match.players[0].hand.length, 5, "discard happens before the next draw, so no seven-card hand appears");
const taken = match.drawFromDiscard();
assert.equal(taken.id, firstCard.id, "the next player can take the previous player's discard");
assert.equal(match.players[1].hand.length, 6, "a drawn card stays outside the hand until discard");
assert.equal(match.drawnCard.id, firstCard.id);
match.discard([taken.id]);
assert.equal(match.players[1].hand.length, 6, "discarding the drawn card should still leave no seven-card hand");

const batch = runSimulationBatch({ games: 25, seed: 12 });
assert.equal(batch.games, 25);
assert.ok(Object.keys(batch.agentStats).length >= 4, "simulation should track every agent profile");
assert.ok(batch.shows > 0, "simulation should include show declarations");
assert.ok(batch.maxHandSize <= 6, "simulation should never create a seven-card hand");

const tightVariant = runSimulationBatch({
  games: 5,
  seed: 13,
  rules: { ...RULES, showThreshold: 10 }
});
assert.equal(tightVariant.games, 5, "tight show-threshold variant should simulate without illegal shows");

console.log("Engine tests passed.");
