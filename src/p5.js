/* ============================================================
   🏆 THE CAMPAIGN — progressive quest chain · legend hierarchy
   · infinite trophy speedrun (M46 major update)
   The open world stays free; progression is a controlled state
   machine: per Legend = 3 quest stages → prep → scout → awaken →
   boss → story. Five Legends, then the Beast Master, then a
   Trophy, then the next tier — forever, harder every cycle.
   ============================================================ */
window.CAMP = (() => {
  const LS = 'revontulet_campaign_v1';
  let S = null;                 // persistent state (saved)
  let alt = null;               // altar visual {mesh, glowT, x, z}
  let lastKills = 0, lastDsc = 0, autosaveT = 0, hudT = 0, prepNeedCache = 2;

  /* ---------- the hierarchy (data-driven, see CAMPAIGN_DESIGN.md) ---------- */
  const LEGENDS = [
    { key: 'Leopard',    sp: 'leopard', biome: 'forest',    icon: '🐆', glow: 0xd8a44a, special: 'ambush',    ability: 'shadowStep',    abilityName: 'Shadow Step',    abilityDesc: 'prowling is nearly invisible',      stats: { hp: 45,  dmg: 14, speed: 12.5, scale: 2.6 }, territory: 'the dense pine forest', story: 'The first Legend has fallen. But its roar has awakened something deeper in the wilderness.' },
    { key: 'Tiger',      sp: 'tiger',   biome: 'grove',     icon: '🐯', glow: 0xc26a1e, special: 'fury',      ability: 'secondWind',    abilityName: 'Second Wind',    abilityDesc: 'health regenerates 50% faster',        stats: { hp: 62,  dmg: 16, speed: 12.6, scale: 3.0 }, territory: 'deep wooded dells',    story: 'The forest grows silent. Something stronger is watching.' },
    { key: 'Lion',       sp: 'lion',    biome: 'meadow',    icon: '🦁', glow: 0xc79a54, special: 'tactics',   ability: 'thunderCharge', abilityName: 'Thunder Charge', abilityDesc: 'sprint 12% faster',                  stats: { hp: 74,  dmg: 18, speed: 11.8, scale: 3.2 }, territory: 'the open grasslands',  story: 'The meadows bow beneath a golden mane — the land has a new king, and it knows your scent.' },
    { key: 'Bear',       sp: 'bear',    biome: 'taiga',     icon: '🐻', glow: 0xffb060, special: 'knockback', ability: 'winterCoat',    abilityName: 'Winter Coat',    abilityDesc: 'blizzards and bitter cold bite half as deep', stats: { hp: 112, dmg: 22, speed: 10.4, scale: 3.6 }, territory: 'the snowbound taiga',   story: 'The mountains have answered.' },
    { key: 'Eagle',      sp: 'eagle',   biome: 'mountain',  icon: '🦅', glow: 0xffe2a0, special: 'dive', flight: true, ability: 'springSteps', abilityName: 'Spring Steps', abilityDesc: 'sprint stamina drains 25% slower',     stats: { hp: 54,  dmg: 15, speed: 16.0, scale: 2.4, cruiseAlt: 13, diveGap: 5.5 }, territory: 'the mountain cliffs', story: 'The sky itself hunts you now. Only the ground is your ally.' }
  ];
  const BEAST = { key: 'Beast Master', sp: 'bear', biome: 'enchanted', icon: '👑', glow: 0xff5040, special: 'echo', ability: 'sandStride', abilityName: 'Sand Stride', abilityDesc: 'stamina returns 25% faster', stats: { hp: 190, dmg: 26, speed: 13.6, scale: 4.2 }, territory: 'the Enchanted Grove', story: 'You have defeated the greatest predators of this land. Now something ancient awakens.' };

  /* ---------- controlled scaling (never aggressive, never capped) ---------- */
  const xpMul = t => Math.pow(1.5, t - 1);
  const thp = t => 1 + 0.7 * (t - 1);
  const tdmg = t => 1 + 0.28 * (t - 1);
  const tspd = t => 1 + 0.05 * (t - 1);
  const tscale = t => 1 + 0.07 * (t - 1);
  const prepNeed = t => Math.min(3, 2 + ((t - 1) / 2 | 0));
  const xpGate = (t, leg) => Math.round((260 + leg * 45) * xpMul(t));

  const fresh = () => ({
    v: 1, name: '', tier: 1, leg: 0, stage: 'q0', prepDone: 0,
    xp: 0, runT0: 0, pausedAcc: 0, pausedAt: null,
    trophies: [], best: {}, terr: null, altar: null, seen: {}, created: Date.now()
  });
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { } };
  const load = () => { try { const s = JSON.parse(localStorage.getItem(LS) || 'null'); if (s && s.v === 1) { S = s; return; } } catch (e) { } S = fresh(); };
  load();
  if (typeof TITLES === 'undefined' || !S.name) { /* name handled in menu */ }

  const curLegend = () => (S.leg < LEGENDS.length ? LEGENDS[S.leg] : BEAST);
  const legendName = () => {
    const L = curLegend(), t = S.tier;
    const n = L.key + (L.key === 'Beast Master' ? '' : ' Legend');
    return n + (t > 1 ? ' L' + t : '');
  };
  const stageLabel = () => ({ q0: 'Stage 1 · choose your hunt', q1: 'Stage 2 · the land deepens', prep: 'Preparation for the ' + curLegend().key, awaken: 'Awaken the ' + curLegend().key, boss: curLegend().key + ' is loose!' }[S.stage] || '');

  /* ---------- the boss definition handed to the Boss class ---------- */
  const legendDef = () => {
    const L = curLegend(), t = S.tier, st = L.stats;
    return {
      name: legendName(), icon: L.icon, glow: L.glow, special: L.special, flight: !!L.flight,
      hp: Math.round(st.hp * thp(t)), dmg: Math.round(st.dmg * tdmg(t)), speed: st.speed * tspd(t),
      scale: st.scale * tscale(t), build: L.sp, modelSp: L.sp, cruiseAlt: st.cruiseAlt, diveGap: st.diveGap,
      atkGap: L.key === 'Bear' ? 1.6 : 1.25, xp: Math.round(320 * xpMul(t)),
      ability: L.ability, abilityName: L.abilityName, abilityDesc: L.abilityDesc,
      camp: L.key === 'Beast Master' ? 'beast' : 'legend',
      onSlain: () => onLegendSlain()
    };
  };

  const uid = () => 'camp' + (Math.random() * 1e9 | 0) + (S.leg) + (S.tier);
  const icon = k => ({ hunt: '⚔️', explore: '🧭', collect: '🌿', survive: '🌙', combat: '🗡️', xp: '✦', harvest: '🍖', herbal: '💊', scout: '🐾', ritual: '🪨', travel: '🚶' }[k] || '📜');
  const Σ = () => xpMul(S.tier);
  const campXp = n => { S.xp += Math.round(n * Σ()); };

  /* ---------- world helpers ---------- */
  const dist = (x, z) => Math.hypot(x - wolf.pos.x, z - wolf.pos.z);
  const lmTypes = ['stoneCircle', 'ruins', 'cabin', 'waterfall', 'shrine', 'frozenLake', 'wolfShrine', 'hiddenValley', 'deposit', 'shroomForest'];
  const pickLandmark = () => {   // the nearest UNFOUND landmark of a real type — routing respects the map
    let best = null, bd = 1e9;
    for (const lm of landmarkList) {
      if (lm.found) continue;
      if (!lmTypes.includes(lm.type)) continue;
      const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
      if (d < bd) { bd = d; best = lm; }
    }
    return best;
  };
  const pickBiomeSpot = biome => {   // nearest ground of the legend's land — never an island of water
    let best = null, bd = 1e9;
    for (let r = 90; r <= 760; r += 95) for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.2832, x = wolf.pos.x + Math.sin(a) * r, z = wolf.pos.z + Math.cos(a) * r;
      if (heightAt(x, z) < WATER_Y + 0.9) continue;
      if (dominantBiomeAt(x, z).key !== biome) continue;
      const d = r; if (d < bd) { bd = d; best = { x, z }; }
    }
    return best;
  };
  const isValidSpot = (x, z, biome) => heightAt(x, z) > WATER_Y + 0.9 && dominantBiomeAt(x, z).key === biome;
  const resolveTerritory = () => {
    const L = curLegend();
    if (S.terr && S.terr.leg === L.key && S.terr.tier === S.tier && isValidSpot(S.terr.x, S.terr.z, L.biome)) return S.terr;
    const sp = pickBiomeSpot(L.biome) || { x: wolf.pos.x + 300, z: wolf.pos.z };
    S.terr = { leg: L.key, tier: S.tier, biome: L.biome, x: sp.x, z: sp.z };
    return S.terr;
  };
  const buildAltar = () => {
    const L = curLegend();
    if (S.altar && S.altar.leg === L.key && S.altar.tier === S.tier && isValidSpot(S.altar.x, S.altar.z, L.biome)) { placeAltarMesh(); return S.altar; }
    const t = resolveTerritory();
    let ax = 0, az = 0, ok = false;
    for (let k = 0; k < 24 && !ok; k++) {
      const a = Math.random() * 6.2832, r = 20 + Math.random() * 45;
      ax = t.x + Math.sin(a) * r; az = t.z + Math.cos(a) * r;
      if (heightAt(ax, az) > WATER_Y + 1.2 && dominantBiomeAt(ax, az).key === L.biome) ok = true;
    }
    if (!ok) { ax = t.x; az = t.z; }
    S.altar = { leg: L.key, tier: S.tier, x: ax, z: az };
    placeAltarMesh();
    return S.altar;
  };
  const placeAltarMesh = () => {
    if (alt && alt.mesh && alt.mesh.parent) scene.remove(alt.mesh);
    if (!S.altar) { alt = null; return; }
    const g = new THREE.Group();
    const stone = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.6), matColor(0x6a6a78));
    stone.position.y = 0.55; g.add(stone);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.1), matColor(0x84849a));
    top.position.y = 1.3; g.add(top);
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: curLegend().glow }));
    rune.position.y = 1.54; g.add(rune);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: curLegend().glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(3.2); halo.position.y = 2.2; g.add(halo);
    g.position.set(S.altar.x, heightAt(S.altar.x, S.altar.z), S.altar.z);
    scene.add(g);
    alt = { mesh: g, halo, x: S.altar.x, z: S.altar.z };
  };

  /* ---------- quest factories (templates + tier scaling — controlled, not random) ---------- */
  const qHunt = (species, need, kindT) => {
    const ref = SPECIES[species] || { label: species };
    return { id: uid(), camp: true, stage: kindT, kind: 'hunt', species, need, have: 0, icon: icon('hunt'),
      title: 'Hunt ' + need + ' ' + pluralOf(ref.label, need), biome: curBiomeKey,
      desc: 'Proof of the hunt — bring down ' + need + ' ' + pluralOf(ref.label, need) + '.',
      rw: { xp: 80 * Σ() }, rwText: Math.round(80 * Σ()) + ' XP · ⚜ ' + Math.round(60 * Σ()) + ' campaign XP', campXp: 60 };
  };
  const qExplore = () => {
    const lm = pickLandmark();
    if (lm) return { id: uid(), camp: true, stage: 'q0', kind: 'explore', lmType: lm.type, need: 1, have: 0, icon: icon('explore'),
      title: 'Discover the ' + (lm.label || lm.type), biome: lm.biome || curBiomeKey,
      desc: 'Seek out an unfound place on the map — the land keeps secrets.',
      rw: { xp: 80 * Σ() }, rwText: Math.round(80 * Σ()) + ' XP · ⚜ ' + Math.round(60 * Σ()) + ' campaign XP', campXp: 60 };
    return { id: uid(), camp: true, stage: 'q0', kind: 'explore', peak: true, need: 1, have: 0, icon: icon('explore'),
      title: 'Stand where the eagles stand', biome: 'mountain',
      desc: 'Reach a height of 50 meters — the world unrolls below you.',
      rw: { xp: 80 * Σ() }, rwText: Math.round(80 * Σ()) + ' XP · ⚜ ' + Math.round(60 * Σ()) + ' campaign XP', campXp: 60 };
  };
  const qCollect = (item, need, stage) => {
    const c = COLLECT_ITEMS[item] || { label: item, icon: '🌿' };
    return { id: uid(), camp: true, stage, kind: 'collect', item, need, have: 0, icon: icon('collect'),
      title: 'Gather ' + need + ' ' + c.label, biome: curBiomeKey,
      desc: 'Collect ' + need + ' ' + c.label + ' from the wild.',
      rw: { xp: 80 * Σ() }, rwText: Math.round(80 * Σ()) + ' XP · ⚜ ' + Math.round(60 * Σ()) + ' campaign XP', campXp: 60 };
  };
  const qSurvive = () => {
    const days = 1 + ((S.tier - 1) / 2 | 0);
    return { id: uid(), camp: true, stage: 'q0', kind: 'survive', days, need: days, have: 0, prog0: undefined, icon: icon('survive'),
      title: 'Survive ' + days + ' day' + (days > 1 ? 's' : '') + ' in the wild', biome: curBiomeKey,
      desc: 'Outlast the sky itself — one dawn at a time.',
      rw: { xp: 80 * Σ() }, rwText: Math.round(80 * Σ()) + ' XP · ⚜ ' + Math.round(60 * Σ()) + ' campaign XP', campXp: 60 };
  };
  const qTrack = () => {
    const lm = pickLandmark();
    const need = 2 + (S.tier - 1);
    if (!lm) return qCollect(lmTypes.length ? 'mushroom' : 'herb', 3 + (S.tier - 1), 'q1');
    return { id: uid(), camp: true, stage: 'q1', kind: 'explore', lmType: lm.type, need, have: 0, icon: icon('scout'),
      title: 'Track: find ' + need + ' landmarks', biome: lm.biome || curBiomeKey,
      desc: 'Read the land like a tracker — ' + need + ' undiscovered places.',
      rw: { xp: 130 * Σ() }, rwText: Math.round(130 * Σ()) + ' XP · ⚜ ' + Math.round(90 * Σ()) + ' campaign XP', campXp: 90 };
  };
  const qHuntMedium = () => {
    const tbl = (SPECIES_TABLE[curBiomeKey] || SPECIES_TABLE.forest).map(e => e[0]);
    const med = tbl.filter(k => { const d = SPECIES[k]; return d && d.hp >= 4 && !d.huntsWolf; });
    const species = med.length ? med[(Math.random() * med.length) | 0] : 'deer';
    const need = 2 + (S.tier - 1);
    const ref = SPECIES[species] || { label: species };
    const q = { id: uid(), camp: true, stage: 'q1', kind: 'hunt', species, need, have: 0, icon: icon('hunt'),
      title: 'Hunt ' + need + ' ' + pluralOf(ref.label, need), biome: curBiomeKey,
      desc: 'Bigger prey, bigger tale — ' + need + ' ' + pluralOf(ref.label, need) + '.',
      rw: { xp: 130 * Σ() }, rwText: Math.round(130 * Σ()) + ' XP · ⚜ ' + Math.round(90 * Σ()) + ' campaign XP', campXp: 90 };
    if (S.tier >= 2 && Math.random() < 0.5) { q.timed = true; q.deadline = tSec + 150 + S.tier * 25; q.title = 'Hunt ' + need + ' ' + pluralOf(ref.label, need) + ' in time'; q.desc += ' Beat the clock!'; }
    return q;
  };
  const qCombat = () => {
    const need = 1 + ((S.tier - 1) / 2 | 0);
    return { id: uid(), camp: true, stage: 'q1', kind: 'combat', need, have: 0, icon: icon('combat'),
      title: 'Slay ' + need + ' predator' + (need > 1 ? 's' : ''), biome: curBiomeKey,
      desc: 'Turn the tables — put down ' + need + ' of the hunters that stalk you.',
      rw: { xp: 140 * Σ() }, rwText: Math.round(140 * Σ()) + ' XP · ⚜ ' + Math.round(90 * Σ()) + ' campaign XP', campXp: 90 };
  };
  const qPrep = kind => {
    const t = S.tier, leg = S.leg;
    if (kind === 'xp') {
      const gate = xpGate(t, leg);
      return { id: uid(), camp: true, stage: 'prep', kind: 'xp', need: gate, have: 0, base: S.xp, icon: icon('xp'),
        title: 'Reach ' + gate + ' campaign XP', biome: curBiomeKey,
        desc: 'Earn ' + gate + ' more campaign XP — quests, hunts, discoveries. Your moment is near.',
        rw: { xp: 170 * Σ() }, rwText: Math.round(170 * Σ()) + ' XP · ⚜ ' + Math.round(140 * Σ()) + ' campaign XP', campXp: 140 };
    }
    if (kind === 'harvest') {
      const need = 4 + (t - 1) * 2;
      return { id: uid(), camp: true, stage: 'prep', kind: 'harvest', need, have: 0, icon: icon('harvest'),
        title: 'Gather ' + need + ' meat for the journey', biome: curBiomeKey,
        desc: 'Stock provisions — hunt ' + need + ' pieces of meat for the trial ahead.',
        rw: { xp: 170 * Σ(), items: { meat: need } }, rwText: Math.round(170 * Σ()) + ' XP · ' + need + ' 🍖 · ⚜ ' + Math.round(140 * Σ()) + ' campaign XP', campXp: 140 };
    }
    if (kind === 'herbal') {
      const need = 5 + (t - 1) * 2;
      return { id: uid(), camp: true, stage: 'prep', kind: 'herbal', need, have: 0, icon: icon('herbal'),
        title: 'Gather ' + need + ' healing herbs & mushrooms', biome: curBiomeKey,
        desc: 'The Legend will not fall to a tired wolf — stock herbs and mushrooms.',
        rw: { xp: 170 * Σ(), items: { herb: need } }, rwText: Math.round(170 * Σ()) + ' XP · 🌿×' + need + ' · ⚜ ' + Math.round(140 * Σ()) + ' campaign XP', campXp: 140 };
    }
    const terr = resolveTerritory();
    return { id: uid(), camp: true, stage: 'prep', kind: 'scout', need: 1, have: 0, icon: icon('scout'), wp: { x: terr.x, z: terr.z },
      title: 'Scout the ' + curLegend().key + '\u2019s territory', biome: terr.biome,
      desc: 'Walk ' + curLegend().territory + ' — know the ground before the awakening.',
      rw: { xp: 170 * Σ() }, rwText: Math.round(170 * Σ()) + ' XP · ⚜ ' + Math.round(140 * Σ()) + ' campaign XP', campXp: 140 };
  };
  const qRitual = () => {
    const a = buildAltar();
    return { id: uid(), camp: true, stage: 'awaken', kind: 'ritual', need: 1, have: 0, icon: icon('ritual'), wp: { x: a.x, z: a.z },
      title: 'Awaken the ' + curLegend().key, biome: curLegend().biome,
      desc: 'Reach the glowing altar in ' + curLegend().territory + ' and press E to channel the awakening.',
      rw: { xp: 100 * Σ() }, rwText: Math.round(100 * Σ()) + ' XP · ⚜ ' + Math.round(40 * Σ()) + ' campaign XP', campXp: 40 };
  };

  /* ---------- the board: 3-4 choices, one active at a time ---------- */
  const buildChoices = () => {
    QUESTS.avail.length = 0;
    if (QUESTS.active.length) return;   // the other choices disappear — one deed at a time
    const t = S.tier;
    const spread = (arr, ids) => { for (const k of ids) { const q = arr[k](); if (q) QUESTS.avail.push(q); } };
    if (S.stage === 'q0') {
      const cops = { hunt: () => { const live = nearbySpeciesCounts(); const small = Object.keys(live).filter(k2 => SPECIES[k2] && SPECIES[k2].hp <= 3 && !SPECIES[k2].huntsWolf && !/predator/i.test(k2)); const sp = small.length ? small[(Math.random() * small.length) | 0] : 'rabbit'; return qHunt(sp, 2 + (t - 1), 'q0'); },
        explore: qExplore, collect: () => { const items = Object.keys(COLLECT_ITEMS).filter(k2 => pickupSupply(k2) >= 4 + (t - 1)); if (!items.length) return qCollect('berry', 3 + (t - 1), 'q0'); return qCollect(items[(Math.random() * items.length) | 0], 3 + (t - 1), 'q0'); }, survive: qSurvive };
      spread(cops, ['hunt', 'explore', 'collect', 'survive']);
    } else if (S.stage === 'q1') {
      const cops = { track: qTrack, huntM: qHuntMedium, combat: qCombat, collect: () => { const items = ['herb', 'mushroom'].filter(k2 => pickupSupply(k2) >= 5 + (t - 1)); const k2 = items.length ? items[(Math.random() * items.length) | 0] : 'berry'; return qCollect(k2, 4 + (t - 1), 'q1'); } };
      spread(cops, ['track', 'huntM', 'combat', 'collect']);
    } else if (S.stage === 'prep') {
      spread({ xp: () => qPrep('xp'), harvest: () => qPrep('harvest'), herbal: () => qPrep('herbal'), scout: () => qPrep('scout') }, ['xp', 'harvest', 'herbal', 'scout']);
    } else if (S.stage === 'awaken') {
      QUESTS.avail.push(qRitual());
    }
    questHudDirty = true;
  };
  const refill = () => { buildChoices(); if (typeof renderQuests === 'function') renderQuests(); };

  /* ---------- event & tick plumbing ---------- */
  const onEvent = (q, kind, data) => {   // campaign kinds answer first; return true = handled
    if (q.kind === 'combat' && kind === 'kill' && data.species === 'predator') {
      q.have++; if (q.have >= q.need) completeQuest(q); else { questHudDirty = true; toast(`${q.icon} ${q.title}: ${q.have}/${q.need}`); }
      return true;
    }
    if (q.kind === 'harvest' && kind === 'kill' && data.species && data.species !== 'predator') {
      q.have++; if (q.have >= q.need) completeQuest(q); else { questHudDirty = true; toast(`${q.icon} ${q.title}: ${q.have}/${q.need} meat`); }
      return true;
    }
    if (q.kind === 'herbal' && kind === 'gather' && (data.item === 'herb' || data.item === 'mushroom')) {
      q.have++; if (q.have >= q.need) completeQuest(q); else { questHudDirty = true; toast(`${q.icon} ${q.title}: ${q.have}/${q.need}`); }
      return true;
    }
    return false;
  };
  const onQuestComplete = q => {
    if (!q || !q.camp) return;
    campXp(q.campXp || 60);
    const st = q.stage;
    if (st === 'q0') { S.stage = 'q1'; toast(`📜 Stage 1 complete — the land deepens. Choose your next deed.`, true); }
    else if (st === 'q1') { S.stage = 'prep'; S.prepDone = 0; toast(`📜 Stage 2 complete — prepare for the ${curLegend().key}.`, true); }
    else if (st === 'prep') {
      S.prepDone++;
      if (S.prepDone >= prepNeed(S.tier)) { S.stage = 'awaken'; toast(`🪨 The ${curLegend().key} stirs. An altar glows in ${curLegend().territory} — go and AWAKEN it.`, true); audio.growlVar('warning'); }
      else toast(`📜 Preparation ${S.prepDone}/${prepNeed(S.tier)} — one more deed before the trial.`);
    }
    if (st === 'awaken' || st === 'ritual') { /* ritual completes in useAltar */ }
    refill(); save(); questHudDirty = true;
  };
  const onAccept = q => {
    QUESTS.avail.length = 0;   // the other choices disappear — ONE deed at a time (spec rule)
    save(); questHudDirty = true;
  };
  const onAbandon = q => {   // returning to the board — no XP, no stage change (anti-exploit: no reaccept farming)
    if (q.camp && q.stage === 'boss') { toast('💀 The ' + curLegend().key + ' will not be set aside — face it, or fall.'); rebuildBoard(); return true; }
    toast(`📜 Set aside: ${q.title} (no XP — the board offers the stage again)`);
    rebuildBoard(); save();
    return true;
  };
  const onDeath = () => {
    // progression, campaign XP and the run timer STAND; only the in-flight deed returns to the board
    if (S.stage === 'boss') {   // the legend waits — full retry: despawn, re-channel the altar
      for (const b of [...bosses]) if (b.def && b.def.camp) { b.dead = true; b.dispose(); }
      S.stage = 'awaken';
    }
    for (const q of [...QUESTS.active]) if (q.camp) { const i = QUESTS.active.indexOf(q); if (i >= 0) QUESTS.active.splice(i, 1); }
    rebuildBoard(); save(); questHudDirty = true;
  };
  const rebuildBoard = () => { refill(); };
  const onLegendSlain = () => {
    const wasBeast = S.leg >= LEGENDS.length;
    campXp(wasBeast ? 700 : 320);
    const L = curLegend();
    if (!S.seen[L.key + S.tier]) { S.seen[L.key + S.tier] = 1; setTimeout(() => toast('📖 ' + L.story, true), 1600); }
    addXp(0); // (wolf XP already paid via Boss.die)
    if (wasBeast) {
      const t = elapsed();
      const rec = { tier: S.tier, name: S.name || 'Wolf', date: new Date().toISOString().slice(0, 10), time: +t.toFixed(1), xp: S.xp, bestLegend: LEGENDS[LEGENDS.length - 1].key + ' Legend' };
      S.trophies.push(rec);
      const b = S.best[S.tier];
      if (!b || t < b.t) S.best[S.tier] = { t: +t.toFixed(1), date: rec.date, name: rec.name };
      toast(`🏆 TROPHY — TIER ${S.tier} · ${fmt(t)}! The cycle closes. A harder one begins.`, true);
      music.fanfare();
      S.tier++; S.leg = 0; S.stage = 'q0'; S.prepDone = 0; S.runT0 = performance.now(); S.pausedAcc = 0; S.terr = null; S.altar = null;
      if (alt && alt.mesh && alt.mesh.parent) scene.remove(alt.mesh); alt = null;
    } else {
      S.leg++;
      if (S.leg >= LEGENDS.length) { S.stage = 'prep'; S.prepDone = 0; toast('👑 All Legends of this land have fallen… Prepare for the BEAST MASTER.', true); }
      else { S.stage = 'q0'; toast(`📜 The ${curLegend().key} awaits — new deeds unlock its awakening.`, true); }
      S.terr = null; S.altar = null; if (alt && alt.mesh && alt.mesh.parent) scene.remove(alt.mesh); alt = null;
    }
    refill(); save(); questHudDirty = true;
  };

  /* ---------- the altar ---------- */
  const nearAltar = () => { if (!S.altar || (S.stage !== 'awaken' && S.stage !== 'boss')) return false; return Math.hypot(wolf.pos.x - S.altar.x, wolf.pos.z - S.altar.z) < 3.6; };
  const ritualReady = () => S.stage === 'awaken' && nearAltar() && QUESTS.active.some(q2 => q2.camp && q2.stage === 'awaken');   // the awakening wins the interact key
  const useAltar = () => {
    if (S.stage !== 'awaken' || !nearAltar()) return;
    const ritualQ = QUESTS.active.find(q2 => q2.camp && q2.stage === 'awaken');
    S.stage = 'boss';   // before completion so its hook is a no-op
    if (ritualQ) completeQuest(ritualQ);
    const def = legendDef();
    const a = Math.random() * 6.2832;
    let bx = 0, bz = 0, ok = false;
    for (let k = 0; k < 20 && !ok; k++) { const r = 14 + Math.random() * 18; bx = S.altar.x + Math.sin(a) * r; bz = S.altar.z + Math.cos(a) * r; if (heightAt(bx, bz) > WATER_Y + 0.9) ok = true; }
    if (!ok) { bx = S.altar.x + 20; bz = S.altar.z; }
    bosses.push(new Boss(S.altar.biome || curLegend().biome, bx, bz, false, def));   // the engine registers legends in `bosses`
    pool.burst(V3(S.altar.x, heightAt(S.altar.x, S.altar.z) + 1.4, S.altar.z), 40, def.glow, 2.6, 4, 3.4);
    audio.growlVar('aggressive'); music.fanfare();
    toast(`🪨 You channel the awakening… ${def.name} rises from ${curLegend().territory}!`, true);
    save(); questHudDirty = true;
  };

  /* ---------- timer (speedrun law: it never rewinds; pause is honest) ---------- */
  const elapsed = () => Math.max(0, (performance.now() - (S.runT0 || performance.now()) - (S.pausedAcc || 0) - (S.pausedAt ? (performance.now() - S.pausedAt) : 0)) / 1000);
  const fmt = s => { s = Math.max(0, s | 0); const h = (s / 3600 | 0), m = ((s % 3600) / 60 | 0), ss = s % 60; return (h > 0 ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };
  const onPause = () => { if (!S.pausedAt) S.pausedAt = performance.now(); };
  let armed = false;
  const arm = () => {   // the campaign owns the board from the first play tick
    if (armed) return;
    armed = true;
    if (!S.runT0) S.runT0 = performance.now() - (S.pausedAcc || 0);
    QUESTS.avail.length = 0;   // drop the legacy first-deeds board (built before p5 loaded)
    for (const q of [...QUESTS.active]) if (!q.camp) QUESTS.active.splice(QUESTS.active.indexOf(q), 1);
    refill(); save(); questHudDirty = true;
  };
  const onResume = () => {
    arm();
    if (S.pausedAt) { S.pausedAcc += performance.now() - S.pausedAt; S.pausedAt = null; }
    if (!QUESTS.avail.length && !QUESTS.active.length) refill();   // the board greets the first play
    questHudDirty = true;
    save();
  };
  const hud = () => {
    const t = Math.round(elapsed());
    let h = `<div class="qt-line" style="color:#ffd76a">🏆 Tier <b>${S.tier}</b> · <b>${legendName()}</b> · ⏱ ${fmt(t)}</div>`;
    if (S.stage === 'prep' && S.prepDone > 0) h += `<div class="qt-line" style="opacity:.9">📜 Preparation ${S.prepDone}/${prepNeed(S.tier)}</div>`;
    if (S.stage === 'prep') { const g = xpGate(S.tier, S.leg); h += `<div class="qt-line" style="opacity:.8">⚜ ${S.xp}/${g} campaign XP</div>`; }
    return h;
  };
  const mapMarks = () => {
    const out = [];
    if (S.stage === 'prep' || S.stage === 'awaken' || S.stage === 'boss') {
      const t = resolveTerritory();
      if (t) out.push({ x: t.x, z: t.z, color: '#' + curLegend().glow.toString(16).padStart(6, '0'), ring: 130 });
      if (S.altar && (S.stage === 'awaken' || S.stage === 'boss')) out.push({ x: S.altar.x, z: S.altar.z, color: '#ffd76a' });
    }
    return out;
  };

  /* ---------- tick: progress, deadlines, deltas, altar pulse, autosave ---------- */
  let acc = 0;
  const tick = dt => {
    if (!S) return;
    arm();   // first play tick: claim the board for the campaign (covers autostart too)
    acc += dt;
    if (alt) { alt.mesh.rotation.y += dt * 0.6; if (alt.halo) alt.halo.material.opacity = 0.38 + 0.2 * Math.sin(tSec * 3.2); }
    if (acc < 0.5) return;
    acc = 0;
    if (!S.runT0) return;
    // ambient campaign XP: hunts & discoveries trickle in (quest XP stays primary)
    if (typeof RUN !== 'undefined' && RUN.kills > lastKills) { campXp((RUN.kills - lastKills) * 3); lastKills = RUN.kills; }
    if (typeof stats !== 'undefined' && stats.discoveries && stats.discoveries.size > lastDsc) { campXp((stats.discoveries.size - lastDsc) * 4); lastDsc = stats.discoveries.size; }
    // the active deed's own progress
    for (const q of [...QUESTS.active]) {
      if (!q.camp) continue;
      if (q.kind === 'xp') { q.have = Math.min(q.need, Math.max(0, S.xp - q.base)); if (q.have >= q.need) completeQuest(q); else questHudDirty = true; }
      else if (q.kind === 'travel') { q.have = Math.min(q.need, Math.max(0, wolf.distance - (q.fromDist || wolf.distance))); if (q.have >= q.need) completeQuest(q); else questHudDirty = true; }
      else if (q.kind === 'scout') { const d = dist(q.wp.x, q.wp.z); q.have = d < 40 ? 1 : 0; if (q.have >= q.need) completeQuest(q); }
      else if (q.kind === 'ritual') { const d = dist(q.wp.x, q.wp.z); if (d < 4 && !q._prompted) { q._prompted = true; toast('🪨 Press E to channel the awakening'); } }
      if (q.timed && q.kind === 'hunt' && tSec > q.deadline) {   // the clock is the hunt's law
        toast(`⏳ Hunt failed — the ${curLegend().key} does not wait for slow hunters.`); abandonQuest(q.id); rebuildBoard(); save();
      }
    }
    autosaveT += dt;
    if (autosaveT > 60) { autosaveT = 0; save(); }
    if (hudT === undefined || performance.now() - hudT > 1000) { hudT = performance.now(); questHudDirty = true; }
  };

  /* ---------- trophies screen (Home menu) ---------- */
  const showTrophies = () => {
    ui.overlay.classList.remove('hidden');
    ui.overlay.dataset.mode = 'trophies';
    ui.ovTitle.textContent = '🏆 TROPHIES';
    let h = `<div style="font-size:14px;margin:6px 0 14px">PLAYER: <input id="plName" maxlength="14" value="${(S.name || '').replace(/"/g, '&quot;')}" style="width:150px;padding:4px 8px;font:13px monospace;border:1px solid #2c3a46;background:#0d141c;color:#dfeee6;border-radius:6px"></div>`;
    h += '<div style="font:12px monospace;color:#9fb4c4;margin-bottom:8px">━━━━━━━━━━━━━━━━━━━━━━</div>';
    const top = Math.max(S.tier, S.trophies.length + 1, Object.keys(S.best).length ? Math.max(...Object.keys(S.best).map(Number)) : 1);
    for (let t = 1; t <= top; t++) {
      const tr = S.best[t];
      if (tr) h += `<div style="margin:8px 0;font:13px monospace;color:#ffd76a">🏆 TIER ${t} <span style="color:#8fe6b0">Completed</span><br><span style="color:#cfe3d0;margin-left:20px">Time: ${fmt(tr.t)} · ${tr.date} · ${tr.name}</span></div>`;
      else h += `<div style="margin:8px 0;font:13px monospace;color:#5c6f7c">🔒 TIER ${t} <span style="color:#5c6f7c">Not completed</span></div>`;
    }
    h += '<div style="font:12px monospace;color:#9fb4c4;margin:12px 0 8px">━━━━━━━━━━━━━━━━━━━━━━</div><div style="font:13px monospace;color:#ffe9b0">BEST TIER TIME</div>';
    const all = Object.values(S.best);
    h += `<div style="font:20px monospace;color:#fff">${all.length ? fmt(Math.min(...all.map(b => b.t))) : '—'}</div>`;
    h += `<div style="margin-top:18px"><button class="btn" id="btnTrophiesBack">BACK</button></div>`;
    ui.ovBody.innerHTML = h;
    el('btnTrophiesBack').onclick = () => showOverlay('start');
    el('plName').addEventListener('change', e => { S.name = e.target.value.trim() || 'Wolf'; save(); });
    if (typeof audio !== 'undefined' && audio.uiClick) audio.uiClick();
  };

  /* ---------- public face ---------- */
  window.CAMPDBG = {
    state: () => JSON.parse(JSON.stringify(S)),
    grantXp: n => { campXp(n); },
    setStage: s => { S.stage = s; refill(); save(); },
    setLeg: n => { S.leg = n; },
    terr: () => resolveTerritory(), altar: () => S.altar, elapsed: () => elapsed(), fmt,
    reset: () => { S = fresh(); S.runT0 = performance.now(); save(); refill(); }
  };
  const onMenuRefresh = () => {   // the start page: ask for a name until the wolf has one
    const r = el('nameRow');
    if (r) r.style.display = S.name ? 'none' : 'block';
    const i = el('plName2');
    if (i && !i.value && S.name) i.value = S.name;
  };
  /* menu delegation — the start template is re-injected, listeners below survive it */
  document.addEventListener('click', e => {
    if (!e.target || !e.target.id) return;
    if (e.target.id === 'btnTrophies') showTrophies();
    else if (e.target.id === 'btnStart') {
      const i = el('plName2');
      if (i && i.value && i.value.trim()) S.name = i.value.trim().slice(0, 14);
      else if (!S.name) S.name = 'Wolf';
      save();
    }
  });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'plName2') { const r = el('nameRow'); if (r) r.style.display = 'none'; } });

  return {
    on: () => true,
    init: () => { load(); },
    refill, tick, hud, mapMarks, onEvent, onQuestComplete, onAccept, onAbandon, onDeath,
    onPause, onResume, nearAltar, ritualReady, useAltar, showTrophies, legendName, legendDef, state: () => S, save, fmt, onMenuRefresh
  };
})();
if (window.CAMP && window.CAMP.init) window.CAMP.init();
