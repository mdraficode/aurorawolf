import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1200);
const R = await pg.evaluate(() => {
  const r = id => { const b2 = document.getElementById(id).getBoundingClientRect(); return { id, top: +b2.top.toFixed(0), bottom: +b2.bottom.toFixed(0), left: +b2.left.toFixed(0), right: +b2.right.toFixed(0) }; };
  const btn = r('questBtn'), xp = r('xpWrap'), st = r('stamWrap'), hp = r('hpWrap'), tr = r('questTracker');
  const hit = (a, b2) => !(a.right <= b2.left || b2.right <= a.left || a.bottom <= b2.top || b2.bottom <= a.top);
  return { rects: [btn, xp, st, hp, tr],
    btnXpOverlap: hit(btn, xp), xpStamOverlap: hit(xp, st), stamHpOverlap: hit(st, hp), hpTrackerOverlap: hit(hp, tr),
    order: xp.top < st.top && st.top < hp.top && hp.top < tr.top,
    gapBtnToXp: xp.top - btn.bottom };
});
console.log('LAYOUT ' + JSON.stringify({ ...R, errs }));
await b.close();
