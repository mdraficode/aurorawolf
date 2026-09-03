/* ============================================================================
   🏁 THE SPEEDRUN ROUTER — "play the game yourself, as an efficient human"
   ----------------------------------------------------------------------------
   This file is the *player*: every decision here is a speedrunner's decision
   (which deed to take, when to sprint, when to disengage, how to kill a Legend).
   The hands are test/speedrun/human.mjs (real keys + real mouse + real clicks);
   no bot, no neural brain, no autopilot, no CAMPDBG shortcuts — the run starts
   at the main menu with an empty save and ends at the TIER 1 TROPHY (or the cap).

   ROUTES (the lines a human can take — run each, rank by the GAME clock):
     rush   — deed-minimal: always the cheapest deed, never the XP gate, no pack
     iron   — over-level: take the XP gate + side errands, heal to full, then fight
     pack   — rush line + howl for a bonded pack before every Legend (intercept)
     hunt   — meat line: prefer hunt/harvest deeds (kills pay XP + meat), fight early

   usage:
     node test/speedrun/run.mjs --route=rush --seed=7777 --cap=3600
     node test/speedrun/run.mjs --route=iron --seed=7777 --cap=3600 --speed=8 --rate=3
     node test/speedrun/run.mjs --probe            # 6-minute shakedown of the rig
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { boot, sleep, wrapPI, bearingTo, OUT, HERE } from './human.mjs';

/* ------------------------------------------------------------------ cli ---- */
const arg = (k, d) => { const m = new RegExp(`--${k}=([^\\s]+)`).exec(process.argv.join(' ')); return m ? m[1] : d; };
const flag = k => process.argv.includes(`--${k}`);
const ROUTE = arg('route', 'rush');
const SEED = arg('seed', '7777');
const CAP = +arg('cap', 3600);            // SIM seconds — "an hour of the game"
const SPEED = +arg('speed', 8);           // fast-forward: 8 sim steps per batch
const RATE = +arg('rate', 3);             // ~2.7–3 sim-seconds per wall-second
const RE = +arg('re', 10);                // render every 10th batch (headless speed)
const PROBE = flag('probe');
const PWALL = +arg('pwall', 420);          // probe mode: wall seconds before it gives up
const TAG = arg('tag', ROUTE + '-' + SEED);
const FIGHT_TAC = arg('fighttac', 'park');   // park = probe_fight v25 PARK grammar (52 s kill, net -18 hp at L12); ring = band walk-ring; v20 = dip

/* ------------------------------------------------- the router's knowledge --- */
const WOLF_WALK = 7, WOLF_SPRINT = 13.5;
const isRush = ROUTE === 'rush', isIron = ROUTE === 'iron', isPack = ROUTE === 'pack', isHunt = ROUTE === 'hunt';
const FIGHT_LVL = +arg('fightlvl', isIron ? 5 : 0);   // iron: the walk-ring grammar is winnable from the natural awaken level (L5: net ~1.4/s over a 45 s kill = 61 of 140 hp); the L8+ protocol was for the old dagger-bite play

/* my estimate of what a deed costs, in sim-seconds — a human reads the board and
   the land together: "two rabbits here" is cheap, "survive a day" is four minutes. */
function costOf(q, e) {
  const near = (x, z) => Math.hypot(x - e.w.x, z - e.w.z);
  const travel = d => d / WOLF_SPRINT + 4;
  switch (q.kind) {
    case 'survive': return 240 * (q.need || 1) + 10;                    // a day is 240 s — never first pick
    case 'xp': {
      const gap = Math.max(0, (q.need || 0) - (q.have || 0));
      if (isIron) return 40 + gap * 0.55;                                // iron WANTS the level
      return 200 + gap * 1.5;                                            // rush avoids the grind
    }
    case 'scout': { const wp = q.wp || (e.camp.terr || { x: e.w.x, z: e.w.z }); return travel(near(wp.x, wp.z)) * 1.1; }
    case 'ritual': { const wp = q.wp || (e.camp.altar || { x: e.w.x, z: e.w.z }); return travel(near(wp.x, wp.z)); }
    case 'harvest': {
      const prey = e.animals.filter(a => a.hp <= 4);
      const d = prey.length ? Math.min(...prey.map(p => p.d)) : 400;
      return (q.need - q.have) * (isHunt ? 16 : 24) + travel(d);
    }
    case 'herbal':
    case 'collect': {
      const items = q.kind === 'herbal' ? ['herb', 'mushroom'] : [q.item];
      const pk = e.pickups.filter(p => items.includes(p.i));
      const d = pk.length ? Math.min(...pk.map(p => p.d)) : 500;
      const each = pk.length ? 9 : 40;
      return (q.need - q.have) * each + travel(d) + (pk.length ? 0 : 180);   // no supply nearby = a trek
    }
    case 'hunt': {
      const prey = e.animals.filter(a => !q.species || a.k === q.species);
      const d = prey.length ? Math.min(...prey.map(p => p.d)) : 500;
      const each = (q.side ? 14 : 18) + (prey.length ? 0 : 40);
      return (q.need - q.have) * each + travel(d);
    }
    case 'explore': {
      if (q.peak) return 900;                                            // a 50 m throne is a mountain trek
      const lm = e.landmarks.filter(l => !l.found && (!q.lm || l.ty === q.lm));
      const d = lm.length ? Math.min(...lm.map(l => l.d)) : 900;
      return travel(d) + (q.need - q.have) * (lm.length ? 12 : 90);
    }
    case 'combat': {
      const pr = e.preds.filter(p => !p.isBoss);
      const d = pr.length ? Math.min(...pr.map(p => p.d)) : 900;
      return travel(d) + (q.need - q.have) * 70 + 120;                   // fighting a wild hunter is a gamble
    }
    default: return 600;
  }
}
function pickDeed(avail, e) {
  const main = avail.filter(q => !q.side);
  if (!main.length) return null;
  const scored = main.map(q => ({ q, c: costOf(q, e) }));
  scored.sort((a, b) => a.c - b.c);
  return scored[0].q;
}
function pickSide(avail, e) {
  const s = avail.filter(q => q.side).map(q => ({ q, c: costOf(q, e) })).sort((a, b) => a.c - b.c);
  return s.length ? s[0].q : null;
}

/* ------------------------------------------------------------------ run ---- */
const S = await boot({ seed: SEED, speed: PROBE ? 8 : SPEED, rate: PROBE ? 3 : RATE, re: RE, name: 'ROUTER', quality: 'low' });
const { page, human: H, errors, warns } = S;
console.log(`\n🏁 SPEEDRUN · route=${ROUTE} seed=${SEED} cap=${CAP}s sim · boost ${SPEED}/${RATE}/${RE}`);
console.log(`   ${S.url}`);
console.log(`   menu name prompt visible: ${S.menuNamePrompt}`);

const rep = {
  route: ROUTE, seed: +SEED, cap: CAP, boost: { speed: SPEED, rate: RATE, re: RE },
  startedAt: new Date().toISOString(), url: S.url,
  legs: [], bosses: [], deeds: [], deaths: [], milestones: [],
  outcome: null, clock: null, wall: null, trophy: null, menuNamePrompt: S.menuNamePrompt
};
/* RIG FIX (probe-rush wrote 28 851 trace lines in 420 s): a step note is only worth
   keeping when something CHANGED — otherwise the report is 12 MB of 'explore:none'. */
let lastNote = '', lastNoteT = -99;
const mark = (type, data, force) => {
  const sig = type + JSON.stringify(data && data.r || '') + (data && data.kind || '');
  if (!force && sig === lastNote && H.wall() - lastNoteT < 12) { rep.droppedNotes = (rep.droppedNotes || 0) + 1; return null; }
  lastNote = sig; lastNoteT = H.wall();
  const e = H.note(type, data);
  rep.milestones.push(Object.assign({ sim: lastSim }, e));
  if (rep.milestones.length > 6000) rep.milestones.splice(0, 2000);
  return e;
};
let lastSim = 0, lastLeg = -1, lastStage = '', deedT0 = 0, simT0 = null;
let fight = null, deedFails = 0, lastDeedR = '', healWait = 0;

/* --fightlab: skip the campaign and drop a Legend on the router's head immediately
   (debugging the fight in isolation — a scored run never uses this) */
if (flag('fightlab')) {
  const labLeg = +arg('labLeg', 0), labTier = +arg('labTier', 1);
  const lab = await page.evaluate(({ labLeg, labTier }) => {
    const S = window.CAMP.state();
    S.leg = labLeg; S.tier = labTier; S.stage = 'boss';
    const def = window.CAMP.legendDef();
    for (const ch of chunks.values()) {
      for (const arr of ['animals', 'predators'])
        for (let i = ch[arr].length - 1; i >= 0; i--) {
          const a = ch[arr][i];
          if (Math.hypot(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z) > 80) continue;
          ch[arr].splice(i, 1); try { a.dispose(); } catch (e) { }
        }
    }
    const x = wolf.pos.x + 14, z = wolf.pos.z;
    bosses.push(new Boss(def.camp === 'beast' ? 'enchanted' : 'forest', x, z, false, def));
    return { boss: def.name, hp: def.hp, dmg: def.dmg, scale: def.scale, speed: def.speed };
  }, { labLeg, labTier });
  mark('fightlab', lab, true);
  console.log('   🧪 fightlab: ' + JSON.stringify(lab));
}


/* ---- the Legend protocol: what a human does once the altar wakes the beast ----
   THE BLIND-SIDE RING, flown with fast hands (EYES_FIGHT + aimFast, no sleeps).

   The grammar the fixed game teaches (probe_boss_dps.mjs measures all of it):
     · a Legend turns 2.2 rad/s at a CONSTANT rate → a wolf sprinting a 3.9 m ring is
       3.5 rad/s and is never caught; walk (1.8 rad/s) and it holds your bearing;
     · its swing is telegraphed 0.55 s (biteT) and only lands inside a ~78° arc of
       where its nose ends up → keep orbiting and it bites air;
     · MY bite needs the Legend inside MY 78° cone, and my nose always eases toward my
       movement direction → a clean tangent (nose 90° off) can never bite. So I fly a
       ZIGZAG ring: cut 15-25° inside the tangent when the ring is too wide, push the
       same angle out when it is too tight. Nose ~70° off the Legend = inside my cone,
       tangential speed still ~12.8 m/s = 3.2 rad/s = still faster than it turns.
     · a Legend has no `aware` field, so a behind bite is always an AMBUSH:
       (3 behind + 1 ambush) × 1.5 = 6 damage a swing — 7.5 prowling, 9 with Deep Bite.
     · stamina is the real clock: 15/s out, 11/s back. Sprint the ring while it lasts,
       and when it runs out TIGHTEN the ring (ω = v/r, so a walking wolf at 2.8 m still
       out-turns 2.2 rad/s) instead of breaking off — breaking off is what gets you eaten.
   Decision latency is the enemy: at a 3× boost every 100 ms of wall time is 0.3 s of
   game time = 4 m of sprint. The fight therefore reads the cheap eyes, aims with the
   camYaw it just read (no extra round trip), and never sleeps between polls.        */
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
let fightMarkT = -99;
async function fightLoop(e0) {
  let travel = 1.6, lastDist = null, lastCam = null, side = (fight && fight.side) || 1;
  let guard = 0;
  for (;;) {
    if (++guard > 4000) return 'guard';
    const f = await H.eyesFight();
    if (!f || !f.ok) { await sleep(120); continue; }
    lastSim = f.clock;
    /* adaptive step: how far the wolf actually travels between two decisions */
    if (lastDist !== null) { const dStep = Math.max(0, f.w.dist - lastDist); if (dStep > 0.05 && dStep < 12) travel = travel * 0.7 + dStep * 0.3; }
    lastDist = f.w.dist;

    if (!fight || fight.name !== (f.bosses[0] && f.bosses[0].n)) {
      const b0 = f.bosses.sort((a, c) => (a.clone ? 1 : 0) - (c.clone ? 1 : 0))[0];
      fight = { name: b0 ? b0.n : '?', t0: f.t, sim0: f.clock, hp0: f.w.hp, bites: 0, swings: 0, hits: 0, dmgTaken: 0,
        behind: 0, face: 0, flank: 0, fled: 0, windEscapes: 0, spent: 0, side, leg: f.camp.leg, tier: f.camp.tier,
        rSum: 0, rN: 0, fmSum: 0, bossHp0: b0 ? b0.hp : 0 };
      fight.dip = 0; fight.struck = false; fight.prevWind = 0; fight.radOut = false; fight.holdN = 0; fight.lastCut = -9;
      mark('boss-start', { boss: fight.name, hp: b0 && b0.mhp, dmg: b0 && b0.dmg, spd: b0 && b0.spd, flight: b0 && b0.flight, wolfHp: f.w.hp, wolfLvl: f.w.lvl, travel: +travel.toFixed(2), tac: FIGHT_TAC }, true);
      fightMarkT = f.clock;
    }
    const F = fight;
    /* telemetry every ~4 s of game time — the fight is the only place a step log earns its keep */
    if (f.clock - fightMarkT > 4) {
      fightMarkT = f.clock;
      const b = f.bosses[0];
      mark('fight', { boss: F.name, bhp: b && b.hp, r: F.rN ? +(F.rSum / F.rN).toFixed(1) : null, fm: F.rN ? +(F.fmSum / F.rN).toFixed(2) : null,
        behindPct: F.bites ? Math.round(F.behind / F.bites * 100) : 0, bites: F.bites, dmgPerBite: F.bites ? +((F.bossHp0 - (b ? b.hp : 0)) / F.bites).toFixed(1) : 0,
        hits: F.hits, dmgTaken: +F.dmgTaken.toFixed(0), whp: f.w.hp, stam: f.w.stam, travel: +travel.toFixed(2), clock: f.clock }, true);
      F.rSum = 0; F.rN = 0; F.fmSum = 0;
    }
    /* the wolf fell: let the wake-up happen, then the router re-plans */
    if (f.w.deadT > 0) { await H.releaseAll(); await sleep(700); F.mode = 'dead'; return 'dead'; }
    /* the Legend is down */
    if (!f.bosses.length) { await H.move({}); F.mode = 'slain'; return 'slain'; }

    /* target the real Legend (clones are the Beast Master's echoes — bite them only if they are on top of me) */
    const real = f.bosses.filter(b => !b.clone);
    const b = (real.length ? real : f.bosses).sort((a, c) => a.d - c.d)[0];
    F.rSum += b.d; F.rN++; F.fmSum += b.facingMe; F.mode = 'ring';
    const toB = bearingTo(f.w.x, f.w.z, b.x, b.z);
    const r = b.d;

    /* --- health line: a human breaks off, sprints clear, and lets the 3 hp/s regen work --- */
    const fleeHp = Math.max(30, f.w.maxHp * (isIron ? 0.36 : 0.32));
    if (f.w.hp < fleeHp && b.d < 30 && f.w.stam >= 15) {
      F.fled++; F.mode = 'flee';
      await H.aimFast(toB + Math.PI, f.cam);
      await H.move({ f: true, sprint: f.w.stam > 8 });
      if (f.w.hp < F.hp0 - 1) { F.hits++; F.dmgTaken += F.hp0 - f.w.hp; }
      F.hp0 = f.w.hp;
      continue;
    }
    if (F.mode === 'flee') { F.mode = 'ring'; F.hp0 = f.w.hp; }

    /* --- the Legend's own moves: submerge (surfaces on top of me), charge, the lion's ring --- */
    if (b.sub > 0) {
      F.mode = 'sub';
      await H.aimFast(toB + Math.PI, f.cam);
      await H.move({ f: true, sprint: f.w.stam > 12 });
      continue;
    }
    if (b.charging || b.tac > 0) {
      F.mode = 'dodge';
      await H.aimFast(toB + side * Math.PI / 2, f.cam);
      await H.move({ f: true, sprint: f.w.stam > 10 });
      continue;
    }
    /* --- the Eagle Legend: only strikeable inside the dive --- */
    if (b.flight) {
      if (b.inv) { F.mode = 'sky'; await H.move({}); await H.aimFast(toB, f.cam); continue; }
      F.mode = 'dive';
      await H.aimFast(toB, f.cam);
      await H.move({ f: r > 3.0, sprint: false });
      if (r <= b.biteR && Math.abs(b.y - f.w.y) < 3.4) { F.swings++; if (await H.bite(f.t)) { F.bites++; if (b.facingMe < -0.35) F.behind++; else if (b.facingMe > 0.45) F.face++; else F.flank++; } }
      continue;
    }

    /* --- THE RING: the walk-ring grammar (probe_fight BASE law — the measured winner at
       L12: 45 hp dies in 39-56 s with -37..-48 hp of a 196 hp wolf; the dip/lap grammars
       v19-v24 all LOST to incoming 5.5-6.5). Walk the [1.85, 2.45] band (ω = 7·cos(0.3)/2.05
       ≈ 3.3 rad/s beats the 2.2 neck at every phase); sprint only to cross its arc or
       recover width; press ONLY deep-behind (fm < -0.35 → (3+1 ambush)×1.5 = 6 hp) on the
       2nd poll of a held cut (the yaw is settled) with the cone fresh (nose ≤ 1.15,
       atkCd ≤ 0.1) and the Legend off its plant (wind ≤ 0.30). */
    if (FIGHT_TAC === 'ring') {
      const ag = Math.abs(b.gap);
      const R_LO = 1.85, R_HI = 2.45, R0 = 2.05;
      let cut = 0, sprint = false, mode = 'ring';
      if (b.wind > 0 && ag < 1.42) { cut = Math.PI / 2 - 1.45; sprint = f.w.stam > 12 && !f.w.exh; mode = 'wind'; }
      else if (r > 3.95) { cut = Math.PI / 2 - 0.50; sprint = f.w.stam > 8 && !f.w.exh; mode = 'close'; }
      else {
        if (r <= R_LO) fight.radOut = true; else if (r >= R_HI) fight.radOut = false;
        const wide = r - R0 > 0.75;
        if (wide) { cut = Math.PI / 2 - 0.50; sprint = f.w.stam > 8 && !f.w.exh; }          // badly wide: drive back
        else {
          sprint = (ag < 1.42 || r > 3.30) && f.w.stam > 12 && !f.w.exh;
          const th = sprint ? (ag < 1.42 ? 1.45 : 1.28) : (fight.radOut ? 2.30 : 1.28);
          cut = Math.PI / 2 - th;
        }
        mode = sprint ? 'ring' : 'ring';
      }
      const thNow = Math.PI / 2 - cut;
      fight.holdN = (thNow === fight.lastCut) ? fight.holdN + 1 : 1;
      fight.lastCut = thNow;
      const moveDir = toB + side * thNow;
      await H.aimFast(moveDir, f.cam);
      await H.move({ f: true, sprint });
      const nose = Math.abs(wrapPI(toB - f.w.yaw));
      if (!b.inv && fight.holdN <= 2 && r <= b.biteR && nose <= 1.15 && b.facingMe < -0.35 && b.wind <= 0.30 && f.w.atkCd <= 0.1) {
        F.swings++;
        if (await H.bite(f.t)) { F.bites++; if (b.facingMe < -0.35) F.behind++; else if (b.facingMe > 0.45) F.face++; else F.flank++; }
      }
      if (f.w.hp < F.hp0 - 1) { F.hits++; F.dmgTaken += F.hp0 - f.w.hp; }
      F.hp0 = f.w.hp;
      if (b.facingMe > 0.85 && r < 4.6 && b.wind <= 0) side = -side;   // lapped onto its good side: reverse
      F.side = side; F.mode = mode;
      continue;
    }
    /* --- THE PARK (probe_fight v25 — the only measured WINNER): walk-orbit at the freeze
       radius r_park = 7 / neck (2.77-3.35 m) with the gap parked at dead-behind — the
       strike whiffs every plant (dot -1) and walking regens 11/s, so the park is BOTH the
       recovery and the bite platform (fm < -0.35 -> (3+1 ambush)x1.5 = 6 hp, one press per
       held cut). Arrival: sprint while the tail is far, walk the last stretch, and if the
       wolf enters broken (stam < 15 outside the park) it stands and dies — the death
       respawn is the game's intended full-tank retry. */
    if (FIGHT_TAC === 'park') {
      const ag = Math.abs(b.gap);
      const rPark = Math.min(3.35, Math.max(2.55, 7 / (b.turn || 2.53)));
      const inTail = b.facingMe < -1.5 || (b.facingMe < -0.9 && f.w.stam <= 14);
      const lowStam = f.w.stam <= 14 || f.w.exh;
      let cut, sprint = false, mode = 'ring';
      if (b.wind > 0 && ag < 1.42) { cut = Math.PI / 2 - 1.45; sprint = f.w.stam > 12 && !f.w.exh; mode = 'wind'; }
      else if (r > 3.95) { cut = Math.PI / 2 - 0.50; sprint = f.w.stam >= 25 && !f.w.exh; mode = 'close'; }   // the SHUT-IN: drive past its face (26 m/s closing), its 180° turn hands me the blind side
      else if (inTail && !lowStam) { cut = Math.PI / 2 - (r > rPark + 0.30 ? 1.40 : r < rPark - 0.30 ? 1.75 : 1.57); mode = 'park'; }
      else if (b.facingMe < -1.2) { cut = Math.PI / 2 - 1.57; mode = 'park'; }        // last stretch: walk, no overshoot
      else { sprint = !lowStam; cut = Math.PI / 2 - (sprint ? 1.50 : 1.57); mode = 'ring'; }
      const thNow = Math.PI / 2 - cut;
      fight.holdN = (thNow === fight.lastCut) ? fight.holdN + 1 : 1;
      fight.lastCut = thNow;
      const moveDir = toB + side * thNow;
      await H.aimFast(moveDir, f.cam);
      await H.move({ f: true, sprint });
      const nose = Math.abs(wrapPI(toB - f.w.yaw));
      if (!b.inv && fight.holdN <= 2 && r <= b.biteR && nose <= 1.15 && b.facingMe < -0.35 && b.wind <= 0.30 && f.w.atkCd <= 0.1) {
        F.swings++;
        if (await H.bite(f.t)) { F.bites++; if (b.facingMe < -0.35) F.behind++; else if (b.facingMe > 0.45) F.face++; else F.flank++; }
      }
      if (f.w.hp < F.hp0 - 1) { F.hits++; F.dmgTaken += F.hp0 - f.w.hp; }
      F.hp0 = f.w.hp;
      if (b.facingMe > 0.85 && r < 4.6 && b.wind <= 0) side = -side;
      F.side = side; F.mode = mode;
      continue;
    }
    /* --- THE RING: v20 dip grammar (measured in probe_fight v15-v20) or the sprint ring --- */
    if (FIGHT_TAC === 'v20') {
      const ag = Math.abs(b.gap);
      /* the strike only lands at the wind 0.55->0 instant; the 1.25 s cooldown after it is a
         free bite window (the next plant's strike is 1.8 s away) — bite there, orbit through
         the plant (neck 0.4, gap re-forms), and never close from the front. */
      if (fight.prevWind > 0.02 && b.wind <= 0.02) fight.struck = true;
      else if (b.wind > 0.02 || fight.dip > 0) fight.struck = false;
      fight.prevWind = b.wind;
      let cut = 0, sprint = false;
      const R_LO = 1.85, R_HI = 2.45;
      if (b.wind > 0 && ag < 1.42) { cut = Math.PI / 2 - 1.45; sprint = f.w.stam > 12 && !f.w.exh; fight.dip = 0; F.mode = 'wind'; }
      else if (r > 3.95) { cut = Math.PI / 2 - 0.50; sprint = f.w.stam > 8 && !f.w.exh; fight.dip = 0; F.mode = 'close'; }
      else if (fight.dip > 0) {
        if (fight.dip === 1) { fight.dip = 0; cut = (r < 2.30) ? Math.PI / 2 - 2.30 : Math.PI / 2 - 1.28; }
        else { cut = (fight.dip === 4 || fight.dip === 3) ? Math.PI / 2 - 0.55 : Math.PI / 2 - 2.60; fight.dip--; }
        F.mode = 'ring';
      }
      else if (fight.struck && b.facingMe < -0.35 && f.w.atkCd <= 0.1) { fight.dip = 4; cut = Math.PI / 2 - 0.55; F.mode = 'dip'; }
      else {
        if (r <= R_LO) fight.radOut = true; else if (r >= R_HI) fight.radOut = false;
        sprint = (ag < 1.42 || r > 3.30) && f.w.stam > 12 && !f.w.exh;
        const th = sprint ? (ag < 1.42 ? 1.45 : 1.28) : (fight.radOut ? 2.30 : 1.28);
        cut = Math.PI / 2 - th;
        F.mode = 'ring';
      }
      const moveDir = toB + side * (Math.PI / 2 - cut);
      await H.aimFast(moveDir, f.cam);
      await H.move({ f: true, sprint });
      const nose = Math.abs(wrapPI(toB - f.w.yaw));
      /* the dip gate: press on the second in-poll of the dip (nose ~0.7) — read 1.03 whiffed,
         0.81 landed, so 1.05 is the ceiling; behind it (ambush x1.5), not during its plant. */
      if (!b.inv && fight.dip === 3 && r <= b.biteR && nose <= 1.15 && b.facingMe < -0.35 && b.wind <= 0.30 && f.w.atkCd <= 0.1) {
        F.swings++;
        if (await H.bite(f.t)) { F.bites++; if (b.facingMe < -0.35) F.behind++; else if (b.facingMe > 0.45) F.face++; else F.flank++; }
      }
      if (f.w.hp < F.hp0 - 1) { F.hits++; F.dmgTaken += F.hp0 - f.w.hp; }
      F.hp0 = f.w.hp;
      continue;   // no side swaps in v20: a fixed lap never reverses (manual law v8)
    }
    /* --- THE RING: sprint it while the legs last, tighten it when they don't --- */
    const gassed = f.w.exh || f.w.stam < 8;
    const ringR = gassed ? 2.9 : (b.wind > 0 ? 4.1 : 3.9);   // spent → hug it: ω = v/r must beat 2.2 rad/s
    if (gassed) F.spent++;
    const err = r - ringR;
    /* the zigzag: correct the radius, but never fly flatter than ~15° off the tangent —
       a flat tangent puts the Legend at 90° to my nose and my own bite cone rejects it. */
    let cut = clampN(err * (0.5 + 0.25 / Math.max(0.6, travel)), -0.46, 0.46);
    const MIN = 0.27;
    if (cut > -MIN && cut < MIN) cut = cut >= 0 ? MIN : -MIN;
    if (b.wind > 0) { F.windEscapes++; cut = clampN(cut, -0.12, 0.12); }   // a swing is coming: flatten out and leave its arc
    const moveDir = toB + side * (Math.PI / 2 - cut);
    await H.aimFast(moveDir, lastCam === null ? f.cam : f.cam);
    lastCam = null;
    await H.move({ f: true, sprint: !gassed && !f.w.swim });
    /* swing whenever the game's own cone will accept it (my nose is stale by one poll) */
    const nose = Math.abs(wrapPI(toB - f.w.yaw));
    if (!b.inv && r <= b.biteR + 0.35 && nose < 1.42) {
      F.swings++;
      if (await H.bite(f.t)) {
        F.bites++;
        if (b.facingMe < -0.35) F.behind++; else if (b.facingMe > 0.45) F.face++; else F.flank++;
      }
    }
    if (f.w.hp < F.hp0 - 1) { F.hits++; F.dmgTaken += F.hp0 - f.w.hp; }
    F.hp0 = f.w.hp;
    /* a Legend that has lapped me onto its good side: swap the way round */
    if (b.facingMe > 0.85 && r < 4.6 && b.wind <= 0) side = -side;
    F.side = side;
  }
}

/* ------------------------------------------------------- the search sweep ----
   A deed can stall for an honest reason: the landmark it named has streamed out,
   the herd has moved, the herb patch is spent. A human does not stand still and
   re-read the board 70 times a second — they walk the gold line, and if there is
   no line they sweep outward until something turns up.                       */
let sweepA = 0;
async function searchFor(q, e, why) {
  const g = e.qg;
  if (g && g.d > 12 && g.d < 1400) {
    const r = await H.travelTo(g.x, g.z, { stop: q.kind === 'collect' ? 6 : 14, tmo: 90, why: 'search:' + (g.kind || q.kind) });
    return 'search-line:' + (r.ok ? 'ok' : r.why);
  }
  sweepA += 2.4;                                     // the golden-angle sweep
  const rr = 70 + (sweepA % 5) * 55;
  const x = e.w.x + Math.sin(sweepA) * rr, z = e.w.z + Math.cos(sweepA) * rr;
  const r = await H.travelTo(x, z, { stop: 16, tmo: 60, why: 'sweep' });
  return 'sweep:' + (r.ok ? 'ok' : r.why);
}

/* ---------------------------------------------------------------- the loop -- */
const t0wall = Date.now();
let idle = 0;
try {
  for (;;) {
    const e = await H.eyes(230);
    if (!e || !e.ok) { await sleep(200); if (++idle > 40) { rep.outcome = 'eyes-failed'; break; } continue; }
    idle = 0;
    lastSim = e.clock;
    if (simT0 === null) simT0 = e.t;
    rep.clock = e.clock; rep.wall = +((Date.now() - t0wall) / 1000).toFixed(1);
    rep.state = { tier: e.camp.tier, leg: e.camp.leg, stage: e.camp.stage, lvl: e.w.lvl, xp: e.w.xpTotal, hp: e.w.hp, trophies: e.camp.trophies.length, kills: e.run.kills, quests: e.run.quests, side: e.run.side, dist: e.run.dist };

    /* ---- the win ---- */
    if (e.camp.trophies.length >= 1) {
      rep.outcome = 'TROPHY';
      rep.trophy = e.camp.trophies[0];
      mark('TROPHY', { tier: e.camp.trophies[0].tier, time: e.camp.trophies[0].time, clock: e.clock, lvl: e.w.lvl, xp: e.w.xpTotal });
      break;
    }
    if (e.clock > CAP) { rep.outcome = 'cap'; mark('cap', { clock: e.clock, stage: e.camp.stage, leg: e.camp.leg }); break; }
    if (PROBE && H.wall() > PWALL) { rep.outcome = 'probe-end'; break; }

    /* ---- leg/stage bookkeeping ---- */
    if (e.camp.leg !== lastLeg || e.camp.stage !== lastStage) {
      if (lastStage === 'boss' && fight) {
        fight.simS = +(lastSim - fight.sim0).toFixed(1);
        rep.bosses.push(fight);
        mark('boss-end', { boss: fight.name, bites: fight.bites, swings: fight.swings, behind: fight.behind, face: fight.face, fled: fight.fled, simS: fight.simS, stage: e.camp.stage }, true);
        fight = null;
      }
      mark('stage', { leg: e.camp.leg, stage: e.camp.stage, clock: e.clock, lvl: e.w.lvl, hp: e.w.hp });
      lastLeg = e.camp.leg; lastStage = e.camp.stage; deedT0 = e.clock;
    }

    /* ---- dead? the deed is lost: wait for the wake-up, then re-plan ---- */
    if (e.w.deadT > 0) {
      await H.releaseAll();
      rep.deaths.push({ clock: e.clock, cause: e.run.cause, leg: e.camp.leg, stage: e.camp.stage, lvl: e.w.lvl });
      mark('death', { cause: e.run.cause, clock: e.clock });
      await sleep(1400);
      continue;
    }

    /* ---- a Legend is loose: the fight owns everything ---- */
    if (e.camp.stage === 'boss' && e.bosses.length) {
      const res = await fightLoop(e);
      if (fight) {
        fight.simS = +(lastSim - fight.sim0).toFixed(1);
        fight.mode = res;
        rep.bosses.push(fight);
        mark('boss-end', { boss: fight.name, res, bites: fight.bites, swings: fight.swings, behind: fight.behind, flank: fight.flank, face: fight.face,
          dmgPerBite: fight.bites ? +((fight.bossHp0) / fight.bites).toFixed(1) : 0,
          hits: fight.hits, dmgTaken: +fight.dmgTaken.toFixed(0), fled: fight.fled, windEscapes: fight.windEscapes,
          spentPolls: fight.spent, simS: fight.simS, stage: e.camp.stage, clock: lastSim }, true);
        fight = null;
      }
      continue;
    }
    if (e.camp.stage === 'boss' && !e.bosses.length) { await sleep(300); continue; }

    /* ---- hunters on my back while I work: a human breaks off and runs ---- */
    const hunter = e.preds.find(p => !p.isBoss && p.threat && p.d < 40 && p.lvl >= e.w.lvl - 1);
    if (hunter && e.w.hp < e.w.maxHp * 0.55) {
      const away = bearingTo(hunter.x, hunter.z, e.w.x, e.w.z);
      await H.aim(away); await H.move({ f: true, sprint: e.w.stam > 10 });
      await sleep(H.poll * 3);
      continue;
    }

    /* ---- AWAKEN: walk to the altar and channel it (E) ---- */
    if (e.camp.stage === 'awaken') {
      /* IRON LEVEL GATE (v20 route lesson): at L5-8 the fight is mathematically lost — 140 hp
         vs 14-dmg claws, ~8 behind-bites needed at 0.75 s each while taking 15-20 hits (probe
         + two iron runs: 0 damage dealt, 5 deaths). Grind the board instead: any NON-ritual
         main deed (xp gates first), side errands when a gate is open, until FIGHT_LVL. */
      if (isIron && e.w.lvl < FIGHT_LVL) {
        /* IRON GRIND v3 — the board at 'awaken' only carries the ritual until it is accepted,
           so: park the ritual (it is the gate, not a deed), then side errands (the xp channel),
           then plain wild hunts (kills pay xp: 6-12 each), and log every branch so a silent
           spin can never hide again. */
        if (!e.q.active.some(q => q.kind === 'ritual')) {
          const rq = e.q.avail.find(q => q.kind === 'ritual');
          if (rq) { const ok = await H.accept(rq.id); mark('iron-grind-park-ritual', { ok, clock: e.clock }); await sleep(150); continue; }
        }
        const sideQ = pickSide(e.q.avail, e);
        if (sideQ) { const ok = await H.accept(sideQ.id); if (ok) { const r = await doDeed(sideQ, e); mark('iron-grind-side', { id: sideQ.id, title: sideQ.title, r: r || '', have: sideQ.have, need: sideQ.need, lvl: e.w.lvl, clock: e.clock }); } else mark('iron-grind-side-fail', { id: sideQ.id, clock: e.clock }); continue; }
        /* board dry: hunt the wild — any prey, kills pay xp */
        const h = await H.huntOne(undefined, { tmo: 45 });
        mark('iron-grind-hunt', { ok: h.ok, why: h.why || '', lvl: e.w.lvl, xp: e.w.xpTotal, clock: e.clock });
        if (!h.ok && h.why !== 'timeout') await sleep(900);
        continue;
      }
      const rq = e.q.active.find(q => q.kind === 'ritual') || e.q.avail.find(q => q.kind === 'ritual');
      if (!rq) { const any = e.q.avail[0]; if (any) { await H.accept(any.id); mark('accept', { id: any.id, title: any.title, kind: any.kind, clock: e.clock }); } await sleep(200); continue; }
      if (!e.q.active.some(q => q.kind === 'ritual')) {
        const ok = await H.accept(rq.id);
        mark('accept', { id: rq.id, title: rq.title, kind: 'ritual', ok, clock: e.clock });
        continue;
      }
      const altar = rq.wp || e.camp.altar;
      if (!altar) { await sleep(300); continue; }
      /* TOP-UP FIRST — a human does not channel a trial tired. The travel sprints the last
         stretch (the wolf arrived at every boss-start at stam 8-16 — this block used to sit
         AFTER the d<3.2 channel, i.e. dead code on the actual path). Standing rest beside a
         predator is suicide, so rest only clear of one (walk away if it is within 26 m). */
      if ((isIron || isPack) && (e.w.hp < e.w.maxHp * 0.90 || e.w.stam < 80) && healWait < 40) {
        healWait++;
        const pr = (e.animals || []).filter(a => a.kind === 'predator' || a.danger).sort((a2, b2) => a2.d - b2.d)[0];
        if (pr && pr.d < 26) await H.aim(bearingTo(e.w.x, e.w.z, pr.x, pr.z) + Math.PI);
        await H.move(pr && pr.d < 26 ? { f: true, sprint: e.w.stam > 30 } : {});
        await sleep(700); continue;
      }
      healWait = 0;
      /* arena hygiene: a wild predator sharing the altar gets the fight lost before it starts
         (seed 7777: 8 of 13 hits came from a lion OUTSIDE the Legend's 4.59 m reach). Walk
         away until the area is clean — Legends are unleashed, but mobs are not. */
      const nearPred = e.preds.find(pp => !pp.isBoss && pp.d < 30);
      if (nearPred && e.w.hp > e.w.maxHp * 0.6) {
        const away = bearingTo(nearPred.x, nearPred.z, e.w.x, e.w.z);
        await H.aim(away); await H.move({ f: true, sprint: false }); await sleep(H.poll * 3);
        continue;
      }
      const d = Math.hypot(altar.x - e.w.x, altar.z - e.w.z);
      if (d < 3.2) { await H.move({}); await H.aim(bearingTo(e.w.x, e.w.z, altar.x, altar.z)); await H.tap('KeyE'); mark('ritual', { d: +d.toFixed(1), stam: e.w.stam, hp: e.w.hp, clock: e.clock }); await sleep(600); continue; }
      if (isPack && e.w.lvl >= 4 && e.w.hp > e.w.maxHp * 0.75 && !e.pack) { await H.tap('KeyH'); mark('howl', { clock: e.clock }); await sleep(400); }
      await H.travelTo(altar.x, altar.z, { stop: 2.6, tmo: 260, why: 'altar' });
      continue;
    }

    /* ---- q0 / q1 / prep: take a deed and do it ---- */
    const main = e.q.active.find(q => !q.side);
    const sideQ = e.q.active.find(q => q.side);

    /* side errands: the fast-XP channel — only while an XP gate is active */
    if (main && main.kind === 'xp' && (isIron || isHunt)) {
      const gap = (main.need || 0) - (main.have || 0);
      if (!sideQ && gap > 20) {
        const s = pickSide(e.q.avail, e);
        if (s) { const ok = await H.accept(s.id); mark('accept-side', { id: s.id, title: s.title, ok, gap, clock: e.clock }); continue; }
      }
      if (sideQ) { const r = await doDeed(sideQ, e); if (r) mark('deed-step', { kind: sideQ.kind, side: true, r, have: sideQ.have, need: sideQ.need, clock: e.clock }); continue; }
    }
    if (!main) {
      const q = pickDeed(e.q.avail, e);
      if (q) { const ok = await H.accept(q.id); mark('accept', { id: q.id, title: q.title, kind: q.kind, cost: +costOf(q, e).toFixed(0), ok, clock: e.clock }); }
      else {
        /* nothing on the board — a human waits a beat (the board refills) */
        await sleep(600);
        if (e.clock - deedT0 > 60) mark('board-empty', { clock: e.clock, stage: e.camp.stage });
      }
      continue;
    }
    /* the deed is taking absurdly long → set it aside and take another */
    if (e.clock - deedT0 > (main.kind === 'xp' ? 900 : 420)) {
      mark('deed-abandon', { kind: main.kind, title: main.title, spent: +(e.clock - deedT0).toFixed(0), clock: e.clock });
      await H.setAside(main.id);
      deedT0 = e.clock;
      continue;
    }
    const r = await doDeed(main, e);
    /* a step that made no progress is a SEARCH cue, not a reason to spin in place */
    const stalled = r && /(none|no-prey|no-supply|nowp|noaltar|too-risky|unreachable|stuck|timeout)/.test(r);
    const good = r && /(-ok|accepted|channeled|walk|search)/.test(r) && !stalled;
    if (r !== lastDeedR || !stalled) mark('deed-step', { kind: main.kind, r, have: main.have, need: main.need, clock: e.clock });
    lastDeedR = r;
    if (good) deedFails = 0;
    else if (stalled) {
      deedFails++;
      if (deedFails === 2 || deedFails === 4) { const sr = await searchFor(main, e, r); mark('deed-search', { kind: main.kind, r: sr, n: deedFails, clock: e.clock }); }
      if (deedFails >= 6) {
        mark('deed-abandon', { kind: main.kind, title: main.title, reason: 'stalled x' + deedFails, r, clock: e.clock });
        await H.setAside(main.id);
        deedFails = 0; deedT0 = e.clock;
      }
    }
  }
} catch (err) {
  rep.outcome = 'crash'; rep.error = String(err && err.stack || err).slice(0, 600);
  console.log('💥 router crash:', rep.error);
}

/* ------------------------------------------------------------- deed skills -- */
async function doDeed(q, e) {
  switch (q.kind) {
    case 'hunt': {
      const r = await H.huntOne(q.species, { tmo: 100 });
      if (!r.ok) {
        if (r.why === 'no-prey') return 'hunt:' + await searchFor(q, e, r.why);   // follow the line to the herd
        await sleep(300); return 'hunt:' + r.why;
      }
      return 'hunt-ok';
    }
    case 'collect':
    case 'herbal': {
      const items = q.kind === 'herbal' ? ['herb', 'mushroom'] : [q.item];
      const r = await H.gatherOne(items, { tmo: 90 });
      if (!r.ok) {
        /* no supply in sight: walk a search pattern (a human sweeps the land) */
        const a = Math.random() * 6.2832, rr = 90 + Math.random() * 90;
        await H.travelTo(e.w.x + Math.sin(a) * rr, e.w.z + Math.cos(a) * rr, { stop: 12, tmo: 60, why: 'search' });
        return 'gather:' + r.why;
      }
      return 'gather-ok';
    }
    case 'harvest': {
      const prey = e.animals.filter(a => a.hp <= 4).sort((a, b) => a.d - b.d)[0];
      if (!prey) { const a = Math.random() * 6.2832; await H.travelTo(e.w.x + Math.sin(a) * 120, e.w.z + Math.cos(a) * 120, { stop: 14, tmo: 70, why: 'search-meat' }); return 'harvest:search'; }
      const r = await H.huntOne(prey.k, { tmo: 100 });
      return r.ok ? 'harvest-ok' : 'harvest:' + r.why;
    }
    case 'explore': {
      if (q.peak) {
        /* a 50 m throne: head for the highest ground the eye can find */
        const hi = await page.evaluate(() => {
          let best = null;
          for (let k = 0; k < 32; k++) { const a = k / 32 * 6.2832; for (const r of [60, 140, 240, 380, 560]) { const x = wolf.pos.x + Math.sin(a) * r, z = wolf.pos.z + Math.cos(a) * r; const h = heightAt(x, z); if (h > 50.5) { if (!best || h > best.h) best = { x, z, h }; } } }
          return best;
        });
        if (!hi) return 'peak:none';
        await H.travelTo(hi.x, hi.z, { stop: 8, tmo: 200, why: 'peak' });
        return 'peak-walk';
      }
      const lm = e.landmarks.filter(l => !l.found && (!q.lm || l.ty === q.lm)).sort((a, b) => a.d - b.d)[0];
      /* the deed's own waypoint (q.wp) and the game's gold line (e.qg) survive a chunk
         unload; the eye's landmark list does not. Follow the line, not the sight. */
      const tgt = lm || (q.lm && q.wp && { x: q.wp.x, z: q.wp.z, ty: q.lm }) || (e.qg && e.qg.kind === 'explore' && { x: e.qg.x, z: e.qg.z });
      if (!tgt) return 'explore:none';
      const r = await H.discoverLandmark(tgt, { tmo: 200 });
      return r.ok ? 'explore-ok' : 'explore:' + r.why;
    }
    case 'track': {
      const lm = e.landmarks.filter(l => !l.found).sort((a, b) => a.d - b.d)[0];
      const tgt = lm || (q.wp && { x: q.wp.x, z: q.wp.z }) || (e.qg && { x: e.qg.x, z: e.qg.z });
      if (!tgt) return 'track:none';
      const r = await H.discoverLandmark(tgt, { tmo: 200 });
      return r.ok ? 'track-ok' : 'track:' + r.why;
    }
    case 'scout': {
      const wp = q.wp || e.camp.terr || (e.qg && { x: e.qg.x, z: e.qg.z });
      if (!wp) return 'scout:nowp';
      const r = await H.travelTo(wp.x, wp.z, { stop: 22, tmo: 260, why: 'scout' });
      return r.ok ? 'scout-ok' : 'scout:' + r.why;
    }
    case 'combat': {
      const pr = e.preds.filter(p => !p.isBoss).sort((a, b) => a.d - b.d)[0];
      if (!pr) return 'combat:none';
      if (pr.lvl > e.w.lvl + 1 && e.w.hp < e.w.maxHp * 0.8) return 'combat:too-risky';
      const r = await H.huntOne(null, { tmo: 60 });      // (prey first: keep the board honest)
      await H.travelTo(pr.x, pr.z, { stop: 3.4, tmo: 90, why: 'combat' });
      for (let k = 0; k < 26; k++) {
        const e2 = await H.eyes(90);
        const t = e2.preds.find(p => !p.isBoss && p.d < 60);
        if (!t) break;
        if (e2.w.hp < e2.w.maxHp * 0.35) { const away = bearingTo(t.x, t.z, e2.w.x, e2.w.z); await H.aim(away); await H.move({ f: true, sprint: e2.w.stam > 8 }); await sleep(H.poll * 2); break; }
        await H.aim(bearingTo(e2.w.x, e2.w.z, t.x, t.z));
        await H.move({ f: t.d > 2.6, sprint: false });
        await H.bite(e2.t);
        await sleep(H.poll);
      }
      return r.ok ? 'combat-ok' : 'combat:' + r.why;
    }
    case 'xp': {
      /* the level-up deed: bank XP by the fastest honest channel available */
      const s = pickSide(e.q.avail, e);
      if (s && (isIron || isHunt)) { const ok = await H.accept(s.id); return ok ? 'xp:side-accepted' : 'xp:side-refused'; }
      const prey = e.animals.filter(a => a.hp <= 4).sort((a, b) => a.d - b.d)[0];
      if (prey && prey.d < 260) { const r = await H.huntOne(prey.k, { tmo: 90 }); return r.ok ? 'xp:hunt-ok' : 'xp:hunt-' + r.why; }
      const pk = e.pickups.sort((a, b) => a.d - b.d)[0];
      if (pk && pk.d < 200) { const r = await H.gatherOne(null, { tmo: 70 }); return r.ok ? 'xp:gather-ok' : 'xp:gather-' + r.why; }
      const a = Math.random() * 6.2832;
      await H.travelTo(e.w.x + Math.sin(a) * 140, e.w.z + Math.cos(a) * 140, { stop: 14, tmo: 80, why: 'xp-search' });
      return 'xp:search';
    }
    case 'ritual': {
      const altar = q.wp || e.camp.altar;
      if (!altar) return 'ritual:noaltar';
      const r = await H.travelTo(altar.x, altar.z, { stop: 2.4, tmo: 240, why: 'ritual' });
      if (r.ok) { await H.tap('KeyE'); return 'ritual-channeled'; }
      return 'ritual:' + r.why;
    }
    default: return 'unknown:' + q.kind;
  }
}

/* --------------------------------------------------------------- report ---- */
await H.releaseAll();
rep.clock = lastSim;
rep.wallTotal = +((Date.now() - t0wall) / 1000).toFixed(1);
rep.errors = errors.slice(0, 25); rep.errorCount = errors.length;
rep.warnCount = warns.length;
rep.trace = H.trace;
rep.final = rep.state;
rep.boost = await page.evaluate(() => window.__boost || null).catch(() => null);
fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, `run_${TAG}_${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(rep, null, 1));
console.log(`\n📄 report → ${path.relative(HERE, file)}`);
console.log(`   outcome ${rep.outcome} · game clock ${rep.clock}s · wall ${rep.wallTotal}s · tier ${rep.state && rep.state.tier} leg ${rep.state && rep.state.leg} stage ${rep.state && rep.state.stage}`);
console.log(`   level ${rep.state && rep.state.lvl} · xp ${rep.state && rep.state.xp} · kills ${rep.state && rep.state.kills} · deeds ${rep.state && rep.state.quests} · side ${rep.state && rep.state.side} · deaths ${rep.deaths.length}`);
console.log(`   bosses fought ${rep.bosses.length}: ` + rep.bosses.map(b => `${b.name} ${b.bites}b/${b.behind}beh/${b.fled}flee/${b.simS}s`).join(' · '));
console.log(`   page errors ${errors.length}${errors.length ? ' → ' + errors.slice(0, 3).join(' | ') : ''}`);
await page.screenshot({ path: path.join(OUT, `shot_${TAG}.png`) }).catch(() => { });
await S.browser.close();
process.exit(rep.outcome === 'TROPHY' ? 0 : 1);
