// Real-game behavior probe: autopilot at TRUE game speed (no ?speed boost, default density) —
// what a player pressing 🤖 actually sees. Usage: node test/real1x.mjs [seed] [wallSeconds]
import { chromium } from 'playwright';
import fs from 'fs';

const SEED = +(process.argv[2] || 777001);
const DUR = +(process.argv[3] || 600);
const OUT = 'test/real1x.jsonl';
const stamp = () => new Date().toISOString().slice(11, 19);
fs.writeFileSync(OUT, '');

const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: +(process.env.PW || 800), height: +(process.env.PH || 420) } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`file:///home/user/index.html?autopilot=1&autostart=1&seed=${SEED}&quality=low`, { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
console.log(`${stamp()} seed ${SEED} · REAL-SPEED run · ${DUR}s`);

const t0 = Date.now();
let lastN = 0;
while ((Date.now() - t0) / 1000 < DUR) {
  await pg.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const c = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(c); else { window.__fpsProbe = n; res(); } }; requestAnimationFrame(c); }));
  let s;
  try {
    s = await pg.evaluate(() => {
      const L = window.BOTLOG || [], N = window.BOTN || {};
      const evts = L.slice(window.__mIdx || 0); window.__mIdx = L.length;
      const q = QUESTS.active[0];
      return {
        wall: 0, level: wolf.level, kills: N.kill || 0, loops: N['loop-break'] || 0,
        x: +wolf.pos.x.toFixed(0), z: +wolf.pos.z.toFixed(0), od: Math.round(wolf.distance),
        stam: Math.round(wolf.stamina), hp: Math.round(wolf.hp),
        goal: ((L.filter(e => e.type === 'goal').slice(-1)[0] || {}).msg || '').replace(/ · hp.*$/, ''),
        crouch: !!wolf.crouch, swim: !!wolf.swimming, grounded: !!wolf.grounded, y: +wolf.pos.y.toFixed(1),
        wy: +(typeof waterYNow === 'function' ? waterYNow() : -99).toFixed(1),
        fps: +(window.__fpsProbe || 0), keysW: !!(window.keysRef ? true : (typeof keys !== 'undefined' ? keys.KeyW : false)), quest: q ? q.icon + ' ' + q.title + ' ' + q.have + '/' + q.need : 'none',
        evts: evts.map(e => e.type + (e.msg ? ':' + String(e.msg).slice(0, 60) : '')).slice(-40)
      };
    });
  } catch (e) { console.log(`${stamp()} CDP hiccup — ${String(e.message).slice(0, 50)}`); continue; }
  s.wall = Math.round((Date.now() - t0) / 1000);
  fs.appendFileSync(OUT, JSON.stringify(s) + '\n');
  const evNew = s.evts.length - lastN; lastN = s.evts.length;
  console.log(`${stamp()} ${String(s.wall).padStart(3)}s · L${s.level} ${String(s.kills).padStart(2)}k · od ${s.od} · stam ${s.stam} · 🎯${s.goal.slice(0, 34)} · 📜${s.quest.slice(0, 22)}`);
}
console.log(`${stamp()} DONE · pageErrors ${errs.length}`);
await b.close();
