#!/usr/bin/env bash
# one generation step under LAW v4 — delegates to the step driver (global ×2 → trait ×2 → traitglobal ×2)
# usage: bash test/m46_gen.sh <gen> [runCapSec]
set -u
cd /home/user/aurorawolf-v2
G=${1:?gen}
CAP=${2:-${RUN_CAP:-900}}
bash test/m46_step.sh "$G" "$CAP"
