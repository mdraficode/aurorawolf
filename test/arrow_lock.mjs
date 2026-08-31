import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(async () => {
  const out = {};
  // two quests: an explore-landmark and a hunt — the old guide flip-flopped between these
  QUESTS.active.length = 0; window.__qgLock = null;
  let lm = null; for (let i = 0; i < 10 && !lm; i++) { const c = genQuest('explore'); if (c && c.lmType) lm = c; }
  let hq = null; for (let i = 0; i < 10 && !hq; i++) { const c = genQuest('hunt'); if (c && c.species) hq = c; }
  if (!lm || !hq) return { skip: !lm ? 'no lm' : 'no hunt' };
  QUESTS.active.push(lm, hq);
  await new Promise(r => setTimeout(r, 800));
  const walk = async (steps, dx, dz) => { const seen = []; for (let i = 0; i < steps; i++) { wolf.pos.x += dx; wolf.pos.z += dz; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 1; await new Promise(r => setTimeout(r, 350)); const g = window.questGuide(); seen.push(g ? g.kind + '@' + g.x.toFixed(0) + ',' + g.z.toFixed(0) : 'null'); } return seen; };
  out.phase1 = await walk(10, 2.2, 1.4);           // walking — target must stay IDENTICAL
  out.lockStable = new Set(out.phase1).size === 1;
  const L = window.__qgLock;
  out.lockKind = L && L.kind;
  // arrive at the locked place (<9 m) — must hand off to a NEW committed target
  if (L) {
    wolf.pos.x = L.x + 4; wolf.pos.z = L.z; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 1;
    await new Promise(r => setTimeout(r, 400));
    const g2 = window.questGuide();
    out.afterArrive = g2 ? g2.kind + '@' + g2.x.toFixed(0) + ',' + g2.z.toFixed(0) : 'null';
    out.handedOff = !g2 || g2.kind !== L.kind || Math.hypot(g2.x - L.x, g2.z - L.z) > 1;
    // hunt lock: the quarry itself moves — the arrow must follow THAT animal
    if (window.__qgLock && window.__qgLock.an) {
      const an = window.__qgLock.an;
      an.pos.x += 40; an.pos.z -= 25;              // the quarry bolts
      const g3 = window.questGuide();
      out.followsSameAnimal = g3 && Math.hypot(g3.x - an.pos.x, g3.z - an.pos.z) < 0.5;
    } else out.followsSameAnimal = 'no-an-lock(' + (window.__qgLock ? window.__qgLock.kind : 'null') + ')';
  }
  // arrow origin: tail must start AHEAD of the wolf — never under/through the body
  await new Promise(r => setTimeout(r, 600));
  const m = questArrowMesh;
  if (m && m.visible) {
    m.updateMatrixWorld(true);
    const v = new THREE.Vector3(0, 0, -0.8).applyMatrix4(m.matrixWorld);   // tail tip
    const fwd = Math.sin(m.rotation.y) * (v.x - wolf.pos.x) + Math.cos(m.rotation.y) * (v.z - wolf.pos.z);
    out.tailFwdOfWolf = +fwd.toFixed(2);   // > 0 = in front of the wolf's center — "coming from beneath it"
    out.tailDist = +Math.hypot(v.x - wolf.pos.x, v.z - wolf.pos.z).toFixed(2);
  } else out.tailFwdOfWolf = 'arrow-hidden';
  return out;
});
console.log('LOCK ' + JSON.stringify({ ...R, errs }));
await b.close();
