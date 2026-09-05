# 🏆 THE TRAINING MANUAL — how to run Aurora Wolf to a Tier Trophy

*Written by the player who ran it, for the player who runs it next.*

This is not documentation. It is a coach's book: what the run is, what the game actually
does under your hands (measured, not remembered), which lines are worth taking, where the
last four sessions bled, and the drills that close the gap. Read §1 and §5 before you sit
down; read the rest when the run hurts.

Everything here was produced **by hand** — real keys, real mouse, no RAFZZER brain, no
autopilot, no `CAMPDBG` shortcuts — from a cleared save at the main menu, with the clock
fast-forwarded so an hour of game time fits in a session.

---

## 1. The rig — how to drive the game at speed

```bash
bash test/browserlab/boot.sh                      # headless Chromium 149 + SwiftShader
node test/speedrun/run.mjs --route=rush --seed=7777 --cap=3600 --speed=8 --rate=3
node test/speedrun/probe_fight.mjs --leg=0 --tier=1 --lvl=12 --wall=90 --sanity=0
node test/speedrun/_aim_fast_probe.mjs            # aim/motor isolation — run this first
```

Boost URL: `index.html?speed=N&rate=R&re=K&autostart=1&quality=low`

> **Starting a run (current menu behaviour):** the home menu's two buttons are *drop-down
> triggers* — `🧭 NEW GAME ▾` opens `▶ Start Game` / `🤖 Watch The Rafzzer the AI Play`, and
> `▶ RESUME GAME ▾` opens `▶ Resume Last Game` / `🤖 Resume Rafzzer the AI Play`. Start Game
> drops into a fresh world at the menu's choice; pressing **P** (or the ⏸ button) pauses to
> the **same** full home menu, and Resume Last Game continues the live run in place. **Any
> touch to the game window goes fullscreen** (browser fullscreen needs a gesture, so the very
> first tap/key after a fresh navigation completes it).

| knob | what it really does | limit |
|---|---|---|
| `speed` | sim steps per batch | `RATE` is clamped to **4** in `src/autopilot.js` — asking for more silently gives you 4 |
| `rate` | batches per wall-second | |
| `re` | render every *n*th batch | `re=10` for headless speed, `re=1` when you need eyes on it |
| `speed=2` | gives **0.1 s** decision granularity | the finest usable tempo for a fight |

### 1.1 THE CADENCE LAW — one decision per batch, or the game lies to you

Polling faster than the boost batch starves the page's main thread. Measured: 2454 polls in
60.7 sim-seconds = 0.025 sim-s per poll, and the sim crawled at **0.87× real**. The eyes
return frozen state, a zigzag averages itself into pure tangent, and bites get rejected by a
cone that was true a quarter-second ago. You will spend an hour debugging a "broken aim
chain" that was never broken.

`probe_fight.mjs` therefore self-tunes: the poll interval is an EMA of measured sim-dt driven
toward `speed × 0.05`. Target **dt/poll ≈ 0.100 s**. If the report prints anything else, the
run is invalid — fix the cadence before you believe a single number in it.

### 1.2 THE YAW-LAG LAW — travel obeys you, the *nose* does not

The wolf's **travel direction** follows the commanded heading (with the aim lead below, to
±0.02 rad). Its **yaw** — and the bite cone tests `wolf.yaw`, not travel — trails a circling
command by ≈ ω/9. Consequences, all measured:

- A heading alternated every 0.2 s is **low-pass filtered into its own mean**. Commanded
  1.12 rad off the bearing-to-Legend → actually travelled 1.56. Commanded 0.77 → travelled
  2.09. Every inward cut became pure tangent (π/2), nose p50 1.77 against a 1.37 cone, and
  60 s of "fighting" produced 15 presses.
- **Hold a heading** for as long as the reason you gave it lasts (the radius band, not the
  poll). Bang-bang the radius between two rings; do not zigzag it.
- **Lead the aim**: measure the wolf's own last-poll displacement, compare it to what you
  asked for, keep an EMA of the shortfall and ask for it up front. That loop is in
  `probe_fight.mjs`; without it nothing below works.
- The bite gate must be judged on the yaw the wolf will have **when the key is processed**,
  which is the yaw from the *previous* poll plus whatever convergence one batch buys. This is
  the same bug class the bot hit in M44 ("bit same tick as camera-aim while body yaw
  mid-turn"); its fix — a body-alignment gate plus a 900 sim-ms cadence — is the discipline
  the fight gate still needs (§5.5, drill 3).

### 1.3 THE 180° LAW

The wolf runs along `camYaw + π`. Not a bug to fix, a fact to aim with: to travel along
bearing β, put the camera at β − π. `human.mjs:aimFast()` already does this, and
`bearingTo(ax,az,bx,bz) = atan2(bx−ax, bz−az)` is **correct** — it has been verified twice
in-fight (camErr 0 on every row). Do not re-suspect it; three sessions have.

---

## 2. The campaign on one page

`src/p5.js` — `window.CAMP`. Six legs, one Legend each, then the Beast Master.

```
q0  →  q1  →  prep × prepNeed  →  awaken  →  BOSS  →  trophy minted, tier++
```

- **LEGENDS**: Leopard · Tiger · Lion · Bear · Eagle · Beast Master.
- **Tier scaling**: `xpMul = 1.5^(t−1)`, hp `×(1+0.7(t−1))`, dmg `×(1+0.28(t−1))`,
  speed `×(1+0.05(t−1))`, scale `×(1+0.07(t−1))`.
- **Prep needed**: `min(3, 2 + floor((t−1)/2))` → tier 1 wants **2** prep deeds.
- **XP gate**: `(260 + leg·45) · xpMul(tier)`.
- **Trophy**: minted by `onLegendSlain`; the tier increments with it. LAW v4 stands —
  *generation success = upper-tier TIER TROPHIES; true success = speed + efficiency to the
  highest tier.* No promote without a trainer verdict at the human gate.

### 2.1 Tier-1 Legend numbers (what you are actually signing up for)

| Legend | hp | dmg | speed | special |
|---|---|---|---|---|
| Leopard | 45 | 14 | 12.5 | **ambush** — every 8 s teleports 6.5 m behind your yaw ±31.5°, next bite ×1.5 (21) and kb ≥ 1.7 |
| Tiger | 62 | 16 | — | fury (lunge 0.62 s) |
| Lion | 74 | 18 | — | tactics (marks the ring, 2.4 s) |
| Bear | 112 | 22 | — | knockback (kb ×2.6, atkCd +0.3) |
| Eagle | 54 | 15 | — | dive — **airborne and invulnerable except in the dive window**, neck 5 rad/s |
| Beast Master | 190 | 26 | — | echo — teleports 12 m, and at phase ≥ 1 breeds up to **3 clones (61 hp / 26 dmg)**. This is the crux fight. |

Phases: `hp < 50 %` → phase 1, `hp < 25 %` → phase 2 (frenzied). Both raise the neck, the
speed and the swing cadence (§5.1).

---

## 3. What you are driving

| | |
|---|---|
| walk / sprint | **7 / 13.5 m/s** (Thunder Charge, now wired: sprint ×1.12) |
| stamina | `100·(1+0.05·L)` → **160 at L12**; drain 15/s (Spring Steps, now wired: ×0.75), regen 11/s, exhaustion clears above 26 |
| sustainable sprint duty | **11/26 ≈ 42 %** — above that you will be exhausted at the worst moment |
| hp | `100 + 8L` → 196 at L12; **regen 3/s, but only after 6 CLEAN seconds** |
| damage taken | `dmgMul = 0.982^L`; knockback `1.1·kbMul` positional; `invulnT = 0.6 s` |
| death | `wolfRespawn` — from level 12 you **lose 1–4 levels**. Death is not a retry, it is a setback |
| bite | `atkCd 0.75 s`, range `3.6 + scale·0.7`, cone `|nose| ≤ 1.37`, and **the cooldown is spent even on a whiff** |
| swim | 4.2 m/s, no stamina regen while swimming |
| prowl (KeyX) | speed ×0.42, `+1` on a behind bite, detection range ×0.45 (×0.22 with Shadow Step) |

**The regen rule is the whole survival game.** A hit every 3 s means *no regen at all*, ever.
You are not trying to out-heal the Legend; you are trying to buy six clean seconds.

---

## 4. The routes, and how they rank

Four lines a human can take (`test/speedrun/run.mjs`). Run each, rank by the **GAME clock**.

| route | the idea | when it wins |
|---|---|---|
| **rush** | deed-minimal: always the cheapest deed, never the XP gate, no pack | when the fight is solved — it is the shortest line to the trophy |
| **iron** | over-level: take the XP gate *and* side errands, heal to full, then fight | while the fight is unsolved — levels buy hp (`100+8L`), stamina and `dmgMul 0.982^L` |
| **pack** | rush line + howl for a bonded pack before every Legend | `PACK.intercept` (p6.js:268): a **bonded** member within 3.6 m absorbs the blow 45 % of the time. A helper, not a solution — and only bonded packs do it |
| **hunt** | meat line: prefer hunt/harvest deeds (kills pay XP *and* meat), fight early | when the seed's deer are close; the deed cost model already prices hunts cheaper for this route |

**Current verdict (honest):** the routes are not rankable yet, because the tier-1 Leopard is
not reliably killable — every route ends in the same fight, and the fight is the open problem
(§5). Until it is closed, **iron** is the only line that finishes at all: the extra levels are
the difference between "dies at 40 s with the Legend on 9 hp" and a win. **Current verdict (2026-09-03, measured):** the fight is CLOSED at L12 with either grammar —
**PARK > band ring > dip grammars (v19-v24, all lose to 5.5-6.5 incoming) > the old sprint ring
(0 damage in 8 real attempts).** The band ring kills 45 hp in 39-56 s at a net -37..-48 of 196;
the park kills in 52 s at a net -18 with incoming 3.34 and the stamina regenerating (floor 113).
At iron L5 the same maths is -41 of 140. The remaining risk is not the ring — it is ARRIVAL:
every real boss-start measured stam 5-16 (the sprint travel drains the tank, and the old top-up
sat AFTER the channel check — dead code on the travel path). Top up before the channel, walk the
last stretch, and the line is: die once, retry on a full tank. Iron at its natural L5 beats the
L8+ / 88% protocol — that was written for the old dagger-bite play; the park needs no over-grind
(an L18 gate is a ~7,000-xp hunt soak = 30+ minutes for nothing).

### 4.1 Terrain rules that decide a fight before it starts

- `collideSolids` (p4.js:1394) is the speed killer in forest: a head-on trunk multiplies
  speed by **0.22**, and a full-speed crash above 10.5 m/s costs **4 hp**. Fight in the open.
- The arena finder in the rig scores clearings; the best found was **14.8 m clear, slope
  0.53, 54.5 m from spawn**. A ring of r ≈ 2.05 m needs ~5 m of clean ground — take it.
- `CHUNK = 64`, `VIEW_R = 3`. A Legend now survives its home chunk unloading (B8) but its
  *landmarks* do not, which is why deeds carry their own waypoint.

---

## 5. Legend combat — the law, the ring, and what is still open

### 5.1 The law, read off the code and confirmed on the trace

`src/p4.js` 3223–3266 (neck, plant, strike, approach) and `src/p3.js` 779–822 (the bite).

| | |
|---|---|
| neck turn | `2.2·(1+0.15·phase)` → **2.20 / 2.53 / 2.86 rad/s** |
| neck during the plant | ×0.18 → 0.40 / 0.46 / 0.51 |
| cycle | `atkCd = 1.25 − 0.15·phase`, then a **0.55 s plant** (growl + dust + rear-back) |
| strike | lands at the **END** of the plant if `dd ≤ reach·1.35` (**4.59 m**) and `dot ≥ 0.2` → **\|gap\| ≤ 1.37 rad** |
| approach | only while `d > 4.0`, straight down the bearing-to-wolf (B10) at `12.5·(1+phase·0.14)` |
| bite price | facing < −0.35 (**\|gap\| > 1.93**) = BEHIND → `(3 + 1 ambush) × 1.5` = **6 hp**; flank **2**; face **1** |
| ambush | a Legend has **no `aware` field** → *every* behind bite on a Legend is an ambush |

Two angles decide everything, and they do not overlap:

```
|gap| ≤ 1.37        its claw lands          (dot ≥ 0.2)
|gap| > 1.93        my bite is worth 6      (behind + ambush ×1.5)
```

**So there is exactly one place worth standing: `|gap| > 1.93`.** Its swing whiffs *and* my
bite triples. Everything below is about living there.

### 5.2 The gap dynamics

With one fixed lap direction, `d(gap)/dt = ω − Ω·sign(gap)`, and `ω = v·sinθ / r` where θ is
the travel angle off the bearing-to-Legend (θ = π/2 is pure tangent, θ = 0 is straight in).

| gait, r = 2.05 | ω | vs the neck |
|---|---|---|
| walk, θ = 1.28 | **3.25** | beats 2.20 / 2.53 / 2.86 — all three phases |
| sprint, θ = 1.45 | **6.5** | clears the 1.37 arc in ~0.3 s |
| **walk, r = 7/neck (2.77-3.18)** | **= the neck** | **the FREEZE: park the gap at dead-behind (fm ≈ −π) → every strike whiffs (dot −1) and walking regens 11/s. The park is the recovery AND the bite platform (v25: 0.22 hits/s, floor 113, kill 52 s)** |

Cycle-average neck rate (what a full 1.8 s cycle really costs): **1.65 / 1.84 / 2.00** for
phases 0/1/2. A walking ring at r ≈ 2.05 beats that everywhere. Stamina for the arc transit
is one ~0.35 s burst per lap: 10 spent, 82 refunded.

### 5.3 What has been tried, and what it taught

| attempt | result | lesson |
|---|---|---|
| tight orbit dance | rig latency ate it | the cadence law (§1.1) came out of this |
| run-by / zigzag v1–v4 | mode stuck, 2–4 dmg, 159–201 dmg taken | a symmetric zigzag is filtered into pure tangent (§1.2) |
| parked blind side v1/v3 | gap mean 0.03 | the Legend used to walk along its own nose → **B10** |
| ring v4 + arena | 2–4 dmg per swing | every bite was a FACE bite → **B10** again |
| ring v5 (walk ring 2.85, lead-angle close) | 80 % press rate, all flank, r > 4.5 for 47 % of polls, sprint 57 %, stam floor 6, 201 dmg → death | the ring was too wide to out-turn the neck, and the sprint bill was unpaid |
| ring v6 pre-B10 | gap mean 0.03, blind side 5 %, 0.14 dps | sim starvation — cadence law |
| v6 post-B10 | 4/8 landed, 0.11 dps, **flee = 449/666 polls (67 %)**, stam floor 1 | the flee was a death spiral, not a safety net |
| v7 (sprint the wind-up, walk the cooldown) | 6 behind bites, 0.30→0.65 dps, dead in 33 s | walking the ring at 2.35 opens the gap at only +0.5 rad/s — 2.7 s to leave the arc, and it swings every 1.8 s |
| v8 (band-hold with reverse taps) | blind side 31 %, 8 presses in 47 s | a reversal is a 2.26 rad yaw flip: nose 1.6–2.1 against a 1.40 cone. **Never reverse** |
| v9 (fixed lap, no reversals) | blind side 61 %, gap mean 1.58, but 6 presses in 60 s | the inward cuts were being filtered away — found the yaw-lag law |
| v10/v11 (held spiral + closed-loop aim lead) | θ commanded vs travelled agrees to **±0.02**, 0.94 dps, Leopard ≈ 48 s | the aim works now; the **bite gate** and the **incoming** do not |
| v18 (balanced peck) | 2/2 landed, 12 dmg, 0.15 dps — survivable, too slow | the 4-cut cycle cadence cannot close a 45 hp boss |
| v19/v20 (dip) | 1-2 presses/run, incoming 3.6-5.5 | dip-in-plant and dip-in-window each plateau at 2 presses |
| v21 (sprint-leg dip) | **4/5 landed, all behind** — the accuracy breakthrough | the sprint orbit wins the turn race (3.5 > 2.2) — but 5 presses/55 s |
| v22/v23 (sprint orbit / phase grammar) | blind 12-49 %, incoming 3.8-6.8 | sprint-first laws drain the tank; the walk laws were what the real fight needed |
| v24 (park, static 7/2.2) | 2/9 landed, blind 23 % | static park radius + arrival overshoot; also silently ran the BASE ring (dispatch bug — see v25 note) |
| **v25 (park v2: r_park = 7/b.turn, walk the last stretch)** | **8 hits (0.22/s — lowest any tac), 0.87 dps, kill 52 s, net −18 of 196, stam floor 113** | **THE WINNER: freeze the gap, regen while orbiting, dip from the park** |
| **the REAL fight (run.mjs, 8 attempts)** | **0 bites, 0 swings; every start at stam 5-16; r pinned 4.2-4.9** | the rig's gauntlet, not the fight: sprint travel drains the tank, the old top-up was dead code after the channel check, the doomed flee ran 2,700 polls. Fix the ARRIVAL first |

### 5.4 Where the run stands (the honest number)

**The fight won every debate on 2026-09-03. Two grammars both close the tier-1 Leopard at
level 12** (probe, `speed=2, ringr=2.05, wall=120`):

```
BAND ring   : 10/14-20 presses, 40-44 dmg, kill 39-56 s, incoming 3.85-3.95
              net -37..-48 of 196 hp — wins every time, but it BLEEDS
PARK (v25)  : 8/18 presses, 32 dmg, kill 52 s, incoming 3.34, hits 0.22/s
              net -18 of 196, stamina floor 113 — the ring REGENERATES
```

**The probe's "incoming − regen → NET LOSING" is a strawman** — it ignores the hp budget. The
real test is `kill_time × (incoming − regen) < wolfHp`; by it v10/v18/v21/v25 all win at L12.

**The real run's failure was never the ring — it was the ARRIVAL.** Every boss-start in the
real game measured stam 5-16 with the wolf pinned at r 4.2-4.9 (an exhausted walk-close loses
12.5 vs 7 m/s, and the boss's body pursues at 12.5 forever — no leash anywhere: the only exits
are the park, the death retry, or losing). Fix: (1) top up BEFORE the channel (the old code
rested after it — dead code on the travel path); (2) the top-up rests clear of predators and
counts clean time; (3) never flee below stam 15 — stand, die, retry on the respawn's full tank
(the game's intended loop: `onDeath` despawns the boss and returns `S.stage = 'awaken'`).

### 5.5 Drills — in this order

1. **Gate on the yaw that will exist, not the yaw you read.** The bite cone tests `wolf.yaw`
   at the moment the key is processed. Require the *previous* poll to have carried the same
   heading command (body alignment, exactly as the M44 bot does) and require
   `nose ≤ 1.05` rather than 1.30 — the lag is worth ~0.3 rad. Expect the press count to fall
   and the landing rate to jump; what matters is 6 hp per 0.75 s, not presses per minute.
2. **Cross the arc early.** The arc transit must be *finished* before the plant ends, so start
   it when the cooldown begins, not when the plant does. Track the cycle locally: `wind` going
   from > 0 to ≤ 0 is the strike — that instant starts 1.25/1.10/0.95 s of safe crossing. If
   the plant catches you inside 1.37, you are already losing; sprint is the only answer and it
   must have been spent 0.3 s earlier.
3. **Peck, don't orbit, for the bite.** Radial motion does not rotate the bearing, so it does
   not feed the yaw lag *and* it does not change the gap. Parked behind at `|gap| > 1.93`, two
   polls of θ ≈ 0.3 settle the nose to ~0.3 and the bite is guaranteed — then pay the radius
   back with one θ ≈ 2.6 poll. Cost: ~1 m of radius per peck. This is the highest-value
   unwritten play in the book.
4. **Respect the ambush.** The Leopard teleports every 8 s to 6.5 m behind your yaw, and the
   next bite is 21 hp. The answer is not distance (it runs 12.5–16 m/s and you walk 7): it is
   the shut-in — θ ≈ 0.5, sprint, thread past it, and let the 1.4 s it needs to turn 180°
   hand you the blind side. `close` mode already does this; it just has to be entered the
   instant `r > 3.95`, not one poll later.
5. **Never flee.** It runs faster than you walk. Fleeing puts it behind you at exactly the
   range where its claw lands, and it costs the six clean seconds your regen needs. Measured:
   flee mode ran 67 % of polls at `|gap|` p50 = 0.00 and took 14 of 19 hits. The parked gap is
   the armour.
6. **Phase 2 tightens the ring.** At 2.86 rad/s the neck beats a walking ring at r = 2.35;
   r0 = 2.05 (or one sprint assist) keeps the margin. Phase 2 is only the last quarter of its
   health, so the stamina bill is short — but it is also the quarter where you are poorest.

7. **THE PARK (the 2026-09-03 winner, drill before anything else).** A walk orbit at
   `r = 7 / neck` turns at exactly the neck rate — the gap FREEZES. Park it at dead-behind
   (fm ≈ −π): every strike whiffs (dot = −1, the arc test is ±1.37 of the nose), every
   walking poll regenerates 11/s, and the same parked gap is the bite platform — dip ~1 m
   in (θ ≈ 0.9, two polls), press with `fm < −0.35` (6 hp ambush), pay the radius back
   (θ ≈ 2.2). Arrival: sprint only while the tail is far (fm > −1.2); walk the last
   stretch — a 5.5 rad/s lap overshoots the 2.4 rad tail window. r_park shifts with the
   phase (`7 / b.turn`, 2.77–3.18 m) — the game's own turn rate is the answer key.
8. **THE ARRIVAL LAW — never channel a trial tired.** Every real boss-start measured
   stam 5–16: the route sprints the whole approach, the old top-up sat after the
   `d < 3.2` channel check (dead code on the actual path), and the arena's wilds ate the
   rest. A human top-up = 40+ clean poll-loops at `stam < 80` BEFORE the channel, walking
   clear of any predator inside 26 m. Below stam 15 there is no recovery outside the park
   (the boss pursues at 12.5 m/s forever — no leash); the game's intended retry is to
   stand, die, and respawn on the full tank — the boss despawns and the stage returns to
   'awaken'. A 2,700-poll doomed flee is not a strategy.
9. **"NET LOSING" is a strawman.** The probe verdict compares incoming − regen without the
   hp budget; the real test is `kill_time × (incoming − regen) < wolfHp`. By it the band
   ring (−37..−48) and the park (−18) both win at L12, and the L5 iron fight wins at −41
   of 140. Rank grammars by that test, never by the headline.

### 5.6 The Eagle and the Beast Master (before you get there)

- **Eagle**: airborne, `invuln = !onGround`, neck **5 rad/s** — no ring on earth out-turns
  that. The window is the dive (`diveCd = diveGap − phase·1.1`). Learn to read the dive and
  bite in it; do not try to orbit it.
- **Beast Master**: 190 hp, and at phase ≥ 1 it breeds up to three 61 hp / 26 dmg clones with
  an echo teleport. The clones die with the Legend (B9) — but not before they have killed you.
  This is why LAW v4 measures *speed and efficiency to the highest tier*, not "a trophy".

### 5.7 The 2026-09-06 additions (fight labs 14–38 — read before touching the fight law)

- **THE BITE-JAM LAW.** The engine's bite picks the CLOSEST live target in the ±78° nose
  cone (`p3.attack()`), and **Bosses are registered in `chunk.predators`** (`p4.js:3144`).
  Two consequences the rig must respect forever: a grazer between wolf and boss eats the
  press (jam sense + atomic strike-time re-check in `H.bite` + grazer-priced arena
  scoring), and any "nearest blocker" scan must exclude Bosses by class or it blocks on
  the target itself.
- **THE RESOLVE LAW.** A bite lands **0.38 s after the press** (`atkT`). Value = geometry
  at RESOLUTION, not at press: `|gap| + gv·0.38 > 1.93` (gv = gap-velocity EMA) — press
  early in a fast-growing sprint leg so it resolves BEHIND (4.5–7.5 dmg with crouch +
  ambush); a press at the gap peak resolves face (1 dmg).
- **The teleport lands the wolf in the boss's FACE** (gap ≈ 0), not at its flank — the
  boss relocates behind the wolf while still heading toward it. The crossing must sprint
  (outside 4 m the boss walks 12.5 vs the wolf's 7).
- **Lap-rate physics: `ω = v·cos(cut)/r`** (cut measured from tangent). r 2.25–2.55 is the
  winning band (walk ω 2.75–3.1 vs neck 2.2); r = 7/neck is only the FREEZE radius; from
  r ≥ 4.6 nothing out-turns the neck (cosθ ≥ 1.06 impossible) — inrush, don't orbit.
- **Speed-8 fights are unwinnable** (0.4 s batches): the router now switches
  `window.__boost.n` 8→2 on boss-stage entry and back (verified). Travel stays fast.
- **Crouch economics**: behind bite (3) + ambush (1) + crouch (1) ×1.5 = **7.5**; stand up
  only AFTER the press; never finish a fight crouched (0.42× speed).
- **Route-entry levels are campaign-gated**: iron/pack/hunt ALL reach the Leopard at L4–5.
  No level lever exists at leg 0 — the kill comes from law + break-offs, not grind.
- Fight reports now dump live (`runs/run_<tag>_live.json` on every forced mark) — a crash
  at cap no longer loses the polls.

---

## 6. Session protocol

1. `bash test/browserlab/boot.sh`, then `_aim_fast_probe.mjs` — if the aim/motor probe fails,
   nothing else you measure today is real.
2. Check the cadence line in every fight report (`dt/poll`, `poll cadence`). Invalid cadence =
   invalid run.
3. Fight in the arena the finder picked, never in trees.
4. One change per run. The reports under `test/speedrun/runs/` (gitignored) are per-run traces
   with `mode/r/gap/nose/θ_want/aimErr/spr/wind/hp` on every poll — diff two runs, don't
   guess.
5. Human gate before every generation; **no promote without a trainer verdict** (LAW v4).
6. Log every play-blocking defect in `BUGS.md` with the measurement that proved it, fix it in
   `src/`, then `python3 build.py` — the run is played against `index.html`, and a fix that
   never reached the bundle never happened.

---

## 7. Bug ledger

`BUGS.md` → **M47 / human-speedrun session (2026-09-02)** for B8 (Legend disposed with its
chunk → campaign softlock), the B8 companion (bites could not see a Legend at all), B9 (a dead
Legend's clones outlived it and locked fast travel), B10 (the Legend fled its own blind side),
the two dead perks (Spring Steps, Thunder Charge), the unnameable fresh save, and the deeds
that lost their destination. All are fixed in `src/` and baked into `index.html`.

**2026-09-03 session (this one):** RIG-side, all in `test/speedrun` (uncommitted): the
top-up AND-bug, the grind-pick ritual bug, the TDZ, the doomed 2,700-poll flee, the dead-code
top-up after the channel check, and the arrival-at-stam-5 problem; GAME-side confirmations:
no-leash pursuit and the arena multi-threat. Full ledger with measurements: `BUGS.md` (§
"RIG-side" + "OPEN"). The old grammars v11–v24 died honest; the park (v25) is the law now.

**Do not re-suspect:** `bearingTo` (correct, verified twice), the input chain (exonerated),
knockback (1.1–2.9 m, not the primary problem), `H.move()` crouch (unsupported — prowl is
`KeyX`). Three sessions burned on each of those.
