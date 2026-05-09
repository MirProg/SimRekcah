import { evolveGenome, runSimulationBatch } from "./rekcah.js";

let aggregate = emptyAggregate();
let genome = null;
let generation = 0;

self.addEventListener("message", (event) => {
  const { type, payload = {} } = event.data || {};
  if (type === "reset") {
    aggregate = emptyAggregate();
    genome = null;
    generation = 0;
    self.postMessage({ type: "state", payload: { aggregate, genome, generation } });
    return;
  }
  if (type === "run") {
    const batch = runSimulationBatch(payload);
    merge(aggregate, batch);
    const shouldEvolve = aggregate.games > 0 && aggregate.games % Math.max(1, payload.evolveEvery || 600) < payload.games;
    if (shouldEvolve) {
      genome = evolveGenome(genome, aggregate);
      generation += 1;
    }
    self.postMessage({ type: "state", payload: { aggregate, genome, generation, batchGames: batch.games } });
  }
});

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

function merge(target, source) {
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
