import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], deviceScaleFactor: 4 });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1200);
const R = await pg.evaluate(async () => {
  const img = document.querySelector('#icoRun img');
  if (!img) return { err: 'no img' };
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 48, 48);
  const d = ctx.getImageData(0, 0, 48, 48).data;
  let rows = [];
  for (let y = 0; y < 48; y++) { let s = ''; for (let x = 0; x < 48; x++) s += d[(y*48+x)*4+3] > 110 ? '#' : ' '; rows.push(s); }
  const bb = document.getElementById('icoRun').getBoundingClientRect();
  const ib = img.getBoundingClientRect();
  return { rows, badge: { w: +bb.width.toFixed(0), h: +bb.height.toFixed(0) }, imgFills: +ib.width.toFixed(0) + 'x' + +ib.height.toFixed(0) };
});
console.log('MASK ' + JSON.stringify({ badge: R.badge, imgFills: R.imgFills, errs }));
writeFileSync('/tmp/live_mask.txt', R.rows.join('\n'));
await b.close();
