import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(async () => {
  const out = {};
  let q = null; for (let i = 0; i < 10 && !q; i++) { const c = genQuest('explore'); if (c && c.lmType) q = c; }
  if (!q) return { skip: 'no quest' };
  QUESTS.active.length = 0; QUESTS.active.push(q);
  const aimAt = async (x, z) => { window.__qgLock = { qid: QUESTS.active[0].id, x, z, label: 't', kind: 'explore', an: null, pk: null, rv: null, lm: null, peak: false }; await new Promise(r => setTimeout(r, 350)); };
  const V = new THREE.Vector3();
  const segPts = () => questArrowMesh.userData.segs.flatMap(s => {
    const w = s.w * 1.22 + 0.01, z0 = s.z0 * 1.1 - 0.01, z1 = s.z1 * 1.1 + 0.01;
    return [[-w, z0], [w, z0], [-w, z1], [w, z1], [0, (s.z0 + s.z1) / 2]]
      .map(([x, z]) => { s.m.updateMatrixWorld(true); return V.set(x, 0, z).applyMatrix4(s.m.matrixWorld).clone(); });
  });
  const gaps = () => segPts().map(w => Math.abs(w.y - heightAt(w.x, w.z)));
  // 1) clearance sweep — real outline incl. halo margins, six bearings
  let minBody = 9;
  for (const th of [0, 0.8, 1.6, 3.14, 4.2, 5.4]) {
    await aimAt(wolf.pos.x + Math.sin(th) * 80, wolf.pos.z + Math.cos(th) * 80);
    for (const w of segPts()) minBody = Math.min(minBody, Math.hypot(w.x - wolf.pos.x, w.z - wolf.pos.z));
  }
  out.minBodyClearance = +minBody.toFixed(2);
  // 2) home terrain conformity (rugged spawn hillside)
  await aimAt(wolf.pos.x + 80, wolf.pos.z);
  out.homeMaxGap = +Math.max(...gaps()).toFixed(3); out.homeMedGap = +gaps().sort((a2, b2) => a2 - b2)[Math.floor(gaps().length / 2)].toFixed(3);
  // 3) steepest ground — teleport, stream, re-measure
  let best = null;
  for (let r = 60; r <= 700; r += 45) for (let k = 0; k < 14; k++) {
    const a = k / 14 * 6.2832, x = wolf.pos.x + Math.sin(a) * r, z = wolf.pos.z + Math.cos(a) * r;
    const g = Math.hypot(heightAt(x + 4, z) - heightAt(x - 4, z), heightAt(x, z + 4) - heightAt(x, z - 4)) / 8;
    if (g > 0.55 && (!best || g > best.g)) best = { x, z, g };
  }
  if (best) {
    wolf.pos.x = best.x; wolf.pos.z = best.z; wolf.pos.y = heightAt(best.x, best.z) + 1;
    await new Promise(r => setTimeout(r, 3500));
    await aimAt(wolf.pos.x + 80, wolf.pos.z);
    out.steep = { gradeDeg: +(Math.atan2(best.g, 1) * 57.3).toFixed(0), maxGap: +Math.max(...gaps()).toFixed(3) };
    // and straight DOWN the fall line — the harshest drape
    const gx = heightAt(best.x + 4, best.z) - heightAt(best.x - 4, best.z), gz = heightAt(best.x, best.z + 4) - heightAt(best.x, best.z - 4);
    await aimAt(best.x - gx * 20, best.z - gz * 20);
    out.steepFallLine = { maxGap: +Math.max(...gaps()).toFixed(3) };
  }
  out.segs = questArrowMesh.userData.segs.length;
  return out;
});
console.log('GROUND ' + JSON.stringify({ ...R, errs }));
await b.close();
