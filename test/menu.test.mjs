/* MENU FLOW — the start page must re-arm every time it is re-injected.
   Regression for the "TROPHIES → BACK → stuck 'SUMMONING THE WILD…' / 'Growing the forest…'" bug. */
import { chromium } from 'playwright';
import { pathToFileURL , fileURLToPath } from 'url';
const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?seed=7&quality=low';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 420, height: 800 } });
let fails = [];
const ck = (n, c, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  ← ' + x)); if (!c) fails.push(n); };
pg.on('pageerror', e => fails.push('pageerror: ' + e.message.slice(0, 120)));
try {
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'menu', null, { timeout: 90000 });
  let R = await pg.evaluate(() => ({ disabled: el('btnStart').disabled, text: el('btnStart').textContent.trim(), line: el('bootLine').textContent }));
  ck('boot completes → start armed', !R.disabled && /ENTER THE WILD/.test(R.text) && /awaits/.test(R.line), JSON.stringify(R));
  // the redesigned home menu: two main options (each with a drop-down) + the side record
  R = await pg.evaluate(() => ({
    newGame: !!el('btnNewGame'), start: !!el('btnStart'), record: !!el('btnRecord'),
    trophies: !!el('btnTrophies'), ai: !!el('btnMenuAI'),
    ddNew: !!el('ddNewGame') && !!el('ddNewStart') && !!el('ddNewAI'),
    ddResume: !!el('ddResume') && !!el('ddResumePlay') && !!el('ddResumeAI'),
    resumeDisabled: el('ddResumePlay') && el('ddResumePlay').disabled
  }));
  ck('redesigned menu present (2 cards + side buttons)', R.newGame && R.start && R.record && R.trophies && R.ai, JSON.stringify(R));
  ck('each card has its two drop-down options', R.ddNew && R.ddResume, JSON.stringify(R));
  ck('resume options greyed when there is nothing to resume', R.resumeDisabled === true, String(R.resumeDisabled));
  await pg.click('#caretNewGame');
  await pg.waitForTimeout(150);
  const ddOpen = await pg.evaluate(() => el('ddNewGame').style.display === 'block');
  ck('caret opens the New Game drop-down', ddOpen);
  await pg.click('#caretNewGame');   // toggle it closed before the trophies round-trip
  await pg.waitForTimeout(100);
  await pg.click('#btnTrophies');
  await pg.waitForTimeout(250);
  R = await pg.evaluate(() => document.getElementById('ovTitle').textContent);
  ck('TROPHIES opens', /TROPHIES/i.test(R), R);
  await pg.click('#btnTrophiesBack');
  await pg.waitForTimeout(250);
  R = await pg.evaluate(() => ({ disabled: el('btnStart').disabled, text: el('btnStart').textContent.trim(), line: el('bootLine').textContent }));
  ck('BACK → start page re-armed (bug 1)', !R.disabled && /ENTER THE WILD/.test(R.text) && /awaits/.test(R.line), JSON.stringify(R));
  await pg.click('#btnStart');
  await pg.waitForTimeout(1500);
  R = await pg.evaluate(() => ({ state, overlayHidden: document.getElementById('overlay').classList.contains('hidden'), camp: !!window.CAMP }));
  ck('game starts from the re-armed page', R.state === 'play' && R.overlayHidden && R.camp, JSON.stringify(R));
  // open trophies again mid-session, go back, start again — the loop must hold
  await pg.evaluate(() => setState('pause'));
  await pg.waitForTimeout(200);
  await pg.evaluate(() => setState('play'));
  await pg.waitForTimeout(300);
  R = await pg.evaluate(() => state);
  ck('pause/resume still clean', R === 'play', R);
} catch (e) { fails.push('crash: ' + e.message.slice(0, 140)); } finally { await b.close(); }
if (fails.length) { console.log('MENU TEST FAIL'); process.exit(1); }
console.log('MENU TEST PASS');
