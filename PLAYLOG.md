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
