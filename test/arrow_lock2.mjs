import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(async () => {
  QUESTS.active.length = 0; window.__qgLock = null;
  let lm = null; for (let i = 0; i < 10 && !lm; i++) { const c = genQuest('explore'); if (c && c.lmType) lm = c; }
  let hq = null; for (let i = 0; i < 10 && !hq; i++) { const c = genQuest('hunt'); if (c && c.species) hq = c; }
  QUESTS.active.push(lm, hq);
  await new Promise(r => setTimeout(r, 600));
  const g1 = window.questGuide();
  if (!(window.__qgLock && window.__qgLock.an)) return { skip: 'no an lock', kind: g1 && g1.kind };
  const before = { x: window.__qgLock.x, z: window.__qgLock.z };
  window.__qgLock.an.dead = true;                    // the quarry falls
  const g2 = window.questGuide();
  return { was: 'hunt', now: g2 ? g2.kind + '@' + g2.x.toFixed(0) + ',' + g2.z.toFixed(0) : 'null',
    switched: !g2 || g2.kind !== 'hunt' || Math.hypot(g2.x - before.x, g2.z - before.z) > 1 };
});
console.log('LOCK2 ' + JSON.stringify(R));
await b.close();
