import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  QUESTS.active.length = 0;
  let q = null; for (let i = 0; i < 8 && !q; i++) { const c = genQuest('explore'); if (c && c.lmType) q = c; }
  if (!q) return { skip: 'no quest' };
  QUESTS.active.push(q);
  await new Promise(r => setTimeout(r, 1200));
  const m = questArrowMesh;
  if (!m || !m.visible) return { skip: 'arrow hidden' };
  const lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const V = new THREE.Vector3();
  const projLen = () => {
    m.updateMatrixWorld(true);
    const a = V.set(0, 0, -0.9).applyMatrix4(m.matrixWorld).project(camera);
    const bx = a.x * 250, by = a.y * 160;
    const c2 = V.set(0, 0, 4.5).applyMatrix4(m.matrixWorld).project(camera);
    return Math.hypot(c2.x * 250 - bx, c2.y * 160 - by);
  };
  const yaw = m.rotation.y, pos = m.position.clone();
  const d = { x: Math.sin(yaw), z: Math.cos(yaw) };   // horizontal dir toward the quest
  const rows = [];
  for (const deg of [10, 25, 40, 60]) {
    const el = deg * Math.PI / 180, DIST = 12;
    camera.position.set(pos.x - d.x * DIST * Math.cos(el), pos.y + DIST * Math.sin(el), pos.z - d.z * DIST * Math.cos(el));
    camera.lookAt(pos.x, pos.y, pos.z);
    updateQuestArrow(0.05);
    const tiltNow = +m.rotation.x.toFixed(2);
    const tilted = projLen();
    m.rotation.x = 0; m.updateMatrixWorld(true);   // the OLD flat decal, same camera
    const flat = projLen();
    rows.push({ camDeg: deg, tilt: tiltNow, flatPx: +flat.toFixed(0), newPx: +tilted.toFixed(0), gain: +(tilted / Math.max(1, flat)).toFixed(1) });
  }
  const cd = arrowTargetColor({ mode: 'dark' }).clone(), cb = arrowTargetColor({ mode: 'bright' }).clone();
  return { rows, palette: { darkL: +lum(cd).toFixed(2), brightL: +lum(cb).toFixed(2) }, haloOp: +m.children[0].material.opacity.toFixed(2), fillOp: +m.material.opacity.toFixed(2), errs: [] };
});
console.log('BILLBOARD ' + JSON.stringify({ ...R, errs }));
await b.close();
