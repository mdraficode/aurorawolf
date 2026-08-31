import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const results = [];
try {
  await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?seed=20250826', { timeout: 60000 });
  await page.waitForFunction(() => { const b = document.getElementById('btnStart'); return b && !b.disabled; }, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/00_menu.png', timeout: 90000 });
  results.push('00_menu ✓');
} catch (e) { results.push('menu ✗'); }
try {
  await page.click('#btnStart');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
  await page.waitForTimeout(5000);                    // let chunks stream & minimap paint naturally
  await page.screenshot({ path: 'shots/03_minimap_world.png', timeout: 90000 });
  results.push('03_minimap_world ✓');
  const staged = await page.evaluate(() => {         // light teleport only — no tick forcing
    if (!landmarkList.length) return null;
    const lm = landmarkList[0];
    wolf.pos.x = lm.x + 13; wolf.pos.z = lm.z + 13; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 1.5;
    camYaw = Math.atan2(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
    return LANDMARKS[lm.type].label;
  });
  if (staged) {
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'shots/04_landmark.png', timeout: 90000 });
    results.push('04_landmark ✓ (' + staged + ')');
  } else results.push('04_landmark skipped (none loaded)');
} catch (e) { results.push('game ✗ ' + e.message.split('\n')[0]); }
await browser.close();
console.log(results.join('\n'));
