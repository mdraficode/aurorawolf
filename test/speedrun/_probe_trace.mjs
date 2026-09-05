/* ============================================================================
   🔬 RING-TRACE PROBE — recovered 2026-09-05 from the trainer's `Training-v2.patch`
   (it sat uncommitted at the repo root as `_probe_trace.mjs`; moved here next to
   `_aim_fast_probe.mjs`, path made repo-relative — nothing else changed).
   ----------------------------------------------------------------------------
   Spawns a tier-1 Legend (dmg 0, no attacks) beside the wolf on seed 7777 and drives
   the OLD sprint ring grammar (arc → dart → back, RING 3.9 / DART_IN 2.5 / DART_OUT 3.7)
   for 400 × 0.05 s polls, printing a JSON trace every 2 s: mode, range r, the Legend's
   facing dot (−1 = dead behind), stamina, exhaustion and speed. It is the instrument that
   showed the sprint ring never closes (r pinned, tank drained) — superseded by the PARK
   law (probe_fight v25, TRAINING_MANUAL §5.5 drill 7). Kept as a diagnostic.

   usage: node test/speedrun/_probe_trace.mjs
   ============================================================================ */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const here = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(here), '..', '..');   // repo root (was a hard-coded /home/user/aurorawolf)
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href + '?autostart=1&seed=7777&quality=low&speed=8&rate=4&re=10';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP, null, { timeout: 120000 });
await pg.waitForTimeout(1500);
const r = await pg.evaluate(() => {
  const S = window.CAMP.state();
  const def = window.CAMP.legendDef();
  // spawn legend like probe's __spawnLegend
  const leg = 0, tier = 1;
  const x = wolf.pos.x + 14, z = wolf.pos.z;
  const bs = new Boss('forest', x, z, false, Object.assign(def, { dmg: 0, atkGap: 999 }));
  const RING = 3.9, DART_IN = 2.5, DART_OUT = 3.7, ORB = 1;
  let ang = Math.atan2(wolf.pos.x - bs.pos.x, wolf.pos.z - bs.pos.z);
  wolf.pos.x = bs.pos.x + Math.sin(ang) * RING; wolf.pos.z = bs.pos.z + Math.cos(ang) * RING;
  wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z);
  wolf.yaw = Math.atan2(bs.pos.x - wolf.pos.x, bs.pos.z - wolf.pos.z);
  wolf.level = 0; wolf.maxHp = wolf.hp = 100; wolf.maxStam = wolf.stamina = 100;
  let mode = 'arc', cd = 0;
  const DT = 0.05; let trace = [];
  for (let k = 0; k < 400 && !bs.dead; k++) {
    const r = Math.hypot(wolf.pos.x - bs.pos.x, wolf.pos.z - bs.pos.z);
    const toB = Math.atan2(bs.pos.x - wolf.pos.x, bs.pos.z - wolf.pos.z);
    if (bs.biteT > 0 && mode === 'arc' && r < RING + 2.6) mode = 'back';
    else if (cd <= 0 && mode === 'arc' && r < RING + 2.2 && !bs.invuln && bs.biteT <= 0) mode = 'dart';
    else if (mode === 'dart' && (r <= DART_IN || cd > 0)) mode = 'back';
    else if (mode === 'back' && r >= DART_OUT) mode = 'arc';
    let moveDir, v = 13.5;
    if (mode === 'dart') moveDir = toB; else if (mode === 'back') moveDir = toB + Math.PI; else moveDir = toB + ORB * Math.PI / 2;
    if (v > 0) {
      if (wolf.stamina > 0 && !wolf.exhausted) { wolf.stamina -= 15 * DT; if (wolf.stamina <= 0) { wolf.stamina = 0; wolf.exhausted = true; } }
      else { wolf.stamina = Math.min(wolf.maxStam, wolf.stamina + 11 * DT); if (wolf.exhausted && wolf.stamina > 26) wolf.exhausted = false; }
      if (wolf.exhausted || wolf.stamina <= 0) v = 7;
    }
    if (moveDir !== null && v > 0) {
      wolf.pos.x += Math.sin(moveDir) * v * DT; wolf.pos.z += Math.cos(moveDir) * v * DT;
      wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z);
      wolf.yaw += wrapPI(moveDir - wolf.yaw) * Math.min(1, DT * 9);
    } else { wolf.yaw += wrapPI(toB - wolf.yaw) * Math.min(1, DT * 9); }
    bs.update(DT, tSec);
    wolf.invulnT = Math.max(0, (wolf.invulnT || 0) - DT);
    const twx = wolf.pos.x - bs.pos.x, twz = wolf.pos.z - bs.pos.z;
    const facing = (Math.sin(bs.heading) * twx + Math.cos(bs.heading) * twz) / (Math.hypot(twx, twz) || 1);
    cd -= DT;
    if (cd <= 0 && !bs.invuln && wolf.deadT <= 0) {
      const fx = Math.sin(wolf.yaw), fz = Math.cos(wolf.yaw);
      const ddx = bs.pos.x - wolf.pos.x, ddz = bs.pos.z - wolf.pos.z, d2 = Math.hypot(ddx, ddz) || 1;
      if ((ddx*fx+ddz*fz)/d2 >= 0.2 && d2 <= 3.6 + bs.sp.scale*0.7) { wolf.atkCd = 0; wolf.attack(); cd = 0.75; }
    }
    if (k % 40 === 0) trace.push({ k, t: +(k*DT).toFixed(1), mode, r:+r.toFixed(2), facing:+facing.toFixed(2), stam:+(wolf.stamina).toFixed(0), exh:wolf.exhausted, v:+v.toFixed(1) });
    if (k === 0 || k === 400-1) trace.push({ k, t:+(k*DT).toFixed(1), mode, r:+r.toFixed(2), facing:+facing.toFixed(2), stam:+(wolf.stamina).toFixed(0), exh:wolf.exhausted, v:+v.toFixed(1) });
  }
  bs.dead = true; try{bs.dispose();}catch(e){}
  wolf.hp = wolf.maxHp = 100; wolf.deadT = 0; wolf.level = 0;
  return trace;
});
console.log(JSON.stringify(r, null, 0));
await b.close();
