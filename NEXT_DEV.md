# 🧭 Next development — handoff (2026-08-30)

State after restoring the previous chat's workspace into this repo. **The built game is unchanged**
(rebuild of `src/` is byte-identical to the committed M45 `index.html`); what was added is the
source of truth that was missing on GitHub.

## ✅ Now in the repo (commit `0477475`)

| Item | Where | Note |
|---|---|---|
| True M44/M45 sources | `src/autopilot.js` (+p3/p4/shell/style) | contains the RAFZZER cortex; `python3 build.py` reproduces the shipped `index.html` byte-for-byte |
| Neural harness | `test/rafzzer_gens.mjs` (`status/spawn/gate/run/promote`), `rafzzer_train.sh`, `rafzzer_ship.mjs`, `rafzzer_verdict.py` | lineage seed `7777` · gate seed `31337+17·gen` · runs cap 480 s · σ = max(0.08, 0.16·0.90^g) |
| Lineage | `test/rafzzer_lineage.json` (48 entries), `rafzzer_champion.json` (**GEN 9 · fit 283**), `rafzzer_candidate.json` | 26 run records + 26 gate reports |
| Journal | `RAFZZER.md` | full generational history + both open leads |
| Misc | `BUGS.md` (+M44/M45 entries), playwright 1.55, `ab_probe.mjs`, `pred_levels.mjs` | |

Local-only (never commit, already git-ignored): `~/.ghtoken` (publish), `~/.revontulet.keystore` (APK).
⚠️ Both were inside the uploaded Drive zip — **consider rotating the GitHub token** after this session.

## 🔴 Lead 1 — gather-quest stalls (the "gather-stall")

**Narrowed by BUGS.md M45:** *"quest ground can lack the target resource; same family as the fixed
peak-quest issue. Next: probe gather-goal finder for resource presence before offering."*

Evidence (24-run census):
- **gen22** — "Gather 6 lingonberries … no progress nor approach for 12 minutes; setting it aside":
  bot reached the spot (9–33 m goals) but hit `doorstep-perimeter no way in from here` →
  `loop-break` → `bug-bot-loop (eff 0.24)` → flatlined the quest. **Real stall: resource absent or
  unreachable at the chosen ground.**
- **gen5** — "Gather 3 mushrooms stuck at 1/3" fired *after* a death+respawn teleported the wolf
  far from the site: the 5-min `bug-quest-stalled` clock keeps running across respawn → **false
  positive** (detector should reset `stallT` on death/respawn).
- **gen11** — "Gather 5 sticks stuck at 2/5" fired, then the wolf picked up wood 7 s later →
  detector is too eager for long-distance gather goals (only gates on progress, not travel).

**Fix direction:** (1) `genQuest` probes for the resource before offering a Gather deed (mirror of
the peak-quest probe: search pickups of that type within a radius; fall through to another deed),
(2) reset the stall clock on respawn, (3) don't count pure travel time against gather stalls
(progress-on-approach check), (4) revisit `doorstep-perimeter` + pickup reachability so a
reachable-looking pickup isn't an unenterable hollow.

## 🟠 Lead 2 — bear-cull pattern (GEN 27+ evolution)

9 of 12 lineage deaths are bears (GEN 1/2/4/5/16/21/23/24/25). Proposed by RAFZZER.md: a
**bear-aware scar** — learned avoidance of high-level ursines while exhausted. Mechanically that's
a brainstem/bot tweak (flee-before-engage rule near bears when stamina low) + optionally a new
sense/scar in the cortex. Honest deaths are fine (per the law), but the *pattern* says the lineage
is bleeding fitness to a single predator class.

## 🗺️ Proposed order of work

1. **Push** the restored commit to GitHub (needs `publish.sh github` or a push with the token) —
   so the repo never again loses the sources.
2. **Lead 1 fixes** (gather feasibility probe + stall-clock reset + travel-tolerant detector).
3. **Prove it**: `node test/rafzzer_ship.mjs` (baked-champion shakedown on seed 7777) + a short
   `gate`/`run` of GEN 9 (validates the harness works in this environment).
4. **Lead 2**: bear-aware scar (brainstem + cortex senses) — then `spawn 27 → gate 27 → run 27` and
   let the law v3 fitness ruler decide. Keep watching `bug-quest-stalled` cadence (currently
   ~1 per 5 sim-min on seed 7777; goal: 0).

**Env note:** playwright/chromium caches are wiped at turn boundaries — `npm install` (+ browser
download) is required before any harness run.
