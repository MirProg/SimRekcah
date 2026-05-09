const SUITS = ["H", "D", "C", "S"];
const SUIT_NAMES = {
  H: "Hearts",
  D: "Diamonds",
  C: "Clubs",
  S: "Spades"
};
const SUIT_SYMBOLS = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠",
  Joker: "★"
};
const RANK_NAMES = {
  A: "Ace",
  J: "Jack",
  Q: "Queen",
  K: "King",
  Joker: "Joker"
};
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_VALUE = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
  Joker: -1
};
const RANK_ORDER = new Map(RANKS.map((rank, index) => [rank, index + 1]));

export const RULES = {
  showThreshold: 15,
  successReward: -5,
  failedShowPenalty: 15,
  eliminationScore: 100,
  startingHandSize: 6,
  minSequence: 4,
  maxSequence: 5,
  maxTurnsPerRound: 220
};

export const AGENT_LIBRARY = {
  aggressive: {
    id: "aggressive",
    name: "Aggressive",
    color: "#b9342f",
    show: ({ handValue, showThreshold }) => handValue <= showThreshold,
    draw: "low-or-combo",
    discard: "max-points",
    description: "Shows as soon as it reaches 15 or less and dumps maximum points."
  },
  balanced: {
    id: "balanced",
    name: "Balanced",
    color: "#2f5d8c",
    show: ({ handValue, turnNumber, showThreshold }) => {
      if (turnNumber <= 2) return handValue <= showThreshold;
      if (turnNumber <= 4) return handValue <= Math.min(showThreshold, 12);
      if (turnNumber <= 7) return handValue <= Math.min(showThreshold, 8);
      return handValue <= Math.min(showThreshold, 5);
    },
    draw: "efficient",
    discard: "weighted",
    description: "Starts sharp, then tightens the show threshold as the table improves."
  },
  conservative: {
    id: "conservative",
    name: "Conservative",
    color: "#28795b",
    show: ({ handValue, showThreshold }) => handValue <= Math.min(5, showThreshold),
    draw: "jokers-and-very-low",
    discard: "safe",
    description: "Hunts certainty, hoards jokers, and avoids failed shows."
  },
  threshold: {
    id: "threshold",
    name: "Threshold-Aware",
    color: "#7d4c9e",
    show: ({ handValue, score, showThreshold }) => {
      if (score >= 90) return handValue <= 0;
      if (score >= 80) return handValue <= Math.min(2, showThreshold);
      return handValue <= showThreshold;
    },
    draw: "efficient",
    discard: "weighted",
    description: "Aggressive while safe, then locks down near the 100-point horizon."
  },
  probabilistic: {
    id: "probabilistic",
    name: "Probabilistic",
    color: "#c4812d",
    show: ({ handValue, turnNumber, score, opponentScores, showThreshold }) => {
      if (handValue <= 0) return true;
      if (score >= 85) return handValue <= 2;
      const dangerPressure = opponentScores.some((value) => value >= 85) ? 2 : 0;
      const required = Math.max(3, showThreshold + 1 - Math.floor(turnNumber * 1.15) - dangerPressure);
      return handValue <= Math.min(showThreshold, required);
    },
    draw: "combo-value",
    discard: "weighted",
    description: "Estimates show pressure from turn pace, score danger, and combo potential."
  }
};

export function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}`,
        rank,
        suit,
        suitName: SUIT_NAMES[suit],
        value: RANK_VALUE[rank]
      });
    }
  }
  deck.push({ id: "Joker1", rank: "Joker", suit: "Joker", suitName: "Joker", value: -1 });
  deck.push({ id: "Joker2", rank: "Joker", suit: "Joker", suitName: "Joker", value: -1 });
  return deck;
}

export function shuffle(cards, rng = Math.random) {
  const copy = [...cards];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function cardLabel(card) {
  if (!card) return "";
  if (card.rank === "Joker") return "Joker";
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function cardDisplay(card) {
  if (card.rank === "Joker") {
    return {
      rank: "Joker",
      shortRank: "J",
      suit: "Joker",
      symbol: SUIT_SYMBOLS.Joker,
      name: "Joker"
    };
  }
  const rankName = RANK_NAMES[card.rank] || card.rank;
  return {
    rank: rankName,
    shortRank: card.rank,
    suit: SUIT_NAMES[card.suit],
    symbol: SUIT_SYMBOLS[card.suit],
    name: `${rankName} of ${SUIT_NAMES[card.suit]}`
  };
}

export function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.rank === "Joker" && b.rank !== "Joker") return 1;
    if (b.rank === "Joker" && a.rank !== "Joker") return -1;
    if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    return (RANK_ORDER.get(a.rank) || 99) - (RANK_ORDER.get(b.rank) || 99);
  });
}

export function handValue(hand) {
  return hand.reduce((total, card) => total + card.value, 0);
}

export function isValidDiscardGroup(cards, rules = RULES) {
  if (!cards.length) return false;
  if (cards.length === 1) return true;
  
  // Sets: 2+ cards of the same rank
  if (cards.every((card) => card.rank === cards[0].rank)) {
    return cards.length >= 2;
  }

  // Sequences: Minimum length, same suit, strictly consecutive
  if (cards.length < rules.minSequence || cards.length > rules.maxSequence) return false;
  
  // Jokers cannot be part of a sequence in this ruleset
  if (cards.some(card => card.rank === "Joker")) return false;
  
  if (!cards.every((card) => card.suit === cards[0].suit)) return false;
  
  const ordered = sortCards(cards);
  for (let index = 1; index < ordered.length; index += 1) {
    if (RANK_ORDER.get(ordered[index].rank) !== RANK_ORDER.get(ordered[index - 1].rank) + 1) {
      return false;
    }
  }
  return true;
}

export function findValidDiscards(hand, rules = RULES) {
  const groups = [];
  for (const card of hand) {
    groups.push([card]);
  }

  const byRank = groupBy(hand.filter((card) => card.rank !== "Joker"), (card) => card.rank);
  for (const cards of byRank.values()) {
    if (cards.length >= 2) {
      for (let size = 2; size <= cards.length; size += 1) {
        groups.push(...combinations(cards, size));
      }
    }
  }

  const bySuit = groupBy(hand.filter((card) => card.rank !== "Joker"), (card) => card.suit);
  for (const cards of bySuit.values()) {
    const ordered = sortCards(cards);
    for (let start = 0; start < ordered.length; start += 1) {
      const run = [ordered[start]];
      for (let cursor = start + 1; cursor < ordered.length; cursor += 1) {
        const prev = run[run.length - 1];
        if (RANK_ORDER.get(ordered[cursor].rank) === RANK_ORDER.get(prev.rank) + 1) {
          run.push(ordered[cursor]);
          if (run.length >= rules.minSequence && run.length <= rules.maxSequence) {
            groups.push([...run]);
          }
          if (run.length === rules.maxSequence) break;
        } else if (RANK_ORDER.get(ordered[cursor].rank) > RANK_ORDER.get(prev.rank) + 1) {
          break;
        }
      }
    }
  }

  return uniqueGroups(groups).sort((a, b) => groupValue(b) - groupValue(a) || b.length - a.length);
}

export function groupValue(group) {
  return group.reduce((total, card) => total + (card?.value || 0), 0);
}

export function makePlayers(agentIds = ["human", "aggressive", "balanced", "conservative"]) {
  return agentIds.map((agentId, index) => {
    const agent = AGENT_LIBRARY[agentId] || null;
    return {
      id: `p${index}`,
      label: index === 0 && agentId === "human" ? "You" : agent?.name || `Player ${index + 1}`,
      agentId,
      score: 0,
      hand: [],
      eliminated: false,
      shows: 0,
      successfulShows: 0,
      failedShows: 0
    };
  });
}

export class RekcahMatch {
  constructor({ agentIds, rng = Math.random, rules = RULES } = {}) {
    this.rules = { ...RULES, ...rules };
    this.rng = rng;
    this.players = makePlayers(agentIds);
    this.roundNumber = 0;
    this.currentPlayerIndex = 0;
    this.phase = "idle";
    this.drawPile = [];
    this.discardPile = [];
    this.drawnCard = null;
    this.log = [];
    this.turnNumber = 1;
    this.winner = null;
    this.lastRoundResult = null;
    this.startRound();
  }

  activePlayers() {
    return this.players.filter((player) => !player.eliminated);
  }

  startRound() {
    const active = this.activePlayers();
    if (active.length <= 1) {
      this.winner = active[0] || null;
      this.phase = "game-over";
      return;
    }

    this.roundNumber += 1;
    this.turnNumber = 1;
    this.lastRoundResult = null;
    const deck = shuffle(createDeck(), this.rng);
    for (const player of this.players) {
      player.hand = [];
    }
    for (let cardIndex = 0; cardIndex < this.rules.startingHandSize; cardIndex += 1) {
      for (const player of active) {
        player.hand.push(deck.pop());
      }
    }
    this.discardPile = [deck.pop()];
    this.drawnCard = null;
    this.drawPile = deck;
    const firstActive = this.players.findIndex((player) => !player.eliminated);
    this.currentPlayerIndex = firstActive;
    this.phase = "draw";
    this.addLog(`Round ${this.roundNumber} begins. ${this.players[this.currentPlayerIndex].label} leads.`);
  }

  addLog(message) {
    this.log.unshift(message);
    this.log = this.log.slice(0, 80);
  }

  currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  topDiscard() {
    return this.discardPile[this.discardPile.length - 1] || null;
  }

  ensureStock() {
    if (this.drawPile.length > 0 || this.discardPile.length <= 1) return;
    const top = this.discardPile.pop();
    this.drawPile = shuffle(this.discardPile, this.rng);
    this.discardPile = [top];
    this.addLog("Discard history was reshuffled into the stock.");
  }

  drawFromStock() {
    if (this.phase !== "draw") throw new Error("A player can only draw when the turn asks for a draw.");
    this.ensureStock();
    const card = this.drawPile.pop();
    if (!card) throw new Error("No cards are available to draw.");
    this.drawnCard = card;
    this.phase = "action";
    this.addLog(`${this.currentPlayer().label} drew from stock.`);
    return card;
  }

  drawFromDiscard() {
    if (this.phase !== "draw") throw new Error("Take the last discard, or draw from stock to begin your turn.");
    if (this.drawnCard) return "Show now if your hand is 15 or less, or discard one legal group.";
    const card = this.discardPile.pop();
    if (!card) throw new Error("The discard pile is empty.");
    this.drawnCard = card;
    this.phase = "action";
    this.addLog(`${this.currentPlayer().label} took ${cardLabel(card)} from discard.`);
    return card;
  }

  discard(cardIds) {
    if (this.phase !== "action") throw new Error("Draw first, or wait for your action phase.");
    const player = this.currentPlayer();
    const available = this.availableCards(player);
    const selected = cardIds.map((id) => available.find((card) => card.id === id)).filter(Boolean);
    if (selected.length !== cardIds.length || !isValidDiscardGroup(selected, this.rules)) {
      throw new Error("That is not a valid Rekcah discard.");
    }
    player.hand = player.hand.filter((card) => !cardIds.includes(card.id));
    const discardedDrawnCard = this.drawnCard && cardIds.includes(this.drawnCard.id);
    if (!discardedDrawnCard && this.drawnCard) {
      player.hand.push(this.drawnCard);
    }
    this.drawnCard = null;
    for (const card of sortCards(selected)) {
      this.discardPile.push(card);
    }
    this.addLog(`${player.label} discarded ${selected.map(cardLabel).join(", ")}.`);
    this.advanceTurn();
  }

  canShow(player = this.currentPlayer()) {
    return this.phase === "action" && !!this.drawnCard && handValue(this.availableCards(player)) <= this.rules.showThreshold;
  }

  show() {
    if (!this.canShow()) throw new Error("Show is only legal on your turn after drawing with 15 points or less.");
    const caller = this.currentPlayer();
    const callerValue = handValue(this.availableCards(caller));
    const opponents = this.activePlayers().filter((player) => player.id !== caller.id);
    const lowestOpponent = Math.min(...opponents.map((player) => handValue(player.hand)));
    const success = callerValue < lowestOpponent;
    const deltas = {};
    caller.shows += 1;
    if (success) {
      caller.successfulShows += 1;
    } else {
      caller.failedShows += 1;
    }

    for (const player of this.activePlayers()) {
      if (player.id === caller.id) {
        deltas[player.id] = success ? this.rules.successReward : this.rules.failedShowPenalty;
      } else {
        deltas[player.id] = handValue(player.hand);
      }
      player.score += deltas[player.id];
    }

    const eliminatedNow = [];
    for (const player of this.activePlayers()) {
      if (player.score >= this.rules.eliminationScore) {
        player.eliminated = true;
        eliminatedNow.push(player);
      }
    }

    this.lastRoundResult = {
      callerId: caller.id,
      callerLabel: caller.label,
      callerValue,
      success,
      deltas,
      eliminatedIds: eliminatedNow.map((player) => player.id)
    };

    const verb = success ? "successful" : "failed";
    this.addLog(`${caller.label} called show at ${callerValue}. Show ${verb}.`);
    for (const player of eliminatedNow) {
      this.addLog(`${player.label} was eliminated at ${player.score} points.`);
    }

    if (this.activePlayers().length <= 1) {
      this.winner = this.activePlayers()[0] || caller;
      this.phase = "game-over";
      this.addLog(`${this.winner.label} wins the match.`);
      return this.lastRoundResult;
    }

    this.phase = "round-over";
    return this.lastRoundResult;
  }

  nextRound() {
    if (this.phase !== "round-over") return;
    this.startRound();
  }

  advanceTurn() {
    const activeCount = this.activePlayers().length;
    if (activeCount <= 1) {
      this.phase = "game-over";
      this.winner = this.activePlayers()[0] || null;
      return;
    }
    let nextIndex = this.currentPlayerIndex;
    do {
      nextIndex = (nextIndex + 1) % this.players.length;
    } while (this.players[nextIndex].eliminated);
    this.currentPlayerIndex = nextIndex;
    this.turnNumber += 1;
    this.drawnCard = null;
    this.phase = "draw";
  }

  availableCards(player = this.currentPlayer()) {
    return this.drawnCard ? [...player.hand, this.drawnCard] : [...player.hand];
  }

  snapshot() {
    return {
      rules: this.rules,
      players: this.players.map((player) => ({
        ...player,
        hand: sortCards(player.hand)
      })),
      roundNumber: this.roundNumber,
      currentPlayerIndex: this.currentPlayerIndex,
      phase: this.phase,
      topDiscard: this.topDiscard(),
      drawnCard: this.drawnCard,
      availableCards: this.availableCards(),
      drawCount: this.drawPile.length,
      discardCount: this.discardPile.length,
      log: this.log,
      turnNumber: this.turnNumber,
      winner: this.winner,
      lastRoundResult: this.lastRoundResult
    };
  }
}

export function chooseAiMove(match, player) {
  const profile = AGENT_LIBRARY[player.agentId] || AGENT_LIBRARY.balanced;
  const context = {
    handValue: handValue(player.hand),
    turnNumber: Math.ceil(match.turnNumber / Math.max(1, match.activePlayers().length)),
    score: player.score,
    opponentScores: match.activePlayers().filter((other) => other.id !== player.id).map((other) => other.score),
    showThreshold: match.rules.showThreshold
  };

  if (match.phase === "draw") {
    const top = match.topDiscard();
    if (top && shouldTakeDiscard(profile, player.hand, top)) {
      return { type: "draw-discard" };
    }
    return { type: "draw-stock" };
  }

  const currentHandValue = handValue(match.availableCards(player));
  if (match.phase === "action" && match.drawnCard && currentHandValue <= match.rules.showThreshold && profile.show({ ...context, handValue: currentHandValue })) {
    return { type: "show" };
  }

  const discard = chooseDiscard(profile, match.availableCards(player));
  return { type: "discard", cardIds: discard.map((card) => card.id) };
}

export function performAiTurn(match) {
  if (match.phase === "game-over" || match.currentPlayer().agentId === "human") return null;
  const player = match.currentPlayer();
  const move = chooseAiMove(match, player);
  if (move.type === "draw-stock") match.drawFromStock();
  if (move.type === "draw-discard") match.drawFromDiscard();
  if (move.type === "show") match.show();
  if (move.type === "discard") match.discard(move.cardIds);
  return move;
}

export function simulateGame({
  agentIds = ["aggressive", "balanced", "conservative", "threshold"],
  seed = Math.floor(Math.random() * 4294967295),
  rules = RULES
} = {}) {
  const rng = createRng(seed);
  const match = new RekcahMatch({ agentIds, rng, rules });
  const telemetry = {
    seed,
    rounds: 0,
    turns: 0,
    shows: 0,
    successfulShows: 0,
    failedShows: 0,
    naturalShows: 0,
    fragmentedWindows: 0,
    jokerTrapSignals: 0,
    kamikazeSignals: 0,
    maxHandSize: Math.max(...match.players.map((player) => player.hand.length)),
    agentStats: Object.fromEntries(agentIds.map((id) => [id, emptyAgentStat(id)]))
  };
  telemetry.naturalShows += match.activePlayers().some((player) => handValue(player.hand) <= match.rules.showThreshold) ? 1 : 0;

  while (match.phase !== "game-over" && telemetry.turns < 10000) {
    if (match.phase === "round-over") {
      telemetry.rounds += 1;
      match.nextRound();
      const naturalCount = match.activePlayers().filter((player) => handValue(player.hand) <= match.rules.showThreshold).length;
      telemetry.naturalShows += naturalCount > 0 ? 1 : 0;
      telemetry.maxHandSize = Math.max(telemetry.maxHandSize, ...match.players.map((player) => player.hand.length));
      continue;
    }

    const player = match.currentPlayer();
    const beforeValue = handValue(player.hand);
    const beforeScore = player.score;
    const move = chooseAiMove(match, player);

    if (move.type === "draw-stock") match.drawFromStock();
    if (move.type === "draw-discard") {
      const top = match.topDiscard();
      if (top?.rank === "Joker") telemetry.jokerTrapSignals += 1;
      match.drawFromDiscard();
    }
    if (move.type === "show") {
      const lowScoreLeader = beforeScore < 45;
      const dangerOpponent = match.activePlayers().some((other) => other.id !== player.id && other.score >= 85);
      if (lowScoreLeader && dangerOpponent && beforeValue >= 12) telemetry.kamikazeSignals += 1;
      const result = match.show();
      telemetry.shows += 1;
      if (result.success) telemetry.successfulShows += 1;
      else telemetry.failedShows += 1;
    }
    if (move.type === "discard") {
      const discarded = move.cardIds.map((id) => player.hand.find((card) => card.id === id)).filter(Boolean);
      if (isSequence(discarded) && discarded.length === match.rules.maxSequence) {
        telemetry.fragmentedWindows += 1;
      }
      match.discard(move.cardIds);
    }
    telemetry.maxHandSize = Math.max(telemetry.maxHandSize, ...match.players.map((p) => p.hand.length));
    telemetry.turns += 1;
  }

  if (match.phase === "game-over") {
    telemetry.rounds += match.phase === "game-over" ? 1 : 0;
  }

  const winner = match.winner?.agentId || "unknown";
  for (const player of match.players) {
    const stat = telemetry.agentStats[player.agentId] || emptyAgentStat(player.agentId);
    stat.games += 1;
    stat.finalScore += player.score;
    stat.shows += player.shows;
    stat.successfulShows += player.successfulShows;
    stat.failedShows += player.failedShows;
    stat.eliminations += player.eliminated ? 1 : 0;
    if (player.agentId === winner) stat.wins += 1;
    telemetry.agentStats[player.agentId] = stat;
  }
  telemetry.winner = winner;
  return telemetry;
}

export function aggregateTelemetry(target, sample) {
  target.games = (target.games || 0) + 1;
  target.rounds = (target.rounds || 0) + sample.rounds;
  target.turns = (target.turns || 0) + sample.turns;
  target.shows = (target.shows || 0) + sample.shows;
  target.successfulShows = (target.successfulShows || 0) + sample.successfulShows;
  target.failedShows = (target.failedShows || 0) + sample.failedShows;
  target.naturalShows = (target.naturalShows || 0) + sample.naturalShows;
  target.fragmentedWindows = (target.fragmentedWindows || 0) + sample.fragmentedWindows;
  target.jokerTrapSignals = (target.jokerTrapSignals || 0) + sample.jokerTrapSignals;
  target.kamikazeSignals = (target.kamikazeSignals || 0) + sample.kamikazeSignals;
  target.maxHandSize = Math.max(target.maxHandSize || 0, sample.maxHandSize || 0);
  target.agentStats ||= {};
  for (const [agentId, stat] of Object.entries(sample.agentStats)) {
    target.agentStats[agentId] ||= emptyAgentStat(agentId);
    for (const key of ["games", "wins", "finalScore", "shows", "successfulShows", "failedShows", "eliminations"]) {
      target.agentStats[agentId][key] += stat[key] || 0;
    }
  }
  return target;
}

export function runSimulationBatch({
  games = 100,
  seed = Date.now(),
  agentIds = ["aggressive", "balanced", "conservative", "threshold"],
  rules = RULES
} = {}) {
  const aggregate = {
    games: 0,
    rounds: 0,
    turns: 0,
    shows: 0,
    successfulShows: 0,
    failedShows: 0,
    naturalShows: 0,
    fragmentedWindows: 0,
    jokerTrapSignals: 0,
    kamikazeSignals: 0,
    maxHandSize: 0,
    agentStats: {}
  };
  const rng = createRng(seed);
  for (let index = 0; index < games; index += 1) {
    const sample = simulateGame({
      agentIds,
      seed: Math.floor(rng() * 4294967295),
      rules
    });
    aggregateTelemetry(aggregate, sample);
  }
  return aggregate;
}

export function evolveGenome(previousGenome, aggregate) {
  const base = previousGenome || {
    show_threshold_base: 15,
    show_threshold_decay_per_turn: 1.1,
    danger_zone_score: 84,
    prefer_sets_weight: 1.3,
    prefer_sequences_weight: 0.9,
    joker_hoard_factor: 0.55
  };
  const stats = Object.values(aggregate.agentStats || {});
  const leader = stats.sort((a, b) => (b.wins / Math.max(1, b.games)) - (a.wins / Math.max(1, a.games)))[0];
  const aggressiveWins = (aggregate.agentStats?.aggressive?.wins || 0) / Math.max(1, aggregate.agentStats?.aggressive?.games || 1);
  const conservativeLoss = (aggregate.agentStats?.conservative?.eliminations || 0) / Math.max(1, aggregate.agentStats?.conservative?.games || 1);
  const next = { ...base };
  next.show_threshold_base = clamp(base.show_threshold_base + (aggressiveWins > 0.5 ? 0.08 : -0.05), 5, 15);
  next.show_threshold_decay_per_turn = clamp(base.show_threshold_decay_per_turn + (conservativeLoss > 0.45 ? -0.015 : 0.01), 0.3, 2.5);
  next.danger_zone_score = clamp(base.danger_zone_score + ((leader?.agentId === "threshold") ? -0.1 : 0.05), 75, 92);
  next.prefer_sets_weight = clamp(base.prefer_sets_weight + 0.015, 0.4, 2.4);
  next.prefer_sequences_weight = clamp(base.prefer_sequences_weight - (aggregate.fragmentedWindows > aggregate.games ? 0.01 : -0.005), 0.2, 2);
  next.joker_hoard_factor = clamp(base.joker_hoard_factor + (aggregate.jokerTrapSignals > aggregate.games * 0.2 ? -0.01 : 0.006), 0, 1);
  return next;
}

function shouldTakeDiscard(profile, hand, card) {
  if (!card) return false;
  const withCard = [...hand, card];
  const bestBefore = chooseDiscard(profile, hand);
  const bestAfter = chooseDiscard(profile, withCard);
  const comboGain = groupValue(bestAfter) - groupValue(bestBefore);
  if (profile.draw === "jokers-and-very-low") {
    return card.rank === "Joker" || card.value <= 3 || comboGain >= 10;
  }
  if (profile.draw === "efficient") {
    return card.value <= 5 || comboGain >= 9;
  }
  if (profile.draw === "combo-value") {
    return card.value <= 6 || comboGain >= 7;
  }
  return card.value <= 6 || comboGain >= 10;
}

function chooseDiscard(profile, hand) {
  const groups = findValidDiscards(hand);
  if (!groups.length) return hand[0] ? [hand[0]] : [];
  const scored = groups.map((group) => ({
    group,
    score: scoreGroup(profile, group, hand)
  }));
  scored.sort((a, b) => b.score - a.score || groupValue(b.group) - groupValue(a.group) || b.group.length - a.group.length);
  return scored[0].group;
}

function scoreGroup(profile, group, hand) {
  let score = groupValue(group);
  if (group.length > 1) score += group.length * 2;
  if (isSet(group)) score *= profile.discard === "max-points" ? 1.22 : 1.1;
  if (isSequence(group)) score *= profile.discard === "safe" ? 0.85 : 1;
  if (profile.discard === "safe" && group.some((card) => card.rank === "Joker") && hand.length > 2) score -= 30;
  if (profile.discard === "weighted" && isSet(group)) score += 4;
  return score;
}

function isSet(group) {
  return group.length >= 2 && group.every((card) => card.rank !== "Joker" && card.rank === group[0].rank);
}

function isSequence(group) {
  if (group.length < RULES.minSequence) return false;
  if (group.some((card) => card.rank === "Joker")) return false;
  if (!group.every((card) => card.suit === group[0].suit)) return false;
  const ordered = sortCards(group);
  return ordered.every((card, index) => index === 0 || RANK_ORDER.get(card.rank) === RANK_ORDER.get(ordered[index - 1].rank) + 1);
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function combinations(items, size) {
  const output = [];
  const pick = (start, combo) => {
    if (combo.length === size) {
      output.push([...combo]);
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      combo.push(items[index]);
      pick(index + 1, combo);
      combo.pop();
    }
  };
  pick(0, []);
  return output;
}

function uniqueGroups(groups) {
  const seen = new Set();
  const output = [];
  for (const group of groups) {
    const key = group.map((card) => card.id).sort().join("|");
    if (!seen.has(key)) {
      seen.add(key);
      output.push(sortCards(group));
    }
  }
  return output;
}

function emptyAgentStat(agentId) {
  return {
    agentId,
    games: 0,
    wins: 0,
    finalScore: 0,
    shows: 0,
    successfulShows: 0,
    failedShows: 0,
    eliminations: 0
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
