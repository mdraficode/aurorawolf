import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 400, height: 260 } });
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(async () => {
  let q = null; for (let i = 0; i < 10 && !q; i++) { const c = genQuest('explore'); if (c && c.lmType) q = c; }
  QUESTS.active.length = 0; QUESTS.active.push(q);
  window.__qgLock = { qid: q.id, x: wolf.pos.x + 80, z: wolf.pos.z, label: 't', kind: 'explore', an: null, pk: null, rv: null, lm: null, peak: false };
  await new Promise(r => setTimeout(r, 400));
  const g = window.questGuide();
  updateQuestArrow(0.05);   // force one tick
  const s0 = questArrowMesh.userData.segs[0].m.position;
  return { qg: g ? g.kind + ' d=' + g.d.toFixed(0) : 'null', lockAlive: !!window.__qgLock, seg0: s0.toArray().map(v => +v.toFixed(2)), wolf: [+(wolf.pos.x).toFixed(0), +(wolf.pos.z).toFixed(0)] };
});
console.log(JSON.stringify(R));
await b.close();
