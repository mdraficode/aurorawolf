/* ============================================================================
   SPEEDRUN LAB · probe 1 — THE LEGEND'S HIDE   (post-fix verification)
   What does a bite on a Legend actually cost, and can a player survive the trade?

   The arena is cleared first (every wild animal / predator / rival within 60 m is
   removed) so a bite can only ever land on the Legend under test — an earlier
   version of this probe measured 0 dmg because a passing deer ate the swing.

     1. the static ring  — a bite from each of 8 bearings around a Legend that has
        had a second of game time to look at you.
     2. the sprint orbit — 200 sim-seconds of a player sprinting the blind side at
        the real orbit rate (13.5 m/s) and swinging on the real 0.75 s cadence:
        dmg/swing, share of blind-side time, swings taken, time-to-kill.
     3. the walk orbit   — the same at walking pace (7 m/s): the Legend's turn rate
        beats you, so this is the punishment line.
     4. the prowl orbit  — 0.42× pace, crouched: does +1 dmg pay for the lost circle?

   usage: node test/speedrun/probe_boss_dps.mjs
   ============================================================================ */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(here), '../..');
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href + '?autostart=1&seed=7777&quality=low&speed=8&rate=4&re=10';

const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
pg.on('pageerror', e => errs.push(e.message));
await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP, null, { timeout: 120000 });
await pg.waitForTimeout(2500);

/* shared page-side helpers, installed once */
await pg.evaluate(() => {
  /* empty the arena: nothing but the Legend under test may be within 60 m */
  window.__clearArena = (x, z, R = 60) => {
    let n = 0;
    for (const ch of chunks.values()) {
      for (const arr of ['animals', 'predators']) {
        for (let i = ch[arr].length - 1; i >= 0; i--) {
          const a = ch[arr][i];
          if (Math.hypot(a.pos.x - x, a.pos.z - z) > R) continue;
          ch[arr].splice(i, 1);
          try { a.dispose(); } catch (e) { }
          n++;
        }
      }
    }
    for (let i = rivals.length - 1; i >= 0; i--) {
      const r = rivals[i];
      if (Math.hypot(r.pos.x - x, r.pos.z - z) > R) continue;
      rivals.splice(i, 1); try { r.dispose(); } catch (e) { } n++;
    }
    return n;
  };
  window.__spawnLegend = (legIdx, tier) => {
    const S = window.CAMP.state();
    S.leg = legIdx; S.tier = tier || 1;
    const def = window.CAMP.legendDef();
    const x = wolf.pos.x + 26, z = wolf.pos.z;
    window.__clearArena(x, z, 70);
    bosses.push(new Boss(def.camp === 'beast' ? 'enchanted' : 'forest', x, z, false, def));
    const bs = bosses[bosses.length - 1];
    wolf.hp = wolf.maxHp = 100; wolf.level = 0; wolf.stamina = wolf.maxStam = 999;
    wolf.deadT = 0; wolf.invulnT = 0; wolf.flyT = 0; wolf.perks = {}; wolf.crouch = false;
    return bs;
  };
});

/* ---- 1. the static ring ---- */
const ring = await pg.evaluate(() => {
  const out = [];
  const def = (() => { const S = window.CAMP.state(); S.leg = 0; S.tier = 1; return Object.assign(window.CAMP.legendDef(), { dmg: 0, atkGap: 999 }); })();
  const x = wolf.pos.x + 30, z = wolf.pos.z;
  window.__clearArena(x, z, 70);
  bosses.push(new Boss('forest', x, z, false, def));
  const bs = bosses[bosses.length - 1];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    wolf.pos.x = bs.pos.x + Math.sin(a) * 3.0; wolf.pos.z = bs.pos.z + Math.cos(a) * 3.0;
    wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z);
    for (let k = 0; k < 20; k++) bs.update(0.05, tSec);      // a second to look at me
    wolf.yaw = Math.atan2(bs.pos.x - wolf.pos.x, bs.pos.z - wolf.pos.z);
    wolf.atkCd = 0; wolf.crouch = false; wolf.perks = {};
    const before = bs.hp; wolf.attack();
    const twx = wolf.pos.x - bs.pos.x, twz = wolf.pos.z - bs.pos.z;
    const facing = (Math.sin(bs.heading) * twx + Math.cos(bs.heading) * twz) / (Math.hypot(twx, twz) || 1);
    out.push({ bearingDeg: Math.round(a * 180 / Math.PI), bossFacing: +facing.toFixed(2), dmg: +(before - bs.hp).toFixed(2) });
  }
  bs.dead = true; bs.dispose();
  return out;
});
console.log('1 · static ring (standing still, a Legend that has had 1 s to turn):');
console.log('   ' + ring.map(r => `${r.bearingDeg}°: face ${r.bossFacing} → ${r.dmg} dmg`).join('  '));

/* ---- 2+. THE STAB DANCE ----
   HONEST movement model. p3's Wolf.update eases wolf.yaw toward the MOVEMENT
   direction at 9 rad/s, and a bite needs the target inside a 78° cone of that yaw
   (dot >= 0.2). So a player can NOT bite while running a clean tangent circle — the
   Legend sits 90° off the nose. What a human actually does is a stab dance:
     · ARC  — run the tangent at sprint, hold the ring, stay on the blind side
     · DART — cut straight in; the nose swings onto the Legend; F the instant the
              cone is satisfied (the swing resolves on the frame you press it)
     · BACK — reverse out to the ring and arc again while the 0.75 s swing reloads
   This controller plays exactly that, with the game's own stamina economy
   (15/s out, 11/s back, exhausted → walking pace).
   -------------------------------------------------------------------------- */
const fight = (o) => pg.evaluate(({ spd, secs, crouch, leg, tier, level, stand, read }) => {
  const bs = window.__spawnLegend(leg, tier);
  wolf.crouch = !!crouch;
  if (level) { wolf.level = level; wolf.maxHp = wolf.hp = 100 + 8 * level; wolf.maxStam = wolf.stamina = 100 * (1 + 0.05 * level); }
  const RING = 3.9, DART_IN = 2.5, DART_OUT = 3.7, ORB = 1;
  let ang = Math.atan2(wolf.pos.x - bs.pos.x, wolf.pos.z - bs.pos.z);
  wolf.pos.x = bs.pos.x + Math.sin(ang) * RING; wolf.pos.z = bs.pos.z + Math.cos(ang) * RING;
  wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z);
  wolf.yaw = Math.atan2(bs.pos.x - wolf.pos.x, bs.pos.z - wolf.pos.z);
  let mode = 'arc';
  let behind = 0, ticks = 0, swings = 0, landed = 0, dmgDealt = 0, hitsTaken = 0, dmgTaken = 0, cd = 0;
  let hpLast = wolf.hp, deaths = 0, coneSwings = 0, spentS = 0, arcS = 0, dartS = 0;
  const DT = 0.05, N = Math.round(secs / DT);
  for (let k = 0; k < N && !bs.dead; k++) {
    ticks++;
    const r = Math.hypot(wolf.pos.x - bs.pos.x, wolf.pos.z - bs.pos.z);
    const toB = Math.atan2(bs.pos.x - wolf.pos.x, bs.pos.z - wolf.pos.z);
    /* the stab-dance state machine */
    if (stand) mode = 'stand';
    else if (read && bs.biteT > 0 && mode === 'arc' && r < RING + 2.6) mode = 'back';   // a wind-up is coming: widen out
    else if (cd <= 0 && mode === 'arc' && r < RING + 2.2 && !bs.invuln && (!read || bs.biteT <= 0)) mode = 'dart';
    else if (mode === 'dart' && (r <= DART_IN || cd > 0)) mode = 'back';   // the bite landed (or we are inside) → get out
    else if (mode === 'back' && r >= DART_OUT) mode = 'arc';
    let moveDir, v = spd;
    if (mode === 'stand') { moveDir = null; v = 0; }
    else if (mode === 'dart') moveDir = toB;
    else if (mode === 'back') moveDir = toB + Math.PI;
    else moveDir = toB + ORB * Math.PI / 2;
    /* honest stamina: sprinting costs 15/s, comes back at 11/s, exhausted = walk */
    if (v > 0 && !crouch) {
      if (wolf.stamina > 0 && !wolf.exhausted) { wolf.stamina -= 15 * DT; if (wolf.stamina <= 0) { wolf.stamina = 0; wolf.exhausted = true; } }
      else { wolf.stamina = Math.min(wolf.maxStam, wolf.stamina + 11 * DT); if (wolf.exhausted && wolf.stamina > 26) wolf.exhausted = false; }
      if (wolf.exhausted || wolf.stamina <= 0) { v = 7; spentS += DT; }
    } else if (crouch) wolf.stamina = Math.min(wolf.maxStam, wolf.stamina + 11 * DT);
    if (moveDir !== null && v > 0) {
      wolf.pos.x += Math.sin(moveDir) * v * DT; wolf.pos.z += Math.cos(moveDir) * v * DT;
      wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z);
      wolf.yaw += wrapPI(moveDir - wolf.yaw) * Math.min(1, DT * 9);   // the game's own yaw law
      wolf.speed = v;
    } else { wolf.yaw += wrapPI(toB - wolf.yaw) * Math.min(1, DT * 9); wolf.speed = 0; }  // standing: face it
    if (mode === 'arc') arcS += DT; else if (mode !== 'stand') dartS += DT;
    bs.update(DT, tSec);
    wolf.invulnT = Math.max(0, (wolf.invulnT || 0) - DT);   // wolf.update() is not running here — decay the i-frames by hand
    updateHUD(DT);
    const twx = wolf.pos.x - bs.pos.x, twz = wolf.pos.z - bs.pos.z;
    const facing = (Math.sin(bs.heading) * twx + Math.cos(bs.heading) * twz) / (Math.hypot(twx, twz) || 1);
    if (facing < -0.35) behind++;
    cd -= DT;
    if (cd <= 0 && !bs.invuln && wolf.deadT <= 0) {
      const fx = Math.sin(wolf.yaw), fz = Math.cos(wolf.yaw);
      const ddx = bs.pos.x - wolf.pos.x, ddz = bs.pos.z - wolf.pos.z, d2 = Math.hypot(ddx, ddz) || 1;
      const inCone = (ddx * fx + ddz * fz) / d2 >= 0.2 && d2 <= 3.6 + bs.sp.scale * 0.7;
      if (inCone) { coneSwings++; const h0 = bs.hp; wolf.atkCd = 0; wolf.attack(); swings++; if (bs.hp < h0) { landed++; dmgDealt += h0 - bs.hp; } cd = 0.75; }
    }
    if (wolf.hp < hpLast - 0.01) { hitsTaken++; dmgTaken += hpLast - wolf.hp; }
    if (wolf.deadT > 0) deaths++;
    hpLast = wolf.hp;
  }
  const res = {
    legend: bs.def.name, hp: bs.maxHp, dmg: bs.def.dmg, lvl: wolf.level,
    simS: +(ticks * DT).toFixed(1), swings, landed, dmgPerLanded: landed ? +(dmgDealt / landed).toFixed(2) : 0,
    dmgDealt: +dmgDealt.toFixed(1), bossHpLeft: +bs.hp.toFixed(1), slain: bs.dead,
    behindShare: +(behind / ticks).toFixed(2), hitsTaken, dmgTaken: +dmgTaken.toFixed(1),
    wolfHpLeft: +wolf.hp.toFixed(1), deaths, spentS: +spentS.toFixed(1),
    dps: +(dmgDealt / Math.max(0.1, ticks * DT)).toFixed(2), edps: +(dmgTaken / Math.max(0.1, ticks * DT)).toFixed(2)
  };
  if (!bs.dead) { bs.dead = true; bs.dispose(); }
  wolf.hp = wolf.maxHp = 100; wolf.deadT = 0; wolf.crouch = false; wolf.level = 0;
  return res;
}, o);

const show = r => `   ${r.legend.padEnd(17)} hp ${String(r.hp).padStart(3)} · ${r.dmgPerLanded} dmg/bite (${r.landed}/${r.swings}) · blind side ${String(Math.round(r.behindShare * 100)).padStart(3)}% · ${r.dps} dps out / ${r.edps} in · slain ${r.slain ? 'YES @ ' + r.simS + 's' : 'NO (' + r.bossHpLeft + ' left)'} · wolf lv${r.lvl} ${r.wolfHpLeft} hp, ${r.hitsTaken} bites eaten (${r.dmgTaken} dmg), ${r.deaths} deaths, ${r.spentS}s spent`;

/* the sky Legend: it is only strikeable inside the dive (invuln aloft) — you get one bite per dive */
const sky = (o) => pg.evaluate(({ spd, secs, leg, tier, level }) => {
  const bs = window.__spawnLegend(leg, tier);
  if (level) { wolf.level = level; wolf.maxHp = wolf.hp = 100 + 8 * level; wolf.maxStam = wolf.stamina = 100 * (1 + 0.05 * level); }
  let ticks = 0, landed = 0, dmgDealt = 0, hitsTaken = 0, dmgTaken = 0, hpLast = wolf.hp, dives = 0, groundTicks = 0, deaths = 0;
  const DT = 0.05, N = Math.round(secs / DT);
  let cd = 0, lastDive = false;
  for (let k = 0; k < N && !bs.dead; k++) {
    ticks++;
    /* stand your ground on the dive line, nose on the bird, and swing when it is strikeable */
    wolf.yaw += wrapPI(Math.atan2(bs.pos.x - wolf.pos.x, bs.pos.z - wolf.pos.z) - wolf.yaw) * Math.min(1, DT * 9);
    wolf.speed = 0; wolf.stamina = wolf.maxStam;
    bs.update(DT, tSec); wolf.invulnT = Math.max(0, (wolf.invulnT || 0) - DT); updateHUD(DT);
    const diving = (bs.diveT || 0) > 0;
    if (diving && !lastDive) dives++;
    lastDive = diving;
    if (!bs.invuln) groundTicks++;
    cd -= DT;
    if (cd <= 0 && !bs.invuln && wolf.deadT <= 0) {
      const d = Math.hypot(bs.pos.x - wolf.pos.x, bs.pos.z - wolf.pos.z);
      const fx = Math.sin(wolf.yaw), fz = Math.cos(wolf.yaw);
      const dot = ((bs.pos.x - wolf.pos.x) * fx + (bs.pos.z - wolf.pos.z) * fz) / (d || 1);
      if (d <= 3.6 + bs.sp.scale * 0.7 && dot >= 0.2 && Math.abs(bs.pos.y - wolf.pos.y) <= 3.5) {
        const h0 = bs.hp; wolf.atkCd = 0; wolf.attack(); if (bs.hp < h0) { landed++; dmgDealt += h0 - bs.hp; }
        cd = 0.75;
      }
    }
    if (wolf.hp < hpLast - 0.01) { hitsTaken++; dmgTaken += hpLast - wolf.hp; }
    if (wolf.deadT > 0) deaths++;
    hpLast = wolf.hp;
  }
  const out = { legend: bs.def.name, hp: bs.maxHp, dmg: bs.def.dmg, simS: +(ticks * DT).toFixed(1), dives,
    groundS: +(groundTicks * DT).toFixed(1), landed, dmgPerBite: landed ? +(dmgDealt / landed).toFixed(1) : 0,
    slain: bs.dead, bossHpLeft: +bs.hp.toFixed(1), hitsTaken, dmgTaken: +dmgTaken.toFixed(0), wolfHp: +wolf.hp.toFixed(0), deaths };
  if (!bs.dead) { bs.dead = true; bs.dispose(); }
  wolf.level = 0; wolf.maxHp = wolf.hp = 100;
  return out;
}, o);

console.log('\n2 · THE STAB DANCE at sprint pace (13.5 m/s, honest stamina) — tier 1, level 0 wolf (100 hp):');
for (const leg of [0, 1, 2, 3]) console.log(show(await fight({ spd: 13.5, secs: 400, leg, tier: 1 })));
console.log(show(await fight({ spd: 13.5, secs: 900, leg: 5, tier: 1 })));

console.log('\n3 · the EAGLE Legend (strikeable only inside the dive — stand the dive line and swing):');
{
  const r = await sky({ spd: 0, secs: 400, leg: 4, tier: 1 });
  console.log(`   ${r.legend} hp ${r.hp} dmg ${r.dmg} · ${r.dives} dives in ${r.simS}s, ${r.groundS}s strikeable · ${r.landed} bites @ ${r.dmgPerBite} · slain ${r.slain ? 'YES @ ' + r.simS + 's' : 'NO (' + r.bossHpLeft + ' left)'} · wolf ${r.wolfHp} hp, ${r.hitsTaken} dives eaten (${r.dmgTaken} dmg), ${r.deaths} deaths`);
}

console.log('\n4 · WALKING the ring (7 m/s — the Legend out-turns you, so you eat the swings):');
for (const leg of [0, 5]) console.log(show(await fight({ spd: 7, secs: 300, leg, tier: 1 })));

console.log('\n5 · STANDING STILL and trading (what a new player does — the punishment line):');
for (const leg of [0, 5]) console.log(show(await fight({ spd: 13.5, secs: 200, leg, tier: 1, stand: true })));

console.log('\n6 · a LEVELLED wolf (lv 12, 196 hp, damage taken ×0.80) — the realistic tier-1 Beast Master fight:');
console.log(show(await fight({ spd: 13.5, secs: 600, leg: 5, tier: 1, level: 12 })));

console.log('\n7 · tier 2 (thp 1.7, tdmg 1.28) at level 14 — is the next lap still winnable?):');
console.log(show(await fight({ spd: 13.5, secs: 600, leg: 0, tier: 2, level: 14 })));

console.log('\n8 · the SKILLED line — the dance that READS THE TELEGRAPH (widen out during the 0.55 s wind-up, dart in only once the swing has resolved):');
for (const leg of [0, 3, 5]) console.log(show(await fight({ spd: 13.5, secs: 600, leg, tier: 1, read: true })));
console.log(show(await fight({ spd: 13.5, secs: 600, leg: 5, tier: 1, level: 12, read: true })));
console.log(show(await fight({ spd: 13.5, secs: 600, leg: 5, tier: 2, level: 20, read: true })));

console.log('\npage errors:', errs.length, errs.slice(0, 3));
await b.close();
