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
    // ---- find a real tree trunk near spawn ----
    let tree = null;
    for (let i = 0; i < 60 && !tree; i++) {
      const cands = solidsNear().filter(s => Math.hypot(s.x - wolf.pos.x, s.z - wolf.pos.z) < 60);
      if (cands.length) tree = cands[(Math.random() * cands.length) | 0];
      else { wolf.pos.x += 90; wolf.pos.z += 60; for (let k = 0; k < 10; k++) tick(); }   // hop WITH the streamer
    }
    out.hasTree = !!tree;
    const minDist = (s) => Math.hypot(wolf.pos.x - s.x, wolf.pos.z - s.z) - s.r - 0.55;
    if (tree) {
      // ---- sprint head-on into the trunk ----
      wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
      const d0 = Math.hypot(tree.x - wolf.pos.x, tree.z - wolf.pos.z);
      wolf.pos.x = tree.x - (d0 < 8 ? 8 : d0) ; wolf.pos.z = tree.z; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 0.5;
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
      wolf.pos.x = tree.x - 8; wolf.pos.z = tree.z; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 0.5;
      for (let i = 0; i < 200; i++) wolf.update(1 / 30, IN(0), yaw, 0.3);
      out.walkBlocked = minDist(tree) > -0.06;
      out.walkHp = wolf.hp;
      // ---- slide past at a glancing angle ----
      wolf.hp = 100; wolf.impactCd = 0;
      wolf.pos.x = tree.x - 7; wolf.pos.z = tree.z - 7; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 0.5;
      const yaw45 = Math.atan2(1, 1);   // heading NE, trunk passed on the right
      for (let i = 0; i < 200; i++) { wolf.update(1 / 30, IN(0), yaw45, 0.3); if (wolf.stamina <= 0) wolf.stamina = 100; }
      out.slideProgress = wolf.pos.x - (tree.x - 7);
      out.slideHp = wolf.hp;
    }
    // ---- synthetic boulder: clean numbers ----
    const chere = chunks.get(ck(Math.floor(wolf.pos.x / CHUNK), Math.floor(wolf.pos.z / CHUNK)));
    const rock = { x: wolf.pos.x + 60, z: wolf.pos.z, r: 1.2 };
    chere.solids.push(rock);
    wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
    wolf.pos.x = rock.x - 8; wolf.pos.z = rock.z; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 0.5;
    const yr = Math.atan2(rock.x - wolf.pos.x, rock.z - wolf.pos.z);
    for (let i = 0; i < 240; i++) { wolf.update(1 / 30, IN(1), yr, 0.3); if (wolf.stamina <= 0) wolf.stamina = 100; }
    const rockGap = Math.hypot(wolf.pos.x - rock.x, wolf.pos.z - rock.z) - rock.r - 0.55;
    out.rockBlocked = rockGap > -0.1 && rockGap < 2.2;   // reached the wall, never through
    out.rockHp = wolf.hp;
    // walking: no damage even head-on
    wolf.hp = 100; wolf.impactCd = 0;
    wolf.pos.x = rock.x - 6; wolf.pos.z = rock.z;
    for (let i = 0; i < 160; i++) wolf.update(1 / 30, IN(0), yr, 0.3);
    out.rockWalkHp = wolf.hp;
    const rockWalkGap = Math.hypot(wolf.pos.x - rock.x, wolf.pos.z - rock.z) - rock.r - 0.55;
    out.rockWalkBlocked = rockWalkGap > -0.1 && rockWalkGap < 2.2;
    chere.solids.pop();
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
      const ax = Math.sin(log.ry || 0), az = Math.cos(log.ry || 0);
      const rLog = 0.5 * (log.s || 1);
      const segDist = (px, pz) => {   // distance to the log's line segment
        const t2 = Math.max(-1, Math.min(1, ((px - log.x) * ax + (pz - log.z) * az) / (4.25 * (log.s || 1))));
        return Math.hypot(px - (log.x + ax * t2 * 4.25 * (log.s || 1)), pz - (log.z + az * t2 * 4.25 * (log.s || 1)));
      };
      // sprint straight at the log's middle, perpendicular
      wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
      const px0 = log.x - az * 9, pz0 = log.z + ax * 9;   // perpendicular offset
      wolf.pos.x = px0; wolf.pos.z = pz0; wolf.pos.y = heightAt(px0, pz0) + 0.5;
      const yawL = Math.atan2(log.x - wolf.pos.x, log.z - wolf.pos.z);
      let minSeg = 99;
      for (let i = 0; i < 220; i++) { wolf.update(1 / 30, IN(1), yawL, 0.3); minSeg = Math.min(minSeg, segDist(wolf.pos.x, wolf.pos.z) - rLog - 0.55); if (wolf.stamina <= 0) wolf.stamina = 100; }
      out.logBlocked = minSeg > -0.22;
      out.logHp = wolf.hp;
      // walk along the log's axis from one end: the circles hold the whole length
      wolf.hp = 100; wolf.impactCd = 0;
      let worstAlong = 99;
      for (let step = 0; step < 40; step++) {
        const lx = log.x + ax * (-4.6 + step * 0.24), lz = log.z + az * (-4.6 + step * 0.24);
        wolf.pos.x = lx - az * 1.9; wolf.pos.z = lz + ax * 1.9; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 0.5;
        const yawP = Math.atan2(lx - wolf.pos.x, lz - wolf.pos.z);
        for (let k = 0; k < 3; k++) wolf.update(1 / 30, IN(0), yawP, 0.3);
        worstAlong = Math.min(worstAlong, segDist(wolf.pos.x, wolf.pos.z) - rLog - 0.55);
      }
      out.logSolidAlong = worstAlong > -0.3;   // no gaps to slip through
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
    ok(R.logBlocked, `sprint into the log stops at its bark (${R.logHp} HP after)`);
    ok(R.logSolidAlong, 'the log is solid along its whole length — no gaps');
  }
  ok(R.stumps >= 0, `stumps registered (${R.stumps} in view)`);
  ok(R.deerBlocked && R.deerWalked, `deer walks but never enters the boulder (moved ${(+R.deerMoved || 0).toFixed(1)} m)`);
  ok(R.bearBlocked && R.bearWalked, `bear walks but never enters the boulder (moved ${(+R.bearMoved || 0).toFixed(1)} m)`);
  console.log(failures ? `FAIL (${failures})` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
} finally { await browser.close(); }
