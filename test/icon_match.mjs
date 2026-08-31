import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], deviceScaleFactor: 4 });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(() => ({ img: !!document.querySelector('#icoRun img'), svgGone: !document.querySelector('#icoRun svg'),
  hpStill: !!document.getElementById('hpPct'), lvlStill: !!document.getElementById('xpLvl'), noStamText: !document.getElementById('stamPct') }));
await pg.screenshot({ path: 'shots/icon_match.png', clip: { x: 12, y: 81, width: 46, height: 46 } });
console.log('MATCH ' + JSON.stringify({ ...R, errs }));
await b.close();
