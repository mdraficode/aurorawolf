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

## XP refinement (user follow-up spec) — DEATH LAW + ONE POOL
- 2026-08-31 — Unified XP: removed the separate campaign XP counter; wolf.xp (level bar) + wolf.xpTotal (career, monotonic) are ONE pool. Sources: pickups +3, kills +3/predators +6, discoveries +10/25/60, quests 80–170·1.5^(t−1), legends/Beast Master biggest. Bigger deed = bigger XP; quests unfold the chain to higher-tier trophies.
- Death (new law): deed FAILS → board, manual re-accept (no XP, same stage); level bar cancelled (wolf.xp=0, restart current level) while level/xpNext/xpTotal/tier/stage/timer stand; respawn NEAR the fall (14–44 m, dry, away from killer + living predators, safety-scanned chunks). Removed old "every level lost / teleport 95 m / restart session" reset.
- Reload = checkpoint: career block (lvl/bar/next/xpTotal) persisted in revontulet_campaign_v1 (S.career); load restores into wolf (recalcWolfLevel). Legacy s.xp field dropped on load.
- campaign.test.mjs extended to 29 checks: unified-pool equity (career=run payout), death law (board rebuild, bar cancel, career/progression stand, respawn ≤75 m), career restore on reload. ALL PASS.
- Tests: quest/combat/gather/hunt/wolf/enemies PASS; full npm suite EXIT=0 (collision/audio in-suite FAILs = documented load flakes, PASS rerun).

## DEATH RIGOR — gradually harsher with player level (user follow-up)
- 2026-08-31 — Scaled death penalty: every death cancels the level bar (as before); from level 12 the wild ALSO takes levels: 12–16 → −1 · 17–21 → −2 · 22–26 → −3 · 27+ → −4 (cap, no endless spiral). De-leveling re-derives xpNext from the new level (bar restarts at the beginning of the previous level — faithful to the original wording).
- Golden rule kept: career XP (xpTotal), tier, legend, stage, run timer ALWAYS stand → penalties are pure TIME cost; the trophy-speedrun goal (higher tiers, shortest run) is untouched. Deaths still can't be used as a free heal/restart without paying the bar (+ levels from 12).
- Latent bug fixed en route: recalcWolfLevel() wiped the 'permanent' Wild-Hardened +5 max-HP perk on every level-up/death → hpBonus now tracked and preserved (constructor + recalc + perk grant).
- campaign.test.mjs → 33/33 PASS (added: lv14 −1, lv27 cap −4, low levels untouched, career stands, healed to new cap, xpNext re-derived). Focused regression wolf/enemies/quest/combat/gather/hunt/events PASS; full npm suite 18/18 + gather/eco/mystic, EXIT=0 (no flakes this run).

## BUGFIX ROUND (user report) — trophies-menu boot hang + HUD button overflow
- 2026-08-31 — BUG 1: TROPHIES → BACK re-injects the start template with btnStart disabled ("SUMMONING THE WILD…" / bootLine "Growing the forest…"); the enable-code ran only in the one-time boot transition → dead start page. FIX: extracted `menuReady()` (enable button, ENTER THE WILD, bootLine, runRecap) — called by the boot transition AND by `showOverlay('start')` when state==='menu'. Menu test `test/menu.test.mjs` (repro'd first: stuck disabled) → PASS; added to npm test loop.
- BUG 2: arch action buttons (✋⬆️⚡🐾🐺👃) text ink 6–8px past the circle (fixed 18–23px emoji + labels in 40–46px circles); heart badge "100%" +2.4px past. FIX: scaled fonts (46px: 14px icon / 6.5px label; touch 40px: 12.5px / 6px; labels nowrap; attack kept) + `overflow:hidden` clip guard on .tbtn/#tPause (clips to the circle on any device whose emoji font renders wider); #icoHp % 10.5→8.5px. `test/hudfit.test.mjs` measures ink-vs-inscribed-circle across phone-portrait/small-landscape/desktop → ALL FIT (-0.6..-18.9px margins); added to npm test loop.
- Suite: 20/21 in-loop PASS + gather/eco/mystic EXIT=0; collision in-loop FAIL = pre-existing load flake — PROVEN by running the PREVIOUS build (f3dc2c0:index.html) under the same conditions: identical 2/3 fail pattern, differing line each run. menu/hudfit/campaign standalone PASS.

## 🏆 LAW v4 — THE TROPHY LAW (un-pause, trainer's new core rule, 2026-08-31)
User: "generation success = the upper TIER TROPHIES; TRUE success = how fast the HIGHEST tier is
achieved and how EFFICIENTLY." Training now measures the CAMPAIGN, not kills.
- ARCHITECTURE: 20 → 24 → 26 senses (336 weights today). Senses 20-23: through-tier progress, tier
  ladder, deed meter, tier clock (par 600); 18-19: bear-proximity + sky-threat; 24: SIDE-CHANNEL
  (sideP: 1 errand slotted / 0.6 offered / 0 none), 25: GATE URGENCY (level-up deed meter). Old
  276-weight champion archived (rafzzer_champion_lawv3_archive.json) — brain re-seeded to wild seed
  20070; the 316-weight champion (GEN 35) was zero-padded 316→336 (rows 24-25 = 0, behavior
  preserved, no reseed) for the side-errant law build (commit c62466b).
- FITNESS (single law, in-page `fitness()` = harness): trophies 1200·2.5^(tier−1) EACH; top-tier best
  record time (1000−min)·0.6·2.5^(topTier−1); road gradient 220·prog·2.5^(tier−1) + 60·bosses;
  efficiency −clock·0.03·2.5^(tier−1) − 0.012·durS; small keeps (xp/min·0.5, quests·3, xp·0.04,
  level·1.5, kills·1, side errands +25·min(3,RUN.side)); death pen ×(1+0.6·(tier−1)); stuck/loop
  penalties unchanged.
- SENSES/NEUTRAL CODING: campProbe() (single CAMP.state source), CAMP.clock exported (p5),
  herbal prep deeds now route AND score on herb/mushroom pickups (was meat-scored, no routing),
  objective picker handles collect|herbal via wantOk().
- HARNESS: rafzzer_gens.mjs NI/NW 26/336, trait rows 180..259 (bear+sky+campaign+side/gate rows),
  polls + run reports carry `camp`/`trophy` snapshot (tier, trophies, topTier, topTime, clock) and
  `side` (RUN.side at run end; GEN 39+), spawn auto-archives + re-seeds champion on architecture
  change (316→336 = ZERO-PAD, no reseed). m46_gen.sh/m46_step.sh: cadence
  global×2 → trait×2 → traitglobal×2, RUN_CAP default 900 s wall (~2700 sim-s @ rate3 — one tier
  needs the long road).
- SIDE ERRANDS (shipped c62466b, live on Pages bda2201): the level-up (XP-gate) deed turns the
  board to 3 side errands — Bloodline Sprint (timed small-game, 60·Σ XP), Full Pannier
  (supply-checked collect, 55·Σ), Twin Fangs (double-kills, 80·Σ), Trail of Firsts (unfound
  landmark, 65·Σ). NO risk, NO luck (no predators/rivals/bosses/weather; generous clocks;
  timeout = zero penalty); one errand at a time, only while the gate lives; completion feeds the
  ONE XP pool, counts RUN.side, never advances the campaign. Bot policy: keepQuestsFilled slots
  one side errand while a gate deed rides, side flatline 10 min; questScore +3.2/min-6 for side.
  test/side.test.mjs 25/25 + regressions green.
- CROWN BAR: the old 283 is obsolete (new scale); promote stays human-gated (gate PASS + fitness
  > champion), the trainer reads trophy/topTime/clock in each run report. The howl/pack system is
  part of the world: the bot howls every 90-180 s, packs may bond/attack — luck that can speed or
  end a generation (accepted: it's the shipped game).

| gen | mode | gate | outcome | fit | tier | trophies | topT | clock | notes |
|-----|------|------|---------|-----|------|----------|------|-------|-------|
| 34 | global | PASS (1st) | SURVIVED(cap) | 25 | 1 | 0 | — | 902 | FIRST LAW-v4 gen (wild-mind re-seed). L7 · 1122xp · 31.2xp/min · 226s avg quest · walked q0→q1→prep→awaken, ritual accepted at cap · 0 warns 0 errs · PROMOTED → champion (fit 25) |
| 35 | global | PASS (1st) | DIED(fight) | 59 | 1 | 0 | — | ~600 | L7 · 1200xp · 126.6xp/min (4x faster road than 34) · awaken again · fell to a Level-8 Leopard predator (fight scar 1) · PROMOTED → champion (fit 59) |
| 36 | global | PASS (1st) | DIED(fight) | 19 | 1 | 0 | — | 548.6 | L7 · 1032xp · 112.9xp/min · first ritual + first Leopard-Legend fight (~18s combat) · REJECTED |
| 37 | global | PASS (2nd) | DIED(fight) | -43 | 1 | 0 | — | 373.5 | L4 · 481xp · 77.3xp/min · died in prep to a Rival Wolf PACK ATTACK (unlucky howl roll) → howl policy added (commit 3e899d3) · REJECTED |
| 38 | global | PASS (2nd) | DIED(fight) | -117 | 1 | 0 | — | 868.6 | L5 · 756xp · 52.2xp/min · near-cap road, fell to a Level-7 Brown Bear in prep · REJECTED |
| 39 | global | PASS (2nd) | DIED(fight) | -97 | 1 | 0 | — | 382.7 | L3 · 275xp · 43.1xp/min · first gen under the SIDE-ERRAND law build: accepted a Trail-of-Firsts errand at 334.7s (fast-lane) but fell to the Rival Alpha 48s later, never banking it (RUN.side 0) · REJECTED |
| 40 | global | PASS (trait a1) | DIED(fight) | 86→26 | 1 | 0 | — | 547 | v5 basis (game clock, 2.7x boost): died in PREP L4 to a Level-5 Lion — 444xp, 48.7 xp/sim-min, RUN.side 2. Scored 86 under 'unknown' pen (60) [classifier missing LION — fixed after]; honest rescore 26 < 59 → REJECTED |
| 41 | global | PASS (a1) | DIED(fight) | -93 | 1 | 0 | — | 1166 | v5: died PREP L2 to a Level-5 Brown Bear — 408xp, 21 xp/sim-min, wandered 8.8km, side 0 → REJECTED |
| 42 | global | PASS (a1) | DIED(fight) | -3 | 1 | 0 | — | 1483 | v5: died PREP L6 to a Level-7 Tiger — 799xp, 32.3 xp/sim-min, SIDE 4 (errand channel in full swing), 11.5km — long road but slow → REJECTED |
| 43 | global | PASS (a2) | DIED(fight) | -100 | 1 | 0 | — | 1509 | v5: died PREP L3 to a Level-4 Lion (classifier NOW classifies fight ✓) — 344xp, 13.7 xp/sim-min, wandered 11.6km, side 1 → REJECTED |
| 44 | global | PASS (a1) | DIED(fight) | -126 | 1 | 0 | — | 1042 | v6.1: died PREP L3 to a Level-4 Leopard — 365xp, 21 xp/sim-min, side 0 → REJECTED (30s into the v6 coach: side scoring now distance-aware; kite guard still missed dmg<13 cats) |
| 45 | global | PASS (a1) | DIED(fight) | -194 | 1 | 0 | — | 2810 | v6.1: survived 46 sim-min (22 km) but 20.4 xp/sim-min — died PREP L6 to a Level-5 Snow Leopard, side 0 → REJECTED. Finding: cats flee at 34% hp = dead before fleeing (wolf run 18 > cat run 13 — escape is physical; the LINE was the bug) |
| 46 | global | PASS (a1) | SURVIVED(cap) | -74 | 1 | 0 | — | 2667 | v6.2: **FIRST v6 PROMOTION** — cap-survivor: L6, 957xp, 21.5 xp/sim-min, RUN.side 6 (errand channel at full tilt), no died died to anything. Promoted (fit -74 > -96) → champion GEN 46. Fuel: flee line for ALL wolf-hunters (v6.2) |
| 47 | global | PASS (a1) | DIED(fight) | -152 | 1 | 0 | — | 1790 | died PREP L4 to a Level-6 Brown Bear — 563xp, 18.9 xp/sim-min, side 0 → REJECTED (child of 46 lost the errand appetite) |
| 48 | global | PASS (a2) | DIED(fight) | -166 | 1 | 0 | — | 1241 | died PREP L3 to a Level-5 Lion — 402xp, 19.4 xp/sim-min, side 0 → REJECTED (children keep losing side-6 appetite under global mutation) |
| 49 | trait | PASS (a2; a1 gate FAIL livingMind) | DIED(fight) | -144 | 1 | 0 | — | 2782 | **REACHED AWAKEN + fought the Leopard Legend (first v6)** — L7, 1282xp, 27.7 xp/sim-min, side 0, died to the Leopard Legend. fit -144 < -74: the 46-min clock (-116) taxes the slow walk → REJECTED. Direction: speed (marry GEN 49's road with GEN 46's errand appetite) |
| 35r-v6 | — | — | RE-BASELINED | -96 | — | — | — | — | CROWN RE-BASELINE (2026-09-01): the old fit 59 was wall-clock-inflated; two honest v6 samples of GEN 35 weights: -113 (L5/677xp/1370s/prep) + -78 (L3/340xp/709s/prep) → mean -96 = the crown bar; old 59 kept in lineage history |
| 50 | global | PASS (a2; a1 gate FAIL livingMind) | DIED(fight) | -55 | 1 | 0 | — | 1152 | **PROMOTED (2nd of the session)** — died PREP L5 to a Level-5 Lion · 708xp · **36.9 xp/sim-min (best pace of the v6 era, 2x GEN 46)** · side 2 · 1152 sim-s. fit -55 > bar -74 → **CHAMPION GEN 50** |
| 51 | global | PASS (a1) | DIED(fight) | -106 | 1 | 0 | — | 388.8 | REJECTED (bar -55). Died at q1/388.8s/123xp/19.0 xp/min — slowest pace in 10 gens — killed by the Rival Wolf. Autopsy: hostile-pack swarms are NOT heavy hunters (dmg 4-6 each) → v6.3 heavyHunter flee never applied; flee line fired 7× but the yaw flip-flopped toward whichever member was nearest → zigzagged INSIDE the pack. → v6.4 pack-aware escape (centroid flee + heading cache + 6s hold + sprint to stam 8). |
| 52 | global | PASS (a1) | DIED(fight) | -87 | 1 | 0 | boss L0 | 1840 | REJECTED (bar -55) — **BREAKTHROUGH GEN**: reached stage BOSS (q0→q1→prep→awaken→boss) and died to the Leopard Legend. BEST pace yet 38.3 xp/min · L7 · 1175xp · side 6. Autopsy: 0 'boss' bumps — the wolf NEVER entered the fight loop; the legend ambushed (flank teleport, ×1.5 bites) and it stood in the 41–62% dead zone (below bossEngage, above fleeAt) and was eaten in ~6s. → v6.4b legend gate (flee below 88% unless mid-fight; engage fresh at L8+/88%+; fight continuation to 42%; crouch ambush bites 7.5 dmg). |
| 53 | global | PASS (a1) | DIED(fight) | -128 | 1 | 0 | prep L0 | 552.8 | REJECTED (bar -55). Died to the Rival Wolf at stage prep: (1) PRE-EXISTING TDZ — swim branch read targetPk before its let → blinded the tick whenever swimming; jumped right after a swim; (2) land flee vs a swarm is hopeless (sprint 4-6s stamina can't open the 90m give-up radius; GEN 51/53 fled 7-10x, bitten every 0.3s). → v6.4c: TDZ fix, pack escapes aim for WATER + ford the far bank (rivals refuse deep water), challenge packs = walk-away kite (with rival-deed exception). |
| 54 | global | PASS (a1) | DIED(fight) | -79 | 1 | 0 | prep L0 | 906.4 | REJECTED (bar -55). Died to the Level-5 Lion at prep (L3, 277xp, 18.3 xp/min) — best stamina of the coach round; autopsy via the new flee payload: rested to ~70% but left rest at ~20 stamina (regen 0.5/s still vs 6/s sprint drain) → flee got 2s of sprint, walked at 7-9 vs lion 13, chewed 7x in 8s; drink trip of 61m started at ~55% hp. → v6.4d: rest until hp > max(restAt,82%) AND stamina > 45; drink trips need hp > 55%. |
