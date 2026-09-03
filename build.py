#!/usr/bin/env python3
"""Build the single-file game: index.html = shell + css + three.min.js + game parts.

M46 v6.5: the built game bakes the LINEAGE CROWN — training/rafzzer_champion.json is injected as
RAFZZER_SEED (+ RAFZZER_CHAMP_GEN/CHAMP_FIT), so the 🧠 Rafzzer button plays the current champion.
src/autopilot.js keeps the wild seed 20070 as the dev fallback; nothing in src is overwritten.
"""
import json
import pathlib
import re
import sys

root = pathlib.Path(__file__).parent
src = root / 'src'

shell = (src / 'shell.html').read_text()
css = (src / 'style.css').read_text()
three = (root / 'vendor' / 'three.min.js').read_text()
game = '\n'.join((src / f'p{i}.js').read_text() for i in (1, 2, 3, 4, 5, 6)) + '\n' + (src / 'autopilot.js').read_text()


def bake_crown(blob):
    """Inject the lineage champion (training/rafzzer_champion.json) as the shipped seed."""
    champ_file = root / 'training' / 'rafzzer_champion.json'
    if not champ_file.exists():
        print('build: no training/rafzzer_champion.json — keeping the wild seed (dev build)', file=sys.stderr)
        return blob
    try:
        c = json.loads(champ_file.read_text())
        w = c.get('weights')
        gen = int(c.get('gen') or 0)
        fit = float(c.get('fit') or 0)
        if not (isinstance(w, list) and len(w) >= 1 and all(isinstance(x, (int, float)) for x in w)):
            raise ValueError('weights missing/unnumeric')
    except Exception as e:
        print(f'build: champion json unusable ({e}) — keeping the wild seed', file=sys.stderr)
        return blob
    seed_js = ('window.RAFZZER_SEED = ' + json.dumps([round(float(x), 6) for x in w]) +
               ';   // 🧠 M46 v6.5 baked crown: GEN ' + str(gen) + ' (fit ' + str(round(fit, 1)) +
               ') — injected by build.py from training/rafzzer_champion.json\n' +
               'window.RAFZZER_CHAMP_GEN = ' + str(gen) + '; window.RAFZZER_CHAMP_FIT = ' + repr(round(fit, 6)) + ';')
    new_blob, n = re.subn(r'window\.RAFZZER_SEED = \[[^\]]*\];', lambda m: seed_js, blob, count=1)
    if n != 1:
        print('build: WARNING could not locate RAFZZER_SEED to bake — wild seed stands', file=sys.stderr)
        return blob
    print(f'build: baked crown GEN {gen} (fit {round(fit,1)}) into RAFZZER_SEED ({len(w)} weights)')
    return new_blob


game = bake_crown(game)

for blob, name in ((three, 'three'), (game, 'game')):
    assert '</script' not in blob.lower(), f'{name} contains a closing script tag!'

html = shell.replace('<!--CSS-->', '<style>\n' + css + '\n</style>')
html = html.replace('<!--THREE-->', '<script>\n' + three + '\n</script>')
html = html.replace('<!--GAME-->', '<script>\n' + game + '\n</script>')

out = root / 'index.html'
out.write_text(html)
print(f'wrote {out} ({out.stat().st_size / 1024:.0f} KB)')
