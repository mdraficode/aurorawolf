import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], deviceScaleFactor: 4 });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(() => ({
  stamSpanGone: !document.getElementById('stamPct'),
  hpStill: !!document.getElementById('hpPct'), lvlStill: !!document.getElementById('xpLvl'),
  svgPaths: document.querySelectorAll('#icoRun svg *').length
}));
await pg.screenshot({ path: 'shots/wolfico.png', clip: { x: 10, y: 83, width: 50, height: 45 } });
console.log('WOLFICO ' + JSON.stringify({ ...R, errs }));
await b.close();
