/* REGRESSION for the two latest user reports:
   1) The redundant side "🧠 Watch Rafzzer the AI Play" button (#btnMenuAI) is removed — the AI
      watch option now lives ONLY inside the NEW GAME / RESUME drop-downs (#ddNewAI / #ddResumeAI).
   2) When the game is paused mid-run, the overlay must be EXACTLY the same as the first-load
      start page (two cards with their drop-downs + the side record), NOT a 2-button RESUME/NEW GAME
      screen. Pausing must also preserve the live run so "Resume Last Game" continues in place. */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href;
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
let fails = [];
const ck = (n, c, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  ← ' + x)); if (!c) fails.push(n); };
page.on('pageerror', e => fails.push('pageerror: ' + e.message.slice(0, 160)));

// ---- 1) the first-load menu: no redundant side AI button, AI option is in the NEW GAME drop-down ----
await page.goto(URL + '?seed=5150&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
await page.waitForTimeout(600);
let M = await page.evaluate(() => ({
  sideAIGone: !el('btnMenuAI'),          // the redundant side button was removed
  dropAI: !!el('ddNewAI') && !!el('ddResumeAI'),  // AI watch lives in the two card drop-downs
  cards: !!el('btnNewGame') && !!el('btnStart'),
  side: !!el('btnTrophies') && !!el('btnRecord'),
  oldPauseGone: !el('btnResume') && !el('btnNew')   // the old 2-button pause template is gone
}));
ck('first-load menu: redundant side AI button removed (bug 1)', M.sideAIGone, JSON.stringify(M));
ck('first-load menu: AI watch lives in the card drop-downs', M.dropAI, JSON.stringify(M));
ck('first-load menu: two cards + side record present', M.cards && M.side, JSON.stringify(M));
ck('first-load menu: old 2-button pause template gone', M.oldPauseGone, JSON.stringify(M));

// ---- 2) start a run, pause mid-run → overlay is EXACTLY the first-load menu ----
await page.click('#btnNewGame');
await page.waitForTimeout(150);
await page.click('#ddNewStart', { noWaitAfter: true });   // fresh world, navigates to ?autostart=1
await page.waitForURL(/autostart=1/, { timeout: 60000 });
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await page.waitForTimeout(800);   // let the wolf gain a little distance / lifespan

// mid-run pause via the HUD pause (or P key) — the overlay must match the first-load menu exactly
await page.keyboard.press('KeyP');
await page.waitForTimeout(400);
const before = await page.evaluate(() => ({ dist: wolf.distance.toFixed(1), day: dayCount }));
const paused = await page.evaluate(() => ({
  state,
  overlayMode: document.getElementById('overlay').dataset.mode,
  // the pause overlay must contain the SAME structure as the first-load home menu
  cards: !!el('btnNewGame') && !!el('btnStart'),
  drops: !!el('ddNewGame') && !!el('ddResume'),
  side: !!el('btnTrophies') && !!el('btnRecord'),
  aiInDrop: !!el('ddNewAI') && !!el('ddResumeAI'),
  oldPauseGone: !el('btnResume') && !el('btnNew')        // no 2-button RESUME/NEW GAME remnants
}));
ck('pause mid-run shows the full first-load home menu (bug 2)', paused.state === 'pause' && paused.cards && paused.drops && paused.side && paused.aiInDrop && paused.oldPauseGone, JSON.stringify(paused));
ck('pause overlay uses the start-page layout', paused.overlayMode === 'start', String(paused.overlayMode));

// ---- 3) resume continues the SAME run (in place), not a fresh world ----
await page.click('#btnStart', { force: true });
await page.waitForTimeout(150);
await page.click('#ddResumePlay', { force: true });
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({ state, dist: wolf.distance.toFixed(1) }));
ck('resume back into the live run (continues the world)', after.state === 'play', JSON.stringify(after));
ck('run did not reset on pause→resume (same distance / no fresh spawn)', Math.abs(after.dist - before.dist) < 1.0, `before=${before.dist} after=${after.dist}`);

await b.close();
const fatal = fails.filter(f => !/favicon|Autoplay|AudioContext/i.test(f));
if (fatal.length) { console.log('PAGEERRORS:', fatal.join(' | ')); }
console.log(fails.length ? 'PAUSE FULLMENU TEST FAIL' : 'PAUSE FULLMENU TEST PASS');
process.exit(fails.length ? 1 : 0);
