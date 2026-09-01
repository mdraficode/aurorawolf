// Full autopilot playthrough — bug hunt. Fresh world, human-like progression.
import { chromium } from 'playwright';
import fs from 'fs';

const SEED = process.env.SEED || String((Math.random() * 1e6) | 0);
const MINUTES = +(process.env.MINUTES || 15);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 405 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
console.log(`seed=${SEED} — playing ${MINUTES} min like a human\n`);
await page.goto(`file:///home/user/watch.html?autopilot=1&seed=${SEED}&quality=low`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
console.log('t=0 — entered the wild');

let shot = 0;
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < MINUTES * 60) {
  await page.waitForTimeout(60000);
  shot++;
  await page.screenshot({ path: `shots/play_${String(shot).padStart(2, '0')}.png`, timeout: 90000 }).catch(() => {});
  const P = await page.evaluate(() => ({
    t: ((performance.now()) / 1000) | 0,
    pos: [wolf.pos.x | 0, wolf.pos.z | 0], biome: curBiomeKey, time: tDay.toFixed(2), day: dayCount,
    hp: wolf.hp | 0, stam: wolf.stamina | 0, lvl: wolf.level, xp: wolf.xp | 0,
    act: QUESTS.active.map(q => `${q.have}/${q.need} ${q.title}`), done: QUESTS.done.length,
    log: BOTLOG.filter(e => e.type !== 'sample').slice(-6).map(e => `${e.t}s ${e.type} ${e.msg || e.title || ''}`)
  })).catch(e => ({ err: e.message.slice(0, 80) }));
  console.log(`--- minute ${shot} —`, JSON.stringify(P));
}

const LOG = await page.evaluate(() => window.BOTLOG);
fs.writeFileSync('test/playlog.json', JSON.stringify({ seed: SEED, log: LOG, pageErrors: errs }, null, 1));
const bugs = LOG.filter(e => e.type.startsWith('bug') || e.type === 'error-banner' || e.type === 'page-error' || e.type === 'stuck' || e.type === 'death');
console.log(`\n=== run over: ${LOG.length} log entries, ${bugs.length} bug-signal events, ${errs.length} page errors ===`);
for (const b of bugs) console.log('  •', b.t + 's', b.type, b.key || '', b.msg || '');
await browser.close();
