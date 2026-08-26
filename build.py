#!/usr/bin/env python3
"""Build the single-file game: index.html = shell + css + three.min.js + game parts."""
import pathlib

root = pathlib.Path(__file__).parent
src = root / 'src'

shell = (src / 'shell.html').read_text()
css = (src / 'style.css').read_text()
three = (root / 'vendor' / 'three.min.js').read_text()
game = '\n'.join((src / f'p{i}.js').read_text() for i in (1, 2, 3, 4))

for blob, name in ((three, 'three'), (game, 'game')):
    assert '</script' not in blob.lower(), f'{name} contains a closing script tag!'

html = shell.replace('<!--CSS-->', '<style>\n' + css + '\n</style>')
html = html.replace('<!--THREE-->', '<script>\n' + three + '\n</script>')
html = html.replace('<!--GAME-->', '<script>\n' + game + '\n</script>')

out = root / 'index.html'
out.write_text(html)
print(f'wrote {out} ({out.stat().st_size / 1024:.0f} KB)')
