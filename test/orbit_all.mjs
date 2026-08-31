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
    const mmR = document.getElementById('minimap').getBoundingClientRect();
    const r = id => { const x = document.getElementById(id).getBoundingClientRect(); return { cx: x.left + x.width / 2, cy: x.top + x.height / 2, rr: x.width / 2 }; };
    const d = [r('invBtn'), r('questBtn'), r('btnAI'), r('tPause')], M = r('minimap');
    let minBtn = 1e9, minMap = 1e9;
    for (let i = 0; i < 4; i++) { minMap = Math.min(minMap, Math.hypot(d[i].cx - M.cx, d[i].cy - M.cy) - d[i].rr - M.rr);
      for (let j = i + 1; j < 4; j++) minBtn = Math.min(minBtn, Math.hypot(d[i].cx - d[j].cx, d[i].cy - d[j].cy) - d[i].rr - d[j].rr); }
    const t = document.getElementById('topbar').getBoundingClientRect();
    return { map: { top: +mmR.top.toFixed(0), rightGap: +(innerWidth - mmR.right).toFixed(0), w: +mmR.width.toFixed(0) },
      gaps: { btnToBtn: +minBtn.toFixed(1), btnToMap: +minMap.toFixed(1) },
      pills: { top: +t.top.toFixed(0), left: +t.left.toFixed(0), clearOfMap: t.right < mmR.left || t.bottom < mmR.top } };
  });
  await pg.close();
  return R;
};
console.log('ORBITALL ' + JSON.stringify({ desktop: await run(900, 560, false), touch: await run(390, 844, true), landscape: await run(800, 390, true) }));
await b.close();
