import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=90210&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  const out = {};
  QUESTS.active.length = 0;
  let q = null; for (let i = 0; i < 8 && !q; i++) { const c = genQuest('explore'); if (c && c.lmType) q = c; }
  if (!q) return { skip: 'no lm quest' };
  QUESTS.active.push(q);
  await new Promise(r => setTimeout(r, 1500));
  const lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const rawLum = (x, z) => { const h = heightAt(x, z), cl = climateAt(x, z, h), w = biomeWeights(x, z, h, cl.temp, cl.moist);
    const gr = (Math.abs(heightAt(x + 2, z) - heightAt(x - 2, z)) + Math.abs(heightAt(x, z + 2) - heightAt(x, z - 2))) / 8;
    const c = new THREE.Color(); groundColor(c, x, z, h, w, cl.temp, gr); return lum(c); };
  // unit: both palette branches
  const cd = arrowTargetColor({ mode: 'dark' }).clone(), cb = arrowTargetColor({ mode: 'bright' }).clone();
  out.palette = { darkL: +lum(cd).toFixed(2), brightL: +lum(cb).toFixed(2) };
  // live: find the darkest patch available and settle there fully
  let best = null;
  for (let r = 120; r <= 1000; r += 55) for (let k = 0; k < 16; k++) {
    const a = k / 16 * 6.2832, x = wolf.pos.x + Math.sin(a) * r, z = wolf.pos.z + Math.cos(a) * r;
    const L = rawLum(x, z), h = heightAt(x, z);
    if (h > 2 && h < 45 && (!best || L < best.L)) best = { x, z, L };
  }
  wolf.pos.x = best.x; wolf.pos.z = best.z; wolf.pos.y = heightAt(best.x, best.z) + 1;
  await new Promise(r => setTimeout(r, 4500));   // stream + full color glide
  const m = questArrowMesh, st = m.userData.st;
  const fl = lum(m.material.color), Lg = window.__arrowGroundLum();
  out.darkPatch = { raw: +best.L.toFixed(2), groundL: +Lg.toFixed(2), mode: st.mode, fillL: +fl.toFixed(2), contrast: +Math.abs(fl - Lg).toFixed(2), fillOp: +m.material.opacity.toFixed(2), underOp: +m.children[0].material.opacity.toFixed(2) };
  return out;
});
console.log('DARK ' + JSON.stringify({ ...R, errs }));
await b.close();
