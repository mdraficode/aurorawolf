import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  document.body.classList.add('touch');
  const orb = document.getElementById('mmOrbit');
  const rest = getComputedStyle(orb).opacity;
  document.getElementById('invBtn').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 910, bubbles: true }));
  await new Promise(r => setTimeout(r, 450));   // let the 300ms transition finish
  const awake = getComputedStyle(orb).opacity;
  await new Promise(r => setTimeout(r, 2600));  // past the 2.2s wake timeout + fade
  return { rest, awake, back: getComputedStyle(orb).opacity };
});
console.log('FADE ' + JSON.stringify(R));
await b.close();
