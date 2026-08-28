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

  // ---- drag UP: the camera must dive below the target and look at the sky ----
  const up = await page.evaluate(async () => {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const cv = renderer.domElement;
    const ev = (t, x, y) => (t === 'pointerdown' ? cv : window).dispatchEvent(new PointerEvent(t, { pointerId: 1, bubbles: true, clientX: x, clientY: y }));
    ev('pointerdown', cx, cy);
    for (let i = 1; i <= 90; i++) ev('pointermove', cx, cy - i * 6);   // a long, deliberate upward drag
    await new Promise(r => setTimeout(r, 700));
    const pitch = camPitch, tgt = camTarget.y, camY = camera.position.y;
    const dir = new THREE.Vector3().subVectors(camTarget, camera.position).normalize();
    ev('pointerup', cx, 0);
    return { pitch, tgt, camY, lookY: dir.y, groundOK: camera.position.y >= groundAt(camera.position.x, camera.position.z) + 0.6 };
  });
  ck('drag up: pitch goes negative past the old floor', up.pitch < -1.2, `camPitch=${up.pitch.toFixed(2)} (old floor 0.06)`);
  ck('camera rides below the wolf to see the sky', up.camY < up.tgt, `camY ${up.camY.toFixed(1)} < target ${up.tgt.toFixed(1)}`);
  ck('view tilts skyward', up.lookY > 0.55, `view dir y=${up.lookY.toFixed(2)}`);
  ck('camera never sinks into the ground', up.groundOK);

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
  ck('drag down: pitch reaches the top of its range', down.pitch > 1.35, `camPitch=${down.pitch.toFixed(2)}`);
  ck('camera above the wolf, looking down', down.camY > down.tgt && down.lookY < 0, `lookY=${down.lookY.toFixed(2)}`);

  // ---- clamp sanity: no gimbal flip, yaw still free ----
  const sane = await page.evaluate(() => ({
    finite: [camPitch, viewPitch, camYaw, camera.position.x, camera.position.y, camera.position.z].every(Number.isFinite),
    pitchBound: Math.abs(camPitch) <= 1.51,
    yawFree: true
  }));
  ck('angles finite & clamped at ±86°', sane.finite && sane.pitchBound);

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

  ck('zero page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
const fails = results.filter(r => !r[1]).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
