# M46 RESUME — LAW v4 (TROPHY LAW) · 2026-08-31

TRAINING IS LIVE under the trainer's new core rule (un-paused 2026-08-31):
**A generation's success = the upper TIER TROPHIES it earns. Its TRUE success =
how fast it reaches the HIGHEST tier and how EFFICIENTLY (time/stalls) it gets there.**

## The law (in-page `fitness()` = harness — one ruler)
- trophies: +1200 · 2.5^(tier−1) EACH
- top-tier best record time: + (1000 − bestTime) · 0.6 · 2.5^(topTier−1)
- the road gradient: +220 · tierProgress · 2.5^(tier−1)  + 60 · bosses
- efficiency: − tierClock · 0.03 · 2.5^(tier−1)  − 0.012 · simDurS
- small keeps (never decide a generation): xp/min·0.5 (≤240), quests·3, xp·0.04, maxLevel·1.5, kills·1
- death pen ×(1 + 0.6·(tier−1)); stuck 8 / loop 15 unchanged

## The brain
- 24 senses → 10 tanh → 6 urges, 316 weights; rows 18-23 = bear-proximity, sky-threat,
  campaign: progress / tier / deed-meter / tier-clock (campProbe = CAMP.state, one source).
- Wild-mind re-seed (seed 20070, same law as GEN 0); old 276-weight champion archived:
  `test/rafzzer_champion_lawv3_archive.json`.

## Per-generation cadence (test/m46_step.sh <gen> [cap])
global ×2 → trait ×2 (rows 180-239 only, σ0.15) → traitglobal ×2 → STOP. Cap default 900 s wall
(≈2700 sim-s @ rate=3 — one tier needs the long road; RUN_CAP env overrides).

## Successor assessment (human gate — read test/rafzzer_run_gen<g>.json)
1. gate PASS (shakedown: moves/decides/livingMind/no-suicide/no-crash) — mandatory.
2. `fitness` (the law above); `trophy` snapshot: tier, trophies, topTier, topTime, clock.
3. Then promote/reject as the trainer: PROMOTE only if it advances the crown
   (fitness > champion). Crown bar note: the old 283 is obsolete under LAW v4.

## Pipeline order
1. build (`python3 build.py`) — the tests resolve `index.html` relative to themselves (repo root), so no copy step is needed
2. node test/rafzzer_gens.mjs status · spawn <g> <a> <mode> · gate <g> · run <g> <cap> · promote <g>
3. or: bash test/m46_step.sh <g> <cap>   (full generation, auto-cadence)
4. commit + publish.sh github when the game build changes (live game == training build).

Live state: champion = GEN 35 (fit 59, LAW v4) — see MASTER.md §9; next gen = 40.
