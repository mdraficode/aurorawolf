import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 }, hasTouch: true });
const cdp = await pg.context().newCDPSession(pg);
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
await pg.evaluate(() => document.body.classList.add('touch'));
await pg.evaluate(() => {
  window.__ev = [];
  const L = (tag, e) => window.__ev.push([performance.now() | 0, tag, e.type, (e.target.id || e.target.tagName)]);
  for (const t of ['pointerdown', 'pointerup', 'click', 'mousedown', 'mouseup']) {
    for (const id of ['invBtn', 'invWrap', 'invClose', 'hud']) document.getElementById(id).addEventListener(t, e => L(id, e), true);
  }
  addEventListener('keydown', e => window.__ev.push([performance.now() | 0, 'KEY', e.key, '']), true);
});
const ib = await pg.evaluate(() => { const r = document.getElementById('invBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ib.x, y: ib.y }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await pg.waitForTimeout(1000);
console.log(JSON.stringify(await pg.evaluate(() => window.__ev)));
await b.close();
