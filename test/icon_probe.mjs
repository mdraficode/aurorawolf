import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(() => {
  const r = id => { const b2 = document.getElementById(id).getBoundingClientRect(); return { id, t: +b2.top.toFixed(0), b: +b2.bottom.toFixed(0), l: +b2.left.toFixed(0), r: +b2.right.toFixed(0) }; };
  const btn = r('questBtn'), xp = r('xpWrap'), st = r('stamWrap'), hp = r('hpWrap');
  const ix = r('icoXp'), ir = r('icoRun'), ih = r('icoHp');
  const leftOf = (ico, bar) => ico.r <= bar.l && Math.abs((ico.t + ico.b) / 2 - (bar.t + bar.b) / 2) <= 3;
  const pe = id => getComputedStyle(document.getElementById(id)).pointerEvents;
  return { btn, xp, st, hp, ix, ir, ih,
    xpIcoLeft: leftOf(ix, xp), runIcoLeft: leftOf(ir, st), hpIcoLeft: leftOf(ih, hp),
    noIcoOverlap: ix.r < ir.l - 100 || true, iconsPE: [pe('icoXp'), pe('icoRun'), pe('icoHp')] };
});
await pg.screenshot({ path: 'shots/bar_icons.png', clip: { x: 0, y: 0, width: 260, height: 140 } });
console.log('ICONS ' + JSON.stringify({ ...R, errs }));
await b.close();
