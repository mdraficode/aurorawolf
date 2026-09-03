import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('https://mdraficode.github.io/aurorawolf/', { timeout: 60000 });
await page.waitForFunction(() => {
  const b = document.getElementById('btnStart');
  return b && !b.disabled;
}, null, { timeout: 60000 });
await page.click('#btnNewGame');
await page.waitForTimeout(150);
await page.click('#ddNewStart');
await page.waitForTimeout(1200);
const R = await page.evaluate(() => ({
  title: document.title.slice(0, 40),
  state, hasAttackBtn: !!document.getElementById('tAttack'),
  peltChip: !!document.getElementById('chip-pelt'),
  animals: (window.animalTotal !== undefined) ? animalTotal : 'n/a'
}));
console.log(JSON.stringify(R), 'pageerrors:', errors.length ? errors.join('|') : 'none');
await browser.close();
