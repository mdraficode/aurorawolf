// M46 v6.6 regression: TROPHIES → BACK re-injects the start template, which destroyed the
// boot-time direct listener on #btnMenuAI ("going to Trophies and coming back breaks the
// Rafzzer button"). The fix: document-level click delegation survives every re-injection.
// This test FAILS on the bug, PASSES on the fix.
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
const aiOn = () => pg.evaluate(() => (window.AI_ON ? AI_ON() : 'no-api'));
const click = async id => { await pg.click('#' + id, { timeout: 15000 }); await pg.waitForTimeout(250); };

// 1) BASELINE — the menu button works on a fresh page
await fresh();
const before = await aiOn();
await click('btnMenuAI');
const baseline = await aiOn();
console.log(`baseline: fresh-menu Rafzzer click → AI_ON ${before} → ${baseline} ${baseline === true ? 'PASS' : 'FAIL'}`);

// 2) TROPHIES → BACK → the re-injected node lost its boot-time marker…
await fresh();
let marker = await pg.evaluate(() => { document.getElementById('btnMenuAI').dataset.boot = '1'; return true; });
await click('btnTrophies');
await pg.waitForSelector('#btnTrophiesBack', { timeout: 20000 });
await click('btnTrophiesBack');
await pg.waitForSelector('#btnMenuAI', { timeout: 20000 });
await pg.waitForTimeout(300);
const replaced = await pg.evaluate(() => !document.getElementById('btnMenuAI').dataset.boot);
console.log(`template re-injected (old node destroyed): ${replaced ? 'yes' : 'no'}`);

// 3) …and the Rafzzer button must STILL arm the AI after the round-trip
await click('btnMenuAI');
const after = await aiOn();
console.log(`round-trip Rafzzer click → AI_ON ${after} ${after === true ? 'PASS' : 'FAIL'}`);

// 4) in-game corner 🧠 toggle is delegated too (works after the same round-trip)
await pg.evaluate(() => { window.AI_PLAY(false); });   // hand control back cleanly
const corner = await pg.evaluate(() => { const b = document.getElementById('btnAI'); b && b.click(); return AI_ON(); });
console.log(`in-game corner 🧠 toggle → AI_ON ${corner} ${corner === true ? 'PASS' : 'FAIL'}`);

const fatal = errors.filter(e => !/favicon|Autoplay|AudioContext/i.test(e));
console.log('pageerrors:', fatal.length ? fatal.join(' | ') : 'none');
await browser.close();
const ok = baseline === true && after === true && corner === true && fatal.length === 0;
console.log(ok ? 'ALL PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
