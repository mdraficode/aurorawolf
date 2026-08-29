import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 400 }, hasTouch: true, isMobile: true });
await pg.goto('file:///home/user/index.html?autostart=1&seed=5150&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(() => {
  const cv = renderer.domElement;
  const r = cv.getBoundingClientRect();
  let fired = 0;
  cv.addEventListener('pointerdown', () => fired++, { once: false });
  const px = 336, py = 200;   // a known dead point
  const el = document.elementFromPoint(px, py);
  const chain = [];
  let c = el; while (c && c !== document.body) { chain.push(c.id || c.tagName + '.' + String(c.className).slice(0, 20)); c = c.parentElement; }
  // who covers the dead point? list #game's children rects containing it
  const cover = [];
  for (const k of document.getElementById('game').children) {
    const kr = k.getBoundingClientRect();
    if (px >= kr.left && px <= kr.right && py >= kr.top && py <= kr.bottom) cover.push({ tag: k.id || k.tagName, w: +kr.width.toFixed(0), h: +kr.height.toFixed(0), pe: getComputedStyle(k).pointerEvents, z: getComputedStyle(k).zIndex });
  }
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4242, clientX: px, clientY: py, bubbles: true, cancelable: true, pointerType: 'touch' }));
  const claimed = camPointers.has(4242);
  dispatchEvent(new PointerEvent('pointerup', { pointerId: 4242, bubbles: true }));
  return { canvas: { x: r.x, y: r.y, w: +r.width.toFixed(0), h: +r.height.toFixed(0), pe: getComputedStyle(cv).pointerEvents, pos: getComputedStyle(cv).position }, listenerFired: fired, claimed, topAt: el ? (el.id || el.tagName) : '?', chain, cover };
});
console.log(JSON.stringify(R, null, 1));
await b.close();
