import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const R = {};
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
await page.goto('file:///home/user/index.html?autostart=1&seed=1337&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 40000 });
await page.waitForTimeout(600);
R.veg = await page.evaluate(() => {
  let trees = 0, total = 0; const chunksN = chunks.size;
  for (const ch of chunks.values())
    for (const m of ch.instanced) {
      total += m.count;
      if ([G.spruce, G.snowSpruce, G.pine, G.birch, G.autumnBirch, G.rowan, G.oak, G.deadTree, G.dwarfPine].includes(m.geometry)) trees += m.count;
    }
  return { chunksN, treesPerChunk: (trees / chunksN).toFixed(1), instancesPerChunk: (total / chunksN).toFixed(1) };
});
R.wolfModel = await page.evaluate(() => {
  let meshes = 0, hasFur = false;
  wolf.model.traverse(o => { if (o.isMesh) { meshes++; if (o.material.map) hasFur = true; } });
  return { meshes, hasFur, legs: wolf.legs.length, lowers: wolf.lowers.length };
});
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000);
await page.keyboard.press('Space');
await page.waitForTimeout(500);
await page.keyboard.up('KeyW');
R.ranOk = await page.evaluate(() => wolf.distance > 0.5);
R.gather = await page.evaluate(() => {
  for (const ch of chunks.values())
    for (const p of ch.pickups)
      if (!p.gathered) { wolf.pos.set(p.x + 0.8, p.y + 0.6, p.z); return true; }
  return false;
});
await page.waitForTimeout(250);
await page.keyboard.press('KeyE');
await page.waitForTimeout(150);
R.invTotal = await page.evaluate(() => inv.berry + inv.mushroom + inv.herb + inv.wood + inv.stone);
R.errors = errs;
console.log(JSON.stringify(R, null, 1));
await browser.close();
