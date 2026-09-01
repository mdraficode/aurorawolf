# 🤖 AGENT BRIEF — COMPLETE SESSION CONTEXT (AURORA WOLF / REVONTULET)

**Purpose:** any AI agent (or human) reading THIS file gets the whole context of the project —
every instruction the user has given across the entire conversation, every consequential decision
the assistant made autonomously and why, the current state, and the exact next actions. Written so
a fresh agent can act immediately without asking the user anything.

**Read order:** `AGENT_BRIEF.md` (this file) → `MASTER.md` (the operational master doc) →
`README.md` (player-facing). `MASTER.md` and `AGENT_BRIEF.md` must BOTH be updated in the same
commit whenever project state, law, architecture, or instructions change.

**Snapshot:** 2026-09-01 · original repo `github.com/mdraficode/aurorawolf` (the ONLY repo now) ·
duplicate repo `github.com/mdraficode/aurorawolf-v2` (exact copy, created 2026-09-01; **RETIRED by
user directive — never work in, sync, or push to v2**).

---

## 1 · ONE-PARAGRAPH ORIENTATION

Aurora Wolf is a procedurally-generated 3D open-world wolf game shipped as a **single self-contained
HTML file** (`index.html`, Three.js embedded, no internet needed to play). The TRAINING PROJECT is
the point of the current work: a neural-network bot ("RAFZZER") plays the game's campaign
(level → quest chain → ritual → Legend boss fight → tier trophy) and is evolved **one human-gated
generation at a time** under the "LAW v4 trophy fitness" — generation success = higher-tier TIER
TROPHIES; true success = speed + efficiency to the highest tier. The user drives the project like a
trainer: he sets the rules and laws, the agent implements, evolves, runs generations to verdict,
and publishes.

---

## 2 · INFRASTRUCTURE FACTS (do not re-derive)

| Fact | Value |
|---|---|
| Live game (GitHub Pages) | https://mdraficode.github.io/aurorawolf/ |
| Original repo | github.com/mdraficode/aurorawolf (public, branch `main`, Pages = `/` from `main`) |
| **Duplicate repo (v2)** | github.com/mdraficode/aurorawolf-v2 (exact copy; **RETIRED per user directive 2026-09-01 — never touch or push to it; do NOT sync it**) |
| Git auth | `~/.ghtoken` — classic PAT, `repo` scope. **NEVER commit it.** Push: `git push https://x-access-token:${GH}@github.com/mdraficode/aurorawolf.git main:main` (remote URL is NOT persisted in backups — re-add each session) |
| APK | git tag `archive/android-apk` holds the signed APK + WebView wrapper; signing key `~/.revontulet.keystore` (never committed). **APK only on explicit request** |
| Publish (live-only bump) | `bash publish.sh github "msg"` — builds + pushes index.html via GitHub Contents API (~1–2 min). Prefer full `git push` so source and live build stay in lockstep |
| Build | `python3 build.py` → index.html from shell.html + style.css + vendor/three.min.js + src/p1..p6 + autopilot.js |
| Tests | Playwright + headless Chromium (SwiftShader). `npm install` + `npx playwright install chromium` + `sudo -n npx playwright install-deps chromium` per session (deps do NOT persist across snapshots) |
| Current champion | **GEN 35 · fit 59** · L7 · 1200 xp · 126.6 xp/min · died to Level-8 Leopard · scars `{fight:1}` · **TIER 1, 0 trophies** |
| Next generation | **GEN 40** (nothing spawned yet) |

---

## 3 · THE USER'S INSTRUCTIONS — COMPLETE CATALOG

### 3.1 The project itself (given early, still standing)
- Game = Aurora Wolf / REVONTULET. Keep it a single-file HTML game; Three.js embedded; work inside
  the repo (src/p1..p6 + autopilot.js + build.py), index.html is the built artifact.
- URL params: `?seed=`, `?quality=low`, `?autostart=1`, `?autopilot=1&nolearn=1` (AI watch mode),
  `?speed/rate/re` (bot time boost).
- **No secrets committed** (`.ghtoken`, keystore, API keys stay out of git). **Live-link-only
  publishing.** **APK only on request.** Token never changed.
- The repo (GitHub) is the backup of the workspace: push everything, keep the local workspace
  mostly free **except files you cannot get back from GitHub** (i.e. secrets).
- 2026-09-01: deep-clean the workspace and keep a master info file (MASTER.md) updated + backed up
  on GitHub so any fresh chat can resume with zero re-explanation. ✅ done — MASTER.md lives in repo.
- 2026-09-01 (latest): produce a **complete technical summary of the whole chat** (all user
  instructions + all agent-made decisions) readable by any AI agent, then make a **duplicate GitHub
  repository** of aurorawolf containing **every file**, named with **"v2" after the original name**,
  missing nothing. ✅ this file + `aurorawolf`. (Built 2026-09-01.)
- 2026-09-01 (SUPERSEDES the v2 build instruction for all future work): **work ONLY with the original
  repo `mdraficode/aurorawolf`; NEVER touch, sync, or push to `aurorawolf-v2`** — v2 is retired. All
  pushes go to `mdraficode/aurorawolf` `main` only.

### 3.2 M46 training campaign — the core rules (highest priority, standing)
- **Train a neural bot to speedrun the campaign.** Main success = **upper-tier TIER TROPHIES**;
  **true success = how fast the highest tier is achieved + how efficiently.**
- **Cadence:** human gate before a full generation → run → **trainer verdict** (promote/reject) →
  collect-at-end (commit run artifacts, update ledger/MASTER.md/AGENT_BRIEF) → publish. No promote
  without the trainer's verdict. **3-strike stop** if the gate fails all attempts. Never chain
  gate→run through a pipe (exit code gets swallowed; a GEN-6 invalid run).
- **Promote only when fitness ADVANCES the crown** (current bar: fit 59 = GEN 35). Old LAW-v3 crown
  bar (283) is obsolete.
- **LAW v4 (the Trophy Law)** is the single scoring law — user's wording: "generation success = the
  upper-tier TIER TROPHIES; TRUE success = how fast the HIGHEST tier is achieved and how EFFICIENTLY."

### 3.3 Game-systems directives (each was explicitly requested and shipped)
- **Death rigor:** death regresses one level (cap: lv27 → −4; 12–16 → −1), career/trophy XP STANDS,
  respawn near the fall, healed to the reduced cap. (User: deaths must have real consequences but
  trophy progress must not be wiped.)
- **Unified ONE XP pool:** kills, boss kills, pickups, discoveries, ritual, quest rewards all feed a
  single career XP pool; the level-up deed measures against it.
- **Campaign spec:** one active main quest at a time; 3–4 choices offered; no random quests.
- **Pack bonding (howl):** howl to bond a wolf pack; pack hunts with the deed; fallen mates subtract
  from deed progress (battle progress never rolled back); hostile packs attack; pack is
  session-only after reload (documented). Shipped + tested.
- **Side errands (most recent feature, shipped c62466b):** when the player accepts a "reach level X"
  (career-XP gate) quest, the board turns to SIDE QUESTS — *different in nature from main quests* —
  whose completion grants XP **faster than ordinary kills/gathering/deeds outside any quest**; this
  is a **no-risk, no-luck** trophy-progression channel (explicit contrast with pack bonding, which
  has luck). **The neural brains must be aware of these efficiencies** (they are: senses 24/25).

### 3.4 Process/quality standing rules
- Keep tests green before claiming done; suites: `side.test.mjs` (25), `campaign.test.mjs`,
  `pack.test.mjs` + many older suites. Collision suite has a pre-existing load flake (proven
  pre-existing — do not chase unless asked).
- Per-generation artifacts (gate/run JSON + logs, ledger rows) committed at end of a generation;
  cadence driver `bash test/m46_gen.sh <g> <cap>`.
- Update MASTER.md + AGENT_BRIEF.md in the same commit that changes law/architecture/state.

---

## 4 · DECISIONS MADE BY THE AGENT (with rationale — the user accepted them)

### 4.1 LAW v4 fitness formula (authored 2026-08-31 from the user's core rule; in-page `fitness()` = harness)
```
f = Σ_trophies 1200 · 2.5^(tier−1)                       // trophies DOMINATE, exponential in tier
  + (1000 − minTopTime) · 0.6 · 2.5^(topTier−1)          // SPEED at the highest tier
  + 220 · prog · 2.5^(tier−1) + 60 · bosses              // THE ROAD (gradient so evolution never flies blind)
  − clock · 0.03 · 2.5^(tier−1) − 0.012 · durS           // EFFICIENCY (tier clock + sim time)
  + 0.5·min(xpRate,240) + 3·quests + 0.04·xp + 1.5·maxLevel + 1·kills
  + 25 · min(3, RUN.side)                                // side errands (capped 3; one trophy ≫ any side streak)
  − pen − stall
pen = {fight:120, water:200, neglect:90, unknown:60} · (1 + 0.6·(tier−1));  stall = 8·stuck + 15·bug-bot-loop
```

### 4.2 Neural architecture (NI=26 · NH=10 · NO=6 · NW=336, seed 20070)
- Senses: 0–1 hp/stamina · 2 nearest predator d/80 · 3 predator level diff · 4 chase/attack flag ·
  5 predator dmg · 6 rival d/40 · 7 boss-hit d/120 · 8–9 prey d/meat · 10 goal d · 11 XP EMA ·
  12 level · 13 storm · 14 chill · 15–17 scars (fight/neglect/water ÷3) · **18 ursine proximity
  (bugfix: was `bearD/80` which fed a constant 1.0 → hidden-bias saturation → gate strikes ·
  fixed to `1 − bearD/80`) · 19 graded sky-threat (eagle dive 1.0/chase 0.55/soar 0.25)** ·
  20 through-tier progress · 21 tier ladder `(tier−1)/4` · 22 current deed meter (side errand
  preferred) · 23 tier clock (600 s par) · **24 side-channel sideP (1 slotted / 0.6 offered / 0 none)
  · 25 gate urgency = level-up deed have/need**.
- **Decision: architecture extension via ZERO-PAD, not reseed.** The GEN-35 champion (316 weights)
  was zero-padded to 336 (rows 24–25 = 0) so its behavior is preserved and rows evolve fresh;
  `test/rafzzer_gens.mjs` auto-migrates a shorter champion on spawn. Old 276-weight brain archived
  (`rafzzer_champion_lawv3_archive.json`).

### 4.3 Bot policy numbers (the cortex's behavior layer)
- `questScore`: side errand `s = max(s + 3.2, 6)`; shunned quests −50/−60.
- `keepQuestsFilled`: one main deed + at most ONE side errand; side only while an XP-gate deed is
  active; main flatline 12 min, side flatline 10 min; side board re-offers every 30 s of game time.
- **Howl policy (neutral coding, commit 3e899d3 — after GEN 37 died to a rival pack ATTACK roll):**
  howl only when `hpFrac > 0.75 && level ≥ 4 && !swimming && no legend within 60 m && no hostile
  pack attack`, else re-listen in 30 sim-s. Removes avoidable dice from the lineage.
- **Boss/Legend combat (neutral coding):** submerged/invulnerable → clear+flee; charging →
  sidestep; else 2-bite hit-and-run with 2600 ms retreat; flee at hpFrac < 0.42.
- Tether-break: 3 min parked with zero quest progress → 450 m trek to new ground.

### 4.4 Side-errand numbers (authored; user accepted the design)
| Template | Task | Reward | Notes |
|---|---|---|---|
| Bloodline Sprint | `2+min(2,t−1)` small game in `140+40t` s | 60·Σ XP | timed hunt |
| Full Pannier | `6+2(t−1)` supply-checked items in `200+60t` s | 55·Σ XP | gather |
| Twin Fangs | `1+(t−1)` double-kills (2 kills ≤15 s) in `200+50t` s | 80·Σ XP | streak |
| Trail of Firsts | 1 unfound landmark in `180+40t` s | 65·Σ XP | explore |

No predators/rivals/bosses/weather; supply-checked; generous clocks; **timeout = zero penalty**;
completion feeds the ONE XP pool and counts `RUN.side`; never advances the campaign.

### 4.5 Training-methodology decisions
- One generation = one attempt set under cadence `global×2 → trait×2 → traitglobal×2`, RUN_CAP
  900 wall-s (~2700 sim-s at rate 3). Run seed **7777** (one world per lineage), boost
  `?speed=8&rate=3&re=3` (≈3 sim-s per wall-s); gate seeds `31337 + 17·g`.
- Mutation: global = per-weight 18% `N(0,σ)`, σ = `max(0.08, 0.16·0.90^(g−1))`, 3% reborn `N(0,0.45)`,
  clamp ±2.5 (σ > ~0.2 saturates — GEN 2/3/6/7 evidence). **Trait mode** mutates ONLY W1 rows
  180..259 (senses 18–25), σ 0.15, frozen survival rows — proven gate-safe. Attempts re-roll dice
  (own RNG streams), never the law.
- Gate sanity checks (110 s): loadOk, finiteMind, no page errors, no tick crashes, moved > 40 m,
  no suicide, ≥3 decision kinds, livingMind (≥2 outputs std ≥ 0.01), rest reflex.
- Death handling: hold for the scorer (`RAFZZER_LAST`), never read the respawn.
- Champion auto-migration on architecture change (archive old champion, zero-pad or re-seed
  explicitly, logged) — never silently reseed.

### 4.5b Session 2026-09-01 (trophy push) decisions — v5 basis
- **v5 game-clock scoring basis:** `CAMP.simClock()` (tSec-based) replaces wall time for the LAW's
  clock term, trophy record time (`rec.time`/`best`), sense 23 and all reported rates — the sim boost
  is now a pure observation accelerator (at 1× live play game == wall, shipped records unchanged).
  Evidence: GEN 35's recorded clock ≈ its wall dur (568.2 ≈ 568.5 s) proved prior runs could be
  boost-biased; v5 restores honest cross-gen speed comparison.
- **Boost upgraded:** harness URL `speed=16&rate=8&re=10` (was 8/3/3) ≈ 2.7–2.8 sim-s per wall-s in
  this sandbox with warns 0 / errs 0 / no NaN across probes. `speed/rate` ratio kept (0.375) so bot
  timers behave identically; higher `re` (renders every 10 batches) removes the headless render
  bottleneck, which CPU-bound analysis showed was never the limiter.
- **Fight-classifier bugfix:** `lion` (plus panther/lynx/croc) were missing from `classify()` — GEN 40
  died to a Level-5 Lion but scored `unknown` (pen 60 vs 120) → fit 86 inflated ~60 (honest rescore
  26). Fixed BEFORE GEN 41; GEN 43's Lion death now scores `fight` correctly.
- **Gate diagnostics:** `m46_step.sh` snapshots each failed gate attempt
  (`rafzzer_gate_gen{N}_{mode}{A}.json`) so global-vs-trait failures are diagnosable (observed pattern:
  GEN 40 global ×2 fail → trait pass; no systematic check fails; 41/42 global a1 passed).
- **Sessions run & verdicts (2026-09-01, on v5 + 2.7× boost):** GEN 40 fit 26 (rescored, REJECTED),
  GEN 41 −93, GEN 42 −3 (RUN.side 4 — era of the side channel), GEN 43 −100 — all reached prep, none
  reached awaken; champion GEN 35 (59) stands. NEXT: GEN 51. Expect: champion falls only to a gen
  that reaches awaken/boss or slays a leg (or a trophy = 1200+).

### 4.5c Session 2026-09-01 (v6 coach — second trophy-push session)
- **v6 fitness:** in-page `fitness()` `durS`/`xpRate` now use `CAMP.simClock` (game clock) — completes
  the v5 harness fix; the boost cannot inflate ANY fitness term. (This revealed gens 40–43's fits were
  still boost-inflated, e.g. GEN 40's xpRate term +~40.)
- **v6.1–6.3 policy coach (no brain change):** distance-aware side-errand scoring (flat 6 → supply
  distance 9/6.5/3); hunter-kite (any dmg ≥ 9 non-eagle predator chasing within 34 m → break clean);
  **flee line 13 → 9** — ALL wolf-hunters disengage at ~55% hp (cats 9–11 dmg were dying while fleeing
  at 34%: wolf runs 18 vs cats 12.8–13 — escape is physical, the LINE was the bug).
- **v6.4 pack-aware escape (GEN 51 autopsy):** hostile rival packs are NOT heavy hunters (bite 4–6 each,
  below the 9 gate) but a swarm of 3–5 chews a wolf down: GEN 51 fled 7× and still died — the yaw
  re-aimed at whichever member was NEAREST each tick, zigzagging INSIDE the pack. Fix: flee from the
  pack CENTROID, cache the heading (refresh max every 2 sim-s), HOLD the sprint while anything hostile
  is within 45 m (6 s rolls, 20 s episode cap), sprint down to stamina 8 (wolf 18 vs rivals 12.2–14.4 —
  escape is physical). A strong wolf on a rival deed (L3+, hp>70%) keeps the fight (rivalDeed gate).
- **v6.4b THE LEGEND GATE (GEN 52 autopsy):** GEN 52 reached stage BOSS (first gen: q0→q1→prep→awaken→
  boss; 38.3 xp/sim-min best pace, L7, side 6) and died to the Leopard Legend with 0 'boss' bumps — it
  never entered the fight loop; the legend ambushed (flank teleport, ×1.5 bites) and the wolf stood in
  the 41–62% dead zone (below bossEngage, above fleeAt) being eaten. Fixes: (a) legend within 45 m and
  not mid-fight → flee below max(fleeAt, 0.88); (b) once engaged, stay in the fight down to the 42%
  cut — never abandon mid-band; (c) a FRESH legend-fight needs L8+ and 88%+ hp (the Legend chases
  FOREVER — bossTick is global, no leash — so heal via landmarks +25 / kills +8 between attempts);
  (d) crouch while closing (d 3.6–12 m): crouched blind-side bite = 5 dmg × 1.5 ambush = 7.5 vs 3 —
  the wolf's 3-dmg bite is the DPS bottleneck vs 45 hp. Designed boss-kit to pursue next: perks
  (Deep Bite +1 / Wild-Hardened +5 hp, world-event rewards) and the bonded pack (p6 PACK.intercept
  redirects boss bites to mates).
- **Crown re-baseline (transparent amendment):** GEN 35's 59 was wall-inflated; two honest v6 runs of
  the same weights (lineage `35r-v6a` −113, `35r-v6b` −78) → mean **−96** = new bar. GEN 46 (fit −74)
  promoted on the 2026-09-01 session: first v6 cap-survivor (2667 sim-s, L6, RUN.side 6) — the
  cat-death disease ended. Gen results (v6): 44 −126 · 45 −194 · 46 −74 **CHAMPION** · 47 −152 ·
  48 −166 · 49 −144 (REACHED AWAKEN + fought the Leopard Legend, too slow — clock −116) ·
  **50 −55 PROMOTED (36.9 xp/min)** · 51 −106 (Rival-Wolf pack swarm → v6.4) · 52 −87 (**stage BOSS**,
  38.3 xp/min, L7, side 6, died to the Leopard Legend → v6.4b legend gate). Champion: GEN 50 (−55).
- **v6.4c pack-safety round (GEN 53 autopsy):** (a) TDZ bugfix — the swim branch read `targetPk`
  before its `let` declaration → every swim threw and blinded the tick; GEN 53 was jumped right after
  a swim. `targetPk` now declared at the top of the tick. (b) Land escape from an attacking pack is
  physically impossible (sprint stamina ~4-6 s cannot open the pack's 90 m give-up radius; rivals
  12.2-14.4 vs wolf 18) — but rival wolves REFUSE deep water (veer off at the shore): pack escapes now
  aim for the nearest water and COMMIT to the far bank via the ford branch. (c) a CHALLENGED pack is a
  face-off, not a mandatory duel — members close at 5.5 vs the wolf's 7-9 walk, so the wolf backs off
  cleanly (kite line extended), unless a rival deed is active. (d) the flee log now carries
  `pack n @ dm → water/land` for future autopsies.
- **Frontier (v6.4 data):** pace is SOLVED (36.9 → 38.3 xp/sim-min; side 6 errand appetite retained)
  and the road is walkable (GEN 52: q0→q1→prep→awaken→boss at 1840 sim-s). The only wall left is THE
  BOSS — beating the Leopard Legend (45 hp · 14 dmg · 12.5 spd · ambush special). Next steps: v6.4b
  legend protocol verification (GEN 53+), then the designed boss-kit (perks via world events, bonded
  pack damage-intercept) — the 3-dmg bite cannot win DPS races; ambush ×1.5 + crouch +1 = 7.5/bite is
  the multiplier.

### 4.6 Repository-hygiene decisions (2026-09-01)
- `test/rafzzer_candidate.json` = transient spawn artifact → **untracked + gitignored**.
- `shots/*.png` regenerable → gitignored; `shots/README.md` + `forest.jpg` tracked.
- **All 101 test files made repo-relative** (`pathToFileURL(fileURLToPath(import.meta.url) +
  '/../../index.html')`) — no `/home/user/index.html` hardcoding; suites pass from a fresh clone.
- One-time history merge: the old GitHub history (single-file API commits) was replaced by the full
  project history (force push `bda2201→3a1207a→723e0a2`); live index.html byte-identical; no normal
  force pushes needed afterwards.
- Workspace deep-clean: local repo was deleted after verification (fresh clone from GitHub matched
  file-for-file); environment keeps only `~/.ghtoken` + `~/.revontulet.keystore` + sudo marker.
- Duplicate repo `aurorawolf-v2` created 2026-09-01 (this request) — mirror copy incl. all refs.
  **RETIRED by user directive 2026-09-01 (later same day): no further pushes, syncs, or work on v2.**

---

## 5 · NEURAL TRAINING — HOW IT WORKS (for the next agent)

1. `node test/rafzzer_gens.mjs status` — lineage + champion.
2. `bash test/m46_gen.sh <g> <cap>` — spawn→gate→run with auto-cadence (exit 3 = stop).
3. `node test/rafzzer_gens.mjs promote <g> --verdict=reject|promote --note="…"` — trainer verdict;
   `promote` rewrites `test/rafzzer_champion.json` only if gate PASSED **and** fitness > champion.
4. Read the run report: fitness, tier/trophies/topTier/topTime/clock, xpMin, qMin, avgQuestS,
   maxLevel, cause, `side` (RUN.side), warns/errs, beats, scars, knobs.
5. Judge with the LAW (trophies ≫ road ≫ efficiency; deaths pay tier-scaled penalty; side errands
   +25 capped 3). Update `test/m46_session_ledger.md` + MASTER.md §9 + AGENT_BRIEF §3/§6.
6. Commit everything (collect-at-end) + push + (if game build changed) `publish.sh github`.

**Footguns:** background jobs don't survive turn boundaries (a generation must be run and awaited in
one session); headless RAF freezes (tests drive `CAMP.tick()` manually); `BOT_OFF=true` still leaves
`window.RAFZZER` usable but only with `?autopilot=1` (RAFZZER registers only in autopilot mode);
playwright/node_modules reinstalled per session; never chain gate→run via pipe; never hand-edit the
seed line (extension must be exact zero-pad; verify seed length = NW).

---

## 6 · CURRENT STATE (why GEN 40 is next)

Lineage (LAW v4): 34 fit 25 SURVIVED(cap) → **35 fit 59 CHAMPION** (died L8 Leopard, 126.6 xp/min)
→ 36 fit 19 (first ritual + first Legend fight ~18 s) → 37 fit −43 (rival pack attack in prep) →
38 fit −117 (L7 Brown Bear in prep, near-cap road) → 39 fit −97 (first gen on the 26-sense build; accepted
a Trail-of-Firsts side errand at 334.7 s but died to the Rival Alpha before banking it, RUN.side 0,
43.1 xp/min) → **40 fit 26 (rescored) → 41 −93 → 42 −3 (RUN.side 4) → 43 −100** (all REJECTED, v5 basis) → v6 session:
**44 −126 · 45 −194 · 46 −74 PROMOTED · 47 −152 · 48 −166 · 49 −144** (awaken + Legend fight, slow) ·
**50 −55 PROMOTED (best pace 36.9 xp/sim-min)**. Champion: **GEN 50 (fit −55)**; bar ladder −96 → −74 → −55.

**Open questions for GEN 40+:** (1) does side-errand awareness measurably raise xp/min + RUN.side?
(sense 24 rows are fresh/zero — trait rows 180..259 give them evolution room); (2) survivability vs
the Legend (GEN 36 died in ~18 s of combat); (3) first tier-1 trophy (worth 1200 — resets the crown
scale). Watch xpRate, avgQuestS, tier clock, RUN.side in each run report.

---

## 7 · VERIFICATION RECIPE (any agent, any machine)

```bash
git clone https://github.com/mdraficode/aurorawolf.git && cd aurorawolf
git config user.name "…" && git config user.email "…"        # git config is never in backups
npm install && npx playwright install chromium && sudo -n npx playwright install-deps chromium
python3 build.py          # committed index.html is already built; rebuild to be certain
node test/side.test.mjs && node test/campaign.test.mjs && node test/pack.test.mjs
node test/rafzzer_gens.mjs status   # champion GEN 35 fit 59, lineage to GEN 39
# push (needs ~/.ghtoken):  git push https://x-access-token:${GH}@github.com/mdraficode/aurorawolf.git main:main
```

**Duplicate-repo check (historical):** at snapshot `aurorawolf-v2` matched `aurorawolf` file-for-file
(270+ files), same HEAD (723e0a2), same tag `archive/android-apk`, same index.html. v2 has no Pages,
no workflows of its own — a static mirror. **RETIRED 2026-09-01: never push to or sync v2 again.**

---

## 8 · MESSAGE/CONVENTION NOTES FOR FUTURE AGENTS

- Commit style examples: `M46 LAW v4: GEN <n> <rejected|promoted> (fit <f>) — <one-line why>`.
- The user reads summaries; be honest about flaky/unknown outcomes; never invent fitness numbers.
- When in doubt about a game-feel direction, the user decides; agent proposes numbers + rationale.
- Do not retry abandoned dead ends: σ > 0.2 saturates; pipe-chained gate→run; `/home/user/index.html`
  hardcoding; seed-swap by hand; `start_process` across turn boundaries.
