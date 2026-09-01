import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
const R = {};
await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=1337&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 40000 });
await page.waitForTimeout(600);
R.wolf = await page.evaluate(() => {
  let meshes = 0, amber = 0, fangs = 0, spikes = 0, ears = 0;
  wolf.model.traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    if (o.material.emissive && o.material.emissive.getHex() === 0x53350a) amber++;
    if (o.material.color && o.material.color.getHex() === 0xf5f2ea) fangs++;
  });
  // count head children (skull, crown, brows, eyes, pupils, liner, ears x2 parts, fangs, ruffs...)
  const headParts = wolf.head.children.length;
  return { meshes, amberEyeParts: amber, fangs, headParts };
});
await page.evaluate(() => { wolf.howlCd = 0; });
await page.keyboard.press('KeyH');
await page.waitForTimeout(400);
R.howlPose = await page.evaluate(() => ({ headUp: wolf.head.rotation.x < -0.4, howling: wolf.howlCd > 0 }));
await page.waitForTimeout(2800);
R.howlReleased = await page.evaluate(() => wolf.head.rotation.x > 0);
await page.keyboard.down('KeyW');
await page.waitForTimeout(900);
await page.keyboard.up('KeyW');
R.runHeadLow = await page.evaluate(() => wolf.head.rotation.x > 0.05);
R.distance = await page.evaluate(() => wolf.distance.toFixed(1));
R.errors = errs;
console.log(JSON.stringify(R, null, 1));
await browser.close();
