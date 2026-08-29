import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  const out = {};
  const r = id => { const b2 = document.getElementById(id).getBoundingClientRect(); return { t: +b2.top.toFixed(0), b: +b2.bottom.toFixed(0), l: +b2.left.toFixed(0), r: +b2.right.toFixed(0) }; };
  const btn = r('questBtn'), xp = r('xpWrap'), st = r('stamWrap'), hp = r('hpWrap'), ix = r('icoXp'), ir = r('icoRun'), ih = r('icoHp');
  const hit = (a, b2) => !(a.r <= b2.l || b2.r <= a.l || a.b <= b2.t || b2.b <= a.t);
  out.geo = { gapXpStam: st.t - xp.b, gapStamHp: hp.t - st.b, badgePx: ix.r - ix.l,
    btnClear: !hit(btn, ix) && !hit(btn, ir), icoLeftOfBar: ix.r <= xp.l && ir.r <= st.l && ih.r <= hp.l,
    centered: [ [ix, xp], [ir, st], [ih, hp] ].every(([i2, br]) => Math.abs((i2.t + i2.b) / 2 - (br.t + br.b) / 2) <= 6) };
  // live text
  out.before = { hp: document.getElementById('hpPct').textContent, stam: document.getElementById('stamPct').textContent, lvl: document.getElementById('xpLvl').textContent };
  wolf.hp = 61.4; wolf.stamina = 43.7; addXp(70);
  await new Promise(r2 => setTimeout(r2, 120));
  out.after = { hp: document.getElementById('hpPct').textContent, stam: document.getElementById('stamPct').textContent, lvl: document.getElementById('xpLvl').textContent, lvlFont: document.getElementById('xpLvl').style.fontSize };
  wolf.level = 123; wolf.xp = 0; wolf.xpNext = 9999; questHudDirty = true;   // long-number shrink
  await new Promise(r2 => setTimeout(r2, 120));
  out.longLvl = { txt: document.getElementById('xpLvl').textContent, font: document.getElementById('xpLvl').style.fontSize };
  return out;
});
await pg.screenshot({ path: 'shots/badges.png', clip: { x: 0, y: 0, width: 240, height: 170 } });
console.log('BADGE ' + JSON.stringify({ ...R, errs }));
await b.close();
