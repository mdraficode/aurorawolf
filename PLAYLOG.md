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
