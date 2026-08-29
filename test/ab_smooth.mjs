// A/B smoothness+crash probe: node test/ab_smooth.mjs <url> [seconds]
import { chromium } from 'playwright';
const URL = process.argv[2], DUR = +(process.argv[3] || 300);
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 256, height: 144 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(URL + '&autopilot=1', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
await pg.evaluate(() => {   // per-frame camera recorder
  window.__y = [];
  const rec = () => { window.__y.push(camYaw); if (window.__y.length < 4000) requestAnimationFrame(rec); };
  requestAnimationFrame(rec);
});
await pg.waitForTimeout(DUR * 1000);
const R = await pg.evaluate(() => {
  const y = window.__y, d = [];
  for (let i = 1; i < y.length; i++) d.push(Math.abs(y[i] - y[i - 1]));
  d.sort((a, b2) => a - b2);
  const mean = d.reduce((s, v) => s + v, 0) / (d.length || 1);
  const p95 = d[Math.floor(d.length * 0.95)] || 0;
  const L = window.BOTLOG || [];
  const hpLoss = L.filter(e => e.type === 'hp-loss').length;
  const jumps = d.filter(v => v > 0.12).length;   // lurches per session
  return { frames: y.length, meanYawStep: +mean.toFixed(4), p95: +p95.toFixed(3), lurches: jumps, lurchRate: +(jumps / (y.length / 60)).toFixed(2), hpLoss, dist: Math.round(wolf.distance), crashesPer100m: +(hpLoss / Math.max(1, wolf.distance / 100)).toFixed(2) };
});
console.log('AB ' + JSON.stringify({ ...R, errs: errs.length }));
await b.close();
