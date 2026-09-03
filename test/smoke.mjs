import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
const R = {};

await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?seed=777');
// menu should appear, button enables after boot
await page.waitForFunction(() => {
  const b = document.getElementById('btnStart');
  return b && !b.disabled;
}, null, { timeout: 40000 });
R.bootOk = true;
await page.screenshot({ path: 'shots/12_menu2.png', timeout: 90000 });

// start the game via the NEW GAME drop-down's "Start Game" — a fresh seed, reload + autostart
await page.click('#btnNewGame');
await page.waitForTimeout(150);
await page.click('#ddNewStart');
// the fresh world boots then auto-enters play; wait for it rather than a fixed sleep
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
R.stateAfterClick = await page.evaluate(() => state);
R.overlayHidden = await page.evaluate(() => document.getElementById('overlay').classList.contains('hidden'));
R.hudVisible = await page.evaluate(() => !document.getElementById('hud').classList.contains('hidden'));

// wander with keys for a bit
await page.keyboard.down('KeyW');
await page.waitForTimeout(2000);
await page.keyboard.up('KeyW');
R.moved = await page.evaluate(() => wolf.distance.toFixed(1));
R.chunks = await page.evaluate(() => chunks.size);
R.animals = await page.evaluate(() => animalTotal);
R.fps = await page.evaluate(() => fpsShow);
await page.screenshot({ path: 'shots/13_play2.png', timeout: 90000 });

// pause overlay
await page.keyboard.press('KeyP');
await page.waitForTimeout(300);
R.pauseShown = await page.evaluate(() => !document.getElementById('overlay').classList.contains('hidden'));
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
R.resumed = await page.evaluate(() => state);

R.errBanner = await page.evaluate(() => document.getElementById('err').style.display);
R.errors = errors;
console.log(JSON.stringify(R, null, 1));
await browser.close();
