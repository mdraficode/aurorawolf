#!/usr/bin/env python3
"""Quest-drive analysis of a test/real1x.jsonl run: does the bot pursue and COMPLETE quests, or park in a region?"""
import json, re, sys
from collections import defaultdict

rows = [json.loads(l) for l in open('test/real1x.jsonl')]
if not rows: sys.exit('no data')
T = rows[-1]['wall']

# 1) quest progress timeline: parse "icon Title have/need" per title
prog = defaultdict(list)   # title -> [(t, have, need)]
for r in rows:
    for part in r.get('quest', '').split(' | '):
        m = re.match(r'(?:[^ ]+) (.*?) (\d+)/(\d+)$', part)
        if m: prog[m.group(1)].append((r['wall'], int(m.group(2)), int(m.group(3))))

print(f"run: {T}s · L{rows[-1]['level']} · {rows[-1]['kills']} kills · od {rows[-1]['od']}m")
done = partial = stuck = 0
for title, tl in prog.items():
    first, last = tl[0], tl[-1]
    gained = last[1] - first[1]
    tag = ''
    if last[1] >= last[2]: tag = '✅ COMPLETED'; done += 1
    elif gained > 0: tag = f'◐ +{gained}/{last[2]}'; partial += 1
    else: tag = '✘ no progress'; stuck += 1
    print(f"  {title[:34]:<34} {first[1]}/{first[2]} → {last[1]}/{last[2]}  {tag}")

# 2) region tether: rolling 3-min max displacement from window start
worst = 0; worst_at = 0
for i, r in enumerate(rows):
    for j in (i - 1, max(0, i - 30)):
        pass
for i in range(0, len(rows) - 36):
    w = rows[i:i + 36]   # ~3 min at ~5 s spacing
    x0, z0 = w[0]['x'], w[0]['z']
    md = max((abs(r['x'] - x0) + abs(r['z'] - z0)) / 2 for r in w)
    if md < worst or worst == 0:
        if worst == 0 or md < worst: worst = min(worst, md) if worst else md
    worst = min(worst, md) if i == 0 else min(worst, md) if md < worst else worst
# simpler: report min over windows of the max displacement
def wprog(w):   # quest progress inside a window (have sums + completions)
    tot = 0
    for r in w:
        for part in r.get('quest', '').split(' | '):
            m = re.match(r'(?:[^ ]+) (.*?) (\d+)/(\d+)$', part)
            if m: tot += int(m.group(2))
    return max(wprog_last(w), 0)
def wprog_last(w):
    a = b2 = 0
    for part in w[0].get('quest', '').split(' | '):
        m = re.match(r'(?:[^ ]+) (.*?) (\d+)/(\d+)$', part)
        if m: a += int(m.group(2))
    for part in w[-1].get('quest', '').split(' | '):
        m = re.match(r'(?:[^ ]+) (.*?) (\d+)/(\d+)$', part)
        if m: b2 += int(m.group(2))
    return b2 - a
mins = []
for i in range(0, max(1, len(rows) - 36)):
    w = rows[i:i + 36]
    x0, z0 = w[0]['x'], w[0]['z']
    md = max(((r['x'] - x0) ** 2 + (r['z'] - z0) ** 2) ** .5 for r in w)
    if wprog(w) > 0: continue   # working a cluster with progress is not a lock
    mins.append(md)
tether = min(mins) if mins else 999
print(f"tightest no-progress 3-min radius: {tether:.0f} m  {'⚠️ REGION-LOCK' if tether < 120 else '✓ travels (or works with progress)'}")

# 3) stalls + flapping
st = sum(1 for i in range(4, len(rows)) if rows[i]['od'] - rows[i - 4]['od'] < 3 and rows[i]['wall'] - rows[i - 4]['wall'] >= 18)
gl = [re.sub(r'[0-9]+m', '', r['goal'].split('·')[0]) for r in rows]
sw = sum(1 for i in range(1, len(gl)) if gl[i] != gl[i - 1])
print(f"stall windows: {st} · goal-mode switches: {sw} ({sw * 60 / max(1, T):.1f}/min)")

# 4) brain events of interest
evs = {}
for r in rows:
    for e in r.get('evts', []):
        k = e.split(':')[0]
        if k in ('ford', 'ford-set', 'tether-break', 'quest-drive', 'doorstep-perimeter', 'abandon-stalled', 'abandon-unreachable', 'lm-unreachable', 'loop-break', 'kill', 'quest-completeQuest', 'level-up', 'chase-giveup', 'shun-relief'):
            evs.setdefault(k, 0)
            evs[k] += 1
print("events:", json.dumps(evs) if evs else "(none of interest)")
