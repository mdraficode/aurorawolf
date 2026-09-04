import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=777');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1200);

const R = await page.evaluate(() => {
  const R = {};
  const dt = 1 / 30;
  const wraps = { poolBurstParts: 0, bloodBurst: 0, dustPuff: 0, dustPuffY: [] };

  // wrap pools to spy (objects are mutable even though const). Only count pool bursts
  // that actually emit particles (n > 0) — the attack() call has a 0-particle "dust
  // removed" burst that must not count as smoke.
  const pB = pool.burst.bind(pool);
  pool.burst = (c, n, col, sp, up, spd) => { if (n > 0) wraps.poolBurstParts += n; pB(c, n, col, sp, up, spd); };
  const bB = bloodPool.burst.bind(bloodPool);
  bloodPool.burst = (c, n, dx, dz, big) => { wraps.bloodBurst++; bB(c, n, dx, dz, big); };
  const dP = dustPool.puff.bind(dustPool);
  dustPool.puff = (x, y, z, big) => { wraps.dustPuff++; wraps.dustPuffY.push(y); dP(x, y, z, big); };

  R.blendChecks = {
    poolIsAdditive: pool._mat.blending === THREE.AdditiveBlending,
    bloodIsNormal: bloodPool._mat.blending === THREE.NormalBlending,
    dustIsNormal: dustPool._mat.blending === THREE.NormalBlending,
  };

  const mkInput = () => ({ f: true, b: false, l: false, r: false, sprint: true, jump: false, paused: false, mx: 0, my: 0 });

  // ---- 1. SPRINT underfoot dust (call wolf.update directly; tick() clobbers input) ----
  wolf.pos.x = 0; wolf.pos.z = 100; wolf.pos.y = Math.max(heightAt(0, 100), WATER_Y) + 0.1;
  wolf.grounded = true; wolf.exhausted = false; wolf.stamina = 100; wolf.flyT = 0; wolf.crouch = false; wolf.swimming = false;
  const start = { dust: wraps.dustPuff };
  for (let i = 0; i < 60; i++) wolf.update(dt, mkInput(), wolf.yaw + Math.PI, 0);
  R.sprintDustPuffs = wraps.dustPuff - start.dust;
  const wolfGround = heightAt(wolf.pos.x, wolf.pos.z);
  R.wolfGroundY = wolfGround;
  R.dustHugsGround = wraps.dustPuffY.length > 0 && wraps.dustPuffY.every(y => y <= wolfGround + 0.6);
  R.sprintDustMaxY = wraps.dustPuffY.length ? Math.max(...wraps.dustPuffY) : -1;

  // ---- 2. COMBAT: no sprint dust while a threatening predator is in range ----
  // keep the threatening beast tethered to the wolf (re-anchor each frame) so the
  // proximity check stays true even as the wolf runs.
  const fake = { dead: false, threatening: true, pos: { x: 0, z: 0, distanceTo(p){ return Math.hypot(this.x-p.x, this.z-p.z); } }, sp: { label: 'Fake' }, update(){}, dispose(){} };
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  const ch = chunks.get(ck(ccx, ccz)) || chunks.values().next().value;
  ch.predators.push(fake);
  const start2 = { dust: wraps.dustPuff };
  wolf.stamina = 100; wolf.exhausted = false; wolf.grounded = true; wolf.flyT = 0; wolf.swimming = false;
  for (let i = 0; i < 30; i++) { fake.pos.x = wolf.pos.x + 4; fake.pos.z = wolf.pos.z; wolf.update(dt, mkInput(), wolf.yaw + Math.PI, 0); }
  R.combatDustPuffs = wraps.dustPuff - start2.dust;
  R.inCombatHelper = __wolfInCombat();
  const idx = ch.predators.indexOf(fake); if (idx >= 0) ch.predators.splice(idx, 1);

  // ---- 3. BLOOD: wolf bite sprays LIQUID blood; the hit itself never uses additive smoke ----
  const prey = []; for (const c of chunks.values()) for (const a of c.animals) if (!a.dead) prey.push(a);
  const victim = prey[0] || null;
  if (victim) {
    // track which colors go through the ADDITIVE pool — the old blood was a red additive
    // smoke (0xc21018 / 0x8c0d12). A hit must NEVER emit those via the additive pool now.
    const sm = { oldBloodSmoke: 0 };
    const pB2 = pool.burst.bind(pool);
    pool.burst = (c, n, col, sp, up, spd) => { if (n>0 && (col === 0xc21018 || col === 0x8c0d12)) sm.oldBloodSmoke++; pB2(c, n, col, sp, up, spd); };
    // spy the bloodPool direction so we can confirm blood sprays AWAY from the wound
    const dirs = [];
    const bB2 = bloodPool.burst.bind(bloodPool);
    bloodPool.burst = (c, n, dx, dz, big) => { dirs.push([dx, dz]); bB2(c, n, dx, dz, big); };
    wolf.atkCd = 0;
    wolf.pos.x = victim.pos.x; wolf.pos.z = victim.pos.z - 2.0; wolf.pos.y = victim.pos.y;
    wolf.yaw = Math.atan2(victim.pos.x - wolf.pos.x, victim.pos.z - wolf.pos.z);
    const b0 = wraps.bloodBurst;
    wolf.attack();
    R.bloodBurstOnHit = wraps.bloodBurst - b0 >= 1;
    R.animalHitNoAdditiveRedSmoke = sm.oldBloodSmoke === 0;
    // blood should spray away from the wolf (i.e. roughly +z from wolf toward victim: the wolf is at victim.z-2, victim ahead at +z)
    if (dirs.length) {
      const [dx, dz] = dirs[dirs.length - 1];
      R.bloodSquirtsForward = dz > 0.3;   // the bite lands ahead (wolf faces +z toward victim); blood flies onward
    } else R.bloodSquirtsForward = false;
  }
  return R;
});

console.log('=== EFFECTS / VISUAL VERIFICATION ===');
console.log(JSON.stringify(R, null, 2));
console.log('--- ASSERTS ---');
const checks = {
  'blood uses NormalBlending (liquid, not glow-additive)': R.blendChecks.bloodIsNormal,
  'dust uses NormalBlending (opaque, not glow-additive)': R.blendChecks.dustIsNormal,
  'additive pool is still additive (ember trait)': R.blendChecks.poolIsAdditive,
  'sprint emits underfoot dust puffs': R.sprintDustPuffs > 0,
  'sprint dust hugs the ground (feet level)': R.dustHugsGround,
  'combat suppresses sprint dust': R.combatDustPuffs === 0,
  'wolf bite sprays liquid bloodPool': R.bloodBurstOnHit,
  'animal hit emits NO additive red smoke': R.animalHitNoAdditiveRedSmoke !== false,
  'blood squirts away from the wound (direction)': R.bloodSquirtsForward !== false,
};
let ok = true;
for (const [k, v] of Object.entries(checks)) { if (!v) ok = false; console.log((v ? 'PASS' : 'FAIL') + '  ' + k); }
if (errors.length) { ok = false; console.log('PAGE ERRORS:'); errors.forEach(e => console.log('  ' + e)); }
console.log(ok ? '\nALL PASS' : '\nFAILURES PRESENT');
await browser.close();
process.exit(ok ? 0 : 1);
