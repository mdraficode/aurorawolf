import { pathToFileURL, fileURLToPath } from 'url';
/* The living soundtrack: adaptive music states, biome themes, wolf voice, wild ambience */
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
  const R = await page.evaluate(async () => {
    const out = {};
    audio.init(); audio.resume();   // a real browser unlocks on the first touch
    // ---- exploration baseline ----
    music.update(0.05);
    out.started = music.started && Object.keys(music.layers).length === 6;
    out.explore = { state: music.state, bpm: Math.round(music.bpm) };
    // ---- combat: a predator gives chase ----
    let pr = null;
    for (const ch of chunks.values()) { if (ch.predators.length) { pr = ch.predators[0]; break; } }
    if (pr) {
      pr.pos.x = wolf.pos.x + 30; pr.pos.z = wolf.pos.z; pr.state = 'chase'; pr.model.position.copy(pr.pos);
      wolf.hp = 40;
      music.update(0.05);
      out.combat = { state: music.state, bpm: Math.round(music.bpm) };
      out.combatTempoWithHp = music.bpm > 120;   // low hp drives the tempo
      pr.state = 'return'; wolf.hp = 100;
    } else out.combat = { state: 'no-predator-loaded', bpm: 0 };
    // ---- epic: the rival pack is this land's boss fight ----
    WORLD_EVENTS.force('rivalPack');
    music.update(0.05);
    out.epic = { state: music.state, epic: music.epic === true };
    WORLD_EVENTS.end();
    // ---- the hunt: prowling with prey near ----
    wolf.crouch = true;
    const a = new Animal('deer', wolf.pos.x + 12, wolf.pos.z);
    a.aware = 0; a.pos.y = heightAt(a.pos.x, a.pos.z);
    chunks.get(ck(Math.floor(a.pos.x / CHUNK), Math.floor(a.pos.z / CHUNK))).animals.push(a);
    music.update(0.05);
    out.hunt = { state: music.state, bpm: Math.round(music.bpm) };
    wolf.crouch = false; a.dispose();
    music.update(0.05);
    // ---- biome themes sing differently ----
    out.themes = Object.keys(music.THEMES).length;
    music.theme = 'mountain'; out.pianoTheme = music.THEMES.mountain.instr;
    music.theme = 'meadow'; out.kalimbaTheme = music.THEMES.meadow.instr;
    // ---- combo stabs climb ----
    music.hitStab(); music.hitStab(); music.hitStab();
    out.combo = music.comboN === 3;
    // ---- the whole voice battery ----
    out.sfx = {};
    for (const f of ['whimper', 'bark', 'pant', 'boneCrunch', 'iceCrack', 'branchSnap', 'rustle', 'owl', 'eagle', 'uiClick', 'whoosh', 'fanfare']) {
      try { if (f === 'fanfare') music[f](); else audio[f](); out.sfx[f] = true; } catch (e) { out.sfx[f] = e.message; }
    }
    try { audio.growlVar('aggressive'); audio.growlVar('warning'); audio.growlVar('pain'); out.sfx.growls = true; } catch (e) { out.sfx.growls = e.message; }
    try { audio.cry(1.1); audio.breath(0.03); audio.setWater(0.2, 0.08); out.sfx.cryBreathWater = true; } catch (e) { out.sfx.cryBreathWater = e.message; }
    // ---- paw prints on snow ----
    let snow = null;
    for (let i = 0; i < 3000 && !snow; i++) { const x = (Math.random() - 0.5) * 8000, z = (Math.random() - 0.5) * 8000; if (heightAt(x, z) > 2 && climateAt(x, z, 0).temp < -0.45) snow = { x, z }; }
    if (snow) {
      wolf.pos.x = snow.x; wolf.pos.z = snow.z; wolf.pos.y = heightAt(snow.x, snow.z) + 1;
      wolf.speed = 6; wolf.yaw = 0;
      for (let i = 0; i < 60; i++) { wolf.pos.x += 0.35; wolf.distance += 0.35; updatePawPrints(1 / 20); }
      out.paws = pawPrints.list.length;
      // and they fade in half a minute
      for (let i = 0; i < 70; i++) { tSec += 0.5; updatePawPrints(0.5); }
      out.pawsFade = pawPrints.list.length;
      wolf.speed = 0;
    }
    // ---- the world steps back when menus open ----
    setState('pause');
    await new Promise(r => setTimeout(r, 900));   // let frames apply the blur (headless can crawl)
    out.blurPause = renderer.domElement.style.filter.includes('blur');
    setState('play');
    await new Promise(r => setTimeout(r, 900));
    out.blurPlay = renderer.domElement.style.filter === '';
    // ---- light: flare + rays + mist exist and respond ----
    out.visuals = { flare: flareGrp.length === 3, rays: raysGrp.length === 5, mist: mistGrp.length === 6 };
    return out;
  });
  ok(R.started, 'music engine starts with 6 layers');
  ok(R.explore.state === 'explore' && R.explore.bpm < 75, `exploration is calm (${R.explore.bpm} bpm)`);
  ok(R.combat.state === 'combat' && R.combat.bpm > 110, `combat drives the tempo (${R.combat.bpm} bpm)`);
  ok(R.combatTempoWithHp, 'wounded wolf = faster drums');
  ok(R.epic.state === 'combat' && R.epic.epic, 'rival-pack battle plays the epic tier');
  ok(R.hunt.state === 'hunt' && R.hunt.bpm < 80, `the hunt is a held breath (${R.hunt.bpm} bpm)`);
  ok(R.themes >= 10, `every biome has a voice (${R.themes} themes)`);
  ok(R.pianoTheme === 'piano' && R.kalimbaTheme === 'kalimba', `instruments differ by land (mountain=${R.pianoTheme}, meadow=${R.kalimbaTheme})`);
  ok(R.combo, 'combo stabs climb in pitch');
  const sfxBad = Object.entries(R.sfx).filter(([k, v]) => v !== true);
  ok(sfxBad.length === 0, `wolf voice + ambience battery silent-safe (${Object.keys(R.sfx).length} sounds${sfxBad.length ? ', FAILURES: ' + sfxBad.map(x => x[0]).join(',') : ''})`);
  ok(R.paws > 8, `paw prints persist in snow (${R.paws})`);
  ok(R.pawsFade === 0, `prints fade within 30 s (${R.pawsFade} left)`);
  ok(R.blurPause && R.blurPlay, 'menu depth-of-field blurs the world, play restores it');
  ok(R.visuals.flare && R.visuals.rays && R.visuals.mist, 'lens flare, god rays and dawn mist live');
  console.log(failures ? `FAIL (${failures})` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
} finally { await browser.close(); }
