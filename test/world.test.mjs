import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=20250826');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1500);
const R = await page.evaluate(() => {
  const R = {}; const dt = 1 / 30;

  // ---- 1. new biomes present in weights + findable on the map ----
  const w0 = biomeWeights(0, 0, 8, 0, 0);
  R.hasNewKeys = typeof w0.swamp === 'number' && typeof w0.enchanted === 'number';
  let foundSwamp = null, foundEnch = null, waterCells = 0, deepest = 99;
  for (let z = -400; z <= 400 && !(foundSwamp && foundEnch); z += 24) {
    for (let x = -400; x <= 400; x += 24) {
      const h = heightAt(x, z);
      if (h < WATER_Y - 0.4) waterCells++;
      if (h < deepest) deepest = h;
      if (!foundSwamp || !foundEnch) {
        const cl = climateAt(x, z, h);
        const w = biomeWeights(x, z, h, cl.temp, cl.moist);
        if (!foundSwamp && w.swamp > 0.35 && h > 1) foundSwamp = { x, z, w: +w.swamp.toFixed(2) };
        if (!foundEnch && w.enchanted > 0.35 && h > 1) foundEnch = { x, z, w: +w.enchanted.toFixed(2) };
      }
    }
  }
  R.foundSwamp = foundSwamp; R.foundEnchanted = foundEnch;
  R.waterCells = waterCells; R.deepest = +deepest.toFixed(1);
  R.riversOrLakes = waterCells >= 10 && deepest < -1.2;

  // ---- 2. landmarks: stream chunks around several spots ----
  const spots = [[0, 0], [260, 130], [-280, 240], [150, -320], [-200, -260], [400, 400], [-420, 60]];
  let maxLm = 0; const allTypes = new Set();
  for (const [sx, sz] of spots) {
    wolf.pos.x = sx; wolf.pos.z = sz; wolf.pos.y = heightAt(sx, sz) + 2; wolf.deadT = 0;
    for (let i = 0; i < 45; i++) tick();          // let the chunk streamer catch up
    landmarkList.forEach(l => allTypes.add(l.type));
    maxLm = Math.max(maxLm, landmarkList.length);
    R.landmarksHaveModels = landmarkList.every(l => l.model && l.model.parent === scene);
  }
  R.landmarks = maxLm;
  R.landmarkTypes = [...allTypes];

  // ---- 3. magic mushrooms concentrated in enchanted grove ----
  let groveShrooms = 0, plainShrooms = 0;
  if (foundEnch) {
    wolf.pos.x = foundEnch.x; wolf.pos.z = foundEnch.z;
    for (let i = 0; i < 15; i++) tick();
    for (const ch of chunks.values()) for (const pk of ch.pickups) if (pk.type === 'magicShroom' && !pk.gathered) groveShrooms++;
    wolf.pos.x = foundEnch.x + 240; wolf.pos.z = foundEnch.z + 240;
    for (let i = 0; i < 15; i++) tick();
    for (const ch of chunks.values()) for (const pk of ch.pickups) if (pk.type === 'magicShroom' && !pk.gathered) plainShrooms++;
  }
  R.groveShrooms = groveShrooms; R.plainShrooms = plainShrooms;

  // ---- 4. swimming: find deep water, swim, drain, climb out ----
  let deep = null;
  outer: for (let z = -300; z <= 300; z += 12) for (let x = -300; x <= 300; x += 12) {
    if (heightAt(x, z) < WATER_Y - 1.6) { deep = { x, z }; break outer; }
  }
  R.deepWaterFound = !!deep;
  if (deep) {
    const inp = { f: true, b: false, l: false, r: false, sprint: false, jump: false, mx: 0, my: 0, paused: false };
    const noInp = Object.assign({}, inp, { f: false });
    wolf.deadT = 0; wolf.invulnT = 0; wolf.stamina = 80; wolf.hp = 100;
    wolf.pos.x = deep.x; wolf.pos.z = deep.z; wolf.pos.y = WATER_Y + 5; wolf.vy = 0;
    for (let i = 0; i < 45; i++) wolf.update(dt, noInp, camYaw + Math.PI, camPitch);   // drop straight in
    for (let i = 0; i < 15; i++) wolf.update(dt, inp, camYaw + Math.PI, camPitch);     // then paddle
    R.swims = wolf.swimming === true;
    R.stamDrains = wolf.stamina < 80;
    // drowning: exhaust stamina in water → hp drops
    wolf.stamina = 0.2;
    for (let i = 0; i < 45; i++) wolf.update(dt, inp, camYaw + Math.PI, camPitch);
    R.drowningDrainsHp = wolf.hp < 100;
    // climb out: face land, paddle
    let bank = null;
    for (let a = 0; a < 6.28; a += 0.2) {
      const bx = deep.x + Math.sin(a) * 3, bz = deep.z + Math.cos(a) * 3;
      const bh = heightAt(bx, bz);
      if (bh > WATER_Y && bh < WATER_Y + 1.4) { bank = { bx, bz, bh }; break; }
    }
    R.bankFound = !!bank;
    if (bank) {
      wolf.pos.x = bank.bx - Math.sin(Math.atan2(bank.bx - deep.x, bank.bz - deep.z)) * 1.2;
      wolf.pos.z = bank.bz - Math.cos(Math.atan2(bank.bx - deep.x, bank.bz - deep.z)) * 1.2;
      wolf.yaw = Math.atan2(bank.bx - wolf.pos.x, bank.bz - wolf.pos.z);
      wolf.swimming = true; wolf.pos.y = WATER_Y - 0.4;
      for (let i = 0; i < 60; i++) wolf.update(dt, inp, camYaw + Math.PI, camPitch);
      R.climbsOut = !wolf.swimming;
    }
    // restore
    wolf.hp = 100; wolf.stamina = 100; wolf.deadT = 0;
    const g = heightAt(0, 0); wolf.pos.set(0, g + 1, 0); wolf.swimming = false;
  }

  // ---- 5. drink at water edge ----
  if (deep) {
    const d2 = { x: deep.x, z: deep.z };
    // stand on shore just outside water
    let shore = null;
    for (let r = 1; r < 8; r += 0.5) {
      const sx = d2.x + r, sz = d2.z;
      if (heightAt(sx, sz) > WATER_Y + 0.05) { shore = { x: sx, z: sz }; break; }
    }
    if (shore) {
      wolf.pos.x = shore.x; wolf.pos.z = shore.z; wolf.pos.y = heightAt(shore.x, shore.z); wolf.grounded = true; wolf.swimming = false;
      wolf.stamina = 37; wolf.exhausted = true; drinkCd = 0;
      doGather();
      R.drinkWorks = wolf.stamina > 95 && !wolf.exhausted;
    }
  }

  // ---- 6. minimap ----
  R.minimapEl = !!document.getElementById('minimap');
  updateMinimap(1);
  const cv = document.getElementById('minimap');
  R.minimapVisible = cv.style.display === 'block';
  const data = cv.getContext('2d').getImageData(0, 0, 168, 168).data;
  let non0 = 0;
  for (let i = 3; i < data.length; i += 400) if (data[i] > 0) non0++;
  R.minimapDrawn = non0 > 40;

  // ---- 6b. big map modal ----
  R.bigmapEl = !!document.getElementById('bigmap');
  toggleBigMap(true);
  R.bigmapOpens = document.getElementById('bigmapWrap').classList.contains('show');
  R.bigmapDrawn = (updateBigMap(1), (() => { const d = document.getElementById('bigmap').getContext('2d').getImageData(0, 0, 460, 460).data; let n = 0; for (let i = 3; i < d.length; i += 2000) if (d[i] > 0) n++; return n > 30; })());
  R.bigmapCloses = (toggleBigMap(false), !document.getElementById('bigmapWrap').classList.contains('show'));

  // ---- 7. weather bias + atmosphere apply without crash ----
  R.pickWeatherOk = (pickWeather(), true);
  R.updateAtmosphereOk = (updateAtmosphere(0.05), true);
  R.fogChanged = scene.fog.far > 10;
  R.hudOk = (updateHUD(0.05), true);
  R.deathFns = { wolfDie: typeof wolfDie, setVignette: typeof setVignette };
  return R;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
const F = [];
if (!R.hasNewKeys || !R.foundSwamp || !R.foundEnchanted) F.push('biomes');
if (!R.riversOrLakes) F.push('water coverage');
if (!R.landmarks || R.landmarkTypes.length < 2 || !R.landmarksHaveModels) F.push('landmarks');
if (R.groveShrooms === undefined || R.groveShrooms < 1) F.push('grove magic');
if (R.deepWaterFound && (!R.swims || !R.stamDrains || !R.drowningDrainsHp || !R.climbsOut)) F.push('swimming');
if (R.drinkWorks === false) F.push('drink');
if (!R.minimapEl || !R.minimapVisible || !R.minimapDrawn || !R.bigmapEl || !R.bigmapOpens || !R.bigmapDrawn || !R.bigmapCloses) F.push('minimap');
if (!R.pickWeatherOk || !R.updateAtmosphereOk || !R.hudOk || !R.fogChanged) F.push('atmosphere');
if (R.deathFns.wolfDie !== 'function') F.push('wolfDie');
if (F.length) { console.log('WORLD FAIL:', F.join(', ')); process.exit(1); }
console.log('WORLD TEST PASS');
