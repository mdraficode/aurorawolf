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

/* ------------------------------------------------- the router's knowledge --- */
const WOLF_WALK = 7, WOLF_SPRINT = 13.5;
const isRush = ROUTE === 'rush', isIron = ROUTE === 'iron', isPack = ROUTE === 'pack', isHunt = ROUTE === 'hunt';

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
let fight = null, deedFails = 0, lastDeedR = '';

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
      mark('boss-start', { boss: fight.name, hp: b0 && b0.mhp, dmg: b0 && b0.dmg, spd: b0 && b0.spd, flight: b0 && b0.flight, wolfHp: f.w.hp, wolfLvl: f.w.lvl, travel: +travel.toFixed(2) }, true);
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
    if (f.w.hp < fleeHp && b.d < 30) {
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
      const rq = e.q.active.find(q => q.kind === 'ritual') || e.q.avail.find(q => q.kind === 'ritual');
      if (!rq) { const any = e.q.avail[0]; if (any) { await H.accept(any.id); mark('accept', { id: any.id, title: any.title, kind: any.kind, clock: e.clock }); } await sleep(200); continue; }
      if (!e.q.active.some(q => q.kind === 'ritual')) {
        const ok = await H.accept(rq.id);
        mark('accept', { id: rq.id, title: rq.title, kind: 'ritual', ok, clock: e.clock });
        continue;
      }
      const altar = rq.wp || e.camp.altar;
      if (!altar) { await sleep(300); continue; }
      const d = Math.hypot(altar.x - e.w.x, altar.z - e.w.z);
      if (d < 3.2) { await H.move({}); await H.aim(bearingTo(e.w.x, e.w.z, altar.x, altar.z)); await H.tap('KeyE'); mark('ritual', { d: +d.toFixed(1), clock: e.clock }); await sleep(600); continue; }
      /* a human tops up before the trial: full stamina, and hp if there is time */
      if ((isIron || isPack) && e.w.hp < e.w.maxHp * 0.9 && e.w.stam < 60) {
        await H.move({}); await sleep(700); continue;
      }
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
