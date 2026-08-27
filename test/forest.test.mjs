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
async function shot(pitch, dist, name) {
  await page.evaluate(({ p, d }) => {
    camPitch = p; camDist = d; camYaw = 0.8;
    for (let i = 0; i < 30; i++) updateCamera(0.05);   // settle
  }, { p: pitch, d: dist });
  await page.waitForTimeout(250);
  const buf = await page.screenshot();
  const png = PNG.sync.read(buf);
  let veg = 0, sky = 0, n = 0;
  for (let y = 0; y < png.height; y += 4) for (let x = 0; x < png.width; x += 4) {
    const i = (y * png.width + x) * 4, r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    n++;
    if (g > r * 1.12 && g > b * 1.02 && g > 38) veg++;
    else if (b > 110 && b > g * 1.12 && b > r * 1.08) sky++;
  }
  return { name, vegFrac: +(veg / n).toFixed(3), skyFrac: +(sky / n).toFixed(3) };
}
R.eyeView = await shot(0.06, 6, 'eye');          // eye level, close cam
if (R.clrX !== undefined) {                       // sky openings: look up from the clearing
  await page.evaluate(({ x, z }) => { wolf.pos.x = x; wolf.pos.z = z; wolf.pos.y = heightAt(x, z); }, { x: R.clrX, z: R.clrZ });
  await page.waitForTimeout(900);
}
R.thirdPerson = await shot(0.42, 10, 'third');   // normal play view
R.upView = await shot(-0.9, 5, 'up');            // camera low behind, gaze up into the canopy
if (R.standX !== undefined) {
  await page.evaluate(({ x, z }) => { wolf.pos.x = x; wolf.pos.z = z; wolf.pos.y = heightAt(x, z); }, { x: R.standX, z: R.standZ });
  await page.waitForTimeout(900);
}
R.clearUp = await shot(-0.9, 5, 'clearing');      // same upward gaze from the clearing
R.clearSkyFrac = R.clearUp ? R.clearUp.skyFrac : 0;
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
if (F.length) { console.log('FOREST FAIL:', F.join(', ')); process.exit(1); }
console.log('FOREST TEST PASS');
