import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=1337');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(2500);
const R = await page.evaluate(() => {
  // stage: bear ahead of the CAMERA (camera forward = camYaw + PI)
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  const ch = chunks.get(ck(ccx, ccz));
  const bear = new Predator('bear', wolf.pos.x + 25, wolf.pos.z);
  ch.predators.push(bear);
  bear.state = 'chase'; bear.threatening = true;
  const a = Math.atan2(bear.pos.x - wolf.pos.x, bear.pos.z - wolf.pos.z);
  camYaw = a - Math.PI;                 // camera now faces the bear → arrow should be at 12 o'clock
  updateHUD(0.03);
  const ta = document.getElementById('threatArrow');
  const rot = /rotate\((-?[\d.]+)deg\)/.exec(ta.style.transform);
  const glyph = (getComputedStyle(ta.querySelector('.ta-arrow')).clipPath || '').includes('polygon') ? 'dart' : 'other';
  const rect = ta.querySelector('.ta-arrow').getBoundingClientRect();
  return { rotDeg: rot ? +rot[1] : null, glyph, arrowX: Math.round(rect.x + rect.width / 2), arrowY: Math.round(rect.y), cx: 640, cy: 360 };
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/05_arrow_check.png', timeout: 90000 });
await page.evaluate(() => { document.getElementById('threatArrow').style.display = 'none'; });
console.log(JSON.stringify(R), 'errors:', errors.length || 'none');
await browser.close();
