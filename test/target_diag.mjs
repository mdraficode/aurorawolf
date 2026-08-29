import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 400 }, hasTouch: true, isMobile: true });
await pg.goto('file:///home/user/index.html?autostart=1&seed=5150&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
await pg.evaluate(() => { window.__tlog = []; addEventListener('pointerdown', e => window.__tlog.push({ t: e.target.id || e.target.tagName + '.' + String(e.target.className).slice(0, 18), x: e.clientX, y: e.clientY }), true); });
const cdp = await pg.context().newCDPSession(pg);
for (const [fx, fy] of [[0.78, 0.62], [0.9, 0.5], [0.8, 0.42], [0.2, 0.5]]) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(800 * fx), y: Math.round(400 * fy), id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const R = await pg.evaluate(() => ({ log: window.__tlog, efp: [[624, 248], [720, 200], [640, 168], [160, 200]].map(([x, y]) => { const el = document.elementFromPoint(x, y); return [x + ',' + y, el ? (el.id || el.tagName) + ' pe=' + getComputedStyle(el).pointerEvents : '?']; }) }));
console.log(JSON.stringify(R, null, 1));
await b.close();
