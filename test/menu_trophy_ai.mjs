// M46 v6.6 regression (updated): TROPHIES → BACK re-injects the start template, so every menu
// control must be re-armed on each return. The AI front door is now the NEW GAME card's
// "Watch The Rafzzer the AI Play" option (#ddNewAI, wired in wireStartMenu on every re-injection),
// and the in-game corner 🧠 (#btnAI) is delegated at document level so it survives re-injection.
// This test FAILS if the drop-down entry dies after a trophies round-trip.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?quality=low&seed=7777';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await browser.newPage({ viewport: { width: 900, height: 600 } });
const errors = [];
pg.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));

const fresh = async () => {
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
  await pg.waitForTimeout(400);
};
const click = async id => { await pg.click('#' + id, { timeout: 15000 }); await pg.waitForTimeout(250); };
// the NEW GAME card's "Watch the AI play" option triggers a FULL NAVIGATION to ?autopilot=1
// (a fresh seeded world that the wolf plays itself), so clicking it reloads the page. We
// assert the round-trip works by checking that clicking produces the autopilot navigation.
const clickNewAI = async () => {
  await pg.click('#btnNewGame', { timeout: 15000 });
  await pg.waitForTimeout(150);
  // ddNewAI navigates (location.href → ?autopilot=1); don't let Playwright wait out the reload,
  // then explicitly confirm the URL flipped to the autopilot watch world
  await pg.click('#ddNewAI', { timeout: 15000, noWaitAfter: true });
  await pg.waitForURL(/autopilot=1/, { timeout: 60000 });
  return pg.url();
};

// 1) BASELINE — the NEW GAME drop-down's AI option navigates to the autopilot watch world
await fresh();
const url1 = await clickNewAI();
const baseline = /autopilot=1/.test(url1);
console.log(`baseline: fresh-menu "Watch the AI play" → ${baseline ? 'navigates (autopilot=1)' : 'FAIL ' + url1}`);

// 2) TROPHIES → BACK → the re-injected nodes lose their boot-time wiring…
const roundtrip = async () => {
  await fresh();
  await click('btnTrophies');
  await pg.waitForSelector('#btnTrophiesBack', { timeout: 20000 });
  await click('btnTrophiesBack');
  await pg.waitForSelector('#ddNewAI', { timeout: 20000, state: 'attached' });   // element exists on the re-injected menu (drop-down starts hidden)
  await pg.waitForTimeout(300);
};
// 3) …and the drop-down AI option must STILL navigate after the round-trip
await roundtrip();
const url2 = await clickNewAI();
const after = /autopilot=1/.test(url2);
console.log(`round-trip "Watch the AI play" → ${after ? 'navigates (autopilot=1)' : 'FAIL ' + url2}`);

// 4) in-game corner 🧠 toggle is delegated: in a play session it hands the wolf to the AI (no navigation)
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=4242&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await pg.waitForTimeout(500);
const corner = await pg.evaluate(() => { const b = document.getElementById('btnAI'); if (!b) return 'no-btn'; b.click(); return AI_ON ? AI_ON() : 'no-api'; });
console.log(`in-game corner 🧠 toggle → AI_ON ${corner} ${corner === true ? 'PASS' : 'FAIL'}`);

const fatal = errors.filter(e => !/favicon|Autoplay|AudioContext/i.test(e));
console.log('pageerrors:', fatal.length ? fatal.join(' | ') : 'none');
await browser.close();
const ok = baseline === true && after === true && corner === true && fatal.length === 0;
console.log(ok ? 'ALL PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
