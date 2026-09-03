import { pathToFileURL, fileURLToPath } from 'url';
/* big map overlay: X button + backdrop must close it and return to play */
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=20250827&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(600);
await page.keyboard.press('m');
await page.waitForTimeout(300);
const r1 = await page.evaluate(() => {
  const b = document.getElementById('bigmapClose').getBoundingClientRect();
  return { open: BIG.open, at: (document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) || {}).id };
});
if (!r1.open) throw new Error('map did not open');
if (r1.at !== 'bigmapClose') throw new Error('X not clickable — covered by ' + r1.at);
await (await page.$('#bigmapClose')).click();
await page.waitForTimeout(200);
const r2 = await page.evaluate(() => ({ open: BIG.open, shown: document.getElementById('bigmapWrap').classList.contains('show'), st: state }));
if (r2.open || r2.shown) throw new Error('X did not close the map');
if (r2.st !== 'play') throw new Error('not back in play: ' + r2.st);
// backdrop click closes too
await page.keyboard.press('m');
await page.waitForTimeout(200);
await page.mouse.click(30, 640);
await page.waitForTimeout(200);
const r3 = await page.evaluate(() => BIG.open);
if (r3) throw new Error('backdrop click did not close the map');
if (errors.length) throw new Error('pageerrors: ' + errors.join(' | '));
console.log('MAPCLOSE CHECK PASS');
await browser.close();
