# 🐺 AURORA WOLF (REVONTULET) — MASTER FILE

**Read this first.** This is the handoff/training document of the whole project. A fresh session
(any model, any machine) can resume work from this file alone after cloning the repo — it carries
the project identity, the codebase map, the neural-training system, the CURRENT progress state,
and the road ahead. **Rule: whenever a session changes the law, the brain architecture, the
features, or the lineage state, update this file in the same commit.** It is the memory of the
project. Last updated: **2026-09-05** (workspace recovery; docs brought current for the 2026-09-04
commits — in-place re-seed, VFX pass, standable obstacles; collision suite rewritten). Previous
headers: 2026-09-03 (human-speedrun — the tier-1 fight coached as closed), 2026-09-01 (post GEN 39).

---

## 1 · Identity & links

| Thing | Value |
|---|---|
| Game | **REVONTULET — Aurora Wolf** · 3D open-world wolf survival, one self-contained HTML file |
| Live (GitHub Pages) | **https://mdraficode.github.io/aurorawolf/** |
| Repo | **github.com/mdraficode/aurorawolf** (public, default branch `main`, Pages serves **/** from `main`) — **the ONLY repo; `aurorawolf-v2` RETIRED per user directive (never touch/push it)** |
| Local workdir | `aurorawolf/` (built `index.html` is committed; `build.py` regenerates it) |
| GitHub push auth | `~/.ghtoken` (classic PAT, `repo` scope) — **never committed**, used by `publish.sh` and `git push` |
| APK | Tag `archive/android-apk` in git history + `~/.revontulet.keystore` (never committed). APK only on explicit request |
| Player doc | `README.md` (repo root); all docs live in `docs/`: `CAMPAIGN_DESIGN.md`, `TRAINING_MANUAL.md`, `BUGS.md`, `PLAYLOG.md`, `LINKS.md`, `RAFZZER.md`, `ENVIRONMENT.md` |
| Agent docs | `docs/AGENT_BRIEF.md` (full session context) + `docs/MASTER.md` (this file) — read both first. The stale handoffs `NEXT_DEV.md` / `M46_RESUME.md` / `M46_MISSION_BRIEF.md` / `MISSION2.md` were deleted 2026-09-02 (they named GEN 9 · fit 283 as champion). |

---

## 2 · The game, in one paragraph

Procedural infinite wilderness (seeded), biomes, day/night + weather, hunt/gather/survive as a wolf.
The **campaign** is the point: level up (career XP in ONE unified pool), walk the quest chain
`q0 → q1 → prep (2-3 preparation deeds) → awaken (ritual at the altar) → boss (the tier's Legend
fight)` per **leg**, and a **tier trophy** is minted when the campaign cycle closes — trophies are
records `{tier, name, date, time, xp}` stored in the save. A tier's fastest close-time is the
"speedrun" metric of the game. Systems: pack-bonding (howl to bond a pack; rivals may attack),
side errands (fast-XP board), death rigor (death regresses a level, career XP stands, respawn
near the fall), perks, landmarks, spirit. URL params: `?seed=`, `?quality=low`, `?autostart=1`,
`?autopilot=1&nolearn=1` (AI watch mode), `?speed/rate/re` (bot boost).

---

## 3 · Repository layout

```
aurorawolf/
├── index.html          ← the BUILT single-file game (build.py output; committed & published)
├── build.py            ← assembles shell.html + style.css + vendor/three.min.js + src/p1..p6 + autopilot → index.html
├── publish.sh          ← github mode: build + push index.html via GitHub Contents API (Pages live in ~1 min);
│                         archive mode: archive.org snapshot + spoo.me alias (rarely used)
├── package.json        ← playwright dev-dep only
├── src/
│   ├── shell.html      ← HTML shell (menus, HUD skeleton), replaced by build.py
│   ├── style.css       ← all UI styling
│   ├── p1.js           ← world gen (chunks, biome, terrain), entities core, input, HUD helpers
│   ├── p2.js           ← scene, sky, day/night, weather, particles, vegetation library
│   ├── p3.js           ← the wolf & animals (species, predators, prey, combat, pickups)
│   ├── p4.js           ← chunks streaming, weather, audio, UI, main loop, RUN session record (window.RUN)
│   ├── p5.js           ← 🏆 THE CAMPAIGN: quest chain, tiers/legs/stages, XP gates, SIDE ERRANDS,
│   │                     trophies, CAMP object (state/clock/side/…), CAMPDBG test helpers, save
│   ├── p6.js           ← 🐺 THE PACK: howl → bond, pack hunts with you, rivals/pack attacks
│   └── autopilot.js    ← 🤖 AI PLAY (watch mode) + 🧠 RAFZZER v1.0 neural brain + bot policy + LAW v4 fitness
├── docs/                   ← knowledge docs: AGENT_BRIEF, MASTER, BUGS, PLAYLOG, TRAINING_MANUAL,
│                              CAMPAIGN_DESIGN, ENVIRONMENT, LINKS, RAFZZER, RESTORE (README stays at root),
│                              HANDOFF_2026-09-05 (recovery proof + the exact resume point)
├── test/                   ← TESTS ONLY (27 suites in `npm test`, + 8 standalone suites)
│   ├── *.test.mjs / *.check.mjs ← the suites (side, campaign, pack, bosskit, world, collision, …)
│   ├── smoke.mjs, menu_trophy_ai.mjs ← in `npm test` despite the plain names
│   ├── speedrun/           ← the human-speedrun rig (human.mjs, run.mjs, probe_fight.mjs,
│   │                         probe_boss_dps.mjs; reports gitignored under speedrun/runs/)
│   └── browserlab/         ← Chromium 149 + SwiftShader bootstrap
├── training/               ← 🧠 ALL RAFZZER TRAINING WORK lives here (moved 2026-09-02)
│   ├── rafzzer_gens.mjs         ← THE HARNESS (spawn/gate/run/promote/status); `const DIR='training'`
│   ├── rafzzer_ship.mjs / rafzzer_train.sh / rafzzer_verdict.py / m46_gen.sh / m46_step.sh
│   ├── m46_session_ledger.md    ← the per-generation legal ledger
│   ├── rafzzer_champion.json    ← CURRENT CROWN (GEN 50 · fit −55) — build.py BAKES this into index.html
│   ├── rafzzer_lineage.json     ← every generation's verdict (whole history)
│   ├── rafzzer_gate_gen{N}.json / rafzzer_run_gen{N}.json ← per-gen reports
│   ├── rafzzer_candidate.json   ← TRANSIENT spawn output (gitignored)
│   ├── logs/                    ← per-gen console records
│   └── history/                 ← pre-LAW-v4 + phase-0 replay records
├── tools/
│   └── ship.sh             ← single-branch publish: build + push to main → live ~1 min
├── test/browserlab/      ← sandbox bootstrap: `bash test/browserlab/boot.sh` (Chromium 149 + SwiftShader from npm)
├── vendor/three.min.js   ← embedded Three.js
├── shots/                ← screenshots (regenerable, gitignored)
└── uploads/  ← reference screenshot (watch.html removed 2026-09-02 — it was a stale pre-crown-bake build)
```

---

## 4 · Build, run, test, publish

```bash
cd aurorawolf
python3 build.py                 # rebuild index.html from src/
# play locally: open index.html, or serve it; live = https://mdraficode.github.io/aurorawolf/
bash tools/ship.sh "what changed"   # build + commit + git push origin main → Pages (LIVE ~1 min)
# NOTE: single-branch `main` (no feature/session branches) — feature work commits straight to main
```

---

## 5 · THE TRAINING PROJECT — what this is for

**Goal (user's core rule):** train a neural bot (RAFZZER) to *speedrun the campaign*. A
generation's **main success = upper-tier TIER TROPHIES**; **true success = how fast the highest
tier is achieved and how efficiently**. The whole pipeline below exists to evolve that bot one
generation at a time, under a human-gated, law-scored death-or-cap regime.

**The loop:** spawn (mutate the champion) → gate (sanity) → run (a full timed campaign attempt) →
**trainer verdict** (a human/agent judges the run report: promote or reject) → collect-at-end
(commit artifacts, update ledger + this file, publish).

---

## 6 · RAFZZER v1.0 — the neural brain

### 6.1 Architecture (LAW v4 build, current)
- **NI = 26 senses · NH = 10 hidden (tanh) · NO = 6 outputs (sigmoid, 0.85 gain) · NW = 336 weights**
- Layout: `W1 = w[0..NI*NH)` (input→hidden), `b1 = w[NI*NH..NI*NH+NH)`, `W2 = w[NI*NH+NH .. NI*NH+NH+NH*NO)`, `b2 = w[NW-NO..NW)`.
- Seed: `window.RAFZZER_SEED` (seed 20070, 336 values) — the wild mind from which every
  lineage starts. Rows 24–25 (side-channel, gate urgency) are **zero-padded** from the former
  316-weight brain, so the GEN-35 champion's behavior was preserved, not re-rolled.
- `think()` maps outputs to knobs each tick, then the bot consumes the knobs:
  `aggr→aggression/bossEngage/commitStam`, `flee→flee/yieldR/fearMul`, `rest→restAt`,
  `drink→drinkAt`, `pat→stalkGive`, `spr→sprintRes`. **SAFK** = fixed safe reflex baseline —
  any non-finite output or exception falls back to reflexes (the brainstem never dies).

### 6.2 The 26 senses (order matters — `sense()` in src/autopilot.js)
| # | sense | notes |
|---|---|---|
| 0 | hp/maxHp | 1 |
| 1 | stamina/100 | |
| 2 | nearest predator d/80 | the OLD ground-predator channel |
| 3 | (pred level − wolf level)/10 | −1..1 |
| 4 | predator chasing/attacking = 1 | |
| 5 | predator dmg/20 | 0..1.2 |
| 6 | nearest rival d/40 | |
| 7 | boss-hit d/120 | |
| 8 | nearest prey d/60 · 9 · prey meat/8 | |
| 10 | goal distance/80 | |
| 11 | XP EMA (recent xp/sec, 0..1) | |
| 12 | level/25 · 13 · storm · 14 · chill/8 | |
| 15–17 | scars fight/neglect/water ÷3 | scar memory |
| 18 | **ursine PROXIMITY** `1 − bearD/80` | bear-aware (M46 bugfix: was bearD/80 which fed a constant 1.0 → saturation → gate strikes) |
| 19 | **graded sky-threat** (eagle dive 1 / chase 0.55 / soar 0.25, falls off with range) | |
| 20 | **through-tier progress** 0..1 (legs + stage + prepDone; q0 0 → trophy 1) | LAW v4 |
| 21 | tier ladder clamp((tier−1)/4) | LAW v4 |
| 22 | current deed meter (have/need; side errand preferred as "the deed") | LAW v4 |
| 23 | tier clock (wall-s since tier began; 600 s = par) | LAW v4 |
| 24 | **side-channel** sideP: 1 = errand slotted, 0.6 = offered, 0 = none | side-errand law build |
| 25 | **gate urgency** = level-up deed's have/need | side-errand law build |

`campProbe()` is the single source of the campaign senses (from `window.CAMP.state()` +
`window.CAMP.side()` + `CAMP.clock()`).

### 6.3 LAW v4 fitness — THE ONLY SCORING LAW (verbatim, in-page `fitness()` = harness)
```text
f = Σ_trophies  1200 · 2.5^(tier−1)                          // (1) THE TROPHIES (dominant)
  + (1000 − min(topTimes)) · 0.6 · 2.5^(topTier−1)           // (2) SPEED at the top tier
  + 220 · prog · 2.5^(tier−1) + 60 · bosses                  // (3) THE ROAD gradient
  − clock · 0.03 · 2.5^(tier−1) − 0.012 · durS               // (4) EFFICIENCY — v5 (2026-09-01): clock & durS
                                                             //     are GAME time (CAMP.simClock, tSec-based), not wall; the
                                                             //     boost never inflates scores; at 1× live play game == wall
  + 0.5·min(xpRate,240) + 3·quests + 0.04·xp + 1.5·maxLevel + 1·kills
  + 25 · min(3, RUN.side)                                    // side errands (capped at 3)
  − pen − stall
pen   = {fight:120, water:200, neglect:90, unknown:60} · (1 + 0.6·(tier−1))   // death penalty
stall = 8·stuck + 15·bug-bot-loop        // only the wolf's own misbehaviour is taxed
```
`classify(cause)`: water if swimming at death; fight for predator/rival/boss names; neglect for
cold/storm/hunger/thirst; unknown otherwise.

---

## 7 · Bot policy (the cortex's behavior layer)

- **questScore**: main deeds get baseline scores; `if (q.side) s = max(s + 3.2, 6)` — side errands
  are always worth a slot. Shunned quests get −50/−60.
- **keepQuestsFilled**: one **main** deed + at most one **side** errand; side errand is kept ONLY
  while a level-up (XP-gate) deed is active; main deed flatline 12 min, side flatline 10 min;
  extras are abandoned. Board refills via `refill()`/`sideRefill()` (side board retries every 30 s
  of game time).
- **Howl policy (neutral coding, commit 3e899d3):** the bot howls for a pack only when
  `hpFrac > 0.75 && level ≥ 4 && !swimming && no legend within 60 m && no hostile pack attack`;
  otherwise it re-listens in 30 sim-s. (GEN 37 died to a rival pack-attack roll — this removed
  avoidable dice.)
- **Boss/Legend combat (neutral coding):** submerged/invulnerable → clear + flee; charging →
  sidestep; else 2-bite hit-and-run with 2600 ms retreat; flee at hpFrac < 0.42.
- **Tether-break:** if the bot parks 3 min in one region with zero quest progress, it strikes out
  for new ground (450 m trek).

---

## 8 · The generation loop — exact commands

```bash
# ONE GENERATION, run to verdict (must complete inside a single session — see footguns):
cd aurorawolf
node training/rafzzer_gens.mjs status                      # lineage + champion
bash training/m46_gen.sh 40 900                            # spawn→gate→run for GEN 40 (cap 900 wall-s)
node training/rafzzer_gens.mjs promote 40 --verdict=reject --note="…"   # trainer's verdict
# verdicts: --verdict=promote  (gate PASS + fitness > champion fit REQUIRED; writes champion file)
#           --verdict=reject   (standard)
# then COMMIT everything (+ update training/m46_session_ledger.md + MASTER.md §10) and:
git add -A && git commit -m "M46 …" && git push origin main   # single-branch main — ship.sh does build+commit+push in one
```

**Pipeline detail:**
1. **spawn** `<g> <attempt> [global|trait|traitglobal]` — mutates the champion. Global = 0.18/weight
   `N(0, σ)`, σ = `max(0.08, 0.16·0.90^(g−1))`, 3% reborn `N(0,0.45)`, clamp ±2.5. **trait** = only
   W1 rows 180..259 = inputs 18..25 (bear/sky/campaign/side/gate rows), σ 0.15 — proven gate-safe;
   **traitglobal** = trait rows + global mutation (diversity fallback). Attempts re-roll the dice
   (own RNG stream), the law never changes.
2. **gate** `<g>` — 110 s sanity: loadOk, finiteMind, no page errors, no tick crashes, moved > 40 m,
   no suicide, ≥3 decision kinds, `livingMind` (≥2 outputs with std ≥ 0.01), rest reflex. Writes
   `rafzzer_gate_gen{g}.json`; **exit 0 = PASS**.
3. **run** `<g> [capSec]` — seed 7777, `?speed=8&rate=3&re=3` (≈3 sim-s per wall-s); RUN_CAP 900 wall-s
   default. Polls every 2.5 s; death scores via `RAFZZER_LAST`, else cap-survivor. Report carries:
   fitness, outcome, cause, cls, durSimS, maxLevel, xp, xpMin, qMin, avgQuestS, **trophy snapshot**
   (tier/trophies/topTier/topTime/clock/stage/leg), **side** (RUN.side), hist, knobs, scars, warns, errs.
4. **promote** `<g> --verdict=…` — appends the verdict to the lineage; `promote` also rewrites the
   champion file (weights = current candidate) and prints `verdict: blocked` if the gate failed.

**Cadence & rules (M46):** human gate before a full generation; no promote without the trainer's
verdict; **promotion only when fitness advances the crown** (current bar: 59, GEN 35); 3-strike
stop (exit 3 = all attempts failed); collect-at-end publishing; never chain gate→run through a pipe
(a GEN-6 lesson: the pipe swallowed the gate's exit code).

---

## 9 · Current state (2026-09-01) — WHERE WE LEFT OFF

**Champion: GEN 50 — fit −55** (v6 basis, 2026-09-01 — second promotion of the session): died PREP L5 at
1152 sim-s · 708xp · **36.9 xp/sim-min (best pace of the v6 era)** · RUN.side 2. Predecessor GEN 46
(fit −74): first v6 cap-survivor (2667 sim-s · L6 · RUN.side 6). **Crown re-baseline (same day):** GEN 35's old 59 was
wall-clock-inflated; two honest v6 samples of its weights → mean **−96** = the bar GEN 46 beat. The
frontier remains: reach awaken FAST, then survive/beat the Leopard Legend (GEN 49 got there — 2781
sim-s, died to the Legend, REJECTED for slowness) and close a leg/tier.

**SESSION 2026-09-03 (human-speedrun continued, real-input rig):** the tier-1 Legend fight is
**coached as closed** — the PARK law (walk-orbit at r = 7/neck freezes the gap dead-behind:
every strike whiffs, walk regens 11/s; probe v25: 0.22 hits/s, 52 s kill, net −18 of 196 hp
at L12) beats the band ring (39-56 s, −37..−48) and all previous grammars (v11-v24 lost;
the old sprint ring: 0 damage in 8 real attempts). The iron route now fights at its natural
L5 (the L8+/88% protocol and L18 gate were for the old dagger-bite play; the park needs no
over-grind). Rig fixes (top-up before the channel — the old code rested after it, dead code;
flee floor stam ≥ 15; shut-in entry at stam ≥ 25) are in `test/speedrun/run.mjs`; the
ledger + coaching are `BUGS.md` §2026-09-03, `TRAINING_MANUAL.md` §4-§5, handoff
`test/speedrun/HANDOFF_2026-09-03.md`. **Trophy status: not yet minted** — the park has
run-to-run variance (0.22 vs 0.44 hits/s on identical code; phase rolls) and its tail-zone
gates still slip in the real integration; that is the one open item. Bot gate unchanged:
LAW v4, no promote without a trainer verdict. (Same session: the home screen gained an explicit
**🧭 NEW GAME** — fresh `?seed=` + fresh wolf, level 0 — while **▶ CONTINUE** resumes the saved
world and level, and the ⭐ high-score recap + 🏆 trophies are preserved; see `BUGS.md`.)

| gen | mode | gate | outcome | fit | tier | notes |
|---|---|---|---|---|---|---|
| 34 | global | PASS (1st) | SURVIVED(cap) | 25 | 1 | first LAW-v4 gen, wild re-seed · L7/1122xp · awakened · PROMOTED |
| **35** | global | PASS (1st) | DIED(fight) | **59** | 1 | 126.6 xp/min (4× faster road) · died to L8 Leopard · **CHAMPION** |
| 36 | global | PASS (1st) | DIED(fight) | 19 | 1 | first ritual + first Leopard-Legend fight (~18 s combat) · REJECTED |
| 37 | global | PASS (2nd) | DIED(fight) | −43 | 1 | died in prep to a rival PACK ATTACK (howl roll) → howl policy · REJECTED |
| 38 | global | PASS (2nd) | DIED(fight) | −117 | 1 | near-cap road (868 s), fell to L7 Brown Bear in prep · REJECTED |
| 39 | global | PASS (2nd) | DIED(fight) | −97 | 1 | first gen under the 26-sense build · accepted a Trail-of-Firsts errand at 334.7 s but died to the Rival Alpha before banking it (RUN.side 0) · REJECTED |
| 40 | global | PASS (trait a1) | DIED(fight) | 86→26 | 1 | v5 clock · 2.7× boost · died PREP L4 to a Level-5 Lion — classifier missed LION ('unknown', pen 60); fixed post-run; honest rescore 26 · RUN.side 2 · REJECTED |
| 41 | global | PASS (a1) | DIED(fight) | −93 | 1 | slow wanderer (21 xp/sim-min, 8.8 km) · died PREP L2 to a Level-5 Brown Bear · REJECTED |
| 42 | global | PASS (a1) | DIED(fight) | −3 | 1 | longest road · L6 · 799xp · RUN.side 4 (side-errand channel fully engaged) · died PREP to a Level-7 Tiger · REJECTED |
| 43 | global | PASS (a2) | DIED(fight) | −100 | 1 | died PREP L3 to a Level-4 Lion (classifier now correct) · 13.7 xp/sim-min · 11.6 km wandered · REJECTED |
| 44 | global | PASS (a1) | DIED(fight) | −126 | 1 | 0 | — | 1042 | v6.1 coach on · died PREP L3 to a Level-4 Leopard · 21 xp/sim-min · side 0 · REJECTED (kite guard missed dmg 9–11 cats) |
| 45 | global | PASS (a1) | DIED(fight) | −194 | 1 | 0 | — | 2810 | survived 46 sim-min / 22 km but 20.4 xp/sim-min · died PREP to a Snow Leopard → the cat-flee-line finding · REJECTED |
| **46** | global | PASS (a1) | **SURVIVED(cap)** | **−74** | 1 | 0 | — | 2667 | **FIRST v6 PROMOTION** — cap-survivor under v6.3 flee line: L6 · 957xp · RUN.side 6 · 0 warns · 0 errs · **CHAMPION** |
| 47 | global | PASS (a1) | DIED(fight) | −152 | 1 | 0 | — | 1790 | died PREP L4 to a Level-6 Brown Bear · 18.9 xp/sim-min · side 0 · REJECTED (child lost the errand appetite) |
| 48 | global | PASS (a2) | DIED(fight) | −166 | 1 | 0 | — | 1241 | died PREP L3 to a Level-5 Lion · 19.4 xp/sim-min · side 0 · REJECTED (global mutation keeps shredding the survivor-combo) |
| 49 | trait | PASS (a2) | DIED(fight) | −144 | 1 | 0 | — | 2782 | **REACHED AWAKEN + first v6 Leopard-Legend fight** (died to it) · L7 · 1282xp · 27.7 xp/sim-min · side 0 · REJECTED for slowness (clock −116) |
| 50 | global | PASS (a2; a1 gate FAIL livingMind) | DIED(fight) | −55 | 1 | 0 | — | 1152 | **SECOND v6 PROMOTION** — died PREP L5 at **36.9 xp/sim-min (best of the era until 52)** · L5 · 708xp · side 2 · **CHAMPION** |
| 51 | global | PASS (a1) | DIED(fight) | −106 | 1 | 0 | — | 388.8 | died q1 to the Rival Wolf (pack swarm — flee line fired 7× but yaw flip-flopped inside the pack) · 19.0 xp/min · side 0 · REJECTED → v6.4 pack-aware escape |
| 55 | global | PASS (a1) | DIED(fight) | −136 | 1 | 0 | awaken | 2033 | **REACHED AWAKEN** · L6 · 1124xp · 33.2 xp/min · **side 7 (era-best errand appetite)** · 16.4 km · died to a Level-5 Snow Leopard at 62% hp/stam 10 · REJECTED — v6.4d discipline held (longest healthy road of the coach round) |
| 54 | global | PASS (a1) | DIED(fight) | −79 | 1 | 0 | prep | 906 | died to the Level-5 Lion — first flee-payload autopsy: rested to ~70% but left at 20 stamina (regen 0.5/s vs sprint drain 6/s) → 2 s of sprint then chewed at walk speed; drink trip started at 55% hp → v6.4d rest/discipline gates · REJECTED |
| 53 | global | PASS (a1) | DIED(fight) | −128 | 1 | 0 | prep | 553 | died to the Rival Wolf again — TDZ bug blinded every swim (targetPk read before its `let`), and land-flee vs a swarm can't open the pack's 90m give-up radius → v6.4c (water escape + TDZ fix + challenge kite) · REJECTED |
| 52 | global | PASS (a1) | DIED(fight) | −87 | 1 | 0 | boss | 1840 | **BREAKTHROUGH** — reached stage BOSS (q0→q1→prep→awaken→boss) and died to the Leopard Legend · L7 · 1175xp · **38.3 xp/sim-min (best yet)** · side 6 · REJECTED (bar −55) → v6.4b THE LEGEND GATE |

Full per-gen record: `training/m46_session_ledger.md` + `training/rafzzer_lineage.json` +
`training/rafzzer_run_gen{N}.json`. (The old `M46_RESUME.md` handoff was deleted 2026-09-02 — it still named GEN 9 · fit 283 as champion, three crown moves out of date.)

**Open question answered — side errands ARE banked** (GEN 40: side 2 · GEN 42: side 4 · GEN 43: side 1, under
the v5 game-clock basis), and the 2.7× boost + game-clock scoring give honest per-sim-minute rates.
NEW FINDING (gens 40–49, v6 coach): the line survives long and now reads the campaign (GEN 49 walked the FULL road to AWAKEN and fought the Leopard Legend, dying to it) but stays SLOW (18–28 xp/sim-min). v6 coaching (flee line ≥9 dmg, near-errand scoring, hunter-kite) broke the 'die in prep' disease — GEN 46 became the first v6 cap-survivor champion (fit −74). Frontier: reach awaken FAST (GEN 49 needed 2781 sim-s → clock −116), then survive/beat the Leopard Legend and close a leg/tier.

---

## 10 · Systems in force (standing rules)

- **Death rigor:** death regresses one level (with caps: lv27 → −4; 12–16 → −1), career XP STANDS
  (trophy progress untouched), wolf respawns near the fall, healed to the smaller cap.
- **ONE XP pool:** career XP is unified; kills, pickups, discoveries, rituals and quest rewards all
  feed it; the level-up deed measures against it.
- **Campaign spec:** one active main quest at a time, 3–4 choices, no random quests.
- **Side errands (the safe fast-XP channel, commit c62466b):** accepting a "reach level X"
  (XP-gate) deed turns the board to side errands — distinct from main quests, **no risk, no luck**
  (no predators/rivals/bosses/weather, supply-checked, generous clocks, timeout = zero penalty),
  faster XP than un-quested deeds, one errand at a time, completion feeds the ONE pool and counts
  `RUN.side` (+25·min(3,RUN.side) in fitness). Templates: Bloodline Sprint (timed small-game hunt,
  60·Σ XP), Full Pannier (supply-checked gather, 55·Σ), Twin Fangs (double-kills within 15 s, 80·Σ),
  Trail of Firsts (unfound landmark, 65·Σ).
- **Pack system (committed):** howl to bond (BOND_P 0.45, HOWL_RANGE 130, intercept 45%, level ±1),
  pack hunts with the deed, fallen mates subtract from deed progress (combat progress never rolled
  back), hostile packs bite; pack is session-only after reload (documented).
- **No secrets committed; live-link-only publishing; APK only on request; token untouched.**

---

## 11 · Tests & verification

```bash
npm install                          # repo deps (playwright, express, pngjs) — Playwright browser NOT fetched
bash test/browserlab/boot.sh         # Chromium 149 + SwiftShader from npm's @sparticuz/chromium (no CDN/apt/sudo)
node test/side.test.mjs     # 25/25 — side errands: board turn, no-risk templates, XP feed, senses 24/25
node test/campaign.test.mjs # campaign / trophy / death-rigor / reload
node test/pack.test.mjs     # bonding / howl / pack combat
node training/rafzzer_gens.mjs status
```
Known flakes/limits: the **collision suite's** old load flake was fixed 2026-09-05 (clear-lane, grounded
approaches; the log check measures the game's five-circle model) — 10/10 passes on `a57eb5a`; the
historical note stands for older builds: it had a pre-existing load flake (fails on a rotating
line, proven against the previous build too); **headless RAF freezes** — the suites drive ticks
manually (`?autopilot=1&nolearn=1` + `BOT_OFF` + `window.CAMP.tick()`); probes in `test/` are
research scratch and may be run ad hoc. Playwright browsers & node_modules **do not persist**
across sandbox snapshots — re-run `bash test/browserlab/boot.sh` per session (above).

---

## 12 · Fresh-environment bootstrap (new chat / new machine)

```bash
git clone https://github.com/mdraficode/aurorawolf.git && cd aurorawolf
git config user.name "…" && git config user.email "…"        # .git/config is NOT part of the clone backup
npm install                                                  # repo deps — Playwright browser NOT fetched
bash test/browserlab/boot.sh                                 # Chromium 149 + SwiftShader (npm @sparticuz/chromium)
python3 build.py                                             # repo index.html is committed, but rebuild to be safe
node training/rafzzer_gens.mjs status                            # lineage + champion intact?
git log --oneline -5                                         # should reach the last M46 commit
# publish needs ~/.ghtoken (GitHub PAT, classic, repo scope) — ask the user to restore it; never commit it.
```
Then simply continue at §8 (next gen = 40).

---

## 13 · GitHub backup situation

- The full repo (source, tests, docs, history, lineage jsons, logs) is **pushed to
  github.com/mdraficode/aurorawolf (branch `main`)** — the repo is the backup of the workspace.
  (On 2026-09-01 the old API-only history was replaced by the full project history via a one-time
  force push; the live `index.html` content is identical — 1 242 826 bytes.)
- `index.html` at repo root = the live build; Pages redeploys automatically from `main`.
- **Repo is single-branch `main`** — no `arena/**` or PR branches. Publish: `bash tools/ship.sh "msg"`
  (build + commit + `git push origin main`), which keeps the source and the live build in lockstep.
- **Push recipe (workspace resets wipe `git config`, so the remote URL is not stored):**
  ```bash
  cd aurorawolf && git add -A && git commit -m "…"
  GH=$(cat ~/.ghtoken)   # classic PAT, repo scope — never commit it
  git push "https://x-access-token:${GH}@github.com/mdraficode/aurorawolf.git" main:main
  ```
  (No forced pushes needed now — history is shared. The first-time history merge was done once.)

---

## 14 · Future direction & open threads

1. **Survive the Legend fight** (GEN 52 reached stage BOSS, died to the Leopard Legend) → **close
   tier 1** → first tier trophy (worth 1200 under LAW v4 — instantly dwarfs current fits).
   **The boss-kit is SHIPPED (v6.7, §7e):** Deep Bite + Wild-Hardened via the mystic events, full
   boss-hit pack intercept, bot perk pilgrimage — GEN 56+ runs carry it.
2. **Prove/exploit the side-channel:** does side-errand awareness raise xp/min and RUN.side for
   GEN 40+? (Sense 24 is zero-padded-untrained — the trait rows 180..259 give it evolution room.)
3. **Speed + efficiency at higher tiers;** watch xpRate, qMin, avgQuestS, tier clock.
4. Possible architecture moves (documented procedure: add senses → zero-pad EXTEND the seed →
   NI/NW constants + trait row range + test expectations → migrate champion by zero-pad, the
   harness does this automatically when the champion has fewer weights).
5. Hardening: collision-flake root cause; headless RAF testing; APK only on request.

---

## 15 · Footguns & lessons (do not relearn the hard way)

- **Background jobs die at turn boundaries** — a generation (gate + run ≈ 4–8 min wall) must be
  started and awaited inside one session; prefer `bash training/m46_gen.sh N 900` to a bare process.
- **Never chain gate→run through a pipe** (GEN 6: exit code swallowed → invalid run).
- **Seed-swap footgun:** only touch `window.RAFZZER_SEED` via measured zero-pad extension; a wrong
  replacement length breaks `NW` (boot probe: seed length must equal NI·NH+NH+NH·NO+NO).
- **`training/rafzzer_candidate.json` is transient** (spawn output) — gitignored, never hand-edit.
- **σ > ~0.2 saturates the mind** (GEN 2/3/6/7 evidence) — mutation schedule was retuned twice;
  floor 0.08/0.10, trait σ 0.15 for fresh rows.
- **`file:///…/index.html` paths** — tests now resolve the build relative to themselves
  (`pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html')`); never hardcode
  `/home/user/index.html` again.

---

## 7b · v6 COACH BUNDLE (2026-09-01 session — policy only, no brain change)
- **v6 fitness:** in-page `fitness()` now uses the GAME clock for `durS`/`xpRate` (was `R.dur` wall) —
  the boost can no longer inflate ANY fitness term. (The harness already used `CAMP.simClock` since v5.)
- **v6.1 side-errand scoring:** errands no longer score a flat 6 — hunt/collect/explore errands score by
  real supply distance (9 = near, 3–4.5 = far), so the wolf stops trekking 9–12 km for far errands.
- **v6.2 hunter-kite:** ANY hunting predator (dmg ≥ 9, non-eagle) in chase/attack within 34 m → the wolf
  breaks clean (sprint to separation) instead of walk-yielding inside the kill radius.
- **v6.3 flee line:** `heavyHunter` threshold 13 → 9 — all wolf-hunters disengage at ~55% hp (cats
  9–11 dmg used to flee at 34% = dead before the sprint began; wolf runs 18 vs cats 12.8–13, so escape
  is physically winnable — the LINE was the bug).
- **Crown re-baseline:** GEN 35 fit 59 (wall-inflated) → two honest v6 runs of the same weights (lineage
  `35r-v6a/b`: −113, −78) → mean **−96**; bar ladder this session −96 → **−74 (GEN 46)** → **−55 (GEN 50)**.
  Current champion: **GEN 50 (fit −55)**. Old 59 kept in history.
- Session verdicts (v6): 44 −126 · 45 −194 · **46 −74 PROMOTED** · 47 −152 · 48 −166 · 49 −144 (awaken +
  Legend fight, too slow) · **50 −55 PROMOTED (36.9 xp/min)** · 51 −106 (Rival-Wolf pack swarm) ·
  52 −87 (**stage BOSS, 38.3 xp/min, L7, side 6** — died to the Leopard Legend, near miss).
- **v6.4 pack-aware escape (GEN 51 autopsy):** hostile rival packs are NOT heavy hunters (bite 4–6 each,
  below the 9 gate) but a swarm of 3–5 chews a wolf down — GEN 51 fled 7× and still died because the
  yaw re-aimed at whichever member was NEAREST each tick → zigzag inside the pack. Fix: flee from the
  pack CENTROID, cache the heading (refresh max every 2 sim-s), HOLD the sprint while anything hostile
  is within 45 m (6 s rolls, 20 s episode cap), sprint down to stamina 8 (escape is physical: wolf 18
  vs rivals 12.2–14.4). A strong wolf on a rival deed (L3+, hp>70%) keeps the fight (rivalDeed gate).
- **v6.4b THE LEGEND GATE (GEN 52 autopsy):** GEN 52 entered stage boss with 0 'boss' bumps — it NEVER
  entered the fight loop; the Leopard Legend (ambush: flank teleport, ×1.5 bites) ate it while it stood
  in the 41–62% dead zone (below bossEngage, above fleeAt). Fixes: (a) legend within 45 m and not
  mid-fight → flee below max(fleeAt, 0.88); (b) once engaged, stay in the fight down to the 42% cut
  (bot.fight gate, never abandon mid-band); (c) a FRESH legend-fight needs L8+ and 88%+ hp — the Legend
  chases FOREVER (bossTick is global, no leash) so heal via landmarks (+25) and kills (+8) between
  attempts; (d) crouch while closing (d 3.6–12 m) — a crouched blind-side bite = 5 dmg × 1.5 ambush =
  **7.5** vs 3 standing: the 3-dmg bite is the DPS bottleneck against 45 hp. The designed boss-kit the
  autopilot should next pursue: perks (Deep Bite +1, Wild-Hardened +5 hp — world-event rewards) and the
  bonded pack (p6 PACK.intercept redirects boss bites to packmates).
- Session verdicts (v6.4): 51 −106 · 52 −87 (boss stage reached).
  Crown ladder this session: bar −96 → **−74 → −55**. NEXT: GEN 53.

### 7c · v6.5 SHIPPED CROWN BAKE (2026-09-01)

- **The 🧠 Rafzzer button now plays the lineage champion.** `build.py` reads
  `training/rafzzer_champion.json` and injects its weights as `RAFZZER_SEED` + `RAFZZER_CHAMP_GEN/FIT`
  into the built `index.html` (src/autopilot.js keeps the wild seed 20070 as the dev fallback).
- **Boot order (champion-first):** baked crown → a browser's own `rafzzer_best` may only play if it
  OUTSCORED the champion (`best.fit > champFit`); local self-evolution starts FROM the champion and
  must beat fit −55 to take the field. No baked crown (dev build) → old order (local best, then wild).
- **Label fix:** badge / death-log / load-log dropped the off-by-one `+1` — the page now numbers gens
  exactly as the lineage (badge: `GEN 50 · 🏆 CHAMPION fit -55 (lineage crown)`).
- **Verified:** real-page boot = gen 50, external=false (genuine shipped boot); local-best cases:
  fit −40 → local gen plays; fit −90 → champion GEN 50 plays. Harness runs unaffected
  (`RAFZ.load` injection overrides the seed); per-gen gates now exercise the champion brain.

### 7e · v6.7 THE BOSS-KIT SHIPPED (2026-09-02) — the designed answer to the Legend wall

GEN 52's autopsy called for it: the 3-dmg bite cannot win the DPS race against a 45-hp Legend —
the kit multiplies the wolf before the fight. All three parts are **game code (neutral coding),
human players get them too**; the brains only had to be taught the doors exist (perk pilgrimage).

- **☄️ Deep Bite — the fallen star's gift.** Discovering a meteor site (the `meteor` landmark,
  inside its 19 m discovery ring) grants `perks.strongJaw` — **+1 permanent bite damage**, once
  per run. (This perk existed since the classic board's rival deeds — the CAMPAIGN board never
  carried it, so the mystic event now does. Max ambush bite: 3+1 jaw +1 ambush +1 crouch = 6,
  ×1.5 ambush = **9** vs the old 3-hit whittling.)
- **🦌 Wild-Hardened — the stag's blessing.** Come within 12 m of the white stag (`whiteStag`
  event) while it's alive: `perks.wildHardened` + `hpBonus +5` → **+5 permanent max HP**, once
  ever, survives death (hpBonus is recalc-safe like every perk). It bolts after blessing you.
- **🐺 Full pack intercept.** `PACK.intercept` already covered the boss melee bite; it now also
  guards the three unguarded paths — **charge/pounce** (bison/lion), **submerge emergence**
  (croc) and the **eagle dive**. Same terms: bonded mate within 3.6 m, 45% roll, the mate eats
  the blow (`m.hurt`), toast + thud.
- **Bot perk pilgrimage (autopilot):** in wander/travel with no legend on the field and hp>60%,
  an unclaimed star-gift within 380 m or a live white stag within 240 m becomes the goal
  (`☄️ star-gift → Deep Bite` / `🦌 the white stag → Wild-Hardened`, `perk-trek` log events,
  20 s log throttle). Subordinate to all emergency branches and deed locks; expires on its own
  (perk granted / site spent / stag gone). Howl policy, legend gate and LAW v4 **unchanged** —
  perks are means, not scored ends.
- **Tests:** `test/bosskit.test.mjs` (in `npm test`) proves all three: Deep Bite grant + recap +
  +1 bite delta + once-only guard (two sites, one blessing) · Wild-Hardened perk/hpBonus/maxHp/
  heal/bolt/recap/once-only · bonded-pack charge-intercept with deterministic roll + the
  roll-fails control. Adjacent suites green: smoke, menu_trophy_ai (v6.6), events, pack, campaign.

### 7f · v6.8 — the M47 human-speedrun fixes MERGED onto the boss-kit (2026-09-02b)

- **What happened:** the trainer's human-speedrun session had been sitting unmerged on PR #1
  (`arena/01a061fd-aurorawolf`) while `main` moved on to the v6.7 boss-kit. The two lines are
  **unrelated histories** — `main` is a single orphan commit, so `git merge-base` is empty and PR #1
  could never merge. Reconciled by **cherry-picking `d70296d` + `1fb4b97` onto `main`**: zero
  conflicts (only `src/p4.js` is touched by both sides), then `python3 build.py` rebuilt
  `index.html` (1240 KB). **PR #1 is superseded — close it.**
- **Version labels:** v6.7 = the BOSS-KIT (stays). v6.8 = the M47 speedrun work (relabelled; it had
  also called itself v6.7 on the branch).
- **v6.8 content:** B8 (Legends died with their chunk + the bite only scanned per-chunk lists —
  the campaign was **unbeatable**), B9 (echo/clone Legends leaked past `Boss.die()`), B10 (a Legend
  walked along its own nose), the boss combat grammar (constant-rate neck turn 2.2·(1+0.15·phase),
  ×0.18 through the 0.55 s plant, blow lands where the swing ENDS in the player's own ~78° arc —
  previously the heading snapped on every tick so every bite was 1 dmg, and the claw was undodgeable),
  three dead perks wired up, deed waypoints surviving chunk unloads, the fresh-save name prompt.
- **New in the repo:** `test/speedrun/` (human.mjs / run.mjs / probe_fight.mjs / probe_boss_dps.mjs),
  `test/browserlab/boot.sh`, `docs/TRAINING_MANUAL.md`, `docs/ENVIRONMENT.md`; reports gitignored
  under `test/speedrun/runs/`.
- **Environment (Arena sandbox):** see `docs/ENVIRONMENT.md` — the egress is an allowlist (github +
  npm + PyPI only), so a headless Chromium 149 + SwiftShader comes from npm's `@sparticuz/chromium`
  via `bash test/browserlab/boot.sh` (idempotent, no sudo). The one
  Drive/WeTransfer backup (`AW-V1.zip`) was fetched via the now-retired `env-relay` Actions workflow,
  audited (sha256 `b7d67bcd…`, byte-identical to the reconciled repo — its only unique content was
  `.revontulet.keystore` / `.ghtoken`, never committed), and the relay machinery was deleted with it.
- **Standing order:** finish the human-speedrun session (no bot, no brain) to the Tier-1 trophy and
  record it in `TRAINING_MANUAL.md` **before** resuming GEN 56.

### 7d · CRITICAL BUGFIX — Rafzzer button died after TROPHIES → BACK (2026-09-01, user report)

- **Symptom:** opening 🏆 TROPHIES from the main menu and returning (BACK) made the 🧠 Rafzzer
  button do nothing.
- **Root cause:** `showOverlay('start')` re-injects `#tplStart` into the overlay body on every
  return (TROPHIES → BACK, pause → start). The start-template `#btnMenuAI` was bound with a DIRECT
  `addEventListener` at script load, so the bound node was destroyed on the first re-injection —
  the freshly injected button had no handler. (The game already delegates `#btnTrophies`/`#btnStart`
  for exactly this reason — p5.js: "the start template is re-injected, listeners below survive it".)
- **Fix (v6.6):** the 🧠 binds moved to a DOCUMENT-LEVEL click handler
  (`#btnMenuAI` → watch mode, `#btnAI` → in-game toggle). Delegation survives every re-injection;
  the in-game corner button lived in the static HUD (unaffected).
- **Regression test:** `test/menu_trophy_ai.mjs` (added to `npm test`) — fails on the bug, now
  PASS: fresh-menu click arms AI → TROPHIES → BACK (asserts the node was destroyed/re-injected) →
  click arms AI; corner toggle still works; pageerrors none. `smoke.mjs` + `menu.test.mjs` green.

## 16 · Recent commits (orientation)

- `a57eb5a` — jumpable/standable obstacles (logs · low boulders · stumps carry `so.top`; `standTopAt`).
- `2de0862` · `4415ebd` · `b9a19ed` · `0e7e405` · `d579613` · `e6458b4` — the VFX pass: liquid blood +
  ground dust pools, breath wisplet, every body glow / scent cloud / hearing burst removed
  (`test/effects_visual.test.mjs`).
- `5380cba` — Start Game re-seeds the world in place (fullscreen survives); `4fa4b10` — `#fsBtn`
  enter-only + hidden in play; `04c60d4` — docs handout; `87e365e` / `bd7cead` — repo hygiene.
- (2026-09-05) collision suite rewrite + `test/speedrun/_probe_trace.mjs` restored + these docs.

- `96b9c7d` — GEN 39 rejected (−97); harness records RUN.side; ledger rows 36–39.
- `c62466b` — **side errands** feature (safe fast-XP channel) + senses 24/25 architecture (26/336).
- `3e899d3` — howl policy (neutral coding).
- `989a96a` / `399733e` — GEN 38 / GEN 37 rejected.
- `3a1207a` — MASTER.md added + all test suites made repo-relative (portable on any machine +
  full-repo GitHub backup pushed).
