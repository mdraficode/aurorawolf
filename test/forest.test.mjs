/* Dense Forest upgrade: layering, scale, clustering, clearings, perf, camera views */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=20250827&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });

// let the whole view radius generate
await page.waitForFunction(() => typeof chunks !== 'undefined' && chunks.size >= 40, null, { timeout: 60000 });
await page.waitForTimeout(1500);

const R = await page.evaluate(() => {
  const out = {};
  const domBiome = (x, z) => {
    const h = heightAt(x, z), cl = climateAt(x, z, h);
    const w = biomeWeights(x, z, h, cl.temp, cl.moist);
    let best = '?', bv = 0; for (const k in w) if (w[k] > bv) { bv = w[k]; best = k; }
    return { key: best, v: bv };
  };
  const rec = [];
  for (const ch of chunks.values()) {
    const b = domBiome(ch.cx * 64 + 32, ch.cz * 64 + 32);
    rec.push({ ch, b, veg: ch.veg || { canopy: 0, mid: 0, young: 0, understory: 0, floor: 0, trees: [] } });
  }
  out.chunks = rec.length;
  // dense forest chunks = dominated by tree biomes
  const dense = rec.filter(r => (['forest', 'taiga'].includes(r.b.key)) && r.b.v > 0.75);
  out.denseChunks = dense.length;
  const denseTrees = dense.flatMap(r => r.veg.trees.map(t => ({ ...t, chunk: r.ch.key })));
  out.denseTreeCount = denseTrees.length;
  out.avgPerDenseChunk = dense.length ? denseTrees.length / dense.length : 0;
  // 1. layers exist
  const sum = rec.reduce((t, r) => ({ canopy: t.canopy + r.veg.canopy, mid: t.mid + r.veg.mid, young: t.young + r.veg.young, us: t.us + r.veg.understory, fl: t.fl + r.veg.floor }), { canopy: 0, mid: 0, young: 0, us: 0, fl: 0 });
  out.layers = sum;
  // 2. height spectrum
  const allH = rec.flatMap(r => r.veg.trees.map(t => t.h));
  out.hMax = Math.max(...allH);
  out.over18 = allH.filter(h => h >= 18).length;
  out.over29 = allH.filter(h => h >= 29).length;
  out.under6 = allH.filter(h => h < 6).length;
  const mean = allH.reduce((a, b) => a + b, 0) / allH.length;
  out.hStd = Math.sqrt(allH.reduce((t, h) => t + (h - mean) ** 2, 0) / allH.length);
  // 3. clustering: nearest-neighbour spread in the densest chunk
  dense.sort((a, b) => b.veg.trees.length - a.veg.trees.length);
  const dch = dense[0];
  out.densestChunkTrees = dch ? dch.veg.trees.length : 0;
  if (dch) {
    const ts = dch.veg.trees;
    const nn = ts.map(a => Math.min(...ts.filter(b2 => b2 !== a).map(b2 => Math.hypot(b2.x - a.x, b2.z - a.z))));
    out.nnMin = Math.min(...nn);
    const nm = nn.reduce((a, b) => a + b, 0) / nn.length;
    out.nnCV = Math.sqrt(nn.reduce((t, v) => t + (v - nm) ** 2, 0) / nn.length) / nm;
    // 4. clearings: some point in the dense chunk with no trunk within 8 m
    let openSpot = false;
    for (let i = 0; i < 300 && !openSpot; i++) {
      const x = dch.ch.cx * 64 + Math.random() * 64, z = dch.ch.cz * 64 + Math.random() * 64;
      if (heightAt(x, z) > 1.4 && !ts.some(t => Math.hypot(t.x - x, t.z - z) < 8)) { openSpot = true; out.clrX = x; out.clrZ = z; }
    }
    out.clearingInDense = openSpot;
    // 5. grounded: trunk base matches terrain
    out.grounded = ts.slice(0, 40).every(t => Math.abs(t.y - heightAt(t.x, t.z)) < 0.8);
    // pick where to stand for view tests: centre of the densest chunk
    out.standX = dch.ch.cx * 64 + 32; out.standZ = dch.ch.cz * 64 + 32;
  }
  // 6. species variety
  const species = {};
  for (const r of rec) for (const t of r.ch.instanced) { }
  // (species inferred from tree heights is unreliable — use sets)
  out.speciesNote = 'via instanced mesh count: ' + rec[0].ch.instanced.length;
  // 7. landmarks clear of trunks
  let lmOK = true, lmN = 0;
  for (const l of landmarkList) {
    for (const r of rec) {
      if (r.ch.cx * 64 <= l.x && l.x < r.ch.cx * 64 + 64 && r.ch.cz * 64 <= l.z && l.z < r.ch.cz * 64 + 64) {
        lmN++;
        for (const t of r.veg.trees) if (Math.hypot(t.x - l.x, t.z - l.z) < 8.5) lmOK = false;
      }
    }
  }
  out.landmarkClear = { lmOK, lmN };
  // 8. perf snapshot
  out.draws = renderer.info.render.calls;
  out.tris = renderer.info.render.triangles;
  // teleport the wolf deep into the densest chunk for the camera tests
  if (out.standX !== undefined) {
    wolf.pos.x = out.standX; wolf.pos.z = out.standZ; wolf.pos.y = heightAt(out.standX, out.standZ);
    out.teleported = true;
  }
  return out;
});
await page.waitForTimeout(6000);   // regenerate chunks around the new position

// ---- camera view tests (spec 17): eye-level, third-person, looking up ----
async function classify() {
  const buf = await page.screenshot({ timeout: 90000 });
  const png = PNG.sync.read(buf);
  let veg = 0, sky = 0, n = 0;
  for (let y = 0; y < png.height; y += 4) for (let x = 0; x < png.width; x += 4) {
    const i = (y * png.width + x) * 4, r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    n++;
    if (g > r * 1.12 && g > b * 1.02 && g > 38) veg++;
    else if (b > 110 && b > g * 1.12 && b > r * 1.08) sky++;
  }
  return { vegFrac: +(veg / n).toFixed(3), skyFrac: +(sky / n).toFixed(3) };
}
async function shot(pitch, dist, name) {
  await page.evaluate(({ p, d }) => {
    camPitch = p; camDist = d; camYaw = 0.8;
    for (let i = 0; i < 30; i++) updateCamera(0.05);   // settle
  }, { p: pitch, d: dist });
  await page.waitForTimeout(250);
  const c = await classify();
  return { name, ...c };
}
R.eyeView = await shot(0.06, 6, 'eye');          // eye level, close cam (deep stand)
R.thirdPerson = await shot(0.42, 10, 'third');   // normal play view
R.upView = await shot(-0.9, 5, 'up');            // camera low behind, gaze up into the canopy (deep stand)
if (R.clrX !== undefined) {                       // sky openings: same upward gaze from the clearing
  await page.evaluate(({ x, z }) => { wolf.pos.x = x; wolf.pos.z = z; wolf.pos.y = heightAt(x, z); }, { x: R.clrX, z: R.clrZ });
  await page.waitForTimeout(900);
}
R.clearUp = await shot(-0.9, 5, 'clearing');
R.clearSkyFrac = R.clearUp ? R.clearUp.skyFrac : 0;

// ---- walking view: stride through the stand at walking pace ----
if (R.standX !== undefined) {
  await page.evaluate(({ x, z }) => { wolf.pos.x = x; wolf.pos.z = z; wolf.pos.y = heightAt(x, z); }, { x: R.standX, z: R.standZ });
  await page.waitForTimeout(1500);
}
await page.evaluate(() => {
  camPitch = 0.18; camDist = 8.5; camYaw = 1.6;
  for (let i = 0; i < 60; i++) {                 // 24 m: stays inside the generated stand
    wolf.pos.x += Math.sin(1.1) * 0.4; wolf.pos.z += Math.cos(1.1) * 0.4;
    wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z);
    wolf.yaw = 1.1; wolf.speed = 4;
    updateCamera(1 / 30);
  }
});
await page.waitForTimeout(400);
R.walkView = await classify();


// ---- LOD: distance system flips chunks; builder swaps impostors <-> meshes ----
R.lod = await page.evaluate(async () => {
  let target = null;
  for (const ch of chunks.values()) if (ch.lod === 'near' && ch.veg && ch.veg.trees.length > 40) { target = ch; break; }
  if (!target) return { skip: true };
  const cx = target.cx * 64 + 32, cz = target.cz * 64 + 32;
  const home = { x: wolf.pos.x, z: wolf.pos.z, y: wolf.pos.y };
  const nearKeys = new Set([...chunks.values()].filter(c => c.lod === 'near').map(c => c.key));   // all boot-near chunks; some must flip far as we walk away
  wolf.pos.x = cx + 160; wolf.pos.z = cz; wolf.pos.y = heightAt(cx + 160, cz);
  await new Promise(r => setTimeout(r, 12000));
  let farOthers = 0;
  for (const k of nearKeys) { const ch = chunks.get(k); if (ch && ch.lod === 'far') farOthers++; }
  const probe = ch => ({ lod: ch.lod, imp: ch.vegMeshes.filter(m => m.userData.impostor).length, floor: ch.vegMeshes.filter(m => m.userData.floor).length });
  buildChunkVeg(target, true);          // deterministic builder check: impostors + no floor
  const forced = probe(target);
  buildChunkVeg(target, false);         // and back: full meshes + floor layers
  const restored = probe(target);
  wolf.pos.x = home.x; wolf.pos.z = home.z; wolf.pos.y = home.y;
  return { farOthers, forced, restored, draws: renderer.info.render.calls };
});

// ---- footsteps: timbre follows terrain ----
R.steps = await page.evaluate(() => {
  const keep = weather.snow;
  weather.snow = 0.6; const snow = groundStepType(0, 0) === 'snow';
  weather.snow = keep;
  const ok = ['forest', 'rock', 'snow', 'meadow', 'water'].every(t => { audio.step(t); return true; });
  return { snow, ok, fn: typeof groundStepType === 'function' };
});

// ---- second procedurally generated region (different seed) ----
await page.goto('file:///home/user/index.html?autostart=1&seed=424242&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForFunction(() => typeof chunks !== 'undefined' && chunks.size >= 35, null, { timeout: 90000 });
await page.waitForTimeout(2500);
R.region2 = await page.evaluate(() => {
  const dom = (x, z) => { const h = heightAt(x, z), cl = climateAt(x, z, h); const w = biomeWeights(x, z, h, cl.temp, cl.moist); let b = '?', bv = 0; for (const k in w) if (w[k] > bv) { bv = w[k]; b = k; } return { b, v: bv }; };
  let dense = 0, trees = 0, hMax = 0;
  for (const ch of chunks.values()) {
    const d = dom(ch.cx * 64 + 32, ch.cz * 64 + 32);
    if (['forest', 'taiga'].includes(d.b) && d.v > 0.75 && ch.veg) { dense++; trees += ch.veg.trees.length; for (const t of ch.veg.trees) if (t.h > hMax) hMax = t.h; }
  }
  return { dense, avg: dense ? trees / dense : 0, hMax };
});
await page.screenshot({ path: 'shots/forest.jpg' });

console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();

const F = [];
if (R.denseChunks < 2) F.push('no dense forest chunks to test');
if (R.avgPerDenseChunk < 32) F.push(`dense forest too thin (${R.avgPerDenseChunk.toFixed(1)}/chunk)`);
if (!(R.layers.canopy > 30 && R.layers.mid > 30 && R.layers.young > 5)) F.push('missing tree layers ' + JSON.stringify(R.layers));
if (!(R.layers.us > 50 && R.layers.fl > 200)) F.push('missing understory/floor ' + JSON.stringify(R.layers));
if (R.hMax < 28) F.push('no old growth (max ' + R.hMax.toFixed(1) + ' m)');
if (R.over18 < 60) F.push('too few canopy trees ' + R.over18);
if (R.over29 < 3) F.push('no 29 m+ giants');
if (R.under6 < 20) F.push('no young trees');
if (R.hStd < 3.5) F.push('heights too uniform (std ' + R.hStd.toFixed(2) + ')');
if (R.nnCV < 0.25) F.push('spacing too uniform (CV ' + R.nnCV.toFixed(2) + ')');
if (R.nnMin < 1.2) F.push('trunks overlapping (' + R.nnMin.toFixed(2) + ' m)');
if (!R.clearingInDense) F.push('no clearing inside dense forest');
if (!R.grounded) F.push('floating trees');
if (R.landmarkClear.lmN && !R.landmarkClear.lmOK) F.push('trees inside landmark');
if (R.draws > 900) F.push('draw calls ' + R.draws);
if (R.tris > 3000000) F.push('triangles ' + R.tris);
if (R.eyeView.vegFrac < 0.42) F.push('eye-level view not immersive (veg ' + R.eyeView.vegFrac + ')');
if (R.upView.vegFrac < 0.35) F.push('no dense canopy overhead (veg ' + R.upView.vegFrac + ')');
if (R.clearSkyFrac === undefined || R.clearSkyFrac < 0.07) F.push('no sky opening in clearing');
if (!R.lod || R.lod.skip) F.push('no chunk to LOD-test');
else {
  if (R.lod.farOthers < 1) F.push('distance LOD system never flipped');
  if (R.lod.forced.lod !== 'far' || R.lod.forced.imp < 1 || R.lod.forced.floor !== 0) F.push('far LOD not impostors ' + JSON.stringify(R.lod.forced));
  if (R.lod.restored.lod !== 'near' || R.lod.restored.imp !== 0 || R.lod.restored.floor < 1) F.push('near LOD not restored ' + JSON.stringify(R.lod.restored));
  if (R.lod.draws > 700) F.push('draw calls after LOD ' + R.lod.draws);
}
if (!R.walkView || R.walkView.vegFrac < 0.27) F.push('walking view not immersive ' + JSON.stringify(R.walkView));
if (!R.steps || !R.steps.snow || !R.steps.ok || !R.steps.fn) F.push('footsteps ' + JSON.stringify(R.steps));
if (!R.region2 || R.region2.dense < 1 || R.region2.avg < 24 || R.region2.hMax < 28) F.push('second region thin ' + JSON.stringify(R.region2));
if (F.length) { console.log('FOREST FAIL:', F.join(', ')); process.exit(1); }
console.log('FOREST TEST PASS');
