import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(() => {
  const r = id => { const b2 = document.getElementById(id).getBoundingClientRect(); return { t: +b2.top.toFixed(0), b: +b2.bottom.toFixed(0), l: +b2.left.toFixed(0), r: +b2.right.toFixed(0), w: +b2.width.toFixed(0), h: +b2.height.toFixed(0) }; };
  const ix = r('icoXp'), ir = r('icoRun'), ih = r('icoHp'), img = r('icoRun').l >= 0 ? document.querySelector('#icoRun img').getBoundingClientRect() : null;
  const imgR = { t: +img.top.toFixed(0), b: +img.bottom.toFixed(0), w: +img.width.toFixed(0) };
  const xp = r('xpWrap'), st = r('stamWrap'), hp = r('hpWrap'), btn = r('questBtn'), tr = r('questTracker');
  const hit = (a, b2) => !(a.r <= b2.l || b2.r <= a.l || a.b <= b2.t || b2.b <= a.t);
  return { gaps: { xpToRun: ir.t - ix.b, runToHp: ih.t - ir.b }, badge: ix.w, wolfImg: imgR,
    noIconOverlap: !hit(ix, ir) && !hit(ir, ih), btnClear: !hit(btn, ix),
    barsCentered: [ [ix, xp], [ir, st], [ih, hp] ].every(([i2, br]) => Math.abs((i2.t + i2.b) / 2 - (br.t + br.b) / 2) <= 2.5),
    barGaps: { a: st.t - xp.b, b: hp.t - st.b }, trackerClear: !hit(hp, tr) };
});
console.log('GAP ' + JSON.stringify({ ...R, errs }));
await b.close();
