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
    const f = document.getElementById('fsBtn').getBoundingClientRect();
    const bad = [];
    for (const id of ['tPause', 'btnAI', 'questBtn', 'invBtn', 'minimap']) {
      const r = document.getElementById(id).getBoundingClientRect();
      if (r.width > 0 && !(f.right <= r.left || r.right <= f.left || f.bottom <= r.top || r.bottom <= f.top)) bad.push(id);
    }
    return { top: +f.top.toFixed(0), shown: document.getElementById('fsBtn').classList.contains('show'), overlaps: bad };
  });
  await pg.close();
  return R;
};
console.log('FSOV ' + JSON.stringify({ desktop: await run(900, 560, false), mid: await run(700, 500, false), touchLand: await run(800, 390, true), small: await run(680, 380, true) }));
await b.close();
