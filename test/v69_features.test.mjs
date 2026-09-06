// v6.9 feature test — sky peaks + fjords, mountain caves + bats, cliff hangers + XP, cliff falls, jumping fish
import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=6969');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1200);
const R = await page.evaluate(() => {
  const R = { fail: [] };
  const ok = (name, cond, info) => { if (cond) R[name] = info ?? true; else R.fail.push(name + (info ? ' [' + JSON.stringify(info).slice(0, 120) + ']' : '')); };

  // ---- 1. TERRAIN: sky peaks + fjords ----
  let peak = 0, fjords = 0, snowAbove = 0, fjordSpot = null;
  for (let z = -1800; z <= 1800; z += 16) for (let x = -1800; x <= 1800; x += 16) {
    const h = heightAt(x, z);
    if (h > peak) peak = h;
    if (h > 60 && h < 90) snowAbove++;                      // peak zone exists past the old ~56–70 ceiling zone
    const mm = ss(0.02, 0.5, fbm(nM, x * 0.0015 + 37.7, z * 0.0015 - 11.3, 3));
    if (mm > 0.4 && h < WATER_Y - 0.4) { fjords++; if (!fjordSpot) fjordSpot = [x, z]; }   // sea water INSIDE the mountain mask = fjord arms
  }
  R.fjordSpot = fjordSpot;
  ok('skyPeaks', peak > 92, { peak: +peak.toFixed(1) });
  ok('fjords', fjords > 12, { fjordCells: fjords });

  // ---- 2. stream the mountains: vistas, cliff falls, extra caves, mouth bats ----
  // find the strongest mountain mass
  let mSpot = null, mBest = 0;
  for (let z = -1400; z <= 1400; z += 40) for (let x = -1400; x <= 1400; x += 40) {
    const h = heightAt(x, z);
    const cl = climateAt(x, z, h);
    const w = biomeWeights(x, z, h, cl.temp, cl.moist);
    if (w.mountain > mBest && h > 20) { mBest = w.mountain; mSpot = [x, z]; }
  }
  ok('mountainMass', !!mSpot, mSpot && { x: mSpot[0], z: mSpot[1], w: +mBest.toFixed(2) });
  // stream a 3×3 walk of mountain chunks around it
  const seen = { vista: 0, waterfall: 0, cave: 0 };
  const walk = [[0, 0], [90, 0], [-90, 0], [0, 90], [0, -90], [90, 90], [-90, -90], [180, 0], [0, 180]];
  if (fjordSpot) walk.push([fjordSpot[0] - mSpot[0], fjordSpot[1] - mSpot[1]]);   // cliff falls live where the peaks drop into the sea arms
  for (const [dx, dz] of walk) {
    const sx = mSpot[0] + dx, sz = mSpot[1] + dz;
    wolf.pos.x = sx; wolf.pos.z = sz; wolf.pos.y = heightAt(sx, sz) + 2; wolf.deadT = 0;
    for (let i = 0; i < 30; i++) tick();
    for (const lm of landmarkList) seen[lm.type] = Math.max(seen[lm.type] || 0, (seen[lm.type] || 0) + 1);   // snapshot per view — chunks unload between hops
  }
  // direct ring probe: force-generate mountain chunks (no unloading) — true cave density
  {
    const ccx = Math.floor(mSpot[0] / CHUNK), ccz = Math.floor(mSpot[1] / CHUNK);
    let gen = 0, cavN = 0;
    for (let dz2 = -2; dz2 <= 2; dz2++) for (let dx2 = -2; dx2 <= 2; dx2++) {
      const k = ck(ccx + dx2, ccz + dz2);
      if (chunks.has(k)) continue;
      genChunk(ccx + dx2, ccz + dz2); gen++;
      const c2 = chunks.get(k);
      cavN += (c2.landmarks || []).filter(l => l.type === 'cave').length;
    }
    seen.cave = Math.max(seen.cave, cavN);
    seen.ringGen = gen; seen.ringCaves = cavN;
  }
  ok('vistaSpawned', seen.vista >= 1, seen);
  ok('waterfallSpawned', seen.waterfall >= 1, seen);
  ok('mountainCavesPlentiful', seen.cave >= 2, seen);
  ok('mouthBats', bats.length > 0, { bats: bats.length });
  const vistaLm = landmarkList.find(l => l.type === 'vista');

  // ---- 3. cliff hanger discovery = XP ----
  if (vistaLm) {
    const xp0 = wolf.xpTotal || 0; const lm0 = RUN.landmarks;
    wolf.pos.x = vistaLm.x; wolf.pos.z = vistaLm.z; wolf.pos.y = heightAt(vistaLm.x, vistaLm.z) + 2;
    updateSense(1); updateSense(1);
    ok('vistaXP', vistaLm.found && (wolf.xpTotal || 0) > xp0 && RUN.landmarks > lm0, { found: vistaLm.found, xpDelta: (wolf.xpTotal || 0) - xp0 });
  } else R.fail.push('vistaXP [no vista to test]');

  // ---- 4. cave bats: swoop once, never chase ----
  const caveLm = landmarkList.find(l => l.type === 'cave');
  if (caveLm) {
    enterCave(caveLm);
    ok('caveEntered', caveState.in, { bats: bats.length });
    ok('caveBatsSpawned', bats.filter(b => b.inCave).length >= 3, { cave: bats.filter(b => b.inCave).length });
    // provoke: stand right under a roost, let cd expire
    const b = bats.find(x => x.inCave);
    wolf.pos.x = b.rx; wolf.pos.z = b.rz; wolf.pos.y = caveFloorAt(b.rx, b.rz);
    b.cd = 0.01;
    for (let i = 0; i < 60; i++) updateBats(0.05, i * 0.05);   // 3 s — swoop must fire and resolve
    ok('batSwooped', b.state === 'home' || b.state === 'roost', { state: b.state, wolfHp: wolf.hp });
    // no-chase law: walk 30 m away mid-swoop — the bat must break off for its roost, never follow past ~13 m
    b.state = 'swoop';
    wolf.pos.x = b.rx + 30; wolf.pos.z = b.rz; wolf.pos.y = b.ry;
    let maxDistFromRoost = 0;
    for (let i = 0; i < 120; i++) { updateBats(0.05, i * 0.05); maxDistFromRoost = Math.max(maxDistFromRoost, Math.hypot(b.rx - b.pos.x, b.ry - b.pos.y, b.rz - b.pos.z)); }
    ok('batNoChase', maxDistFromRoost <= 13.5 && (b.state === 'home' || b.state === 'roost'), { maxDist: +maxDistFromRoost.toFixed(1), state: b.state });
    disposeCave();
    ok('caveBatsCulled', bats.filter(x => x.inCave).length === 0, { left: bats.length });
  } else R.fail.push('caveBats [no cave to test]');

  // ---- 5. fish: spawn, jump, catch from the water ----
  let lake = null;
  outer: for (let z = -1200; z <= 1200; z += 30) for (let x = -1200; x <= 1200; x += 30) {
    if (heightAt(x, z) < WATER_Y - 1.2) { let deepN = 0; for (let k = 0; k < 6; k++) if (heightAt(x + (k - 3) * 8, z) < WATER_Y - 1) deepN++; if (deepN >= 4) { lake = [x, z]; break outer; } }
  }
  ok('lakeFound', !!lake, lake);
  if (lake) {
    wolf.pos.x = lake[0]; wolf.pos.z = lake[1]; wolf.pos.y = WATER_Y + 0.1; wolf.deadT = 0;
    for (let i = 0; i < 40; i++) tick();
    let fchunk = null, school = null;
    for (const c of chunks.values()) if (c.fish && c.fish.length) { fchunk = c; school = c.fish; break; }
    ok('fishSpawned', school && school.length >= 2, { n: school ? school.length : 0 });
    if (school && school.length) {
      const f = school[0];
      f.jumpT = 0.01; f.update(0.02);
      ok('fishJumps', f.jumping, { y: +f.pos.y.toFixed(2) });
      for (let i = 0; i < 200; i++) f.update(0.05);          // let it land again
      ok('fishLands', !f.jumping, { y: +f.pos.y.toFixed(2) });
      // the catch: wolf IN the water, facing the fish, strike
      wolf.pos.x = f.pos.x + 1.2; wolf.pos.z = f.pos.z; wolf.pos.y = WATER_Y;
      wolf.yaw = Math.atan2(f.pos.x - wolf.pos.x, f.pos.z - wolf.pos.z);
      wolf.swimming = true; wolf.atkCd = 0;
      const meat0 = inv.meat;
      wolf.attack();
      ok('fishCaughtInWater', inv.meat === meat0 + 1, { meat: inv.meat });
      // law: from dry land the same strike finds nothing
      const f2 = school.find(s => !s.dead) || null;
      if (f2) {
        wolf.swimming = false; wolf.atkCd = 0;
        // stand the wolf on a dry ridge, fish placed squarely in front of its nose
        let dry = null;
        for (let rr = 20; rr < 400 && !dry; rr += 20) for (let a = 0; a < 6 && !dry; a++) {
          const px = lake[0] + Math.sin(a) * rr, pz = lake[1] + Math.cos(a) * rr;
          if (heightAt(px, pz) > WATER_Y + 0.8) dry = [px, pz];
        }
        if (dry) {
          wolf.pos.x = dry[0]; wolf.pos.z = dry[1]; wolf.pos.y = heightAt(dry[0], dry[1]) + 1.4;
          f2.pos.x = dry[0] + 1.5; f2.pos.z = dry[1]; f2.pos.y = wolf.pos.y + 0.4;
          f2.heading = 0; f2.model.position.copy(f2.pos);
          wolf.yaw = Math.atan2(f2.pos.x - wolf.pos.x, f2.pos.z - wolf.pos.z);
          const meat1 = inv.meat; const alive1 = school.filter(x => !x.dead).length;
          wolf.attack();
          ok('noCatchFromLand', inv.meat === meat1 && school.filter(x => !x.dead).length === alive1, {});
        }
      }
    }
  }
  return R;
});
console.log(JSON.stringify(R, null, 1));
console.log(R.fail.length === 0 ? 'V69 FEATURES: PASS' : 'V69 FEATURES: FAIL — ' + R.fail.join(' | '));
console.log('page errors:', errors.length, errors.slice(0, 5));
await page.screenshot({ path: 'shots/v69_features.png' }).catch(() => { });
await browser.close();
process.exit(R.fail.length === 0 && errors.length === 0 ? 0 : 1);
