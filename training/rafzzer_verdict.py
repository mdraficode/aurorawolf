#!/usr/bin/env python3
"""Mechanical verdict under the trainer's rules — hard vetoes + tripwires.
promote only if: gate passed AND no vetoes AND fitness > champion.
Tripwires print INSPECT:<reason> and exit 3 (driver stops for the human)."""
import json, sys, pathlib
D = pathlib.Path(__file__).resolve().parent   # repo move 2026-08-30: was /home/user/test
g = int(sys.argv[1])
run = json.load(open(D / f'rafzzer_run_gen{g}.json'))
gate = json.load(open(D / f'rafzzer_gate_gen{g}.json'))
champ = json.load(open(D / 'rafzzer_champion.json'))
cand = json.load(open(D / 'rafzzer_candidate.json'))
L = json.load(open(D / 'rafzzer_lineage.json'))
mets = run.get('mets', {})
veto = []
if run.get('warns', 0) > 0: veto.append(f"tick-crashes:{run['warns']}")
if run.get('errs'): veto.append('page-errors')
if run.get('cls') == 'water': veto.append('water-death')
if run.get('outcome', '').startswith('SURVIVED') and run.get('xp', 0) < 150: veto.append('camper-survival (no real progress)')
if gate.get('failed'): veto.append('gate:' + ','.join(gate['failed'][:3]))
trip = None
if run['fitness'] > (champ.get('fit') or 0) + 150: trip = f'fitness jump {run["fitness"]} vs champ {champ.get("fit")}'
if trip:
    L.append({'gen': g, 'fitness': run['fitness'], 'outcome': run['outcome'], 'gate': {'passed': not gate.get('failed')}, 'verdict': 'INSPECT', 'cause': run.get('cause') or '', 'note': trip}); json.dump(L, open(D / 'rafzzer_lineage.json', 'w'))
    print(f'INSPECT: {trip}'); sys.exit(3)
note = f"{mets.get('xpMin','?')}xp/min · {mets.get('qMin','?')}q/min · quest avg {mets.get('avgQuestS','—')}s" + (f" · VETO {','.join(veto)}" if veto else '')
if not veto and run['fitness'] > (champ.get('fit') if champ.get('fit') is not None else -1e9):
    json.dump({'v': '1.0', 'gen': g, 'fit': run['fitness'], 'weights': cand['weights'], 'scars': run.get('scars', cand.get('scars', {'fight': 0, 'neglect': 0, 'water': 0})), 'cause': run.get('cause'), 'mets': mets, 'promotedAt': 4}, open(D / 'rafzzer_champion.json', 'w'))
    v = f"PROMOTED (fit {champ.get('fit','—')} → {run['fitness']})"
else:
    v = 'rejected: ' + (','.join(veto) if veto else f"outlived (fit {run['fitness']} ≤ {champ.get('fit')})")
L.append({'gen': g, 'fitness': run['fitness'], 'outcome': run['outcome'], 'gate': {'passed': not gate.get('failed')}, 'verdict': v, 'cause': run.get('cause') or '', 'note': note})
json.dump(L, open(D / 'rafzzer_lineage.json', 'w'))
print(f'GEN {g} → {v} · {note}')
