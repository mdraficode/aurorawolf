import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  window.__fc = 0; const fc = () => { window.__fc++; requestAnimationFrame(fc); }; requestAnimationFrame(fc);
  wolf.level = 55; wolf.xp = 0; wolf.xpNext = 9999;
  const reads = [];
  for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, 100)); reads.push(document.getElementById('xpLvl').textContent); }
  return { reads, frames: window.__fc, wolfLevelNow: wolf.level };
});
console.log(JSON.stringify({ ...R, errs }));
await b.close();
