import { pathToFileURL, fileURLToPath } from 'url';
// 🤖 AI watch-mode feature suite — 15 checks (restored after workspace incident; final behavior-equivalent rewrite)
// Lessons baked in: domcontentloaded + 90s (1 MB file); NEVER two live game pages (2-CPU sandbox); always page.close();
// odometer assertions need &speed=8&rate=3&re=3 and ≤20 m thresholds; no waitForTimeout after close.
import { chromium } from 'playwright';

const URL1 = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=4242&quality=low&speed=8&rate=3&re=3';
let pass = 0, fail = 0;
const ck = (name, ok, extra = '') => {
  console.log(`${ok ? '✔' : '✘'} ${name}${ok && extra !== true ? ` — ${extra}` : !ok && extra ? ` — ${extra}` : ''}`);
  ok ? pass++ : fail++;
};

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));

await page.goto(URL1, { timeout: 90000, waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await page.waitForTimeout(2500);

// 1 · button exists on the HUD
const btnBox = await page.evaluate(() => { const b = document.getElementById('btnAI'); if (!b) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.x, y: r.y }; });
ck('🤖 button present & on-screen', !!btnBox && btnBox.w > 20 && btnBox.x > 0 && btnBox.y > 0);

// 2 · dormant before first press
const dormant = await page.evaluate(() => !document.body.classList.contains('aiOn') && window.BOTLOG === undefined);
ck('AI dormant before first press', dormant);

// 3 · press → on
await page.click('#btnAI');
await page.waitForTimeout(1200);
const onNow = await page.evaluate(() => document.body.classList.contains('aiOn') && document.getElementById('btnAI').classList.contains('on'));
ck('press → AI on (body class + lit button)', onNow);

// 4 · brain booted, event log flowing
await page.waitForTimeout(4000);
const booted = await page.evaluate(() => (window.BOTLOG || []).length);
ck('bot brain booted (event log flowing)', booted > 3, `${booted} events`);

// 5 · spectator panel visible (position:fixed → offsetParent is always null; use computed style + rect)
const panelVisible = await page.evaluate(() => { const p = document.getElementById('botPanel'); if (!p) return false; const cs = getComputedStyle(p); const r = p.getBoundingClientRect(); return cs.display !== 'none' && r.width > 50; });
ck('spectator panel visible', panelVisible);

// 6 · actually playing (moved on its own)
await page.waitForTimeout(8000);
const played = await page.evaluate(() => {
  const goals = (window.BOTLOG || []).filter(e => e.type === 'goal');
  return { n: goals.length, dist: wolf.distance, last: (goals.slice(-3).map(e => e.msg || e.type).join(' | ') || '').slice(0, 80) };
});
ck('the wolf is actually playing (moved on its own)', played.dist > 15 && played.n > 3, `odometer ${played.dist.toFixed(0)} m · ${played.n} goals · ${played.last}`);

// 7 · spectator: touch controls step aside
const spec = await page.evaluate(() => { const b = getComputedStyle(document.getElementById('btns')); const j = getComputedStyle(document.getElementById('joyZone')); return b.display === 'none' && j.display === 'none'; });
ck('spectator mode: touch controls step aside', spec);

// 8 · pause hands control back
await page.keyboard.press('p');
await page.waitForTimeout(1200);
const paused = await page.evaluate(() => ({ st: state, aiOn: document.body.classList.contains('aiOn'), btn: getComputedStyle(document.getElementById('btns')).display }));
ck('⏸ pause → AI hands control back', paused.st === 'pause' && !paused.aiOn && paused.btn !== 'none', `"${paused.st}"`);

// 9 · re-enable after hand-back
await page.keyboard.press('p');              // unpause
await page.waitForTimeout(400);
await page.click('#btnAI');
await page.waitForTimeout(1500);
const reOn = await page.evaluate(() => document.body.classList.contains('aiOn') && (window.BOTLOG || []).length > 0);
ck('re-enable works after hand-back', reOn);

// 10 · second press → keys released, wolf is yours
await page.click('#btnAI');
await page.waitForTimeout(1200);
const released = await page.evaluate(() => { const K = keys || {}; const any = Object.keys(K).some(k => K[k]); return !document.body.classList.contains('aiOn') && !any; });
ck('second press → keys released, wolf is yours', released);

// 11 · ?autopilot=1 auto-enables (watch builds)
const page2 = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs2 = []; page2.on('pageerror', e => errs2.push(e.message));
await page2.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autopilot=1&seed=99&quality=low&speed=8&rate=3&re=3', { timeout: 90000, waitUntil: 'domcontentloaded' });
await page2.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 }).catch(() => { });
await page2.waitForTimeout(9000);
const urlOn = await page2.evaluate(() => document.body.classList.contains('aiOn') && (window.BOTLOG || []).length > 2 && wolf.distance > 3);
ck('?autopilot=1 auto-enables (watch builds)', urlOn);

// 12
ck('zero page errors (both sessions)', errs.length === 0 && errs2.length === 0, errs[0] || errs2[0] || 'clean');
await page2.close(); await new Promise(r => setTimeout(r, 300));

// 13 · menu front door: "🤖 Watch the AI play" starts the game with AI on
const page3 = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs3 = []; page3.on('pageerror', e => errs3.push(e.message));
await page3.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?seed=5150&quality=low&speed=8&rate=3&re=3', { timeout: 90000, waitUntil: 'domcontentloaded' });
await page3.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
await page3.waitForTimeout(1500);
await page3.click('#btnMenuAI');
await page3.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
let menuFlow = false, menuWhy = '';
try {
  await page3.waitForFunction(() => document.body.classList.contains('aiOn') && (window.BOTLOG || []).length > 2 && wolf.distance > 3, null, { timeout: 30000, polling: 1000 });
  menuFlow = true;
} catch (e) {
  menuWhy = await page3.evaluate(() => `aiOn=${document.body.classList.contains('aiOn')} log=${(window.BOTLOG || []).length} dist=${wolf.distance.toFixed(1)}`);
}
ck('menu "🤖 Watch the AI play" → bot enters the game itself', menuFlow, menuWhy || 'playing');

// 14 · corner button visible during play
const cornerBtn = await page3.evaluate(() => document.getElementById('btnAI').style.display !== 'none');
ck('corner 🤖 visible during play', cornerBtn);

// 15
ck('zero page errors (menu flow)', errs3.length === 0, errs3[0] || 'clean');

await browser.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
