import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  // force a guidable explore quest
  QUESTS.active.length = 0;
  const q = genQuest('explore'); if (!q.lmType) return { skip: 'peak-quest', lmTypes: landmarkList.slice(0, 3).map(l => l.type) };
  QUESTS.active.push(q); QUESTS.dirty = true; questHudDirty = true;
  await new Promise(r => setTimeout(r, 1200));
  const qg = window.questGuide();
  let mesh = null; scene.traverse(o => { if (o.geometry && o.geometry.attributes && o.geometry.attributes.position && o.geometry.attributes.position.count === 9 && o.material && o.material.transparent) mesh = o; });
  return { guide: qg ? qg.kind + ' ' + qg.d.toFixed(0) + 'm' : 'none',
    arrow: mesh ? { scaleZ: mesh.scale.z, depthTest: mesh.material.depthTest, order: mesh.renderOrder, visible: mesh.visible, opacity: mesh.material.opacity } : null };
});
console.log('ARROW ' + JSON.stringify({ ...R, errs }));
await b.close();
