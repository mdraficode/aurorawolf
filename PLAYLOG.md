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

### Mission 21 — badges that speak, bars that breathe
- Icons grew 13 -> 38px and now carry LIVE status inside: ❤ heart shows HP % (white), 🏃 runner shows stamina % (over its watermark strokes), ⭐ star shows the LEVEL (dark on gold, auto-shrinks 12->9px past 2 digits). Text updated per frame with change-guards in updateHUD.
- Bars re-flowed with real air: row pitch 30px (xp 71 / stam 99 / hp 130) -> 23px clear gaps between bars; badges at left:16 centered on each bar, bars at left:60 width 156 (mobile 126); tracker to 150. Badge probe: gaps 23/23, no overlap with the quest button, badges left of bars, centered +/-6px.
- Verified: live values (hp 100->70 incl. level-up +8 & regen, stam 100->50, level 0->1 -> instant on set 55); pixel cores of all three texts found (338 dark in star, 218 pink-white in heart, 81 warm-white in runner). Probe env note: headless rAF throttles to ~4Hz — per-frame code verified via 100ms-poll reads.
- quest 32/32. Live: byte-verified.

### Mission 22 — the stamina badge becomes the wolf
- Reference image decoded programmatically (no vision: alpha/luminance ASCII renderings at 36/48/64 cols): a galloping quadruped facing right — head block + snout, stretched diagonal body, legs in stride, speed streaks behind, ground line under.
- New stamina icon: a minimalist SPRINGING WOLF in the game's stroke style (teal #7ef0c0): body arc + snout + ear, four gallop legs, streaming tail, two speed lines, two ground lines. First attempt (filled 20-point polygon) read as a blob at 38px — redrawn bold stroke-based, legibility verified by ASCII-reading the rendered badge (body/head/3 leg groups clearly separable).
- Stamina number REMOVED (per request): stamPct span deleted + its update line; heart % and star level remain.
- quest 32/32. Live: byte-verified.

### Mission 23 — the stamina icon IS the reference
- The M22 freehand wolf was judged wrong. Rigorous re-read of uploads/image-1.png: connected-component decomposition (34 comps) + magnified region renders — head blob, thick diagonal torso, bent limbs, a leg extended along a skid-line, speed streaks, ground line. Verdict: too specific to redraw.
- Exact-match approach: the reference bitmap itself is now the icon — darkness->alpha extraction, recolored solid teal #7ef0c0, 96x96 optimized PNG (8.4KB) embedded as a base64 data URI in #icoRun (img, not svg). Shape match VERIFIED by IoU 0.936 between the embedded PNG's alpha and the reference mask (48x48, diffs = anti-alias edges only). DOM: svg gone, no stamina text, heart%/star level intact.
- Probe lessons: pixel-threshold masks of a transparent badge over the live world catch background pixels (bogus 0.32 IoU) — compare the embedded asset's alpha in-page instead; ESM has no require().
- quest 32/32. Live: byte-verified.

### Mission 24 — the column breathes
- Stamina wolf scaled to 88 percent (30px figure) inside its badge — matching the heart/star visual span (the tight-cropped bitmap presented larger than the vector shapes).
- Badges 38 -> 34px on a 37px pitch: a true 3px gap between all three icons (they overlapped 8px before — badge boxes touched). Bars re-centered (xp 70 / stam 105 / hp 142, gaps 30/29 kept), tracker to 160, mobile variants synced.
- Verified: gaps 3/3px, no icon-icon or button overlap, wolf img 30px centered, bars centered +/-2.5px, tracker clear. quest 32/32. Live: byte-verified.

### Mission 25 — the final 2px
- Icon gaps tightened 3px -> 2px (badge pitch 37 -> 36: xp 55 / run 91 / hp 127). Bars re-centered (stam 104, hp 141), tracker 158, mobile synced.
- Verified: gaps exactly 2/2px, zero overlaps, wolf 30px, bars centered +/-2.5px, bar air 29px kept. quest 32/32. Live: byte-verified.

### Mission 26 — the 1px seam
- Icon gaps 2px -> 1px (pitch 35: xp 55 / run 90 / hp 125), bars re-centered (stam 103, hp 140), tracker 157, mobile synced. Verified: 1/1px seams, zero overlap, bars centered. quest 32/32. Live: byte-verified.

### Mission 27 — the button row finds its order
- Quest button moved from the top-left corner into the minimap-side row. Final order left-to-right: [Satchel invBtn right:258] [Quest questBtn right:212] [AI btnAI right:166 — the end, at the minimap's side] [minimap]. Touch variants reordered too (btnAI end, quest middle, satchel left-most in both breakpoints).
- Verified: rects 202-242 / 248-288 / 294-334 / minimap 344-484, all top:56, gaps 6/6/10px, zero overlaps, top-left corner freed; quest suite 32/32 with real clicks on the relocated button. Probe note: btnAI read 0-rect once at 1.5s after boot (transient) — settled state verified at 3s.
- Live: byte-verified.

### Mission 28 — both corners claimed
- Status column raised into the freed upper-left corner (badges 14/49/84, bars 29/62/98, tracker 114 — the full stack now starts at the very top like the old quest button did).
- Minimap raised to the upper-right corner (top 56 -> 14) with its button row rising in step (inv/quest/AI top 14, order unchanged: satchel, quest, AI at the minimap's side). Touch layouts untouched — they are pinned around tPause at top:62 right:14 and were tuned for it.
- Verified at 900x560: first badge top 14 (corner filled), 1px seams kept, tracker clear; minimap top 14 / right 16, row aligned and ordered, AI->map gap 10; no cross-corner collisions; bars centered. quest 32/32. Live: byte-verified.

### Mission 29 — the map claims its corner, the buttons orbit it
- Seed/FPS readout (#topStats + its updaters ui.seed/ui.pos) REMOVED completely; minimap now owns the true upper-right corner (top 14, right 16).
- The four buttons — Satchel, Quest, AI, PAUSE — are round satellites on the minimap's lower-left periphery, following the curvature: angles 12/38/64/90 deg (west to south) at radius 100 from the ring's center, percentage-positioned inside #mmOrbit (which mirrors the minimap at every breakpoint incl. touch) — the arc scales with the map. Pause joined the cluster and is now always visible.
- Two fights worth remembering: (1) axis-aligned squares on a diagonal arc interpenetrate at their CORNERS — solved by round buttons (echo the round map) + radius 100 => honest 3px disc gaps; (2) Playwright content-quads misreport under translate(-50%,-50%) — clicks 'intercepted by canvas' while elementFromPoint said otherwise — solved by margin-centering (-20px) instead of transforms.
- Verified: stats gone, map rect top14/right16, arc order+d radii exact, minDiscGap 3px, pause visible, real click opens log; quest 32/32, ai 15/15. Live: byte-verified.

### Mission 30 — the map truly in the corner, with room to breathe
- The report 'not in the corner' was the TOUCH layout: phones kept the map at top:112 (below the old pause spot) while desktop already sat at 14/16. Now: map top 14 right 14-16 on ALL layouts (desktop 140px, touch 118, small-landscape 84). Portrait still hides the map by design (rotate gate).
- Space added: orbit radius 100 -> 118 px-equivalent, spread 8/36/64/92 deg via CSS custom props (--mx/--my per satellite, --orb per breakpoint) — desktop gaps 17px button-to-button / 27px to the ring; phone-landscape 10.6 / 30.2 (32px buttons there, --orb 105%%).
- The weather/clock/biome pills step aside on touch (topbar -> top:188 left:16, below the status column) so the corner belongs to the map alone.
- Near-disaster caught: an unterminated CSS comment from a string-juggling slip was silently swallowing every rule below it — fixed before shipping.
- Verified across 900x560 desktop / 390x844 portrait(gate) / 800x390 touch-landscape; quest 32/32 with real clicks. Live: 0fdc4ac byte-verified.

### Mission 31 — the pills return to the upper center
- M30's touch relocation of the weather/clock/biome pills (top:188 left:16) read as 'messed up' — reverted: #topbar is upper-center on EVERY layout (top 14, left 50%%, translateX). Portrait untouched (rotate gate).
- Overlap-proofing the center: under 860px the pills compact (font 10, padding 3/7, per-pill max-width 118 + ellipsis) and the orbit arc pulls to --orb 75%% (105px) — verified clear at 900 desktop (pills 240-660 vs cluster 677), 700 desktop (218-482 vs 490), 800 touch-landscape (268-532 vs 641): centered within 2px, clear of the left column and the map orbit everywhere.
- Lesson: --orb is a % of the 140px box, NOT of radius — 100%% widened the arc (first attempt overlapped worse); 75%% = 105px radius.
- quest 32/32. Live: byte-verified.

### Mission 32 — the attack orbit
- The bottom-right action cluster rebuilt like the minimap orbit: BIG round ATTACK anchor (desktop 120px, touch 100, small-landscape 72) in the lower-right-most corner (14/14 gaps), a little smaller than the minimap (ratio 0.85-0.86 at every breakpoint). The six companions — Gather, Jump, Sprint, Prowl, Howl, Sense — ride the upper-left arch (-14 deg at the left hip to +98 deg past the crown, step 22.4 deg) at radius ~1.18x the box via the same --mx/--my/--orb CSS-var pattern, margin-centered (the quad-honest lesson).
- Two geometry fights: (1) six 42px discs on a 90 deg arc need R>=140px at 17deg spacing (chord math) — solved by widening the span to 112 deg and radius 118%% (min gaps 3.7px touch / 2.6px small); (2) media-query rules lost to body.touch specificity (attack measured BIGGER than the map) — the small-landscape overrides are body.touch-prefixed now.
- #touchUI gate untouched: the cluster stays touch-only (desktop = keyboard), hidden in watch mode (body.aiOn). Bindings by id unchanged; CAM_CTRL still exempts .tbtn so the camera never claims them.
- Verified: landscape 800x390 attack 72 vs map 84 (0.86), corners 14/14, arc ordered -14..98, all inside viewport, clear of the joystick zone; portrait 390x844 attack 100, gaps 3.7. quest 32/32. Live: 91cc3ca byte-verified.

### Mission 33 — the awkward ring filled
- The void between the attack disc and its satellites (47px on phones vs the minimap arrangement's ~30) closed by growing the anchor AND tuning the arc: attack 100->110 (touch), 72->78 (small landscape), 120->132 (latent desktop) — still 0.93x the minimap everywhere; arc radius rebalanced (--orb 107/118/97%%) and the span eased to -20..+104 deg (step 24.8 deg) so the discs never collide (min 3.9-4.5px).
- Gap parity verified: satellite-to-attack 30px small-landscape (minimap 30.2), 31px phones (minimap ~30), 27px desktop-equivalent (minimap 27) — same breathing as the map's arch, by design.
- quest 32/32. Live: byte-verified.

### Mission 34 — the strike disc grows again
- Attack anchor 110->114 (touch), 78->80 (small landscape), 132->136 (latent desktop) — still under the minimap (ratio 0.95-0.97). --orb rebalanced to 108/119/98 percent so the satellite-to-anchor gap stays at 30px (parity with the minimap arch); satellite-to-satellite 4.3-4.8px. Confirmed --orb is % of the FULL #btns box width (the M31 lesson generalized: % vars are of the box, not the radius).
- quest 32/32. Live: byte-verified.

### Mission 35 — the strike disc overtakes the map
- New rule (supersedes 'smaller than the minimap'): the attack anchor is now A BIT BIGGER than the minimap — 120 vs 118 (touch), 86 vs 84 (small landscape), 142 vs 140 (desktop) = ratio 1.02. The arch gap closes 30 -> 27px; satellite spacing unchanged (4.3-4.8px); corner insets 4-7px.
- quest 32/32. Live: byte-verified.

### Mission 36 — equal air all around the strike disc
- The grown attack disc sat 4-7px off the corner edges (looked 'touching'). The whole cluster now floats at the midpoint between the corner and the arch: corner inset 14 -> 37 (touch) / 34 (small landscape) / 38 (latent desktop), making the edge gap EQUAL the arch gap — measured portrait 27 vs 27, landscape 27 vs 26.7. Same space on every side of the button.
- quest 32/32. Live: byte-verified.

### Mission 37 — the claw closes
- Arch drawn closer: satellite-to-attack gap 27 -> 22px (--orb 108->103 touch, 119->112 small-landscape, 98->96 desktop). Whole cluster moved nearer the corner: inset 37 -> 28 (touch) / 34 -> 26 (small) / 38 -> 30 (desktop) — measured edge gaps 18-19px, arch 21.7-22px, near-equal air with the corner snug. All satellites in-viewport, arc order intact.
- quest 32/32. Live: byte-verified.

### Mission 38 — deeper still
- Repeat of M37: arch 22 -> 19px (portrait) / 18.3 (small landscape) via --orb 103->99 / 112->106 (base 96->92); companions trimmed 42->40 and 32->30 so the tighter arc keeps 2.5-2.7px between discs (chord math: gap = 0.429R - disc). Cluster pushed deeper: inset 28->20 (touch) / 26->19 (small) / 30->24 (base) — edge gaps now 10-12px.
- All satellites in-viewport, arc order intact. quest 32/32. Live: byte-verified.

### Mission 39 — one tap, and the wolf keeps going
- TAP-TOGGLE LOCKS on Sprint / Attack / Jump (gather/sense/howl stay momentary): first tap starts the action and it RUNS ITSELF — sprint locked (touch.sprint + wolf.sprintLock persist, re-asserted each frame), attack auto-bites every 150ms (wolf.attack() self-gates on its 0.75s cooldown), jump auto-hops (keys.Space held) — until the next tap stops it. Buttons stay lit (.on) while locked.
- AUTO-REBIRTH sprint: a new Wolf.update line clears 'exhausted' the moment stamina > 1 while the sprint lock is on — after a full drain the wolf sprints again on the smallest refill, exactly as specified.
- Minimap arch fades at rest like the action cluster: #mmOrbit opacity .3 -> 1 on wake (any orbit-button touch or action-button touch wakes both, 2.2s), CSS transition. Probe-env lesson: the software renderer stalls passive CSS transitions (values advance only on forced style recalcs) — the wake sets opacity INLINE for env-proofness; fade-back via the CSS cascade. Cascade states verified: rest .3 / wake inline 1 / auto-clear.
- Verified: all three toggles on/off, persistence after pointerup, exhaustion rebirth (stam 2 -> sprinting, exhausted cleared), attack fires with zero input and falls silent on toggle-off. quest 32/32, ai 15/15. Live: byte-verified.

### Mission 40 — the satchel button learns to close
- Root cause: the toggle code was already correct, but the OPEN inventory's full-screen shade (#invWrap z-56) covered the orbit (z-12), so a second press never reached the button. Fix: #mmOrbit z-index 12 -> 60 (above the shade) — the satchel button is always pressable: press 1 opens, press 2 closes (its own click handler), exactly like the quest button. Shade-tap and the X still close too.
- Verified with REAL playwright clicks (true hit-testing): open -> true, second press -> false, X -> false. quest 32/32. Live: byte-verified.

### Mission 41 — the satchel closes properly; the screen fills
- INVENTORY ROOT CAUSE (real fix): phones dispatch a duplicate/delayed CLICK after the tap's pointerdown — CDP trace showed the pair separated by SECONDS, so any time-guard fails (my first 350ms guard broke tap-1 entirely: open@t, close@t+463). FIX: EVENT-PAIRED toggling — pointerdown toggles and sets sawPtr; the trailing click only acts if its tap never fired pointerdown. One physical tap = exactly one toggle, whatever the browser delays or duplicates. Verified: 4-tap alternation open/close/open/close with 1.2s settle windows; X and shade-tap close too.
- FULLSCREEN TOGGLE: #fsBtn (⛶, 36px round, translucent) appears whenever the game is NOT fullscreen — one tap enters fullscreen (requestFullscreen + webkit fallback; hidden entirely where the API doesn't exist, e.g. iPhone Safari), hides while fullscreen, returns on exit (fullscreenchange listeners + 1s heartbeat). Positioned below the orbit's south pause satellite at every breakpoint (212/190/152) — zero overlaps measured at 900x560, 700x500, 800x390, 680x380.
- quest 32/32 (one transient 31/32, clean twice after), ai 15/15. Live: byte-verified.
