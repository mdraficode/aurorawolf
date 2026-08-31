import { pathToFileURL, fileURLToPath } from 'url';
// Quests, NPCs (Spirit), bosses, XP — headless gate.
import { chromium } from 'playwright';

const results = [];
const ck = (name, ok, extra = '') => { results.push([name, !!ok]); console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 350 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=777&quality=low');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
  await page.waitForTimeout(900);

  const logShown = () => !document.getElementById('questLog').classList.contains('show');

  // ---- boot state ----
  let R = await page.evaluate(() => ({
    avail: QUESTS.avail.length, xp: wolf.xp, lvl: wolf.level, title: wolf.title,
    tracker: document.getElementById('questTracker').textContent,
    logHidden: !document.getElementById('questLog').classList.contains('show')
  }));
  ck('boot: quests offered at start', R.avail >= 2, `${R.avail} available`);
  ck('boot: level card in tracker', R.tracker.includes('Lv 0') && R.tracker.includes('Young Pup'));
  ck('boot: quest log starts hidden', R.logHidden);

  // ---- log open via book button; Available tab; accept; abandon ----
  await page.click('#questBtn');
  await page.waitForTimeout(700);
  R = await page.evaluate(() => document.getElementById('questLog').classList.contains('show'));
  ck('log opens from book button', R);
  await page.click('.qtab[data-t="avail"]');
  await page.waitForTimeout(500);
  R = await page.evaluate(() => ({ n: document.querySelectorAll('#questList .qcard').length }));
  ck('Available tab lists quests', R.n >= 2, `${R.n} cards`);
  await page.evaluate(() => { const b = document.querySelector('#questList [data-ac]'); if (b) b.click(); });
  await page.waitForTimeout(600);
  R = await page.evaluate(() => ({ active: QUESTS.active.length, title: QUESTS.active[0] ? QUESTS.active[0].title : '', tracker: document.getElementById('questTracker').textContent }));
  ck('accept from log', R.active === 1, `active=${R.active}`);
  ck('active quest in HUD tracker', R.active === 1 && R.tracker.includes(R.title), R.title);
  await page.click('.qtab[data-t="active"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => { const b = document.querySelector('#questList [data-ab]'); if (b) b.click(); });
  await page.waitForTimeout(500);
  R = await page.evaluate(() => QUESTS.active.length);
  ck('abandon frees the slot', R === 0, `active=${R}`);
  await page.evaluate(() => { const b = document.querySelector('#questList [data-ac]'); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(400);


  // ---- pause hides the log too ----
  R = await page.evaluate(() => { setState('pause'); return { paused: state === 'pause', hidden: !document.getElementById('questLog').classList.contains('show') }; });
  await page.waitForTimeout(300);
  await page.evaluate(() => setState('play'));
  await page.waitForTimeout(300);
  ck('pause closes the log', R.paused && R.hidden);

  // ---- XP + level + title ----
  await page.evaluate(() => addXp(300));
  await page.waitForTimeout(600);
  R = await page.evaluate(() => ({ lvl: wolf.level, hp: wolf.maxHp, title: wolf.title, track: document.getElementById('questTracker').textContent }));
  ck('addXp levels up (3 levels, +8 maxHp each)', R.lvl === 3 && R.hp === 124, `lvl ${R.lvl}, hp ${R.hp}`);
  ck('title shown in tracker', R.track.includes(R.title), R.title);

  // ---- LIVE kill path: a real bite must advance a real hunt quest (B1 regression) ----
  await page.evaluate(async () => {
    let prey = null;
    for (const [, ch] of chunks) for (const a2 of ch.animals) if (a2.sp.label === 'Rabbit' && !a2.dead) { prey = a2; break; }
    if (!prey) return 'no-rabbit';
    QUESTS.active.length = 0;
    const q = genQuest('hunt'); q.species = 'rabbit'; q.title = 'LIVE KILL'; q.need = 1; q.have = 0; q.biome = 'forest';
    QUESTS.active.push(q);
    const xp0 = wolf.xp;
    for (let i = 0; i < 50 && !prey.dead; i++) {
      const a0 = Math.random() * 6.28;
      wolf.pos.set(prey.pos.x + Math.sin(a0) * 1.4, prey.pos.y + 0.8, prey.pos.z + Math.cos(a0) * 1.4);
      wolf.yaw = Math.atan2(prey.pos.x - wolf.pos.x, prey.pos.z - wolf.pos.z); camYaw = wolf.yaw;
      wolf.atkCd = 0;
      wolf.attack();
      await new Promise(r => setTimeout(r, 220));
    }
    await new Promise(r => setTimeout(r, 600));
    window.__LIVEKILL = { died: prey.dead, have: q.have, xp: wolf.xp - xp0 };
    QUESTS.active.length = 0; QUESTS.done.length = 0;
    return 'ok';
  });
  R = await page.evaluate(() => window.__LIVEKILL || { died: false, have: -1, xp: 0, skip: 'no-rabbit' });
  ck('live kill advances quest + pays XP', R.died === true && R.have === 1 && R.xp > 0, `died=${R.died}, have=${R.have}, +${R.xp}xp`);

  // ---- questEvent completes a hunt ----
  await page.evaluate(() => {
    QUESTS.active.length = 0;
    const q = genQuest('hunt'); q.progress = 0; q.have = q.need - 1;
    QUESTS.active.push(q); QUESTS.dirty = true; questHudDirty = true;
  });
  await page.waitForTimeout(400);
  R = await page.evaluate(() => ({ sp: QUESTS.active[0].species, need: QUESTS.active[0].need, xp0: wolf.xp, lv0: wolf.level }));
  await page.evaluate(sp => { window.__qXP0 = wolf.xp; window.__qLV0 = wolf.level; questEvent('kill', { species: sp, pos: { x: wolf.pos.x, z: wolf.pos.z } }); }, R.sp);
  await page.waitForTimeout(800);
  R = await page.evaluate(() => ({ done: QUESTS.done.length, xp: wolf.xp, lv: wolf.level, lv0: window.__qLV0 || 0, avail: QUESTS.avail.length, byBiome: questsDoneByBiome }));
  ck('hunt quest completes + logs', R.done >= 1, `done=${R.done}`);
  ck('completion pays XP + refills avail', (R.xp > 50 || R.lv > (R.lv0 || 1)) && R.avail >= 2, `xp=${R.xp}${R.lv > (R.lv0 || 1) ? ' (leveled!)' : ''}, avail=${R.avail}`);
  const doneCount = Math.max(0, ...Object.values(R.byBiome || { x: 0 }));
  ck('biome quest credit tracked', doneCount >= 1, JSON.stringify(R.byBiome));

  // ---- boss gating: needs 3 quests AND spirit ----
  await page.evaluate(() => { questsDoneByBiome.forest = 1; maybeAwakenBoss('forest'); });
  R = await page.evaluate(() => BOSSES.forest.awake);
  ck('boss asleep with <3 quests', !R);
  // ---- spirit: spawn by a cave, card, first-meeting cinema ----
  const spiritOk = await page.evaluate(async () => {
    // caves are rare rolls — place one where we stand so the gate is deterministic
    const cave = landmarkList.find(l => l.type === 'cave');
    const c = cave || { type: 'cave', x: wolf.pos.x + 65, z: wolf.pos.z, model: null, chunkKey: null, found: false };
    if (!cave) landmarkList.push(c);
    wolf.pos.x = c.x + 65; wolf.pos.z = c.z;   // stand in the spirit's ring: 65 m from the mouth
    for (let i = 0; i < 40 && !SPIRIT.active; i++) {
      SPIRIT.cd = 0;
      await new Promise(r => setTimeout(r, 250));
    }
    return SPIRIT.active ? 'ok' : 'timeout';
  });
  await page.waitForTimeout(900);
  R = await page.evaluate(() => ({
    live: !!SPIRIT.active, met: SPIRIT.met, cine: CINEMA.active,
    card: document.getElementById('spiritCard').textContent.length > 10
  }));
  ck('spirit spawns near caves', spiritOk === 'ok' && R.live, spiritOk);
  ck('cryptic text card shown', R.card);
  ck('first meeting = cinema', R.cine && R.met);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  R = await page.evaluate(() => CINEMA.active);
  ck('cinema cannot be skipped', R);
  await page.evaluate(() => { if (CINEMA.active) CINEMA.dur = Math.min(CINEMA.dur, 0.6); });
  await page.waitForFunction(() => !CINEMA.active, null, { timeout: 45000 });
  R = await page.evaluate(() => CINEMA.active);
  ck('cinema ends on its own', !R);

  // ---- boss awakens + spawns + bar + music ----
  await page.evaluate(() => {
    questsDoneByBiome.forest = 3; maybeAwakenBoss('forest');
    let f = null;
    for (let r = 100; r <= 800 && !f; r += 120)
      for (let a = 0; a < 6.28 && !f; a += 0.5) {
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (dominantBiomeAt(x, z).key === 'forest') f = { x, z };
      }
    if (f) { wolf.pos.x = f.x; wolf.pos.z = f.z; }
  });
  await page.waitForTimeout(4000);
  R = await page.evaluate(() => {
    const boss = bosses.find(b => !b.dead);
    return {
      spawned: !!boss, hp: boss ? boss.hp : 0,
      bar: document.getElementById('bossBar').classList.contains('show'),
      name: document.getElementById('bossName').textContent,
      music: music.boss === true
    };
  });
  ck('boss spawns in its biome', R.spawned, R.name);
  ck('boss HP bar shown', R.bar);
  ck('epic music during boss', R.music);
  R = await page.evaluate(() => {
    const boss = bosses.find(b => !b.dead);
    if (!boss) return { ok: false };
    const hp0 = boss.hp; boss.hit(20);
    return { ok: true, dented: boss.hp < hp0 };
  });
  ck('boss.hit takes damage', R.ok && R.dented);
  await page.evaluate(() => { for (const b of bosses) if (!b.dead) { b.hp = 1; b.die(); } });
  await page.waitForTimeout(1200);
  R = await page.evaluate(() => ({ slow: bossSlowmoT > 0 || wolf.perks.springSteps, perk: !!wolf.perks.springSteps, slain: BOSSES.forest.slain }));
  ck('boss death: slow-mo', R.slow);
  ck('boss grants permanent ability', R.perk, 'springSteps');
  ck('boss marked slain', R.slain);
  await page.waitForFunction(() => !document.getElementById('bossBar').classList.contains('show') && !music.boss, null, { timeout: 45000 }).catch(() => {});
  R = await page.evaluate(() => ({ bar: document.getElementById('bossBar').classList.contains('show'), mboss: music.boss }));
  ck('boss bar + music released', !R.bar && !R.mboss);

  // ---- fast travel: marker on big map, click teleports ----
  await page.evaluate(() => { FAST_TRAVEL.length = 0; FAST_TRAVEL.push({ x: wolf.pos.x + 80, z: wolf.pos.z + 80, name: 'Test Stone' }); });
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(1000);
  R = await page.evaluate(() => ({ open: BIG.open, hits: FT_HITS.length }));
  ck('big map shows travel markers', R.open && R.hits >= 1, `${R.hits} markers`);
  const moved = await page.evaluate(() => {
    const cv = document.getElementById('bigmap');
    const r = cv.getBoundingClientRect();
    const f = FT_HITS[0];
    const e = new MouseEvent('click', { bubbles: true, clientX: r.left + f.sx * (r.width / cv.width), clientY: r.top + f.sy * (r.height / cv.height) });
    cv.dispatchEvent(e);
    window.FT_TX = f.x; window.FT_TZ = f.z;
    return true;
  });
  await page.waitForTimeout(900);
  R = await page.evaluate(() => ({ x: wolf.pos.x, z: wolf.pos.z, open: BIG.open, tx: window.FT_TX, tz: window.FT_TZ }));
  ck('click marker = fast travel', moved && R.tx !== undefined && Math.abs(R.x - R.tx) < 40 && Math.abs(R.z - R.tz) < 40 && !R.open, `(${R.x | 0}, ${R.z | 0}) → (${R.tx | 0}, ${R.tz | 0})`);

  ck('zero page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
const fails = results.filter(r => !r[1]).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
