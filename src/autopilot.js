/* ============ BUG-HUNT AUTOPILOT (special build only — not shipped) ============
   Plays the game like a human: takes quests, hunts, gathers, explores, levels.
   Logs everything for bug analysis. Enable with ?autopilot=1 */
(function () {
  if (!/[?&]autopilot=1/.test(location.search)) return;
  const L = (window.BOTLOG = []);
  const t0 = performance.now();
  const log = (type, data) => {
    const e = Object.assign({ t: +((performance.now() - t0) / 1000).toFixed(1), type }, data || {});
    L.push(e);
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

  let frames = 0;
  const cnt = () => { frames++; requestAnimationFrame(cnt); };
  requestAnimationFrame(cnt);
  setInterval(() => {
    try {
      let animals = 0, predators = 0;
      for (const [, ch] of chunks) { animals += ch.animals.length; predators += ch.predators.length; }
      log('sample', {
        fps: +(frames / 2).toFixed(0), frames: 0, chunks: chunks.size, lms: landmarkList.length, animals, predators,
        x: +wolf.pos.x.toFixed(1), y: +wolf.pos.y.toFixed(1), z: +wolf.pos.z.toFixed(1),
        hp: +wolf.hp.toFixed(1), stam: +wolf.stamina.toFixed(0), lvl: wolf.level, xp: wolf.xp | 0,
        biome: curBiomeKey, weather: weather.label || '', time: (typeof tDay !== 'undefined' ? tDay.toFixed(2) : ''),
        act: QUESTS.active.length, av: QUESTS.avail.length, done: QUESTS.done.length,
        spiritMet: SPIRIT.met, bossesAwake: Object.values(BOSSES).filter(b => b.awake).length,
        nan: !Number.isFinite(wolf.pos.x + wolf.pos.y + wolf.pos.z + camPitch + camYaw + wolf.hp + wolf.stamina)
      });
      frames = 0;
    } catch (e) { log('sampler-error', { msg: String(e.message).slice(0, 120) }); }
  }, 2000);

  /* ---------------- live event panel (for humans watching) ---------------- */
  const panel = document.createElement('div');
  panel.id = 'botPanel';
  panel.style.cssText = 'position:fixed;top:230px;right:14px;z-index:70;width:250px;font:11px/1.45 ui-monospace,monospace;color:#dfeee6;background:rgba(8,14,22,.72);border:1px solid rgba(126,240,192,.35);border-radius:10px;padding:8px 10px;pointer-events:none;white-space:pre-wrap';
  document.body.appendChild(panel);
  const badge = document.createElement('div');
  badge.textContent = '● LIVE — 🤖 AUTOPILOT BUG HUNT';
  badge.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:71;font:11px ui-monospace,monospace;color:#ffd0d0;background:rgba(60,8,8,.75);border:1px solid rgba(255,120,100,.5);border-radius:8px;padding:3px 10px;pointer-events:none';
  document.body.appendChild(badge);
  const feed = [];
  function botPanelPush(e) {
    const icons = { 'quest-acceptQuest': '📜', 'quest-completeQuest': '✅', 'quest-abandonQuest': '🗑️', 'level-up': '⭐', death: '💀', kill: '🩸', gather: '🌿', stuck: '🧱', 'error-banner': '🐞', 'page-error': '💥', discover: '🧭', boss: '💀', spirit: '👻' };
    if (!icons[e.type] && e.type !== 'objective') return;
    feed.unshift((e.t + 's ').padEnd(7) + (icons[e.type] || '') + ' ' + (e.msg || e.title || e.text || e.type));
    if (feed.length > 9) feed.pop();
  }
  setInterval(() => {
    const q = QUESTS.active[0];
    const obj = bot && bot.goalText ? bot.goalText : '…';
    panel.textContent = '🎯 ' + (q ? q.icon + ' ' + q.title + '  ' + q.have + '/' + q.need : 'no quest') + '\n➡️ ' + obj + '\n\n' + feed.join('\n');
  }, 600);

  /* ---------------- the player ---------------- */
  const bot = {
    goalText: 'waking up…', wander: null, lastAtk: 0, lastGather: 0, howlT: 60,
    gatherMisses: 0, lastInvSum: -1, stuckPos: null, stuckT: 0, unstickT: 0, detourT: 0, detourPos: null, goalKey: '', goalStuck: 0,
    deadSeen: false, warned: {}
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
  const invSum = () => inv.berry + inv.mushroom + inv.herb + inv.wood + inv.stone + inv.bone + inv.meat + inv.pelt;
  bot.travelToBiome = (biome, anyHigh) => {   // nearest sampled point of that land (or of any height, for peaks)
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

  setInterval(() => {
    try {
      if (typeof state === 'undefined' || state === 'boot') return;
      if (state === 'pause') { setState('play'); return; }
      if (state !== 'play') return;

      // death & respawn
      if (wolf.deadT > 0) {
        if (!bot.deadSeen) { bot.deadSeen = true; const np = nearestPred(); log('death', { hp: +wolf.hp.toFixed(1), predatorNear: np.d < 60 ? 'yes(' + np.d.toFixed(0) + 'm)' : 'no', msg: 'wolf fell' }); }
        return;
      }
      bot.deadSeen = false;

      // keep 2 quests active
      while (QUESTS.active.length < 2 && QUESTS.avail.length) acceptQuest(QUESTS.avail[0].id);

      // flee if badly hurt
      const pred = nearestPred();
      if (wolf.hp < 25 && pred.d < 40) {
        const yx = wolf.pos.x - pred.a.pos.x, yz = wolf.pos.z - pred.a.pos.z, m = Math.hypot(yx, yz) || 1;
        camYaw = Math.atan2(yx / m, yz / m);
        keys.KeyW = true; keys.ShiftLeft = wolf.stamina > 25; bot.goalText = 'fleeing a predator';
        return;
      }

 // pick the objective: the active quest with the closest reachable target (like a human would)
      let q = null, goal = null, targetAnimal = null, targetPk = null, mode = 'wander', bestD = 1e9;
      for (const cq of QUESTS.active) {
        if (cq.kind === 'hunt') {
          const ref = SPECIES[cq.species];
          const hit = nearestAnimal(a => a.sp === ref || (ref && a.sp.label === ref.label));   // sp is a copy — match by label too
          if (hit.a && hit.d < bestD) { bestD = hit.d; q = cq; goal = { x: hit.a.pos.x, z: hit.a.pos.z }; targetAnimal = hit.a; mode = 'hunt'; }
          else if (!hit.a) {
            // a journey: walk to the quarry's homeland
            const t2 = bot.travelToBiome(cq.biome);
            if (t2 && (bestD === 1e9 || t2.d + 120 < bestD)) { bestD = t2.d + 120; q = cq; goal = t2; mode = 'travel'; }
          }
        } else if (cq.kind === 'collect') {
          const hit = nearestPk(cq.item);
          if (hit.p && hit.d < bestD) { bestD = hit.d; q = cq; goal = { x: hit.p.x, z: hit.p.z }; targetPk = hit.p; mode = 'gather'; }
          else if (!hit.p) warnOnce('nopickup', 'bug-no-pickup-nearby', { key: cq.item, msg: 'collect quest but no ' + cq.item + ' pickups nearby' });
        } else if (cq.kind === 'explore') {
          let best = null, bd2 = 1e9;
          for (const lm of landmarkList) {
            if (cq.lmType && lm.type !== cq.lmType) continue;
            const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
            if (d < bd2) { bd2 = d; best = lm; }
          }
          if (best && bd2 < bestD + 60) { bestD = bd2; q = cq; goal = { x: best.x, z: best.z }; mode = 'explore';
            if (bd2 < 8 && !best.found) warnOnce('exp' + best.type + ((best.x / 50) | 0), 'bug-explore-no-discover', { key: best.type, msg: 'standing at landmark (' + bd2.toFixed(1) + 'm) but never discovered' });
          } else if (!best) warnOnce('nolm', 'bug-no-landmark', { key: cq.lmType || 'peak', msg: 'explore quest but no such landmark exists anywhere' });
          } else if (cq.kind === 'explore' && cq.peak) {
          const t3 = bot.travelToBiome('mountain', true);
          if (t3 && (bestD === 1e9 || t3.d + 150 < bestD)) { bestD = t3.d + 150; q = cq; goal = t3; mode = 'travel'; }
        } else if (cq.kind === 'rival' && cq.rival) {
          let best = null, bd2 = 1e9;
          for (const r of rivals) { if (r.dead) continue; const d = Math.hypot(r.pos.x - wolf.pos.x, r.pos.z - wolf.pos.z); if (d < bd2) { bd2 = d; best = r; } }
          if (best && bd2 < bestD) { bestD = bd2; q = cq; goal = { x: best.pos.x, z: best.pos.z }; targetAnimal = best; mode = 'rival'; }
        }
      }
      if (!goal) {
        if (!bot.wander || Math.hypot(bot.wander.x - wolf.pos.x, bot.wander.z - wolf.pos.z) < 8) {
          const a = Math.random() * 6.28, r = 70 + Math.random() * 80;
          bot.wander = { x: wolf.pos.x + Math.sin(a) * r, z: wolf.pos.z + Math.cos(a) * r };
        }
        goal = bot.wander;
      }
      bot.goalKey = ((goal.x / 20) | 0) + ',' + ((goal.z / 20) | 0);
      let steer = goal;
      if (bot.detourT && performance.now() - bot.detourT < 4000) steer = bot.detourPos;
      else if (bot.detourT) { bot.detourT = 0; bot.goalStuck = Math.max(0, bot.goalStuck - 1); }
      const dg = Math.hypot(goal.x - wolf.pos.x, goal.z - wolf.pos.z);
      camYaw = Math.atan2(steer.x - wolf.pos.x, steer.z - wolf.pos.z);
      keys.KeyW = dg > 2.2;
      keys.KeyS = keys.KeyA = keys.KeyD = false;
      keys.ShiftLeft = (dg > 35 || (targetAnimal && dg < 26)) && wolf.stamina > 20 && !wolf.exhausted;   // burst to close the kill

      // hunt: bite in reach
      if (targetAnimal && dg < 3.4 + (targetAnimal.sp.scale || 1)) {
        keys.KeyW = false;
        if (performance.now() - bot.lastAtk > 700) {
          bot.lastAtk = performance.now();
          const hpB = targetAnimal.hp;
          wolf.attack();
          setTimeout(() => {
            if (targetAnimal.dead) log('kill', { sp: q ? (q.species || q.kind) : '?', msg: 'caught ' + (q && q.species ? q.species : (q ? q.kind : 'target')) + ' → quest ' + (q ? q.have + '/' + q.need : '') + ' · xp ' + (wolf.xp | 0) + ' · meat ' + inv.meat });
            else if (targetAnimal.hp === hpB) warnOnce('miss' + performance.now() | 0, 'bug-bite-no-effect', { key: q.species, msg: 'bite in reach did nothing (hp ' + hpB + ', dist ' + dg.toFixed(1) + ')' });
          }, 350);
        }
      }
      // gather in reach
      if (targetPk && dg < 2.4) {
        keys.KeyW = false;
        if (performance.now() - bot.lastGather > 900) {
          bot.lastGather = performance.now();
          const before = invSum();
          doGather();
          setTimeout(() => {
            if (invSum() > before) { bot.gatherMisses = 0; log('gather', { msg: 'picked up ' + q.item }); }
            else if (++bot.gatherMisses >= 3) { bot.gatherMisses = 0; warnOnce('gmiss' + (performance.now() | 0), 'bug-gather-no-effect', { key: q.item, msg: 'gather at pickup did nothing' }); }
          }, 300);
        }
      }
      bot.goalText = mode + ' → ' + dg.toFixed(0) + 'm' + (q ? ' (' + q.have + '/' + q.need + ')' : '');

      // anti-stuck: wants to move but isn't (measured on the game odometer — immune to slow sims)
      const moving = keys.KeyW && dg > 6;
      if (moving) {
        if (!bot.stuckPos) bot.stuckPos = { x: wolf.pos.x, z: wolf.pos.z, t: performance.now(), od: wolf.distance };
        else if (performance.now() - bot.stuckPos.t > 12000) {
          if (wolf.distance - (bot.stuckPos.od || 0) < 4) {
            log('stuck', { x: +wolf.pos.x.toFixed(0), z: +wolf.pos.z.toFixed(0), biome: curBiomeKey, goal: bot.goalKey, msg: 'wanted to move, went nowhere for 9s' });
            bot.unstickT = performance.now();
            bot.stuckPos = null;
            if (bot.goalStuck >= 1 && bot.goalKey) {   // same objective keeps wedging — walk around it
              const side = Math.random() < 0.5 ? 1 : -1;
              const gy = Math.atan2(goal.x - wolf.pos.x, goal.z - wolf.pos.z) + side * 1.35;
              bot.detourPos = { x: wolf.pos.x + Math.sin(gy) * 26, z: wolf.pos.z + Math.cos(gy) * 26 };
              bot.detourT = performance.now();
              log('detour', { msg: 'routing around obstacle' });
            } else bot.goalStuck++;
          } else bot.stuckPos = { x: wolf.pos.x, z: wolf.pos.z, t: performance.now(), od: wolf.distance };
        }
      } else bot.stuckPos = null;
      if (bot.unstickT && performance.now() - bot.unstickT < 1200) { keys.Space = true; keys.KeyA = ((performance.now() / 200) | 0) % 2 === 0; }
      else keys.Space = false;

      // flavour: howl now and then
      bot.howlT -= 0.15;
      if (bot.howlT <= 0) { bot.howlT = 80 + Math.random() * 60; wolf.howl(); }

      // quest stall detector: active quest, objective available, but no progress for 4 min
      const q0 = QUESTS.active[0];
      if (q0) {
        if (bot.stallQ !== q0.id) { bot.stallQ = q0.id; bot.stallHave = q0.have; bot.stallT = performance.now(); }
        else if (q0.have > bot.stallHave) { bot.stallHave = q0.have; bot.stallT = performance.now(); }
        else if (performance.now() - bot.stallT > 240000) {
          warnOnce('stall' + q0.id + q0.have, 'bug-quest-stalled', { key: q0.title, msg: 'no progress in 4 min: ' + q0.title + ' stuck at ' + q0.have + '/' + q0.need });
          if (q0.kind === 'hunt' || q0.kind === 'rival') { log('abandon-stalled', { title: q0.title, msg: 'setting aside an impossible deed' }); abandonQuest(q0.id); }
          bot.stallT = performance.now();   // re-arm for the next objective
        }
      }
    } catch (e) { log('bot-error', { msg: String(e && e.message).slice(0, 140) }); }
  }, 150);
})();
