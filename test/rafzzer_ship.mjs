import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autopilot=1&seed=7777&quality=low&speed=8&rate=3&re=3', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.RAFZZER, null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const r = await pg.evaluate(() => {
  // baked-champion sanity: RAFZZER must NOT be external, badge shows GEN 1, mind is the baked one
  const snap = RAFZZER.snapshot();
  let peaks = 0, best = null;
  for (let k = 0; k < 12; k++) { const ang = k / 12 * 6.2832; for (const rr of [80, 140, 220, 330, 470]) {
    const h = heightAt(wolf.pos.x + Math.sin(ang) * rr, wolf.pos.z + Math.cos(ang) * rr);
    if (h > 50.5) { peaks++; if (!best || rr < best.r) best = { r: rr, h: +h.toFixed(1) }; } } }
  return { external: snap.external, badge: document.body.classList.contains('aiOn') ? (document.querySelector('#botPanel .badge') || {}).textContent : 'n/a',
    peaksNear: peaks, nearestThrone: best, RAFZZER_SEED_len: (window.RAFZZER_SEED || []).length };
});
await pg.waitForTimeout(100000);
const out = await pg.evaluate(() => {
  const BN = window.BOTN || {}, s = RAFZZER.snapshot();
  return { dist: +wolf.distance.toFixed(0), lvl: wolf.level, hp: +wolf.hp.toFixed(0), biteNoEffect: BN['bug-bite-no-effect'] || 0, questStalled: BN['bug-quest-stalled'] || 0, warns: (window.__boost && window.__boost.warns) || 0, ticks: (window.__boost && window.__boost.ticks) || 0, hist: s.hist };
});
console.log('SHIP ' + JSON.stringify({ ...r, ...out, errs }) + ' ' + (errs.length ? '❌' : '✅'));
await pg.close(); await b.close();
