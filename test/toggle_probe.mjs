import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
await pg.evaluate(() => document.body.classList.add('touch'));
await pg.waitForTimeout(300);
const R = await pg.evaluate(async () => {
  const out = {};
  const T = window.__toggles;
  // 1) sprint toggle — one tap, persists after lift
  document.getElementById('tSprint').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 901, bubbles: true }));
  document.getElementById('tSprint').dispatchEvent(new PointerEvent('pointerup', { pointerId: 901, bubbles: true }));
  out.sprint = { on: T.tSprint.on, touch: touch.sprint, lock: wolf.sprintLock, lit: document.getElementById('tSprint').classList.contains('on') };
  // 2) exhaustion rebirth — drained wolf with the lock: first breath of stamina -> sprinting again
  wolf.stamina = 2; wolf.exhausted = true; wolf.swimming = false;
  const before = wolf.stamina;
  wolf.update(0.1, { f: true, b: false, l: false, r: false, sprint: true, jump: false, paused: false, mx: 0, my: 0 });
  out.rebirth = { exhaustedCleared: !wolf.exhausted, sprinting: wolf.stamina < before, stam: +wolf.stamina.toFixed(1) };
  // 3) attack toggle — bites by itself
  document.getElementById('tAttack').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 902, bubbles: true }));
  wolf.atkCd = 0;
  await new Promise(r => setTimeout(r, 350));
  out.attack = { on: T.tAttack.on, bitByItself: wolf.atkCd > 0 };
  document.getElementById('tAttack').dispatchEvent(new PointerEvent('pointerup', { pointerId: 902, bubbles: true }));
  // toggle off — silence
  document.getElementById('tAttack').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 903, bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  document.getElementById('tAttack').dispatchEvent(new PointerEvent('pointerup', { pointerId: 903, bubbles: true }));
  clearInterval(T.tAttack.iv);
  wolf.atkCd = 0;
  await new Promise(r => setTimeout(r, 350));
  out.attackOff = { on: T.tAttack.on, silent: wolf.atkCd === 0 };
  // 4) jump toggle
  document.getElementById('tJump').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 904, bubbles: true }));
  document.getElementById('tJump').dispatchEvent(new PointerEvent('pointerup', { pointerId: 904, bubbles: true }));
  out.jump = { on: T.tJump.on, space: keys.Space };
  // 5) sprint off
  document.getElementById('tSprint').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 905, bubbles: true }));
  document.getElementById('tSprint').dispatchEvent(new PointerEvent('pointerup', { pointerId: 905, bubbles: true }));
  out.sprintOff = { on: T.tSprint.on, touch: touch.sprint, lit: document.getElementById('tSprint').classList.contains('on') };
  // 6) orbit fade
  const orb = document.getElementById('mmOrbit');
  out.orbit = { rest: getComputedStyle(orb).opacity };
  document.getElementById('invBtn').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 906, bubbles: true }));
  out.orbit.awake = getComputedStyle(orb).opacity;
  out.orbit.cls = orb.className;
  await new Promise(r => setTimeout(r, 2900));
  out.orbit.backToRest = getComputedStyle(orb).opacity;
  return out;
});
console.log('TOGGLE ' + JSON.stringify({ ...R, errs }));
await b.close();
