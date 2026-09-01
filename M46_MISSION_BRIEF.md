# 📋 M46 MISSION BRIEF — RAFZZER: The Next Lineage
*Status: locked after Q&A with the trainer. 2026-08-30. Supersedes the "next steps" section of NEXT_DEV.md (which remains as history).*

## 🎯 Mission statement
Continue the RAFZZER neural-AI program exactly as commissioned: **every generation is a bug-hunt run**, every mutant is **verified before it advances**, and the **trainer (me) decides promote/reject with evidence**. This batch = fix the known game bug family → evolve a new trait → verify the lineage holds.

## ✅ Locked decisions (from trainer Q&A)
| Question | Decision |
|---|---|
| How to judge "better" | **Law v3 unchanged** (fitness = 14·lvl + 0.05·xp + kills + predators + quests + landmarks + legends + 0.08·durS + XP-rate + quest-rate + qFast − death pen − own-misbehavior). **Plus new WATCH METRICS** (not scored, reported every gen): bosses awake/slain, legend-arc progress, deaths by cause (bear share), scar history, per-quest-type stalls, quest-type mix, xp/min vs q/min trend |
| Verification | **Agent-decides with evidence** — I run the gate (110 s behavioral shakedown), show the report, and make the promote/reject call. Trainer may always override. No faulty trait passes; if a mutant misbehaves or a glitch is found, fix before advancing |
| Cadence | **Batch: GEN 27 → 31**, one generation per step, stop immediately on gate 3-strike, tripwire, or anything needing a human call |
| First target | **Gather-stall fix first** (game bug), then re-prove GEN 9, then **bear-aware scar** for GEN 27 |
| Reporting | **In-chat narrative reports** with evidence at each step (gate checks, run outcome, fitness, metrics) |
| Publishing | **Collect across the batch** — bake the best champion once at the end (no incremental live publishes) |

## 🗺️ Phase plan

### Phase 0 — Provenance & environment checks *(no code changes, ~15 min)*
1. Repo clean at `41597df`; `git log` shows the full recovery + cleanup
2. `npm install` (playwright 1.55 — wiped at session boundaries, expected)
3. Rebuild from `src/` → byte-identical to shipped `index.html` (sanity)
4. `node test/rafzzer_gens.mjs status` → lineage: 48 entries, champion **GEN 9 · fit 283**
5. **Replay GEN 9** (gate + a capped run) → confirm harness reproduces ≈283: *"everything in order from the last training session"* ✓
6. Full `npm test` game gate → green baseline
7. Outcome report to trainer; **start Phase 1 only after sign-off**

### Phase 1 — Gather-stall fix (game code, benefits humans too)
Root causes documented from the M44/M45 records:
- **No feasibility probe at offer time** — `genQuest` (src/p4.js:2676) offers "Gather N mushrooms" without checking N pickups exist nearby (family of the fixed peak-quest bug; M45 lead)
- **Reachability** — gen22: "Gather 6 lingonberries" stuck 12 min at 0/6 (`doorstep-perimeter no way in from here` → loop-break → flatline)
- **Detector false alarms** — gen5: 5-min stall clock survives a death+respawn teleport; gen11: fires while the wolf is legitimately traveling 100+ m to the next pickup (collected wood 7 s later)

Fix (in `src/p4.js` + `src/autopilot.js`): offer-time resource probe with fallback to another deed · reachability guard for pickup goals · reset stall clock on death/respawn · travel-tolerant stall detection (progress-on-approach).
Verify: targeted probe script + full `npm test` + gather-shakedown run; target **0** false `bug-quest-stalled`.

### Phase 2 — Bear-aware scar + evolution batch GEN 27–31
1. Add bear-specific sensing to cortex inputs + a brainstem rule (avoid high-level ursines while exhausted) — guarded so the clamping SAFK envelope still applies
2. Batch loop per generation: `spawn → gate → run (480 s cap, lineage seed 7777) → verdict`, re-rolling up to 3 gate attempts
3. Narrative report per generation with WATCH METRICS; stop on tripwire/gate 3-strike

### Phase 3 — Verdict & bake *(end of batch)*
- Review the batch; only a champion that **cleanly out-scores 283** gets crowned
- Bake as new `RAFZZER_SEED` (dual-comment history like before), `npm test` green, `index.html` byte-check
- Show summary → publish once as **M46** to the live link (per standing rule: live link only; publish held for trainer's OK if requested)

## 📐 Guardrails
- The game's shipped `index.html` stays **byte-identical until the final bake** — the whole batch runs against the same world as M45
- Fitness law and gate checks are identical in-page and in-harness (single ruler)
- No trait may make a wolf suicidal or inert (SAFK clamp + gate `livingMind` check)
- Every generation's state is committed to git (`rafzzer_lineage.json` etc.) so nothing can be lost again

## ⚠️ Environment note
Headless SwiftShader runs ~12% real-time; the `?speed=8&rate=3` boost gives each 480-sim-s generation ≈ 2 wall-min. That bounds each run to a short open-world day — generation is honest but small-scale; hardware acceleration or multi-core parallel gens is a *future* phase, out of scope now.

## ⏭️ Proposed
Codename for the chapter: **M46 · "The Next Lineage"**. Ready to begin at Phase 0, pending trainer go.
