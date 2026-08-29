/* ============ 🤖 AI PLAY — the wolf plays itself (in-game watch mode) ============
   The v7 "True Hunter" brain: stalks from behind, ambush-crits, flees danger, rests and
   drinks, picks smart deeds, chases the 3-deeds-per-biome legend arc and fights bosses.
   In-game: tap the 🤖 button (spectator mode). Headless/watch builds: ?autopilot=1. */
(function () {
  const URL_ON = /[?&]autopilot=1/.test(location.search);

  /* ---------------- sim boost (?speed=N&rate=R, special builds only) ----------------
     Software GL renders at ~2-3 fps here and dt clamps at 0.05 → the sim crawls at
     ~0.12x real time. Fix: drive the game's tick from a master interval — each batch
     runs N exact 50 ms sim steps and renders only the last. Physics keeps its designed
     step; headless rAF (which starves timers) becomes irrelevant. */
  const QS2 = new URLSearchParams(location.search);
  const SPEED = Math.min(16, Math.max(1, +(QS2.get('speed') || 1)));
  const RATE = Math.min(4, Math.max(0.25, +(QS2.get('rate') || 1)));   // sim-seconds per wall-second target
  const R_EVERY = Math.min(10, Math.max(1, +(QS2.get('re') || 1)));       // render once per K batches (headless: rendering is the bottleneck)
  window.BOT_SPEED = SPEED;
  if (SPEED > 1) {
    // capture the game's own tick() and drive ONLY it from a master interval —
    // UI/rAF one-shots stay on the real rAF, untouched and unmultiplied.
    const origRaf = window.requestAnimationFrame.bind(window);
    let tickFn = null;
    window.requestAnimationFrame = cb => {
      if (cb && cb.name === 'tick') { tickFn = cb; return 0; }
      return origRaf(cb);
    };
    const origRender = renderer.render.bind(renderer);
    let step = 0, batchIdx = 0;
    renderer.render = function (...a) { if (step % SPEED !== SPEED - 1 || batchIdx % R_EVERY !== R_EVERY - 1) return; return origRender(...a); };
    clock.getDelta = function () { return 0.05; };   // every executed step is one full game tick
    window.__boost = { batches: 0, ticks: 0, warns: 0, lastMsg: '' };
    let lastEnd = 0, batchDur = 0;
    setInterval(() => {
      const cyc = Math.max(50, SPEED * 50 / RATE, batchDur * 1.15);   // never schedule tighter than we can breathe
      if (performance.now() - lastEnd < cyc) return;
      if (!tickFn) return;
      const t0 = performance.now();
      for (step = 0; step < SPEED; step++) {
        try { tickFn(); window.__boost.ticks++; }
        catch (e) { window.__boost.warns++; window.__boost.lastMsg = String(e && e.message).slice(0, 120); }
      }
      batchDur = performance.now() - t0;
      lastEnd = performance.now();
      window.__boost.batches++; batchIdx++;
    }, 25);
  }

  const SIMNOW = () => performance.now() * (window.BOT_SPEED || 1);   // brain thinks in game-time (sim runs BOT_SPEED× faster than the wall clock)
  let booted = false;
  function bootAI() {
  if (booted) return; booted = true;
  const L = (window.BOTLOG = []);
  const t0 = performance.now();
  const N = (window.BOTN = {});                       // cumulative counters — splice-proof stats
  const log = (type, data) => {
    const e = Object.assign({ t: +((performance.now() - t0) / 1000).toFixed(1), type }, data || {});
    L.push(e);
    N[type] = (N[type] || 0) + 1;
    if (L.length > 4000) L.splice(0, 1000);
    botPanelPush(e);
  };

  /* ---------------- instrumentation ---------------- */
  window.addEventListener('error', e => log('page-error', { msg: String(e.message).slice(0, 140) }));
  const origErr = typeof errShow === 'function' ? errShow : null;
  if (origErr) window.errShow = m => { log('error-banner', { msg: String(m).slice(0, 140) }); return origErr(m); };
  for (const fn of ['acceptQuest', 'abandonQuest', 'completeQuest']) {
    const o = window[fn];
    if (!o) { log('missing-symbol', { fn }); continue; }
    window[fn] = function (...a) {
      const r = o.apply(this, a);
      const q = typeof a[0] === 'object' ? a[0] : (QUESTS.active.find(x => x.id === a[0]) || QUESTS.done.find(x => x.id === a[0]) || {});
      log('quest-' + fn, { title: q.title || String(a[0]), have: q.have, need: q.need });
      return r;
    };
  }
  const oXp = window.addXp;
  if (oXp) window.addXp = n => { const before = wolf.level; const r = oXp(n); if (wolf.level > before) log('level-up', { level: wolf.level, title: wolf.title }); return r; };

  /* ---------------- sampler (2s) + story tracker ---------------- */
  let frames = 0;
  const cnt = () => { frames++; requestAnimationFrame(cnt); };
  requestAnimationFrame(cnt);
  const story = { biomes: new Set(), perksSeen: new Set(Object.keys(wolf.perks || {})), bossSeen: {}, day: 0, lowFpsStreak: 0 };
  let stat30 = 0;
  setInterval(() => {
    try {
      let animals = 0, predators = 0;
      for (const [, ch] of chunks) { animals += ch.animals.length; predators += ch.predators.length; }
      // story diffs → events
      if (story.biomes.size === 0 || !story.biomes.has(curBiomeKey)) { story.biomes.add(curBiomeKey); log('biome-enter', { biome: curBiomeKey, n: story.biomes.size }); bot.pauseUntil = Math.max(bot.pauseUntil || 0, SIMNOW() + 1500); bot.pauseWhy = 'taking in new land'; if (wolf.senseCd <= 0) wolf.wolfSense(); }
      for (const k in wolf.perks) if (!story.perksSeen.has(k)) { story.perksSeen.add(k); log('perk', { perk: k }); }
      for (const k in BOSSES) {
        const d = BOSSES[k];
        const s = story.bossSeen[k] || (story.bossSeen[k] = {});
        if (d.awake && !s.awake) { s.awake = true; log('boss-awake', { boss: d.name, biome: k }); }
        if (d.slain && !s.slain) { s.slain = true; log('boss-slain', { boss: d.name, biome: k }); }
        if (d.live && !bosses.some(b => !b.dead) && !d.slain && s.spawned) log('bug-boss-vanished', { boss: d.name, msg: 'def.live but no live boss in world (not slain)' });
        if (d.live) s.spawned = true;
      }
      if (SPIRIT.met && !story.spirit) { story.spirit = true; log('spirit-met', {}); }
      if (dayCount !== story.day) { story.day = dayCount; log('dawn', { day: dayCount }); }
      log('sample', {
        fps: +(frames / 2 / window.BOT_SPEED).toFixed(1), frames: 0, sim: +(typeof tSec !== 'undefined' ? tSec : 0).toFixed(0), chunks: chunks.size, lms: landmarkList.length, animals, predators,
        x: +wolf.pos.x.toFixed(1), y: +wolf.pos.y.toFixed(1), z: +wolf.pos.z.toFixed(1),
        hp: +wolf.hp.toFixed(1), stam: +wolf.stamina.toFixed(0), lvl: wolf.level, xp: wolf.xp | 0, xpNext: wolf.xpNext,
        biome: curBiomeKey, weather: weather.label || '', time: (typeof tDay !== 'undefined' ? tDay.toFixed(2) : ''), day: dayCount,
        act: QUESTS.active.length, av: QUESTS.avail.length, done: QUESTS.done.length, dist: +(wolf.distance || 0).toFixed(0),
        spiritMet: SPIRIT.met, bossesAwake: Object.values(BOSSES).filter(b => b.awake).length, bossesSlain: Object.values(BOSSES).filter(b => b.slain).length,
        perks: Object.keys(wolf.perks).length, kills: (typeof stats !== 'undefined' ? stats.caught + (stats.slain || 0) : -1),
        nan: !Number.isFinite(wolf.pos.x + wolf.pos.y + wolf.pos.z + camPitch + camYaw + wolf.hp + wolf.stamina)
      });
      frames = 0;
      const now = performance.now();
      if (now - stat30 > 30000) {   // the runner's heartbeat record
        stat30 = now;
        log('stat30', {
          lvl: wolf.level, xp: wolf.xp | 0, xpNext: wolf.xpNext, hp: +wolf.hp.toFixed(0), maxHp: wolf.maxHp, stam: +wolf.stamina.toFixed(0),
          done: QUESTS.done.length, active: QUESTS.active.map(q => q.title).join(' | '), kills: (typeof stats !== 'undefined' ? stats.caught + (stats.slain || 0) : -1),
          deaths: story.deaths || 0, biomes: story.biomes.size, biome: curBiomeKey, bossesSlain: Object.values(BOSSES).filter(b => b.slain).length,
          perks: Object.keys(wolf.perks).join(','), day: dayCount, dist: +(wolf.distance || 0).toFixed(0), x: +wolf.pos.x.toFixed(0), z: +wolf.pos.z.toFixed(0), simT: +(tSec || 0).toFixed(0)
        });
      }
    } catch (e) { log('sampler-error', { msg: String(e.message).slice(0, 120) }); }
  }, 2000);

  /* ---------------- live event panel (harmless headless) ---------------- */
  const panel = document.createElement('div');
  panel.id = 'botPanel';
  panel.style.cssText = 'position:fixed;top:230px;right:14px;z-index:70;width:250px;font:11px/1.45 ui-monospace,monospace;color:#dfeee6;background:rgba(8,14,22,.72);border:1px solid rgba(126,240,192,.35);border-radius:10px;padding:8px 10px;pointer-events:none;white-space:pre-wrap';
  document.body.appendChild(panel);
  const badge = document.createElement('div');
  badge.textContent = '● LIVE — 🤖 AUTOPILOT v7.20 NATURAL HUNTER';
  badge.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:71;font:11px ui-monospace,monospace;color:#ffd0d0;background:rgba(60,8,8,.75);border:1px solid rgba(255,120,100,.5);border-radius:8px;padding:3px 10px;pointer-events:none';
  document.body.appendChild(badge);
  const feed = [];
  function botPanelPush(e) {
    const icons = { 'quest-acceptQuest': '📜', 'quest-completeQuest': '✅', 'quest-abandonQuest': '🗑️', 'level-up': '⭐', death: '💀', kill: '🩸', gather: '🌿', stuck: '🧱', 'error-banner': '🐞', 'page-error': '💥', discover: '🧭', 'boss-awake': '💀', 'boss-slain': '👑', perk: '✨', 'spirit-met': '👻', dawn: '🌅', 'biome-enter': '🗺️', ambush: '🗡️', rest: '😴', drink: '💧', flee: '🏃' };
    if (!icons[e.type] && e.type !== 'objective') return;
    feed.unshift((e.t + 's ').padEnd(7) + (icons[e.type] || '') + ' ' + (e.msg || e.title || e.boss || e.perk || e.text || e.type));
    if (feed.length > 9) feed.pop();
  }
  setInterval(() => {
    const q = QUESTS.active[0];
    const obj = bot && bot.goalText ? bot.goalText : '…';
    panel.textContent = '🎯 ' + (q ? q.icon + ' ' + q.title + '  ' + q.have + '/' + q.need : 'no quest') + '\n➡️ ' + obj + '\n\n' + feed.join('\n');
  }, 600);

  /* ---------------- helpers ---------------- */
  const bot = {
    goalText: 'waking up…', wander: null, lastAtk: 0, lastGather: 0, howlT: 60, senseT: 0, noPreyT: 0,
    gatherMisses: 0, lastInvSum: -1, stuckPos: null, stuckT: 0, unstickT: 0, detourT: 0, detourPos: null, goalKey: '', goalStuck: 0,
    deadSeen: false, warned: {}, restT: 0, drinkGoal: null, fight: null, bossPilgrim: null, lastHp: 100, noRegenT: 0, shunned: new Set(),
    trek: null, wanderHist: [], wanderT: 0, pathWin: [], loopN: 0, loopEpoch: 0, loopCd: 0, lmStick: null, preyShun: null, lastYaw: undefined, stalkT0: 0, stalkD0: 0, pauseUntil: 0, pauseWhy: ''
  };
  const nearestAnimal = filter => {
    let best = null, bd = 1e9;
    for (const [, ch] of chunks) for (const a of ch.animals) {
      if (a.dead) continue;
      if (filter && !filter(a)) continue;
      const d = Math.hypot(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z);
      if (d < bd) { bd = d; best = a; }
    }
    return { a: best, d: bd };
  };
  const nearestPk = item => {
    let best = null, bd = 1e9;
    for (const [, ch] of chunks) for (const p of ch.pickups) {
      if (p.gathered) continue;
      const def = PICKUP_DEF[p.type];
      if (item && (!def || def.inv !== item)) continue;
      const d = Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z);
      if (d < bd) { bd = d; best = p; }
    }
    return { p: best, d: bd };
  };
  const nearestPred = () => {
    let best = null, bd = 1e9;
    for (const [, ch] of chunks) for (const pr of ch.predators) {
      if (pr.dead) continue;
      const d = Math.hypot(pr.pos.x - wolf.pos.x, pr.pos.z - wolf.pos.z);
      if (d < bd) { bd = d; best = pr; }
    }
    return { a: best, d: bd };
  };
  const liveBoss = () => {
    let best = null, bd = 1e9;
    for (const b of bosses) {
      if (b.dead || b.isClone) continue;
      const d = Math.hypot(b.pos.x - wolf.pos.x, b.pos.z - wolf.pos.z);
      if (d < bd) { bd = d; best = b; }
    }
    return { b: best, d: bd };
  };
  const nearestRival = () => {
    let best = null, bd = 1e9;
    for (const r of rivals) {
      if (r.dead) continue;
      const d = Math.hypot(r.pos.x - wolf.pos.x, r.pos.z - wolf.pos.z);
      if (d < bd) { bd = d; best = r; }
    }
    return { a: best, d: bd };
  };
  // any hostile rival-pack member nearby? (they bite like predators, but live in `rivals`)
  const nearestPackThreat = () => {
    const pk = WORLD_EVENTS.pack;
    let best = null, bd = 1e9;
    const hostile = r => (r.pack && r.pack.stance === 'attack') || (pk && pk.stance === 'attack');
    for (const r of rivals) {
      if (r.dead || !hostile(r)) continue;
      const d = Math.hypot(r.pos.x - wolf.pos.x, r.pos.z - wolf.pos.z);
      if (d < bd) { bd = d; best = r; }
    }
    return { a: best, d: bd };
  };
  const nearestWater = rMax => {   // nearest dry BANK beside water (standing IN the drink is how wolves drown)
    let best = null, bd = 1e9;
    const wy = waterYNow();
    for (let r = 10; r <= (rMax || 110); r += 8)
      for (let a4 = 0; a4 < 6.28; a4 += 0.4) {
        const x = wolf.pos.x + Math.sin(a4) * r, z = wolf.pos.z + Math.cos(a4) * r;
        if (heightAt(x, z) < wy - 0.2) {   // water here — walk 5 m back toward the wolf for the bank
          const bx = x - Math.sin(a4) * 5, bz = z - Math.cos(a4) * 5;
          if (heightAt(bx, bz) > wy + 0.15) { const d = Math.hypot(bx - wolf.pos.x, bz - wolf.pos.z); if (d < bd) { bd = d; best = { x: bx, z: bz, d }; } }
        }
      }
    return best;
  };
  const invSum = () => inv.berry + inv.mushroom + inv.herb + inv.wood + inv.stone + inv.bone + inv.meat + inv.pelt;
  bot.travelToBiome = (biome, anyHigh) => {
    let best = null, bd = 1e9;
    for (let r = 120; r <= 1000; r += 80)
      for (let a4 = 0; a4 < 6.28; a4 += 0.5) {
        const x = wolf.pos.x + Math.sin(a4) * r, z = wolf.pos.z + Math.cos(a4) * r;
        const ok = anyHigh ? heightAt(x, z) > 38 : dominantBiomeAt(x, z).key === biome;
        if (ok) { const d = Math.hypot(x - wolf.pos.x, z - wolf.pos.z); if (d < bd) { bd = d; best = { x, z, d }; } }
      }
    return best;
  };

  // press START like a human
  const startIv = setInterval(() => {
    const b = document.getElementById('btnStart');
    if (b && !b.disabled) { clearInterval(startIv); b.click(); log('boot', { msg: 'entered the wild' }); }
  }, 400);

  const warnOnce = (key, type, data) => { const k = key + '|' + (data ? data.key : ''); if (bot.warned[k]) return; bot.warned[k] = 1; log(type, data); };
  // the wolf runs along camYaw+PI (the camera trails behind it) — aim in movement space,
  // convert once at the end of the tick. v6/v7.0 steered camYaw directly = ran backwards.
  let aimYaw = null, aimEase = 0.45;
  const aim = (yaw, ease) => { aimYaw = yaw; if (ease !== undefined) aimEase = ease; };
  const applyAim = () => { if (aimYaw !== null) camYaw += wrapPI(aimYaw + Math.PI - camYaw) * aimEase; aimYaw = null; aimEase = 0.45; };

  /* ---------------- quest selection: score offers like a player reading the board ---------------- */
  const questScore = q => {
    let s = 1;
    if (q.kind === 'survive') s = q.days ? 6 : 4.5;                       // passive progress, always worth a slot
    else if (q.kind === 'hunt') {
      const ref = SPECIES[q.species];
      const hit = nearestAnimal(a => a.sp === ref || (ref && a.sp.label === ref.label));
      s = hit.d < 160 ? 4 : hit.d < 400 ? 2.5 : 1.2;
    } else if (q.kind === 'collect') {
      const hit = nearestPk(q.item);
      s = hit.d < 120 ? 3.6 : 1.4;
    } else if (q.kind === 'explore') {
      let bd = 1e9, any = false;
      for (const lm of landmarkList) { if (q.lmType && lm.type !== q.lmType) continue; any = true; const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z); if (d < bd) bd = d; }
      s = !any ? 0.4 : bd < 220 ? 3.4 : bd < 500 ? 2 : 1;
    } else if (q.kind === 'rival') s = wolf.level >= 3 && wolf.hp > 70 ? 3 : 0.3;
    if (q.biome === curBiomeKey) s += 1.2;                                 // work the land I'm standing in
    const deeds = (typeof questsDoneByBiome !== 'undefined' ? (questsDoneByBiome[q.biome] || 0) : 0);
    const legendLand = BOSSES[q.biome] && !BOSSES[q.biome].slain;
    if (deeds === 2 && legendLand) s += 2.6;                               // one deed from waking a legend!
    else if (deeds === 2) s += 0.6;
    if (deeds >= 3 && !legendLand) s -= 0.8;                               // spent lands with no legend — move on
    return s;
  };
  const keepQuestsFilled = () => {
    let guard = 0;
    while (QUESTS.active.length < 2 && QUESTS.avail.length && guard++ < 4) {
      let best = null, bs = -1;
      for (const q of QUESTS.avail) { if (bot.shunned.has(q.title)) continue; const s = questScore(q); if (s > bs) { bs = s; best = q; } }
      if (!best && !QUESTS.active.length && QUESTS.avail.length) { bot.shunned.clear(); log('shun-relief', { msg: 'every deed set aside — forgiving and taking the least bad' }); continue; }
      if (!best) break;
      if (bs < 0.8 && QUESTS.active.length >= 1) break;   // hold out for better second deeds…
      acceptQuest(best.id);                               // …but never run deed-less
    }
  };

  /* ================= THE BRAIN (every 150 ms) ================= */
  setInterval(() => {
    try {
      if (typeof state === 'undefined' || state === 'boot') return;
      if (window.BOT_OFF) {
        if (!bot.stopped) { bot.stopped = true; keys.KeyW = keys.KeyS = keys.KeyA = keys.KeyD = false; keys.ShiftLeft = false; keys.Space = false; }
        return;
      } else bot.stopped = false;
      if (state === 'pause') { if (window.AI_PLAY) window.AI_PLAY(false); return; }   // human paused — hand the wolf back
      if (state !== 'play') return;

      // death & respawn
      if (wolf.deadT > 0) {
        if (!bot.deadSeen) {
          bot.deadSeen = true; story.deaths = (story.deaths || 0) + 1;
          const np = nearestPred(), lb = liveBoss(), rv = nearestRival();
          log('death', { hp: +wolf.hp.toFixed(1), predatorNear: np.d < 60 ? 'yes(' + np.d.toFixed(0) + 'm)' : 'no', bossNear: lb.d < 120 ? lb.b.def.name : 'no', rivalNear: rv.d < 60 ? 'yes(' + rv.d.toFixed(0) + 'm)' : 'no', msg: 'wolf fell' });
        }
        return;
      }
      bot.deadSeen = false;

      // hp-loss auditor — every drop gets a context snapshot (rate-limited to 1 per 1.5 s)
      if (wolf.hp < (bot.hpWatch ?? 100) - 0.6 && SIMNOW() - (bot.hpLogT || 0) > 1500 && wolf.deadT <= 0) {
        bot.hpLogT = SIMNOW();
        const np = nearestPred(), rv = nearestRival(), lb = liveBoss();
        log('hp-loss', {
          dmg: +((bot.hpWatch ?? 100) - wolf.hp).toFixed(1), hp: +wolf.hp.toFixed(0),
          swimming: !!wolf.swimming, biome: curBiomeKey, storm: +(weather.storm || 0).toFixed(2), chill: +(WORLD_EVENTS.chill || 0).toFixed(2),
          pred: np.d < 60 ? np.d.toFixed(0) + 'm' : '-', rival: rv.d < 60 ? rv.d.toFixed(0) + 'm' : '-', boss: lb.d < 100 ? lb.d.toFixed(0) + 'm' : '-',
          ev: WORLD_EVENTS.name || '-'
        });
      }
      bot.hpWatch = wolf.hp;

      keepQuestsFilled();

      /* ---------- threat picture ---------- */
      const pred = nearestPred();
      const packHit = nearestPackThreat();
      if (packHit.a && (!pred.a || packHit.d < pred.d)) { pred.a = packHit.a; pred.d = packHit.d; }   // hostile wolves are predators too
      const bossHit = liveBoss();
      const frac = wolf.hp / wolf.maxHp;

      /* ---------- 0. water: a wolf swims to shore, always ---------- */
      if (wolf.swimming) {
        let shoreYaw = null, bestH = -1e9;
        for (let k = 0; k < 12; k++) {
          const yy = (k / 12) * Math.PI * 2;
          const h = heightAt(wolf.pos.x + Math.sin(yy) * 10, wolf.pos.z + Math.cos(yy) * 10) - waterYNow();
          if (h > bestH) { bestH = h; shoreYaw = yy; }
        }
        aim(shoreYaw, 0.9);
        keys.KeyW = true; keys.ShiftLeft = false; wolf.crouch = false;
        bot.goalText = '🌊 swimming to shore';
        if (!bot.swimLog || SIMNOW() - bot.swimLog > 20000) { bot.swimLog = SIMNOW(); log('swim', { msg: 'in deep water — heading for shore' }); }
        applyAim(); return;
      }

      /* ---------- 1. survive-critical: disengage and run ---------- */
      const bossThreat = bossHit.d < 26;
      const young = wolf.level < 3;
      const heavyHunter = pred.a && pred.a.sp && (pred.a.sp.dmg || 0) >= 13;   // bears hit 15 — don't trade
      const fleeAt = young ? 0.62 : heavyHunter ? 0.55 : 0.34;
      if ((frac < fleeAt && (pred.d < (young ? 55 : 45) || bossThreat)) || (frac < 0.48 && bossThreat)) {
        const src = bossThreat && (!pred.a || bossHit.d < pred.d) ? bossHit.b.pos : pred.a.pos;
        const yx = wolf.pos.x - src.x, yz = wolf.pos.z - src.z, m = Math.hypot(yx, yz) || 1;
        let fleeYaw = Math.atan2(yx / m, yz / m);
        // never flee into the sea: rotate toward dry land until the exit is safe
        for (let k = 0; k < 8 && heightAt(wolf.pos.x + Math.sin(fleeYaw) * 12, wolf.pos.z + Math.cos(fleeYaw) * 12) < waterYNow() - 0.4; k++) {
          fleeYaw += (k % 2 ? 1 : -1) * 0.55 * Math.ceil((k + 1) / 2);
        }
        aim(fleeYaw, 0.6);
        keys.KeyW = true; keys.ShiftLeft = wolf.stamina > 18 && !wolf.exhausted;
        wolf.crouch = false; bot.fight = null; bot.goalText = '🏃 fleeing at ' + (frac * 100).toFixed(0) + '% hp';
        if (!bot.fleeLog || SIMNOW() - bot.fleeLog > 15000) { bot.fleeLog = SIMNOW(); log('flee', { msg: 'badly hurt — disengaging' }); }
        applyAim(); return;
      }

      /* ---------- 2. boss fight (the story's boss battles) ---------- */
      if (bossHit.b && bossHit.d < 150 && frac > 0.6 && wolf.level >= 3) {
        const b = bossHit.b, d = bossHit.d;
        bot.fight = 'boss';
        wolf.crouch = false;
        const bYaw = b.heading || 0;
        // its specials: submerged/burrowed = unhittable and it erupts at 3.4 m → get clear
        if (b.subT > 0 || b.invuln) {
          const yx = wolf.pos.x - b.pos.x, yz = wolf.pos.z - b.pos.z, m = Math.hypot(yx, yz) || 1;
          aim(Math.atan2(yx / m, yz / m), 1);
          keys.KeyW = d < 12; keys.ShiftLeft = d < 10;
          bot.goalText = 'boss ' + b.def.name + ' submerged — clearing the blast';
          applyAim(); return;
        }
        // the bison's charge: sidestep, don't outrun
        if (b.charging) {
          aim(b.chargeDir + 1.45, 0.7);
          keys.KeyW = true; keys.ShiftLeft = true;
          bot.goalText = 'dodging the charge';
          applyAim(); return;
        }
        // hit-and-run: 2 bites, then out of reach while its swing recovers
        const retreating = bot.bossRetreatUntil && SIMNOW() < bot.bossRetreatUntil;
        const fx = Math.sin(bYaw), fz = Math.cos(bYaw);
        const facing = (fx * (wolf.pos.x - b.pos.x) + fz * (wolf.pos.z - b.pos.z)) / (d || 1);   // -1 = we're behind it
        if (retreating) {
          const yx = wolf.pos.x - b.pos.x, yz = wolf.pos.z - b.pos.z, m = Math.hypot(yx, yz) || 1;
          aim(Math.atan2(yx / m, yz / m), 0.5);
          keys.KeyW = d < 16; keys.ShiftLeft = d < 9;
          bot.goalText = 'backing off ' + b.def.name + ' (' + (b.hp | 0) + 'hp)';
        } else {
          const rear = { x: b.pos.x - fx * 2.2, z: b.pos.z - fz * 2.2 };   // get behind its jaws
          aim(Math.atan2(rear.x - wolf.pos.x, rear.z - wolf.pos.z), 0.5);
          keys.KeyW = d > 2.6; keys.ShiftLeft = d > 12 && wolf.stamina > 25 && !wolf.exhausted;
          if (d < 4.4 + b.def.scale * 0.6 && facing < -0.2 && b.atkCd > 0.4 && SIMNOW() - bot.lastAtk > 650) {
            bot.lastAtk = SIMNOW();
            bot.bossBites = (bot.bossBites || 0) + 1;
            wolf.attack();
            if (bot.bossBites >= 2) { bot.bossBites = 0; bot.bossRetreatUntil = SIMNOW() + 2600; }
          }
          bot.goalText = 'fighting ' + b.def.name + ' (' + (b.hp | 0) + 'hp, phase ' + (b.phase + 1) + ')';
        }
        if (frac < 0.42) { bot.bossRetreatUntil = 0; bot.fight = null; }   // handled by flee next tick
        applyAim(); return;
      }

      /* ---------- 3. rest & drink: a real player manages their bars ---------- */
      if (frac < 0.62 && pred.d > 65 && bossHit.d > 130) {
        if (!bot.restT) { bot.restT = SIMNOW(); log('rest', { msg: 'hurt (' + (frac * 100).toFixed(0) + '%) — resting to heal' }); }
        keys.KeyW = false; keys.ShiftLeft = false; wolf.crouch = false;
        bot.goalText = '😴 resting (hp ' + wolf.hp.toFixed(0) + '/' + wolf.maxHp + ')';
        // no-regen bug detector: hurt, safe, and hp hasn't moved for 45 s
        if (wolf.hp <= bot.lastHp + 0.2) { bot.noRegenT = (bot.noRegenT || 0) + 0.15; if (bot.noRegenT > 45) { warnOnce('noregen' + ((wolf.hp) | 0), 'bug-no-regen', { msg: 'safe & hurt but hp not regenerating for 45s' }); bot.noRegenT = 0; } }
        else bot.noRegenT = 0;
        bot.lastHp = wolf.hp;
        return;
      }
      bot.restT = 0;
      // drink with hysteresis: commit until stamina is actually restored (or the trip times out)
      if (((wolf.stamina < 24 && !bot.drinking) || (bot.drinking && wolf.stamina < 88)) && pred.d > 55 && !wolf.swimming) {
        bot.drinking = true;
        if (nearWaterEdge()) {
          doGather();  // drinking is gather-at-water's-edge
          keys.KeyW = false; bot.goalText = '💧 drinking — stamina ' + wolf.stamina.toFixed(0);
          if (SIMNOW() - (bot.lastDrinkLog || 0) > 7000) { bot.lastDrinkLog = SIMNOW(); log('drink', { msg: 'drank at the water — stamina restored' }); }
          if (wolf.stamina > 80) bot.drinking = false;
          return;
        }
        const w = bot.drinkGoal && SIMNOW() - (bot.drinkGoal.at || 0) < 45000 ? bot.drinkGoal : nearestWater(110);
        if (w) {
          if (!bot.drinkGoal || SIMNOW() - (bot.drinkGoal.at || 0) >= 45000) { bot.drinkGoal = Object.assign({ at: SIMNOW() }, w); if (SIMNOW() - (bot.drinkLogT || 0) > 20000) { bot.drinkLogT = SIMNOW(); log('drink-trip', { msg: 'stamina spent — walking to water ' + w.d.toFixed(0) + 'm' }); } }
          bot.goalOverride = bot.drinkGoal;
          bot.drinkGoal.d = Math.hypot(bot.drinkGoal.x - wolf.pos.x, bot.drinkGoal.z - wolf.pos.z);
          bot.goalText = '💧 heading to water ' + bot.drinkGoal.d.toFixed(0) + 'm';
        } else if (wolf.stamina > 60) bot.drinking = false;   // no water found — rest instead
      } else if (wolf.stamina >= 88) bot.drinking = false;

      /* ---------- 3.5 a hunter is close: yield ground, live to hunt again ---------- */
      if (pred.a && pred.d < 26 && !bot.drinking && bossHit.d > 90) {
        const away = Math.atan2(wolf.pos.x - pred.a.pos.x, wolf.pos.z - pred.a.pos.z) + (bot.giveSide || 0);
        aim(away, 0.55);
        keys.KeyW = true; keys.ShiftLeft = pred.d < 14 && wolf.stamina > 30 && !wolf.exhausted;
        wolf.crouch = false;
        bot.goalText = '↔️ giving way to a ' + (pred.a.sp ? pred.a.sp.label : 'hunter') + ' (' + pred.d.toFixed(0) + 'm)';
        if (!bot.giveSide || Math.random() < 0.02) bot.giveSide = (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
        applyAim(); return;
      }

      /* ---------- 4. pick the objective ---------- */

      let q = null, goal = bot.goalOverride || null, targetAnimal = null, targetPk = null, mode = goal ? 'drink' : 'wander', bestD = 1e9;
      if (!bot.goalOverride) for (const cq of QUESTS.active) {
        if (cq.kind === 'hunt') {
          if (bot.noHuntUntil && SIMNOW() < bot.noHuntUntil) { const t3 = bot.travelToBiome(cq.biome); if (t3 && bestD === 1e9) { bestD = t3.d + 200; q = cq; goal = t3; mode = 'travel'; } continue; }
          // commitment: keep the same quarry 30 s — no flapping between prey and wander
          if (bot.huntStick && SIMNOW() - (bot.huntStick.at || 0) < 30000) {
            const a2 = bot.huntStick.a;
            if (a2 && !a2.dead) {
              const d2 = Math.hypot(a2.pos.x - wolf.pos.x, a2.pos.z - wolf.pos.z);
              if (d2 < bestD + 80) { bestD = d2; q = cq; goal = { x: a2.pos.x, z: a2.pos.z }; targetAnimal = a2; mode = 'hunt'; }
            } else bot.huntStick = null;
          } else if (bot.huntStick) {   // 30 s on one quarry — did the chase actually close?
            const a2 = bot.huntStick.a, d0 = bot.huntStick.d0 || 1e9;
            if (a2 && !a2.dead) {
              const d2 = Math.hypot(a2.pos.x - wolf.pos.x, a2.pos.z - wolf.pos.z);
              if (d2 > Math.min(d0 * 0.8, d0 - 15) && d2 > 25) {   // barely gained ground — a real wolf gives this one up
                bot.huntFails = (bot.huntFails || 0) + 1;
                log('chase-giveup', { sp: cq.species, d: +d2.toFixed(0), msg: 'chase not closing — letting the herd go (' + bot.huntFails + ')' });
                bot.noHuntUntil = SIMNOW() + 20000;
                bot.preyShun = { label: a2.sp.label, until: SIMNOW() + 45000 };
                if (bot.huntFails >= 3) { bot.huntFails = 0; log('abandon-unfruitful', { title: cq.title, msg: 'the quarry will not be caught today — setting the deed aside' }); bot.shunned.add(cq.title); abandonQuest(cq.id); }
                bot.huntStick = null;
              } else bot.huntStick = null;
            } else bot.huntStick = null;
          }
          const ref = SPECIES[cq.species];
          const inBiome = a => a.sp === ref || (ref && a.sp.label === ref.label);   // + deer counts only in the deed's land
          const all = nearestAnimal(inBiome);
          let hit = all, deerTravel = false;
          if (all.a && cq.species === 'deer' && dominantBiomeAt(all.a.pos.x, all.a.pos.z).key !== cq.biome) {
            const inB = nearestAnimal(a => inBiome(a) && dominantBiomeAt(a.pos.x, a.pos.z).key === cq.biome);
            if (inB.a && inB.d < all.d + 250) hit = inB;   // a bit farther, but it counts
            else deerTravel = true;                        // none here — the herd lives in the deed's land
          }
          if (deerTravel) {   // deer deeds are biome-locked: go to the land where they count
            const t2 = bot.travelToBiome(cq.biome);
            if (t2 && (bestD === 1e9 || t2.d + 120 < bestD)) { bestD = t2.d + 120; q = cq; goal = t2; mode = 'travel'; }
          }
          else if (hit.a && hit.d < bestD) { bestD = hit.d; q = cq; goal = { x: hit.a.pos.x, z: hit.a.pos.z }; targetAnimal = hit.a; mode = 'hunt'; bot.huntStick = { a: hit.a, at: SIMNOW(), d0: hit.d }; }
          else if (!hit.a) {
            const t2 = bot.travelToBiome(cq.biome);
            if (t2 && (bestD === 1e9 || t2.d + 120 < bestD)) { bestD = t2.d + 120; q = cq; goal = t2; mode = 'travel'; }
          }
        } else if (cq.kind === 'collect') {
          // pick the nearest REACHABLE pickup — some lie across water or behind cliffs
          if (!bot.pkBlack) bot.pkBlack = new Set();
          if (bot.pkBlack.size > 40) bot.pkBlack.clear();
          let hit = null;
          if (bot.gatherStick && SIMNOW() - (bot.gatherStick.at || 0) < 40000) {
            const p = bot.gatherStick.p, def2 = PICKUP_DEF[p.type];
            if (p && !p.gathered && def2 && def2.inv === cq.item && !bot.pkBlack.has(p)) hit = { p, d: Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z) };
            else bot.gatherStick = null;
          }
          if (!hit) {
            let cands = [];
            for (const [, ch2] of chunks) for (const p of ch2.pickups) {
              if (p.gathered || bot.pkBlack.has(p)) continue;
              const def2 = PICKUP_DEF[p.type];
              if (!def2 || def2.inv !== cq.item) continue;
              const d = Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z);
              if (d < 240) cands.push({ p, d });
            }
            cands.sort((x, y) => x.d - y.d);
            const predNear = (px, pz, rr) => { for (const [, ch] of chunks) for (const pr of ch.predators) if (!pr.dead && Math.hypot(pr.pos.x - px, pr.pos.z - pz) < rr) return true; return false; };
            cands = cands.filter(c3 => !predNear(c3.p.x, c3.p.z, 60));   // never feed beside a bear — that tug-of-war is the circling spectators hate
            if (!cands.length) cands = cands.slice ? [] : [];
            for (const c2 of cands.slice(0, 5)) {   // nearest 5: first that isn't across deep water
              let blocked = false;
              for (let k2 = 1; k2 <= 3; k2++) {
                const mx = wolf.pos.x + (c2.p.x - wolf.pos.x) * k2 / 4, mz = wolf.pos.z + (c2.p.z - wolf.pos.z) * k2 / 4;
                if (heightAt(mx, mz) < waterYNow() - 0.35) { blocked = true; break; }
              }
              if (!blocked || c2.d < 25) { hit = c2; break; }
            }
          }
          if (hit) bot.gatherStick = { p: hit.p, at: SIMNOW() };
          if (hit.p && hit.d < bestD) { bestD = hit.d; q = cq; goal = { x: hit.p.x, z: hit.p.z }; targetPk = hit.p; mode = 'gather'; }
          else if (!hit.p) warnOnce('nopickup', 'bug-no-pickup-nearby', { key: cq.item, msg: 'collect quest but no ' + cq.item + ' pickups nearby' });
        } else if (cq.kind === 'explore') {
          let best = null, bd2 = 1e9;
          // commit to one landmark per deed (like huntStick) — flipping targets every tick IS the circling spectators see
          if (bot.lmStick && (bot.lmStick.qid !== cq.id || bot.lmStick.lm.found || SIMNOW() - bot.lmStick.at > 45000)) bot.lmStick = null;
          // only an UNFOUND landmark of the type advances the deed — a found one is a dead stop
          let unfound = [];
          for (const lm of landmarkList) {
            if (cq.lmType && lm.type !== cq.lmType) continue;
            if (!lm.found) unfound.push(lm);
          }
          if (bot.lmStick) { best = bot.lmStick.lm; bd2 = Math.hypot(best.x - wolf.pos.x, best.z - wolf.pos.z); }
          else {
            const pool2 = unfound.length ? unfound : landmarkList.filter(lm => !cq.lmType || lm.type === cq.lmType);
            pool2.sort((a2, b2) => Math.hypot(a2.x - wolf.pos.x, a2.z - wolf.pos.z) - Math.hypot(b2.x - wolf.pos.x, b2.z - wolf.pos.z));
            let lmBlocked = pool2.length > 0;
            for (const lm of pool2.slice(0, 4)) {   // nearest reachable unfound landmark — not one across a fjord
              const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
              let blocked = false;
              if (d > 60) for (let k2 = 1; k2 <= 3; k2++) {
                const mx = wolf.pos.x + (lm.x - wolf.pos.x) * k2 / 4, mz = wolf.pos.z + (lm.z - wolf.pos.z) * k2 / 4;
                if (heightAt(mx, mz) < waterYNow() - 0.35) { blocked = true; break; }
              }
              if (!blocked) { bd2 = d; best = lm; lmBlocked = false; bot.lmStick = { qid: cq.id, lm, at: SIMNOW() }; break; }
            }
            if (lmBlocked) warnOnce('lmw' + ((SIMNOW() / 600000) | 0), 'bug-landmark-across-water', { key: (pool2[0] || {}).type, msg: '4 nearest unfound landmarks all across deep water — quest gen offers unreachable sites' });
          }
          if (best && bd2 < bestD + 60) { bestD = bd2; q = cq; goal = { x: best.x, z: best.z }; mode = 'explore';
            if (bd2 < 8 && !best.found) warnOnce('exp' + best.type + ((best.x / 50) | 0), 'bug-explore-no-discover', { key: best.type, msg: 'standing at landmark (' + bd2.toFixed(1) + 'm) but never discovered' });
          } else if (!best && !cq.peak) {
            warnOnce('nolm', 'bug-no-landmark', { key: cq.lmType || 'peak', msg: 'explore quest but no such landmark exists anywhere' });
            log('abandon-impossible', { title: cq.title, msg: 'no ' + (cq.lmType || 'landmark') + ' left to discover — setting the deed aside now' });
            bot.shunned.add(cq.title); abandonQuest(cq.id);
          }
        } else if (cq.kind === 'rival' && cq.rival) {
          const hit = nearestRival();
          if (hit.a && frac > 0.75 && hit.d < 160) { bestD = Math.max(0, hit.d - 120); q = cq; goal = { x: hit.a.pos.x, z: hit.a.pos.z }; targetAnimal = hit.a; mode = 'rival'; }   // the pack answers — finish the deed
        }
      }
      // boss pilgrimage: a legend is awake & unslain and I'm strong enough → walk its land
      if (!bot.goalOverride && !targetAnimal && !targetPk && (mode === 'wander' || mode === 'travel') && frac > 0.75 && wolf.level >= 3) {
        for (const k in BOSSES) {
          const d = BOSSES[k];
          if (d.awake && !d.slain && !d.live && k !== curBiomeKey) {
            const t = bot.travelToBiome(k);
            if (t && (mode === 'wander' || t.d + 80 < bestD)) { bestD = t.d + 80; q = null; goal = t; mode = 'travel'; bot.bossPilgrim = d.name; }
          }
        }
        if (mode === 'travel' && bot.bossPilgrim) bot.goalText = 'pilgrim → ' + bot.bossPilgrim;
      }
      // idle: hunt easy XP like a wolf between deeds
      if (!bot.goalOverride && (mode === 'wander' || (mode === 'travel' && !q && !bot.bossPilgrim && bestD > 420))) {
        const shunOk = (!bot.preyShun || SIMNOW() > (bot.preyShun.until || 0)) && (!bot.noHuntUntil || SIMNOW() > bot.noHuntUntil);
        const easy = (SIMNOW() - (bot.wanderT || 0) > 6000 && !bot.trek && shunOk)
          ? nearestAnimal(a => (a.sp.hp || 1) <= 2 && (!a.asleep || true) && !(bot.preyShun && a.sp.label === bot.preyShun.label)) : {};
        if (easy.a && easy.d < 70) { goal = { x: easy.a.pos.x, z: easy.a.pos.z }; targetAnimal = easy.a; mode = 'hunt'; q = null; }
      }
      if (bot.trek) {
        if (SIMNOW() > bot.trek.until || Math.hypot(bot.trek.x - wolf.pos.x, bot.trek.z - wolf.pos.z) < 10) bot.trek = null;
        else { goal = { x: bot.trek.x, z: bot.trek.z }; mode = 'travel'; }
      }
      if (!goal) {
        // empty lands: if nothing huntable is near, strike out for richer ground
        const anyPrey = nearestAnimal(a => (a.sp.hp || 1) <= 3);
        if (anyPrey.d > 140) {
          bot.noPreyNearT = (bot.noPreyNearT || 0) + 0.15;
          if (bot.noPreyNearT > 45) {
            const rich = bot.travelToBiome(['forest', 'grove', 'meadow', 'taiga'].find(b => b !== curBiomeKey) || 'forest');
            if (rich) { bot.wander = { x: rich.x, z: rich.z }; log('travel-rich', { msg: 'empty land — striking out for richer hunting grounds' }); }
            bot.noPreyNearT = 0;
          }
        } else bot.noPreyNearT = 0;
        if (!bot.wander || Math.hypot(bot.wander.x - wolf.pos.x, bot.wander.z - wolf.pos.z) < 8) {
          const base = bot.lastYaw === undefined ? Math.random() * 6.28 : bot.lastYaw;
          const longTrek = Math.random() < 0.25;
          let pt = null;
          for (let tries = 0; tries < 4 && !pt; tries++) {
            const a = base + (Math.random() - 0.5) * (longTrek ? 1.2 : 2.6);   // forward-biased arc — travel, not Brownian motion
            const r = longTrek ? 240 + Math.random() * 120 : 80 + Math.random() * 80;
            const c = { x: wolf.pos.x + Math.sin(a) * r, z: wolf.pos.z + Math.cos(a) * r };
            if (bot.wanderHist.every(w => Math.hypot(w.x - c.x, w.z - c.z) > 70)) pt = c;
          }
          if (!pt) pt = { x: wolf.pos.x + Math.sin(base + Math.PI) * 150, z: wolf.pos.z + Math.cos(base + Math.PI) * 150 };
          bot.wanderHist.push(pt); if (bot.wanderHist.length > 6) bot.wanderHist.shift();
          bot.wander = pt; bot.wanderT = SIMNOW();
        }
        goal = bot.wander;
      }
      bot.goalOverride = null;

      /* ---------- 4.5 loop breaker: circles live ACROSS goals, not inside one ---------- */
      const P = bot.pathWin, nowS = SIMNOW();
      const dg0 = goal ? Math.hypot(goal.x - wolf.pos.x, goal.z - wolf.pos.z) : 0;
      const huntingNow = targetAnimal && (mode === 'hunt' || mode === 'rival');
      if (huntingNow) P.length = 0;   // stalk curves would poison the window — only measure deliberate travel
      if (!P.length || nowS - P[P.length - 1].t > 2000) {   // sample every ~2 game-s (not every think-tick)
        const pv = P.length ? P[P.length - 1] : null;
        const mv = pv ? Math.hypot(wolf.pos.x - pv.x, wolf.pos.z - pv.z) : 0;
        P.push({ t: nowS, x: wolf.pos.x, z: wolf.pos.z, od: wolf.distance, br: (mv > 0.6 ? Math.atan2(wolf.pos.x - pv.x, wolf.pos.z - pv.z) : (pv ? pv.br : 0)) });
        while (P.length && nowS - P[0].t > 50000) P.shift();
      }
      if (nowS - (bot.loopEpoch || 0) > 300000) { bot.loopEpoch = nowS; bot.loopN = 0; }
      const huntingFresh = targetAnimal && (mode === 'hunt' || mode === 'rival') && (nowS - ((bot.huntStick && bot.huntStick.at) || 0) < 25000);   // stalking curves are natural — not loops
      if (P.length > 6 && !huntingFresh && !bot.drinking && (mode === 'wander' || mode === 'travel' || dg0 > 60) && nowS - (bot.loopCd || 0) > 90000) {
        const o = P[0], odGain = wolf.distance - o.od, net = Math.hypot(wolf.pos.x - o.x, wolf.pos.z - o.z);
        let wind = 0;
        for (let i = 2; i < P.length; i++) { const d1 = P[i - 1].br - P[i - 2].br, d2 = P[i].br - P[i - 1].br; if (d1 !== 0 && d2 !== 0 && Math.sign(d1) === Math.sign(d2)) wind += Math.abs(P[i].br - P[i - 2].br) * 0.5; }
        const eff = odGain > 1 ? net / odGain : 1;
        bot.pathEff = +eff.toFixed(2);
        if ((odGain > 70 && eff < 0.22) || (odGain > 60 && wind > 14 && eff < 0.45)) {   // true circles only — weaving through trees is not a loop
          bot.loopN++; bot.loopCd = nowS;
          log('loop-break', { eff: +eff.toFixed(2), net: +net.toFixed(0), od: +odGain.toFixed(0), wind: +wind.toFixed(1), was: bot.goalText, msg: 'broke a circling loop — striking out on a fresh bearing' });
          if (bot.loopN >= 3) warnOnce('loop' + ((bot.loopEpoch / 300000) | 0), 'bug-bot-loop', { key: bot.goalKey, msg: '3+ loops inside 5 min — movement degenerated (eff ' + eff.toFixed(2) + ')' });
          if (targetAnimal) { bot.preyShun = { label: targetAnimal.sp.label, until: nowS + 45000 }; bot.huntStick = null; }
          if (targetPk && bot.pkBlack) bot.pkBlack.add(targetPk);
          const away = (bot.lastYaw === undefined ? Math.random() * 6.28 : bot.lastYaw + Math.PI + (Math.random() - 0.5) * 1.2);
          bot.wander = null; bot.trek = null;
          bot.trek = { x: wolf.pos.x + Math.sin(away) * 140, z: wolf.pos.z + Math.cos(away) * 140, until: nowS + 28000 };
          P.length = 0;   // fresh window
        }
      }

      /* ---------- 5. stalk tactics for prey ---------- */
      let stalk = false;
      if (targetAnimal && mode === 'hunt') {
        const an = targetAnimal, d = Math.hypot(an.pos.x - wolf.pos.x, an.pos.z - wolf.pos.z);
        const aware = an.aware || 0;
        // stalk only inside real danger of being noticed: crouch-walk is half speed, prey out-walk it otherwise
        const detect = (an.sp.detect || 12) * (wolf.crouch ? 0.5 : 1);
        stalk = d > 6 && d < Math.max(22, detect + 14) && aware < 0.5;
        if (!bot.stalkT0 || SIMNOW() - bot.stalkT0 > 6000) { bot.stalkT0 = SIMNOW(); bot.stalkD0 = d; }
        if (stalk && d > bot.stalkD0 + 6) {   // prey out-trots the crouch-walk — a real player commits or lets go
          if (wolf.stamina > 35) { stalk = false; log('stalk-broken', { msg: 'quarry escaping — breaking cover to run it down' }); }
          else { bot.preyShun = { label: an.sp.label, until: SIMNOW() + 40000 }; bot.huntStick = null; log('stalk-giveup', { msg: 'too winded to close — letting this one go' }); }
          bot.stalkT0 = 0;
        }
        if (stalk) {
          const ay = an.heading || 0;
          goal = { x: an.pos.x - Math.sin(ay) * 2.0, z: an.pos.z - Math.cos(ay) * 2.0 };   // come from its blind side
        }
        // blind hunter: sniff the wind
        if (d > 150) { bot.noPreyT += 0.15; if (bot.noPreyT > 6 && wolf.senseCd <= 0) { wolf.wolfSense(); bot.noPreyT = 0; log('sense', { msg: 'wolf sense — searching for the quarry' }); } }
        else bot.noPreyT = 0;
      }
      const wantCrouch = stalk || (mode === 'rival' && targetAnimal && Math.hypot(targetAnimal.pos.x - wolf.pos.x, targetAnimal.pos.z - wolf.pos.z) > 14);
      wolf.crouch = !!wantCrouch;

      /* ---------- 6. movement executor (proven v6 core) ---------- */
      bot.goalKey = ((goal.x / 20) | 0) + ',' + ((goal.z / 20) | 0);
      let steer = goal;
      if (bot.detourT && SIMNOW() - bot.detourT < (bot.detourPos && bot.detourPos.wide ? 25000 : 4000)) steer = bot.detourPos;
      else if (bot.detourT) { bot.detourT = 0; bot.goalStuck = Math.max(0, bot.goalStuck - 1); }
      bot.nearSolids = [];
      for (const [, ch] of chunks) for (const sol of (ch.solids || [])) {
        const dd = Math.hypot(sol.x - wolf.pos.x, sol.z - wolf.pos.z);
        if (dd < 16) bot.nearSolids.push(sol);
      }
      const probe = (yaw, dist) => {
        let worst = 0;
        const sx2 = Math.sin(yaw), sz2 = Math.cos(yaw);
        const step2 = 1.8;
        for (let t = 2; t <= dist; t += step2) {
          const px = wolf.pos.x + sx2 * t, pz = wolf.pos.z + sz2 * t;
          const gh = heightAt(px, pz);
          if (gh - wolf.pos.y > 1.8) worst = Math.max(worst, 3.4 - t * 0.22);
          if (gh < waterYNow() - 0.45) worst = Math.max(worst, 2.6 - t * 0.16);
          for (const sol of bot.nearSolids)
            if (Math.hypot(sol.x - px, sol.z - pz) < sol.r + 1.0) { worst = Math.max(worst, 3.6 - t * 0.22); break; }
          if (worst > 2.8) break;
        }
        return worst;
      };
      const desired = Math.atan2(steer.x - wolf.pos.x, steer.z - wolf.pos.z);
      let pinfo = null;
      const fear = wolf.level < 3 ? 68 : 55;
      const fearOf = (px, pz) => { const d = Math.hypot(px - wolf.pos.x, pz - wolf.pos.z); if (d < fear && (!pinfo || d < pinfo.d)) pinfo = { d, yaw: Math.atan2(px - wolf.pos.x, pz - wolf.pos.z) }; };
      for (const [, ch] of chunks) for (const pr of ch.predators) if (!pr.dead) fearOf(pr.pos.x, pr.pos.z);
      for (const rv of rivals) if (!rv.dead && ((rv.pack && rv.pack.stance === 'attack') || Math.hypot(rv.pos.x - wolf.pos.x, rv.pos.z - wolf.pos.z) < 24)) fearOf(rv.pos.x, rv.pos.z);
      let bestYaw = desired, bestScore = 1e9;
      const look = keys.ShiftLeft ? 15 : 11;   // sprint needs runway — crashing into trunks costs 4 HP a hit
      for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1]) {
        let sc = probe(desired + off, look) + Math.abs(off) * 0.22 + (bot.lastYaw === undefined ? 0 : Math.abs(wrapPI(desired + off - bot.lastYaw)) * 0.18);
        if (pinfo && Math.abs(wrapPI(desired + off - pinfo.yaw)) < 0.7) sc += (fear - pinfo.d) * 0.11 * (wolf.level < 3 ? 2.2 : 1.2);
        if (sc < bestScore) { bestScore = sc; bestYaw = desired + off; }
      }
      bot.avoiding = probe(desired, look) > 0.3;
      aim(bestYaw, 0.45);
      bot.lastYaw = bestYaw;
      const dg = Math.hypot(goal.x - wolf.pos.x, goal.z - wolf.pos.z);
      keys.KeyW = dg > 2.2;
      keys.KeyS = keys.KeyA = keys.KeyD = false;
      const closeSprint = targetAnimal && (dg < 34 || (mode === 'hunt' && dg < 90));
      keys.ShiftLeft = !stalk && ((dg > 35 && wolf.stamina > 55 && !bot.drinking) || (closeSprint && wolf.stamina > 12)) && !wolf.exhausted;   // travel keeps a reserve — no more lap-tether to the water hole
      bot.jumpCd = Math.max(0, (bot.jumpCd || 0) - 0.15);
      const ax = wolf.pos.x + Math.sin(bestYaw) * 1.7, az = wolf.pos.z + Math.cos(bestYaw) * 1.7;
      const lip = heightAt(ax, az) - wolf.pos.y;
      if (bot.jumpCd <= 0 && wolf.grounded && keys.KeyW && (probe(bestYaw, 3.6) > 0.6 || (lip > 1.35 && lip < 2.4))) {
        bot.jumpCd = 1.3; bot.jumpT = SIMNOW();
        if (probe(bestYaw, 3.6) > 0.6) log('jump', { msg: 'hopped an obstacle' });
      }
      keys.Space = bot.jumpT && SIMNOW() - bot.jumpT < 170;

      /* ---------- 7. strike (prey & rivals) ---------- */
      if (targetAnimal && mode !== 'rival') {
        const d = Math.hypot(targetAnimal.pos.x - wolf.pos.x, targetAnimal.pos.z - wolf.pos.z);
        if (d < 3.2 + (targetAnimal.sp.scale || 1) * 0.7) {
          keys.KeyW = false;
          aim(Math.atan2(targetAnimal.pos.x - wolf.pos.x, targetAnimal.pos.z - wolf.pos.z), 0.85);   // face the bite
          if (SIMNOW() - bot.lastAtk > 650) {
            bot.lastAtk = SIMNOW();
            const hpB = targetAnimal.hp, wasAware = (targetAnimal.aware || 0) >= 0.25;
            const ty = targetAnimal.heading || 0;
            const behind = (Math.sin(ty) * (wolf.pos.x - targetAnimal.pos.x) + Math.cos(ty) * (wolf.pos.z - targetAnimal.pos.z)) / (d || 1) < -0.35;
            wolf.attack();
            if (behind && !wasAware) log('ambush', { msg: 'AMBUSH — killing bite from the blind side' });
            setTimeout(() => {
              if (targetAnimal.dead) { bot.pauseUntil = SIMNOW() + 2200; bot.pauseWhy = 'savoring the catch'; log('kill', { sp: q ? (q.species || q.kind) : 'xp-hunt', msg: 'caught ' + (q && q.species ? q.species : (targetAnimal.sp.label || 'prey')) + (q ? ' → quest ' + q.have + '/' + q.need : ' · xp hunt') + ' · meat ' + inv.meat }); }
              else if (targetAnimal.hp === hpB) warnOnce('miss' + SIMNOW() | 0, 'bug-bite-no-effect', { key: (q && q.species) || '?', msg: 'bite in reach did nothing (hp ' + hpB + ', dist ' + d.toFixed(1) + ')' });
            }, 350);
          }
        }
      }
      // rivals: cautious trading — bite when its swing is down, then step out
      if (targetAnimal && mode === 'rival') {
        const d = Math.hypot(targetAnimal.pos.x - wolf.pos.x, targetAnimal.pos.z - wolf.pos.z);
        const r = targetAnimal;
        if (d < 3.6) {
          keys.KeyW = false;
          aim(Math.atan2(r.pos.x - wolf.pos.x, r.pos.z - wolf.pos.z), 0.85);
          if ((r.atkCd === undefined || r.atkCd > 0.5) && SIMNOW() - bot.lastAtk > 700) { bot.lastAtk = SIMNOW(); wolf.attack(); }
        } else if (d < 6 && keys.KeyW && !(r.flinchT > 0)) keys.KeyW = false;   // don't bowl into its jaws
      }
      // gather in reach
      if (targetPk && dg < 2.4) {
        keys.KeyW = false;
        if (SIMNOW() - bot.lastGather > 900) {
          bot.lastGather = SIMNOW();
          const before = invSum();
          doGather();
          setTimeout(() => {
            if (invSum() > before) { bot.gatherMisses = 0; log('gather', { msg: 'picked up ' + q.item }); }
            else if (++bot.gatherMisses >= 3) { bot.gatherMisses = 0; warnOnce('gmiss' + (SIMNOW() | 0), 'bug-gather-no-effect', { key: q.item, msg: 'gather at pickup did nothing' }); }
          }, 300);
        }
      }
      bot.goalText = (bot.pauseUntil > SIMNOW() && !pinfo) ? '🐾 ' + (bot.pauseWhy || 'pausing') + '…' : mode + ' → ' + dg.toFixed(0) + 'm' + (q ? ' (' + q.have + '/' + q.need + ')' : '') + (stalk ? ' 🐾stalking' : '');
      const tgtKey = targetAnimal ? (targetAnimal.sp.label || '?') + '@' + ((targetAnimal.pos.x / 30) | 0) + ',' + ((targetAnimal.pos.z / 30) | 0) : mode;
      if (tgtKey !== bot.lastTgtKey) { bot.lastTgtKey = tgtKey; log('goal', { msg: bot.goalText }); }
      if (SIMNOW() - (bot.goalLogT || 0) > 10000) { bot.goalLogT = SIMNOW(); log('goal', { msg: bot.goalText + ' · hp ' + wolf.hp.toFixed(0) + ' · stam ' + wolf.stamina.toFixed(0) }); }

      /* ---------- 7.5 goal-grind: moving but not ARRIVING (bowl/cliff traps) ---------- */
      if (dg > 3) {
        if (bot.grindKey !== bot.goalKey) { bot.grindKey = bot.goalKey; bot.grindD0 = dg; bot.grindT0 = SIMNOW(); bot.grindN = 0; }
        else if (SIMNOW() - bot.grindT0 > 45000) {
          if (bot.grindD0 - dg < Math.max(3, bot.grindD0 * 0.25)) {   // 45 s spent, barely closer — flank (works at any range)
            bot.grindN = (bot.grindN || 0) + 1;
            const gy = Math.atan2(goal.x - wolf.pos.x, goal.z - wolf.pos.z) + (bot.grindN % 2 ? 1 : -1) * 1.5;
            bot.detourPos = { x: wolf.pos.x + Math.sin(gy) * 55, z: wolf.pos.z + Math.cos(gy) * 55, wide: true };
            bot.detourT = SIMNOW();
            log('detour-wide', { msg: 'terrain trap — flanking 55m to approach from another side (' + bot.grindN + ')' });
            if (targetPk && bot.pkBlack) { bot.pkBlack.add(targetPk); bot.gatherStick = null; log('pickup-skip', { msg: 'pickup unreachable — trying another' }); }
            if (bot.grindN >= 3 && q && (q.kind === 'explore' || q.kind === 'hunt')) {
              log('abandon-unreachable', { title: q.title, msg: 'ground would not give — setting the deed aside' });
              bot.shunned.add(q.title); abandonQuest(q.id); bot.grindKey = '';
            }
            if (bot.grindN >= 6) {   // hard trap: even flanks fail — break out anywhere and flag the spot
              log('bug-bot-hardtrap', { x: +wolf.pos.x.toFixed(0), z: +wolf.pos.z.toFixed(0), biome: curBiomeKey, goal: bot.goalKey, msg: 'trapped 4.5+ min despite flanking — wedge-escape insufficient here' });
              const ra = Math.random() * 6.28;
              bot.detourPos = { x: wolf.pos.x + Math.sin(ra) * 220, z: wolf.pos.z + Math.cos(ra) * 220, wide: true };
              bot.detourT = SIMNOW();
              bot.grindN = 0; bot.grindKey = '';
            }
          }
          bot.grindD0 = dg; bot.grindT0 = SIMNOW();
        }
      } else bot.grindKey = bot.goalKey;

      /* ---------- 8. anti-stuck (game-odometer based) ---------- */
      const moving = keys.KeyW && dg > 6;
      if (moving) {
        if (!bot.stuckPos) bot.stuckPos = { x: wolf.pos.x, z: wolf.pos.z, t: SIMNOW(), od: wolf.distance };
        else if (SIMNOW() - bot.stuckPos.t > 12000) {
          if (wolf.distance - (bot.stuckPos.od || 0) < 4) {
            log('stuck', { x: +wolf.pos.x.toFixed(0), z: +wolf.pos.z.toFixed(0), biome: curBiomeKey, goal: bot.goalKey, msg: 'wanted to move, went nowhere for 9s' });
            bot.unstickT = SIMNOW();
            bot.stuckPos = null;
            if (bot.goalStuck >= 1 && bot.goalKey) {
              const side = Math.random() < 0.5 ? 1 : -1;
              const gy = Math.atan2(goal.x - wolf.pos.x, goal.z - wolf.pos.z) + side * 1.35;
              bot.detourPos = { x: wolf.pos.x + Math.sin(gy) * 26, z: wolf.pos.z + Math.cos(gy) * 26 };
              bot.detourT = SIMNOW();
              log('detour', { msg: 'routing around obstacle' });
            } else bot.goalStuck++;
          } else bot.stuckPos = { x: wolf.pos.x, z: wolf.pos.z, t: SIMNOW(), od: wolf.distance };
        }
      } else bot.stuckPos = null;
      if (bot.unstickT && SIMNOW() - bot.unstickT < 1200) { keys.Space = true; keys.KeyA = ((SIMNOW() / 200) | 0) % 2 === 0; }

      /* ---------- 9. flavour: the wolf's voice ---------- */
      bot.howlT -= 0.15;
      if (bot.howlT <= 0) { bot.howlT = 90 + Math.random() * 90; wolf.howl(); }

      /* ---------- 10. quest stall detector (bug-hunt) ---------- */
      const q0 = QUESTS.active[0];
      if (q0) {
        if (bot.stallQ !== q0.id) { bot.stallQ = q0.id; bot.stallHave = q0.have; bot.stallT = SIMNOW(); }
        else if (q0.have > bot.stallHave) { bot.stallHave = q0.have; bot.stallT = SIMNOW(); }
        else if (SIMNOW() - bot.stallT > 240000) {
          warnOnce('stall' + q0.id + q0.have, 'bug-quest-stalled', { key: q0.title, msg: 'no progress in 4 min: ' + q0.title + ' stuck at ' + q0.have + '/' + q0.need });
          if (q0.kind === 'hunt' || q0.kind === 'rival' || q0.kind === 'explore' || q0.kind === 'collect') { log('abandon-stalled', { title: q0.title, msg: 'setting aside an impossible deed' }); bot.shunned.add(q0.title); abandonQuest(q0.id); }
          bot.stallT = SIMNOW();
        }
      }
      applyAim();
    } catch (e) { log('bot-error', { msg: String(e && e.message).slice(0, 140) }); }
  }, Math.max(40, Math.round(150 / (window.BOT_SPEED || 1))));
  }   // ---- end bootAI ----

  /* ---------------- the in-game 🤖 toggle (shipped feature) ---------------- */
  let aiOn = false;
  const aiBtn = document.getElementById('btnAI');
  const releaseControl = () => {
    try {
      keys.KeyW = keys.KeyS = keys.KeyA = keys.KeyD = false;
      keys.ShiftLeft = false; keys.Space = false;
      wolf.crouch = false;
    } catch (e) { }
  };
  const setAI = on => {
    if (on === aiOn) return;
    aiOn = on;
    window.BOT_OFF = !on;
    if (on) {
      bootAI();
      document.body.classList.add('aiOn');
      if (aiBtn) aiBtn.classList.add('on');
      toast('🤖 The wolf plays itself now — sit back and watch the story unfold (⏸ takes back control)', true);
      audio.uiClick();
    } else {
      releaseControl();
      document.body.classList.remove('aiOn');
      if (aiBtn) aiBtn.classList.remove('on');
      toast('🐾 You have the wolf again');
      audio.uiClick();
    }
  };
  window.AI_PLAY = setAI;              // public API: AI_PLAY(true) / AI_PLAY(false)
  window.AI_ON = () => aiOn;
  if (aiBtn) aiBtn.addEventListener('click', () => setAI(!aiOn));
  const menuBtn = document.getElementById('btnMenuAI');
  if (menuBtn) menuBtn.addEventListener('click', () => setAI(true));   // the menu's front door
  if (URL_ON) setAI(true);
  // the corner 🤖 belongs to the game screen — at the menu, the menu entry is the front door
  if (aiBtn) setInterval(() => { try { aiBtn.style.display = (state === 'play' || aiOn) ? '' : 'none'; } catch (e) { } }, 500);
})();
