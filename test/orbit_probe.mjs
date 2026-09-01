import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 560 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(() => {
  const out = {};
  out.statsGone = !document.getElementById('topStats') && !document.getElementById('statSeed');
  const r = id => { const b2 = document.getElementById(id).getBoundingClientRect(); return { id, cx: (b2.left + b2.right) / 2, cy: (b2.top + b2.bottom) / 2, t: b2.top, r: b2.right, w: b2.width }; };
  const mm = r('minimap'), inv = r('invBtn'), q = r('questBtn'), ai = r('btnAI'), pz = r('tPause');
  const C = { x: mm.cx, y: mm.cy };
  const pol = b2 => { const dx = b2.cx - C.x, dy = b2.cy - C.y; return { d: Math.hypot(dx, dy), ang: Math.atan2(dy, -dx) * 57.296 }; };  // 0=due west, 90=due south
  out.mm = { top: mm.t, rightGap: +(innerWidth - mm.r).toFixed(0) };
  const pi = pol(inv), pq = pol(q), pa = pol(ai), pp = pol(pz);
  out.arc = [ { b: 'inv', ...pi }, { b: 'quest', ...pq }, { b: 'ai', ...pa }, { b: 'pause', ...pp } ];
  out.orderAlongArc = pi.ang < pq.ang && pq.ang < pa.ang && pa.ang < pp.ang;   // west -> south sweep
  out.onLowerLeft = [pi, pq, pa, pp].every(p2 => p2.ang > -5 && p2.ang < 95 && p2.d > 60 && p2.d < 130);
  const ov = (a, b2) => !(a.r <= b2.cx - b2.w / 2 || b2.cx + b2.w / 2 <= a.r <= 1e9 ? false : false);  // simplified below
  const discs = [ [inv, 21], [q, 21], [ai, 21], [pz, 21], [mm, 71] ];   // round buttons around a round map
  let minGap = 1e9;
  for (let i = 0; i < discs.length; i++) for (let j = i + 1; j < discs.length; j++) {
    const [A, ra] = discs[i], [B, rb] = discs[j];
    minGap = Math.min(minGap, Math.hypot(A.cx - B.cx, A.cy - B.cy) - ra - rb);
  }
  out.minDiscGap = +minGap.toFixed(1);
  out.pauseVisible = getComputedStyle(document.getElementById('tPause')).display !== 'none';
  return out;
});
console.log('ORBIT ' + JSON.stringify({ ...R, errs }));
await b.close();
