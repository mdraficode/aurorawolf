import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(() => {
  const out = {};
  // 1) boot: levels begin at 0, bar exists ABOVE the stamina bar
  out.boot = { level: wolf.level, xpNext: wolf.xpNext, maxStam: wolf.maxStam, maxHp: wolf.maxHp };
  const xw = document.getElementById('xpWrap'), sw = document.getElementById('stamWrap');
  out.bar = { exists: !!xw, topXp: xw && +getComputedStyle(xw).top.replace('px', ''), topStam: sw && +getComputedStyle(sw).top.replace('px', ''), above: xw && sw && xw.getBoundingClientRect().bottom <= sw.getBoundingClientRect().top + 1 };
  // 2) the curve: strictly harder, no cap
  out.curve = [0, 1, 2, 5, 10, 20, 50].map(L => xpNeed(L));
  out.escalates = out.curve.every((v, i) => i === 0 || v > out.curve[i - 1]);
  // 3) level-up: congratulations + exact percentages + stats
  const toasts0 = document.getElementById('toasts').textContent;
  addXp(70);
  const t1 = document.getElementById('toasts').textContent;
  const msg = t1.replace(toasts0, '').slice(0, 130);
  out.lvl1 = { level: wolf.level, maxStam: wolf.maxStam, maxHp: wolf.maxHp, xpNext: wolf.xpNext, msg, hasCongrats: /CONGRATULATIONS/i.test(msg), hasPct: /−\d+\.\d+%/.test(msg) && /\+\d+%/.test(msg) };
  // 4) DR: a level-5 wolf takes 10*0.982^5
  addXp(1000);   // push well up
  const L = wolf.level;
  wolf.invulnT = 0; wolf.hp = 200; wolf.flyT = 0; state = 'play'; wolf.deadT = 0;
  wolfTakeDamage(10, { x: wolf.pos.x + 1, z: wolf.pos.z }, 'test');
  const taken = 200 - wolf.hp;
  out.dr = { level: L, taken: +taken.toFixed(3), expect: +(10 * Math.pow(0.982, L)).toFixed(3), match: Math.abs(taken - 10 * Math.pow(0.982, L)) < 0.01 };
  // 5) the pool: regen clamps at maxStam (sprint seconds scale with it)
  wolf.stamina = 999; wolf.swimming = false; wolf.exhausted = false;
  wolf.update(0.1, input);
  out.pool = { maxStam: +wolf.maxStam.toFixed(1), clampedTo: +wolf.stamina.toFixed(1), sprintSec: +(wolf.maxStam / 15).toFixed(1) };
  // 6) death resets everything
  wolf.invulnT = 0; wolf.hp = 0.5; wolfTakeDamage(500, { x: wolf.pos.x + 1, z: wolf.pos.z }, 'test');
  out.died = wolf.deadT > 0;
  wolfRespawn();
  out.afterDeath = { level: wolf.level, xp: wolf.xp, xpNext: wolf.xpNext, maxStam: wolf.maxStam, maxHp: wolf.maxHp, hp: wolf.hp, barW: document.getElementById('xpFill').style.width };
  return out;
});
console.log('XP ' + JSON.stringify({ ...R, errs }));
await b.close();
