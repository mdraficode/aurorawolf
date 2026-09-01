import { chromium } from 'playwright';
import fs from 'fs';
const file = process.argv[2], label = process.argv[3];
const tmp = `/tmp/ab_${label}.html`; fs.copyFileSync(file, tmp);
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`file://${tmp}?autopilot=1&nolearn=1&seed=7777&quality=low&speed=8&rate=3&re=3`, { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.RAFZZER, null, { timeout: 90000 });
await pg.waitForTimeout(190000);
const o = await pg.evaluate(() => {
  const BN = window.BOTN || {};
  const invSum = Object.entries(inv || {}).filter(([k]) => ['meat','berry','herb','mushroom'].includes(k)).reduce((s,[,v]) => s + (v|0), 0);
  return { lvl: wolf.level, xp: wolf.xp | 0, dist: +wolf.distance.toFixed(0), kills: BN['kill'] || 0, giveup: BN['chase-giveup'] || 0, stalkBroken: BN['stalk-broken'] || 0, ambush: BN['ambush'] || 0, qAccept: BN['quest-acceptQuest'] || 0, qDone: BN['quest-completeQuest'] || 0, stalled: BN['bug-quest-stalled'] || 0, bites: BN['bite'] || 0, warns: (window.__boost && __boost.warns) || 0 };
});
console.log(label, JSON.stringify({ ...o, errs: errs.length }));
await pg.close(); await b.close();
