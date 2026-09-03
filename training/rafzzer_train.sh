#!/usr/bin/env bash
# The generational trainer: spawn→gate→run→verdict, with the human's tripwires.
# usage: bash training/rafzzer_train.sh <startGen> <endGen>
set -u
cd /home/user
G=${1:?start}; END=${2:?end}
while [ "$G" -le "$END" ]; do
  STATUS=FAIL
  for A in 1 2 3; do
    node training/rafzzer_gens.mjs spawn "$G" "$A" >/dev/null 2>&1
    if node training/rafzzer_gens.mjs gate "$G" >/tmp/gate$G.log 2>&1; then STATUS=PASS; break; fi
    python3 - <<PY
import json,pathlib
D=pathlib.Path('/home/user/test'); g=$G; a=$A
L=json.load(open(D/'rafzzer_lineage.json'))
L.append({'gen':g,'fitness':None,'outcome':f'REJECTED-AT-GATE (attempt {a})','gate':{'passed':False},'verdict':'blocked','cause':'','note':'gate reject'})
json.dump(L,open(D/'rafzzer_lineage.json','w'))
PY
  done
  if [ "$STATUS" != PASS ]; then echo "GEN $G: 3 gate rejects — gen skipped, champion stands"; G=$((G+1)); continue; fi
  grep -h "moved" /tmp/gate$G.log | tail -1
  node training/rafzzer_gens.mjs run "$G" 480 > /tmp/run$G.log 2>&1
  tail -2 /tmp/run$G.log
  VERDICT=$(python3 training/rafzzer_verdict.py "$G" 2>&1)
  echo "$VERDICT"
  case "$VERDICT" in *INSPECT*) echo "TRIPWIRE — driver stopped for human review at GEN $G"; exit 42;; esac
  G=$((G+1))
done
echo "BATCH COMPLETE ($1..$((END)))"
