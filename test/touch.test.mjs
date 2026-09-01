import { pathToFileURL, fileURLToPath } from 'url';
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

await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=1337');
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

await page.screenshot({ path: 'shots/15_touch.png', timeout: 90000 }).catch(() => {});

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

// ---- joystick halo: a near-miss thumb still grabs the stick ----
await page.waitForFunction(() => getComputedStyle(document.getElementById('joy')).opacity === '0', null, { timeout: 20000 });
const jc = await page.evaluate(() => {
  const r = document.getElementById('joy').getBoundingClientRect();
  const z = document.getElementById('joyZone').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, ringR: r.width / 2, zoneL: z.left, zoneR: z.right, left: r.left };
});
await page.mouse.move(jc.x + jc.ringR + 42, jc.y + 18);   // outside the ring, inside the halo
await page.mouse.down();
await page.waitForFunction(() => joy.id !== null && document.getElementById('joy').classList.contains('live'), null, { timeout: 20000 });
R.haloActivated = true;
await page.mouse.move(jc.x + 12, jc.y - 24, { steps: 4 });
await page.waitForTimeout(500);
R.haloSteers = await page.evaluate(() => joy.mag > 0.1);
await page.mouse.up();
await page.waitForFunction(() => joy.id === null && joy.mag === 0, null, { timeout: 20000 });
R.haloReleased = true;
R.joyHalo = {
  ringMovedRight: jc.left >= 80,
  zoneWiderThanRing: jc.zoneR - jc.zoneL > 200,
  nearMissActivates: R.haloActivated,
  nearMissSteers: R.haloSteers,
  releasesClean: R.haloReleased
};
console.log('joyHalo:', JSON.stringify(R.joyHalo));

// ---- multitouch: buttons lock on press, slide-off becomes camera, both at once ----
{
  const yaw0 = await page.evaluate(() => camYaw);
  // press SPRINT, slide the finger far away from the button
  const spr = await page.evaluate(() => {
    const b = document.getElementById('tSprint');
    const r = b.getBoundingClientRect();
    const ev = (t2, x, y) => b.dispatchEvent(new PointerEvent(t2, { pointerId: 21, bubbles: true, clientX: x, clientY: y }));
    ev('pointerdown', r.left + r.width / 2, r.top + r.height / 2);
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  await page.waitForTimeout(350);
  const heldOff = await page.evaluate(spr => {
    const b = document.getElementById('tSprint');
    // captured pointer: moves keep arriving at the button even far away
    for (let i = 1; i <= 12; i++) b.dispatchEvent(new PointerEvent('pointermove', { pointerId: 21, bubbles: true, clientX: spr.cx + i * 18, clientY: spr.cy - i * 10 }));
    return { sprintStillOn: touch.sprint === true, onClass: b.classList.contains('on'), lens: camPointers.size };
  }, spr);
  await page.waitForTimeout(500);
  const panned = await page.evaluate(() => camYaw);
  // a SECOND finger pans on the canvas while the button finger stays held
  await page.evaluate(() => {
    const cv2 = renderer.domElement;
    cv2.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 22, bubbles: true, clientX: 300, clientY: 180 }));
    for (let i = 1; i <= 8; i++) window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 22, bubbles: true, clientX: 300 - i * 14, clientY: 180 }));
  });
  await page.waitForTimeout(450);
  const after2nd = await page.evaluate(() => ({ yaw: camYaw, sprint: touch.sprint, lens: camPointers.size }));
  // lifting the button finger releases the hold
  await page.evaluate(() => {
    document.getElementById('tSprint').dispatchEvent(new PointerEvent('pointerup', { pointerId: 21, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 22, bubbles: true }));
  });
  await page.waitForTimeout(350);
  const released = await page.evaluate(() => ({ sprint: touch.sprint, lens: camPointers.size }));
  // sliding over another button must not fire it
  const stray = await page.evaluate(() => {
    let atks = 0;
    const o = wolf.attack; wolf.attack = () => { atks++; return o.apply(wolf, arguments); };
    const b = document.getElementById('tJump');
    const r = b.getBoundingClientRect();
    b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 23, bubbles: true, clientX: r.left + 5, clientY: r.top + 5 }));
    for (let i = 1; i <= 6; i++) b.dispatchEvent(new PointerEvent('pointermove', { pointerId: 23, bubbles: true, clientX: r.left + 5 + i * 25, clientY: r.top + 5 }));
    b.dispatchEvent(new PointerEvent('pointerup', { pointerId: 23, bubbles: true }));
    wolf.attack = o;
    return atks;
  });
  R.multitouch = {
    holdKeptAfterSlideOff: heldOff.sprintStillOn && heldOff.onClass,
    slideOffPansCamera: Math.abs(panned - yaw0) > 0.05,
    handedToLens: heldOff.lens === 1,
    secondFingerPansToo: Math.abs(after2nd.yaw - panned) > 0.03,
    sprintStillOnWithSecond: after2nd.sprint === true,
    liftReleases: released.sprint === false && released.lens === 0,
    straySlideFiresNothing: stray === 0
  };
  console.log('multitouch:', JSON.stringify(R.multitouch));
}

// ---- quadrant joystick + satchel ----
{
  const Q = await page.evaluate(() => {
    const z = document.getElementById('joyZone').getBoundingClientRect();
    return {
      shareW: z.width / innerWidth, shareH: z.height / innerHeight,
      atCorner: z.left === 0 && Math.abs(z.bottom - innerHeight) < 2,
      invHiddenAtRest: document.getElementById('inv').getBoundingClientRect().width === 0,
      invBtn: !!document.getElementById('invBtn'),
      invInPanel: document.getElementById('inv').parentElement.id === 'invBox'
    };
  });
  R.quadrant = {
    coversQuadrant: Q.shareW >= 0.4 && Q.shareH >= 0.4 && Q.atCorner,
    satchelButton: Q.invBtn && Q.invInPanel && Q.invHiddenAtRest
  };
  // the ring springs up under a thumb landing far from home
  const ringAt = await page.evaluate(async () => {
    const z = document.getElementById('joyZone');
    const r = z.getBoundingClientRect();
    const x = r.left + r.width * 0.7, y = r.top + r.height * 0.6;
    z.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 31, bubbles: true, clientX: x, clientY: y }));
    await new Promise(r2 => setTimeout(r2, 250));
    const jr = document.getElementById('joy').getBoundingClientRect();
    const at = { dx: Math.abs(jr.left + jr.width / 2 - x) < 4, dy: Math.abs(jr.top + jr.height / 2 - y) < 4, live: document.getElementById('joy').classList.contains('live') };
    z.dispatchEvent(new PointerEvent('pointerup', { pointerId: 31, bubbles: true }));
    return at;
  });
  R.quadrant.ringUnderThumb = ringAt.dx && ringAt.dy && ringAt.live;
  // satchel: opens from the bag, updates live, closes
  const bag = await page.evaluate(async () => {
    document.getElementById('invBtn').click();
    await new Promise(r2 => setTimeout(r2, 250));
    const chip = document.getElementById('chip-meat');
    const open = document.getElementById('invWrap').classList.contains('show');
    const before = chip.textContent;
    inv.meat += 2; updateInv();
    const updated = chip.textContent !== before && chip.textContent === '2';
    document.getElementById('invClose').click();
    await new Promise(r2 => setTimeout(r2, 200));
    const closed = !document.getElementById('invWrap').classList.contains('show');
    return { open, updated, closed };
  });
  R.quadrant.satchelWorks = bag.open && bag.updated && bag.closed;
  console.log('quadrant+satchel:', JSON.stringify(R.quadrant));
}

R.errors = errors;
console.log(JSON.stringify(R, null, 1));
await browser.close();
