#!/usr/bin/env bash
# labs 86+: FAST PROFILE (speed=8 travel = 4x faster overworld, fights stay n=2;
# rate=4, re=10) — the sandbox chromium dies at ~2 min wall, so faster travel =
# more Tiger fights per life. The Leopard (leg 0) is expected to die each session;
# stop on the TIGER kill or leg 2. Usage: bash test/speedrun/lab86-loop.sh [iters] [tag]
set -u
cd "$(dirname "$0")/../.."
mkdir -p test/speedrun/runs   # the re-clone drops this gitignored dir — the loop must self-heal
N=${1:-8}
TAG=${2:-parklab82}
for i in $(seq 1 "$N"); do
  pkill -f chrome-lab 2>/dev/null; sleep 1
  LOG="test/speedrun/runs/${TAG}run${i}.log"
  echo "== [$TAG #$i] $(date +%H:%M:%S) ==================" >> "$LOG"
  timeout 420 node test/speedrun/run.mjs --fightlab --labLeg=1 --labTier=1 --labLvl=8 --route=iron --seed=7777 \
    --cap=600 --speed=8 --rate=10 --re=10 --tag="${TAG}run${i}" >> "$LOG" 2>&1
  # stop on the TIGER kill (leg 1), leg 2, or the TROPHY event (tier 1 closes).
  # parklab90 GHOST-KILL GUARD: a 'res":"slain"' entry with simS < 2 is the death-race
  # false positive (boss despawns on wolf death, not a real kill — see run.mjs parklab90
  # comment) — require a real fight duration before declaring victory.
  if (grep -q 'Tiger Legend","res":"slain' "$LOG" && ! grep -qE 'Tiger Legend","res":"slain"[^}]*"simS":(0(\.[0-9]+)?|1(\.[0-9]+)?)[,}]' "$LOG") || grep -q '"leg":2' "$LOG" || grep -q "TROPHY" "$LOG"; then
    echo "== TIGER/TROPHY at iteration $i — log: $LOG"
    exit 0
  fi
done
echo "== no kill in $N iterations; logs in test/speedrun/runs/${TAG}run*.log"
