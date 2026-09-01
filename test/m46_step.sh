#!/usr/bin/env bash
# M46 · LAW v4 (TROPHY LAW) per-generation driver.
# The whole brain starts from the wild seed under the new law — first try GLOBAL
# (full-brain) ×2; then the proven, gate-safe rows-only trait (new-sense rows
# 18-23, incl. the campaign cortex) ×2; then traitglobal ×2 as diversity
# fallback; then STOP (brief cadence).
# usage: bash test/m46_step.sh <gen> [runCapSec]
set -u
cd /home/user/aurorawolf
G=${1:?gen}
CAP=${2:-${RUN_CAP:-900}}      # LAW v4: a tier-1 trophy needs a long, honest road (~2400+ sim-s)
for MODE in global trait traitglobal; do
  for A in 1 2; do
    node test/rafzzer_gens.mjs spawn "$G" "$A" "$MODE" > /dev/null 2>&1
    if node test/rafzzer_gens.mjs gate "$G" > "test/log_gate_gen$G.log" 2>&1; then
      : # pass — report kept
      echo "GEN $G: gate PASS via $MODE attempt $A"
      grep "moved\|outs-std" "test/log_gate_gen$G.log" | tail -1
      node test/rafzzer_gens.mjs run "$G" "$CAP" > "test/log_run_gen$G.log" 2>&1
      tail -3 "test/log_run_gen$G.log"
      exit 0
    fi
    echo "GEN $G: $MODE attempt $A gate FAIL"
    cp -f "test/rafzzer_gate_gen$G.json" "test/rafzzer_gate_gen${G}_${MODE}${A}.json" 2>/dev/null || true
  done
done
echo "GEN $G: all attempts failed — STOPPING per brief cadence"
exit 3
