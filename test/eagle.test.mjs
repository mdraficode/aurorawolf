import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=1337');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && typeof SkyEagle !== 'undefined', null, { timeout: 60000 });
await page.waitForTimeout(1200);
const R = await page.evaluate(() => {
  const R = {}; const dt = 1 / 30;
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  const homeChunk = chunks.get(ck(ccx, ccz));
  // 1. definition & balance: airborne species, day hunter, NOT a ground-zone spawn
  R.def = { hp: PREDATORS.eagle.hp, dmg: PREDATORS.eagle.dmg, label: PREDATORS.eagle.label, build: PREDATORS.eagle.build, huntsWolf: PREDATORS.eagle.huntsWolf, scale: PREDATORS.eagle.scale };
  R.inTable = Object.keys(PREDATOR_TABLE).some(k => PREDATOR_TABLE[k].some(([n]) => n === 'eagle'));
  // 2. construct + register (like real spawns)
  const e = new SkyEagle(wolf.pos.x + 40, wolf.pos.z);
  homeChunk.predators.push(e);
  R.total = eagleTotal;
  R.levelOK = e.level >= 1;
  R.modelOK = !!e.model && !!e.wingL && !!e.wingR && !!e.tail;
  R.territoryless = e.territory === 0;
  // wingspan at the model's scale — the big hit box
  let half = 0;
  e.wingR.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width) half = Math.max(half, o.position.x + o.geometry.parameters.width / 2); });
  R.span = +(half * 2 * e.model.scale.x).toFixed(2);
  R.hitRadius = +(3.6 + e.sp.scale * 0.7).toFixed(2);
  // 3. daylight spotting: it sees you and begins to circle (atkCd pinned so it stays in chase)
  dayF = 1;
  e.state = 'soar'; e.timer = 30; e.alt = 20; e.flinchT = 0; e.atkCd = 9; e.fleeing = false;
  for (let i = 0; i < 40; i++) e.update(dt, tSec + i * dt);
  R.spotted = e.state === 'chase';
  R.threatening = e.threatening;
  // 4. it circles (tight ring) and dives from the circle — and does not let go
  wolf.invulnT = 600;                       // shield the wolf while we watch the flight
  let circled = false, dived = false, minRing = 1e9, maxRing = 0;
  for (let i = 0; i < 1200; i++) {
    e.update(dt, tSec + i * dt);
    const r = Math.hypot(e.pos.x - wolf.pos.x, e.pos.z - wolf.pos.z);
    if (e.state === 'chase') { circled = true; minRing = Math.min(minRing, r); maxRing = Math.max(maxRing, r); }
    if (e.state === 'attack') dived = true;
  }
  R.circled = circled; R.dived = dived; R.ring = [+minRing.toFixed(1), +maxRing.toFixed(1)];
  wolf.invulnT = 0;
  // 5. a real dive wounds the wolf (talon strike)
  wolf.hp = 100; wolf.invulnT = 0;
  e.state = 'attack'; e.diveX = wolf.pos.x; e.diveZ = wolf.pos.z; e.alt = 5;
  e.pos.x = wolf.pos.x; e.pos.z = wolf.pos.z - 7; e.pos.y = Math.max(heightAt(e.pos.x, e.pos.z), WATER_Y) + e.alt + 1;
  e.atkCd = 0; e.flinchT = 0; e.fleeing = false;
  let talonHit = false;
  for (let i = 0; i < 300 && !talonHit; i++) { e.update(dt, tSec + i * dt); if (wolf.hp < 100) talonHit = true; }
  R.talonHit = talonHit;
  R.talonCd = e.atkCd > 0;
  // 6. only a LOW pass can be hit (the sky is safe, the dive is not)
  const tryBite = () => {
    wolf.pos.y = Math.max(heightAt(wolf.pos.x, wolf.pos.z), WATER_Y) + 0.5;
    wolf.yaw = Math.atan2(e.pos.x - wolf.pos.x, e.pos.z - wolf.pos.z);
    wolf.atkCd = 0;
    const hp0 = e.hp;
    wolf.attack();
    return e.hp < hp0;
  };
  e.state = 'climb'; e.alt = 12; e.pos.x = wolf.pos.x; e.pos.z = wolf.pos.z + 2; e.pos.y = Math.max(heightAt(e.pos.x, e.pos.z), WATER_Y) + e.alt + 1;
  R.highUnhittable = !tryBite();
  e.state = 'climb'; e.alt = 0.9; e.pos.x = wolf.pos.x; e.pos.z = wolf.pos.z + 2; e.pos.y = Math.max(heightAt(e.pos.x, e.pos.z), WATER_Y) + e.alt + 1;
  R.lowHittable = tryBite();
  // 7. darkness aborts it — even mid-chase
  e.state = 'chase'; dayF = 0.1; e.flinchT = 0;
  for (let i = 0; i < 40; i++) e.update(dt, tSec + i * dt);
  R.abortsAtNight = e.state === 'abort' || e.dead;
  dayF = 1;
  // 8. kill & bounty (wounded eagle, low pass)
  const meat0 = inv.meat, pelt0 = inv.pelt, bone0 = inv.bone, slain0 = stats.slain;
  e.hp = 1; e.state = 'climb'; e.alt = 0.9; e.pos.x = wolf.pos.x; e.pos.z = wolf.pos.z + 2; e.pos.y = Math.max(heightAt(e.pos.x, e.pos.z), WATER_Y) + e.alt + 1;
  tryBite();
  R.killed = e.dead;
  R.bounty = { meat: inv.meat - meat0, pelt: inv.pelt - pelt0, bone: inv.bone - bone0, slain: stats.slain - slain0 };
  R.totalAfter = eagleTotal;
  return R;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
const F = [];
if (R.def.label !== 'Golden Eagle' || R.def.build !== 'eagle' || R.def.huntsWolf !== 1) F.push('eagle def');
if (R.inTable) F.push('eagle must not be a ground-zone spawn');
if (R.total !== 1 || !R.levelOK || !R.modelOK || !R.territoryless) F.push('construct');
if (R.span < 3.8) F.push('wingspan ' + R.span);
if (!R.spotted || !R.threatening) F.push('spotting');
if (!R.circled || !R.dived) F.push('circle/dive');
if (R.ring && (R.ring[0] > 26 || R.ring[1] > 45)) F.push('ring too wide ' + R.ring.join('/'));
if (!R.talonHit || !R.talonCd) F.push('talon strike');
if (!R.highUnhittable || !R.lowHittable) F.push('low-pass hit window');
if (!R.abortsAtNight) F.push('night abort');
if (!R.killed || R.bounty.meat !== 3 || R.bounty.pelt !== 1 || R.bounty.bone !== 1 || R.bounty.slain !== 1) F.push('kill/bounty');
if (R.totalAfter !== 0) F.push('eagleTotal not released');
if (errors.length) F.push('page errors');
if (F.length) { console.log('EAGLE FAIL:', F.join(', ')); process.exit(1); }
console.log('EAGLE TEST PASS');
