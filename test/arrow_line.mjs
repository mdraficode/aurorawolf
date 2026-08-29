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
  window.__qgLock = { qid: q.id, x: wolf.pos.x + 90, z: wolf.pos.z, label: 't', kind: 'explore', an: null, pk: null, rv: null, lm: null, peak: false };
  await new Promise(r => setTimeout(r, 400));
  const ud = questArrowMesh.userData;
  ud.matFill.color.setRGB(1, 0, 1); ud.matFill.opacity = 1;   // probe paint: unmistakable on any ground
  const cv = renderer.domElement;
  const shot = () => {   // OUR camera, both render passes, synchronous pixel readback
    renderer.render(scene, camera);
    if (questArrowMesh.visible) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(arrowScene, camera); renderer.autoClear = true; }
    const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
    c2.getContext('2d').drawImage(cv, 0, 0);
    return c2.getContext('2d');
  };
  const mag = (ctx, sx, sy) => { const x0 = Math.max(0, sx - 2), y0 = Math.max(0, sy - 2); const d = ctx.getImageData(x0, y0, 5, 5).data; for (let i = 0; i < d.length; i += 4) if (d[i] > 170 && d[i + 2] > 170 && d[i + 1] < 120) return true; return false; };
  const V = new THREE.Vector3();
  const px = (ctx, wx2, wy2, wz2) => { V.set(wx2, wy2, wz2).project(camera); return { x: ((V.x + 1) / 2 * cv.width) | 0, y: ((1 - V.y) / 2 * cv.height) | 0 }; };
  const yaw = ud.ribbon.rotation.y, bx2 = Math.sin(yaw), bz2 = Math.cos(yaw);
  const gy = wx2 => heightAt(wx2, wolf.pos.z + bz2 * ((wx2 - wolf.pos.x) / (bx2 || 1e-9)));
  const at = d2 => { const x = wolf.pos.x + bx2 * d2, z = wolf.pos.z + bz2 * d2; return { x, y: heightAt(x, z) + 0.1, z }; };
  // C) drape: every vertex on the ground
  const pa = ud.ribbon.geometry.attributes.position; const gaps = [];
  for (let i = 0; i < pa.count; i++) gaps.push(Math.abs(pa.getY(i) - heightAt(ud.ribbon.position.x + pa.getX(i) * bz2 + pa.getZ(i) * bx2, ud.ribbon.position.z - pa.getX(i) * bx2 + pa.getZ(i) * bz2)) - 0);
  gaps.sort((a, b2) => a - b2);
  out.drape = { verts: pa.count, med: +gaps[(gaps.length / 2) | 0].toFixed(3), max: +gaps[gaps.length - 1].toFixed(3) };
  // A) ONE stretched line: top-down walk from past the silhouette to the tip — every step must be magenta
  camera.position.set(wolf.pos.x + bx2 * 2.6, heightAt(wolf.pos.x, wolf.pos.z) + 34, wolf.pos.z + bz2 * 2.6);
  camera.lookAt(wolf.pos.x + bx2 * 2.6, heightAt(wolf.pos.x, wolf.pos.z), wolf.pos.z + bz2 * 2.6);
  camera.updateMatrixWorld(true);
  const ctx = shot();
  let broken = [], n = 0;
  for (let d2 = 1.55; d2 <= 4.9; d2 += 0.12) { const w = at(d2); const p2 = px(ctx, w.x, w.y, w.z); n++; if (!mag(ctx, p2.x, p2.y)) broken.push(+d2.toFixed(2)); }
  out.continuity = { sampled: n, brokenAt: broken };
  // B) the wolf overlaps the arrow: camera low BEHIND, looking forward through the body
  camera.position.set(wolf.pos.x - bx2 * 6, heightAt(wolf.pos.x - bx2 * 6, wolf.pos.z - bz2 * 6) + 1.4, wolf.pos.z - bz2 * 6);
  camera.lookAt(wolf.pos.x + bx2 * 5, heightAt(wolf.pos.x, wolf.pos.z) + 0.6, wolf.pos.z + bz2 * 5);
  camera.updateMatrixWorld(true);
  const ctx2 = shot();
  const under = at(0.7), beyond = at(3.0);
  const pu = px(ctx2, under.x, under.y, under.z), pb = px(ctx2, beyond.x, beyond.y, beyond.z);
  out.occl = { tailUnderWolfHidden: !mag(ctx2, pu.x, pu.y), shaftBeyondVisible: mag(ctx2, pb.x, pb.y) };
  return out;
});
console.log('LINE ' + JSON.stringify({ ...R, errs }));
await b.close();
