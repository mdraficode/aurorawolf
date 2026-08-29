#!/usr/bin/env node
// Marathon runner v2 (restored after workspace incident — behavior-equivalent rewrite).
// Usage: node test/marathon.mjs [wallSeconds=240] [simMinutes=40]
// One chapter = one fresh world. Streams bot events to test/marathon.jsonl, appends the chapter
// record to test/marathon-chapters.jsonl, keeps live status in test/marathon-live.json.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const [WALL = 240, SIMMIN = 40] = process.argv.slice(2).map(Number);
const SEED = 10000 + Math.floor(Math.random() * 90000);
const CH = JSON.parse(fs.readFileSync(new URL('./marathon-chapters.jsonl', import.meta.url), 'utf8').trim().split('\n').pop()).ch + 1;
const PAGE_URL = `file:///home/user/index.html?autopilot=1&autostart=1&seed=${SEED}&quality=low&speed=12&rate=3&re=3`;

const stamp = () => new Date().toISOString().slice(11, 19);
fs.writeFileSync('test/marathon-live.json', JSON.stringify({ ch: CH, seed: SEED, state: 'launching', t: Date.now() }));
console.log(`${stamp()} CH${CH} seed=${SEED} · ${WALL}s wall / ${SIMMIN} sim-min`);

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 256, height: 144 } });
const errs = []; page.on('pageerror', e => { errs.push(e.message); fs.appendFileSync('test/marathon.jsonl', JSON.stringify({ t: Date.now(), type: 'bug-pageerror', msg: e.message }) + '\n'); });

await page.goto(PAGE_URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });

const t0 = Date.now();
let lastEvt = 0, lastStats = { kills: 0, deeds: 0, deaths: 0, level: 1 };
const stream = fs.createWriteStream('test/marathon.jsonl', { flags: 'a' });

while ((Date.now() - t0) / 1000 < WALL) {
  await new Promise(r => setTimeout(r, 5000));
  let s;
  try {
    s = await page.evaluate(() => {
      const L = window.BOTLOG || [], N = window.BOTN || {};
      return {
        level: wolf.level, xp: Math.round(wolf.xp),
        kills: N.kill || L.filter(e => e.type === 'kill').length,
        deeds: N.deed || L.filter(e => e.type === 'deed').length,
        deaths: N.death || L.filter(e => e.type === 'death').length,
        goals: N.goal || 0,
        lastGoal: (L.filter(e => e.type === 'goal').slice(-1)[0] || {}).msg || '',
        dist: Math.round(wolf.distance),
        gameMin: Math.round((wolf.playTime || 0) / 60)
      };
    });
  } catch (e) { console.log(`${stamp()} CDP hiccup: ${String(e.message).slice(0, 60)} — retrying`); continue; }
  // cumulative counters (BOTLOG is capped — track maxima, not sums)
  lastStats.kills = Math.max(lastStats.kills, 0);
  const live = { ch: CH, seed: SEED, state: 'running', t: Date.now(), wallSec: Math.round((Date.now() - t0) / 1000), ...s };
  fs.writeFileSync('test/marathon-live.json', JSON.stringify(live));
  console.log(`${stamp()} CH${CH} · ${Math.round((Date.now() - t0) / 1000)}s · L${s.level} · ${s.kills}k/${s.deeds}d · 💀${s.deaths} · ${s.lastGoal.slice(0, 48)}`);
}

// close the chapter
let rec;
try {
  rec = await page.evaluate(() => {
    const L = window.BOTLOG || [], N = window.BOTN || {};
    return {
      level: wolf.level,
      kills: N.kill || L.filter(e => e.type === 'kill').length,
      deeds: N.deed || L.filter(e => e.type === 'deed').length,
      deaths: N.death || L.filter(e => e.type === 'death').length,
      goals: N.goal || 0,
      gameMin: Math.round((wolf.playTime || 0) / 60),
      dist: Math.round(wolf.distance),
      perks: (() => { try { const p = wolf.perks; if (Array.isArray(p)) return p.map(x => x.id || x); if (p && typeof p === 'object') return Object.keys(p).filter(k => p[k]); return []; } catch (e) { return ['?']; } })(),
      spirit: !!(wolf.spiritMet || window.__spiritMet)
    };
  });
} catch (e) { rec = { note: 'closed-dirty:' + String(e.message).slice(0, 40) }; }
const out = { ch: CH, seed: SEED, wallMin: +((Date.now() - t0) / 60000).toFixed(1), ...rec, pageErrors: errs.length, ts: new Date().toISOString().slice(0, 16) };
fs.appendFileSync('test/marathon-chapters.jsonl', JSON.stringify(out) + '\n');
fs.writeFileSync('test/marathon-live.json', JSON.stringify({ ch: CH, seed: SEED, state: 'done', ...out }));
console.log(`${stamp()} CH${CH} CLOSED — L${rec.level || '?'} ${rec.kills ?? '?'}k/${rec.deeds ?? '?'}d 💀${rec.deaths ?? '?'} · errors ${errs.length}`);
await browser.close();
process.exit(0);
