import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await browser.newContext({
  viewport: { width: 890, height: 420 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
const R = {};

await page.goto('file:///home/user/index.html?autostart=1&seed=1337');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 40000 });
await page.waitForTimeout(600);

// touch UI auto-detected?
R.touchBody = await page.evaluate(() => document.body.classList.contains('touch'));
R.touchUIVisible = await page.evaluate(() => getComputedStyle(document.getElementById('touchUI')).display);
R.joyVisible = await page.evaluate(() => {
  const j = document.getElementById('joy');
  const r = j.getBoundingClientRect();
  return r.width > 0;
});

// ---- camera drag speed & smoothness ----
const camBefore = await page.evaluate(() => camYaw.toFixed(3));
await page.mouse.move(600, 180);
await page.mouse.down();
await page.mouse.move(300, 190, { steps: 10 });
await page.mouse.up();
const camAfterRaw = await page.evaluate(() => camYaw.toFixed(3));
await page.waitForTimeout(350);
const camConv = await page.evaluate(() => Math.abs(wrapPI(camYaw - viewYaw)).toFixed(4));
R.camDrag = { before: camBefore, after: camAfterRaw, converged: camConv };

// ---- joystick movement ----
const distBefore = await page.evaluate(() => wolf.distance.toFixed(1));
const jb = await page.locator('#joy').boundingBox();
const jx = jb.x + jb.width / 2, jy = jb.y + jb.height / 2;
await page.mouse.move(jx, jy);
await page.mouse.down();
await page.mouse.move(jx, jy - 44, { steps: 6 });   // push forward
await page.waitForTimeout(1600);
const joyState = await page.evaluate(() => ({ x: joy.x.toFixed(2), y: joy.y.toFixed(2), mag: joy.mag.toFixed(2), my: input.my.toFixed(2) }));
const distMid = await page.evaluate(() => wolf.distance.toFixed(1));
const speedMid = await page.evaluate(() => wolf.speed.toFixed(1));
await page.mouse.move(jx + 40, jy, { steps: 6 });   // push right (strafe)
await page.waitForTimeout(500);
await page.mouse.up();
const joyReleased = await page.evaluate(() => ({ mag: joy.mag, mx: input.mx }));
R.joy = { distBefore, distMid, speedMid, state: joyState, released: joyReleased };

// ---- buttons: sprint hold, gather, jump, pause ----
await page.evaluate(() => {
  for (const ch of chunks.values())
    for (const p of ch.pickups)
      if (!p.gathered) { wolf.pos.set(p.x + 0.8, p.y + 0.6, p.z); return; }
});
await page.waitForTimeout(300);
await page.locator('#tGather').dispatchEvent('pointerdown');
await page.waitForTimeout(200);
R.gatherInv = await page.evaluate(() => inv.berry + inv.mushroom + inv.herb + inv.wood + inv.stone);

const sprintHold = await page.evaluate(() => new Promise(res => {
  const b = document.getElementById('tSprint');
  b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, bubbles: true }));
  setTimeout(() => { res(touch.sprint); b.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, bubbles: true })); }, 250);
}));
R.sprintHold = sprintHold;

await page.locator('#tPause').dispatchEvent('pointerdown');
await page.waitForTimeout(300);
R.paused = await page.evaluate(() => state);
await page.locator('#btnResume').click({ force: true }).catch(() => {});
await page.waitForTimeout(250);
R.resumed = await page.evaluate(() => state);

await page.screenshot({ path: 'shots/15_touch.png' });

// ---- controls stay out of the way until touched ----
// (SwiftShader frames are slow — wait for the transitions, not the clock)
await page.waitForFunction(() => {
  const j = document.getElementById('joy');
  return !j.classList.contains('live') && getComputedStyle(j).opacity === '0';
}, null, { timeout: 20000 });
R.joyHidden = await page.evaluate(() => getComputedStyle(document.getElementById('joy')).opacity);
const jb2 = await page.locator('#joy').boundingBox();
await page.mouse.move(jb2.x + jb2.width / 2, jb2.y + jb2.height / 2);
await page.mouse.down();
await page.waitForFunction(() => getComputedStyle(document.getElementById('joy')).opacity > 0.9, null, { timeout: 20000 });
R.joyLive = await page.evaluate(() => getComputedStyle(document.getElementById('joy')).opacity);
await page.mouse.up();
await page.waitForFunction(() => getComputedStyle(document.getElementById('joy')).opacity === '0', null, { timeout: 20000 });
R.joyFaded = await page.evaluate(() => getComputedStyle(document.getElementById('joy')).opacity);
R.btnFaint = await page.evaluate(() => getComputedStyle(document.getElementById('tAttack')).opacity);
await page.locator('#tHowl').dispatchEvent('pointerdown');
await page.waitForFunction(() => {
  const h = getComputedStyle(document.getElementById('tHowl')).opacity;
  const a = getComputedStyle(document.getElementById('tAttack')).opacity;
  return h > 0.9 && a > 0.9;
}, null, { timeout: 20000 });
R.btnAwake = await page.evaluate(() => ({
  howl: getComputedStyle(document.getElementById('tHowl')).opacity,
  attack: getComputedStyle(document.getElementById('tAttack')).opacity
}));
await page.locator('#tHowl').dispatchEvent('pointerup');
await page.waitForFunction(() => getComputedStyle(document.getElementById('tAttack')).opacity < 0.4, null, { timeout: 20000 });
R.btnFaded = await page.evaluate(() => getComputedStyle(document.getElementById('tAttack')).opacity);
R.faintControls = {
  joyHiddenAtRest: +R.joyHidden < 0.1,
  joyVisibleWhileHeld: +R.joyLive > 0.9,
  joyFadesAfterRelease: +R.joyFaded < 0.1,
  buttonsFaintAtRest: +R.btnFaint < 0.4,
  buttonsWakeOnTouch: +R.btnAwake.howl > 0.9 && +R.btnAwake.attack > 0.9,
  buttonsFadeAfterIdle: +R.btnFaded < 0.4
};
console.log('faintControls:', JSON.stringify(R.faintControls));

R.errors = errors;
console.log(JSON.stringify(R, null, 1));
await browser.close();
