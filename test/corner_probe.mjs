import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 560 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(() => {
  const r = id => { const b2 = document.getElementById(id).getBoundingClientRect(); return { id, t: +b2.top.toFixed(0), b: +b2.bottom.toFixed(0), l: +b2.left.toFixed(0), r: +b2.right.toFixed(0) }; };
  const ix = r('icoXp'), ir = r('icoRun'), ih = r('icoHp'), xp = r('xpWrap'), st = r('stamWrap'), hp = r('hpWrap'), tr = r('questTracker');
  const inv = r('invBtn'), q = r('questBtn'), ai = r('btnAI'), mm = r('minimap');
  const ov = (a, b2) => !(a.r <= b2.l || b2.r <= a.l || a.b <= b2.t || b2.b <= a.t);
  return { col: { firstBadgeTop: ix.t, fillsCorner: ix.t <= 16, seam1: ir.t - ix.b, seam2: ih.t - ir.b, trackerClear: !ov(hp, tr) },
    right: { mmTop: mm.t, mmRight: +(innerWidth - mm.r).toFixed(0), rowTop: inv.t, aligned: inv.t === q.t && q.t === ai.t && ai.t === mm.t,
      order: inv.l < q.l && q.l < ai.l && ai.r <= mm.l, aiMmGap: mm.l - ai.r },
    crossCheck: { colVsRow: !ov(ih, inv) && ix.r < inv.l, barsCentered: [ [ix, xp], [ir, st], [ih, hp] ].every(([i2, br]) => Math.abs((i2.t + i2.b) / 2 - (br.t + br.b) / 2) <= 2.5) } };
});
console.log('CORNER ' + JSON.stringify({ ...R, errs }));
await b.close();
