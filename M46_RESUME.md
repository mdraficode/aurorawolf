# 🧭 M46 RESUME POINT — PAUSED 2026-08-31 (trainer request)

*Training paused mid-GEN 33 so a major gameplay progress system update can be prepared.
Everything needed to resume exactly here is in this file + git HEAD `(next commit below)`.*

---

## 1 · WHERE WE ARE (one glance)

| item | state |
|---|---|
| Game build | `src/` = latest features (arrow, attack anim, eagle, minimap dots, night message) + M46 Phase 1 gather-stall fixes + **bear-sense polarity fix** (committed `8fed10e`); `index.html` 1131 KB rebuilt & synced to `/home/user/index.html` |
| Live web | previously published at `ee26114` (features only — Phase 1 + sense fixes NOT yet published; publish happens after updates per standing rule) |
| Champion (formal) | GEN 9 · fit **283** (authentic) · 276 weights (zero-pad migrated) · scars fight:1 — **unchanged by the batch** |
| Trait chain | `test/rafzzer_traitchamp.json` — **DELETED (chain reset)**; the old fit-225 chain state was trained on the inverted bear-sense → retired. Chain restarts from zero rows |
| Batch progress | GEN 27 ✅ (fit 145), 28 ✅ (77, chain seeded), 29 ✅ (**225** — best env run; INVERTED-sense era), 30 ✅ (83), 31 ✅ (214), 32 ✅ (−122), 33 ❌ PAUSED — 8 gate attempts all `livingMind` |
| Lineage file | `test/rafzzer_lineage.json` — 56 entries, GEN 33 recorded as `paused` |
| Candidate file | ⚠️ `test/rafzzer_candidate.json` = champion-PROBE (gen 999) — **must be re-spawned before any gate/run** |
| Gate GEN 33 json | `test/rafzzer_gate_gen33.json` = champion-probe result (PASS) — NOT a candidate result |
| Processes | none running; playwright/npm may be wiped at session boundary → reinstall before resuming |
| Git | working tree clean after the pause commit |

## 2 · THE GEN 33 INVESTIGATION (why we stopped — important)

- 4 gate attempts on the pre-fix build + 4 on the fixed build (trait ×2, traitglobal ×2): **ALL failed `livingMind`** (outs-std < 0.008; every other check passed — wolves moved 1400–2200 m, made 6+ decisions, never died).
- **Champion probe on GEN 33's gate world: PASS** (stds 0.019–0.025) → the gate world is NOT quiet; the failures belong to the candidate draws.
- Conclusion (recorded decision): σ=0.15 row-draws on the sense gateway displace hidden operating points enough to flatten the six urges (tanh regions) — 8/8 flat against a ~50% per-draw pass rate is the saturation signature.
- **Planned fix, NOT YET APPLIED**: in `test/rafzzer_gens.mjs` `spawn` trait mode — `sd 0.15 → 0.10`, touch prob `0.8 → 0.6` (gentler displacement of hidden points; still fast vs the 0.08 global floor).
- Also verified earlier: sense-18 polarity bug WAS real and IS fixed (`clamp(1 - bearD/80, 0, 1)`, committed `8fed10e`); champion unaffected (its rows are zero).

## 3 · NEXT STEPS, IN EXACT ORDER (resume here)

1. `cd /home/user/aurorawolf-v2 && npm install && npx playwright install chromium && sudo -n npx playwright install-deps chromium` (env wipe at boundaries).
2. **Apply the softening** to `spawn` trait mode (σ 0.10, touch 0.6) — one-line-ish edit in `test/rafzzer_gens.mjs`.
3. `node test/rafzzer_gens.mjs spawn 33 1 trait` → `gate 33` (up to 3 fresh attempts on the same build; candidates now gentler).
   - IF gate still fails `livingMind` 3×: stop and report — the sense-gateway search space itself may need a rethink (options to weigh with trainer: per-row σ schedule, 1-at-a-time L1-style search, or gate livingMind threshold calibrated on champion's 0.0102–0.025).
4. If gate passes: `run 33 480` → `python3 test/rafzzer_verdict.py 33` (locked bar: promote only if fit > 283) → `node test/rafzzer_gens.mjs traitpromote 33` (chain compounds best env-run).
5. Continue GEN 34–36 to complete the 10-generation session (27–36), same driver: `bash test/m46_step.sh <g>` (trait ×2 → traitglobal ×2 → stop).
6. After the batch: Phase 3 verdict — crown only if a mutant cleanly out-scores 283; **open trainer question**: promote/crown bar vs this env's champion measure (−1/238/131; median 131) — evidence in `test/history/phase0_replay/`.
7. Then per standing rule: push + `bash publish.sh github` after every update (this request does NOT block on user).

## 4 · ENV-WIDE FACTS FOR THE RESUME

- Champion env re-prove (current build, 3 runs): −1 (Rival Wolf @179.7s), **238** (survived cap, L… ), 131 (survived) → median 131 vs authentic 283. Records: `test/history/phase0_replay/replay_run_gen9_r1…`, `…r2_238_cap.json`, `…r3_131_cap.json`, `replay_gate_gen9_pass.json`.
- Phase 1 gather-stall fixes VERIFIED: `test/gather.test.mjs` PASS (0 collect-deed stalls, 0 nopickup, supply contract holds). NI-20 full suite: EXIT=0 (collision/audio in-suite fails = load flake, both PASS standalone).
- Harness commands: `status | spawn <g> [attempt] [global|trait|traitglobal] | traitpromote <g> | gate <g> | run <g> [capSec]`.
- Gate worlds are per-gen (`31337+17g`); run world fixed `7777`; fitness law unchanged.

## 5 · NEXT UP AFTER TRAINING (separate stream — trainer will spec)

**Major gameplay progress system update** — trainer said "get ready"; scope/spec pending in the next message. Standing rules apply: latest game as base, push + publish automatically after each update, APK only on request.
