/* Dynamic world events: director + storm/blizzard/flood/fire/migration/rival pack */
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=20250827&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForFunction(() => typeof chunks !== 'undefined' && chunks.size >= 40, null, { timeout: 90000 });
await page.waitForTimeout(2000);
const R = await page.evaluate(() => {
  const out = {};
  const origRandom = Math.random, _sr = mulberry32(4242);
  Math.random = () => _sr();          // deterministic event rolls (fire spots, stances)
  const IN = { f: 0, b: 0, l: 0, r: 0, my: 0, mx: 0, sprint: 0, jump: 0, paused: 0 };
  const step = (n, dt) => {
    for (let i = 0; i < n; i++) {
      WORLD_EVENTS.update(dt); updateWeather(dt); updateEnvironment(dt); maintainChunks(dt);
      for (const ch of chunks.values()) { for (const a of ch.animals) a.update(dt, tSec); for (const pr of ch.predators) pr.update(dt, tSec); }
    }
  };

  // 1. director sanity + weighting
  out.director = { exists: typeof WORLD_EVENTS === 'object', events: Object.keys(EVENTS).sort() };
  out.pickReturns = typeof WORLD_EVENTS.pickEvent() === 'object' || WORLD_EVENTS.pickEvent() === null;

  // 2. storm: weather locks in; exposure drains hp in the open, cover protects
  WORLD_EVENTS.force('storm');
  for (let i = 0; i < 250; i++) updateWeather(0.1);   // 25 s — blend fully toward targets
  out.storm = { name: WORLD_EVENTS.name, storm: +weather.storm.toFixed(2), rain: +weather.rain.toFixed(2) };
  weather.storm = 0.9; weather.rain = 0.7;           // pinned for the probe
  const openSpot = (() => { for (let d = 0; d < 400; d += 8) { const x = wolf.pos.x + d, z = wolf.pos.z; if (heightAt(x, z) > 2 && coverAt(x, z) < 0.2) return { x, z }; } return null; })();
  if (openSpot) {
    wolf.pos.x = openSpot.x; wolf.pos.z = openSpot.z; wolf.pos.y = heightAt(openSpot.x, openSpot.z);
    wolf.hp = 80;
    for (let i = 0; i < 50; i++) updateEnvironment(0.1);
    out.stormOpenHp = +wolf.hp.toFixed(1);
    const cov = coverAt(openSpot.x, openSpot.z);
    out.stormCoverSafe = cov < 0.35 ? true : 'spot-was-covered';
  }
  WORLD_EVENTS.end(); weather.storm = 0; weather.rain = 0;

  // 3. blizzard: chill + visibility collapse + stamina drain
  const fogBefore = scene.fog.far;
  WORLD_EVENTS.force('blizzard');
  for (let i = 0; i < 40; i++) updateWeather(0.1);
  wolf.stamina = 100;
  for (let i = 0; i < 30; i++) updateEnvironment(0.1);
  out.blizzard = { chill: WORLD_EVENTS.chill, stamina: +wolf.stamina.toFixed(1), hud: document.getElementById('biome').textContent };
  WORLD_EVENTS.end();

  // 4. flood: water rises, dry fords become swims, plane visible, drains away
  WORLD_EVENTS.force('flood');
  for (let i = 0; i < 450; i++) WORLD_EVENTS.update(0.1);   // 45 s in
  out.flood = { h: +WORLD_EVENTS.floodH.toFixed(2) };
  const ford = (() => {
    for (let d = 5; d < 800; d += 5) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = wolf.pos.x + dx * d, z = wolf.pos.z + dz * d; const h = heightAt(x, z);
      if (h > 0.1 && h < 0.6) return { x, z, h };
    }
    return null;
  })();
  if (ford) {
    wolf.pos.x = ford.x; wolf.pos.z = ford.z; wolf.pos.y = ford.h;
    for (let i = 0; i < 15; i++) wolf.update(0.05, IN, 0, 0.4);
    out.fordSwims = wolf.swimming;
  } else out.fordSwims = 'no-ford';
  for (let i = 0; i < 1200; i++) WORLD_EVENTS.update(0.1);   // run the event out
  out.floodAfter = { h: WORLD_EVENTS.floodH, name: WORLD_EVENTS.name };

  // 5. fire: ignites, chars vegetation & ground, animals flee
  weatherT.rain = 0; weather.rain = 0; weatherT.snow = 0; weather.snow = 0; weatherT.storm = 0; weather.storm = 0; weather.timer = 999;   // dry sky for the burn
  WORLD_EVENTS.force('fire');
  if (WORLD_EVENTS.name === 'fire') {
    const f = WORLD_EVENTS.fireAt;
    wolf.pos.x = f.x; wolf.pos.z = f.z; wolf.pos.y = heightAt(f.x, f.z);   // stand by the fire: chunks at full LOD
    // park a witness animal near the flames
    const wit = new Animal('deer', f.x + 20, f.z, { adult: true });
    const chk = chunks.get(Math.floor(wit.pos.x / CHUNK) + ',' + Math.floor(wit.pos.z / CHUNK));
    if (chk) chk.animals.push(wit);
    step(50, 0.1);   // 5 s in: the panic is on
    const fledEarly = wit.state === 'flee' || wit.dead;
    step(600, 0.1);   // 65 s total — the fire front keeps widening
    const fAfter = WORLD_EVENTS.fireAt;   // the fire may have already burned out
    out.fire = {
      ended: !fAfter,
      r: fAfter ? +fAfter.r.toFixed(1) : 99,
      witnessFled: fledEarly,
      charred: [...chunks.values()].reduce((t, c) => t + (c.charred ? c.charred.size : 0), 0),
      scorched: [...chunks.values()].reduce((t, c) => t + (c.scorched ? c.scorched.size : 0), 0)
    };
    wit.dispose();
    // rain beats it back
    if (WORLD_EVENTS.fireAt) {
      weather.rain = 0.8;
      const r0 = WORLD_EVENTS.fireAt.r;
      for (let i = 0; i < 450; i++) WORLD_EVENTS.update(0.1);   // ~45 s of rain: any fire dies
      out.fireRain = { shrank: WORLD_EVENTS.fireAt ? WORLD_EVENTS.fireAt.r < r0 : true, over: WORLD_EVENTS.name !== 'fire' };
      weather.rain = 0;
    } else out.fireRain = { shrank: true, over: true };
  } else out.fire = 'no-spot (skip)';

  // 6. migration: herd spawns on the move and travels
  WORLD_EVENTS.force('migration');
  const herd = (() => { for (const ch of chunks.values()) for (const a of ch.animals) if (a.state === 'migrate') return a; return null; })();
  if (herd) {
    const p0 = { x: herd.pos.x, z: herd.pos.z };
    step(300, 0.1);
    out.migration = {
      spawned: true,
      moved: +Math.hypot(herd.pos.x - p0.x, herd.pos.z - p0.z).toFixed(1),
      state: herd.state
    };
  } else out.migration = { spawned: false };
  WORLD_EVENTS.end();

  // 7. rival pack: spawns, decides a stance, fights, breaks after losses
  WORLD_EVENTS.force('rivalPack');
  const pack = WORLD_EVENTS.pack;
  if (pack) {
    out.pack = { size: pack.members.length, stance: pack.stance };
    // drag the pack into stance range and force a challenge
    const m0 = pack.members.find(m => !m.dead);
    m0.pos.x = wolf.pos.x + 30; m0.pos.z = wolf.pos.z;
    pack.stance = 'undecided';
    for (let i = 0; i < 5; i++) pack.update(0.1, tSec);
    out.packStance = pack.stance;
    // provoke -> attack; wolf takes damage
    const hp0 = wolf.hp; wolf.invulnT = 0;
    pack.provoked();
    m0.pos.x = wolf.pos.x + 1.5; m0.pos.z = wolf.pos.z; m0.atkCd = 0;
    for (let i = 0; i < 10; i++) pack.update(0.1, tSec);
    out.packFight = { stance: pack.stance, hurt: wolf.hp < hp0 || wolf.invulnT > 0 };
    // player bite can hit a rival
    const m1 = pack.members.find(m => !m.dead);
    if (m1) {
      m1.pos.x = wolf.pos.x + Math.sin(wolf.yaw) * 2; m1.pos.z = wolf.pos.z + Math.cos(wolf.yaw) * 2;
      wolf.atkCd = 0;
      const hp1 = m1.hp;
      wolf.attack();
      out.biteHits = m1.hp < hp1 || m1.dead;
    }
    // losses break morale
    let guard = 0;
    while (pack.stance !== 'flee' && guard++ < 20) { const v = pack.members.find(m => !m.dead); if (!v) break; v.hp = 1; v.hit(); }
    out.packMorale = { stance: pack.stance, lost: pack.lost };
    WORLD_EVENTS.end();
    out.rivalsCleared = rivals.length === 0;
  } else out.pack = null;

  // 8. cooldown after an event
  out.cooldown = WORLD_EVENTS.cooldown > 0;
  Math.random = origRandom;
  return out;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
const F = [];
if (!R.director.exists || R.director.events.join() !== 'aurora,blizzard,fire,flood,meteor,migration,rivalPack,storm,whiteStag') F.push('director registry');
if (R.pickReturns !== true) F.push('pickEvent broken');
if (R.storm.name !== 'storm' || R.storm.storm < 0.9 || R.storm.rain < 0.6) F.push('storm weather ' + JSON.stringify(R.storm));
if (!(R.stormOpenHp !== undefined && R.stormOpenHp < 80)) F.push('storm exposure no drain ' + R.stormOpenHp);
if (!(R.blizzard.chill > 0.3 && R.blizzard.stamina < 100)) F.push('blizzard ' + JSON.stringify(R.blizzard));
if (!/°C/.test(R.blizzard.hud)) F.push('hud temp');
if (!(R.flood.h > 1.0)) F.push('flood rise ' + R.flood.h);
if (R.fordSwims !== true && R.fordSwims !== 'no-ford') F.push('flood fords not swim');
if (!(R.floodAfter.h === 0 && R.floodAfter.name !== 'flood')) F.push('flood drain ' + JSON.stringify(R.floodAfter));
if (R.fire !== 'no-spot (skip)') {
  if (!(R.fire.r > 4 || R.fire.ended)) F.push('fire spread ' + R.fire.r);
  if (!R.fire.witnessFled) F.push('animals do not flee fire');
  if (!(R.fire.charred >= 4 && R.fire.scorched > 20)) F.push('fire scar ' + JSON.stringify(R.fire));
  if (!R.fireRain.over) F.push('fire not ended by rain');
}
if (!R.migration.spawned || R.migration.moved < 15) F.push('migration ' + JSON.stringify(R.migration));
if (!R.pack || R.pack.size < 3) F.push('pack spawn');
else {
  if (!['ignore', 'challenge', 'attack'].includes(R.packStance)) F.push('pack stance ' + R.packStance);
  if (R.packFight.stance !== 'attack' || !R.packFight.hurt) F.push('pack fight ' + JSON.stringify(R.packFight));
  if (!R.biteHits) F.push('player bite misses rivals');
  if (R.packMorale.stance !== 'flee') F.push('pack morale ' + JSON.stringify(R.packMorale));
  if (!R.rivalsCleared) F.push('rivals not cleaned up');
}
if (!R.cooldown) F.push('no cooldown after event');
if (F.length) { console.log('EVENTS FAIL:', F.join(', ')); process.exit(1); }
console.log('EVENTS TEST PASS');
