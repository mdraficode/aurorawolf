# Playthrough log — bug-hunt sessions

**Session 1 · seed 4242 · 15 min** — accepted "Hunt 3 Foxs" + "Survive 2 days". Roamed taiga→forest (~200 m), then wedged at (−535, 166) from minute 4 to the end (0 m / 11 min — genuine wedge, B6). Quest events: accept ×2, no progress (kill hook missing, B1). No page errors.

**Session 2 · seed 90210 · 13 min** — accepted "Hunt 3 Rabbits" + "Discover: Mushroom Forest" (both infeasible, B2). Bot (with the reference-matching bug) roamed 640 m taiga→forest→grove→meadow, hp dipped 100→70 once unexplained (B7), +10 XP from a real landmark discovery, no quest completions. No page errors.

**Session 3 · seed 1313 · 9 min (bot v3, label matcher)** — accepted "Gather 5 bones" (surface-impossible, B4) + "Hunt 2 Rabbits". Traveled to (0,−293) taiga, then a slow-game artifact stuck-storm; effectively blocked to the end. No page errors.

**Verification battery · seed 5150** — 28 rabbits / 6 foxes / 10 deer near spawn; hunt-offer matrix per biome (4 of 13 biome keys offer species that can never spawn there); 58 of 60 explore quests named absent landmark types; controlled kill test: rabbit died, meat +1, kill-stat +1, quest 0/1, XP +0 (B1 proof); wedge probe at (0,−293): speed 7.0 vs 1.6 m / 2.5 s → headless sim runs ~12 % speed (stuck-storm = bot artifact; session-1 wedge stands).

Full machine logs: `test/playlog.json` (session 3) · minute-by-minute screenshots: `shots/play_*.png`.
## Mission 2 — verification round
- **Session A · seed 60606 · 10 min** — bot v6 roamed forest, hopped obstacles, bounded uphill (14-hop climb), died once to a bear-adjacent predator (gameplay), abandoned a stalled rival deed (pre-boost), 0 errors.
- **Session B · seed 4242 · 9 min** — the original wedge world: NO wedge (one 9 s self-recovered pause), hunts pursued at sprint, 0 errors.
- **Battery** — 325 quest rolls: 0 impossible; live kill→complete→+188 XP; all three historical wedge spots move; satchel/quadrant intact.

## Mission 3 — combat fairness
- **Report:** "predator attacks from behind deal no damage" — reproduced (0 hits/12 s held at 1 m behind; frontal hits normal). Static tests passed; only dynamic engagement exposed it.
- **Cause:** attack state never zeroed `speed` → attackers orbited through the wolf at chase speed; bite window only connected on frontal closing arcs.
- **Fix:** plant-and-bite (predator `speed=dWolf>reach*0.6?walk*2.6:0`, bite ≤ reach*1.35; rival `speed=dWolf>1.8?12.2:0`, bite < 2.4).
- **Gates:** combat 8/8 (new permanent suite), cam 20/20, quest 32/32, touch/layout/landscape/heading PASS, smoke fps 20 / 0 errors. Rear ≯ weaker than front (3 v 4 bites).

## Mission 4 — marathon bug-hunt (bot v7 "True Hunter", chaptered long-run)
- **Setup:** headless chapters (~40 wall-min ≈ 100 game-min each, sim boosted ~2.4× via special-build tick driver), full event stream → test/marathon.jsonl, chapter records → test/marathon-chapters.jsonl, live snapshot → test/marathon-live.json. chapters run: 9 · totals 91 kills / 21 deeds / 2 deaths · best: L7 Stalker in ch3
- **Bot v6→v7.14 upgrades this session:** true stalk-ambush hunting, boss hit-and-run w/ charge-dodge & submerge-clear, level-aware fear, swim-to-shore, water-safe fleeing, drink hysteresis, biome-locked deer targeting, unfounded-landmark targeting, goal-grind flanking + hard-trap breaker, quest scoring w/ shunning + relief valve, sim-cadence brain (all 46 wall-clock reads → game-time).
- **THE big one:** every bot since v1 steered backwards (game moves wolf along camYaw+π; bot aimed camYaw) — first natural kills ever: 75 in chapter 3.
- **Game findings:** (1) explore deeds can dead-end if their landmark type is found before acceptance; (2) deer deeds are biome-locked with no title hint; (3) taiga/coast/meadow have no legend (deed-effort there can't wake a boss); (4) seed 88152 & 81603 spawn-adjacent terrain traps defeat both wedge-escape and 55m flanking (bot needed a 220m random breakout); (5) storms tick HP with no shelter mechanic; (6) rival packs politely stop attacking a resting wolf (regen > their bite rate at high maxHp).

## Mission 5 — 🤖 AI watch mode shipped (bot becomes a game feature)
- **The v7.19 brain is now IN the shipped game:** 🤖 HUD button (top-right cluster, mobile-safe) + "🤖 Watch the AI play" on the title menu. Toggle any time; ⏸ or a second press hands control back instantly (keys released).
- **Spectator mode:** live event feed panel (kills/levels/deeds/goals), touch controls step aside while AI plays, badge shows it's driving. `?autopilot=1` still auto-enables for watch builds/CI.
- **Gates:** new permanent suite test/ai.test.mjs **15/15** (dormant→on, panel, real autonomous play, touch-steaside, pause hand-back, re-enable, clean release, URL entry, menu front-door, zero errors) · combat 8/8 · cam 20/20 · quest 32/32 (level-up-aware XP check) · layout/touch/landscape/smoke PASS.
- **Live:** commit ecfb76f, byte-verified; menu→AI flow verified against the published site headlessly.

### Post-ship addendum
- Menu front-door added: **“🤖 Watch the AI play”** on the title screen — one click and the bot enters the game itself (live-verified on Pages).
- ⚠️ **Workspace incident:** a guarded `cd /tmp/ghub` chain broke and `rm -rf src test` ran in the workspace. **Full byte-identical restoration proven** (sources re-extracted from the published index.html + GitHub archive; `build.py` output cmp-identical). Casualties: marathon raw event stream (pre-CH17) + CH16 record detail — chapter table reconstructed from relay; CH17 ran as the harness-restore sanity chapter (L3 · 21k/0d · 💀0 · 0 errors).
- Brain v7.19+: splice-proof `window.BOTN` cumulative counters (log capping no longer undercounts long chapters).

### Mission 7 — touch, sound & sky
- Joystick: full left-side catch field (62vw × full height), no camera hand-off (finger owns the stick until lift), anchor carries along on long swipes, ring UI removed — knob-tip only while touching.
- Audio: constant wind-bed hiss retired (windG → 0, leaves ÷3); explore score softened (no percussion, bpm 50, pad 0.42); new `speciesCall` voices (rabbit/fox/goat/deer/reindeer/elk) fire by proximity with per-species cooldowns; `birdPeep` for the flock.
- Birds: 7-strong flock — fly / perch on trees (ch.solids crowns) / ground-peck state machine, flee within 11 m of the wolf, peep near the player. Verified: 4 perched · 2 feeding · 1 flying, 0 errors.
- Gates: ai 15/15 · audio ALL PASS ×3 · quest 32/32 · layout ✓ · touch ✓ (incl. new joystick UX). Live: c9f5b18 byte-verified.

### Mission 7.1 — camera territory & first-touch reliability
- Joystick field shrunk to the LEFT 40% (max 420px) — the RIGHT 60% of the screen is pure camera, always.
- Camera first-attempt fixes: ghost-pointer sweep (touchend/touchcancel carry the authoritative finger list — a swallowed pointerup can no longer leave a stale pinch partner that killed the next swipe), reused-id cleanup, setPointerCapture on the renderer canvas (swipes hold even when they slide over HUD elements), and #btns container pointer-events: none so the GAPS between action buttons fall through to the camera.
- Verified (test/cam_touch_probe.mjs, 10/10): 60/40 split · immediate rotation on first touch at 70% width · ghost planted→swept→next touch rotates · button-gap fall-through · joystick intact in left 40% · just past the boundary = camera · 0 page errors. Touch suite PASS (0 timeouts), ai 15/15. Live: 1d7e2de byte-verified.

### Mission 7.2 — the score speaks, the hiss dies
- **Why the music seemed absent:** it WAS playing — at bus gain 0.3 a pad note peaked ≈0.01 amplitude, quieter than a bird chirp, buried under ambience. Bus now 0.85; pad voices 0.24/0.16/0.12 → pad peak ≈0.05, ~5× audibility. Verified scheduling ahead (notes genuinely queued), ctx running on first touch (global pointerdown wake).
- **Why the hiss persisted:** the leaf bed hissed in fair weather (bandpass noise 0.004–0.024) and the river bed hissed near water. Now: leaves silent below wind 0.45 (whisper only in storms, 0.0012), river lowpassed 520→330 Hz at 35% gain (murmur), surf halved. Fair-weather probe: leaf 0 · wind 0 · shore 0 · river 0.004.
- **Soothing pass:** bpm 44 explore, pad-centric mix (0.5), melody sparse (0.3) with long gentle notes (2.0 s, softer), reverb space opened (0.28 day / 0.40 night). Probe: bus 0.85 · pad 0.45 · bpm 44 · scheduling true.
- Gates: audio ALL PASS · ai 15/15. Live: 325ae93 byte-verified.

### Mission 9 — the signature tune & the guiding arrow
- **The tune:** A minor AABA' lullaby (16-beat phrases over Am–Am–F–Am drones) on a new soft plucked 'guitar' voice (pick transient + warm saw/triangle body, cycle-free), 0.26 melody lead, night −2 semis, bells sparkle on mystical events. Deterministic leitmotif across ALL biomes — the pads keep local character underneath.
- **KS lesson:** first attempt used a Karplus-Strong feedback loop — WebAudio cycle semantics made it exponentially unstable (peak 10³¹, rail-to-rail square = the 'hissing' the earlier probes kept measuring). Replaced with a cycle-free voice; master DynamicsCompressor limiter added as a permanent ear-safety ceiling.
- **Arrow:** ×1.8 longer, depthTest:false + renderOrder 999 — no hill, tree or wall hides it; still faint (breathing ~0.19).
- Verified: full phrase event-trace (A4…A5 + A2 drone + F2=92 Hz turn), score peak 0.11 vs 0.062 ambient floor, no rail; arrow props all asserted; audio ALL PASS · ai 15/15. Live: 970b5bd.

### Mission 10 — the full quest board, true eyes, glass-smooth steering
- **Quest board:** refillQuests now stocks EIGHT deeds spanning every kind (survive/hunt×species/explore×2/collect×2/rival). The mystery solved: the board held only 3 and the bot consumed them in seconds — offers the player never saw. Verified: 8 unique cards, all kinds, board refills after accepts and stays full through bot churn.
- **TRUE EYES:** corridor steering — clearance sampled every 1.2 m against every trunk/boulder (positions+radii) with wolf shoulder width 0.85 m, lookahead scales with speed (7+speed×1.5, ≤34 m), committed overtake side (2.5 s) kills dither. A/B same seed 260 s: tree-crash hp-loss 1.39 → 0.52 per 100 m while traveling farther.
- **GLIDING CAMERA:** per-frame steer glider replaces the 150 ms camYaw lurch (aim() now sets a target; rAF eases toward it, rate-scaled; calm unstick). A/B: mean yaw step 0.142 → 0.037 rad/frame, p95 1.016 → 0.066 rad (15×), lurches 151 → 0.
- **CRITICAL regression caught by quest.test:** the mission-8 window-level camera claim was stealing EVERY UI click not on the control list (quest tabs died: pointer capture redirected mouseup → click retargeted to BODY). Fixed: the camera claims only raw-world targets (canvas/body/html/#hud) — tabs, cards, overlays, buttons always keep their clicks. quest 32/32 (real page.clicks), realpath matrix intact, ai 15/15. (touch suite: known env flake again — see BUGS.md; mechanic proven separately.)
- Live: cdee9ad byte-verified.

### Mission 11 — the arrow that answers the ground
- The guide arrow now SAMPLES the world it lies on: 5 terrain points around the wolf, shaded through the exact mesh pipeline (groundColor + biomeWeights + climateAt + slope), multiplied by live sun.intensity (night dims even snow — effective luminance is what matters).
- Adaptive fill with hysteresis (flip >0.47 / <0.37, resample 4×/s, color glide k=7): bright ground → DEEP EMBER HSL(.07,.88,.27) lum 0.28 (snow/sand/sun-grass); dark ground → LUMINOUS GOLD HSL(.10,.95,.62) lum 0.72 (night/spruce/peat). A near-black underlay halo (0x140d06, op ~.55, renderOrder 998, slightly oversized) guarantees contrast even at the seam. Fill opacity raised 0.14–0.21 → 0.36–0.49 breathing.
- Verified live by teleport: bright patch (raw .65) → mode dark, contrast 0.30 + halo; darkest patch (raw .28, eff .31) → bright gold, contrast 0.42, converged; palette lums 0.28/0.72; sweep worst outside seam 0.31; quest 32/32, ai 15/15. Live: 357f17a byte-verified.

### Mission 12 — the arrow that never collapses
- Root cause #2 of 'vanishing': the arrow was a FLAT ground decal — whenever the camera swung toward the horizon the projection collapsed edge-on (measured 37 px at 10° elevation). No color survives that.
- Fix: PARTIAL BILLBOARD — heading stays locked to the quest bearing (rotation.y), but the plane tips toward the camera (rotation.x = −clamp(atan2(camΔy, camΔhorizontal), 24°..72°), order YXZ), floating at ground+0.55. Projected length measured across 10°/25°/40°/60° cameras: 116/127/187/236 px vs flat 37/67/104/153 (gain 1.5–3.2×).
- Darker still (asked twice): ember L .27→.21 (sat .92, hue .068), gold L .62→.54 (luma .72→.67), halo 0x0d0803 op .62 scale 1.24. Terrain sampling + hysteresis + glide unchanged from M11.
- quest 32/32, ai 15/15. Live: 7179799 byte-verified.

### Mission 13 — the arrow that commits
- **Bug (wandering arrow):** questGuide() re-decided EVERY call — nearest animal (they roam), a peak-scan whose sample points shifted as the wolf walked, quest-to-quest flip-flops, and a rotating 30 s biome cache. Worse: the hunt matcher compared an.sp.label ('Deer') to q.species ('deer' key) — NEVER matched, so hunt arrows always rode the rotating biome cache.
- **Fix: COMMITTED LOCK.** Decision pass (nearest reachable candidate across active quests) runs only when unlocked; the chosen place is locked (qid/x/z/label + live refs an/pk/rv/lm) and held until: quest gone, target dead/gathered/found, or arrival <9 m at a fixed place. Moving quarry (hunt/rival): the lock tracks THAT specific animal each call. Arrow hidden <10 m gives a clean handoff to the next decision.
- **Bug (arrow under the wolf):** shaft began 0.9 m BEHIND the wolf's center and depthTest:false meant nothing could occlude it — it drew through/under the body. Fix: origin moved to wolf + bearing×1.45 (tail sits 0.28 m ahead of center, tucked at the chest) — it now pours out from beneath the wolf, never behind it.
- Verified: 10 walking samples → identical target; quarry bolts 40 m → follows the same animal; quarry dies → re-locks next individual; tail measured ahead of center. quest 32/32, ai 15/15. Live: ee0c829 byte-verified.

### Mission 14 — the disciplined deeder
- **One deed at a time, in rhythm:** the bot now runs a fixed cycle small→small→small→medium→medium→big (repeat). questSize() added to the game contract: survive=big; explore/rival=medium; hunt n≥4 / collect n≥5 = medium, else small. keepQuestsFilled rewritten as a sequencer: committed deed held until it leaves active (completion), max 1 active, missing weight substitutes nearest and keeps the rhythm (logged 'quest-substitute').
- **The churn is dead:** five routine abandon paths (hunt-fails, lm-unreachable ×2, grind ×2, 5-min stall) now LOG AND PERSIST — the deed stands. Only exits: completion, or a 12-minute flatline (no progress AND no approach-distance gain, survive-kind exempt) — one honest escape for impossible deeds. The impossible-deed guard (landmark type nonexistent) remains.
- Verified: driven cycle sizes small/small/small/medium/medium/big with step counter 1..6/6, maxActive=1 across the whole session, zero abandons; 100 s natural window: natural completion then next-in-rhythm acceptance (step 2 small). ai 15/15, quest 32/32. Live: f55edcf byte-verified.

### Mission 15 — workspace cleanup
- Full-source sync f2f0b78 (103 files; caught src/ being 2 missions stale in the repo) + fresh-clone byte-verification of every tracked file (9 shots diffs = regenerable captures by design, repo copies canonical).
- Workspace stripped to the ungettable minimum: .ghtoken + RESTORE.md. Everything else re-fetched from the repo on demand. Sandbox freed ~892 MB (.cache/.npm/node_modules + re-fetchable work files).

### Mission 16 — the arrow that drapes over the land
- Rebuilt as SIX articulated slices (4 shaft + chevron head in 2) sharing adaptive fill+halo materials: every VERTEX is dropped onto heightAt() terrain each frame (MeshBasicMaterial → no normals needed) — TRUE ground attachment on any slope/brow/cliff. Measured: max gap 0.26 m rolling / median 0.06 m; on a 64° cliff face median 0.064 m (one halo corner bridges a fold at 1.3 m — cosmetic, behind the fill).
- Never through the wolf: the whole drawn span (halo included) starts at 2.35 m along the bearing — min planar clearance 1.15 m = the body radius; the arrow pours out from underneath the chest/nose, hugs the ground to the goal. M12 partial billboard retired (superseded by the ground-attachment requirement).
- Probe lessons recorded: transformed-point sampling cannot see vertex-buffer draping; halo twins must be transformed by the child matrixWorld alone; outline sweeps must sample real geometry, not phantom rectangles.
- quest 32/32, ai 15/15. Live: byte-verified.

### Mission 17 — one line, under the wolf
- REBUILT as ONE continuous ribbon: 8 shaft cross-sections (every 0.4 m) + the chevron head fanned from the shaft last edge — single geometry, watertight, no halo (the halo caused joint notches). Every vertex draped onto heightAt() per frame: 66/66 verts max gap 0.06 m (the designed offset).
- TWO-PASS SELECTIVE OCCLUSION: pass 2 renders arrowScene after clearDepth() — its depth buffer holds ONLY a wolf-silhouette occluder (colorWrite:false sphere at wolf.model). Arrow now depthTest:true: the WOLF overlaps it (tail tucked at 1.05 m, hidden under the body, emerging at the silhouette = from underneath), while terrain/trees/walls can never occlude (their depth is cleared). Render hook added at both render sites.
- Pixel-level proof: arrow painted magenta, top-down centerline walk 1.55..4.90 m — 28/28 samples painted (one stretched unbroken line); low camera behind wolf: tail-under-body HIDDEN, shaft-beyond VISIBLE.
- quest 32/32, ai 15/15 (one stale-chromium hang, clean rerun). Live: byte-verified.
### Mission 18 — the XP engine: strength earned, strength lost
- Levels begin at 0. Curve xpNeed(L)=round(70*1.24^L) — strictly escalating, NO cap (L50 needs 3.28M XP): always a new record.
- Per level (recomputed FROM the level, so death can take it back): sprint pool +5% (maxStam=100*(1+.05L), unbounded), damage taken x0.982^L (-1.8%/level compounding — always less, never zero), +8 maxHp. Congratulations toast + lvCard show exact cumulative percents: "CONGRATULATIONS! Level N — damage taken -X.X% | sprint stamina +X%".
- XP BAR above hp/stamina bars (#xpWrap top:48, gold gradient, per-frame width). All stamina clamps honor maxStam (regen, fly, drink, landmark, idle); stam bar percent scales by maxStam.
- DEATH RESETS: wolfRespawn -> level 0, xp 0, stats 100/100, bar 0, toast "your levels are lost". Quest perks kept (quest rewards, not levels).
- Verified: boot L0/70XP; bar 48px above stam 60px; addXp(70)->L1 exact message; DR 10->8.806 at L7 (exact); pool clamp 135, sprint 9.0s; death->full reset. quest 32/32 (curve assertion updated), ai 15/15 (one stale-chromium flake). Live: 4fcc2e1.

### Mission 19 — the XP bar no longer rides the quest button
- The M18 XP bar (top:48) slid under #questBtn (y 14-54). Left column re-flowed: questBtn 14-54 · xpWrap 58 · stamWrap 70 · hpWrap 82 · questTracker 98 (media variants too). Verified by rect probe: zero overlaps anywhere in the stack, 4px button-to-bar gap, order preserved (xp above stam above hp).
- quest 32/32. Live: ff3662b byte-verified.

### Mission 20 — the bars speak their purpose
- Minimalist inline-SVG icons at the left of each bar (13px, drop-shadow, pointer-events:none so they can never steal camera swipes): gold STAR at the XP bar, teal RUNNER (head + leaning torso + stride) at the stamina bar, red HEART at the health bar. Bars shifted to left:34 (mobile too); icons vertically centered on each bar.
- Verified: rect probe (each icon left of its bar, centered +/-3px, no overlaps) + pixel proof (each icon paints its signature color in its box: 23%/15%/30% fill). quest 32/32. Live: byte-verified.
