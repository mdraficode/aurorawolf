/* ============================================================================
   🎮 THE HUMAN HANDS — a speedrunner's controller for Aurora Wolf
   ----------------------------------------------------------------------------
   This is NOT the neural bot (RAFZZER) and NOT the in-game autopilot: nothing
   in src/autopilot.js is used, no weights are loaded, `?autopilot=1` is never
   set. This module is a pair of *hands and eyes* for a human router:

     EYES  — one page.evaluate that returns exactly what a player can see
             (HUD numbers, the deed board, the map marks, and whatever is on
             screen/near enough to notice: prey, pickups, landmarks, hunters,
             the Legend itself).
     HANDS — real input events only: keyboard (WASD/Shift/Space/F/E/X/H/C/J/M/P)
             and mouse drags on the canvas for the camera, plus real clicks on
             the quest-log buttons. No game function is ever called to move the
             wolf, accept a deed, or damage an animal.

   The *decisions* live in run.mjs (the router) — the speedrun lines a human
   would take. Everything here is mechanics: aim, walk, sprint, bite, gather.
   ============================================================================ */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const GAME = pathToFileURL(path.join(ROOT, 'index.html')).href;
export const OUT = path.join(HERE, 'runs');

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const wrapPI = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export const bearingTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);

/* ------------------------------------------------------------------ EYES ----
   What the player sees. Radius R = "how far I bother to look" (the view/fog
   distance); landmarks are seen twice as far (they are tall on the map).   */
export function EYES(R) {
  const out = { ok: false };
  try {
    R = R || 220;
    const w = wolf, S = window.CAMP.state();
    const d2 = (x, z) => Math.hypot(x - w.pos.x, z - w.pos.z);
    const f1 = v => Math.round(v * 10) / 10;
    out.ok = true;
    out.t = f1(tSec); out.state = state; out.fps = fpsShow | 0;
    out.dayF = f1(dayF); out.dayCount = dayCount; out.biome = curBiomeKey;
    out.weather = { rain: f1(weather.rain || 0), snow: f1(weather.snow || 0), storm: f1(weather.storm || 0) };
    out.w = {
      x: f1(w.pos.x), y: f1(w.pos.y), z: f1(w.pos.z), hp: f1(w.hp), maxHp: w.maxHp | 0,
      stam: w.stamina | 0, maxStam: w.maxStam | 0, lvl: w.level | 0, xp: w.xp | 0, xpNext: w.xpNext | 0,
      xpTotal: w.xpTotal | 0, yaw: +w.yaw.toFixed(2), crouch: !!w.crouch, deadT: f1(w.deadT),
      swim: !!w.swimming, spd: f1(w.speed), exh: !!w.exhausted, dist: w.distance | 0,
      invuln: f1(w.invulnT || 0), perks: Object.keys(w.perks || {}), fly: f1(w.flyT || 0)
    };
    out.cam = +camYaw.toFixed(2);
    out.camp = {
      tier: S.tier, leg: S.leg, stage: S.stage, prep: S.prepDone, legend: window.CAMP.legendName(),
      trophies: (S.trophies || []).map(t => ({ tier: t.tier, time: t.time })),
      terr: S.terr ? { x: f1(S.terr.x), z: f1(S.terr.z), biome: S.terr.biome } : null,
      altar: S.altar ? { x: f1(S.altar.x), z: f1(S.altar.z) } : null
    };
    out.clock = f1(window.CAMP.simClock());
    out.hudClock = f1(window.CAMP.clock());
    const slim = q => ({
      id: q.id, title: q.title, kind: q.kind, stage: q.stage, need: q.need, have: q.have | 0,
      side: !!q.side, species: q.species || null, item: q.item || null, lm: q.lmType || null,
      peak: !!q.peak, wp: q.wp ? { x: f1(q.wp.x), z: f1(q.wp.z) } : null,
      timed: !!q.timed, deadline: q.deadline ? f1(q.deadline) : null, rw: q.rw && q.rw.xp
    });
    out.q = { active: QUESTS.active.map(slim), avail: QUESTS.avail.map(slim) };
    out.side = window.CAMP.side();
    out.marks = (window.CAMP.mapMarks() || []).map(m => ({ x: f1(m.x), z: f1(m.z), c: m.color }));
    /* the GOLD DOTTED LINE — the game's own navigation to the active deed. This is
       what a player follows on the minimap, so it is what the router follows: it
       knows about quarry, pickups, landmark waypoints, altars and territory even
       when the chunk that holds them has streamed out of the eye's range. */
    out.qg = (() => {
      try {
        const g = window.questGuide ? window.questGuide() : null;
        return g ? { x: f1(g.x), z: f1(g.z), d: f1(g.d), kind: g.kind, label: g.label } : null;
      } catch (e) { return null; }
    })();
    out.inv = { meat: inv.meat | 0, pelt: inv.pelt | 0, bone: inv.bone | 0, berry: inv.berry | 0, herb: inv.herb | 0, mushroom: inv.mushroom | 0, stone: inv.stone | 0, wood: inv.wood | 0 };
    /* --- the world around me (what the eye/minimap catches) --- */
    const A = [], P = [], K = [], L = [], B = [], RV = [];
    for (const [, ch] of chunks) {
      for (const a of ch.animals) {
        if (a.dead) continue; const d = d2(a.pos.x, a.pos.z); if (d > R) continue;
        A.push({ k: a.name, x: f1(a.pos.x), z: f1(a.pos.z), d: f1(d), hp: a.hp | 0, meat: (a.sp && a.sp.meat) | 0, flee: !!a.fleeing });
      }
      for (const p of ch.pickups) {
        if (p.gathered) continue; const d = d2(p.x, p.z); if (d > R * 0.6) continue;
        const def = PICKUP_DEF[p.type];
        K.push({ t: p.type, i: def ? def.inv : p.type, x: f1(p.x), z: f1(p.z), d: f1(d) });
      }
      for (const pr of ch.predators) {
        if (pr.dead) continue; const d = d2(pr.pos.x, pr.pos.z); if (d > R) continue;
        P.push({ k: (pr.sp && pr.sp.label) || '?', x: f1(pr.pos.x), z: f1(pr.pos.z), d: f1(d), lvl: pr.level | 0, hp: f1(pr.hp), threat: !!pr.threatening, isBoss: pr instanceof Boss });
      }
    }
    for (const lm of landmarkList) {
      const d = d2(lm.x, lm.z); if (d > R * 2) continue;
      L.push({ ty: lm.type, lb: lm.label, x: f1(lm.x), z: f1(lm.z), d: f1(d), found: !!lm.found, tier: lm.tier });
    }
    for (const b of bosses) {
      if (b.dead) continue;
      const tfx = Math.sin(b.heading), tfz = Math.cos(b.heading);
      const twx = w.pos.x - b.pos.x, twz = w.pos.z - b.pos.z, twl = Math.hypot(twx, twz) || 1;
      B.push({
        n: b.def.name, x: f1(b.pos.x), y: f1(b.pos.y), z: f1(b.pos.z), d: f1(d2(b.pos.x, b.pos.z)),
        hp: f1(b.hp), mhp: b.maxHp | 0, ph: b.phase | 0, inv: !!b.invuln, alt: f1(b.alt || 0),
        flight: !!b.def.flight, atk: f1(b.atkCd || 0), wind: f1(b.biteT || 0), spec: f1(b.specT || 0),
        charging: !!b.charging, tac: f1(b.tacT || 0), sub: f1(b.subT || 0),
        facingMe: +((tfx * twx + tfz * twz) / twl).toFixed(2),   // +1 = it stares at me, −1 = I am behind it
        reach: f1(b.sp.reach), biteR: f1(3.6 + b.sp.scale * 0.7), dmg: b.def.dmg, spd: f1(b.def.speed)
      });
    }
    for (const r of rivals) {
      if (r.dead) continue; const d = d2(r.pos.x, r.pos.z); if (d > R) continue;
      RV.push({ x: f1(r.pos.x), z: f1(r.pos.z), d: f1(d), hp: f1(r.hp), stance: r.pack ? r.pack.stance : null });
    }
    const by = (a, b2) => a.d - b2.d;
    A.sort(by); P.sort(by); K.sort(by); L.sort(by); RV.sort(by);
    out.animals = A.slice(0, 14); out.preds = P.slice(0, 8); out.pickups = K.slice(0, 16);
    out.landmarks = L.slice(0, 10); out.rivals = RV.slice(0, 8); out.bosses = B;
    out.pack = (window.PACK && window.PACK.status) ? window.PACK.status() : null;
    out.run = {
      kills: RUN.kills | 0, preds: RUN.predators | 0, quests: RUN.quests | 0, xp: RUN.xp | 0,
      lvl: RUN.maxLevel | 0, bosses: RUN.bosses | 0, side: RUN.side | 0, cause: RUN.cause || null,
      dist: (w.distance - (RUN.dist0 || 0)) | 0
    };
    out.boost = window.__boost ? { ticks: window.__boost.ticks, warns: window.__boost.warns, last: window.__boost.lastMsg } : null;
    out.staminaEcon = { drain: 15, regen: 11 };
    /* a couple of things a player reads off the terrain: where is dry land? */
    out.dry = (() => {
      let best = null, bd = 1e9;
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * 6.2832;
        for (const r of [12, 26, 45, 70, 110]) {
          const x = w.pos.x + Math.sin(a) * r, z = w.pos.z + Math.cos(a) * r;
          if (heightAt(x, z) > WATER_Y + 1.0) { if (r < bd) { bd = r; best = { a: +a.toFixed(2), r }; } break; }
        }
      }
      return best;
    })();
    out.err = null;
  } catch (e) { out.err = String(e && e.message || e); }
  return out;
}

/* ------------------------------------------------------------- EYES (FIGHT) ----
   The Legend dance is a race against the game's own turn rate, so its eyes must be
   CHEAP: the full EYES payload (chunks, pickups, landmark list, questGuide, dry-land
   scan) costs 20-40 ms of wall time, which at a 3× boost is 0.1 s of game time —
   1.4 m of sprint — i.e. the difference between holding a 4 m ring and spiralling
   out of it. This one reads the wolf, the Legends and the clock, and nothing else. */
export function EYES_FIGHT() {
  const out = { ok: false };
  try {
    const w = wolf;
    const f1 = v => Math.round(v * 100) / 100;
    out.ok = true;
    out.t = f1(tSec); out.clock = f1(window.CAMP.simClock()); out.cam = camYaw; out.state = state;
    out.w = {
      x: f1(w.pos.x), y: f1(w.pos.y), z: f1(w.pos.z), hp: f1(w.hp), maxHp: w.maxHp | 0,
      stam: w.stamina | 0, maxStam: w.maxStam | 0, lvl: w.level | 0, yaw: +w.yaw.toFixed(3),
      deadT: f1(w.deadT), exh: !!w.exhausted, spd: f1(w.speed), dist: f1(w.distance),
      crouch: !!w.crouch, invuln: f1(w.invulnT || 0), perks: Object.keys(w.perks || {}),
      swim: !!w.swimming, exh: !!w.exhausted, atkCd: f1(w.atkCd || 0),
      /* what the game actually received — the rig's own keys and the analogue blend,
         plus the terrain grade that silently multiplies speed by as little as 0.4 */
      inF: !!input.f, inS: !!input.sprint, inP: !!input.paused, mx: f1(input.mx), my: f1(input.my),
      kW: !!keys.KeyW, kSh: !!keys.ShiftLeft, gnd: !!w.grounded, joy: joy.id !== null,
      grade: (() => { const ah = groundAt(w.pos.x + Math.sin(w.yaw) * 2, w.pos.z + Math.cos(w.yaw) * 2); return +Math.max(0, (ah - w.pos.y) / 2).toFixed(2); })()
    };
    /* water is a fight-ender: swimming caps speed at 4.2 m/s (a Legend turns at 2.2 rad/s
       and walks at 12.5), drains 8 stamina/s and drowns an exhausted wolf. A player reads
       the nearest bank and fights on dry, flat ground — so the fight eyes carry it too. */
    out.dry = (() => {
      let best = null, bd = 1e9;
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * 6.2832;
        for (const rr of [8, 16, 28, 45, 70]) {
          const x = w.pos.x + Math.sin(a) * rr, z = w.pos.z + Math.cos(a) * rr;
          if (heightAt(x, z) > WATER_Y + 1.2) { if (rr < bd) { bd = rr; best = { a: +a.toFixed(2), r: rr }; } break; }
        }
      }
      return best;
    })();
    out.camp = { leg: window.CAMP.state().leg, tier: window.CAMP.state().tier, stage: window.CAMP.state().stage };
    const B = [];
    /* BITE-JAM SENSE (parklab17: two counted bites, zero boss damage): the engine's bite
       scan offers chunk animals+predators+rivals and picks the CLOSEST inside a ±78° cone
       (dot >= 0.2 vs the nose) — a deer standing between the wolf and the Legend eats the
       strike. The rig must know the nearest cone-blocker to refuse a jammed press. */
    const fx0 = Math.sin(w.yaw), fz0 = Math.cos(w.yaw);
    let jam = 99;
    const offerJam = a => {
      if (!a || a.dead || (a.pack && a.pack.stance === 'bonded')) return;
      if (a.constructor && a.constructor.name === 'Boss') return;   // Bosses live in chunk.predators (p4.js:3144) — the boss is the TARGET, not a jammer
      const dx = a.pos.x - w.pos.x, dz = a.pos.z - w.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= jam || d > 6 || Math.abs(a.pos.y - w.pos.y) > 3.5) return;
      if ((dx * fx0 + dz * fz0) / (d || 1) < 0.2) return;
      jam = d;
    };
    if (typeof chunks !== 'undefined') for (const ch of chunks.values()) {
      for (const a of ch.animals) offerJam(a);
      for (const a of ch.predators) offerJam(a);
    }
    for (const b of bosses) {
      if (b.dead) continue;
      const tfx = Math.sin(b.heading), tfz = Math.cos(b.heading);
      const twx = w.pos.x - b.pos.x, twz = w.pos.z - b.pos.z, twl = Math.hypot(twx, twz) || 1;
      B.push({
        n: b.def.name, x: f1(b.pos.x), y: f1(b.pos.y), z: f1(b.pos.z), d: f1(twl), hdg: +b.heading.toFixed(3),
        hp: f1(b.hp), mhp: b.maxHp | 0, ph: b.phase | 0, inv: !!b.invuln, alt: f1(b.alt || 0),
        flight: !!b.def.flight, atk: f1(b.atkCd || 0), wind: f1(b.biteT || 0), clone: !!b.isClone,
        charging: !!b.charging, tac: f1(b.tacT || 0), sub: f1(b.subT || 0),
        facingMe: +((tfx * twx + tfz * twz) / twl).toFixed(3),
        /* the SIGNED blind-side gap: 0 = it stares at me, PI = I stand in its tail.
           A player reads this off the beast's shoulders; the ring law steers on it. */
        gap: +Math.atan2(Math.sin(Math.atan2(twx, twz) - b.heading), Math.cos(Math.atan2(twx, twz) - b.heading)).toFixed(3),
        turn: +((b.def.flight ? 5 : 2.2) * (1 + (b.phase | 0) * 0.15)).toFixed(2),
        reach: f1(b.sp.reach), biteR: f1(3.6 + b.sp.scale * 0.7), dmg: b.def.dmg, spd: f1(b.def.speed),
        jam: f1(jam)
      });
    }
    out.bosses = B;
    out.err = null;
  } catch (e) { out.err = String(e && e.message || e); }
  return out;
}

/* ----------------------------------------------------------------- HANDS ---- */
export class Human {
  constructor(page, opt = {}) {
    this.pg = page;
    this.poll = opt.poll || 85;          // ms between decisions (wall)
    this.held = {};                      // key code → down?
    this.trace = [];
    this.t0wall = Date.now();
    this.lastBiteT = -99;
    this.verbose = opt.verbose !== false;
  }
  wall() { return (Date.now() - this.t0wall) / 1000; }
  note(type, data) {
    const e = Object.assign({ w: +this.wall().toFixed(1), type }, data || {});
    this.trace.push(e);
    if (this.verbose) console.log(`   · [${e.w}s] ${type}${data ? ' ' + JSON.stringify(data) : ''}`);
    return e;
  }
  async eyes(R = 220) { return this.pg.evaluate(EYES, R); }
  async eyesFight() { return this.pg.evaluate(EYES_FIGHT); }

  /* ---- the fast aim: no extra round trip (the caller hands me the camYaw it just
         read), the shortest possible drag, and no sleep afterwards ---- */
  async aimFast(bearing, camNow, vd) {
    const d = wrapPI(bearing + Math.PI - camNow);          // the 180° law: I run along camYaw + PI
    if (Math.abs(d) < 0.035) return 0;
    const sens = 0.0078 * Math.max(0.55, Math.min(1.5, (vd || 8.5) / 8.5));
    const px = Math.max(-430, Math.min(430, -d / sens));
    const vp = this.vp || (this.vp = this.pg.viewportSize()) || { width: 960, height: 540 };
    const cx = Math.round(vp.width / 2), cy = Math.round(vp.height / 2);
    await this.pg.mouse.move(cx, cy);
    await this.pg.mouse.down();
    await this.pg.mouse.move(cx + px, cy, { steps: 2 });
    await this.pg.mouse.up();
    return d;
  }

  /* ---- keyboard: held keys are diffed so we never spam events ---- */
  async key(code, down) {
    if (!!this.held[code] === !!down) return;
    this.held[code] = !!down;
    if (down) await this.pg.keyboard.down(code); else await this.pg.keyboard.up(code);
  }
  async tap(code) { await this.pg.keyboard.press(code); }
  async releaseAll() { for (const c of Object.keys(this.held)) if (this.held[c]) await this.key(c, false); }
  async move(m) {
    await this.key('KeyW', !!m.f); await this.key('KeyS', !!m.b);
    await this.key('KeyA', !!m.l); await this.key('KeyD', !!m.r);
    await this.key('ShiftLeft', !!m.sprint);
  }

  /* ---- camera: a real mouse drag on the canvas (sens 0.0078 rad/px) ----
     THE 180° LAW: the wolf runs along camYaw + PI (the camera trails behind it), so a
     MOVEMENT bearing b needs camYaw = b + PI. src/autopilot.js:480 says the same thing
     about its own history ("v6/v7.0 steered camYaw directly = ran backwards") — this rig
     made exactly that mistake on its first full run: every walk was a moonwalk, every
     deed reported 'stuck', 0 deeds completed in 1033 s of game time. */
  async aim(bearing, maxPx = 340) {
    const st = await this.pg.evaluate(() => ({ cam: camYaw, vd: viewDist }));
    const d = wrapPI(bearing + Math.PI - st.cam);
    if (Math.abs(d) < 0.05) return d;
    const sens = 0.0078 * Math.max(0.55, Math.min(1.5, st.vd / 8.5));
    let px = Math.max(-maxPx, Math.min(maxPx, -d / sens));
    const vp = this.pg.viewportSize() || { width: 960, height: 540 };
    const cx = Math.round(vp.width / 2), cy = Math.round(vp.height / 2);
    await this.pg.mouse.move(cx, cy);
    await this.pg.mouse.down();
    await this.pg.mouse.move(cx + px, cy, { steps: Math.max(2, Math.min(10, Math.round(Math.abs(px) / 45))) });
    await this.pg.mouse.up();
    return d;
  }
  async lookAt(x, z) { const e = await this.eyes(60); return this.aim(bearingTo(e.w.x, e.w.z, x, z)); }

  /* ---- the bite: a real F press, never faster than the 0.75 s swing ---- */
  async bite(tSecNow, bossD) {
    if (tSecNow - this.lastBiteT < 0.72) return false;
    /* STRIKE-TIME JAM CHECK (parklab18: 2 of 4 presses eaten by deer that wandered into
       the cone between the sense poll and the click): the engine picks the CLOSEST live
       target in a ±78° cone — re-read the cone atomically, abort without burning the
       0.72 s rate limit so the press retries next poll. */
    if (bossD !== undefined) {
      const jam = await this.pg.evaluate(() => {
        const w = wolf, fx = Math.sin(w.yaw), fz = Math.cos(w.yaw);
        let jam = 99;
        const off = a => {
          if (!a || a.dead || (a.pack && a.pack.stance === 'bonded')) return;
          if (a.constructor && a.constructor.name === 'Boss') return;   // Bosses live in chunk.predators — never jam on the target itself
          const dx = a.pos.x - w.pos.x, dz = a.pos.z - w.pos.z, d = Math.hypot(dx, dz);
          if (d >= jam || d > 6 || Math.abs(a.pos.y - w.pos.y) > 3.5) return;
          if ((dx * fx + dz * fz) / (d || 1) < 0.2) return;
          jam = d;
        };
        if (typeof chunks !== 'undefined') for (const ch of chunks.values()) {
          for (const a of ch.animals) off(a);
          for (const a of ch.predators) off(a);
        }
        return jam;
      });
      if (jam <= bossD + 0.60) return false;   // moving deer need real clearance, not a photo finish
    }
    this.lastBiteT = tSecNow;
    await this.tap('KeyF');
    return true;
  }

  /* ---- walk somewhere, like a person: aim the camera, hold W ---- */
  async travelTo(x, z, opt = {}) {
    const stop = opt.stop === undefined ? 3.2 : opt.stop;
    const tmo = opt.tmo || 120;                       // SIM seconds
    const sprint = opt.sprint !== false;
    const stamFloor = opt.stamFloor === undefined ? 22 : opt.stamFloor;
    const why = opt.why || 'travel';
    let t0 = null, lastD = 1e9, noGain = 0, hops = 0, lastPoll = null;
    for (;;) {
      const e = await this.eyes(opt.R || 200);
      if (!e || !e.ok) return { ok: false, why: 'eyes' };
      if (t0 === null) { t0 = e.t; lastPoll = e.t; }
      const dt = e.t - t0;
      const pdt = Math.max(0, e.t - lastPoll); lastPoll = e.t;   // THIS poll's slice of time
      if (e.w.deadT > 0) { await this.move({}); return { ok: false, why: 'dead', dt };
      }
      const d = Math.hypot(x - e.w.x, z - e.w.z);
      if (d <= stop) { await this.move({}); return { ok: true, d, dt, why }; }
      if (dt > tmo) { await this.move({}); return { ok: false, why: 'timeout', d, dt }; }
      /* swimming: get out — a player heads for the nearest bank */
      if (e.w.swim && e.dry) { await this.aim(e.dry.a); await this.move({ f: true, sprint: false }); await sleep(this.poll); continue; }
      /* no progress → a player jumps / backs off / sidesteps */
      /* RIG FIX: this used to add the CUMULATIVE elapsed time (dt) instead of the
         slice since the last poll, so any walk longer than ~3 s was declared
         'stuck' and the router started hopping in place mid-stride. */
      if (d > lastD - 0.30 * Math.max(0.2, pdt)) noGain += pdt; else noGain = 0;
      lastD = d;
      if (noGain > 3.0) {
        noGain = 0; hops++;
        if (hops % 3 === 1) { await this.tap('Space'); }
        else if (hops % 3 === 2) { await this.move({ b: true, l: hops % 2 === 0 }); await sleep(260); }
        else { await this.move({ f: true, r: true }); await sleep(300); }
        if (hops > 12) { await this.move({}); return { ok: false, why: 'stuck', d, dt }; }
      }
      await this.aim(bearingTo(e.w.x, e.w.z, x, z));
      const wantSprint = sprint && !e.w.exh && e.w.stam > stamFloor && d > 8;
      await this.move({ f: true, sprint: wantSprint });
      await sleep(this.poll);
    }
  }

  /* ---- the deed skills (all through real inputs) ---- */
  async huntOne(sp, opt = {}) {
    const tmo = opt.tmo || 90;
    let t0 = null;
    for (;;) {
      const e = await this.eyes(200);
      if (!e || !e.ok) return { ok: false, why: 'eyes' };
      if (t0 === null) t0 = e.t;
      if (e.w.deadT > 0) { await this.move({}); return { ok: false, why: 'dead' }; }
      if (e.t - t0 > tmo) { await this.move({}); return { ok: false, why: 'timeout' }; }
      const prey = e.animals.filter(a => !sp || a.k === sp).sort((a, b) => a.d - b.d)[0];
      if (!prey) return { ok: false, why: 'no-prey' };
      if (prey.d > 3.0) {
        await this.aim(bearingTo(e.w.x, e.w.z, prey.x, prey.z));
        const stalk = prey.flee ? true : prey.d < 16;      // a player prowls up, then sprints the flight
        await this.move({ f: true, sprint: prey.flee || prey.d > 22 ? e.w.stam > 20 : false });
        if (stalk && prey.d < 14 && !prey.flee && !e.w.crouch) await this.tap('KeyX');
        await sleep(this.poll);
        continue;
      }
      if (e.w.crouch) await this.tap('KeyX');               // stand up: prowling is 0.42× speed
      await this.aim(bearingTo(e.w.x, e.w.z, prey.x, prey.z));
      await this.move({ f: prey.d > 2.0, sprint: false });
      await this.bite(e.t);
      await sleep(this.poll);
      if ((prey.hp | 0) <= 0) return { ok: true };
    }
  }
  async gatherOne(items, opt = {}) {
    const tmo = opt.tmo || 70;
    let t0 = null;
    for (;;) {
      const e = await this.eyes(140);
      if (!e || !e.ok) return { ok: false, why: 'eyes' };
      if (t0 === null) t0 = e.t;
      if (e.w.deadT > 0) { await this.move({}); return { ok: false, why: 'dead' }; }
      if (e.t - t0 > tmo) { await this.move({}); return { ok: false, why: 'timeout' }; }
      const pk = e.pickups.filter(p => !items || !items.length || items.includes(p.i)).sort((a, b) => a.d - b.d)[0];
      if (!pk) return { ok: false, why: 'no-supply' };
      if (pk.d > 2.2) {
        const r = await this.travelTo(pk.x, pk.z, { stop: 1.9, tmo: 45, sprint: pk.d > 30, why: 'gather' });
        if (!r.ok && r.why !== 'timeout') return { ok: false, why: 'unreachable:' + r.why };
        continue;
      }
      await this.aim(bearingTo(e.w.x, e.w.z, pk.x, pk.z));
      await this.move({});
      await this.tap('KeyE');
      await sleep(220);
      const e2 = await this.eyes(60);
      return { ok: true, got: e2.inv };
    }
  }
  async discoverLandmark(lm, opt = {}) {
    const r = await this.travelTo(lm.x, lm.z, { stop: 12, tmo: opt.tmo || 150, why: 'landmark' });
    return r;
  }
  /* ---- the quest log: real clicks on the real buttons ---- */
  async openLog(tab = 'avail') {
    const open = await this.pg.evaluate(() => { const q = document.getElementById('questLog'); return !!(q && q.classList.contains('show')); });
    if (!open) await this.tap('KeyJ');
    await sleep(120);
    const cur = await this.pg.evaluate(() => questTab);
    if (cur !== tab) { await this.pg.click(`.qtab[data-t="${tab}"]`).catch(() => { }); await sleep(120); }
  }
  async closeLog() {
    const open = await this.pg.evaluate(() => { const q = document.getElementById('questLog'); return !!(q && q.classList.contains('show')); });
    if (open) await this.tap('KeyJ');
    await sleep(90);
  }
  async accept(id) {
    await this.openLog('avail');
    const btn = `[data-ac="${id}"]`;
    const has = await this.pg.evaluate(s => !!document.querySelector(s), btn);
    if (!has) { await this.closeLog(); return false; }
    await this.pg.click(btn);
    await sleep(160);
    await this.closeLog();
    const ok = await this.pg.evaluate(i => QUESTS.active.some(q => q.id === i), id);
    return ok;
  }
  async setAside(id) {
    await this.openLog('active');
    const btn = `[data-ab="${id}"]`;
    const has = await this.pg.evaluate(s => !!document.querySelector(s), btn);
    if (has) { await this.pg.click(btn); await sleep(160); }
    await this.closeLog();
    return has;
  }
}

/* --------------------------------------------------------------- session ---- */
import { chromium } from 'playwright';
export async function boot(opt = {}) {
  const qs = new URLSearchParams();
  if (opt.seed) qs.set('seed', String(opt.seed));
  qs.set('quality', opt.quality || 'low');
  if (opt.speed) { qs.set('speed', String(opt.speed)); qs.set('rate', String(opt.rate || 3)); qs.set('re', String(opt.re || 10)); }
  if (opt.audit) qs.set('audit', '1');
  const url = GAME + '?' + qs.toString();
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: opt.w || 960, height: opt.h || 540 } });
  const errors = [], warns = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 200)); else if (m.type() === 'warning') warns.push(m.text().slice(0, 160)); });
  /* a brand-new career: the campaign save must not exist before the page loads */
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  let nameVisible = false;
  if (opt.menu !== false) {
    /* the human way in: type a name, press START */
    await page.waitForFunction(() => { const b = document.getElementById('btnStart'); return b && !b.disabled; }, null, { timeout: 180000 });
    /* BUG (found by this rig, fixed in p5.js): on a FRESH save the "Name the wolf"
       row stayed display:none, because p4 injects the start overlay at parse time —
       before p5 (the campaign) exists — so onMenuRefresh() never ran. The name
       prompt only appeared after revisiting the menu. We try it, and note if hidden. */
    nameVisible = await page.evaluate(() => { const i = document.getElementById('plName2'); return !!(i && i.getBoundingClientRect().width > 0); });
    if (nameVisible && opt.name) { await page.fill('#plName2', opt.name).catch(() => { }); }
    await page.click('#btnNewGame');
    await page.waitForTimeout(150);
    await page.click('#ddNewStart');
  }
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP && window.CAMP.state().stage, null, { timeout: 180000 });
  /* WARM-UP GATE (2026-09-03): the first renderer.render() on SwiftShader compiles all shaders
     and can stall the batch loop for 10-60 s of wall time while __boost.ticks sits frozen —
     a rig that starts measuring inside that window reports "0 moving polls" / a dead motor
     (measured: 40 polls, spd 0 every row; the sim was merely mid-compile). Nothing read
     before the batch loop has provably produced ticks is real. */
  try { await page.waitForFunction(() => window.__boost && window.__boost.ticks > 60, null, { timeout: 180000 }); } catch (e) { }
  await page.waitForTimeout(1500);
  return { browser, page, errors, warns, url, menuNamePrompt: nameVisible, human: new Human(page, opt) };
}
