import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
// TRUE hit-tested touches via CDP — the path real fingers take (synthetic dispatch bypasses hit-testing)
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 400 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=5150&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const cdp = await pg.context().newCDPSession(pg);
const R = {};
const probes = {
  deadBand_aboveButtons: [0.78, 0.62],
  deadBand_belowMinimap: [0.80, 0.42],
  midRight: [0.9, 0.5],
  center: [0.55, 0.45],
  leftZone_isStick: [0.2, 0.5],
  minimap_noClaim: [0.94, 0.17],
};
for (const [name, [fx, fy]] of Object.entries(probes)) {
  const x = Math.round(800 * fx), y = Math.round(400 * fy);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  const st = await pg.evaluate(() => ({ n: camPointers.size, joy: document.getElementById('joy').classList.contains('live') }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  R[name] = st;
}
console.log('REALPATH ' + JSON.stringify({ ...R, errs }));
await b.close();
