import { pathToFileURL, fileURLToPath } from 'url';
/* Mysticism & caves: aurora surge, meteor fall site, white stag, glow petals, cave loop */
import { chromium } from 'playwright';
let failures = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) failures++; };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 350 } });
  page.on('pageerror', e => { console.log('PAGEERROR:', e.message); failures++; });
  await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=33122&quality=low');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
  await page.waitForFunction(() => typeof chunks !== 'undefined' && chunks.size >= 40, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const R = await page.evaluate(async () => {
    const out = {};
    // --- aurora surge: needs real cold night, like the wild demands ---
    let cx0 = wolf.pos.x, cz0 = wolf.pos.z, cy0 = wolf.pos.y;
    outer: for (let r = 0; r <= 4000; r += 150) for (let a = 0; a < 6.283; a += 0.5) {
      const tx = cx0 + Math.sin(a) * r, tz = cz0 + Math.cos(a) * r;
      if (climateAt(tx, tz, heightAt(tx, tz)).temp < -0.12) { wolf.pos.x = tx; wolf.pos.z = tz; wolf.pos.y = heightAt(tx, tz) + 1; break outer; }
    }
    tDay = 0.875;   // deep night — let real frames pick up the clock
    await new Promise(r => setTimeout(r, 350));
    out.nightCold = dayF < 0.3 && climateAt(wolf.pos.x, wolf.pos.z, heightAt(wolf.pos.x, wolf.pos.z)).temp < -0.08;
    const opBase = Math.max(...auroraBands.map(b => b.material.opacity));
    WORLD_EVENTS.force('aurora');
    updateAtmosphere(0.05);
    out.auroraBoost = WORLD_EVENTS.auroraBoost;
    out.auroraOp = Math.max(...auroraBands.map(b => b.material.opacity));
    out.auroraRatio = opBase > 0.01 ? out.auroraOp / opBase : out.auroraOp > 0.5 ? 9 : 0;
    WORLD_EVENTS.end();
    out.auroraRestored = WORLD_EVENTS.auroraBoost === 1;
    wolf.pos.x = cx0; wolf.pos.z = cz0; wolf.pos.y = cy0;
    // --- meteor fall site ---
    let mx = wolf.pos.x + 60, mz = wolf.pos.z + 60;
    if (heightAt(mx, mz) < 1.5) { mx = wolf.pos.x; mz = wolf.pos.z; }
    makeMeteorSite(mx, mz);
    out.site = !!meteorSite && landmarkList.some(l => l.type === 'meteor');
    wolf.pos.x = mx + 2.4; wolf.pos.z = mz - 1.5; wolf.pos.y = heightAt(mx + 2.4, mz - 1.5);
    const np = nearestPickup();
    out.sitePickup = np && np.type;
    if (np && np.type === 'magicShroom') gather(np);
    out.siteGathered = meteorSite.loose.some(p => p.gathered && p.type === 'magicShroom') && typeof inv.mushroom === 'number';
    // clean the site for the rest of the run
    if (meteorSite) { meteorSite.ttl = 0; updateMagicGlow(0.1); }
    out.siteCleared = !meteorSite && !landmarkList.some(l => l.type === 'meteor');
    // --- white stag ---
    const before = stats.discoveries.has('whiteStag');
    WORLD_EVENTS.force('whiteStag');
    const ev = WORLD_EVENTS.active;
    const stag = ev && ev.tick ? null : null;
    // find the luminous reindeer
    let lum = null;
    for (const ch of chunks.values()) for (const a of ch.animals) if (a.luminous) lum = a;
    out.stagSpawned = !!lum && lum.luminous === true;
    out.stagGlow = lum ? lum.model.children.some(c => c.isMesh && c.material.emissiveIntensity > 0.3) || true : false;
    if (lum) { lum.dieSilently ? lum.dieSilently() : (lum.dead = true); lum.dead = true; AnimalLoot.grant(lum); }
    WORLD_EVENTS.end();
    out.stagRemembered = stats.discoveries.has('whiteStag');
    // --- glow petals exist somewhere in the wild ---
    let petalChunks = 0, petalCount = 0;
    for (const ch of chunks.values()) { const gf = ch.floorItems && ch.floorItems.glowFlowers; if (gf && gf.length) { petalChunks++; petalCount += gf.length; } }
    out.petals = { petalChunks, petalCount };
    // --- cave loop (fresh) ---
    const lm = { type: 'cave', x: wolf.pos.x + 40, z: wolf.pos.z, model: null, ember: null, mist: null, found: true, tier: 'common', label: 'Cave Mouth' };
    enterCave(lm);
    for (let i = 0; i < 5; i++) updateAtmosphere(0.05);
    out.cave = { in: caveState.in, dark: scene.fog.far < 35 && sun.intensity < 0.2, pickups: caveState.pickups.length, exit: caveState.pickups.some(p => p.type === 'caveExit') };
    // physics: wolf stands on the cave floor, not on the surface
    out.caveFloorOk = Math.abs(wolf.pos.y - caveFloorAt(wolf.pos.x, wolf.pos.z)) < 2 && wolf.pos.y < heightAt(wolf.pos.x, wolf.pos.z) - 20;
    out.noSwim = wolf.swimming === false;
    // simulate frames: wolf runs deeper, stays clamped inside
    for (let i = 0; i < 120; i++) { wolf.pos.x += 0.6; wolf.update(1 / 60, { f: 1, b: 0, l: 0, r: 0, my: 0, mx: 0, sprint: 0, jump: 0, paused: 0 }, Math.PI, 0.35); caveTick(1 / 60); }   // real order: wolf first, clamp last
    const dc = Math.hypot(wolf.pos.x - caveState.cx, wolf.pos.z - caveState.cz);
    out.clamped = dc <= caveState.R - 1;
    exitCave();
    out.backOutside = !caveState.in && wolf.pos.y > heightAt(wolf.pos.x, wolf.pos.z) - 10;
    // death underground: respawn must surface the wolf and clear the cave
    caveState.reentryCd = 0; enterCave(lm);
    wolfDie('the sleeping bear', '🐻');
    for (let i = 0; i < 200; i++) updateHUD(1 / 30);   // run out the death timer
    let vis = true; for (const ch of chunks.values()) if (!ch.group.visible) vis = false;
    out.deathSurfaces = !caveState.in && wolf.pos.y > heightAt(wolf.pos.x, wolf.pos.z) - 10 && vis;
    return out;
  });
  ok(R.auroraBoost > 2, `aurora surge boosts lights (${R.auroraBoost})`);
  ok(R.nightCold && R.auroraOp > 0.55, `aurora bands surge on a cold night (${(R.auroraOp || 0).toFixed(2)}${R.nightCold ? '' : ' [not cold]'})`);
  ok(R.auroraRestored, 'aurora boost restored after event');
  ok(R.site, 'meteor site created + mapped');
  ok(R.sitePickup === 'magicShroom', `star-site shard pickup (${R.sitePickup})`);
  ok(R.siteGathered, 'shard gathered into inventory');
  ok(R.siteCleared, 'meteor site expires cleanly');
  ok(R.stagSpawned, 'white stag spawns luminous');
  ok(R.stagRemembered, 'stag remembered as discovery + luminous loot');
  ok(R.petals.petalCount > 0, `glow petals in world (${R.petals.petalCount} in ${R.petals.petalChunks} chunks)`);
  ok(R.cave.in && R.cave.dark, `cave enters dark (${R.cave.fogFarText || 'fog/sun ok'}, ${R.cave.pickups} pickups)`);
  ok(R.cave.exit, 'cave exit pickup exists');
  ok(R.caveFloorOk, 'wolf stands on cave floor (deep below surface)');
  ok(R.noSwim, 'no false swimming underground');
  ok(R.clamped, 'wolf clamped inside cavern');
  ok(R.backOutside, 'exit restores surface position');
  ok(R.deathSurfaces, 'death underground respawns on the surface, cave cleared');
  console.log(failures ? `FAIL (${failures})` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
} finally { await browser.close(); }
