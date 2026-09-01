import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 350 } });
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=4242&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
console.log(JSON.stringify(await pg.evaluate(() => {
  const btn = document.getElementById('questBtn');
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return { rect: [r.left, r.top, r.width, r.height].map(v => +v.toFixed(0)), center: [cx | 0, cy | 0],
    topAtCenter: top ? (top.id || top.tagName) + '.' + top.className : 'null',
    isSelf: top === btn, pe: getComputedStyle(btn).pointerEvents, parentPe: getComputedStyle(btn.parentElement).pointerEvents,
    inViewport: cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight };
})));
await b.close();
