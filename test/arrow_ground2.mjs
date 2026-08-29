import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(async () => {
  const out = {};
  let q = null; for (let i = 0; i < 10 && !q; i++) { const c = genQuest('explore'); if (c && c.lmType) q = c; }
  if (!q) return { skip: 'no quest' };
  QUESTS.active.length = 0; QUESTS.active.push(q);
  const aimAt = async (x, z) => { window.__qgLock = { qid: QUESTS.active[0].id, x, z, label: 't', kind: 'explore', an: null, pk: null, rv: null, lm: null, peak: false }; await new Promise(r => setTimeout(r, 350)); };
  const V = new THREE.Vector3();
  const segPts = () => {   // TRUE points: every draped vertex (fill + halo) + edge midpoints, in world space
    const pts = [];
    for (const s of questArrowMesh.userData.segs) {
      s.m.updateMatrixWorld(true);
      const pa = s.m.geometry.attributes.position, n = pa.count;
      for (let i = 0; i < n; i++) {
        V.set(pa.getX(i), pa.getY(i), pa.getZ(i));
        const local = V.clone();
        V.copy(local).applyMatrix4(s.m.matrixWorld); pts.push(V.clone());
        V.copy(local).applyMatrix4(s.m.children[0].matrixWorld); pts.push(V.clone());   // halo twin — child matrix already includes the parent
        const j = (i + 1) % n;
        V.set((pa.getX(i) + pa.getX(j)) / 2, (pa.getY(i) + pa.getY(j)) / 2, (pa.getZ(i) + pa.getZ(j)) / 2).applyMatrix4(s.m.matrixWorld); pts.push(V.clone());
      }
    }
    return pts;
  };
  const gaps = () => segPts().map(w => Math.abs(w.y - heightAt(w.x, w.z)));
  let minBody = 9;
  for (const th of [0, 0.8, 1.6, 3.14, 4.2, 5.4]) {
    await aimAt(wolf.pos.x + Math.sin(th) * 80, wolf.pos.z + Math.cos(th) * 80);
    for (const w of segPts()) minBody = Math.min(minBody, Math.hypot(w.x - wolf.pos.x, w.z - wolf.pos.z));
  }
  out.minBodyClearance = +minBody.toFixed(2);
  await aimAt(wolf.pos.x + 80, wolf.pos.z);
  out.visible = questArrowMesh.visible;
  const g1 = gaps().sort((a, b) => a - b);
  out.home = { max: +g1[g1.length - 1].toFixed(3), med: +g1[(g1.length / 2) | 0].toFixed(3) };
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
    const g2 = gaps().sort((a, b) => a - b);
    out.steep = { gradeDeg: +(Math.atan2(best.g, 1) * 57.3).toFixed(0), max: +g2[g2.length - 1].toFixed(3), med: +g2[(g2.length / 2) | 0].toFixed(3) };
  }
  out.segs = questArrowMesh.userData.segs.length;
  return out;
});
console.log('GROUND2 ' + JSON.stringify({ ...R, errs }));
await b.close();
