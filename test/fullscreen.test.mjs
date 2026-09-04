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
  // spy: count every requestFullscreen / exitFullscreen call (Element + Document, std + webkit)
  await page.addInitScript(() => {
    window.__fsCalls = 0; window.__fsExit = 0;
    const bump = (orig, that, args, tag) => { if (tag === 'EXIT') window.__fsExit++; else window.__fsCalls++; return orig.apply(that, args); };
    for (const proto of [Element.prototype, Document.prototype]) {
      if (proto.requestFullscreen) { const o = proto.requestFullscreen; proto.requestFullscreen = function (...a) { return bump(o, this, a, 'REQ'); }; }
      if (proto.webkitRequestFullscreen) { const o = proto.webkitRequestFullscreen; proto.webkitRequestFullscreen = function (...a) { return bump(o, this, a, 'REQ'); }; }
    }
    for (const proto of [Document.prototype]) {
      if (proto.exitFullscreen) { const o = proto.exitFullscreen; proto.exitFullscreen = function (...a) { return bump(o, this, a, 'EXIT'); }; }
      if (proto.webkitExitFullscreen) { const o = proto.webkitExitFullscreen; proto.webkitExitFullscreen = function (...a) { return bump(o, this, a, 'EXIT'); }; }
    }
  });
  return page;
};
const fsCalls = page => page.evaluate(() => window.__fsCalls);
const fsExit = page => page.evaluate(() => window.__fsExit);

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

// ---- 2) FRESH human start via the real Start Game drop-down: IN-PLACE reset keeps fullscreen ----
// Regression for the fullscreen bug: "Start Game" used to do `location.href = ?seed=X&autostart=1`,
// which RELOADS the page — and a reload always exits browser fullscreen and cannot re-enter without a
// fresh gesture. The fix re-seeds the world IN THIS DOCUMENT (no navigation), so fullscreen survives the
// click. We assert (a) the page did NOT navigate/reload (a window marker survives), (b) fullscreen is
// requested during the click, and (c) it is never EXITED.
{
  const page = await newPage();
  await page.goto(URL + '?seed=42&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__survived = 'alive:' + Math.random(); });   // a reload would wipe this
  await page.click('#btnNewGame');
  await page.waitForTimeout(150);
  await page.click('#ddNewStart');   // the REAL Start Game — must NOT reload
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({
    survived: window.__survived,                      // set pre-click; gone ⟺ a page reload happened
    calls: window.__fsCalls, exit: window.__fsExit,
    seed: new URL(location.href).searchParams.get('seed'),
    liveSeed: window.SEED
  }));
  ck('Start Game keeps fullscreen (no page reload)', r.survived === 'alive:' + r.survived.split(':')[1] && String(r.survived).indexOf('alive:') === 0 && /alive:/.test(r.survived), `survived=${r.survived}`);
  ck('Start Game requests fullscreen in the click gesture', r.calls >= 1, `calls=${r.calls}`);
  ck('Start Game never EXITS fullscreen', r.exit === 0, `exit=${r.exit}`);
  ck('Start Game re-seeds the world (new seed)', !!r.seed && String(r.liveSeed) === String(r.seed), `urlSeed=${r.seed} liveSeed=${r.liveSeed}`);
  await page.close();
}

// ---- 3) AI start via the Watch Rafzzer drop-down: same in-place reset, never reloads/fullscreens out ----
{
  const page = await newPage();
  await page.goto(URL + '?seed=5150&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__survived = 'alive:' + Math.random(); });
  await page.click('#btnNewGame');
  await page.waitForTimeout(150);
  await page.click('#ddNewAI');   // the real Watch-Rafzzer drop-down — must NOT reload
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({
    survived: window.__survived,
    calls: window.__fsCalls, exit: window.__fsExit,
    seed: new URL(location.href).searchParams.get('seed'), liveSeed: window.SEED,
    ai: window.AI_ON && window.AI_ON()
  }));
  ck('AI Watch keeps fullscreen (no page reload)', /alive:/.test(r.survived), `survived=${r.survived}`);
  ck('AI Watch requests fullscreen (no deferred second tap)', r.calls >= 1, `calls=${r.calls}`);
  ck('AI Watch never EXITS fullscreen', r.exit === 0, `exit=${r.exit}`);
  ck('AI Watch re-seeds the world (new seed)', !!r.seed && String(r.liveSeed) === String(r.seed), `urlSeed=${r.seed} liveSeed=${r.liveSeed}`);
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

// ---- 5) the #fsBtn may only ENTER fullscreen — it must never EXIT (fullscreen stays the whole time) ----
{
  const page = await newPage();
  await page.goto(URL + '?autostart=1&seed=4242&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(500);
  // enter fullscreen with a touch, then drive the fs button a few times — exit must stay 0
  await page.mouse.click(640, 380);
  await page.waitForTimeout(200);
  const fb = await page.locator('#fsBtn').boundingBox();
  if (fb) { for (let i = 0; i < 3; i++) { await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2); await page.waitForTimeout(150); } }
  const exits = await fsExit(page);
  const reqs = await fsCalls(page);
  ck('pressing the fullscreen button never EXITS fullscreen (enter-only)', exits === 0, `exit=${exits}`);
  ck('pressing the fullscreen button still requests fullscreen', reqs >= 1, `req=${reqs}`);
  await page.close();
}

// ---- 6) the #fsBtn is hidden during active play (it cannot be tapped to leave fullscreen) ----
{
  const page = await newPage();
  await page.goto(URL + '?autostart=1&seed=4243&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(500);
  const hidden = await page.evaluate(() => { const f = document.getElementById('fsBtn'); return f ? !f.classList.contains('show') : true; });
  ck('the fullscreen button is hidden during play', hidden === true, `hidden=${hidden}`);
  await page.close();
}

await b.close();
console.log(fails.length ? 'FULLSCREEN TEST FAIL' : 'FULLSCREEN TEST PASS');
process.exit(fails.length ? 1 : 0);
