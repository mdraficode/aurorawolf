# 🏆 THE CAMPAIGN — progressive quest chain · legend hierarchy · infinite trophy speedrun

*Design-to-code map for the M-major update (2026-08-31). The open world stays free;
progression is a guided, state-machine quest chain. Ship: `src/p5.js` + patches.*

## 1 · One machine, three layers
- **WORLD** — unchanged: procedural biomes, prey/predators, SkyEagle, ancients (per-biome
  BOSSES still wake by deeds+spirit — side content only, never required by the campaign).
- **CAMPAIGN** (`window.CAMP`, src/p5.js) — the official progression. A linear state machine:
  per Legend = 3 quest stages → scout territory → awaken (altar ritual) → boss fight → story.
  After the 5th Legend → Beast Master (prep → awaken → boss) → **Trophy Tier N** → tier+1 → repeat forever.
- **QUEST BOARD** — the existing engine (QUESTS.avail/active, acceptQuest/completeQuest,
  questEvent, questGuide arrow, quest log UI) is REUSED as-is; `refillQuests()` now feeds it
  from the campaign (3–4 choices only, one active at a time, no random deeds).

## 2 · Choice sets (3–4, converging — no permanent branches)
Each stage offers alternative *routes* to the same progression point:
- Stage 1: Hunt challenge · Explore challenge · Collect challenge · Survive challenge
- Stage 2: Track (discover landmarks) · Hunt medium prey (sometimes timed) · Combat (slay predators) · Collect
- Stage 3 (PREPARATION — teaches what the boss needs): Gather food (meat) · Reach campaign XP target ·
  Rare resources (herbs+mushrooms) · Scout the Legend's territory
- Then: **AWAKEN THE LEGEND** (single objective — travel to the altar, press E, channel) → Boss.
- Beast Master: same shape, harder numbers, its own altar in the Enchanted Grove.

## 3 · Scaling (controlled, data-driven)
- `legends[]` data: leopard/tiger/lion/bear/golden-eagle (+ lion & leopard species added to the
  world as normal predators; each Legend = super-buffed version of the SAME species).
- Tier factor: `hp 1+0.7(t-1) · dmg 1+0.28(t-1) · speed 1+0.05(t-1) · scale 1+0.07(t-1) · xp 1+0.5(t-1)`.
- Legend mechanics (each different): leopard `ambush` (vanish→flank strike) · tiger `fury` (fast,
  lunges, accelerates in phases) · lion `tactics` (paces a ring, pounces) · bear `knockback`
  (huge hits throw you) · eagle `flight` (airborne, only hittable in the dive window) ·
  Beast Master `echo` (teleports, spawns shadow clones, most HP/damage).
- Quest requirements scale by tier (hunt 2+t-1 prey, gates ×1.5^(t-1), etc.).
- Each slain Legend grants one permanent wolf ability (shadowStep → secondWind → thunderCharge →
  winterCoat → springSteps → sandStride).

## 4 · XP / speedrun / trophies
- Campaign XP is its own persistent counter (quest rewards are the primary source; kills/landmarks
  still trickle into wolf XP/levels as before). Prep XP gates reference campaign XP — never wolf
  level (death resets levels, NOT campaign progress).
- Run timer: `now − runStart − pausedMs`. Never resets on death or reload (anti-exploit); only a
  legit Trophy resets it (new tier = new run). Timer keeps counting while playing; pauses only
  while the game is actually paused/menus.
- Trophy record per Beast Master tier: player name, date, tier time, campaign XP, best Legend.
  Personal best per tier (name/date/time). Trophies screen in the Home menu (🏆 TROPHIES) + first-run
  player name prompt.
- Save `revontulet_campaign_v1` (localStorage): name, tier, step, xp, timer, trophies, best,
  territory/altar, active quest descriptor. Autosave on accept/complete/abandon/ritual/legend/crash(milestones).

## 5 · Anti-exploit (spec §27)
- `completeQuest` is now atomic-once (`q._done` flag) — no double XP from double-fires.
- One active quest at a time (accept guard); board offers choices only when none active.
- Abandon = set aside, no XP, same stage re-offered (re-accept spawns a fresh instance; you only
  earn by actually completing).
- Boss HP/state never persisted (reload → ritual again, full boss), timer never rewound.
- Trophy awarded exactly once per tier (tier-guarded), best-time replace only when strictly faster.

## 6 · Files
- `src/p5.js` — the campaign module (all logic + HUD + trophies UI + name + save).
- `src/p3.js` — + `leopard`, + `lion` (with mane), PREDATOR_TABLE (forest/grove/meadow).
- `src/p4.js` — Boss defOverride/onSlain/xp override + new specials + flight; wolfTakeDamage kb;
  completeQuest atomic + CAMP hooks; accept/abandon hooks; refillQuests redirect; questEvent
  'track'/'combat'; questGuide generic waypoint; drawMapOverlays campaign markers; campTick;
  showOverlay menu hook; buildBossModel modelSp; questTick deadlines; one-active rule.
- `src/autopilot.js` — RAFZZER-neutral: questScore + objective branches for new kinds (watch mode
  still plays the campaign; training fitness law untouched).
- `src/style.css`, `build.py`, `package.json`, `test/campaign.test.mjs`.
