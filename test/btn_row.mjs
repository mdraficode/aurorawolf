import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(() => {
  const r = id => { const e = document.getElementById(id); if (!e) return null; const b2 = e.getBoundingClientRect(); return { id, l: +b2.left.toFixed(0), r: +b2.right.toFixed(0), t: +b2.top.toFixed(0), vis: getComputedStyle(e).display !== 'none' }; };
  const inv = r('invBtn'), q = r('questBtn'), ai = r('btnAI'), mm = r('minimap');
  const hit = (a, b2) => !(a.r <= b2.l || b2.r <= b2.l || a.r <= b2.l || b2.r <= a.l || a.r <= b2.l);  // boxes
  const ov = (a, b2) => a && b2 && !(a.r <= b2.l || b2.r <= a.l || a.t + 40 <= b2.t || b2.t + 40 <= a.t);
  return { row: [inv, q, ai, mm], orderOK: inv.l < q.l && q.l < ai.l && ai.r <= mm.l,
    sameTop: inv.t === q.t && q.t === ai.t, overlaps: [ov(inv, q), ov(q, ai), ov(ai, mm)].every(x => !x),
    leftCornerEmpty: !document.elementFromPoint(36, 34) || document.elementFromPoint(36, 34).id !== 'questBtn' };
});
console.log('ROW ' + JSON.stringify({ ...R, errs }));
await b.close();
