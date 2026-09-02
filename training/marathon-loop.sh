#!/bin/bash
# Mission chapter loop: one fresh world per iteration, forever. Watchdog recycles this on stalls.
cd /home/user
while true; do
  node test/marathon.mjs 240 40 >> test/watchdog-runner.log 2>&1
  sleep 4
done
