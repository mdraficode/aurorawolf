/* Solid world: big trunks & boulders block the wolf; sprint-speed crashes cost a little HP */
import { chromium } from 'playwright';
let failures = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) failures++; };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 350 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); failures++; });
  await page.goto('file:///home/user/index.html?autostart=1&seed=4242&quality=low');
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
    for (let i = 0; i < 400 && !tree; i++) {
      const cands = solidsNear().filter(s => Math.hypot(s.x - wolf.pos.x, s.z - wolf.pos.z) < 90);
      if (cands.length) tree = cands[(Math.random() * cands.length) | 0];
      else { wolf.pos.x += 120; wolf.pos.z += 90; }
    }
    out.hasTree = !!tree;
    const minDist = (s) => Math.hypot(wolf.pos.x - s.x, wolf.pos.z - s.z) - s.r - 0.55;
    if (tree) {
      // ---- sprint head-on into the trunk ----
      wolf.hp = 100; wolf.impactCd = 0; wolf.stamina = 100;
      const d0 = Math.hypot(tree.x - wolf.pos.x, tree.z - wolf.pos.z);
      wolf.pos.x = tree.x - (d0 < 8 ? 8 : d0) ; wolf.pos.z = tree.z; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 0.5;
      const yaw = Math.atan2(tree.x - wolf.pos.x, tree.z - wolf.pos.z);
      let maxPen = 0;
      for (let i = 0; i < 240; i++) { wolf.update(1 / 30, IN(1), yaw, 0.3); maxPen = Math.min(maxPen, minDist(tree)); if (wolf.stamina <= 0) wolf.stamina = 100; }
      out.sprintBlocked = minDist(tree) > -0.06 && maxPen > -0.25;
      out.neverThrough = maxPen > -0.25;
      out.sprintHp = wolf.hp;
      out.sprintStumble = wolf.speed < 6;
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
    out.rockBlocked = Math.abs((Math.hypot(wolf.pos.x - rock.x, wolf.pos.z - rock.z) - rock.r - 0.55)) < 0.06;
    out.rockHp = wolf.hp;
    // walking: no damage even head-on
    wolf.hp = 100; wolf.impactCd = 0;
    wolf.pos.x = rock.x - 6; wolf.pos.z = rock.z;
    for (let i = 0; i < 160; i++) wolf.update(1 / 30, IN(0), yr, 0.3);
    out.rockWalkHp = wolf.hp;
    out.rockWalkBlocked = Math.abs((Math.hypot(wolf.pos.x - rock.x, wolf.pos.z - rock.z) - rock.r - 0.55)) < 0.06;
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
    out.caveSolid = Math.abs(Math.hypot(wolf.pos.x - st.x, wolf.pos.z - st.z) - st.r - 0.55) < 0.08;
    exitCave();
    ch2.solids.pop();
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
    ok(R.sprintHp === 96, `sprint crash costs 4 HP (${R.sprintHp})`);
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
  console.log(failures ? `FAIL (${failures})` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
} finally { await browser.close(); }
