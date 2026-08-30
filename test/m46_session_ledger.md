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
