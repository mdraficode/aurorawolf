import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=1337&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 40000 });
// fast-forward check: simulate the animate states directly with controlled inputs
const R = await page.evaluate(() => {
  const out = {};
  // idle pose
  wolf.speed = 0; wolf.grounded = true; wolf.howlCd = 0; wolf.swimming = false;
  wolf.animate(0.5, false);
  out.idleHead = wolf.head.rotation.x.toFixed(2);      // expect ~0.16 (lowered stare)
  // run pose
  wolf.speed = 10; wolf.animate(0.5, false);
  out.runHead = wolf.head.rotation.x.toFixed(2);       // expect ~0.17
  // howl pose
  wolf.howlCd = 4; wolf.animate(0.5, false);
  out.howlHead = wolf.head.rotation.x.toFixed(2);      // expect -0.62
  wolf.howlCd = 0;
  return out;
});
R.errors = errs;
console.log(JSON.stringify(R, null, 1));
await browser.close();
