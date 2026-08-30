import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 }, hasTouch: true });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
const cdp = await pg.context().newCDPSession(pg);
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
await pg.evaluate(() => document.body.classList.add('touch'));
const tap = async (x, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pg.waitForTimeout(1200);   // LONGER than the worst delayed-click duplication
};
const isOpen = () => pg.evaluate(() => document.getElementById('invWrap').classList.contains('show'));
const ib = await pg.evaluate(() => { const r = document.getElementById('invBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const out = {};
await tap(ib.x, ib.y);  out.tap1 = await isOpen();
await tap(ib.x, ib.y);  out.tap2 = await isOpen();
await tap(ib.x, ib.y);  out.tap3 = await isOpen();
await tap(ib.x, ib.y);  out.tap4 = await isOpen();
console.log('INV2 ' + JSON.stringify({ ...out, alternates: out.tap1 === true && out.tap2 === false && out.tap3 === true && out.tap4 === false, errs }));
await b.close();
