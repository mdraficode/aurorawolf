import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 400, height: 260 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(() => {
  try { updateQuestArrow(0.05); return { ok: true, pos: questArrowMesh.userData.segs[0].m.position.toArray().map(v => +v.toFixed(1)) }; }
  catch (e) { return { ok: false, err: e.message, stack: (e.stack || '').split('\n')[1] }; }
});
console.log('ERR ' + JSON.stringify({ ...R, errs }));
await b.close();
