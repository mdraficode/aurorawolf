import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  const out = { sun: +(sun.intensity).toFixed(2) };
  // force a guidable quest
  QUESTS.active.length = 0;
  let q = null; for (let i = 0; i < 8 && !q; i++) { const c = genQuest('explore'); if (c && c.lmType) q = c; }
  if (!q) return { skip: 'no lm quest' };
  QUESTS.active.push(q);
  await new Promise(r => setTimeout(r, 1500));
  const lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const rawLum = (x, z) => {   // terrain albedo at a point, sampled the way the mesh builder does
    const h = heightAt(x, z), cl = climateAt(x, z, h), w = biomeWeights(x, z, h, cl.temp, cl.moist);
    const gr = (Math.abs(heightAt(x + 2, z) - heightAt(x - 2, z)) + Math.abs(heightAt(x, z + 2) - heightAt(x, z - 2))) / 8;
    const c = new THREE.Color(); groundColor(c, x, z, h, w, cl.temp, gr); return lum(c);
  };
  const find = want => {   // scan the world for a bright (>0.62) or dark (<0.18) patch
    for (let r = 120; r <= 900; r += 55) for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.2832, x = wolf.pos.x + Math.sin(a) * r, z = wolf.pos.z + Math.cos(a) * r;
      const L = rawLum(x, z), h = heightAt(x, z);
      if (h > 2 && h < 60 && ((want === 'bright' && L > 0.62) || (want === 'dark' && L < 0.18))) return { x, z, h, L: +L.toFixed(2) };
    }
    return null;
  };
  const snap = tag => {
    const m = questArrowMesh, st = m.userData.st;
    const fl = lum(m.material.color), Lg = window.__arrowGroundLum();
    return { tag, groundL: +Lg.toFixed(2), mode: st.mode, fillL: +fl.toFixed(2), contrast: +Math.abs(fl - Lg).toFixed(2),
      fillOp: +m.material.opacity.toFixed(2), under: m.children.length ? { op: +m.children[0].material.opacity.toFixed(2), lum: +lum(m.children[0].material.color).toFixed(2) } : null };
  };
  await new Promise(r => setTimeout(r, 800));
  out.spawn = snap('spawn');
  const go = async want => {
    const p = find(want); if (!p) return { skip: 'none found' };
    wolf.pos.x = p.x; wolf.pos.z = p.z; wolf.pos.y = heightAt(p.x, p.z) + 1;
    await new Promise(r => setTimeout(r, 3000));   // let the chunks stream in
    return { raw: p.L, ...snap(want) };
  };
  out.bright = await go('bright');
  out.dark = await go('dark');
  // formula sweep: mode contrast outside the hysteresis seam
  let worstA = 9;
  for (let L = 0; L <= 1.001; L += 0.02) {
    const fl = L > 0.47 ? 0.27 : 0.62;
    if (L < 0.3 || L > 0.58) worstA = Math.min(worstA, Math.abs(fl - L));
  }
  out.sweepWorstContrast = +worstA.toFixed(2);
  return out;
});
console.log('CONTRAST ' + JSON.stringify({ ...R, errs }));
await b.close();
