import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=20250826');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1000);
const R = await page.evaluate(() => {
  const R = {};
  // gate distribution over 400 chunk coords
  let elig = 0;
  for (let cz = -10; cz <= 10; cz++) for (let cx = -10; cx <= 10; cx++) if (hash2(cx, cz, SEED ^ 0x5bd1) % 5 === 0) elig++;
  R.gateEligible = elig; R.gateTotal = 441;
  // streaming: how many chunks get generated?
  const c0 = chunks.size;
  let maxChunks = c0;
  for (let i = 0; i < 200; i++) { wolf.pos.x += 3; tick(); maxChunks = Math.max(maxChunks, chunks.size); }
  R.chunksAfter200Ticks = maxChunks;
  // manual eligibility walk: simulate gate+biome for loaded chunk coords
  let biomeOk = 0, gateOk = 0;
  for (let cz = -6; cz <= 6; cz++) for (let cx = -6; cx <= 6; cx++) {
    const g = hash2(cx, cz, SEED ^ 0x5bd1) % 5 === 0; if (g) gateOk++;
    if (!g) continue;
    const typesL = Object.keys(LANDMARKS);
    const type = typesL[hash2(cx, cz, SEED ^ 0x9e37) % typesL.length];
    const def = LANDMARKS[type];
    const h = heightAt(cx * 64 + 32, cz * 64 + 32);
    const cl = climateAt(cx * 64 + 32, cz * 64 + 32, h);
    const w = biomeWeights(cx * 64 + 32, cz * 64 + 32, h, cl.temp, cl.moist);
    if (def.biomes.any === 1) { biomeOk++; continue; }
    const bw = Object.entries(def.biomes).reduce((t, [k, wt]) => t + wt * (w[k] || 0), 0);
    if (bw > 0.22) biomeOk++;
  }
  R.gateOk = gateOk; R.biomeOk = biomeOk;
  R.landmarksLoaded = landmarkList.length;
  R.landmarkListSample = landmarkList.slice(0, 3).map(l => l.type);
  // force-build each type once to catch builder crashes
  const rng2 = mulberry32(123);
  R.built = Object.keys(LANDMARKS).map(k => { const m = LANDMARKS[k].build(rng2); return [k, !!m]; });
  return R;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
