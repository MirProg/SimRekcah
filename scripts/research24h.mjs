import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RULES, evolveGenome, runSimulationBatch } from "../src/rekcah.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const simHours = Number(args.hours || 24);
const gamesPerHour = Number(args["games-per-hour"] || 50);
const batchSize = Number(args.batch || 100);
const snapshotEvery = Number(args["snapshot-every"] || 500);
const variantGames = Number(args["variant-games"] || 160);
const targetGames = Math.max(1, Math.round(simHours * gamesPerHour));
const runId = timestampId();
const outDir = resolve("sim-output", `research-${runId}`);
const snapshotsFile = resolve(outDir, "snapshots.jsonl");

await mkdir(outDir, { recursive: true });

let aggregate = emptyAggregate();
let genome = null;
let generation = 0;
let nextSnapshotAt = snapshotEvery;

while (aggregate.games < targetGames) {
  const games = Math.min(batchSize, targetGames - aggregate.games);
  const batch = runSimulationBatch({
    games,
    agentIds: ["aggressive", "balanced", "conservative", "threshold"]
  });
  merge(aggregate, batch);

  if (aggregate.games % Math.max(1, batchSize * 3) < games) {
    genome = evolveGenome(genome, aggregate);
    generation += 1;
  }

  if (aggregate.games >= nextSnapshotAt || aggregate.games === targetGames) {
    const snapshot = {
      atGame: aggregate.games,
      simulatedHours: aggregate.games / gamesPerHour,
      generation,
      aggregate: compactAggregate(aggregate),
      championGenome: genome
    };
    await appendFile(snapshotsFile, `${JSON.stringify(snapshot)}\n`);
    nextSnapshotAt += snapshotEvery;
  }
}

const variants = runVariantBenchmarks(variantGames);
const report = {
  runId,
  generatedAt: new Date().toISOString(),
  simulatedHours: simHours,
  gamesPerHour,
  targetGames,
  generation,
  aggregate,
  championGenome: genome,
  agentSummary: summarizeAgents(aggregate),
  discoveries: summarizeDiscoveries(aggregate),
  variants
};

const summaryPath = resolve(outDir, "summary.json");
const htmlPath = resolve(outDir, "report.html");
await writeFile(summaryPath, JSON.stringify(report, null, 2));
await writeFile(htmlPath, renderHtml(report));

console.log(`Research run complete: ${aggregate.games} games, ${simHours} simulated hours.`);
console.log(`Summary: ${summaryPath}`);
console.log(`Report: ${htmlPath}`);

function runVariantBenchmarks(games) {
  const variants = [
    ["Baseline", {}],
    ["Tight show threshold", { showThreshold: 10 }],
    ["Loose show threshold", { showThreshold: 20 }],
    ["Yaniv-style penalty", { failedShowPenalty: 30 }],
    ["Short sequence cap", { maxSequence: 4 }],
    ["Long sequence cap", { maxSequence: 6 }]
  ];
  return variants.map(([name, overrides]) => {
    const aggregate = runSimulationBatch({
      games,
      agentIds: ["aggressive", "balanced", "conservative", "threshold"],
      rules: { ...RULES, ...overrides }
    });
    const summary = summarizeAgents(aggregate);
    const rates = Object.values(summary).map((item) => item.winRate);
    const spread = rates.length ? Math.max(...rates) - Math.min(...rates) : 0;
    return {
      name,
      rules: { ...RULES, ...overrides },
      games,
      winRateSpread: spread,
      showSuccessRate: aggregate.successfulShows / Math.max(1, aggregate.shows),
      averageRounds: aggregate.rounds / Math.max(1, aggregate.games),
      agentSummary: summary
    };
  }).sort((a, b) => a.winRateSpread - b.winRateSpread);
}

function summarizeAgents(aggregate) {
  return Object.fromEntries(
    Object.entries(aggregate.agentStats).map(([agentId, stat]) => [
      agentId,
      {
        winRate: stat.wins / Math.max(1, stat.games),
        averageFinalScore: stat.finalScore / Math.max(1, stat.games),
        showSuccessRate: stat.successfulShows / Math.max(1, stat.shows),
        eliminationRate: stat.eliminations / Math.max(1, stat.games),
        showsPerGame: stat.shows / Math.max(1, stat.games)
      }
    ])
  );
}

function summarizeDiscoveries(aggregate) {
  return [
    {
      name: "Natural Show Exploitation",
      count: aggregate.naturalShows,
      detail: "Rounds that opened with at least one show-eligible hand."
    },
    {
      name: "Capped Sequence Trap",
      count: aggregate.fragmentedWindows,
      detail: "Five-card sequence dumps that may leave sequence fragments exposed."
    },
    {
      name: "Kamikaze Pressure",
      count: aggregate.kamikazeSignals,
      detail: "Risky low-score shows against danger-zone opponents."
    },
    {
      name: "Joker Trap Signal",
      count: aggregate.jokerTrapSignals,
      detail: "Discard-pile joker pickups that telegraph show pressure."
    }
  ];
}

function renderHtml(report) {
  const agentRows = Object.entries(report.agentSummary).map(([agentId, stat]) => `
    <tr>
      <td>${escapeHtml(agentId)}</td>
      <td>${pct(stat.winRate)}</td>
      <td>${stat.averageFinalScore.toFixed(1)}</td>
      <td>${pct(stat.showSuccessRate)}</td>
      <td>${stat.showsPerGame.toFixed(2)}</td>
    </tr>
  `).join("");
  const variantRows = report.variants.map((variant) => `
    <tr>
      <td>${escapeHtml(variant.name)}</td>
      <td>${pct(variant.winRateSpread)}</td>
      <td>${pct(variant.showSuccessRate)}</td>
      <td>${variant.averageRounds.toFixed(1)}</td>
      <td>${escapeHtml(topAgent(variant.agentSummary))}</td>
    </tr>
  `).join("");
  const discoveryCards = report.discoveries.map((item) => `
    <article>
      <strong>${escapeHtml(item.name)}</strong>
      <span>${item.count.toLocaleString("en-US")}</span>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `).join("");
  const genomeRows = Object.entries(report.championGenome || {}).map(([key, value]) => `
    <tr><td>${escapeHtml(key)}</td><td>${Number(value).toFixed(3)}</td></tr>
  `).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rekcah Research Report ${escapeHtml(report.runId)}</title>
  <style>
    body { margin: 0; padding: 32px; background: #f4f0e7; color: #211d18; font-family: Inter, system-ui, sans-serif; }
    h1 { font-size: clamp(2rem, 5vw, 4rem); line-height: 1; margin: 0 0 8px; letter-spacing: 0; }
    h2 { margin-top: 36px; }
    .muted { color: #6b6258; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; font-size: .75rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 24px 0; }
    .metric, article { background: #fffaf0; border: 1px solid #d9cec0; border-radius: 8px; padding: 16px; }
    .metric strong, article span { display: block; font-size: 2rem; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; background: #fffaf0; border: 1px solid #d9cec0; border-radius: 8px; overflow: hidden; }
    th, td { text-align: left; border-bottom: 1px solid #e6dac8; padding: 10px 12px; }
    th { color: #6b6258; font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; }
    tr:last-child td { border-bottom: 0; }
  </style>
</head>
<body>
  <p class="muted">Rekcah Research System</p>
  <h1>24-hour simulation report</h1>
  <p>Run ${escapeHtml(report.runId)} generated ${escapeHtml(report.generatedAt)}.</p>
  <section class="grid">
    <div class="metric"><span class="muted">Games</span><strong>${report.aggregate.games.toLocaleString("en-US")}</strong></div>
    <div class="metric"><span class="muted">Rounds</span><strong>${report.aggregate.rounds.toLocaleString("en-US")}</strong></div>
      <div class="metric"><span class="muted">Show Success</span><strong>${pct(report.aggregate.successfulShows / Math.max(1, report.aggregate.shows))}</strong></div>
    <div class="metric"><span class="muted">Max Hand Size</span><strong>${report.aggregate.maxHandSize || 0}</strong></div>
  </section>
  <h2>Agent Summary</h2>
  <table><thead><tr><th>Agent</th><th>Win Rate</th><th>Avg Final Score</th><th>Show Success</th><th>Shows/Game</th></tr></thead><tbody>${agentRows}</tbody></table>
  <h2>Rule Variants</h2>
  <table><thead><tr><th>Variant</th><th>Win Spread</th><th>Show Success</th><th>Avg Rounds</th><th>Top Agent</th></tr></thead><tbody>${variantRows}</tbody></table>
  <h2>Champion Genome</h2>
  <table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${genomeRows}</tbody></table>
  <h2>Detected Patterns</h2>
  <section class="grid">${discoveryCards}</section>
</body>
</html>`;
}

function topAgent(summary) {
  const [agentId, stat] = Object.entries(summary).sort((a, b) => b[1].winRate - a[1].winRate)[0] || ["none", { winRate: 0 }];
  return `${agentId} (${pct(stat.winRate)})`;
}

function compactAggregate(aggregate) {
  return {
    games: aggregate.games,
    rounds: aggregate.rounds,
    shows: aggregate.shows,
    successfulShows: aggregate.successfulShows,
    failedShows: aggregate.failedShows,
    maxHandSize: aggregate.maxHandSize || 0,
    discoveries: summarizeDiscoveries(aggregate),
    agentSummary: summarizeAgents(aggregate)
  };
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

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
