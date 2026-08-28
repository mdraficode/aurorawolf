// Free-look camera: the whole sphere, sky to soil.
import { chromium } from 'playwright';

const results = [];
const ck = (name, ok, extra = '') => { results.push([name, !!ok]); console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///home/user/index.html?autostart=1&seed=2026&quality=low');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
  await page.waitForTimeout(1200);

  // ---- drag UP: the VIEW tilts to the sky while the wolf drops out of frame ----
  const up = await page.evaluate(async () => {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const cv = renderer.domElement;
    const ev = (t, x, y) => (t === 'pointerdown' ? cv : window).dispatchEvent(new PointerEvent(t, { pointerId: 1, bubbles: true, clientX: x, clientY: y }));
    ev('pointerdown', cx, cy);
    for (let i = 1; i <= 90; i++) ev('pointermove', cx, cy - i * 6);   // a long, deliberate upward drag
    const t0 = performance.now();
    while (Math.abs(viewPitch - camPitch) > 0.004 && performance.now() - t0 < 6000) await new Promise(r => setTimeout(r, 120));   // let the view ease onto the target
    const pitch = camPitch, tgt = camTarget.y, camY = camera.position.y;
    const look = new THREE.Vector3(-Math.sin(viewYaw) * Math.cos(viewPitch), -Math.sin(viewPitch), -Math.cos(viewYaw) * Math.cos(viewPitch));
    const toWolf = new THREE.Vector3().copy(camTarget).sub(camera.position).normalize();
    const offAxis = look.angleTo(toWolf) * 180 / Math.PI;   // 0 = wolf dead center
    ev('pointerup', cx, 0);
    return { pitch, tgt, camY, lookY: look.y, offAxis, groundOK: camera.position.y >= groundAt(camera.position.x, camera.position.z) + 0.6 };
  });
  ck('drag up: pitch reaches TRUE zenith (90°)', up.pitch <= -(Math.PI / 2 - 0.003), `camPitch=${up.pitch.toFixed(3)} (limit ${(-Math.PI / 2).toFixed(3)})`);
  ck('view points straight up', up.lookY > 0.999, `view dir y=${up.lookY.toFixed(4)}`);
  ck('wolf out of the frame at zenith', up.offAxis > 32, `${up.offAxis.toFixed(0)}° off-center (half-FOV ≈ 31°)`);
  ck('camera stays near the wolf, not under it', up.camY > up.tgt - 3.2, `camY ${up.camY.toFixed(1)} vs target ${up.tgt.toFixed(1)}`);
  ck('camera never sinks into the ground', up.groundOK);

  // ---- edge-hold: a thumb parked at the top edge glides to zenith ----
  await page.evaluate(() => { camPitch = -0.4; });
  const edge = await page.evaluate(async () => {
    const cx = innerWidth / 2;
    const cv = renderer.domElement;
    const ev = (t, x, y) => (t === 'pointerdown' ? cv : window).dispatchEvent(new PointerEvent(t, { pointerId: 7, bubbles: true, clientX: x, clientY: y }));
    ev('pointerdown', cx, innerHeight / 2);
    ev('pointermove', cx, 5);          // drag to the very top edge and…
    await new Promise(r => setTimeout(r, 1600));   // …hold: the view keeps tilting
    const pitch = camPitch;
    const look = new THREE.Vector3(-Math.sin(viewYaw) * Math.cos(viewPitch), -Math.sin(viewPitch), -Math.cos(viewYaw) * Math.cos(viewPitch));
    ev('pointerup', cx, 5);
    return { pitch, lookY: look.y };
  });
  ck('edge-hold tilts to true zenith without stroking', edge.pitch <= -(Math.PI / 2 - 0.01) && edge.lookY > 0.999, `camPitch=${edge.pitch.toFixed(3)}, view y=${edge.lookY.toFixed(4)}`);

  // ---- mid sky-tilt: wolf sinks to the BOTTOM of the frame, not the middle ----
  await page.evaluate(() => { camPitch = -0.6; });
  await page.waitForFunction(() => Math.abs(viewPitch - (-0.6)) < 0.05, null, { timeout: 20000 });
  const mid = await page.evaluate(() => {
    const look = new THREE.Vector3(-Math.sin(viewYaw) * Math.cos(viewPitch), -Math.sin(viewPitch), -Math.cos(viewYaw) * Math.cos(viewPitch));
    const toWolf = new THREE.Vector3().copy(camTarget).sub(camera.position).normalize();
    return { lookY: look.y, offAxis: look.angleTo(toWolf) * 180 / Math.PI, belowCenter: toWolf.y < look.y - 0.05, camY: camera.position.y, tgt: camTarget.y };
  });
  ck('mid-tilt: looking up ~35°', mid.lookY > 0.5, `view dir y=${mid.lookY.toFixed(2)}`);
  ck('mid-tilt: wolf sits below center, never blocking', mid.belowCenter && mid.offAxis > 8, `${mid.offAxis.toFixed(0)}° below center`);

  // ---- drag DOWN: still looks from above, same freedom ----
  const down = await page.evaluate(async () => {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const cv = renderer.domElement;
    const ev = (t, x, y) => (t === 'pointerdown' ? cv : window).dispatchEvent(new PointerEvent(t, { pointerId: 2, bubbles: true, clientX: x, clientY: y }));
    ev('pointerdown', cx, cy);
    for (let i = 1; i <= 90; i++) ev('pointermove', cx, cy + i * 6);   // long downward drag
    await new Promise(r => setTimeout(r, 700));
    const pitch = camPitch, tgt = camTarget.y, camY = camera.position.y;
    const dir = new THREE.Vector3().subVectors(camTarget, camera.position).normalize();
    ev('pointerup', cx, innerHeight);
    return { pitch, tgt, camY, lookY: dir.y };
  });
  ck('drag down: pitch reaches straight-down (90°)', down.pitch >= Math.PI / 2 - 0.003, `camPitch=${down.pitch.toFixed(3)}`);
  ck('camera above the wolf, looking down', down.camY > down.tgt && down.lookY < 0, `lookY=${down.lookY.toFixed(2)}`);

  // ---- clamp sanity: no gimbal flip, yaw still free ----
  const sane = await page.evaluate(() => ({
    finite: [camPitch, viewPitch, camYaw, camera.position.x, camera.position.y, camera.position.z].every(Number.isFinite),
    pitchBound: Math.abs(camPitch) <= Math.PI / 2 + 0.001,
    yawFree: true
  }));
  ck('angles finite & clamped at ±90°', sane.finite && sane.pitchBound);

  const camera_fov = await page.evaluate(() => camera.fov);
  const skyBottom = Math.asin(Math.min(1, up.lookY)) * 180 / Math.PI - camera_fov / 2;
  ck('whole frame is sky at zenith', skyBottom > 20, `bottom edge of frame at ${skyBottom.toFixed(0)}° elevation`);

  // ---- gameplay unharmed: flight follows the freed pitch ----
  await page.evaluate(() => {
    keys.KeyW = true;   // hold W — dive/climb needs forward motion (input rebuilds from keys each frame)
    wolf.flyT = 30; wolf.pos.y += 15; camPitch = 0.9;   // looking down = dive
    window.__yDive0 = wolf.pos.y;
  });
  await page.waitForFunction(() => wolf.pos.y < window.__yDive0 - 1 || wolf.flyT <= 0, null, { timeout: 30000 });
  const dived = await page.evaluate(() => { window.__yClimb0 = wolf.pos.y; camPitch = -0.9; return wolf.pos.y < window.__yDive0 - 0.9; });  // looking up = climb
  await page.waitForFunction(() => wolf.pos.y > window.__yClimb0 + 1 || wolf.flyT <= 0, null, { timeout: 30000 });
  const climbed = await page.evaluate(() => { wolf.flyT = 0; keys.KeyW = false; return wolf.pos.y > window.__yClimb0 + 0.9; });
  ck('flight: look down dives, look up climbs', dived && climbed);

  // ---- real-touch (CDP): sky pan must work even from the joystick field, and in one short swipe ----
  {
    const mctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const mp = await mctx.newPage();
    const merrs = [];
    mp.on('pageerror', e => merrs.push(e.message));
    await mp.goto('file:///home/user/index.html?autostart=1&seed=2026&quality=low', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mp.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
    await mp.waitForTimeout(900);
    const cdp = await mctx.newCDPSession(mp);
    // a steep, fast upward fling that BEGINS inside the joystick field: camera, not the wolf
    const p0 = await mp.evaluate(() => camPitch);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 320 }] });
    for (let y = 320; y >= 90; y -= 20) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150, y }] });
      await mp.waitForTimeout(18);
    }
    const mid = await mp.evaluate(() => ({ pitch: camPitch, stick: joy.id, lens: camPointers.size }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mp.waitForTimeout(400);
    const p1 = await mp.evaluate(() => camPitch);
    ck('fling from the joystick field pans the camera', mid.stick === null && p1 - p0 < -1.0, `Δpitch=${(p1 - p0).toFixed(2)}, stick=${mid.stick}`);
    // one SHORT mid-screen swipe on touch spans most of the sky
    await mp.evaluate(() => { camPitch = 0.42; });
    await mp.waitForTimeout(250);
    const q0 = await mp.evaluate(() => camPitch);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 420, y: 300 }] });
    for (let y = 300; y >= 150; y -= 15) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 420, y }] });
      await mp.waitForTimeout(18);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mp.waitForTimeout(300);
    const q1 = await mp.evaluate(() => camPitch);
    ck('short touch swipe covers most of the sky', q0 - q1 > 1.3, `Δpitch=${(q0 - q1).toFixed(2)}`);
    ck('real-touch section: zero page errors', merrs.length === 0, merrs.slice(0, 2).join(' | '));
    await mctx.close();
  }

  ck('zero page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
const fails = results.filter(r => !r[1]).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
