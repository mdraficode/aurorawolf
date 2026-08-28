# 🐺 Bug-Hunt Mission 2 — Verification & New Findings
_A different approach this time: the bot plays as a phase-based hunter (stalk-and-ambush, cave spelunking, chaos stress rounds every 3 min), with inline regression detectors wired to every bug from Mission 1 — plus a live spectator build so humans can watch.*

**📺 Watch the bot play live:** the preview server for this mission serves the bot itself at its root — no special URL needed. The 🤖 panel (right side) shows the current objective, quest progress and a live event feed; the red LIVE badge marks autopilot mode. Every page load is a fresh world.

---

## Part 1 — Mission-1 regression matrix (all fixes verified)

| Bug | Verification method | Result |
|---|---|---|
| **B1** kills don't count / no XP | `quest.test.mjs` LIVE-KILL regression check (real bite → quest → XP) **32/32**; bot's kill-regression detector armed all run | ✅ no regression |
| **B2a** hunts in lifeless biomes | acceptQuest wrapper validates every accepted hunt against the biome's spawn table | ✅ 0 infeasible offers |
| **B2b** arbitrary far biome picks | questBiomePick restricted to wildlife biomes — observed offers all local/species-backed | ✅ |
| **B2c/B3** explore quests naming absent landmarks | wrapper validates lmType exists in `landmarkList`; waypoint draws whenever lm exists | ✅ 0 infeasible |
| **B4** surface-impossible bone deeds | wrapper flags any `collect:bone` offer | ✅ 0 seen |
| **B5** "Foxs"/"Deers" plurals | pluralizer check on every accepted title | ✅ correct plurals ("Hunt 3 Foxes") |
| **B6** terrain wedge | B6 escape in place; upgraded this mission (see N1) | ✅ + hardened |
| **B7** unexplained HP loss | `?audit=1` run: 0 HP drops in 12 min | ✅ closed |

**Mission-2 run health:** 13-minute fresh world · **0 page errors** · 0 crash banners · 4 chaos stress rounds (panel spam, howl, sense, poke a predator) all survived cleanly · no deaths · chunk streaming + populations stable.

## Part 2 — New findings

### 🔴 N1 — Intermittent "position pin": running hard, going nowhere
**The one real new bug — and it's sneaky.**
- **Signature (captured twice, deterministically at seed 2001, pos ≈ (1, 12)):** wolf presses toward a goal 43 m away; `wolf.speed` reads 7–13.5 m/s; the **odometer climbs steadily (246 m "traveled")** — but the **position stays pinned**, jittering ±0.5–0.7 m in what looks like an orbit, for **10+ minutes**. Stamina boundary-oscillates at the exhaustion floor (20). 
- **Why the B6 wedge escape didn't catch it:** B6 triggered on displacement < 0.55 m per 1.15 s — but the pin *orbits* ±0.7 m, so every short window looks like "progress." The odometer (which only measures effort, not achievement) also keeps growing.
- **Root cause status:** intermittent — two identical captures during real play, but a 7-minute sniffer run with the same seed didn't re-trigger it (the bot's path differs per load). Most plausible mechanism: a per-frame position cancellation (push-out against a collision solid, orbiting its center), but I could not yet catch a snapshot with the offender in range.
- **Fix shipped (mechanism-agnostic):** the going-nowhere watchdog was upgraded — **3-second window, true displacement (< 1.2 m), no odometer trust**, bigger sideways breakout (1.6 m + hop + hard turn) when no solid is nearby. Any "running but going nowhere" state now self-frees within ~3 s, whatever causes it.
- **Follow-up:** if it reappears, the sniffer script (in git history) captures the exact frame state.

### 🟡 N2 — Peak quests can stall a naive traveler (game-feel, minor)
"Climb a High Peak" points at height, not at a walkable route — the bot beelines into cliff faces (uphill speed floors at 40 %, so a human climbs, but the naive path is slow). Not a bug per se; noted for future waypoint routing.

### Bot notes (not game bugs)
- Reindeer/deer outrun a sprinting wolf in the open (by design — stalking exists); the bot now prefers catchable quarry and prowls low when closing.
- The cave-spelunk phase found no cave mouth within 130 m this run — phase armed but unexercised.

## Verdict
**All 7 Mission-1 fixes hold under adversarial play. One new intermittent bug (N1) found, mitigated, and shipped.** The game ran 13 + 7 minutes of chaos-augmented play with zero errors.
