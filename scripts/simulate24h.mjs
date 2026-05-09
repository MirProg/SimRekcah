import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evolveGenome, runSimulationBatch } from "../src/rekcah.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const hours = Number(args.hours || 24);
const gamesPerHour = Number(args["games-per-hour"] || 900);
const batchSize = Number(args.batch || 300);
const targetGames = Math.max(1, Math.round(hours * gamesPerHour));
let aggregate = emptyAggregate();
let genome = null;
let generation = 0;

while (aggregate.games < targetGames) {
  const games = Math.min(batchSize, targetGames - aggregate.games);
  const batch = runSimulationBatch({
    games,
    agentIds: ["aggressive", "balanced", "conservative", "threshold"]
  });
  merge(aggregate, batch);
  if (aggregate.games % (batchSize * 3) < games) {
    genome = evolveGenome(genome, aggregate);
    generation += 1;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  simulatedHours: hours,
  gamesPerHour,
  generation,
  aggregate,
  championGenome: genome,
  agentSummary: Object.fromEntries(
    Object.entries(aggregate.agentStats).map(([agentId, stat]) => [
      agentId,
      {
        winRate: stat.wins / Math.max(1, stat.games),
        averageFinalScore: stat.finalScore / Math.max(1, stat.games),
        showSuccessRate: stat.successfulShows / Math.max(1, stat.shows),
        eliminationRate: stat.eliminations / Math.max(1, stat.games)
      }
    ])
  )
};

const outDir = resolve("sim-output");
await mkdir(outDir, { recursive: true });
const outFile = resolve(outDir, `rekcah-24h-${Date.now()}.json`);
await writeFile(outFile, JSON.stringify(report, null, 2));

console.log(`Simulated ${aggregate.games} games across ${hours} hours.`);
for (const [agentId, summary] of Object.entries(report.agentSummary)) {
  console.log(`${agentId}: ${(summary.winRate * 100).toFixed(1)}% wins, avg score ${summary.averageFinalScore.toFixed(1)}, show success ${(summary.showSuccessRate * 100).toFixed(1)}%`);
}
console.log(`Report: ${outFile}`);

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
