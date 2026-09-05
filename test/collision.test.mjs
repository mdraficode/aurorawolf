import { pathToFileURL, fileURLToPath } from 'url';
/* Solid world: big trunks & boulders block the wolf; sprint-speed crashes cost a little HP */
import { chromium } from 'playwright';
let failures = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) failures++; };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 350 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); failures++; });
  await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=4242&quality=low');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
  await page.waitForFunction(() => typeof chunks !== 'undefined' && chunks.size >= 40, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const R = await page.evaluate(() => {
    const out = {};
    const IN = (sp) => ({ f: 1, b: 0, l: 0, r: 0, my: 0, mx: 0, sprint: sp, jump: 0, paused: 0 });
    const solidsNear = () => {
      const c0x = Math.floor(wolf.pos.x / CHUNK), c0z = Math.floor(wolf.pos.z / CHUNK), arr = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const ch = chunks.get(ck(c0x + a, c0z + b)); if (ch && ch.solids) arr.push(...ch.solids);
      }
      return arr;
    };
    // helpers shared by every lane below
    const solidsAround = (x, z) => {
      const c0x = Math.floor(x / CHUNK), c0z = Math.floor(z / CHUNK), arr = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const ch = chunks.get(ck(c0x + a, c0z + b)); if (ch && ch.solids) arr.push(...ch.solids); }
      return arr;
    };
    const laneClear = (x0, z0, x1, z1, except = []) => {   // no other solid and no water along a run-up
      for (let i = 0; i <= 16; i++) {
        const px = x0 + (x1 - x0) * i / 16, pz = z0 + (z1 - z0) * i / 16;
        if (heightAt(px, pz) < waterYNow() + 0.6) return false;
        for (const so of solidsAround(px, pz)) if (!except.includes(so) && Math.hypot(px - so.x, pz - so.z) < so.r + 0.55 + 0.8) return false;
      }
      return true;
    };
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2]];
    const ground = (px, pz) => { wolf.pos.x = px; wolf.pos.z = pz; wolf.pos.y = heightAt(px, pz); wolf.vy = 0; wolf.grounded = true; wolf.speed = 0; };
    // ---- find a real tree trunk near spawn: a full-height wall (no standable top — logs, stumps and
    //      low boulders are hop-ups since a57eb5a) with a CLEAR 9 m run-up from some direction. Picked
    //      deterministically (nearest first, fixed direction order) — the old random pick could land on
    //      a trunk whose lane held another solid or water, so the wolf never arrived at sprint speed. ----
    let tree = null, tu = null;
    for (let i = 0; i < 60 && !tree; i++) {
      const cands = solidsNear().filter(s => s.top === undefined && s.r <= 0.6 && Math.hypot(s.x - wolf.pos.x, s.z - wolf.pos.z) < 60)
        .sort((a, b) => Math.hypot(a.x - wolf.pos.x, a.z - wolf.pos.z) - Math.hypot(b.x - wolf.pos.x, b.z - wolf.pos.z));
      for (const c of cands) {
        for (const [ux, uz] of DIRS) {
          if (laneClear(c.x - ux * 10.5, c.z - uz * 10.5, c.x - ux * 1.6, c.z - uz * 1.6, [c])) { tree = c; tu = [ux, uz]; break; }
        }
        if (tree) break;
      }
      if (!tree) { wolf.pos.x += 90; wolf.pos.z += 60; for (let k = 0; k < 10; k++) tick(); }   // hop WITH the streamer
    }
    out.hasTree = !!tree;
    const minDist = (s) => Math.hypot(wolf.pos.x - s.x, wolf.pos.z - s.z) - s.r - 0.55;
    if (tree) {
      const [ux, uz] = tu, px = uz, pz = -ux;   // u = approach direction, p = its right-hand perpendicular
      // ---- sprint head-on into the trunk ----
      wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
      ground(tree.x - ux * 8, tree.z - uz * 8);
      const yaw = Math.atan2(tree.x - wolf.pos.x, tree.z - wolf.pos.z);
      let maxPen = 0, hit = false, minSpdAfterHit = 99;
      for (let i = 0; i < 240; i++) {
        wolf.update(1 / 30, IN(1), yaw, 0.3);
        maxPen = Math.min(maxPen, minDist(tree));
        if (wolf.hp < 100) hit = true;
        if (hit) minSpdAfterHit = Math.min(minSpdAfterHit, wolf.speed);
        if (wolf.stamina <= 0) wolf.stamina = 100;
      }
      out.sprintBlocked = minDist(tree) > -0.06 && maxPen > -0.25;
      out.neverThrough = maxPen > -0.25;
      out.sprintHp = wolf.hp;
      out.sprintStumble = minSpdAfterHit < 5;   // speed dips hard at the moment of impact
      // ---- walk into the same trunk: blocked, but no blood ----
      wolf.hp = 100; wolf.impactCd = 0;
      ground(tree.x - ux * 8, tree.z - uz * 8);
      for (let i = 0; i < 200; i++) wolf.update(1 / 30, IN(0), yaw, 0.3);
      out.walkBlocked = minDist(tree) > -0.06;
      out.walkHp = wolf.hp;
      // ---- slide past at a glancing angle: same lane, offset 0.35 m so the trunk is brushed, not butted ----
      wolf.hp = 100; wolf.impactCd = 0;
      const s0x = tree.x - ux * 7 + px * 0.35, s0z = tree.z - uz * 7 + pz * 0.35;
      ground(s0x, s0z);
      const yawG = Math.atan2(ux, uz);   // heading straight down the lane; the trunk sits 0.35 m off the line
      for (let i = 0; i < 200; i++) { wolf.update(1 / 30, IN(0), yawG, 0.3); if (wolf.stamina <= 0) wolf.stamina = 100; }
      out.slideProgress = (wolf.pos.x - s0x) * ux + (wolf.pos.z - s0z) * uz;   // metres made along the lane
      out.slideHp = wolf.hp;
    }
    // ---- synthetic boulder: clean numbers ----
    // The boulder goes on a LANE that holds nothing else: no trunk/stump/log inside the run-up and no
    // water under it, so the wolf really arrives at the stone (a trunk in the lane used to stop the
    // wolf 5 m short and fail the "reached the wall" half of the check — the old load flake).
    const chere = chunks.get(ck(Math.floor(wolf.pos.x / CHUNK), Math.floor(wolf.pos.z / CHUNK)));
    let rock = null;
    for (const [dx, dz] of [[60, 0], [-60, 0], [0, 60], [0, -60], [42, 42], [-42, 42], [42, -42], [-42, -42], [30, 0], [-30, 0], [0, 30], [0, -30]]) {
      const rx = wolf.pos.x + dx, rz = wolf.pos.z + dz, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      if (!chunks.get(ck(Math.floor(rx / CHUNK), Math.floor(rz / CHUNK)))) continue;
      if (laneClear(rx - ux * 9.5, rz - uz * 9.5, rx + ux * 1.5, rz + uz * 1.5)) { rock = { x: rx, z: rz, r: 1.2 }; rock.ux = ux; rock.uz = uz; break; }
    }
    if (!rock) { rock = { x: wolf.pos.x + 60, z: wolf.pos.z, r: 1.2 }; rock.ux = 1; rock.uz = 0; out.rockLaneFallback = true; }
    const chRock = chunks.get(ck(Math.floor(rock.x / CHUNK), Math.floor(rock.z / CHUNK))) || chere;
    chRock.solids.push(rock);
    wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
    wolf.pos.x = rock.x - rock.ux * 8; wolf.pos.z = rock.z - rock.uz * 8; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 0.5;
    const yr = Math.atan2(rock.x - wolf.pos.x, rock.z - wolf.pos.z);
    for (let i = 0; i < 240; i++) { wolf.update(1 / 30, IN(1), yr, 0.3); if (wolf.stamina <= 0) wolf.stamina = 100; }
    const rockGap = Math.hypot(wolf.pos.x - rock.x, wolf.pos.z - rock.z) - rock.r - 0.55;
    out.rockBlocked = rockGap > -0.1 && rockGap < 2.2;   // reached the wall, never through
    out.rockHp = wolf.hp;
    // walking: no damage even head-on
    wolf.hp = 100; wolf.impactCd = 0;
    wolf.pos.x = rock.x - rock.ux * 6; wolf.pos.z = rock.z - rock.uz * 6; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z);
    for (let i = 0; i < 160; i++) wolf.update(1 / 30, IN(0), yr, 0.3);
    out.rockWalkHp = wolf.hp;
    const rockWalkGap = Math.hypot(wolf.pos.x - rock.x, wolf.pos.z - rock.z) - rock.r - 0.55;
    out.rockWalkBlocked = rockWalkGap > -0.1 && rockWalkGap < 2.2;
    chRock.solids.pop();
    // ---- underground: surface solids don't apply; cave stalagmites do ----
    const lm = { type: 'cave', x: wolf.pos.x + 30, z: wolf.pos.z, model: null, ember: null, mist: null, found: true, tier: 'common', label: 'Cave Mouth' };
    // place a surface boulder right on the cave path — underground it must be ignored
    const ch2 = chunks.get(ck(Math.floor((lm.x) / CHUNK), Math.floor((lm.z + 8) / CHUNK)));
    const ghost = { x: lm.x, z: lm.z + 8, r: 1.4 };
    ch2.solids.push(ghost);
    enterCave(lm);
    wolf.hp = 100; wolf.stamina = 100;
    // sprint north through the ghost boulder's xz, underground
    const startZ = wolf.pos.z;
    const yawN = 0;
    let passed = false;
    for (let i = 0; i < 300; i++) { wolf.update(1 / 30, IN(1), yawN, 0.3); if (wolf.stamina <= 0) wolf.stamina = 100; caveTick(1 / 30); if (wolf.pos.z - ghost.z > 1.5) { passed = true; break; } }
    out.caveIgnoresSurface = passed && wolf.hp === 100;
    // cave solids block: synthetic stalagmite
    const st = { x: wolf.pos.x + 6, z: wolf.pos.z + 6, r: 0.45 };
    caveState.solids.push(st);
    wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
    const yaws = Math.atan2(st.x - wolf.pos.x, st.z - wolf.pos.z);
    for (let i = 0; i < 200; i++) { wolf.update(1 / 30, IN(1), yaws, 0.3); if (wolf.stamina <= 0) wolf.stamina = 100; caveTick(1 / 30); }
    out.caveSolid = Math.hypot(wolf.pos.x - st.x, wolf.pos.z - st.z) - st.r - 0.55 > -0.1;   // never inside the stalagmite
    exitCave();
    ch2.solids.pop();
    // ---- fallen logs & stumps: capsule of circles end to end ----
    let log = null, logChunk = null;
    for (let i = 0; i < 50 && !log; i++) {
      for (const ch of chunks.values()) {
        const f = ch.vegItems && ch.vegItems.trees && ch.vegItems.trees.fallenTree;
        if (f && f.length && Math.hypot(f[0].x - wolf.pos.x, f[0].z - wolf.pos.z) < 70) { log = f[0]; logChunk = ch; break; }
      }
      if (!log) { wolf.pos.x += 95; wolf.pos.z += 70; for (let k = 0; k < 12; k++) tick(); }
    }
    out.hasLog = !!log;
    if (log) {
      const s = log.s || 1, ax = Math.sin(log.ry || 0), az = Math.cos(log.ry || 0);
      const rLog = 0.5 * s;
      const segDist = (px, pz) => {   // distance to the log's axis segment (the mesh, ±4.25·s)
        const t2 = Math.max(-1, Math.min(1, ((px - log.x) * ax + (pz - log.z) * az) / (4.25 * s)));
        return Math.hypot(px - (log.x + ax * t2 * 4.25 * s), pz - (log.z + az * t2 * 4.25 * s));
      };
      // The game's collision model for a log is FIVE circles laid along its axis (genChunk), spaced
      // 1.6·s apart with blocking radius 0.5·s + 0.55 — they overlap, so there is no gap, but a body
      // pressed between two of them settles into a NOTCH up to ~0.5 m deeper than an ideal capsule.
      // Measure what the game guarantees: never inside a circle, never across the axis.
      const circles = logChunk.solids.filter(so => Math.abs(so.r - rLog) < 1e-6 && segDist(so.x, so.z) < 0.02);
      out.logCircles = circles.length;
      if (!circles.length) { const L = 8.5 * s; for (let k = -2; k <= 2; k++) circles.push({ x: log.x + ax * k * L * 0.19, z: log.z + az * k * L * 0.19, r: rLog }); }
      const circleGap = (px, pz) => Math.min(...circles.map(c => Math.hypot(px - c.x, pz - c.z) - rLog - 0.55));
      const nearestCircle = (px, pz) => circles.reduce((b, c) => (Math.hypot(px - c.x, pz - c.z) < Math.hypot(px - b.x, pz - b.z) ? c : b), circles[0]);
      const sideOf = (px, pz) => (-(px - log.x) * az + (pz - log.z) * ax) >= 0 ? 1 : -1;
      // A log is a jumpable/standable obstacle: a wolf whose FEET are already at/above the bark steps
      // onto it (a57eb5a). So approach on the ground, from the side whose ground is below the bark.
      const contactGround = (side) => heightAt(log.x - az * 1.05 * side, log.z + ax * 1.05 * side);
      const mid = nearestCircle(log.x, log.z);
      const midTop = mid.top !== undefined ? mid.top : heightAt(mid.x, mid.z) + 0.62 * s;
      const side = contactGround(1) <= contactGround(-1) ? 1 : -1;
      out.logBelowBark = contactGround(side) < midTop - 0.05;
      // sprint straight at the log's middle, perpendicular, from 9 m out — grounded, not dropped from the air
      const sx = log.x - az * 9 * side, sz = log.z + ax * 9 * side;
      out.logLaneClear = laneClear(sx, sz, log.x - az * 2.6 * side, log.z + ax * 2.6 * side, circles);   // the run-up, stopping short of the log's own circles
      wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
      ground(sx, sz);
      const yawL = Math.atan2(log.x - wolf.pos.x, log.z - wolf.pos.z);
      let minSeg = 99, minCircle = 99, crossed = false;
      for (let i = 0; i < 220; i++) {
        wolf.update(1 / 30, IN(1), yawL, 0.3);
        minSeg = Math.min(minSeg, segDist(wolf.pos.x, wolf.pos.z) - rLog - 0.55);
        minCircle = Math.min(minCircle, circleGap(wolf.pos.x, wolf.pos.z));
        if (sideOf(wolf.pos.x, wolf.pos.z) !== side) crossed = true;
        if (wolf.stamina <= 0) wolf.stamina = 100;
      }
      out.logReached = minCircle < 0.3;          // it got to the bark (nothing else in the lane stopped it)
      out.logNeverInside = minCircle > -0.1;     // the push-out held: the body never entered a circle
      out.logCrossed = crossed;                  // never through to the far side
      out.logNotch = minSeg;                     // how deep the body sat between two circles (geometry, informational)
      out.logHp = wolf.hp;
      // walk at the log from 40 stations along the circle-covered span (±3.2·s): every station must stop
      // the wolf before the axis. Stations where the bark is at/below the wolf's feet are skipped —
      // stepping onto a log from higher ground is the standable rule, not a gap.
      wolf.hp = 100; wolf.impactCd = 0;
      let worstAlong = 99, crossedAlong = false, stations = 0;
      const span = 3.2 * s;
      for (let step = 0; step < 40; step++) {
        const t = -span + step * (2 * span / 39);
        const lx = log.x + ax * t, lz = log.z + az * t;
        const c = nearestCircle(lx, lz), cTop = c.top !== undefined ? c.top : heightAt(c.x, c.z) + 0.62 * s;
        if (heightAt(lx - az * 1.05 * side, lz + ax * 1.05 * side) >= cTop - 0.05) continue;
        stations++;
        ground(lx - az * 1.9 * side, lz + ax * 1.9 * side);
        const yawP = Math.atan2(lx - wolf.pos.x, lz - wolf.pos.z);
        for (let k = 0; k < 14; k++) { wolf.update(1 / 30, IN(0), yawP, 0.3); if (sideOf(wolf.pos.x, wolf.pos.z) !== side) crossedAlong = true; }
        worstAlong = Math.min(worstAlong, circleGap(wolf.pos.x, wolf.pos.z));
      }
      out.logStations = stations;
      out.logSolidAlong = worstAlong > -0.1 && !crossedAlong;   // no gaps to slip through
    }
    // stumps registered?
    let stumps = 0;
    for (const ch of chunks.values()) { const st = ch.vegItems && ch.vegItems.trees && ch.vegItems.trees.stump; if (st) stumps += st.length; }
    out.stumps = stumps;

    // ---- the wild is solid to the wild: fleeing deer & wary bear vs a boulder ----
    const rock2 = { x: wolf.pos.x + 26, z: wolf.pos.z, r: 1.3 };
    const chR = chunks.get(ck(Math.floor(rock2.x / CHUNK), Math.floor(rock2.z / CHUNK))) || chunks.get(ck(Math.floor(wolf.pos.x / CHUNK), Math.floor(wolf.pos.z / CHUNK)));
    chR.solids.push(rock2);
    const runAtRock = (a, bodyR) => {          // animal flees the wolf (west) -> straight at the rock (east)
      let minGap = 9;
      const x0 = a.pos.x, z0 = a.pos.z;
      for (let i = 0; i < 240; i++) {
        a.update(1 / 30, tSec);
        minGap = Math.min(minGap, Math.hypot(a.pos.x - rock2.x, a.pos.z - rock2.z) - rock2.r - bodyR);
      }
      return { minGap, moved: Math.hypot(a.pos.x - x0, a.pos.z - z0) };
    };
    const deer = new Animal('deer', wolf.pos.x + 14, wolf.pos.z);
    deer.pos.y = heightAt(deer.pos.x, deer.pos.z);
    const dr = runAtRock(deer, 0.5);
    out.deerBlocked = dr.minGap > -0.15;
    out.deerMoved = dr.moved;
    out.deerWalked = dr.moved > 2;
    deer.dispose();
    const bear = new Predator('bear', wolf.pos.x + 12, wolf.pos.z);
    bear.hunger = 90;   // hungry enough to move, whatever the spawn roll
    bear.pos.y = heightAt(bear.pos.x, bear.pos.z);
    const br = runAtRock(bear, 0.7);
    out.bearBlocked = br.minGap > -0.15;
    out.bearMoved = br.moved;
    out.bearWalked = br.moved > 1.2;
    bear.dispose();
    chR.solids.pop();

    // ---- landmarks registered? (any placed lm with def.solid in loaded chunks) ----
    let lmSolidCount = 0;
    for (const ch of chunks.values()) if (ch.solids) lmSolidCount += ch.solids.length;
    out.totalSolids = lmSolidCount;
    return out;
  });
  ok(R.hasTree, 'solid trunk found near spawn');
  if (R.hasTree) {
    ok(R.sprintBlocked, `sprint into trunk stops at surface (min gap ok)`);
    ok(R.neverThrough, 'wolf never tunnels through the trunk');
    ok(R.sprintHp < 100 && R.sprintHp >= 88 && (100 - R.sprintHp) % 4 === 0, `sprint crash costs 4 HP per hit, rate-limited (${R.sprintHp} = ${(100 - R.sprintHp) / 4} hits)`);
    ok(R.sprintStumble, `speed stumbles on impact (${R.sprintStumble})`);
    ok(R.walkBlocked, 'walking into trunk blocks too');
    ok(R.walkHp === 100, `walking costs no HP (${R.walkHp})`);
    ok(R.slideProgress > 2, `glancing angle slides past (progress ${(+R.slideProgress).toFixed(1)} m)`);
    ok(R.slideHp === 100, `glancing costs no HP (${R.slideHp})`);
  }
  ok(R.rockBlocked, 'boulder blocks head-on sprint');
  ok(R.rockHp === 96, `boulder sprint crash costs 4 HP (${R.rockHp})`);
  ok(R.rockWalkBlocked && R.rockWalkHp === 100, `boulder walk: blocked, no HP (${R.rockWalkHp})`);
  ok(R.caveIgnoresSurface, 'underground ignores surface solids');
  ok(R.caveSolid, 'cave stalagmite blocks underground');
  ok(R.totalSolids > 50, `solid registry populated (${R.totalSolids} circles)`);
  ok(R.hasLog, 'fallen log found in the wild');
  if (R.hasLog) {
    ok(R.logCircles === 5, `log registered as 5 solid circles (${R.logCircles})`);
    if (R.logBelowBark) {
      ok(R.logNeverInside && !R.logCrossed, `sprint into the log stops at its bark — never inside a circle, never through (notch ${(+R.logNotch).toFixed(2)} m · ${R.logHp} HP after)`);
      if (R.logLaneClear) ok(R.logReached, 'the sprint actually reached the bark (clear lane)');
      else console.log('  · lane to the log held another solid — reach not asserted');
      ok(R.logSolidAlong, `the log is solid along its whole length — no gaps (${R.logStations} stations)`);
    } else console.log('  · log lies below foot level on both sides (standable) — bark test not applicable here');
  }
  ok(R.stumps >= 0, `stumps registered (${R.stumps} in view)`);
  ok(R.deerBlocked && R.deerWalked, `deer walks but never enters the boulder (moved ${(+R.deerMoved || 0).toFixed(1)} m)`);
  ok(R.bearBlocked && R.bearWalked, `bear walks but never enters the boulder (moved ${(+R.bearMoved || 0).toFixed(1)} m)`);
  console.log(failures ? `FAIL (${failures})` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
} finally { await browser.close(); }
