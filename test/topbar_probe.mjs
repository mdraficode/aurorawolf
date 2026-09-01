import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const run = async (w, h, touch) => {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await pg.waitForTimeout(1200);
  if (touch) await pg.evaluate(() => document.body.classList.add('touch'));
  const R = await pg.evaluate(() => {
    const tb = document.getElementById('topbar').getBoundingClientRect();
    const mm = document.getElementById('minimap').getBoundingClientRect();
    const ib = document.getElementById('invBtn').getBoundingClientRect();   // left-most orbit satellite
    const bars = document.getElementById('hpWrap').getBoundingClientRect(); // right-most of the left column
    const near = (a, b2, pad) => !(a.right + pad <= b2.left || b2.right + pad <= a.left || a.bottom <= b2.top || b2.bottom <= a.top);
    const mmVisible = mm.width > 0;
    const rightEdge = mmVisible ? Math.min(mm.left, ib.left) : 1e9;
    return { pill: { l: +tb.left.toFixed(0), r: +tb.right.toFixed(0), top: +tb.top.toFixed(0), w: +tb.width.toFixed(0) },
      centered: Math.abs((tb.left + tb.right) / 2 - innerWidth / 2) <= 2,
      clearLeft: tb.left > bars.right + 4,
      clearRight: mmVisible ? tb.right < rightEdge - 4 : true,
      leftColRight: +bars.right.toFixed(0), rightClusLeft: +rightEdge.toFixed(0) };
  });
  await pg.close();
  return R;
};
const out = {};
out.desktop900 = await run(900, 560, false);
out.desktop700 = await run(700, 500, false);
out.landscape800 = await run(800, 390, true);
console.log('TOPBAR ' + JSON.stringify(out));
await b.close();
