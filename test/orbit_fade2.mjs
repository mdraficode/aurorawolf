import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 } });
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  document.body.classList.add('touch');
  const orb = document.getElementById('mmOrbit');
  const rest = getComputedStyle(orb).opacity;
  document.getElementById('invBtn').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 920, bubbles: true }));
  const inlineWhenAwake = orb.style.opacity;   // the wake set it inline (env-proof)
  let vals = [];
  for (let i = 0; i < 12; i++) { vals.push(+getComputedStyle(orb).opacity); await new Promise(r => setTimeout(r, 200)); }   // pump style recalcs through the wake window and past the timeout
  return { rest, inlineWhenAwake, mid: vals[1], end: vals[vals.length - 1], cleared: orb.style.opacity === '' && !orb.classList.contains('wake') };
});
console.log('FADE2 ' + JSON.stringify(R));
await b.close();
