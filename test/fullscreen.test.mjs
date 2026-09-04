/* REGRESSION — "always start the game in full screen" + "ANY touch to the game window goes fullscreen".
   Every entry into play (human start, human pause→resume, AI start) must request browser fullscreen,
   AND a tap/click/touch anywhere on the game window — a game button, the touch UI, or empty ground —
   snaps to fullscreen whenever it isn't already. Real fullscreen needs a user gesture, so we assert
   the REQUEST is issued via a spy rather than relying on the environment actually going fullscreen. */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href;
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
let fails = [];
const ck = (n, c, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  ← ' + x)); if (!c) fails.push(n); };
const newPage = async (opts) => {
  const page = await b.newPage(opts || { viewport: { width: 1280, height: 760 } });
  page.on('pageerror', e => fails.push('pageerror: ' + e.message.slice(0, 160)));
  // spy: count every requestFullscreen call (Element + Document, std + webkit)
  await page.addInitScript(() => {
    window.__fsCalls = 0;
    const bump = (orig, that, args) => { window.__fsCalls++; return orig.apply(that, args); };
    for (const proto of [Element.prototype, Document.prototype]) {
      if (proto.requestFullscreen) { const o = proto.requestFullscreen; proto.requestFullscreen = function (...a) { return bump(o, this, a); }; }
      if (proto.webkitRequestFullscreen) { const o = proto.webkitRequestFullscreen; proto.webkitRequestFullscreen = function (...a) { return bump(o, this, a); }; }
    }
  });
  return page;
};
const fsCalls = page => page.evaluate(() => window.__fsCalls);

// ---- 1) HUMAN pause→resume (same page, real gesture) requests fullscreen ----
{
  const page = await newPage();
  await page.goto(URL + '?autostart=1&seed=1337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(500);
  const atBoot = await fsCalls(page);   // autostart enters play directly at boot (no gesture → no fullscreen yet)
  await page.keyboard.press('KeyP');    // pause
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyP');    // resume → setState('play') → enterFullscreen
  await page.waitForTimeout(300);
  const afterResume = await fsCalls(page);
  ck('human pause→resume requests fullscreen', afterResume >= 1, `boot=${atBoot} resume=${afterResume}`);
  await page.close();
}

// ---- 2) FRESH human start via menu (navigation): removing an armed gesture, first touch completes it ----
{
  const page = await newPage();
  await page.goto(URL + '?seed=42&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await page.click('#btnNewGame');              // menu tap — triggers fullscreen pre-navigation (page reloads)
  await page.waitForTimeout(150);
  await page.click('#ddNewStart', { noWaitAfter: true });   // navigates to ?autostart=1
  await page.waitForURL(/autostart=1/, { timeout: 60000 });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(500);
  const afterLoad = await fsCalls(page);        // fresh page, no gesture yet → request deferred
  await page.mouse.click(640, 380);             // a touch ANYWHERE on the game window snaps to fullscreen
  await page.waitForTimeout(300);
  const afterTouch = await fsCalls(page);
  ck('fresh human start fullscreens on any touch', afterLoad === 0 && afterTouch >= 1, `load=${afterLoad} touch=${afterTouch}`);
  await page.close();
}

// ---- 3) AI start via menu (navigation) fullscreens on any touch ----
{
  const page = await newPage();
  await page.goto(URL + '?seed=5150&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await page.click('#btnNewGame');
  await page.waitForTimeout(150);
  await page.click('#ddNewAI', { noWaitAfter: true });     // navigates to ?autopilot=1 (auto-plays via startIv → startGame)
  await page.waitForURL(/autopilot=1/, { timeout: 60000 });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(800);
  const before = await fsCalls(page);   // the autopilot's interval enters play outside a gesture → deferred
  await page.mouse.click(200, 300);     // a touch anywhere completes the swap
  await page.waitForTimeout(300);
  const after = await fsCalls(page);
  ck('AI start fullscreens on any touch', before >= 1 && after >= 1, `load=${before} touch=${after}`);
  await page.close();
}

// ---- 4) touching a GAME BUTTON (touch UI) while playing also requests fullscreen ----
{
  const page = await newPage();
  await page.goto(URL + '?autostart=1&seed=9001&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(600);
  const c0 = await fsCalls(page);
  const box = await page.locator('#tPause').boundingBox();   // a touch UI button
  if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300); }
  const c1 = await fsCalls(page);
  ck('touching a game button (touch UI) requests fullscreen', c1 >= 1, `before=${c0} after=${c1}`);
  await page.close();
}

await b.close();
console.log(fails.length ? 'FULLSCREEN TEST FAIL' : 'FULLSCREEN TEST PASS');
process.exit(fails.length ? 1 : 0);
