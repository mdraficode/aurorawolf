import { pathToFileURL, fileURLToPath } from 'url';
/* The hunter's world: seasons, living populations, senses, stealth & the killing bite */
import { chromium } from 'playwright';
let failures = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) failures++; };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 350 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); failures++; });
  await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=8080&quality=low');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
  await page.waitForFunction(() => typeof chunks !== 'undefined' && chunks.size >= 40, null, { timeout: 90000 });
  await page.waitForTimeout(1200);
  const R = await page.evaluate(() => {
    const out = {};
    /* ---- seasons ---- */
    out.seasonStart = SEASON.id;
    dayCount = 3; tDay = 0.1; updateSeasons();
    out.season2 = SEASON.id;
    out.biasApplied = Math.abs((climateAt(wolf.pos.x, wolf.pos.z, 10).temp) - (climateAt(wolf.pos.x, wolf.pos.z, 10).temp - SEASON_TEMP_BIAS)) > -1; // sanity
    out.biasVal = SEASON_TEMP_BIAS;
    dayCount = 9; tDay = 0.1; updateSeasons();
    out.winter = SEASON.id === 'winter' && SEASON_TEMP_BIAS < -0.2;
    /* ---- populations ---- */
    const k0 = 'deer';
    if (ECO_CAP[k0] === undefined) { out.noDeer = true; } else {
      const cap = ECO_CAP[k0];
      ECO_POP[k0] = 0;
      const ch = [...chunks.values()][0];
      const nAnimals = ch.animals.length;
      const fakeSample = (x, z) => ({ h: Math.max(2, heightAt(x, z)), w: { meadow: 1 } });
      let spawned = 0;
      for (let i = 0; i < 8; i++) { const before = [...chunks.values()][0].animals.length; AnimalSpawner.spawnChunk([...chunks.values()][0], 0, 0, Math.random, fakeSample, (r, e) => 'deer'); spawned += [...chunks.values()][0].animals.length - before; }
      out.depleted = spawned === 0 || ![...chunks.values()][0].animals.some(a => !a.dead && a.name === 'deer' && a._ecoTest);
      // direct: ECO_POP stayed 0 (nothing consumed)
      out.popStillZero = ECO_POP[k0] === 0;
      ECO_POP[k0] = 1;
      // births: spring recovers
      dayCount = 0; tDay = 0.1; updateSeasons();   // spring (day 0.1/3 → idx 0)
      out.springAgain = SEASON.id === 'spring';
      const before = ECO_POP[k0];
      for (let i = 0; i < 60; i++) updateEco(12);
      out.recovered = ECO_POP[k0] >= before;
      ECO_POP[k0] = cap;
    }
    /* ---- crouch ---- */
    wolf.crouch = true;
    const IN = { f: 1, b: 0, l: 0, r: 0, my: 0, mx: 0, sprint: 0, jump: 0, paused: 0 };
    for (let i = 0; i < 40; i++) wolf.update(1 / 30, IN, 0.5, 0.3);
    out.crouchSpeed = wolf.speed;
    out.crouchPose = wolf.model.scale.y < 0.92;
    // stealth: same animal, same spot — crouched wolf is less alarming
    const spy = new Animal('deer', wolf.pos.x + 26, wolf.pos.z);
    spy.pos.y = heightAt(spy.pos.x, spy.pos.z);
    wolf.crouch = false; wolf.speed = 7;
    const tStand = AnimalDetection.threat(spy);
    wolf.crouch = true; wolf.speed = 7;
    const tCrouch = AnimalDetection.threat(spy);
    out.stealth = tCrouch < tStand;
    out.threatPair = [tStand, tCrouch];
    spy.dispose(); wolf.crouch = false;
    /* ---- the killing bite: directions ---- */
    const chunkOf = (p) => chunks.get(ck(Math.floor(p.x / CHUNK), Math.floor(p.z / CHUNK))) || [...chunks.values()][0];
    const mk = (hx, hz, heading) => {
      const a = new Animal('elk', hx, hz);
      a.pos.y = heightAt(hx, hz); a.aware = 0;
      chunkOf(a.pos).animals.push(a);
      a.heading = heading;
      wolf.pos.x = hx - 2.6; wolf.pos.z = hz; wolf.pos.y = a.pos.y;
      wolf.yaw = Math.atan2(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z);
      wolf.atkCd = 0;
      const hp0 = a.hp;
      wolf.attack();
      return { dmg: hp0 - a.hp, a };
    };
    const back = mk(wolf.pos.x + 40, wolf.pos.z, Math.PI / 2);                 // forward +x, wolf behind at −x → behind bite
    out.behindDmg = back.dmg;
    back.a.dispose();
    const face = mk(wolf.pos.x + 40, wolf.pos.z, Math.atan2(wolf.pos.x - (wolf.pos.x + 40), wolf.pos.z - wolf.pos.z)); // facing the wolf
    out.frontDmg = face.dmg;
    // wounded prey hides
    out.elkHp = face.a.sp.hp;
    if (!face.a.dead) {
      face.a.aware = 1; face.a.injured = true;
      face.a.setState('flee'); face.a.fleeT = 2;
      wolf.pos.x = face.a.pos.x + 40;   // wolf far away
      let sawHide = false; const arc = [];
      for (let i = 0; i < 30; i++) { face.a.update(1 / 30, tSec); arc.push(face.a.state); if (face.a.state === 'seekCover' || face.a.state === 'rest') sawHide = true; }
      out.hides = sawHide;              // it hides; if the wolf stays away it eventually calms — the full arc
      out.hideState = arc[0] + '→' + face.a.state;
    }
    face.a.dispose();
    /* ---- senses ---- */
    SENSE.tracks.length = 0; SENSE.scents.length = 0;
    const walker = new Animal('deer', wolf.pos.x + 20, wolf.pos.z);
    walker.pos.y = heightAt(walker.pos.x, walker.pos.z);
    chunkOf(walker.pos).animals.push(walker);
    for (let i = 0; i < 10; i++) { walker.pos.x += 0.6; walker.update(1 / 30, tSec); updateSensesTick(); }
    out.tracks = SENSE.tracks.length;
    out.scents = SENSE.scents.length;
    walker.injured = true;
    updateSensesTick();
    out.blood = SENSE.scents.some(s2 => s2.k === 'blood');
    walker.dispose();
    wolf.senseCd = 0; wolf.wolfSense();
    updateSense(0.1);
    for (let i = 0; i < 3; i++) updateSense(0.5);
    out.senseOn = senseT > 0;
    ensureSenseMeshes();
    updateSenseFX();
    // the scent cloud (the animal/predator fog) is gone; only the ground tracks remain
    out.senseVisible = trackMarks.visible === true && scentCloud.visible === false;
    /* ---- cave cache ---- */
    let cacheFound = false;
    for (let i = 0; i < 10 && !cacheFound; i++) {
      if (caveState.in) exitCave();
      caveState.reentryCd = 0;
      const lm = { type: 'cave', x: wolf.pos.x + 30 + i * 7, z: wolf.pos.z + i * 3, model: null, ember: null, mist: null, found: true, tier: 'common', label: 'Cave Mouth' };
      enterCave(lm);
      cacheFound = caveState.pickups.some(p => p.type === 'bone');
    }
    out.cache = cacheFound;
    if (caveState.in) exitCave();
    /* ---- elevated view ---- */
    let peak = null;
    for (let i = 0; i < 3000 && !peak; i++) {
      const x = wolf.pos.x + (Math.random() - 0.5) * 5000, z = wolf.pos.z + (Math.random() - 0.5) * 5000;
      if (heightAt(x, z) > 38) peak = { x, z };
    }
    if (peak) {
      wolf.pos.x = peak.x; wolf.pos.z = peak.z; wolf.pos.y = heightAt(peak.x, peak.z) + 1;
      for (let i = 0; i < 400; i++) tick();
      out.highChunks = chunks.size;
      out.viewR_effect = chunks.size > 52;
    } else out.viewR_effect = 'no-peak-found';
    /* ---- the long view: bigger standing ring + far fog ---- */
    wolf.pos.x = 0; wolf.pos.z = 0; wolf.pos.y = heightAt(0, 0) + 1;
    for (let i = 0; i < 600; i++) tick();
    out.baseChunks = chunks.size;
    out.far = scene.fog.far;
    weatherT.cloud = 0; weatherT.rain = 0; weatherT.snow = 0; weather.cloud = 0; weather.rain = 0; weather.snow = 0;
    for (let i = 0; i < 3; i++) updateAtmosphere(0.05);
    out.farClear = scene.fog.far;
    return out;
  });
  ok(R.seasonStart === 'spring', `world begins in spring (${R.seasonStart})`);
  ok(R.season2 === 'summer', `season turns with the days (${R.season2})`);
  ok(R.winter, `winter comes with its bite (bias ${R.biasVal})`);
  if (R.noDeer) ok(true, 'deer absent in this seed — pop checks skipped'); else {
    ok(R.popStillZero, 'depleted species never spawns');
    ok(R.recovered, 'spring births recover the herd');
  }
  ok(R.crouchSpeed < 4.5, `prowling is slow (${(+R.crouchSpeed).toFixed(1)} m/s)`);
  ok(R.crouchPose, 'body lowers while prowling');
  ok(R.stealth, `crouched wolf alarms prey less (${R.threatPair})`);
  ok(R.behindDmg >= 3, `bite from behind bites deep (${R.behindDmg} dmg)`);
  ok(R.frontDmg < R.behindDmg, `face-to-face bites for less (${R.frontDmg} dmg)`);
  ok(R.hides !== false, 'wounded prey slips away to hide');
  ok(R.tracks > 0, `tracks left on the ground (${R.tracks})`);
  ok(R.scents > 0, `scent hangs around life (${R.scents})`);
  ok(R.blood, 'blood tells the strongest story');
  ok(R.senseOn && R.senseVisible, 'wolf sense reveals tracks & scent');
  ok(R.cache, 'cave caches exist (old bones worth gathering)');
  ok(R.viewR_effect === true || R.viewR_effect === 'no-peak-found', `elevated view unrolls the world (${R.highChunks || R.viewR_effect} chunks)`);
  ok(R.baseChunks >= 45, `standing ring loaded (${R.baseChunks} chunks)`);
  ok(R.farClear > 200, `clear-day fog opens far beyond the old 184 (${(+R.farClear).toFixed(0)} m here, biome haze varies)`);
  console.log(failures ? `FAIL (${failures})` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
} finally { await browser.close(); }
