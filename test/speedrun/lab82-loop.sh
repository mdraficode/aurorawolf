#!/usr/bin/env bash
# labs 82+: the sandbox chromium dies at ~2 min wall (the same target-closed noise as
# world/forest tests) — each fightlab session yields 2-3 fights. The lab67-class draw
# (plant-heavy, tp-light, 29% front-share) is ~1-in-5; loop whole sessions until the
# Leopard Legend dies. Usage: bash test/speedrun/lab82-loop.sh [iterations] [tag]
set -u
cd "$(dirname "$0")/../.."
N=${1:-8}
TAG=${2:-parklab82}
for i in $(seq 1 "$N"); do
  pkill -f chrome-lab 2>/dev/null; sleep 1
  LOG="test/speedrun/runs/${TAG}run${i}.log"
  echo "== [$TAG #$i] $(date +%H:%M:%S) ==================" >> "$LOG"
  timeout 300 node test/speedrun/run.mjs --fightlab --route=iron --seed=7777 \
    --cap=240 --speed=2 --rate=3 --re=30 --tag="${TAG}run${i}" >> "$LOG" 2>&1
  if grep -q "res:'slain'\|\"res\":\"slain\"" "$LOG"; then
    echo "== KILL at iteration $i — log: $LOG"
    exit 0
  fi
done
echo "== no kill in $N iterations; logs in test/speedrun/runs/${TAG}run*.log"
