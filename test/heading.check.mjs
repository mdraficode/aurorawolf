import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=1337');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1500);
const R = await page.evaluate(() => {
  // record every rotation the minimap canvas receives during one draw
  const rec = [];
  const proto = CanvasRenderingContext2D.prototype;
  const orig = proto.rotate;
  proto.rotate = function (a) { rec.push(+a.toFixed(3)); return orig.call(this, a); };
  const face = (yaw, cam) => {
    wolf.yaw = yaw; camYaw = cam; MM.t = 0; rec.length = 0;
    updateMinimap(1);
    const want = Math.PI - yaw;                       // expected player-arrow rotation
    const camAngs = [camYaw, -camYaw, camYaw + Math.PI].map(v => +((v % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)).toFixed(3));
    const hit = rec.some(a => Math.abs(((a - want) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - 0) < 0.02 || Math.abs(((a - want) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - 2 * Math.PI) < 0.02);
    const w2 = +((want % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const camUsed = rec.some(a => { const n = +((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return camAngs.some(c => Math.abs(n - c) < 0.02); });
    return { want: w2.toFixed(3), got: rec, arrowTracksWolf: hit, arrowTracksCamera: camUsed };
  };
  const r1 = face(Math.PI / 2, Math.PI);       // wolf east, camera north
  const r2 = face(Math.PI, Math.PI / 2);       // wolf north, camera east
  const r3 = face(-Math.PI / 2, 0);            // wolf west, camera south
  proto.rotate = orig;
  return { r1, r2, r3 };
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
const ok = R.r1.arrowTracksWolf && !R.r1.arrowTracksCamera &&
           R.r2.arrowTracksWolf && !R.r2.arrowTracksCamera &&
           R.r3.arrowTracksWolf && !R.r3.arrowTracksCamera;
console.log(ok ? 'HEADING CHECK PASS' : 'HEADING CHECK FAIL');
process.exit(ok ? 0 : 1);
