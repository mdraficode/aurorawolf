import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 }, hasTouch: true });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
const cdp = await pg.context().newCDPSession(pg);
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
await pg.evaluate(() => document.body.classList.add('touch'));
// instrument every toggle + relevant events
await pg.evaluate(() => {
  window.__log = [];
  const iw = document.getElementById('invWrap'), ib = document.getElementById('invBtn');
  const orig = window.toggleInv;
  window.toggleInv = f => { window.__log.push('toggle(' + f + ') open=' + iw.classList.contains('show')); orig(f); window.__log.push('  -> open=' + iw.classList.contains('show')); };
  for (const t of ['pointerdown', 'pointerup', 'click']) {
    iw.addEventListener(t, e => window.__log.push('iw:' + t + ' target=' + (e.target.id || e.target.tagName)), true);
    ib.addEventListener(t, e => window.__log.push('ib:' + t), true);
  }
});
const tap = async (x, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pg.waitForTimeout(500);
};
const ib = await pg.evaluate(() => { const r = document.getElementById('invBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await tap(ib.x, ib.y);   // open
const openAfter1 = await pg.evaluate(() => document.getElementById('invWrap').classList.contains('show'));
await tap(ib.x, ib.y);   // close?
const out = await pg.evaluate(() => ({ open: document.getElementById('invWrap').classList.contains('show'), log: window.__log }));
console.log('INVTOUCH ' + JSON.stringify({ openAfter1, openAfter2: out.open, log: out.log, errs }));
await b.close();
