# 🧠 RAFZZER v1.0 — The Neural AI · Generational Journal

Base: AUTOPILOT v7.20 "NATURAL HUNTER" reflex ladder = **brainstem** (water escape, anti-stuck,
corridor executor, quest discipline — never unlearned). Above it: **neural cortex**, 18 senses →
10 tanh → 6 sigmoid urges (aggression, flee, rest, drink, patience, sprint), all clamped before
the brainstem sees them. Death writes **scars** (fight/neglect/water) that heighten the senses
that failed. Evolution: champion mutates each generation; a mutant runs ONLY after passing the
**human gate** (110 s shakedown on a probe seed: moves, decides, living unsaturated mind, rest
reflex, no crashes), and takes the crown ONLY if its fitness beats the champion under the one law.

**The law** (identical in-page and in-harness): 14·level + 0.05·xp + 1·kill + 2.5·predator +
4·quest + 5·landmark + 60·legend + 0.05·sim-seconds − death penalty (fight 120 / water 200 /
neglect 90 / unknown 60) − own misbehavior (stuck 8, circling loop 15).
*Amended between GEN 2 and GEN 3: game-bug detections no longer tax the wolf — they go to the
bug-hunt ledger below.*

| GEN | Outcome | Fit | Ruling |
|-----|---------|-----|--------|
| 1a (pre-fix) | rejected at gate | — | **Founder fault caught**: init saturated both layers (outs-std ≤0.009) → Xavier σ 0.38/0.45 + 0.85 sigmoid gain + ±2.5 gene clamp; lineage restarted |
| 1 | DIED — Level 2 Brown Bear @ L4, 477 xp, 5 km | −183 → 34* | **PROMOTED** (founder). Honest death, bars managed, 0 crashes. Scar fight=1 |
| 2a | rejected at gate | — | Saturated mutant (5/6 urges inert). Champion untouched, re-rolled |
| 2 | DIED — Level 5 Brown Bear @ L6, 892 xp, 6.8 km, 4 quests | −241 | **Outlived** — but audit revealed game bugs taxed fitness → law amended; champion rescored by replay |
| 1r (replay) | SURVIVED cap @ L5, 662 xp | +41 | Champion = mean 34. Same mind, same seed: the wild's variance is real |
| 3a | rejected at gate | — | Saturated again → mutation schedule retuned (σ 0.16 ×0.90^g, floor 0.10) |
| 3 | **SURVIVED cap** @ L6, 917 xp, 7.5 km | **+80** | **PROMOTED (champion)** — first cap-survivor, zero crashes |
| 4 | DIED — Level 7 Brown Bear @ L5, 291 s, exhausted (stamina 6) | 11 | **Rejected** — fit 11 < 80; third bear death of the lineage |
| 5 | gate PASSED (4 urges living) · DIED — Level 3 Brown Bear @ L2, only 103 s | −82 | **Rejected** — aggressive mutant picked a fight too early; evolution says caution wins |
| 6a | rejected at gate | — | Inert mutant (all urges constant, outs-std 0) |
| 6 | SURVIVED cap @ L5, 737 xp — **but ran despite its gate FAIL** | 24 | **Invalid** — my process fault (pipe swallowed the gate's exit code); logged openly, rejected; champion GEN 3 stands |

\* old-law score −183; ≈+27 rescored under amended law.

## 🐛 Bug-hunt ledger — 4 real bugs found, 3 fixed during this session
1. **FIXED · peak guide lied** — "Climb a High Peak" arrow pointed at the *highest nearby bump* (≈20 m on low terrain) though the quest crowns at y>50 → climb, no completion, re-pick, 5-min stalls (5× GEN 1, 2× GEN 2). Guide now only points at real thrones (nearest ground >50.5 m, search widened to 470 m).
2. **FIXED · peak quests offered where impossible** — generator now probes for a qualifying peak within 470 m before offering the quest; throne-less terrain gets a Gather quest instead (human players benefit too).
3. **FIXED · whiffed bites (`bug-bite-no-effect`)** — the bite lands in a ~78° cone of the wolf's BODY yaw; the bot bit the same 150 ms tick it aimed the camera, whiffing mid-turn. Bite cadence raised 650→900 sim-ms (inside the game's 750 ms cooldown) + all three strike sites now hold the bite until body alignment ≥0.35. Shakedown: 2 → **0**. (Bonus: detector's warn-key had a precedence bug `'miss'+SIMNOW()|0` → constant 0.)
4. **OPEN (narrowed) · non-peak quest stall** — 1 stall per ~5 sim-min run remains on seed 7777, a different quest type (hunt/gather class). Detector works; cause not yet run to ground.

Zero page errors and zero tick crashes across every generation. Monitoring: `bug-bot-loop` (wolf's own circling — penalized in-law).

## Session 2 — LAW v3 & the twenty-generation training run (GEN 7–26)

**LAW v3** (trainer's orders): the old law + three new honors —
**XP rate** +0.5/XP-per-sim-min (cap 240) · **quest rate** +60/quest-per-sim-min (cap 1.5) ·
**fastest-quest honor** +0.25/second under 90s per quest (accept→complete now timed) ·
survival raised to +0.08/sim-s. Live wolves scored on the boost tick-clock.

| GEN | Outcome | Fit | xp/min · q/min · quest avg |
|-----|---------|-----|---------------------------|
| 3r | baseline replay under law v3: survived cap, L5, 704 xp | **198** | 46.7 · 0.2 · 74 s |
| 7 | survived cap, L5, 755 xp | 186 | 52.3 · 0.21 · **45 s** |
| 8 | DIED — L3 Tiger @ 111 s (blitz: 218 xp/min) | 161 | 218.5 · 0 · — |
| **9** | **SURVIVED cap, L7, 1079 xp** | **283** | **79.6 · 0.37 · 43 s** — **CHAMPION** |
| 10, 12, 14 | gate three-strikes / deaths | 32, skipped | — |
| 11, 13, 15 | deaths / outlived | 145, 236, 138 | |
| 16 | DIED — L5 Bear @ 169 s (0.71 q/min!) | 113 | 163.9 · **0.71 · 30 s** |
| 17–20 | outlived (best 216) | 216, 23, 194, 200 | |
| 21–24 | bear/tiger deaths | 117, 62, 198, 62 | GEN 23: 205.6 xp/min blitz |
| 25 | DIED — L6 Bear @ 203 s — the most efficient quest-runner ever | 180 | 185.7 · **0.89 · 38 s** |
| 26 | DIED — L7 Tiger @ 400 s | 81 | 118.1 · 0 · — |

**GEN 9 repelled all sixteen challengers.** The law is selecting exactly the intended
profile: GEN 25 was the fastest quest-runner in history (0.89 q/min, 38 s avg) and still
fell — speed without endurance dies; endurance without speed (GEN 18: 26.7 xp/min, 227 s
quests → fitness 23) starves. GEN 9 is the mind that does both.
Session mechanics: mutation schedule retuned twice (σ floor 0.10→0.08, reset 0.05→0.03)
after gate three-strikes; harness poll bug fixed (it broke on `dead` one beat before the
death scorer ran, and the 1.2 s auto-respawn zeroed the telemetry — the −125 baseline
trough was read through that broken lens); A/B probe vs the live build proved no
regression before training started (NEW: 10 kills/L6/4 quests vs OLD-live: 3 kills/L0/1).

## Final standings
**Champion: GEN 9** — law-v3 fitness 283 (cap-survivor: L7, 1079 XP, 79.6 xp/min, 43 s average quests). Baked into the shipped build as `RAFZZER_SEED` (256 weights). Lineage totals across both sessions: 26 generations, 18 gate rejections, 2 law amendments, 2 schedule retunes, 1 process fault owned, 4 game bugs found (3 fixed). On-device evolution continues via localStorage.
**Open lead for next session:** gather-quest stalls ("Gather 6 mushrooms stuck at 0/6", seen twice) and the bear-cull pattern — 9 of 12 lineage deaths are bears; a bear-aware scar (learned avoidance of high-level ursines while exhausted) is the obvious GEN 27+ evolution.
