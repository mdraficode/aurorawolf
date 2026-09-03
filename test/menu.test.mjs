/* MENU FLOW — the start page must re-arm every time it is re-injected.
   Regression for the "TROPHIES → BACK → stuck 'SUMMONING THE WILD…' / 'Growing the forest…'" bug.
   v2: the two card primaries (NEW GAME / RESUME GAME) are themselves the drop-down triggers —
   they have no action of their own; each opens its two choices below it. */
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
  ck('boot completes → primary buttons armed', !R.disabled && /RESUME GAME/.test(R.text) && /awaits/.test(R.line), JSON.stringify(R));
  // the redesigned home menu: two main options (each triggers a drop-down) + the side record
  R = await pg.evaluate(() => ({
    newGame: !!el('btnNewGame'), start: !!el('btnStart'), record: !!el('btnRecord'),
    trophies: !!el('btnTrophies'),
    // the redundant side "Watch the AI Play" button was removed — it lives in the NEW GAME drop-down now
    aiSideGone: !el('btnMenuAI'), oldPauseGone: !el('btnResume'),
    ddNew: !!el('ddNewGame') && !!el('ddNewStart') && !!el('ddNewAI'),
    ddResume: !!el('ddResume') && !!el('ddResumePlay') && !!el('ddResumeAI'),
    resumeDisabled: el('ddResumePlay') && el('ddResumePlay').disabled
  }));
  ck('redesigned menu present (2 cards + side buttons)', R.newGame && R.start && R.record && R.trophies && R.aiSideGone, JSON.stringify(R));
  ck('each card has its two drop-down options', R.ddNew && R.ddResume, JSON.stringify(R));
  ck('resume options greyed when there is nothing to resume', R.resumeDisabled === true, String(R.resumeDisabled));
  // NEW GAME button itself opens its drop-down (no separate caret; no direct action)
  await pg.click('#btnNewGame');
  await pg.waitForTimeout(150);
  const ddOpen = await pg.evaluate(() => el('ddNewGame').style.display === 'block');
  ck('NEW GAME button opens the New Game drop-down', ddOpen);
  await pg.click('#btnNewGame');   // toggle it closed before the trophies round-trip
  await pg.waitForTimeout(100);
  await pg.click('#btnTrophies');
  await pg.waitForTimeout(250);
  R = await pg.evaluate(() => document.getElementById('ovTitle').textContent);
  ck('TROPHIES opens', /TROPHIES/i.test(R), R);
  await pg.click('#btnTrophiesBack');
  await pg.waitForTimeout(250);
  R = await pg.evaluate(() => ({ disabled: el('btnStart').disabled, text: el('btnStart').textContent.trim(), line: el('bootLine').textContent }));
  ck('BACK → start page re-armed (bug 1)', !R.disabled && /RESUME GAME/.test(R.text) && /awaits/.test(R.line), JSON.stringify(R));
  // "▶ Start Game" (under NEW GAME) begins a fresh world: it rolls a NEW seed, reloads,
  // and drops straight into play. This proves the re-armed New Game card is live after the
  // TROPHIES round-trip AND that a fresh human start actually enters the wild.
  const seedBefore = await pg.evaluate(() => new URL(location.href).searchParams.get('seed'));
  await pg.click('#btnNewGame');
  await pg.waitForTimeout(150);
  await pg.click('#ddNewStart');
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  const seedAfter = await pg.evaluate(() => new URL(location.href).searchParams.get('seed'));
  const entered = await pg.evaluate(() => ({ state, hidden: document.getElementById('overlay').classList.contains('hidden') }));
  ck('Start Game enters a fresh world and plays (new seed)', !!seedAfter && seedAfter !== seedBefore && entered.state === 'play' && entered.hidden, JSON.stringify({ seedBefore, seedAfter, ...entered }));
} catch (e) { fails.push('crash: ' + e.message.slice(0, 140)); } finally { await b.close(); }
if (fails.length) { console.log('MENU TEST FAIL'); process.exit(1); }
console.log('MENU TEST PASS');
