import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 400 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=9090&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(() => {
  const out = {};
  const W = innerWidth;
  const zr = document.getElementById('joyZone').getBoundingClientRect();
  out.zonePct = +(zr.width / W * 100).toFixed(1);
  out.cameraSharePct = +(100 - zr.width / W * 100).toFixed(1);
  // 1) touch at 70% width (free right area) → camera IMMEDIATELY
  const cv = renderer.domElement;   // the game's actual pointer target
  const y0 = camYaw;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 21, clientX: W * 0.7, clientY: 150, bubbles: true, cancelable: true, pointerType: 'touch' }));
  out.camClaimed = camPointers.size === 1;
  dispatchEvent(new PointerEvent('pointermove', { pointerId: 21, clientX: W * 0.7 - 130, clientY: 150, bubbles: true, cancelable: true }));
  out.rotatedFirstTry = Math.abs(camYaw - y0) > 0.02;
  dispatchEvent(new PointerEvent('pointerup', { pointerId: 21, bubbles: true }));
  out.releasedClean = camPointers.size === 0;
  // 2) ghost pointer planted (a swallowed pointerup), then any touchend sweep clears it
  camPointers.set(999, { x: 100, y: 100 });
  dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [], bubbles: true }));
  out.ghostSwept = camPointers.size === 0;
  // 3) after ghost sweep, first touch rotates again
  const y1 = camYaw;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 22, clientX: W * 0.8, clientY: 120, bubbles: true, cancelable: true, pointerType: 'touch' }));
  dispatchEvent(new PointerEvent('pointermove', { pointerId: 22, clientX: W * 0.8 + 120, clientY: 120, bubbles: true, cancelable: true }));
  out.rotatesAfterGhost = Math.abs(camYaw - y1) > 0.02;
  dispatchEvent(new PointerEvent('pointerup', { pointerId: 22, bubbles: true }));
  // 4) button-gap fall-through: a point inside #btns' box but between buttons hits the canvas
  const btns = document.getElementById('btns').getBoundingClientRect();
  const gapEl = document.elementFromPoint(btns.left - 6, btns.top - 6);
  const gapEl2 = document.elementFromPoint(btns.left - 2, btns.top + btns.height + 4);
  out.gapHitsCanvasOrGame = (gapEl === cv || (gapEl && gapEl.id === 'game')) || (gapEl2 === cv || (gapEl2 && gapEl2.id === 'game'));
  // 5) joystick still owns the left 40%
  const jz = document.getElementById('joyZone');
  jz.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 31, clientX: W * 0.18, clientY: 200, bubbles: true, cancelable: true }));
  out.joyStillWorks = document.getElementById('joy').classList.contains('live');
  jr = () => jz.dispatchEvent(new PointerEvent('pointerup', { pointerId: 31, bubbles: true }));
  jr();
  // 6) a touch just RIGHT of the zone boundary is camera, not stick
  const y2 = camYaw;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 32, clientX: zr.right + 30, clientY: 200, bubbles: true, cancelable: true, pointerType: 'touch' }));
  dispatchEvent(new PointerEvent('pointermove', { pointerId: 32, clientX: zr.right + 160, clientY: 200, bubbles: true, cancelable: true }));
  out.rightOfZoneIsCamera = Math.abs(camYaw - y2) > 0.02;
  dispatchEvent(new PointerEvent('pointerup', { pointerId: 32, bubbles: true }));
  return out;
});
console.log('CAMTOUCH ' + JSON.stringify({ ...R, errs }));
await b.close();
