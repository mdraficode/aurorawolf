#!/usr/bin/env bash
# one generation step: spawn (attempt re-rolls optional) -> gate -> run 480s
set -u
cd /home/user/aurorawolf
G=${1:?gen}
A=${2:-1}
node test/rafzzer_gens.mjs spawn "$G" "$A" || exit 1
node test/rafzzer_gens.mjs gate "$G" > "test/log_gate_gen$G.log" 2>&1
RC=$?
if [ $RC -ne 0 ]; then echo "GEN $G GATE FAIL ($RC)"; exit 2; fi
node test/rafzzer_gens.mjs run "$G" 480 > "test/log_run_gen$G.log" 2>&1
echo "GEN $G done"
tail -2 "test/log_run_gen$G.log"
