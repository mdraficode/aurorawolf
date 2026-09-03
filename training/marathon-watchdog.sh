#!/bin/bash
# Self-healing marathon daemon: poll test/marathon.jsonl mtime; stall >240s → kill runner+chrome, relaunch.
LOG=test/watchdog-runner.log
while true; do
  sleep 60
  NOW=$(date +%s)
  MTIME=$(stat -c %Y test/marathon.jsonl 2>/dev/null || echo 0)
  AGE=$((NOW - MTIME))
  if [ "$AGE" -gt 240 ]; then
    echo "$(date -Is) stall ${AGE}s → recycle" >> "$LOG"
    pkill -f 'test/marathon.mjs' 2>/dev/null; pkill -f 'chromium' 2>/dev/null; pkill -f 'chrome' 2>/dev/null
    sleep 3
    nohup node test/marathon.mjs 240 40 >> "$LOG" 2>&1 &
  fi
done
