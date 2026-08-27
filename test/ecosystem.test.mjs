import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=20250826');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(2000);
const R = await page.evaluate(() => {
  const R = {}; const dt = 1 / 30;
  R.modules = ['AnimalStats','AnimalNeeds','AnimalDetection','AnimalAIController','AnimalFlocking','AnimalCombat','AnimalLoot','AnimalHealthBar','AnimalAnimation','AnimalLOD','AnimalSpawner','ECO'].map(m => [m, typeof eval(m) !== 'undefined']);
  // herd spawn from real chunks
  let herds = 0, young = 0, total = 0;
  for (const ch of chunks.values()) for (const a of ch.animals) { total++; if (a.herd && a.herd.members.length >= 2 && a.herdLeader) herds++; if (a.young) young++; }
  R.wild = { total, herds, young };

  // personality variance
  const r1 = new Animal('rabbit', 0, 0), r2 = new Animal('rabbit', 4, 0);
  R.personalityDiffers = r1.stats.speedMul !== r2.stats.speedMul || r1.stats.fear !== r2.stats.fear;

  // states: graze → idle/wander cycle; alert on approach; flee when close; investigate
  const deer = new Animal('deer', wolf.pos.x + 40, wolf.pos.z, { adult: true });
  deer.aware = 0;
  let sawGraze = deer.state === 'graze';
  const h0 = deer.hunger, t0 = deer.thirst;
  for (let i = 0; i < 200; i++) deer.update(dt, tSec + i * dt);   // lives on its own
  R.autonomyStates = [...new Set([deer.state])]; R.sawGraze = sawGraze;
  R.needsGrow = deer.hunger > h0 && deer.thirst > t0;
  // approach → alert → flee
  wolf.speed = 8;                                 // a running wolf is loud
  _losT = tSec + 999; _losV = 0;                  // assume open sightlines for behaviour probes
  deer.pos.x = wolf.pos.x + 16; deer.pos.z = wolf.pos.z; deer.state = 'graze'; deer.asleep = false;
  for (let i = 0; i < 30; i++) deer.update(dt, tSec + i * dt);
  R.alertOrFlee = ['alert', 'flee', 'investigate'].includes(deer.state);
  deer.pos.x = wolf.pos.x + 6; deer.pos.z = wolf.pos.z; deer.aware = 1;
  deer.update(dt, tSec);
  R.fleesClose = deer.state === 'flee' || deer.state === 'alert';
  // flee tires (prey stamina → skill hunting)
  const spd = () => { const p0 = { x: deer.pos.x, z: deer.pos.z }; deer.update(dt, tSec); return Math.hypot(deer.pos.x - p0.x, deer.pos.z - p0.z) / dt; };
  deer.setState('flee'); deer.startFlee(wolf.pos);
  const fastSpd = (deer.runT = 3, deer.state = 'flee', spd());
  const tiredSpd = (deer.runT = 0, deer.state = 'flee', spd());
  R.preyTires = tiredSpd < fastSpd * 0.8;

  // herd panic: hit one → others flee together
  const herd = { members: [] };
  const d1 = new Animal('deer', wolf.pos.x + 30, wolf.pos.z, { herd, leader: true, adult: true });
  const d2 = new Animal('deer', wolf.pos.x + 32, wolf.pos.z, { herd, adult: true });
  herd.members.push(d1, d2);
  wolf.pos.x = d1.pos.x; wolf.pos.z = d1.pos.z - 2; wolf.yaw = 0; wolf.atkCd = 0;
  d1.aware = 0;
  d1.hit();
  R.herdPanic = d1.state === 'flee' && d2.state === 'flee';
  const ax = new Animal('fox', wolf.pos.x + 50, wolf.pos.z, { adult: true }); ax.aware = 0; ax.hit();
  const ay = new Animal('fox', wolf.pos.x + 52, wolf.pos.z, { adult: true }); ay.aware = 1; ay.hit();
  R.ambushBonus = ax.dead && !ay.dead;               // unaware bite = 2 dmg, aware = 1

  // goat fights back (protect)
  const goat = new Animal('goat', wolf.pos.x + 8, wolf.pos.z, { adult: true });
  goat.stats.aggression = 1; goat.hp = 2; goat.aware = 1;
  const hp0 = wolf.hp; wolf.invulnT = 0;
  goat.hit();
  R.goatRetaliates = goat.state === 'protect';
  let guard = 0;
  while (goat.state === 'protect' && guard++ < 120) { wolf.pos.x = goat.pos.x + 3; wolf.pos.z = goat.pos.z; wolf.pos.y = goat.pos.y; wolf.invulnT = 0; goat.update(dt, tSec); }
  R.goatChargeHit = wolf.hp < hp0 || wolf.invulnT > 0;

  // health bar: revealed on first player strike; hugs the head; reddens as life drains
  const colOf = str => { const m = /\((\d+),\s*(\d+),\s*(\d+)/.exec(str || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
  const hba = new Animal('elk', wolf.pos.x + 55, wolf.pos.z, { adult: true });
  hba.aware = 1; hba.hit();                                  // aware hit: 1 dmg, elk 4 → 3
  R.barRevealed = !!hba.bar && hba.bar.parent === hba.model && !!hba.barCol;
  hba.model.remove(hba.bar); hba.model.updateMatrixWorld(true);   // crown without the bar in the box
  const topH = new THREE.Box3().setFromObject(hba.model).max.y - hba.model.position.y;
  hba.model.add(hba.bar);
  const barWy = hba.bar.position.y * hba.model.scale.x;            // world-space seat
  R.barHugHead = barWy - topH <= 0.25 && barWy >= topH - 0.3;
  let c = colOf(hba.barCol);
  R.barHealthy = !!c && c[1] > c[0];                                         // f 0.75 — green on top
  hba.hp = 2; AnimalHealthBar.show(hba); c = colOf(hba.barCol);
  R.barHurt = !!c && Math.abs(c[0] - c[1]) < 60 && c[0] > c[2] * 1.8;       // f 0.5 — amber blend
  hba.hp = 1; AnimalHealthBar.show(hba); c = colOf(hba.barCol);
  R.barCritical = !!c && c[0] > c[1] * 1.5;                                  // f 0.25 — red rules
  hba.hp = 1.4; AnimalHealthBar.show(hba); const cA = colOf(hba.barCol);
  hba.hp = 2.4; AnimalHealthBar.show(hba); const cB = colOf(hba.barCol);
  R.barGradual = !!cA && !!cB && (cA[0] - cA[1]) > (cB[0] - cB[1]);         // steadily redder as it drains
  hba.dispose();
  const pb = new Predator('bear', wolf.pos.x + 45, wolf.pos.z); pb.hit();
  pb.model.updateMatrixWorld(true);
  const barP = pb.bar; pb.model.remove(barP);
  const topP = new THREE.Box3().setFromObject(pb.model).max.y - pb.model.position.y;
  pb.model.add(barP);
  const barWyP = barP.position.y * pb.model.scale.x;
  R.predBar = !!pb.bar && pb.bar.parent === pb.model && barWyP - topP <= 0.25 && barWyP >= topP - 0.3;
  pb.dispose();

  // sleep at night (diurnal deer), wake on threat
  dayF = 0.1;                                  // night
  const sleeper = new Animal('deer', wolf.pos.x + 60, wolf.pos.z, { adult: true });
  sleeper.cover = 0.6; sleeper.energy = 10; sleeper.setState('sleep');
  const st0 = sleeper.state;
  sleeper.update(dt, tSec);
  R.sleepsAtNight = st0 === 'sleep' && sleeper.asleep;
  sleeper.pos.x = wolf.pos.x + 3; sleeper.aware = 1; sleeper.update(dt, tSec);
  R.wakesOnThreat = !sleeper.asleep;

  // detection: rain & night modifiers
  dayF = 1; weather.rain = 0; weather.snow = 0;
  const fox = new Animal('fox', wolf.pos.x + 10, wolf.pos.z, { adult: true });
  const clearThreat = AnimalDetection.threat(fox);
  weather.rain = 0.6;
  const rainThreat = AnimalDetection.threat(fox);
  weather.rain = 0;
  dayF = 0.1;
  const nightThreatFox = AnimalDetection.threat(fox);   // nocturnal: sharper at night
  R.detectionMod = { clearThreat, rainThreat, nightThreatFox };
  R.rainMasks = rainThreat <= clearThreat;
  R.nocturnalKeen = nightThreatFox >= clearThreat;
  dayF = 1;

  // line-of-sight: a wolf hidden in dense forest is spotted later
  dayF = 1; weather.rain = 0; weather.snow = 0; wolf.speed = 8;
  const foxC = new Animal('fox', wolf.pos.x + 12, wolf.pos.z, { adult: true });
  foxC.stats.detectMul = 1;
  const openBand = AnimalDetection.threat(foxC);
  let fpos = null;
  outer: for (let fx = wolf.pos.x - 80; fx <= wolf.pos.x + 80 && !fpos; fx += 16)
    for (let fz = wolf.pos.z - 80; fz <= wolf.pos.z + 80; fz += 16)
      if (coverAt(fx, fz) > 0.6 && Math.hypot(fx - foxC.pos.x, fz - foxC.pos.z) > 40) { fpos = { x: fx, z: fz }; break outer; }
  if (fpos) {
    const wx0 = wolf.pos.x, wz0 = wolf.pos.z;
    wolf.pos.x = fpos.x; wolf.pos.z = fpos.z; wolf.pos.y = heightAt(fpos.x, fpos.z);
    foxC.pos.x = fpos.x + 12; foxC.pos.z = fpos.z; foxC.pos.y = heightAt(foxC.pos.x, foxC.pos.z);
    _losT = -9;                                  // bust the LOS cache
    R.losCover = AnimalDetection.threat(foxC) < openBand;
    wolf.pos.x = wx0; wolf.pos.z = wz0;
    _losT = tSec + 999; _losV = 0;               // back to deterministic open ground
  } else R.losCover = 'no-forest';
  foxC.dispose();

  // safety: danger drains it, calm cover restores it
  const sf = new Animal('deer', wolf.pos.x + 6, wolf.pos.z, { adult: true });
  sf.aware = 1; sf.wildD = null; const s0 = sf.safety;
  AnimalNeeds.update(sf, 2, true);
  const dropped = sf.safety < s0;
  sf.aware = 0; sf.cover = 0.6; const s1 = sf.safety;
  AnimalNeeds.update(sf, 2, false);
  R.safetyNeed = dropped && sf.safety > s1;
  sf.dispose();

  // low safety drives shelter-seeking
  const sc = new Animal('deer', wolf.pos.x + 40, wolf.pos.z, { adult: true });
  sc.cover = 0.05; sc.safety = 5; sc.aware = 0; sc.wildD = null; sc.setState('idle'); sc.timer = 0;
  sc.update(dt, tSec);
  R.seekCover = ['seekCover', 'rest'].includes(sc.state);
  sc.dispose();

  // deep snow drags non-snow species
  weather.snow = 0.6;
  deer.state = 'flee'; deer.startFlee(wolf.pos); deer.runT = 3; deer.state = 'flee';
  const p0b = { x: deer.pos.x, z: deer.pos.z }; deer.update(dt, tSec);
  const snowSpd = Math.hypot(deer.pos.x - p0b.x, deer.pos.z - p0b.z) / dt;
  weather.snow = 0;
  R.snowDrags = snowSpd < fastSpd * 0.95;
  wolf.speed = 0;

  // starving apex predator stalks the wolf itself
  const stalker = new Predator('bear', wolf.pos.x + 35, wolf.pos.z);
  stalker.hunger = 95; stalker.reArmed = false;
  let stalkState = 'lurk';
  for (let i = 0; i < 90 && stalkState === 'lurk'; i++) { stalker.update(dt, tSec + i * dt); stalkState = stalker.state; }
  R.apexStalksWolf = stalkState === 'warn' || stalkState === 'chase';
  stalker.dispose();

  // predator hunts wild prey when hungry
  const pr = new Predator('tiger', wolf.pos.x + 60, wolf.pos.z);
  pr.hunger = 80; pr.reArmed = false;
  const meal = new Animal('rabbit', pr.pos.x + 3, pr.pos.z, { adult: true });   // nearest prey wins the scan
  meal.startFlee(pr.pos); meal.fleeT = 99; meal.runT = 99;
  const ck = Math.floor(meal.pos.x / CHUNK) + ',' + Math.floor(meal.pos.z / CHUNK);
  const chm = chunks.get(ck); if (chm) chm.animals.push(meal);   // prey must be findable
  let g2 = 0;
  while (!meal.dead && g2++ < 400) { pr.update(dt, tSec); meal.update(dt, tSec); tSec += dt; }
  R.predatorHunts = meal.dead;
  R.huntStateSaw = true;
  pr.dispose(); if (!meal.dead) meal.dispose();

  // bear sleeps at night
  const bear = new Predator('bear', wolf.pos.x + 160, wolf.pos.z);
  bear.hunger = 10; dayF = 0.05;
  let sawSleep = false;
  const origRandom = Math.random; Math.random = () => 0;   // the drowsy roll always lands
  for (let i = 0; i < 600 && !sawSleep; i++) { bear.update(dt, tSec + i * dt); if (bear.state === 'sleep') sawSleep = true; }
  Math.random = origRandom;
  R.bearSleepsNight = sawSleep;
  dayF = 1;
  bear.dispose();

  // LOD: mid-distance bursts
  const far = new Animal('rabbit', wolf.pos.x + 120, wolf.pos.z, { adult: true });
  far.update(0.016, tSec);
  R.lodAccumulates = far.lodT > 0;
  far.dispose(); r1.dispose(); r2.dispose(); deer.dispose(); d1.dispose(); d2.dispose(); goat.dispose(); fox.dispose(); sleeper.dispose();
  return R;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
const F = [];
if (R.modules.some(m => !m[1])) F.push('modules: ' + R.modules.filter(m => !m[1]).map(m => m[0]).join());
if (!R.wild.herds) F.push('wild herds');
if (R.personalityDiffers !== true) F.push('personality');
if (!R.needsGrow) F.push('needs');
if (!R.alertOrFlee || !R.fleesClose) F.push('alert/flee');
if (!R.preyTires) F.push('prey stamina');
if (!R.herdPanic) F.push('herd panic');
if (!R.goatRetaliates || !R.goatChargeHit) F.push('goat retaliation');
if (!R.barRevealed || !R.predBar) F.push('health bar reveal');
if (!R.barHugHead) F.push('health bar floats too high');
if (!R.barHealthy || !R.barHurt || !R.barCritical) F.push('health bar colours');
if (!R.barGradual) F.push('health bar not gradually red');
if (!R.sleepsAtNight || !R.wakesOnThreat) F.push('sleep');
if (!R.rainMasks || !R.nocturnalKeen) F.push('detection mods');
if (!R.predatorHunts) F.push('predator hunt');
if (!R.bearSleepsNight) F.push('bear sleep');
if (R.losCover !== true) F.push('line-of-sight');
if (!R.safetyNeed) F.push('safety need');
if (!R.seekCover) F.push('seek cover');
if (!R.snowDrags) F.push('snow drag');
if (!R.apexStalksWolf) F.push('apex stalks wolf');
if (!R.lodAccumulates) F.push('LOD');
if (F.length) { console.log('ECOSYSTEM FAIL:', F.join(', ')); process.exit(1); }
console.log('ECOSYSTEM TEST PASS');
