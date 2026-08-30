import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const errs = [];
const run = async (w, h, touch) => {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await pg.waitForTimeout(1200);
  if (touch) await pg.evaluate(() => document.body.classList.add('touch'));
  const R = await pg.evaluate(() => {
    const f = document.getElementById('fsBtn').getBoundingClientRect();
    const pills = [...document.querySelectorAll('#topbar .pill')];
    const terrain = pills[pills.length - 1].getBoundingClientRect();
    const bad = [];
    for (const id of ['tPause', 'btnAI', 'questBtn', 'invBtn', 'minimap', 'hpWrap', 'questTracker']) {
      const r = document.getElementById(id).getBoundingClientRect();
      if (r.width > 0 && !(f.right <= r.left || r.right <= f.left || f.bottom <= r.top || r.bottom <= f.top)) bad.push(id);
    }
    return { besideTerrain: f.left >= terrain.right - 2 && f.left - terrain.right <= 14, sameBand: Math.abs((f.top + f.bottom) / 2 - (terrain.top + terrain.bottom) / 2) <= 8,
      gap: +(f.left - terrain.right).toFixed(1), top: +f.top.toFixed(0), shown: document.getElementById('fsBtn').classList.contains('show'), overlaps: bad,
      quietOnLoad: document.getElementById('fsBtn').style.opacity === '' };
  });
  await pg.close();
  return R;
};
const out = {};
out.desktop = await run(900, 560, false);
out.mid = await run(700, 500, false);
out.touchLand = await run(800, 390, true);
out.small = await run(680, 380, true);
// attention cycle on the main page
const pg = await b.newPage({ viewport: { width: 800, height: 390 } });
pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
await pg.click('#fsBtn').catch(() => {});
await pg.waitForTimeout(700);
out.inFS = await pg.evaluate(() => ({ fs: !!document.fullscreenElement, hidden: !document.getElementById('fsBtn').classList.contains('show') }));
await pg.evaluate(() => document.exitFullscreen());
const samples = [];
for (let i = 0; i < 9; i++) { await pg.waitForTimeout(400); samples.push(await pg.evaluate(() => document.getElementById('fsBtn').style.opacity)); }
out.blinkSamples = samples;   // varying values during the 3s, then ''
out.after3s = await pg.evaluate(() => ({ op: document.getElementById('fsBtn').style.opacity, shadow: document.getElementById('fsBtn').style.boxShadow, shown: document.getElementById('fsBtn').classList.contains('show') }));
console.log('FSRELOC ' + JSON.stringify({ ...out, blinks: new Set(samples.slice(0, 7)).size > 2, settles: samples[8] === '' || out.after3s.op === '' }));
await b.close();
