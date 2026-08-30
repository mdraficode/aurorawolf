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
