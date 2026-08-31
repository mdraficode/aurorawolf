# M46 session ledger — 2026-08-31 (session 2 of the mission)

Strategy (trainer Q: "best choice for better generations?" → implemented):
- Trait mode: mutate ONLY the 2 new sense rows (W1 rows 18-19 = indices 180..199), σ 0.15, from the trait-chain champion — locked 256 weights untouched (gate-safe).
- Traitglobal: full-brain mutation (σ floor 0.08) FROM the trait-chain champion.
- Chain: rafzzer_traitchamp.json compounds the best env-measured run regardless of the 283 crown bar.
- Crown bar unchanged: formal promote/crown only if fitness > 283 (authentic GEN 9).

| gen | mode | gate | outcome | fit | L | xp | xp/min | notes |
|-----|------|------|---------|-----|---|----|--------|-------|
| 27 | global | PASS (1st) | SURVIVED | 145 | 4 | 442 | 23.8 | 7 kills 0 deaths|
| 28 | global | 3-STRIKE | — | — | — | — | — | a1/a2 died L0, a3 livingMind-std<0.01 → batch stop, trainer Q → trait strategy |
| 28 | trait | PASS (1st) | SURVIVED | 77 | 2 | 236 | 14.6 | chain seeded |
| 29 | trait | PASS (2nd) | SURVIVED | 225 | 6 | 864 | 57.2 | chain 77→225 — best env run of session; a1 livingMind fail |
| 30 | trait | PASS (1st) | DIED(fight) | 83 | 5 | 628 | 108.1 | L4 Brown Bear @348s; chain holds 225 |
| 31 | traitglobal | PASS (2nd) | SURVIVED | 214 | 6 | 899 | 46.7 | a1 died (global reset basin); chain holds 225 |
| 32 | … | … | … | … | … | … | … | in flight |

Baseline facts: authentic GEN 9 champion fit 283 (original env). This env replays: −1 / 238 / 131 (median 131).
Replay evidence: test/history/phase0_replay/ (replay_gate_gen9_pass.json + 3 run records).

Update mid-session:
- Evidence: traitglobal mostly destructive in this env (31 a1 died, 32 fit -122 after gate-pass; rows-only trait produced the best run 225).
- GEN 33-36 driver flipped: trait ×2 first (rows-only), traitglobal ×2 fallback.

## GEN 33 investigation — modeling bug found & fixed
- GEN 33: 4/4 gate FAILs, all `livingMind` with outs-std < 0.004 (saturated cortex).
- ROOT CAUSE (my sense encoding): input 18 was `clamp(bearD/80)` = "no bear nearby" fed a CONSTANT 1.0
  (bear at 40m → 0.5; no bear → 1.0 — polarity inverted). The trait rows therefore injected a
  near-constant bias into the hidden layer → tanh saturation → output variance collapse → livingMind fail.
- Same signature explains GEN 28a3, 29a1 gate-fails.
- FIX: `clamp(1 - bearD/80, 0, 1)` (proximity: 1 = close). Champion unaffected (its rows are zero).
- CHAIN RESET: traitchamp (fit 225) was trained on the inverted sense → deleted; trait experiment re-ran from zero with correct encoding. Run records of gens 27-32 remain as evidence (note: 225 was under the inverted sense).
- M46 driver: trait ×2 → traitglobal ×2 → stop.

## 🛑 PAUSED 2026-08-31 (trainer) — resume via M46_RESUME.md
| gen | mode | gate | outcome | fit | L | xp | xp/min | notes |
|-----|------|------|---------|-----|---|----|--------|-------|
| 32 | traitglobal | PASS (1st) | DIED(fight) | -122 | 0 | 12 | 7 | Rival Alpha @103s; chain holds 225 |
| 33 | trait×2 + tg×2 | 8× FAIL livingMind | — | — | — | — | — | champion-probe on gate-33 world PASSED (stds .019-.025) → world OK; σ0.15 row-draws flatten outputs. FIX PLANNED: trait σ 0.15→0.10, touch 0.8→0.6 (NOT yet applied) |
- Chain reset (traitchamp deleted) — old 225 state was inverted-sense-era; trait restarts from zero rows.
- Sense-18 polarity fix COMMITTED 8fed10e (proximity encoding). Champion unaffected.
- Next: soften trait σ → re-run GEN 33 (fresh) → 34-36 → Phase 3 (crown bar question open: 283 vs env-median 131).

## CAMPAIGN LANDED (progress-quest update, between M46 sessions)
- 2026-08-31 — Major gameplay update built & verified while M46 training stays paused.
- `test/campaign.test.mjs` 26/26 PASS (board 3-4 choices, one-active rule, q0→q1→prep→awaken→ritual→boss→legend→Beast Master→TROPHY tier 1→tier 2, atomic XP, stash: no reaccept farm, no double trophy, timer laws, death keeps progression, reload persistence).
- Regression: quest.test PASS, combat.test PASS, gather/ecosystem/mystic PASS (chain exit 0); 18-test loop 14 PASS in-suite, 4 flakes (landscape/events/hunt/audio) all PASS standalone — same load-flake class as the noted audio/collision flakes.
- Fixes found by the campaign suite: legacy board collision (`arm()`), E-key pickup hijacking the altar (`ritualReady()` outranks pickups), legend boss never registered in `bosses` (`useAltar` push), timer drift under pause (`elapsed()` minus live pause).
