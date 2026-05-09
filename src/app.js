import {
  AGENT_LIBRARY,
  RekcahMatch,
  cardDisplay,
  findValidDiscards,
  handValue,
  isValidDiscardGroup,
  performAiTurn,
  evolveGenome,
  runSimulationBatch,
  sortCards
} from "./rekcah.js";

const GAMES_PER_SIM_HOUR = 50;

const state = {
  match: new RekcahMatch({ agentIds: ["human", "aggressive", "balanced", "threshold"] }),
  selected: new Set(),
  sim: {
    running: false,
    hours: 0,
    timer: null,
    aggregate: null,
    generation: 0,
    genome: null,
    worker: null,
    busy: false
  }
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  opponents: document.querySelector("#opponents"),
  roundPill: document.querySelector("#round-pill"),
  drawStock: document.querySelector("#draw-stock"),
  drawDiscard: document.querySelector("#draw-discard"),
  topDiscardCard: document.querySelector("#top-discard-card"),
  turnOwner: document.querySelector("#turn-owner"),
  turnState: document.querySelector("#turn-state"),
  handValue: document.querySelector("#hand-value"),
  humanHand: document.querySelector("#human-hand"),
  incomingZone: document.querySelector("#incoming-zone"),
  incomingCard: document.querySelector("#incoming-card"),
  showButton: document.querySelector("#show-button"),
  discardButton: document.querySelector("#discard-button"),
  scoreboard: document.querySelector("#scoreboard"),
  gameLog: document.querySelector("#game-log"),
  cardTemplate: document.querySelector("#card-template"),
  startSim: document.querySelector("#start-sim"),
  burstSim: document.querySelector("#burst-sim"),
  exportSim: document.querySelector("#export-sim"),
  resetSim: document.querySelector("#reset-sim"),
  speedRange: document.querySelector("#speed-range"),
  batchSize: document.querySelector("#batch-size"),
  simHours: document.querySelector("#sim-hours"),
  metricsGrid: document.querySelector("#metrics-grid"),
  agentBars: document.querySelector("#agent-bars"),
  balanceBadge: document.querySelector("#balance-badge"),
  genomePanel: document.querySelector("#genome-panel"),
  generationBadge: document.querySelector("#generation-badge"),
  discoveries: document.querySelector("#discoveries")
};

init();

function init() {
  els.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  els.drawStock.addEventListener("click", () => humanDraw("stock"));
  els.drawDiscard.addEventListener("click", () => humanDraw("discard"));
  els.showButton.addEventListener("click", humanShow);
  els.discardButton.addEventListener("click", humanDiscard);
  els.startSim.addEventListener("click", toggleSimulation);
  els.burstSim.addEventListener("click", runBurst);
  els.exportSim.addEventListener("click", exportSimulation);
  els.resetSim.addEventListener("click", resetSimulation);
  setupWorker();
  restoreSimulation();
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("tab") || window.location.hash.replace("#", "") || "play";
  if (["play", "sim", "research"].includes(initialTab)) {
    switchTab(initialTab);
  }
  render();
  renderSimulation();
  const autoSim = Number(params.get("autoSim") || 0);
  if (autoSim > 0) {
    window.setTimeout(() => {
      runLocalSimulation({
        games: autoSim,
        evolveEvery: 300,
        agentIds: ["aggressive", "balanced", "conservative", "threshold"]
      });
    });
  }
}

function switchTab(tabName) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${tabName}-view`));
  if (window.location.hash.replace("#", "") !== tabName) {
    window.history.replaceState(null, "", `#${tabName}`);
  }
}

function humanDraw(source) {
  const match = state.match;
  if (match.phase !== "draw" || match.currentPlayer().agentId !== "human") return;
  if (source === "stock") match.drawFromStock();
  else match.drawFromDiscard();
  render();
}

function humanShow() {
  try {
    state.match.show();
    state.selected.clear();
    render();
    window.setTimeout(afterRoundOrAi, 700);
  } catch (error) {
    state.match.addLog(error.message);
    render();
  }
}

function humanDiscard() {
  try {
    state.match.discard([...state.selected]);
    state.selected.clear();
    render();
    window.setTimeout(afterRoundOrAi, 500);
  } catch (error) {
    state.match.addLog(error.message);
    render();
  }
}

function afterRoundOrAi() {
  if (state.match.phase === "round-over") {
    state.match.nextRound();
    render();
  }
  runAiUntilHuman();
}

function runAiUntilHuman() {
  const match = state.match;
  if (match.phase === "game-over") {
    render();
    return;
  }
  if (match.phase === "round-over") {
    window.setTimeout(() => {
      match.nextRound();
      render();
      runAiUntilHuman();
    }, 650);
    return;
  }
  if (match.currentPlayer().agentId === "human") {
    render();
    return;
  }
  performAiTurn(match);
  render();
  window.setTimeout(runAiUntilHuman, 380);
}

function render() {
  const snapshot = state.match.snapshot();
  els.roundPill.textContent = snapshot.phase === "game-over" ? "Game over" : `Round ${snapshot.roundNumber}`;
  const current = snapshot.players[snapshot.currentPlayerIndex];
  els.turnOwner.textContent = snapshot.phase === "game-over" ? snapshot.winner?.label || "No winner" : current.label;
  els.turnState.textContent = describeTurn(snapshot);
  renderOpponents(snapshot);
  renderPiles(snapshot);
  renderHand(snapshot.players[0], snapshot);
  renderScoreboard(snapshot);
  renderLog(snapshot);
  updateButtons(snapshot);
}

function describeTurn(snapshot) {
  if (snapshot.phase === "game-over") return `${snapshot.winner?.label || "A player"} has survived the table.`;
  if (snapshot.phase === "round-over") return "Scoring is complete. Starting the next round.";
  if (snapshot.players[snapshot.currentPlayerIndex].agentId !== "human") return "AI is choosing whether to show, draw, or discard.";
  if (snapshot.phase === "draw") return "Take the last discard, or draw from stock to begin your turn.";
  if (snapshot.drawnCard) return "Show now if your hand is 15 or less, or discard one legal group.";
  return "Waiting for turn.";
}

function renderOpponents(snapshot) {
  els.opponents.innerHTML = "";
  snapshot.players.slice(1).forEach((player, offset) => {
    const node = document.createElement("article");
    node.className = `opponent ${snapshot.currentPlayerIndex === offset + 1 ? "active-turn" : ""}`;
    node.innerHTML = `
      <div class="opponent-name">
        <span>${player.label}</span>
        <span>${player.eliminated ? "Out" : `${player.hand.length} cards`}</span>
      </div>
      <div>${player.score} pts</div>
      <div class="mini-hand">${Array.from({ length: player.hand.length }, () => '<span class="mini-card"></span>').join("")}</div>
    `;
    els.opponents.appendChild(node);
  });
}

function renderPiles(snapshot) {
  els.topDiscardCard.innerHTML = "";
  if (snapshot.topDiscard) {
    els.topDiscardCard.appendChild(createCard(snapshot.topDiscard));
  }
  els.drawStock.disabled = snapshot.phase !== "draw" || snapshot.players[snapshot.currentPlayerIndex].agentId !== "human" || snapshot.drawCount === 0;
  els.drawDiscard.disabled = snapshot.phase !== "draw" || snapshot.players[snapshot.currentPlayerIndex].agentId !== "human" || !snapshot.topDiscard;
}

function renderHand(player, snapshot = state.match.snapshot()) {
  els.humanHand.innerHTML = "";
  els.incomingCard.innerHTML = "";
  els.handValue.textContent = handValue(snapshot.players[snapshot.currentPlayerIndex].id === player.id ? snapshot.availableCards || [] : player.hand);
  els.incomingZone.hidden = !snapshot.drawnCard || snapshot.players[snapshot.currentPlayerIndex].agentId !== "human";
  if (!els.incomingZone.hidden) {
    const incomingNode = createCard(snapshot.drawnCard);
    incomingNode.classList.add("incoming-card");
    incomingNode.classList.toggle("selected", state.selected.has(snapshot.drawnCard.id));
    incomingNode.addEventListener("click", () => {
      if (state.match.phase !== "action" || state.match.currentPlayer().agentId !== "human") return;
      if (state.selected.has(snapshot.drawnCard.id)) state.selected.delete(snapshot.drawnCard.id);
      else state.selected.add(snapshot.drawnCard.id);
      render();
    });
    els.incomingCard.appendChild(incomingNode);
  }
  for (const card of sortCards(player.hand)) {
    const cardNode = createCard(card);
    cardNode.classList.toggle("selected", state.selected.has(card.id));
    cardNode.addEventListener("click", () => {
      if (state.match.phase !== "action" || state.match.currentPlayer().agentId !== "human") return;
      if (state.selected.has(card.id)) state.selected.delete(card.id);
      else state.selected.add(card.id);
      render();
    });
    els.humanHand.appendChild(cardNode);
  }
}

function createCard(card) {
  const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
  const display = cardDisplay(card);
  node.dataset.cardId = card.id;
  node.classList.toggle("red", card.suit === "H" || card.suit === "D");
  node.classList.toggle("joker", card.rank === "Joker");
  node.classList.toggle("face-card", ["J", "Q", "K"].includes(card.rank));
  node.classList.toggle("ace-card", card.rank === "A");
  node.querySelector(".card-rank").textContent = `${display.shortRank} ${display.symbol}`;
  node.querySelector(".card-suit").innerHTML = renderCardArt(card, display);
  node.querySelector(".card-value").textContent = `${card.value} pts`;
  node.setAttribute("aria-label", `${display.name}, ${card.value} points`);
  return node;
}

function renderScoreboard(snapshot) {
  els.scoreboard.innerHTML = "";
  snapshot.players.forEach((player) => {
    const row = document.createElement("div");
    row.className = `score-row ${player.eliminated ? "eliminated" : ""}`;
    row.innerHTML = `<strong>${player.label}</strong><span>${player.score}</span>`;
    els.scoreboard.appendChild(row);
  });
}

function renderLog(snapshot) {
  els.gameLog.innerHTML = "";
  snapshot.log.slice(0, 14).forEach((entry) => {
    const row = document.createElement("div");
    row.className = "log-entry";
    row.textContent = entry;
    els.gameLog.appendChild(row);
  });
}

function updateButtons(snapshot) {
  const humanTurn = snapshot.players[snapshot.currentPlayerIndex]?.agentId === "human";
  const human = snapshot.players[0];
  const availableCards = humanTurn ? state.match.availableCards(human) : human.hand;
  const selectedCards = availableCards.filter((card) => state.selected.has(card.id));
  els.showButton.disabled = !(humanTurn && snapshot.phase === "action" && snapshot.drawnCard && handValue(availableCards) <= snapshot.rules.showThreshold);
  els.discardButton.disabled = !(humanTurn && snapshot.phase === "action" && snapshot.drawnCard && isValidDiscardGroup(selectedCards));
}

function renderCardArt(card, display) {
  if (card.rank === "Joker") {
    return `<span class="joker-art"><span>Joker</span><strong>${display.symbol}</strong></span>`;
  }
  if (["J", "Q", "K"].includes(card.rank)) {
    return `
      <span class="face-art">
        <span class="face-crown">${card.rank === "J" ? "JACK" : card.rank === "Q" ? "QUEEN" : "KING"}</span>
        <span class="face-head"></span>
        <span class="face-robe">${display.symbol}</span>
      </span>
    `;
  }
  const count = Math.max(1, Math.min(10, card.value));
  const pips = Array.from({ length: count }, () => `<span>${display.symbol}</span>`).join("");
  return `<span class="pip-grid pip-${count}">${pips}</span>`;
}

function setupWorker() {
  if (!window.Worker) return;
  state.sim.worker = new Worker("./src/simWorker.js", { type: "module" });
  state.sim.worker.addEventListener("message", (event) => {
    if (event.data?.type !== "state") return;
    applySimulationState(event.data.payload);
  });
  state.sim.worker.addEventListener("error", () => {
    state.sim.worker?.terminate();
    state.sim.worker = null;
    state.sim.busy = false;
    if (state.sim.running) runSimTick();
  });
}

function applySimulationState(payload) {
  state.sim.busy = false;
  state.sim.aggregate = payload.aggregate;
  state.sim.genome = payload.genome;
  state.sim.generation = payload.generation;
  state.sim.hours = Math.min(24, state.sim.aggregate.games / GAMES_PER_SIM_HOUR);
  renderSimulation();
  saveSimulation();
  if (state.sim.hours >= 24 && state.sim.running) {
    toggleSimulation(false);
  }
}

function toggleSimulation(force) {
  state.sim.running = typeof force === "boolean" ? force : !state.sim.running;
  els.startSim.textContent = state.sim.running ? "Pause" : "Start";
  if (state.sim.running) {
    state.sim.timer = window.setInterval(runSimTick, 1200);
    runSimTick();
  } else {
    window.clearInterval(state.sim.timer);
    state.sim.timer = null;
  }
}

function runSimTick() {
  const speed = Number(els.speedRange.value);
  const batch = Number(els.batchSize.value);
  postSimulationRun({
    games: batch * speed,
    evolveEvery: 750,
    agentIds: ["aggressive", "balanced", "conservative", "threshold"]
  });
}

function runBurst() {
  const remainingGames = Math.max(0, Math.ceil(24 * GAMES_PER_SIM_HOUR - (state.sim.aggregate?.games || 0)));
  const games = Math.min(remainingGames || 2160, 2400);
  postSimulationRun({
    games,
    evolveEvery: 750,
    agentIds: ["aggressive", "balanced", "conservative", "threshold"]
  });
}

function resetSimulation() {
  if (state.sim.running) toggleSimulation(false);
  state.sim.hours = 0;
  window.localStorage.removeItem("rekcah-sim-state");
  if (state.sim.worker) {
    state.sim.worker.postMessage({ type: "reset" });
  } else {
    applySimulationState({ aggregate: emptyAggregate(), genome: null, generation: 0 });
  }
}

function restoreSimulation() {
  try {
    const raw = window.localStorage.getItem("rekcah-sim-state");
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.sim.aggregate = saved.aggregate || null;
    state.sim.genome = saved.genome || null;
    state.sim.generation = saved.generation || 0;
    state.sim.hours = saved.hours || 0;
  } catch {
    window.localStorage.removeItem("rekcah-sim-state");
  }
}

function saveSimulation() {
  const payload = {
    aggregate: state.sim.aggregate,
    genome: state.sim.genome,
    generation: state.sim.generation,
    hours: state.sim.hours,
    savedAt: new Date().toISOString()
  };
  window.localStorage.setItem("rekcah-sim-state", JSON.stringify(payload));
}

function exportSimulation() {
  const payload = {
    exportedAt: new Date().toISOString(),
    simulatedHours: state.sim.hours,
    aggregate: state.sim.aggregate || emptyAggregate(),
    generation: state.sim.generation,
    championGenome: state.sim.genome
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rekcah-dashboard-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function postSimulationRun(payload) {
  if (state.sim.busy) return;
  state.sim.busy = true;
  if (state.sim.worker) {
    state.sim.worker.postMessage({ type: "run", payload });
  } else {
    window.setTimeout(() => runLocalSimulation(payload));
  }
}

function runLocalSimulation(payload) {
  const batch = runSimulationBatch(payload);
  const aggregate = state.sim.aggregate || emptyAggregate();
  mergeAggregate(aggregate, batch);
  let genome = state.sim.genome;
  let generation = state.sim.generation;
  if (aggregate.games > 0 && aggregate.games % Math.max(1, payload.evolveEvery || 600) < payload.games) {
    genome = evolveGenome(genome, aggregate);
    generation += 1;
  }
  applySimulationState({ aggregate, genome, generation });
}

function renderSimulation() {
  const aggregate = state.sim.aggregate || emptyAggregate();
  els.simHours.textContent = state.sim.hours.toFixed(2);
  const successRate = aggregate.shows ? aggregate.successfulShows / aggregate.shows : 0;
  const metrics = [
    ["Games", formatNumber(aggregate.games)],
    ["Rounds", formatNumber(aggregate.rounds)],
    ["Show success", `${Math.round(successRate * 100)}%`],
    ["Max hand size", formatNumber(aggregate.maxHandSize)]
  ];
  els.metricsGrid.innerHTML = metrics.map(([label, value]) => `
    <article class="metric">
      <p class="eyebrow">${label}</p>
      <strong>${value}</strong>
    </article>
  `).join("");
  renderAgentBars(aggregate);
  renderGenome();
  renderDiscoveries(aggregate);
}

function renderAgentBars(aggregate) {
  const stats = Object.values(aggregate.agentStats || {});
  const maxWinRate = Math.max(0.01, ...stats.map((stat) => stat.wins / Math.max(1, stat.games)));
  const winRates = stats.map((stat) => stat.wins / Math.max(1, stat.games));
  const spread = winRates.length ? Math.max(...winRates) - Math.min(...winRates) : 0;
  els.balanceBadge.textContent = aggregate.games ? `${Math.round(spread * 100)} pt spread` : "Waiting";
  els.agentBars.innerHTML = stats.map((stat) => {
    const profile = AGENT_LIBRARY[stat.agentId];
    const winRate = stat.wins / Math.max(1, stat.games);
    const width = Math.max(2, (winRate / maxWinRate) * 100);
    return `
      <div class="agent-row">
        <strong>${profile?.name || stat.agentId}</strong>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${profile?.color || "#2f5d8c"}"></div></div>
        <span>${Math.round(winRate * 100)}%</span>
      </div>
    `;
  }).join("") || `<p class="rules-compact">Start the simulation to populate agent performance.</p>`;
}

function renderGenome() {
  const genome = state.sim.genome || {
    show_threshold_base: 15,
    show_threshold_decay_per_turn: 1.1,
    danger_zone_score: 84,
    prefer_sets_weight: 1.3,
    prefer_sequences_weight: 0.9,
    joker_hoard_factor: 0.55
  };
  els.generationBadge.textContent = `Gen ${state.sim.generation}`;
  els.genomePanel.innerHTML = Object.entries(genome).map(([key, value]) => {
    const normalized = normalizeGene(key, value);
    return `
      <div class="gene">
        <span>${key.replaceAll("_", " ")}</span>
        <strong>${value.toFixed(2)}</strong>
        <div class="gene-meter"><div class="gene-fill" style="width:${normalized}%"></div></div>
      </div>
    `;
  }).join("");
}

function renderDiscoveries(aggregate) {
  const cards = [
    {
      title: "Natural Show Exploitation",
      body: `${formatNumber(aggregate.naturalShows)} rounds opened with at least one hand already eligible to show.`
    },
    {
      title: "Capped Sequence Trap",
      body: `${formatNumber(aggregate.fragmentedWindows)} five-card sequence dumps created a one-turn vulnerability window.`
    },
    {
      title: "Kamikaze Pressure",
      body: `${formatNumber(aggregate.kamikazeSignals)} low-score agents called risky shows against danger-zone opponents.`
    },
    {
      title: "Joker Trap Signal",
      body: `${formatNumber(aggregate.jokerTrapSignals)} discard-pile joker pickups telegraphed an incoming show race.`
    }
  ];
  els.discoveries.innerHTML = cards.map((card) => `
    <article class="discovery">
      <h4>${card.title}</h4>
      <p>${card.body}</p>
    </article>
  `).join("");
}

function normalizeGene(key, value) {
  const ranges = {
    show_threshold_base: [5, 15],
    show_threshold_decay_per_turn: [0.3, 2.5],
    danger_zone_score: [75, 92],
    prefer_sets_weight: [0.4, 2.4],
    prefer_sequences_weight: [0.2, 2],
    joker_hoard_factor: [0, 1]
  };
  const [min, max] = ranges[key] || [0, 1];
  return Math.max(4, Math.min(100, ((value - min) / (max - min)) * 100));
}

function emptyAggregate() {
  return {
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
}

function mergeAggregate(target, source) {
  for (const key of ["games", "rounds", "turns", "shows", "successfulShows", "failedShows", "naturalShows", "fragmentedWindows", "jokerTrapSignals", "kamikazeSignals"]) {
    target[key] += source[key] || 0;
  }
  target.maxHandSize = Math.max(target.maxHandSize || 0, source.maxHandSize || 0);
  for (const [agentId, stat] of Object.entries(source.agentStats || {})) {
    target.agentStats[agentId] ||= {
      agentId,
      games: 0,
      wins: 0,
      finalScore: 0,
      shows: 0,
      successfulShows: 0,
      failedShows: 0,
      eliminations: 0
    };
    for (const key of ["games", "wins", "finalScore", "shows", "successfulShows", "failedShows", "eliminations"]) {
      target.agentStats[agentId][key] += stat[key] || 0;
    }
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}
