/* REGRESSION — "always start the game in full screen".
   Every entry into play (human start, human pause→resume, AI start, AI pause→resume) must request
   browser fullscreen. Real fullscreen needs a user gesture, so this asserts the REQUEST is issued
   (through a spy) on each path rather than relying on the environment actually going fullscreen.
   Paths that arrive via navigation (?autostart=1 / ?autopilot=1) clear the click gesture, so they
   arm a one-shot and complete the swap on the first key/tap — asserted accordingly. */
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
  const atBoot = await fsCalls(page);   // autostart enters play directly (never calls requestFullscreen at boot)
  await page.keyboard.press('KeyP');    // pause
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyP');    // resume → setState('play') → enterFullscreen
  await page.waitForTimeout(300);
  const afterResume = await fsCalls(page);
  ck('human pause→resume requests fullscreen', afterResume >= 1, `boot=${atBoot} resume=${afterResume}`);
  await page.close();
}

// ---- 2) HUMAN fresh start via menu (navigation) → fullscreen on first interaction ----
{
  const page = await newPage();
  await page.goto(URL + '?seed=42&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await page.click('#btnNewGame');
  await page.waitForTimeout(150);
  await page.click('#ddNewStart', { noWaitAfter: true });   // navigates to ?autostart=1
  await page.waitForURL(/autostart=1/, { timeout: 60000 });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(500);
  const afterLoad = await fsCalls(page);   // no gesture yet → request deferred
  await page.keyboard.press('KeyW');       // first interaction → the one-shot completes fullscreen
  await page.waitForTimeout(300);
  const afterGesture = await fsCalls(page);
  ck('fresh human start arms fullscreen, completed on first input', afterLoad === 0 && afterGesture >= 1, `load=${afterLoad} input=${afterGesture}`);
  await page.close();
}

// ---- 3) AI start via menu (navigation) requests fullscreen ----
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
  const before = await fsCalls(page);   // the autopilot's interval enters play outside a gesture → request deferred
  await page.keyboard.press('KeyW');    // first interaction → the rejected request retries into fullscreen
  await page.waitForTimeout(300);
  const after = await fsCalls(page);
  ck('AI start arms fullscreen, completed on first input', before >= 1 && after >= 1, `load=${before} input=${after}`);
  await page.close();
}

await b.close();
console.log(fails.length ? 'FULLSCREEN TEST FAIL' : 'FULLSCREEN TEST PASS');
process.exit(fails.length ? 1 : 0);
