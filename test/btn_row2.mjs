import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(3000);
const R = await pg.evaluate(() => {
  const r = id => { const e = document.getElementById(id); const b2 = e.getBoundingClientRect(); return { id, l: +b2.left.toFixed(0), r: +b2.right.toFixed(0), t: +b2.top.toFixed(0), b: +b2.bottom.toFixed(0), w: +b2.width.toFixed(0) }; };
  const inv = r('invBtn'), q = r('questBtn'), ai = r('btnAI'), mm = r('minimap');
  const ov = (a, b2) => !(a.r <= b2.l || b2.r <= a.l || a.b <= b2.t || b2.b <= a.t);
  return { row: [inv, q, ai, mm].map(x => x.id + ':' + x.l + '-' + x.r),
    orderOK: inv.l < q.l && q.l < ai.l && ai.r <= mm.l, sameTop: inv.t === q.t && q.t === ai.t && ai.t === mm.t,
    anyOverlap: [ov(inv, q), ov(q, ai), ov(ai, mm)].some(Boolean),
    gaps: { invQ: q.l - inv.r, qAi: ai.l - q.r, aiMm: mm.l - ai.r },
    topLeftFree: (() => { const e = document.elementFromPoint(36, 34); return !e || e.id !== 'questBtn'; })() };
});
console.log('ROW2 ' + JSON.stringify({ ...R, errs }));
await b.close();
