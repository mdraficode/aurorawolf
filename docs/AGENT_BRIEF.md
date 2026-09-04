# 🤖 AGENT BRIEF — COMPLETE SESSION CONTEXT (AURORA WOLF / REVONTULET)

**Purpose:** any AI agent (or human) reading THIS file gets the whole context of the project —
every instruction the user has given across the entire conversation, every consequential decision
the assistant made autonomously and why, the current state, and the exact next actions. Written so
a fresh agent can act immediately without asking the user anything.

**Read order:** `AGENT_BRIEF.md` (this file) → `MASTER.md` (the operational master doc) →
`README.md` (player-facing). `MASTER.md` and `AGENT_BRIEF.md` must BOTH be updated in the same
commit whenever project state, law, architecture, or instructions change.

**Snapshot:** 2026-09-02b (v6.8 — the M47 human-speedrun fixes merged onto the v6.7 boss-kit; see §4.5e) · original repo `github.com/mdraficode/aurorawolf` (the ONLY repo now) ·
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
| Git auth | `~/.ghtoken` — classic PAT, `repo` scope. **NEVER commit it.** Push: `git push origin main` (the remote is configured; if auth prompts, the Arena GitHub connection needs reconnecting — the repo has no other branch) |
| APK | git tag `archive/android-apk` holds the signed APK + WebView wrapper; signing key `~.revontulet.keystore` (never committed). **APK only on explicit request** |
| **Branches** | **single branch: `main`** — no `arena/**`, no feature/PR branches. All work commits straight to `main`. `git ls-remote origin` → only `refs/heads/main` |
| Publish (live-only bump) | `bash tools/ship.sh "msg"` — build + `git push origin main` → GitHub Pages live ~1 min. (Legacy `publish.sh github` now delegates to `ship.sh`; prefer `ship.sh` directly) |
| Build | `python3 build.py` → index.html from shell.html + style.css + vendor/three.min.js + src/p1..p6 + autopilot.js |
| Tests | Playwright + headless Chromium (SwiftShader). `npm install` then `bash test/browserlab/boot.sh` (idempotent, Chromium 149 from npm's `@sparticuz/chromium`; no CDN/apt, no sudo). Re-run after each sandbox reset |
| Current champion | **GEN 50 · fit −55** (v6 basis; old 283/59 scores were wall-inflated) · 336 weights · **TIER 1, 0 trophies — the trophy is the frontier** |
| Next generation | **GEN 56** (nothing spawned yet; runs on the **v6.8 build** = boss-kit + speedrun fixes, see §4.5d/§4.5e). Trainer order: finish the **human-speedrun session** first — no bot, no brain, reach the Tier-1 trophy and log it in `TRAINING_MANUAL.md`. |

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
  cadence driver `bash training/m46_gen.sh <g> <cap>`.
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
  `training/rafzzer_gens.mjs` auto-migrates a shorter champion on spawn. Old 276-weight brain archived
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
- **v6.4d rest & drink discipline (GEN 54 autopsy):** stamina regen is 0.5/s when still vs 6/s
  sprint drain — a wolf that leaves cover on a <45-stamina tank gets ~2 s of sprint before the flee
  line walks it into the jaws (GEN 54: 7 bites at walk speed vs a Level-5 Lion). Gates: rest now
  continues until hp > max(restAt, 82%) AND stamina > 45; a drink trip only starts at hp > 55%.
  The flee log payload (`pack n @ dm → water/land`) is now the standard autopsy channel.
- **v6.5 shipped crown bake (user decision: champion-first):** the shipped 🧠 button now boots the
  lineage crown — `build.py` injects `training/rafzzer_champion.json` weights into `RAFZZER_SEED` +
  `RAFZZER_CHAMP_GEN/FIT` (src keeps the wild seed as dev fallback). Boot order: baked crown wins
  unless a browser's own `rafzzer_best` OUTSCORED the champion (local self-evolution starts from the
  champion and must beat its fit to play). Badge/death-log/load-log `+1` off-by-one removed (page
  numbering = lineage numbering). Verified in-browser: boots gen 50 / external=false; local best −40
  plays over the crown, −90 loses to it. Harness unaffected (`RAFZ.load` still overrides).
- **CRITICAL FIX v6.6 — Rafzzer menu button after TROPHIES → BACK (user report 2026-09-01):**
  `showOverlay('start')` re-injects `#tplStart` on every return to the main menu, so the DIRECT
  `addEventListener` that autopilot.js attached to `#btnMenuAI` was bound to a node that gets
  destroyed — the re-injected 🧠 button had no handler and did nothing. Fix: the 🧠 binds moved to
  a document-level click handler (id-based, same pattern the game already uses for
  `#btnTrophies`/`#btnStart`). Regression test `test/menu_trophy_ai.mjs` (in `npm test`) FAILS on
  the bug, PASSES on the fix — it proves the node is destroyed and re-injected, then clicks.
- **Frontier (v6.4 data):** pace is SOLVED (36.9 → 38.3 xp/sim-min; side 6 errand appetite retained)
  and the road is walkable (GEN 52: q0→q1→prep→awaken→boss at 1840 sim-s). The only wall left is THE
  BOSS — beating the Leopard Legend (45 hp · 14 dmg · 12.5 spd · ambush special). Next steps: v6.4b
  legend protocol verification (GEN 53+), then the designed boss-kit (perks via world events, bonded
  pack damage-intercept) — the 3-dmg bite cannot win DPS races; ambush ×1.5 + crouch +1 = 7.5/bite is
  the multiplier.

### 4.5d Session 2026-09-02 (v6.7 THE BOSS-KIT — the wall-breaker GEN 52's autopsy designed)
- **Decision: build the documented boss-kit as game code first (trainer-chosen over resuming at GEN 56).**
  The two perks (Deep Bite / Wild-Hardened) existed only on the CLASSIC quest board — unreachable under
  the campaign — so the **mystic world events now grant them** (the docs' exact design: "perks as
  world-event rewards").
- **☄️ Deep Bite:** discover a meteor (`meteor` landmark, 19 m ring) → `perks.strongJaw`, once per run.
  Max crouch-ambush bite vs a Legend becomes 6 base ×1.5 = **9** (was 7.5; plain front chip 1→2).
- **🦌 Wild-Hardened:** within 12 m of a live white stag → `perks.wildHardened` + `hpBonus +5` → +5 max HP,
  once ever, recalc-safe through death. The stag bolts after blessing.
- **🐺 Pack intercept — full coverage:** boss **charge/pounce**, **submerge emergence** and **eagle dive**
  now consult `PACK.intercept` (melee bite already did); terms unchanged (mate ≤3.6 m, 45%, toast).
- **Autopilot:** boss-kit **perk pilgrimage** — in wander/travel, no live boss, hp>60%: unclaimed star
  <380 m or live stag <240 m becomes the goal (`perk-trek` logs, throttled 20 s). Emergencies and deed
  locks still outrank it; the howl policy / legend gate / v6.4d rest-drink discipline are UNTOUCHED.
- **No changes to:** LAW v4 (perks are means, not score terms), NI=26 architecture, mutation schedule,
  gate checks, champion (GEN 50, −55). Deliberately no new senses — the policy layer reads the world
  directly (same as pilgrimage); brain surgery without a felt need is how GEN 40–48 died of churn.
- **Tests:** `test/bosskit.test.mjs` added to `npm test` (A: star grant/guard/recap ✓ B: stag values
  +5/+5/heal/bolt/once ✓ C: charge-intercept + roll-fail control ✓) — plus smoke, menu_trophy_ai,
  events, pack, campaign all green on the v6.7 build.
- **Env note (Arena sandbox):** only github.com is reachable; Playwright's CDN is blocked, so the browser
  comes from `@sparticuz/chromium` (npm) via `bash test/browserlab/boot.sh`. Drive zips arrive via a one-shot
  Actions relay on the session branch. **Trainer action pending: rotate the `~/.ghtoken` PAT** (it rode inside
  the Drive zip and, briefly, a temporary branch commit — history already rewound).
- **Next:** GEN 56 on the v6.7 build (champion GEN 50 · bar −55) — the kit answers the Leopard Legend;
  then the announced-but-unspecified "major gameplay progress system update" when the trainer specs it.

### 4.5e Session 2026-09-02b (v6.8 — the M47 human-speedrun fixes MERGED onto the boss-kit)
- **Trainer directive:** reconcile the open PR #1 (M47) onto `main`, then continue the human-speedrun
  session (no bot, no brain) toward the Tier-1 trophy.
- **Why a cherry-pick, not a merge:** `main` is a **single orphan commit** (`git rev-list --count main`
  → 1, `parents=[]`) — the v6.7 boss-kit tree with no history — while PR #1 sits on the OLD long
  history. `git merge-base main <PR #1 head>` is **EMPTY**, so a merge is impossible and PR #1 has no
  merge base against main. Cherry-picking `d70296d` + `1fb4b97` applies with **ZERO conflicts** (only
  `src/p4.js` is touched by both sides). **PR #1 is superseded — close it, do not merge it.**
- **Version-label collision resolved:** both v6.6 children called themselves v6.7. `main`'s BOSS-KIT
  keeps **v6.7**; the M47 combat/perk/deed work is relabelled **v6.8** (3 comments in `src/p3.js` +
  the BUGS.md entry).
- **`index.html` was REBUILT by `build.py`, never trusted from the auto-merge** (1240 KB, crown GEN 50).
- **What v6.8 fixes** (all from M47, previously only on the branch): **B8** Legends died with their home
  chunk and `Wolf.attack()` only scanned per-chunk animal lists — the campaign was **UNBEATABLE, not
  merely hard**; **B9** echo/clone Legends leaked past `Boss.die()`; **B10** a Legend walked along its
  own nose (body now pursues on the bearing-to-wolf, only the head is neck-limited); the boss heading
  used to SNAP onto the wolf (every bite 1 dmg) and the claw had no wind-up (undodgeable 11–21 dps) →
  constant-rate neck turn 2.2·(1+0.15·phase), ×0.18 through the 0.55 s plant, blow lands where the
  swing ENDS inside the same ~78° arc the player's bite uses; three dead perks wired up (Spring Steps
  / Thunder Charge / Shadow Step); deeds keep their waypoint `wp` across chunk unloads; fresh-save name
  prompt now shows.
- **New rig:** `test/speedrun/` (`human.mjs` = hands & eyes, `run.mjs` = route router,
  `probe_fight.mjs` = Legend-fight laboratory, `probe_boss_dps.mjs`) + `test/browserlab/boot.sh`;
  reports gitignored under `test/speedrun/runs/`. `TRAINING_MANUAL.md` = the coach's book (cadence law,
  yaw-lag law, 180° law, the campaign on one page, the four routes, the Legend combat grammar, six drills).
- **Environment:** `ENVIRONMENT.md` records the MEASURED egress allowlist, the Chromium workaround and a
  file-by-file audit of the Drive zip (`training v2.zip` == commit `855eb4e`, byte-identical; only
  unique items are the two secrets). Bootstrap = `bash test/browserlab/boot.sh`. `shots/forest.jpg`
  was untracked & gitignored — `forest.test.mjs` regenerates it, so it is no longer committed.
- **Next:** the human-speedrun session continues on this build. The Tier-1 trophy is still unclaimed;
  M47's honest number is **0.94 dps dealt vs 4.86 incoming** (the Leopard reaches 9 hp and the wolf dies).

### 4.5f Session 2026-09-02c (repository consolidation — trainer directive: one place, no branches)
- **Trainer directive:** merge everything into `main`, keep the repo clean, put training work in a
  dedicated folder, and delete duplicate/redundant files.
- **`training/` is now the ONLY home of RAFZZER work** (moved out of `test/`): the harness
  (`rafzzer_gens.mjs` — its `const DIR = 'training'` is the single path switch), `rafzzer_ship.mjs`,
  `rafzzer_train.sh`, `rafzzer_verdict.py`, `m46_gen.sh`, `m46_step.sh`, `m46_session_ledger.md`,
  the champion/lineage/gate/run JSONs, `logs/` and `history/`. `build.py` now reads
  **`training/rafzzer_champion.json`** — the crown bake still ships, it is just isolated.
  `.gitignore` tracks `training/rafzzer_candidate.json`. Commands: `node training/rafzzer_gens.mjs
  status`, `bash training/m46_gen.sh <g> <cap>`.
- **`test/` is now tests only** — 109 → 38 entries. Removed **71 one-off probe/diagnostic scripts**
  (`arrow_*`, `badge_*`, `btn_*`, `inv_*`, `tab_diag*`, `icon_*`, `orbit_*`, `*_probe`, `*_diag`…)
  whose findings are already written up in BUGS.md/PLAYLOG.md. Every suite `npm test` runs is intact
  (verified: no referenced file missing).
- **Deleted as redundant:** `watch.html` (1.05 MB stale pre-crown-bake build — `index.html` is the only
  build) and the four superseded handoffs `NEXT_DEV.md`, `M46_RESUME.md`, `M46_MISSION_BRIEF.md`,
  `MISSION2.md` — all four still named **GEN 9 · fit 283** as champion (three crown moves stale) and
  would have misdirected a fresh agent. Everything remains recoverable from git history.
- **Bootstrap moved into the repo** (`test/browserlab/boot.sh`, Chromium 149 + SwiftShader from npm's
  `@sparticuz/chromium`): the turn boundary wipes everything outside `/home/user/aurorawolf`, so the
  env recipe must live in the repo. This replaces the older `tools/setup_env.sh` + `tools/chromium-libs/`.

### 4.5g Session 2026-09-03 (human-speedrun continued — the fight is CLOSED)
- **The tier-1 fight is solved and coached — the PARK law (probe v25):** walk-orbit at
  `r = 7/neck` (2.77-3.18 m) turns at exactly the Legend's neck rate → the gap FREEZES;
  park at dead-behind → every strike whiffs (dot −1) and walking regens 11/s (0.22 hits/s,
  0.87 dps, 52 s kill, net **−18 of 196 hp** at L12, stamina floor 113). The band walk-ring
  also closes (39-56 s, net −37..−48; wins, bleeds). Rankings: **PARK > band > dip grammars
  (v19-v24 all lose) > old sprint ring (0 damage in 8 real attempts)**. The probe's
  "NET LOSING" verdict is a strawman — real test `kill_time × (incoming − regen) < wolfHp`.
- **The real-run failure chain was the RIG, not the fight** (8 attempts, 0 bites): sprint
  travel drained the tank (every boss-start stam 5-16), the pre-trial top-up was dead code
  AFTER the `d<3.2` channel check, the doomed flee ran 2,700-poll loops (no stamina floor),
  and the boss's body pursues at 12.5 m/s with NO leash (open design question — the only
  recoveries are the park, or die-and-retry: `onDeath` despawns the boss, stage → 'awaken',
  respawn = full tank). All rig fixes are in `test/speedrun/run.mjs` (uncommitted before
  this cleanup commit): top-up before the channel (ritual now logs `stam:99, hp:140`),
  flee floor stam ≥ 15 (below it stand and die), shut-in entry gated at stam ≥ 25,
  `--fighttac=park` default.
- **Bug ledger:** `BUGS.md` §"Session 2026-09-03" (R-1..R-7 rig fixes, G-C1..G-C6 game-side
  confirmations, O-1 park variance / O-2 L8+ protocol re-evaluated — the park wins from L5,
  net −41 of 140; the L18 gate was a 7,000-xp over-grind, reverted to natural 5).
- **Gate for bot generations:** LAW v4 stands, no promote without a human/trainer verdict;
  the next generations should be judged by the park grammar (drill 7 of the manual).
- **Open item (next session):** the park's tail-zone gates slip in the real integration
  (fm −0.8 → +0.12 wrap; arrive-sprint drains 77→11). Repro + suspects:
  `test/speedrun/HANDOFF_2026-09-03.md`.

### 4.5h Session 2026-09-04 (home menu, fullscreen, repo hygiene — MAIN-ONLY)
- **User asked to make the repo one clean `main` branch.** The Arena session branch
  `arena/01a066d5-aurorawolf` was a platform artifact (contents identical to `main`); deleted
  from the remote and locally. `git ls-remote origin` now shows **only `refs/heads/main`**.
  Publish path is `tools/ship.sh` (build → `git push origin main`) — no branches, no PRs.
- **Home menu rework (previous commit `ab8155e`):** the `🧭 NEW GAME` / `▶ RESUME GAME` card
  buttons became *drop-down triggers* (each opens its two choices below it: `▶ Start Game` /
  `🤖 Watch The Rafzzer the AI Play`, and `▶ Resume Last Game` / `🤖 Resume Rafzzer the AI Play`);
  `newGame()` navigates with `?seed=<new>&autostart=1` so Start Game drops straight into play.
- **Bug fixes shipped:**
  - **Removed the redundant side `🧠 Watch Rafzzer the AI Play` button** (`#btnMenuAI`) below
    `🏆 HIGHEST RECORD` — the AI-watch choice already lives inside the NEW GAME / RESUME drop-downs
    (`#ddNewAI` / `#ddResumeAI`). Autopilot delegation updated accordingly (`commit 95f9868`).
  - **Pause now shows the exact first-load menu** — `showOverlay('pause')` reuses `tplStart`
    (two cards + drop-downs + side record) instead of the old 2-button `tplPause`/`RESUME`/`NEW GAME`
    + `pStats` screen. It saves the live run so "Resume Last Game" continues in place
    (`commit 95f9868`).
  - **Fullscreen on ANY touch to the game window** — a document-level *capture-phase* `pointerdown`
    listener requests fullscreen from any tap/click (game button, touch UI, or empty ground) and
    only skips while typing a wolf's name; `startGame()`/`setState('play')` also call it, so every
    human/AI start and pause→resume enters fullscreen. Fresh starts arriving via navigation
    (`?autostart=1`/`?autopilot=1`) clear the gesture, so the first key/tap completes the swap
    (`commits 2114ae1` + `8d83db3`).
- **Repo hygiene (`87e365e`):** removed legacy test-only `tools/chromium-libs/` (12 binary `.so`)
  and `tools/setup_env.sh` — the working bootstrap is `test/browserlab/boot.sh` (Chromium from npm,
  no sudo/system install). Untracked regenerable `shots/forest.jpg`; extended `.gitignore` to
  `shots/*.jpg|jpeg|webp`. Verifiable: build reproduces `index.html` byte-identically; `smoke`,
  `forest`, `menu`, `landscape`, `touch`, `fullscreen`, `pause_fullmenu`, `ai` suites all pass.
- **New regression tests:** `test/pause_fullmenu.test.mjs` (menu parity + resume-in-place) and
  `test/fullscreen.test.mjs` (requestFullscreen spy across all start/resume/touch paths).

### 4.6 Repository-hygiene decisions (2026-09-01)
- `training/rafzzer_candidate.json` = transient spawn artifact → **untracked + gitignored**.
- `shots/*.png` and `shots/forest.jpg` are regenerable → gitignored; `shots/README.md` tracked.
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

1. `node training/rafzzer_gens.mjs status` — lineage + champion.
2. `bash training/m46_gen.sh <g> <cap>` — spawn→gate→run with auto-cadence (exit 3 = stop).
3. `node training/rafzzer_gens.mjs promote <g> --verdict=reject|promote --note="…"` — trainer verdict;
   `promote` rewrites `training/rafzzer_champion.json` only if gate PASSED **and** fitness > champion.
4. Read the run report: fitness, tier/trophies/topTier/topTime/clock, xpMin, qMin, avgQuestS,
   maxLevel, cause, `side` (RUN.side), warns/errs, beats, scars, knobs.
5. Judge with the LAW (trophies ≫ road ≫ efficiency; deaths pay tier-scaled penalty; side errands
   +25 capped 3). Update `training/m46_session_ledger.md` + MASTER.md §9 + AGENT_BRIEF §3/§6.
6. Commit everything (collect-at-end) + push to `main` (`git push origin main`), or just run
   `bash tools/ship.sh "msg"` which builds + commits + pushes in one step (single-branch repo).

**Footguns:** background jobs don't survive turn boundaries (a generation must be run and awaited in
one session); headless RAF freezes (tests drive `CAMP.tick()` manually); `BOT_OFF=true` still leaves
`window.RAFZZER` usable but only with `?autopilot=1` (RAFZZER registers only in autopilot mode);
playwright/node_modules reinstalled per session; never chain gate→run via pipe; never hand-edit the
seed line (extension must be exact zero-pad; verify seed length = NW).

---

## 6 · CURRENT STATE (branch = `main`; lineage — GEN 50 is the champion; the Tier-1 trophy is the frontier)

**Repo:** single branch `main` at `87e365e` (HEAD) — all recent session work committed & pushed.
The AI-watch/pause/fullscreen fixes and the repo cleanup are live on `main`. The next agent should
work directly on `main` (no feature/session branch).

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
npm install               # repo deps (playwright, express, pngjs) — Playwright browser NOT fetched
bash test/browserlab/boot.sh   # Chromium 149 + SwiftShader from npm's @sparticuz/chromium (no CDN/apt/sudo)
python3 build.py          # committed index.html is already built; rebuild to be certain
node test/smoke.mjs && node test/menu.test.mjs && node test/fullscreen.test.mjs && node test/pause_fullmenu.test.mjs
node test/side.test.mjs && node test/campaign.test.mjs && node test/pack.test.mjs
node training/rafzzer_gens.mjs status   # champion GEN 50 (fit −55), lineage to GEN 55
# push (single branch):     git push origin main
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
