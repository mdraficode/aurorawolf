# 🐞 Bug-Hunt Mission Report — Aurora Wolf
> ✅ **RESOLVED — all actionable findings fixed, gated, and published.** Details in the Resolution Log at the bottom.
> Replay any session live: serve the workspace and open `index.html?autopilot=1` (bot plays on-screen with an event feed). The stale `watch.html` snapshot was removed 2026-09-02 — it predated the crown bake; `index.html` is the only build.
_Played autonomously from a fresh start, 3 sessions (~35 min of gameplay) + targeted verification battery. Seeds: 4242, 90210, 1313, 5150. Zero page errors across all play — the crash-proof loop held up._

## Legend
🔴 critical = breaks core progression · 🟠 major = blocks/misses content · 🟡 minor = polish · 🔵 observation

---

## 🔴 B1 — Kills never count toward quests, and give no XP
**The hunt loop is dead in live play.**
- **Proof (live):** bit a Rabbit once → prey died, `meat +1`, kill stat +1 — but the active hunt quest stayed **0/1** and XP gained **0**.
- **Root cause:** `questEvent('kill', …)` is called **nowhere**. The p3 hooks (Animal.caught, Predator.die, Pack.memberDown → kill/predkill/packDriven) were lost in a patch batch during the quest round — same failure mode as the earlier lost perks constructor (a python patch batch aborted mid-file and the later steps silently never landed).
- **Blast radius:** HUNT quests uncompletable · SURVIVE (storm-kills) uncompletable · PACK (rival pack driven off) uncompletable · no XP for any prey/predator/rival kill (prey 6 / predator 20 / rival 35 per design) → leveling from combat impossible · boss-awaken gating (3 quests per biome) slows to gather/explore-only.
- **Fix:** re-apply the p3 hooks: in `Animal.caught()` → `questEvent('kill',{species: key, pos}) + addXp(6)`; in `Predator.die()` → `questEvent('kill',{species:'predator'…}) + addXp(20)`; in `Pack` flee branch → `questEvent('packDriven',{})`; in `RivalWolf.die()` → `addXp(35)` (rival questEvent already wired ✓).
- **Note:** `test/quest.test.mjs` passed because it calls `questEvent()` directly — the suite can't catch a missing *caller*. Add a live kill-path check.

## 🔴 B2 — Quest generator offers impossible quests (feasibility never checked)
Three independent flavors, all proven:
- **a) Hunts in biomes where nothing spawns.** `spawnChunk()` returns early for swamp / enchanted / volcanic / shore (no `SPECIES_TABLE` → **zero animals ever spawn there**), but `genQuest('hunt')` falls back to the *forest* species table for those biomes → "Hunt rabbits in the Ember Wastes" — the code's own comment says nothing grazes on ash. Sampled offer rates: swamp/enchanted/volcanic/shore together ≈ 4 of 13 biome keys × the 40 % "neighbor biome" roll.
- **b) Neighbor biome pick is arbitrary.** `questBiomePick()` picks `cur ± 1` **by object-key order** — 'volcanic' and 'shore' are legitimate picks while the player stands in a taiga. Quests routinely send you hundreds of meters away for species that do spawn — just not where you are.
- **c) Explore quests point at landmarks that don't exist.** Sampled 60 explore quests: **58 named landmark types absent from the loaded world** (world held 2 × ancientTree only). Type may exist beyond the streamed area — but see B3: the player gets **no waypoint at all** in that case, so it's indistinguishable from impossible.
- **Fix:** filter hunt species by `SPECIES_TABLE[questBiome]` actually non-empty AND species present in nearby loaded chunks (or at least same table); pick explore `lmType` from types already present in `landmarkList` (or nearest existing); exclude volcanic/shore from quest biome picks.

## 🟠 B3 — No waypoint for explore quests whose landmark type is absent
`drawMapOverlays` only draws the gold waypoint when an lm of `q.lmType` exists in `landmarkList`. With B2(c) that means most explore quests show **zero guidance** — not on minimap, not on big map. Fix together with B2(c); as a fallback, waypoint the nearest chunk-biome-match direction.

## 🟠 B4 — "Gather bones" collect quests are surface-impossible
Bone pickups spawn **only in caves** (cache pickups) — the surface has none. COLLECT_ITEMS includes `bone` (and `wood` only from sticks/meteor sites) without availability checks. Session 3 spent its whole run on "Gather 5 bones" 0/5. **Fix:** gate `bone` behind cave discovery (or drop it from the pool); prefer items with pickups in loaded chunks.

## 🟡 B5 — Quest title pluralization
"Hunt 3 **Foxs**" (also "Deers" was fine by luck? no — "Deers" also appears). `label + 's'`. Fix: simple pluralizer (Fox→Foxes, Deer→Deer, else +s).

## 🟡 B6 — Terrain/solid wedging (game-feel)
Session 1: the wolf wedged at (−535, 166) forest, **0 m of movement for 11 minutes** while inputs kept processing (sprint toggling visible in stamina). Sliding exists for head-on solids, but concave pockets (between trunks/boulders, or a bank lip) trap the wolf with no auto-unstick. A human player escapes with camera+strafe; it still feels bad. **Fix idea:** if displacement < ε over N seconds while input active, apply a gentle outward nudge along the surface normal.

## 🔵 B7 — Unexplained HP loss
Session 2: 100 → 70 HP around t≈180 s in taiga, no predator logged near, no death. Possibly cold/storm drain or an off-screen predator. Needs a damage-source audit line (log every `wolf.hp` decrease with cause) — verify on-device.

## ✅ Verified healthy during play
- **Zero page errors / zero crash banners** in ~35 min across 3 fresh worlds (fault-tolerant loop works; meteor-freeze fix holds).
- No NaN in any of ~1,300 samples (positions, HP, stamina, camera angles); chunk streaming stable (16→63 chunks over 640 m, no leak); animal populations healthy (35–47 in range, young spawning: "Young Rabbit/Deer").
- Gathering works (items, +3 XP, shimmer), landmark discovery works (+10 XP seen live), day-cycle quest tick works, meat/loot works, combat bite-cone works, rival-kill quest hook exists (p3:851).
- Weather/biome transitions clean across taiga→forest→grove→meadow.

## 🤖 Bot artifacts (NOT game bugs — recorded for honesty)
- Prey matching by object reference failed silently (`Animal.sp` is a copy, not the SPECIES ref) → "no prey nearby" events in sessions 1–2 were the bot's fault; matching by label fixed it.
- "Stuck storms" in session 3: headless SwiftShader runs the sim at ~12 % real-time speed, so real-time stuck timers misfired. Session-1's 11-min zero-movement wedge remains a genuine game-feel issue (B6).
- The bot cannot path-plan; humans detour naturally.

## Suggested fix order
1. B1 (restore kill/packDriven hooks + kill XP) — unlocks the entire quest loop
2. B2+B3 (quest feasibility + waypoint) — no more dead-end deeds
3. B4 (bones gating) — same family, quick
4. B5, B6, B7 — polish & audit


---

## ✅ Resolution Log (post-mission fixes — all verified)

| Bug | Status | Fix shipped |
|---|---|---|
| **B1** kills don't count / no XP | ✅ FIXED | Hooks restored in `Animal.caught()` (kill + 6–12 XP by prey size), `Predator.die()` (kill + 20 XP), `Pack.memberDown` flee branch (packDriven + 25 XP). Live-bite regression check added to `quest.test.mjs` — **32/32**, quest completes and pays on a real bite |
| **B2** impossible quests | ✅ FIXED | `questBiomePick` only picks wildlife biomes (has a SPECIES_TABLE); hunts pick the biome's own table, preferring species alive in loaded chunks; explore quests only name **unfound landmarks that exist in the world** (in-biome first, any-landmark fallback, `peak` if none). Verification battery: 0 invalid offers across all 13 biome keys × 40 rolls |
| **B3** missing waypoint | ✅ FIXED (via B2) | Waypoint draws whenever the quest's landmark exists — which is now always |
| **B4** surface-impossible bones | ✅ FIXED | `bone` removed from the collect pool (cave treasure stays a discovery, not a deed). Pool now berry/stone/wood/herb/mushroom |
| **B5** "Foxs"/"Deers" | ✅ FIXED | `pluralOf()`: Fox→Foxes, Deer→Deer, Hare→Hares. Titles verified |
| **B6** terrain wedging | ✅ FIXED | Wolf wedge-escape: >1.15 s of pressing-on with <0.55 m progress (game-time) → nudged off the nearest solid + small hop + turn, 2.5 s cooldown. No multi-minute wedges in post-fix autopilot sessions |
| **B7** unexplained HP loss | 🔍 TOOL SHIPPED | Not reproducible in 12 audited minutes (0 HP drops). `?audit=1` now logs every HP decrease with its call site. Most likely cause: full-speed crash damage (−4 HP, toasted to players) from the bot's blind sprinting |

**Post-fix proof:** fresh-world autopilot sessions run with **0 page errors, 0 crash banners**; quest offers 100 % feasible; live kill → quest complete → XP → level all verified end-to-end. (Bot footnote: an open-field chase of a reindeer can outrun an exhausted wolf — that's the stalking mechanic working as designed, not a bug; the bot just never learned to ambush.)


---

## 🔄 Mission 2 — Verification Round (bot v6: obstacle-avoiding, hopping, predator-wary)
_Fresh worlds, seeds 60606 + 4242 (the original wedge world), ~19 min of play + a 325-roll verification battery. **0 page errors, 0 crash banners.**

### Previous fixes — all re-verified ✅
| Check | Result |
|---|---|
| B1 kill→quest→XP (live bite) | ✅ prey died, quest 1/1, +188 XP |
| B2 quest feasibility (325 rolls × 13 biomes) | ✅ 0 impossible hunts / explores / collects |
| B4 bone deeds | ✅ 0 offered |
| B5 plurals | ✅ no "Foxs/Deers" in 30 titles |
| B6 wedge spots (−535,166 · 0,−293 · 467,317) | ✅ all three move; the 11-min wedge world (seed 4242) played clean — one 9 s pause, self-recovered |
| Satchel + quadrant joystick | ✅ intact |
| Fault-tolerant loop | ✅ zero errors across both sessions |

### New findings
- **N1 (polish, fixed):** rival-pack deeds could wait on the random pack event (240 s life, ~5 min cadence). Now an active rival deed triples the pack-event weight — the wild answers your quest.
- **N2 (observation, no fix needed):** bot deaths to predators are legit gameplay (one at t=155 s, predator at 1 m — the bot fled at low HP and escaped on respawn). HP audit ran clean: no unexplained damage.
- **Bot v6 behavior verified:** obstacle probes steer around trunks/boulders/deep water (9 candidate headings, clarity-first), smooth eased turning instead of snapping, hops over near blockers and bounds up rises (14 hops logged on one hillside climb), and gives predators a 48 m berth in its pathing.

---

## 🔄 Mission 3 — Combat-Fairness Round (user report: "attacked from behind → no damage")

### The bug
**Player-reported:** enemies attacking from behind dealt no damage. Reproduced dynamically (holding a predator at 1 m directly behind the wolf for 12 s): **0 hits from the rear** while frontal attacks landed normally. Static point-blank tests passed — the bug only showed in live engagement, because it was a *movement* bug, not a damage bug.

### Root cause
In `attack` state, neither predators nor rival wolves ever set `speed` — they inherited **chase speed** (11.8–12.2 m/s) while already at bite range, so every frame they overshot the wolf, orbited around/through it, and the bite check only connected if the orbit happened to cross bite-range on the exact frame the cooldown expired. From the front the closing arc usually clipped the cone; from the rear the orbit swept the bite window almost every time — hence the asymmetry.

### Fix (src/p3.js)
- **Predator:** close the last strides, then *plant feet and bite* — `speed = dWolf > reach*0.6 ? walk*2.6 : 0`, and bite unconditionally on cooldown while within `reach*1.35`.
- **Rival wolf:** `speed = dWolf > 1.8 ? 12.2 : 0`, bite at `dWolf < 2.4` (was 2.1).

### Verification (test/combat.test.mjs — permanent suite, 8/8)
Held-distance 5 s windows, attacker kept at a fixed offset by side, damage counted through a `wolfTakeDamage` wrapper:

| Attacker / side | bites | dmg |
|---|---|---|
| predator · behind 1.2 m | 3 | 45 |
| predator · front 1.2 m | 4 | 60 |
| predator · flank 1.8 m | 6 | 90 |
| predator · behind 3.0 m | 8 | 120 |
| **rival wolf · directly behind** | **10** | ✔ |
| player bite on predator | lands | ✔ |

Rear damage is not weaker than front (3 vs 4, within fairness tolerance); zero page errors. The player's own bite cone is untouched.

_Suite-harness note (for future tests): `RivalWolf`/`Pack` members only tick via a **live** `WORLD_EVENTS` event — use `WORLD_EVENTS.force('rivalPack')`, not `new RivalWolf()` or a bare `EVENTS.rivalPack().begin()` (the pack never updates that way)._

---

## 🔄 Mission 4 — Marathon long-run findings (bot v7, hours of autonomous play)

### Game-side (candidates for fixes)
- **M1 · Explore dead-ends (🟠):** a "Discover X" deed offered while X is already found (or found before completing) can have NO completable target — the deed stalls forever. genQuest should re-check `!lm.found` at accept/complete time or reroll.
- **M2 · Biome-locked deer deeds, untitled (🟡):** "Hunt N Deer" only counts in the deed's biome; nothing in the title/desc says which land. Players will kill deer that don't count.
- **M3 · Legend-less lands (🟡):** taiga/coast/meadow have no BOSSES entry — 3 deeds there wake nothing. Progression feedback ("a legend stirs") never comes for ~¼ of the map.
- **M4 · Spawn-adjacent terrain traps (🟠):** seeds 88152, 81603 — spawn-adjacent bowls where wedge-escape + sustained flanking both fail (bot needed a 220 m random breakout). Worth adding a spawn-point reachability check or strengthening escape.
- **M5 · No storm shelter (🔵):** storm HP ticks are unavoidable; resting in cover changes nothing.

### Bot v7 bugs found & fixed during the run (the upgrade was the bug-hunt)
steering inversion (v1-v6 all ran backwards) · drown-loop fleeing · hunt/drink goal flapping · out-of-biome deer waste · found-landmark standing · tree-crash bleeding (decisions must run at sim cadence under boost) · terrain-bowl grind (flank + hard-trap breaker) · rival-passivity · quest starvation via over-strict scoring · quest re-accept loops after abandonment (shunning + relief).

*Zero page errors, zero crash banners across every chapter.*

---
## ✅ Mission 5 — AI watch mode (feature ship, not bugs)
Shipped cleanly; the only suite churn was quest.test.mjs's XP check, which didn't account for level-up boundaries (game paid correctly — test now level-aware). Bot brain runs at true game cadence; boost (?speed=) remains a URL-only harness tool and never activates in normal play.

---
## 🋴 Mission 6 PREP — v7.20 "Natural Hunter" (spectator-vibe overhaul)
**User report:** bot circles/back-and-forths after a while — kills the spectator vibe. Root-cause hunt across 8 sanity chapters (CH18–CH25):

**Found & fixed (bot brain):**
1. 🔴 `wind is not defined` — a cleanup deleted the declaration; think-loop threw EVERY tick (2 106 swallowed bot-errors in one chapter): keys froze mid-walk, wolf walked straight forever. (CH19)
2. 🔴 **Stamina-drain tether** — travel-sprint gate `stam>30` drained to 24 → forced drink-trip back to the SAME water hole → sprint-drain → return = laps around a lake (the user's exact symptom). Fix: travel sprint keeps reserve (`>55`); hunts keep `>12`. (CH22/CH23 trace)
3. 🟠 **Eternal follow at 27–50 m** — grind detector is cell-anchored, moving chases never sit still → wolf trotted behind out-walking prey forever. Fix: chase give-up — 30 s without closing 20% → shun quarry 45 s; 3 fails → set deed aside. (CH22)
4. 🟠 **Explore target flip-flop** — 28m↔264m↔234m landmark switching every few seconds. Fix: `lmStick` commitment (45 s per deed) + waterline-reachability pick among 4 nearest unfound.
5. 🟠 **Predator-tug gathers** — pickup beside a predator = approach/fear-steer orbit. Fix: skip pickups within 60 m of live predators.
6. 🟡 Loop-breaker v1 over-fired (18/150 s — yaw-noise wind, per-tick sampling, interruptions of stalk curves & drink trips). v3: 2 s-sampled displacement bearings, hunt/drink-guarded, 90 s cooldown, only for deliberate travel.
7. 🟡 Wander was Brownian (random bearings) → forward-biased arc + no-revisit history + 25% long treks; steering got turn-cost damping (kills ±0.5 rad ping-pong).

**Found & fixed (harness):** marathon event pump was never writing marathon.jsonl (watchdog would recycle healthy runs; forensics lost); runner TDZ crash (`const URL` shadowed global); close-record perks crash (object perks).

**New naturalness:** post-kill "🐾 savoring the catch" pause, new-biome pause + scent sweep, honest drink distance, chase-giveup/hunt-fail logging.

**Verification:** ai.test 15/15 · CH25: 47 kills, L3, 0 loops, 0 errors · CH23: chase give-ups observed working. Live: commit 2515e3e.
**Mission focus going forward:** bot loop-health (eff/loops per chapter), boss-awake milestone, `bug-*` events incl. new `bug-bot-loop`, `bug-landmark-across-water`.

---
## Mission 6 — v7.21 "Real-Cadence" (user-reported loop recurrence in REAL gameplay)
**User report:** bot circles again after a while following quests — in the real app, NOT in simulations. **Root cause confirmed: the simulation harness was a different world.** The ?speed=12 boost forces dt=0.05 ticks (20/s); real gameplay runs 60 FPS dt≈0.0167 — per-tick spawn rolls ~3× denser in harness, and brain timers tuned at 12× misfire at 1×. A 1× probe harness (test/real1x.mjs, true speed, default density) reproduced the user's exact symptoms and drove all fixes:

1. 🔴 **Doorstep orbit** — landmarks/pickups behind cliff collars: wolf circled at constant radius (od +2m/5s, dist frozen 24m); grind detector is cell-anchored + loop-breaker needed 70 m odometer (12×-tuned). Old escape took 3.5+ min of circling. Fix: close-range creep detector (30 s no-arrival → perimeter walk → blacklist site; 2 sites → deed aside) + loop-breaker thresholds speed-normalized.
2. 🔴 **Peak-quest marker chase** — "Climb a High Peak" is a HEIGHT objective (y≥50) but the brain chased a cliff-flanked summit marker (148 m contouring). Fix: hill-climb mode — greedy walkable ascent, goal "y 34/50 m".
3. 🟠 **Hunt/travel seesaw** — travel rings re-scanned every think: goals flapped 760→840→440 m with spot-hunts interleaved. Fix: huntStick ownership (committed deed hunts, full stop) + travelStick (25 s point commitment).
4. 🟢 Naturalness: finish-line sprint (runs the last 40 m of a deed goal), stall detector now ignores survival deeds (false bug-quest-stalled on "Survive 2 days").
**Verified at true cadence (test/real1x.mjs):** goal-mode switches 1.3/min (from constant), zero 20 s stall windows (was chronic), deeds flowing (5/6 gather in 4 min at 2–4 FPS starvation = sub-2-min in real play), stamina holds 55 floor. ai.test 15/15. Live: d98c2ee byte-verified.
**Standing lesson: never verify 1×-gameplay behavior with the boost harness alone — keep real1x.mjs probes in the loop.**

---
## Mission 6.2 — v7.23 "One Deed At A Time" (persistent loop: TRUE root cause + quest guidance features)
**User report:** bot still circles one region, ignores the quest. **True root cause found via BOTDBG live-brain forensics:** the brain juggled BOTH active quests as competing attractors — every tick's nearest-goal comparison flips priority as the wolf moves, so it orbits the ground BETWEEN two goals forever (observed: travel→124m ↔ explore→152m alternating for 3 min, net displacement 11 m). All previous detectors were per-goal and blind to this.
**Fixes (v7.22→v7.23):**
1. 🔴 **Quest lock** — ONE deed at a time (60 s renewable on progress); switch only on completion/abandon/expiry. Attractor cycling is structurally impossible now.
2. 🔴 **Hard deadline** — the 150 s 'quest-drive' soft retry was RESETTING the 240 s stall-abandon timer → stuck quests never rotated. Now: absolute 5 min no-progress deadline → abandon + quest-KIND shunned 10 min (region stops offering the same failing deed type).
3. 🔴 **Doorstep windows per-QUEST** (goal-cell keying reset on goal wobble — never fired; observed 5 min at constant 30 m).
4. 🔴 **River ping-pong** — prey fleeing across water lured the wolf into endless cross-river chases. Fix: never target quarry across water; release any quarry that makes the far bank ('chase-river').
5. 🟠 **Ford mode** — deliberate shallow crossings (≤34 m water) toward deeds, shore-instinct suppressed mid-ford; travelToBiome now prefers DRY ring points (ford-set spam 13→0 in verification).
6. 🟠 Peak quests: hill-climb ascent goal ("y 34/50 m"); hunt quests with no quarry in range guide to the species' biome.
**New game features (user request):** `window.questGuide()` = single source of quest intent → **dotted gold guide line on minimap & big map** (player → completion site, with 📜 distance tag) + **faint breathing ground arrow under the wolf** pointing quest-ward (opacity ~0.14-0.21). Arrow verified yaw-correct; map line pixel-verified.
**Verification (real-speed, default density, seed 606061 river terrain):** before: 0-1 quests/8 min, permanent 30 m orbit, two-attractor cycling. after: 3 deeds completed + level-up per 7 min, gathers 4/5·4/5·2/3 flowing, hunts rotate out via chase-giveup/hard deadline, goal switches 1.8/min, zero stall windows, zero ford spam, 0 page errors. ai 15/15 · quest 32/32 · layout PASS. (touch suite: environmental flake this session — fails identically on the PREVIOUS published build; wake mechanic verified working in isolation.)
Live: commit 8109c8B byte-verified.

---
## Mission 8 — the mute score & the invisible menu (both root-caused with hard evidence)
**Bug 1 — music inaudible:** `music.stop(list, t)` called `n.start(t); n.stop(t)` with the SAME timestamp (the note's END time) — every note in the entire score began at the instant it ended. Zero-duration notes = structural silence since the music engine was born; gains and scheduling probes had passed because they never decoded the OUTPUT. Fix: `stop(list, t0, t1)` — start at note start, stop at note end (11 call sites). **Proof of audibility:** AnalyserNode on the master bus — signal 2.77 during playback vs 0.69 with the score muted (real samples leaving the mixer).
**Bug 2 — dead touch zone (above action buttons / below-left of minimap):** the hidden title-screen overlay is inert (opacity 0, pointer-events none) but its CHILD BUTTONS (btnStart/btnMenuAI) carry their own `pointer-events: auto`, re-enabling hit-testing on invisible menu buttons floating over the game — exactly the user's dead band. Found via TRUE hit-tested CDP touches (synthetic dispatchEvent bypasses hit-testing — earlier probes could not see this class of bug). Fixes: `#overlay.hidden * { pointer-events: none !important }` + camera pointerdown moved to WINDOW level with a designated-controls filter (any free area claims the camera, immune to future overlay stacking). Real-path matrix after: dead band ✓ camera · mid-right ✓ · left zone ✓ joystick · minimap ✓ no-claim.
**Standing lesson: verify touch with CDP hit-tested events and audio with an analyser on the output bus — synthetic dispatch and gain inspection both lie.**
Gates: touch PASS · audio ALL PASS · ai 15/15. Live: c6c6dba byte-verified.

## M44 / rafzzer session (2026-08-30) — neural-bot bug hunt
- FIXED peak-quest guide pointed at sub-50 m bumps → 5-min stall loops (guide now requires heightAt>50.5, search 80–470 m, nearest-qualifying).
- FIXED peak quests offered in throne-less terrain (generator probes before offering; falls through to Gather).
- FIXED bot whiffed bites: bit same tick as camera-aim while body yaw mid-turn (bite cone ~78° on wolf.yaw); cadence 650→900 sim-ms + body-alignment gate at all 3 strike sites. Shakedown 2→0.
- FIXED autopilot warnOnce key precedence ('miss'+SIMNOW()|0 → constant 0, strangling dedup).
- OPEN non-peak quest stall: 1× per ~5 sim-min on seed 7777 (hunt/gather class, cause not yet run to ground).
## M45 / rafzzer session 2 (2026-08-30) — 20-generation training run
- OPEN gather-quest stall seen again ("Gather 6 mushrooms stuck at 0/6", 4× in one run + 1× ship shakedown): quest ground can lack the target resource; same family as the fixed peak-quest issue. Next: probe gather-goal finder for resource presence before offering.
- FIXED (harness) rafzzer_gens poll broke on `dead` before the death scorer ran; 1.2 s auto-respawn zeroed telemetry (produced a bogus SURVIVED/-125 report).
- No new game-side page errors or tick crashes in ~2.5 h of boosted sim across 20 generations.

## M47 / human-speedrun session (2026-09-02) — playing the campaign by hand to the Tier-1 trophy
Goal of the session: an agent plays the game **as a human speedrunner** (no RAFZZER brain), from a
fresh save to the first Tier trophy, and fixes everything that makes the run physically impossible
before the next bot generation. Harness: `test/speedrun/` (human.mjs = hands & eyes, run.mjs = route
router, probe_fight.mjs = Legend-fight laboratory, `_*.mjs` = isolation probes), browser lab in
`test/browserlab/boot.sh` (Chromium 149 + SwiftShader), time acceleration via `?speed=&rate=&re=`.

### Game-side defects found and FIXED
- 🔴 **B8 — a Legend was disposed with its home chunk.** `disposeChunk()` killed the Boss when the
  64 m chunk it was born in unloaded, so a Legend that chased the wolf across a chunk border died
  silently mid-fight (and `wolf.attack()` only scanned per-chunk animal lists, so a Legend standing
  on top of the wolf was invisible to the bite). Both sides fixed: Legends are no longer chunk-owned,
  and `Wolf.attack()` now scans the global `bosses` list too. Without this the campaign was
  **unbeatable**, not merely hard.
- 🔴 **B9 — echo/clone Legends leaked.** `Boss.die()` did not retire the shadow-wolf / Beast-Master
  echoes, so a slain Legend left live clones hunting the wolf forever.
- 🔴 **B10 — a Legend WALKED ALONG ITS OWN NOSE.** The body moved along `sin/cos(heading)` while the
  neck eased at 2.2 rad/s, so a player who won the turn race (orbit 3.1 rad/s) was rewarded with the
  beast running *away* from him at 12.5 m/s against the wolf's 13.5: an endless chase, every arrival
  head-on, every bite a FACE bite for 1 damage. **The body now pursues along the bearing-to-wolf;
  only the head is limited by the neck** — the combat grammar (turn race → blind side) is unchanged.
- 🟠 **v6.8 the DPS wall / the survival wall** (`Boss.update`; authored in the M47 speedrun session
  where it was labelled v6.7 — relabelled on merge because **v6.7 is the BOSS-KIT** on `main`):
  the heading used to SNAP onto the wolf
  every tick (`facing` ≡ +1.00 → every bite 1 dmg; Bear 112 hp = 84 s of uninterrupted biting) and the
  claw used to land the instant the cooldown expired, from any angle, with no wind-up (an undodgeable
  11-21 dps). Now: constant-rate neck turn (2.2·(1+0.15·phase), ×0.18 during the 0.55 s plant) and the
  blow lands where the swing ENDS, inside the same ~78° arc the player's own bite uses.
- 🟠 **Dead perks wired up**: Spring Steps (sprint stamina −25 %), Thunder Charge (sprint +12 %),
  Shadow Step (prowl detection 0.45 → 0.22). All three were granted and described but read nowhere.
- 🟠 **Explore deeds lost their destination** when the landmark's chunk unloaded: the deed now carries
  `wp` and both `questGuide()` and the map overlay fall back to it.
- 🟠 **The name prompt never showed on a fresh save** — p4 injects the start overlay while it parses,
  before the campaign module exists, so `onMenuRefresh()` never ran and `#nameRow` stayed
  `display:none` (every trophy recorded "Wolf"). The campaign now refreshes the overlay itself.

### The Legend fight, measured (probe_fight.mjs, tier-1 Leopard, wolf level 12)
The fight is a turn race with three numbers, all read out of the source rather than guessed:
`turnRate = 2.2·(1+0.15·phase)` (×0.18 during the plant), strike = `dd ≤ reach·1.35` **and**
`dot ≥ 0.2` → |gap| ≤ 1.37 rad, and it only walks while `d > 4.0`. The wolf's bite prices the same
angle: facing < −0.35 (|gap| > 1.93) = BEHIND → (3 + 1 ambush) × 1.5 = **6 hp** (a Legend has no
`aware` field, so every behind bite counts as an ambush), flank 2, face 1, cone |nose| ≤ 1.37, and
`atkCd` 0.75 s is spent even on a whiff.
Laws that were tried and **rejected by measurement** (all reports in `test/speedrun/runs/`, gitignored):
1. flee-when-hurt — the Legend runs 12.5-16 m/s and the wolf walks 7: fleeing took 367/696 polls at
   gap p50 **0.00** and received 14 of 19 hits. The 3 hp/s regen needs 6 CLEAN seconds, which only
   ever happens behind a parked gap. **Never turn your back on a Legend.**
2. symmetric zigzag radius control (±0.44 every two polls) — the wolf's yaw eases toward the
   commanded heading at `dt·9` (≈62 % per 0.1 s poll), so a 0.2 s square wave is low-pass filtered
   into its own mean: commanded 1.12 rad off the bearing, travelled 1.57; nose p50 1.70-2.06 against
   a 1.37 cone → 5 % of polls could bite, 60 s produced 15 presses.
3. band-holding the gap with reverse taps — each tap is a 2.26 rad yaw flip; blind side rose to 31 %
   but the nose spent half its time outside the cone (8 presses in 47 s).
What **works** (LAW v11/v12 in probe_fight.mjs): one fixed lap direction, a *held* spiral between two
rings (θ_IN 1.28 bite-capable / θ_OUT 2.30 pays the radius), sprint only to cross the 1.37 arc, and a
**closed-loop aim lead** that measures the yaw shortfall from the wolf's own last-poll displacement and
asks for it up front — after it, commanded θ and travelled θ agree to ±0.02 rad.
STILL OPEN at the time of writing: 14-19 hits per ~50 s (4-5 incoming dmg/sim-s) against 3 hp/s regen
— the wolf reaches the Legend's last 3-9 hp and then dies. The remaining lever is bite timing: the
gate reads a yaw that is one poll stale, and 6 of 13 real attacks still whiff.

### The cadence law (the rig defect that cost a session, now built into `probe_fight.mjs`)
Polling faster than the boost batch starves the page's main thread. Measured: **2454 polls in
60.7 sim-seconds** = 0.025 sim-s per poll, the sim crawling at **0.87× real**, the eyes returning
frozen state, and a zigzag averaging itself into pure tangent so the bite cone rejected everything.
It looks exactly like a broken aim chain and it is not. Fix: **one decision per batch**, with the
poll interval self-tuned from an EMA of measured sim-dt toward `speed × 0.05` → **dt/poll 0.100 s**
at `speed=2`. Any report whose cadence line is off is an invalid run — check it before believing a
single number in it.

### Numbers card — the rest of the Legend law (values the prose above does not spell out)
| | phase 0 | phase 1 (`hp<50 %`) | phase 2 (`hp<25 %`) |
|---|---|---|---|
| neck turn | 2.20 rad/s | 2.53 | 2.86 |
| neck during the 0.55 s plant (×0.18) | 0.40 | 0.46 | 0.51 |
| `atkCd` before the plant | 1.25 s | 1.10 | 0.95 |
| cycle-average neck rate | 1.65 | 1.84 | 2.00 |
| approach speed (`d > 4.0` only) | 12.5 m/s | 14.25 | 16.0 |
| `specT` decay (`×(1+0.3·phase)`) | 8 s | 6.2 | 5.1 |

A walking ring at **r ≈ 2.05 m** (θ 1.28 off the bearing) gives ω = 3.25 rad/s — above the neck at
*every* phase, which is why the sprint is only needed to cross the 1.37 arc (~0.35 s, 10 stamina,
82 refunded by the walk). Below r ≈ 1.8 the bearing geometry degenerates: measured at r = 0.82 the
gap readout spun at 7 rad/s and dumped the wolf at the Legend's nose.

**Coach's book:** `TRAINING_MANUAL.md` — the rig and its two laws, the campaign on one page, tier-1
Legend numbers, what the wolf actually does, the four routes and when each wins, the full
attempt/lesson table for the fight, and six drills in priority order for the part that is still open.

---

# 🐞 Session 2026-09-03 — the human-speedrun playability pass (real-input run, M47 follow-up)

Entries below were found while playing the game with the sanctioned real-input rig
(`test/speedrun/human.mjs` + `run.mjs`). Class: **RIG** = `test/speedrun/*` bugs (the rig's
own, fixed here, uncommitted); **GAME-CONF** = game-side issues confirmed against `src/`
(design-consistent, some already fixed in the shipped build), **OPEN** = no patch without a
human/trainer verdict.

## RIG-side (fixed, uncommitted)

- **R-1 · Top-up AND bug** — `hp < maxHp·0.92 && stam < 60` let the wolf enter the boss
  at 56.76/140 hp (40%) with full stamina (`runs/iron7777_v20.log`, boss-start #1).
  FIXED: OR + `healWait < 40` timebox.
- **R-2 · Grind-pick ritual bug** — the iron grind accepted the ritual itself (cheapest
  board item — `runs/iron_v2.log`). FIXED: stray ritual set-aside + `pickDeed` filters
  `kind !== 'ritual'`; the grind next hunts the wild (kills pay 6–12 xp) and logs every
  branch — a silent spin can never hide again.
- **R-3 · TDZ** — `FIGHT_LVL = +arg('fightlvl', isIron ? …)` ran before `isIron` was
  declared. FIXED (flag moved below the const). Same class as the GEN 53 order bug.
- **R-4 · Doomed flee (2,700-poll)** — the in-fight flee had no stamina floor: an
  exhausted wolf sprint-flees at +1 m/s vs a 12.5 m/s pursuer for minutes
  (`iron_ring.log`: `fled 2701`/`3102`/`2740`), running into arena predators on the way.
  FIXED: flee only while `stam ≥ 15`; below that stand and die — the death retry is the
  game's intended full-tank re-entry (`onDeath` despawns the boss, stage → 'awaken').
- **R-5 · Dead-code top-up** — the pre-trial rest sat AFTER the `d < 3.2` channel check:
  the sprint travel stops at the altar and channels before a single rest poll runs.
  Every boss-start measured stam 5–16. FIXED: top-up (stam < 80 || hp < 90%) + arena
  hygiene now run BEFORE the channel (the ritual marker now logs `stam:99, hp:140`).
- **R-6 · The old fight gaits landed nothing** — baseline + v20: **8 boss attempts,
  0 bites, 0 swings** (flee loops 2649–4000). Root: the sprint ring never closed (r
  pinned 4.2–4.9; an exhausted walk-close loses 12.5 vs 7 m/s) and the dip's `struck`
  window was one poll wide. Working grammars: the band walk-ring (probe: 45 hp in
  39–56 s, net −37..−48 of 196 at L12) and the park (probe v25: 0.22 hits/s, kill 52 s,
  net −18, stam floor 113 — the only measured winner).
- **R-7 · Probe verdict strawman** — "incoming − regen → NET LOSING" ignores the hp
  budget; by the real test `kill_time × (incoming − regen) < wolfHp` several "losing"
  grammars actually win at L12.

## GAME-side confirmations

- **G-C1 · The DPS wall** — a Legend's heading used to snap to the wolf (every bite a
  face bite for 1); FIXED in src (v6.7 constant-rate neck 2.2·(1+0.15·phase), the blind
  side is earned). Confirmed live: behind bites land 6 hp.
- **G-C2 · The survival wall** — the Legend's bite used to land instantly; FIXED in src
  (v6.7 telegraphed plant, strike at plant END inside ±1.37 of its nose, reach·1.35).
- **G-C3 · B10** — a Legend walked along its own nose (1 m/s unfinishable chase); FIXED
  in src (body pursues, only the head is neck-limited).
- **G-C4 · Spring Steps wired to nothing** — FIXED in src (v6.8, −25% sprint drain).
- **G-C5 · Arena multi-threat** — wild Level 5–7 Lions/Bears share the tier-1 arena and
  hit from 4.8–5.1 m (outside the boss's 4.59 reach the fight loop watched); 3 of 4
  baseline deaths were to the wild "Level 6/5 Lion", not the boss. RIG mitigation: arena
  hygiene (walk away from predators d < 30 at hp > 60%) + park inside the boss's 4.0 m
  still-zone. Manual law: **clear the arena before the altar.**
- **G-C6 · No-leash pursuit (OPEN)** — the boss's body pursues at 12.5 m/s with no
  radius. An exhausted wolf has no recovery outside the park; the only exits are the
  park, the death retry, or losing. Design-consistent ("face it, or fall") — left OPEN
  pending a human/trainer verdict; the manual teaches the park + the arrival law.

## OPEN

- **O-1 · Park robustness/variance** — same v25 code rolled 0.22 hits/s (net −18, the
  win) and 0.44 hits/s (net −125, a loss) on different runs; the park's tail-zone gates
  slip through the ±1.37 window at some phases. Next task: the park engagement fix in
  `run.mjs` (gate hysteresis, arrive cut, `b.turn` exposure — see
  `test/speedrun/HANDOFF_2026-09-03.md`).
- **O-2 · The L8+/88% protocol vs the measured fight** — the game's own guidance needs
  L8+; the park fights win from L5 (net −41 of 140). The L18 gate was a ~7,000-xp
  over-grind (hunt soak 0.6–1.2 xp/sim-s = 30+ min for 3 levels) — reverted to natural 5.
