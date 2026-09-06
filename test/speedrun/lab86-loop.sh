#!/usr/bin/env bash
# labs 86+: FAST PROFILE (speed=8 travel = 4x faster overworld, fights stay n=2;
# rate=4, re=10) — the sandbox chromium dies at ~2 min wall, so faster travel =
# more Tiger fights per life. The Leopard (leg 0) is expected to die each session;
# stop on the TIGER kill or leg 2. Usage: bash test/speedrun/lab86-loop.sh [iters] [tag]
set -u
cd "$(dirname "$0")/../.."
N=${1:-8}
TAG=${2:-parklab82}
for i in $(seq 1 "$N"); do
  pkill -f chrome-lab 2>/dev/null; sleep 1
  LOG="test/speedrun/runs/${TAG}run${i}.log"
  echo "== [$TAG #$i] $(date +%H:%M:%S) ==================" >> "$LOG"
  timeout 300 node test/speedrun/run.mjs --fightlab --route=iron --seed=7777 \
    --cap=240 --speed=8 --rate=10 --re=10 --tag="${TAG}run${i}" >> "$LOG" 2>&1
  # stop on the TIGER kill (leg 1) — the Leopard (leg 0) is expected to die now
  if grep -q 'Tiger Legend","res":"slain' "$LOG" || grep -q '"leg":2' "$LOG"; then
    echo "== TIGER KILL at iteration $i — log: $LOG"
    exit 0
  fi
done
echo "== no kill in $N iterations; logs in test/speedrun/runs/${TAG}run*.log"
