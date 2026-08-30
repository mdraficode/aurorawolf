#!/usr/bin/env bash
# M46 per-generation driver: traitglobal ×2 attempts, then trait ×2, then STOP (brief cadence).
# usage: bash test/m46_step.sh <gen>
set -u
cd /home/user/aurorawolf
G=${1:?gen}
for MODE in traitglobal trait; do
  for A in 1 2; do
    node test/rafzzer_gens.mjs spawn "$G" "$A" "$MODE" > /dev/null 2>&1
    if node test/rafzzer_gens.mjs gate "$G" > "test/log_gate_gen$G.log" 2>&1; then
      echo "GEN $G: gate PASS via $MODE attempt $A"
      grep "moved" "test/log_gate_gen$G.log" | tail -1
      node test/rafzzer_gens.mjs run "$G" 480 > "test/log_run_gen$G.log" 2>&1
      tail -2 "test/log_run_gen$G.log"
      exit 0
    fi
    echo "GEN $G: $MODE attempt $A gate FAIL"
  done
done
echo "GEN $G: all attempts failed — STOPPING per brief cadence"
exit 3
