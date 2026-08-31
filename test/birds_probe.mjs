import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 400, height: 250 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=8080&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const r = await pg.evaluate(() => {
  for (let i = 0; i < 600; i++) updateBirds(0.05);   // 30 sim-seconds
  const states = BIRDS.list.map(b2 => b2.state);
  const ys = BIRDS.list.map(b2 => +b2.mesh.position.y.toFixed(1));
  const perched = BIRDS.list.filter(b2 => b2.state === 'perch').length;
  const grounded = BIRDS.list.filter(b2 => b2.state === 'ground').length;
  return { n: BIRDS.list.length, states: states.join(','), perched, grounded, ys: ys.join(','), sky: ys.filter(y => y > 8).length };
});
console.log('BIRDS ' + JSON.stringify({ ...r, errs }));
await b.close();
