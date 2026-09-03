/* ============================================================
   🐺 THE PACK — howl to bond, hunt together, lose the fallen
   (M46 gameplay update, follows the campaign)
   · howl within range of a wild pack → pure luck: bond / fangs / silence
   · once bonded, the player's goals ARE the pack's goals:
     quests together (kills, gathers), fights alongside, bosses included
   · a mate that falls loses what IT carried on the current deed
     (resources & progress) — EXCEPT combat: the damage it dealt stands
   · packs spawn leveled to the player's current XP level
   session-only by design: a bonded pack lives while the wolf lives;
   a reload leaves the wilds quiet again (no save for the pack).
   ============================================================ */
window.PACK = (() => {
  const HOWL_RANGE = 130;                 // the bonding call only reaches packs this close
  const BOND_P = 0.45, ATTACK_P = 0.35;   // rest = they look away
  const REACH = 2.6;                      // a mate's bite reach
  const PTYPE = { herb: 'herb', mushroom: 'mushroom', berry: 'berryBush', stone: 'stoneP', wood: 'stick', bone: 'bone' };
  let bonded = null;                      // the RivalPack sworn to the player
  let forced = null;                      // PACKDBG deterministic roll

  const packNow = () => (typeof WORLD_EVENTS !== 'undefined' && WORLD_EVENTS.pack) || null;
  const qActive = () => (typeof QUESTS !== 'undefined' && QUESTS.active && QUESTS.active[0]) || null;
  const d2 = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
  const toast = (m, imp) => { if (typeof window.toast === 'function') window.toast(m, imp); };

  /* ---------- THE BONDING CALL ---------- */
  const onHowl = () => {
    const p = packNow();
    if (!p) { toast('🐺 Your call rolls over empty land — no pack is near.'); return; }
    if (bonded) { toast(bonded === p ? '🐺 Your pack is already at your side.' : '🐺 Your own pack walks beside you — one pack, one hunt.'); return; }
    if (p.stance === 'bonded') { toast('🐺 Your pack is already at your side.'); return; }
    const alive = p.members.filter(m => !m.dead);
    if (!alive.length) return;
    const d = Math.hypot(alive[0].pos.x - wolf.pos.x, alive[0].pos.z - wolf.pos.z);
    if (d > HOWL_RANGE) { toast('🐺 No pack answers — the nearest pack cannot hear your call from here.'); return; }
    const r = forced !== null ? forced : Math.random();
    forced = null;
    if (r < BOND_P) { bond(p); return; }
    if (r < BOND_P + ATTACK_P) {
      p.stance = 'attack'; p.provoked(); p.setStates('attack');
      toast('🐺 THE PACK ANSWERS WITH FANGS — every wolf is coming for you!', true);
      if (audio.growl) audio.growl();
      return;
    }
    p.stance = 'undecided';
    toast('🐺 The pack hears you… and looks away. Luck was not with you this time.');
  };
  const bond = p => {
    if (bonded && bonded !== p) toast('🐺 Your own pack answers instead — one pack, one hunt.');
    bonded = p;
    p.stance = 'bonded';
    let i = 0;
    for (const m of p.members) {
      m.state = 'bond';
      m.offA = (i / Math.max(1, p.members.length)) * 6.2832 + Math.random() * 0.7;
      m.offR = 7 + Math.random() * 6;
      m.contrib = null;        // { qid, units, items:{}, combat }
      m._eng = null;
      m._catchT = 0;
      i++;
    }
    toast(`🐺 THE PACK JOINS YOU — ${p.members.filter(m => !m.dead).length} wolves, Level ${p.level}. Their hunt is your hunt.`, true);
    if (audio.chime) audio.chime();
  };

  /* ---------- goal logic: the player's quest is the pack's quest ---------- */
  const consider = (e, maxP, maxM, m) => {
    if (!e || e.dead) return null;
    const dp = Math.hypot(e.pos.x - wolf.pos.x, e.pos.z - wolf.pos.z);
    if (dp > maxP) return null;
    const dm = d2(m, e);
    if (dm > maxM) return null;
    return { e, dm };
  };
  const pickEnemy = m => {
    let best = null, bd = 1e9;
    const tryE = (cand) => { if (cand && cand.dm < bd) { bd = cand.dm; best = cand.e; } };
    // 1) PROTECT: whatever threatens the player comes first
    if (typeof bosses !== 'undefined') for (const b of bosses) tryE(consider(b, 210, 260, m));
    nearChunkEntities(m, ch => { for (const pr of ch.predators) tryE(consider(pr, 120, 150, m)); });
    for (const r of rivals) if (r.pack && r.pack.stance === 'attack' && r !== m) tryE(consider(r, 120, 150, m));
    if (best) return best;
    // 2) the deed's own goal (only when nothing threatens the player)
    const q = qActive();
    if (q && q.camp) {
      if (q.kind === 'hunt' || q.kind === 'harvest') {
        nearChunkEntities(m, ch => { for (const a of ch.animals) {
          if (a.dead) continue;
          if (q.kind === 'hunt' && a.name !== q.species) continue;
          tryE(consider(a, 170, 150, m));
        } });
      } else if (q.kind === 'combat') {
        nearChunkEntities(m, ch => { for (const pr of ch.predators) tryE(consider(pr, 170, 160, m)); });
      }
    }
    // 3) boss stage: the Legend itself
    if (!best && window.CAMP) {
      const st = window.CAMP.state();
      if (st.stage === 'boss') for (const b of bosses) tryE(consider(b, 240, 240, m));
    }
    return best;
  };
  const pickGather = m => {
    const q = qActive();
    if (!q || !q.camp) return null;
    let item = null;
    if (q.kind === 'collect') item = q.item;
    else if (q.kind === 'herbal') item = 'herb';
    if (!item || !PTYPE[item]) return null;
    const ptype = PTYPE[item];
    let best = null, bd = 1e9;
    nearChunkEntities(m, ch => {
      for (const p of ch.pickups) {
        if (p.gathered || p.type !== ptype) continue;
        const d = Math.hypot(p.x - m.pos.x, p.z - m.pos.z);
        if (d < 110 && d < bd) { bd = d; best = p; }
      }
    });
    return best;
  };

  /* the director: tells a bonded mate where its feet go (called from RivalWolf.bondUpdate).
     scans are throttled (0.5 s) and scoped to nearby chunks — 5 minds, one budget */
  const nearChunkEntities = (m, fn) => {
    const ccx = Math.floor(m.pos.x / CHUNK), ccz = Math.floor(m.pos.z / CHUNK);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const ch = chunks.get(ck(ccx + dx, ccz + dz));
      if (ch) fn(ch);
    }
  };
  const memberTick = (m, dt) => {
    if (m.dead) return { speed: 0 };
    // ---- gentle regen between fights: a pack that lives, helps ----
    if (m.hp < m.maxHp && !m._eng) m.hp = Math.min(m.maxHp, m.hp + 0.5 * dt);
    // ---- throttled perception (the CHASE itself runs every frame) ----
    if ((m._scanT = (m._scanT || 0) + dt) >= 0.5) {
      m._scanT = 0;
      m._eng = pickEnemy(m);
      m._gather = m._eng ? null : pickGather(m);
    } else if (m._eng) {
      const e = m._eng;
      if (e.dead || d2(m, e) > 260) { m._eng = null; m._gather = null; }   // lost it — re-scan on the next tick
    }
    if (m._eng) {
      const e = m._eng;
      const d = d2(m, e);
      return { speed: d > REACH ? (m.runSpd || 12) : 0, heading: Math.atan2(e.pos.x - m.pos.x, e.pos.z - m.pos.z) };
    }
    // ---- gather: the deed wants resources ----
    const g = m._gather;
    if (g) {
      if (g.gathered) { m._gather = null; }
      else {
        const d = Math.hypot(g.x - m.pos.x, g.z - m.pos.z);
        if (d < 1.7) { doGatherAs(m, g); m._gather = null; return { speed: 0 }; }
        return { speed: 8.5, heading: Math.atan2(g.x - m.pos.x, g.z - m.pos.z) };
      }
    }
    // ---- catch-up: never lose the pack to a sprinter ----
    const dw = Math.hypot(wolf.pos.x - m.pos.x, wolf.pos.z - m.pos.z);
    if (dw > 140) {
      m._catchT = (m._catchT || 0) + dt;
      const a = m.offA || 0;
      const tx = wolf.pos.x + Math.sin(a) * (m.offR || 8), tz = wolf.pos.z + Math.cos(a) * (m.offR || 8);
      if (heightAt(tx, tz) > WATER_Y + 0.4) {
        m.pos.x = tx; m.pos.z = tz; m.pos.y = heightAt(tx, tz);
        m.model.position.copy(m.pos);
        if (m._catchT > 30) { m._catchT = 0; toast('🐺 Your pack catches up to you.'); }
      }
      return { speed: 0, heading: Math.atan2(wolf.pos.x - m.pos.x, wolf.pos.z - m.pos.z) };
    }
    // ---- follow at the ring ----
    const rx = wolf.pos.x + Math.sin(m.offA || 0) * (m.offR || 8);
    const rz = wolf.pos.z + Math.cos(m.offA || 0) * (m.offR || 8);
    const dr = Math.hypot(rx - m.pos.x, rz - m.pos.z);
    const speed = dw > 26 ? (m.runSpd || 12) : (dr > 2.5 ? 6.5 : 0);
    return { speed, heading: Math.atan2(rx - m.pos.x, rz - m.pos.z) };
  };

  /* ---------- attribution: what a mate carries on the deed ---------- */
  const snapItems = () => ({ meat: inv.meat, herb: inv.herb, mushroom: inv.mushroom, berry: inv.berry, wood: inv.wood, stone: inv.stone });
  const credit = (m, before) => {
    const q = qActive();
    if (!q || !q.camp) return;
    const units = Math.max(0, (q.have || 0) - before.have);
    const items = {};
    for (const k in before.items) {
      const n = Math.max(0, (inv[k] || 0) - before.items[k]);
      if (n > 0) items[k] = n;
    }
    if (!units && !Object.keys(items).length) return;
    if (!m.contrib || m.contrib.qid !== q.id) m.contrib = { qid: q.id, units: 0, items: {}, combat: false };
    m.contrib.units += units;
    for (const k in items) m.contrib.items[k] = (m.contrib.items[k] || 0) + items[k];
    if (q.kind === 'combat') m.contrib.combat = true;   // combat progress is damage — it STANDS (spec exception)
    if (units) toast(q.kind === 'combat' ? '🐺 Your pack tears into the hunters alongside you.' : '🐺 Your pack brings one down for the deed.', false);
  };
  const doGatherAs = (m, p) => {
    const before = { have: (qActive() && qActive().have) || 0, items: snapItems() };
    try { gather(p); } catch (e) { }
    credit(m, before);
  };
  /* a mate fell: its toil on the current deed is lost — combat damage stands */
  const memberDown = m => {
    if (!bonded || !m.contrib) return;
    const q = qActive();
    if (q && m.contrib.qid === q.id && !m.contrib.combat) {
      const u = Math.min(q.have || 0, m.contrib.units || 0);
      if (u > 0) { q.have = (q.have || 0) - u; if (typeof questHudDirty !== 'undefined') questHudDirty = true; }
      for (const k in (m.contrib.items || {})) {
        const n = Math.min(inv[k] || 0, m.contrib.items[k]);
        if (n > 0) inv[k] -= n;
      }
      if (typeof updateInv === 'function') updateInv();
      toast(`🐺 A packmate has fallen — the deed loses what it carried${u ? ' (' + u + ' progress)' : ''}. Its battle damage remains.`, true);
    }
    m.contrib = null;
  };
  const onQuestDone = q => {   // the deed is banked — from here a mate's death costs nothing
    if (!bonded) return;
    for (const m of bonded.members) m.contrib = null;
  };
  const onPackGone = () => {
    const n = bonded ? bonded.members.length : 0;
    bonded = null;
    for (let i = rivals.length - 1; i >= 0; i--) if (rivals[i].dead) rivals.splice(i, 1);   // the fallen leave the roster
    toast(`🐺 The pack is gone — ${n} wolves gave all they had. The howl can call anew.`, true);
  };

  /* ---------- combat cadence: bite, and the enemy bites back ---------- */
  const biteEnemy = (m, e) => {
    if (e.pack) {   // a rival wolf — a real duel
      e.hp -= m.dmg;
      bloodBurst(e.pos, 12, 1);
      e.flinchT = 0.25;
      if (e.hp <= 0) e.die();
      return;
    }
    if (typeof e.hit === 'function') e.hit(m.dmg, true, false);   // animals · predators · legends
  };
  const tick = (dt, tSec) => {
    if (!bonded) return;
    // the pack lives in the GAME LOOP, not in the world event's 240 s window:
    // once sworn, its feet move here every frame for as long as the bond holds
    bonded.update(dt || 0, tSec || 0);
    for (const m of [...bonded.members]) {
      if (m.dead) continue;
      const e = m._eng;
      if (!e || e.dead) { m._eng = null; continue; }
      const d = d2(m, e);
      // the mate bites
      if (d < REACH && m.atkCd <= 0) {
        m.atkCd = 1.15;
        const before = { have: (qActive() && qActive().have) || 0, items: snapItems() };
        try { biteEnemy(m, e); } catch (err) { }
        credit(m, before);
      }
      // the enemy answers
      if (d < 3.6 && e.atkCd <= 0) {
        e.atkCd = (e.sp && e.sp.atkCd) || (e.def && (e.def.atkGap || 1.25)) || 1.2;
        const edmg = e.dmg || (e.def && e.def.dmg) || 7;
        m.hurt(Math.round(edmg), e.sp ? e.sp.label : (e.def ? e.def.name : 'a predator'));
      }
    }
  };

  /* ---------- a mate takes the blow meant for the player ---------- */
  const intercept = (attacker, dmg, label, icon) => {
    if (!bonded) return false;
    for (const m of bonded.members) {
      if (m.dead || m.state !== 'bond') continue;
      if (d2(m, wolf) < 3.6 && Math.random() < 0.45) {
        m.hurt(Math.max(1, Math.round(dmg)), label || 'a predator');
        toast(`🐺 ${m.sp.label} throws itself between you and the blow!`, true);
        if (audio.thud) audio.thud();
        return true;
      }
    }
    return false;
  };

  /* ---------- HUD ---------- */
  const status = () => {
    if (!bonded) return '';
    const alive = bonded.members.filter(m => !m.dead).length, total = bonded.members.length;
    return `🐺 Pack <b>${alive}/${total}</b> · Lv <b>${bonded.level}</b> · bonded`;
  };

  window.PACKDBG = {
    state: () => bonded ? { stance: bonded.stance, level: bonded.level, total: bonded.members.length, alive: bonded.members.filter(m => !m.dead).length, members: bonded.members.map(m => ({ id: m.bondId, hp: m.hp, contrib: m.contrib && JSON.parse(JSON.stringify(m.contrib)) })) } : null,
    setRoll: v => { forced = v; },
    bondForce: () => { const p = packNow(); if (p) bond(p); return !!p; },
    spawn: (x, z) => { WORLD_EVENTS.pack = new RivalPack(x, z); return WORLD_EVENTS.pack; },
    packNow, onHowl, tick, memberDown, status
  };
  return { onHowl, tick, memberTick, memberDown, intercept, status, onQuestDone, onPackGone, pack: () => bonded };
})();
