# Rekcah Lab

Playable Rekcah plus an accelerated 24-hour simulation dashboard built from the supplied rule and research documents.

## Run

```powershell
npm start
```

Open `http://localhost:4173`.

## Test

```powershell
npm test
```

## Headless 24-hour simulation

```powershell
npm run simulate -- --hours=24 --games-per-hour=900
```

The report is written to `sim-output/`.

## Research run with report

```powershell
npm run research -- --hours=24 --games-per-hour=50 --variant-games=160
```

This creates a timestamped folder in `sim-output/` with `snapshots.jsonl`, `summary.json`, and `report.html`. The report includes agent performance, detected strategy patterns, champion genome values, and rule-variant balance comparisons.

## Rules Implemented

- 52-card deck plus two jokers.
- A through 9 score face value, 10/J/Q/K score 10, jokers score -1.
- Players start each round with six cards.
- The first turn begins from the dealt six-card hand; there is no forced opening draw.
- A discarded card or group is immediately available to the next player.
- On later turns, a player may show from their current hand, take the last discard, or draw from stock.
- A drawn card stays outside the hand until the player discards one legal group, so the hand never becomes seven cards.
- Legal discards are singles, same-rank sets of two or more, or same-suit sequences of four to five cards.
- Hands never go above six cards.
- Show is legal at 15 points or less.
- Successful show scores -5 for the caller; failed show scores a 15-point penalty.
- Any player at 100 cumulative points is eliminated.
