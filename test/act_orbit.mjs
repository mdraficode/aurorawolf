import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const run = async (w, h, touch) => {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await pg.waitForTimeout(1200);
  if (touch) await pg.evaluate(() => document.body.classList.add('touch'));
  const R = await pg.evaluate(() => {
    const r = id => { const x = document.getElementById(id).getBoundingClientRect(); return { id, cx: x.left + x.width / 2, cy: x.top + x.height / 2, rr: x.width / 2, w: x.width, t: x.top, l: x.left, b2: x.bottom, r2: x.right }; };
    const A = r('tAttack'), sats = ['tGather', 'tJump', 'tSprint', 'tProwl', 'tHowl', 'tSense'].map(r);
    const mm = document.getElementById('minimap').getBoundingClientRect();
    const arc = sats.map(s => { const dx = s.cx - A.cx, dy = s.cy - A.cy; return { id: s.id, ang: Math.atan2(-dy, -dx) * 57.3, d: +Math.hypot(dx, dy).toFixed(0) }; });
    let minGap = 1e9;
    for (let i = 0; i < sats.length; i++) { minGap = Math.min(minGap, Math.hypot(sats[i].cx - A.cx, sats[i].cy - A.cy) - sats[i].rr - A.rr);
      for (let j = i + 1; j < sats.length; j++) minGap = Math.min(minGap, Math.hypot(sats[i].cx - sats[j].cx, sats[i].cy - sats[j].cy) - sats[i].rr - sats[j].rr); }
    return { attack: { w: +A.w.toFixed(0), rightGap: +(innerWidth - A.r2).toFixed(0), bottomGap: +(innerHeight - A.b2).toFixed(0) },
      minimapW: mm.width > 0 ? mm.width : 'hidden',
      biggerThanMap: mm.width > 0 ? A.w > mm.width : null, ratio: mm.width > 0 ? +(A.w / mm.width).toFixed(2) : null,
      arc, archOK: arc.every(a2 => a2.ang > -20 && a2.ang < 105), orderOK: arc.every((a2, i) => i === 0 || a2.ang > arc[i - 1].ang),
      minGap: +minGap.toFixed(1), insideViewport: sats.every(s => s.l >= 0 && s.t >= 0 && s.r2 <= innerWidth && s.b2 <= innerHeight),
      clearOfJoystick: A.l > innerWidth * 0.4 };
  });
  await pg.close();
  return R;
};
console.log('ACT ' + JSON.stringify({ desktop: await run(900, 560, false), touchLandscape: await run(800, 390, true), portrait: await run(390, 844, true) }));
await b.close();
