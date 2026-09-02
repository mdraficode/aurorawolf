#!/usr/bin/env bash
cd /home/user/aurorawolf || exit 1
for i in 2 3; do
  node training/rafzzer_gens.mjs run 9 480 > /home/user/aurorawolf/training/logs/log_replay_gen9_r"$i".log 2>&1
  node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync('training/rafzzer_run_gen9.json','utf8'));const safe=String(r.cause||'cap').replace(/[^a-z0-9]+/gi,'_');fs.copyFileSync('training/rafzzer_run_gen9.json','training/history/phase0_replay/replay_run_gen9_r$i_'+(r.fitness||0)+'_'+safe+'.json');console.log('replay r$i: fitness',r.fitness,'cause',r.cause,'dur',r.durSimS)"
  echo "--- R$i done ---"
done
echo ALLDONE
