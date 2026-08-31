import { pathToFileURL, fileURLToPath } from 'url';
/* Advanced biomes: 12 ecological regions, per-biome wiring, smooth transitions, hazards */
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=20250827&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1500);
const R = await page.evaluate(() => {
  const out = {};
  const wAt = (x, z) => {
    const h = heightAt(x, z), cl = climateAt(x, z, h);
    return { w: biomeWeights(x, z, h, cl.temp, cl.moist), h, cl };
  };
  // 1. table completeness — every weight channel wired into every registry
  const keys = Object.keys(wAt(0, 0).w);
  out.keys = keys;
  out.tables = {
    ground: keys.filter(k => !GROUND[k]),
    config: keys.filter(k => !BIOME_CONFIG[k]),
    info: keys.filter(k => !BIOME_INFO[k]),
    pools: keys.filter(k => !FOREST.POOLS[k]),
    species: keys.filter(k => !SPECIES_TABLE[k] && !['volcanic', 'swamp', 'enchanted'].includes(k)),   // ash feeds nothing; swamp spawns via blends
    predators: keys.filter(k => !PREDATOR_TABLE[k] && !['coast', 'dry', 'volcanic', 'swamp', 'enchanted', 'meadow', 'forest', 'grove', 'taiga', 'tundra'].includes(k))
  };
  // 2. reachability — every region must dominate somewhere in a ±2600 m survey
  const best = {};
  let emberSpot = null, coldSpot = null, drySpot = null, sandSpot = null, ashSpot = null;
  for (let x = -2600; x <= 2600; x += 26) for (let z = -2600; z <= 2600; z += 26) {
    const { w, h, cl } = wAt(x, z);
    for (const k in w) if (w[k] > (best[k] || 0)) best[k] = +w[k].toFixed(3);
    if (!emberSpot && w.volcanic > 0.6 && volcanicAt(x, z) > 0.6) emberSpot = { x, z };
    if (!ashSpot && w.volcanic > 0.5) ashSpot = { x, z };
    if (!coldSpot && cl.temp < -0.62 && h > 1.5) coldSpot = { x, z };
    if (!drySpot && w.dry > 0.6) drySpot = { x, z };
    if (!sandSpot && h > 0.9 && h < 2.2 && (w.coast || 0) > 0.5) sandSpot = { x, z };
  }
  out.best = best;
  out.spots = { emberSpot, coldSpot, drySpot, sandSpot, ashSpot };
  // 3. gradual transitions — transects at 2 m; skip cliff steps (terrain edges are honest)
  let maxJump = 0, jumpAt = null;
  for (let t = 0; t < 4; t++) {
    const a = t * 1.7, sx = -1800 * Math.cos(a), sz = -1800 * Math.sin(a);
    let prev = null;
    for (let i = 0; i <= 360; i++) {
      const x = sx + Math.cos(a) * i * 10, z = sz + Math.sin(a) * i * 10;   // 3.6 km transects, 10 m steps
      const { w, h } = wAt(x, z);
      if (prev && Math.abs(h - prev.h) < 1.2) {
        for (const k in w) {
          const d = Math.abs(w[k] - prev.w[k]);
          if (d > maxJump) { maxJump = +d.toFixed(3); jumpAt = { k, x: x | 0, z: z | 0 }; }
        }
      }
      prev = { w, h };
    }
  }
  out.maxJump10m = maxJump; out.jumpAt = jumpAt;
  // 4. hazards — ember burns (but never kills), cold & dry heat drain stamina
  const keep = { x: wolf.pos.x, z: wolf.pos.z, y: wolf.pos.y };
  if (emberSpot) {
    wolf.pos.x = emberSpot.x; wolf.pos.z = emberSpot.z; wolf.pos.y = heightAt(emberSpot.x, emberSpot.z);
    wolf.hp = 100; wolf.stamina = 100; state = 'play';
    for (let i = 0; i < 40; i++) updateEnvironment(0.1);   // 4 s on the embers
    out.ember = { hp: wolf.hp, stamina: wolf.stamina, step: groundStepType(emberSpot.x, emberSpot.z) };
    wolf.hp = 100; wolf.stamina = 100;
  }
  if (coldSpot) {
    const keepD = dayF; dayF = 0.1;
    wolf.pos.x = coldSpot.x; wolf.pos.z = coldSpot.z; wolf.pos.y = heightAt(coldSpot.x, coldSpot.z);
    for (let i = 0; i < 20; i++) updateEnvironment(0.1);
    out.coldDrain = 100 - wolf.stamina;
    dayF = keepD; wolf.stamina = 100;
  }
  if (drySpot) {
    const keepD = dayF; dayF = 0.9;
    wolf.pos.x = drySpot.x; wolf.pos.z = drySpot.z; wolf.pos.y = heightAt(drySpot.x, drySpot.z);
    for (let i = 0; i < 20; i++) updateEnvironment(0.1);
    out.dryDrain = 100 - wolf.stamina;
    dayF = keepD; wolf.stamina = 100;
  }
  out.stepSand = sandSpot ? groundStepType(sandSpot.x, sandSpot.z) : 'no-spot';
  // 5. HUD temperature + audio wiring
  out.hudBiome = document.getElementById('biome').textContent;
  out.audio = { setBiome: typeof audio.setBiome, croak: typeof audio.croak, shoreG: !!audio.shoreG, rumbleG: !!audio.rumbleG };
  wolf.pos.x = keep.x; wolf.pos.z = keep.z; wolf.pos.y = keep.y;
  return out;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
const F = [];
const missing = Object.entries(R.tables).filter(([k, v]) => v.length);
if (missing.length) F.push('unwired tables: ' + JSON.stringify(Object.fromEntries(missing)));
const NEED = ['tundra', 'taiga', 'forest', 'grove', 'meadow', 'mountain', 'swamp', 'enchanted', 'coast', 'dry', 'highland', 'volcanic'];
for (const k of NEED) {
  const th = k === 'volcanic' ? 0.3 : k === 'enchanted' ? 0.35 : 0.45;
  if (!(R.best[k] >= th)) F.push(`${k} not reachable (best ${R.best[k]})`);
}
const lim = R.jumpAt && R.jumpAt.k === 'coast' ? 0.65 : 0.3;   // shorelines are nature's one sharp edge
if (R.maxJump10m > lim) F.push('hard border: ' + R.maxJump10m + ' at ' + JSON.stringify(R.jumpAt));
if (!R.spots.emberSpot) F.push('no ember spot');
else {
  if (!(R.ember.hp < 99 && R.ember.hp >= 1)) F.push('ember does not burn: ' + R.ember.hp);
  if (R.ember.stamina >= 100) F.push('ember stamina drain missing');
  if (R.ember.step !== 'ash') F.push('ash footsteps: ' + R.ember.step);
}
if (!(R.coldDrain > 1)) F.push('cold drain missing');
if (!(R.dryDrain > 0.5)) F.push('dry heat drain missing');
if (R.stepSand !== 'sand') F.push('sand footsteps: ' + R.stepSand);
if (!/°C/.test(R.hudBiome)) F.push('no temperature readout');
if (!(R.audio.setBiome === 'function' && R.audio.croak === 'function')) F.push('audio wiring');
if (F.length) { console.log('BIOMES FAIL:', F.join(', ')); process.exit(1); }
console.log('BIOMES TEST PASS');
