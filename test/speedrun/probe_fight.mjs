/* ============================================================================
   🔬 FIGHT PROBE — isolate the Legend dance from the rest of the run
   ----------------------------------------------------------------------------
   A. SANITY  (optional) — walk straight at the Legend and swing: settles the one
      question that has to be answered before any tactics, which is whether the
      wolf can damage a Legend AT ALL. wolf.attack() only scans loaded chunks, and
      a Boss registers itself in the chunk it was born in, so a lost registration
      means every swing silently whiffs and the campaign is unbeatable (bug B8).
   B. THE RING — fly the blind-side walk ring and measure what actually lands:
      the gap to the Legend's tail, the nose angle at the press, damage per
      landing, hits taken, and time-to-kill.

   THE CADENCE LAW (the rig's own hardest constraint, and the reason this probe
   exists): the sim boost runs the world in batches of SPEED×0.05 s and NOTHING
   changes between batches, while every page.evaluate blocks the page's main
   thread. Poll faster than the batch and three things break at once — I read the
   same frozen world over and over, my zigzag averages out to a pure tangent that
   the bite cone rejects, and I starve the game loop (measured: 2454 polls in
   60.7 sim-s, the sim crawling at 0.87× real time). So the loop tunes its own
   sleep to land ONE decision per batch.

   usage:
     node test/speedrun/probe_fight.mjs --leg=0 --tier=1 --wall=80 --lvl=12
     node test/speedrun/probe_fight.mjs --ringr=2.85 --mincut=0.44 --sanity=0
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { boot, sleep, wrapPI, bearingTo } from './human.mjs';

const arg = (k, d) => { const m = new RegExp(`--${k}=([^\\s]+)`).exec(process.argv.join(' ')); return m ? m[1] : d; };
const LEG = +arg('leg', 0), TIER = +arg('tier', 1);
const WALL = +arg('wall', 110);
const MINCUT = +arg('mincut', 0.44);        // the zigzag's angle off the tangent (rad)
const RING_R = +arg('ringr', 2.05);         // the ring radius, metres — ω = 7·cos(cut)/r must BEAT 2.2 rad/s
const SANITY = +arg('sanity', 0);
const SEED = arg('seed', '7777');
/* SPEED is the decision granularity: nothing in the world moves between batches, so a
   0.4 s batch (SPEED=8) is 5.4 m of sprint travelled blind. Fights need SPEED=2. */
const SPEED = +arg('speed', 2), RATE = +arg('rate', 4), LVL = +arg('lvl', 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const W = () => H.wall() * 1000;   // human.mjs's wall() counts seconds

const S = await boot({ seed: SEED, speed: SPEED, rate: RATE, re: 10, name: 'PROBEFIGHT', quality: 'low' });
const { page, human: H } = S;
console.log(`\n🔬 fight probe · leg ${LEG} tier ${TIER} · ring ${RING_R} m · cut ${MINCUT} · boost ${SPEED}/${RATE} · wolf lvl ${LVL}`);

/* ---- drop the Legend on DRY, FLAT, TRUNK-FREE ground ------------------------
   THE ARENA IS HALF THE FIGHT: collideSolids() multiplies speed by 0.22 on a
   head-on trunk and charges 4 HP for a full-speed crash, so a ring flown through
   forest is a ring flown at 3 m/s — slower than the Legend turns, which hands the
   blind side straight back. Swimming is worse (4.2 m/s, 8 stamina/s, drowning). */
const lab = await page.evaluate(({ LEG, TIER, LVL }) => {
  const st = window.CAMP.state();
  st.leg = LEG; st.tier = TIER; st.stage = 'boss';
  const def = window.CAMP.legendDef();
  for (const ch of chunks.values()) {
    for (const arr of ['animals', 'predators'])
      for (let i = ch[arr].length - 1; i >= 0; i--) {
        const a = ch[arr][i];
        if (Math.hypot(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z) > 80) continue;
        ch[arr].splice(i, 1); try { a.dispose(); } catch (e) { }
      }
  }
  let guard = 0;
  while (wolf.level < LVL && guard++ < 60) addXp(wolf.xpNext - wolf.xp + 1);
  wolf.hp = wolf.maxHp; wolf.stamina = wolf.maxStam; wolf.deadT = 0; wolf.exhausted = false;

  const SOL = [];
  for (const [, ch] of chunks) for (const so of (ch.solids || []))
    if (Math.hypot(so.x - wolf.pos.x, so.z - wolf.pos.z) < 110) SOL.push(so);
  let bx = wolf.pos.x, bz = wolf.pos.z, bestScore = -1e9, bestInfo = null;
  for (let k = 0; k < 320; k++) {
    const a = k * 2.399963, rr = 5 + (k % 18) * 5.5;
    const x = wolf.pos.x + Math.sin(a) * rr, z = wolf.pos.z + Math.cos(a) * rr;
    const h = heightAt(x, z);
    if (h < WATER_Y + 2.0) continue;
    let slope = 0;
    for (const [ox, oz] of [[8, 0], [-8, 0], [0, 8], [0, -8], [6, 6], [-6, -6], [6, -6], [-6, 6]])
      slope = Math.max(slope, Math.abs(heightAt(x + ox, z + oz) - h));
    let clear = 99;
    for (const so of SOL) { const dd = Math.hypot(so.x - x, so.z - z) - (so.r || 1.2); if (dd < clear) clear = dd; }
    const score = Math.min(clear, 14) * 3 - slope * 4 - rr * 0.06 - (h > 34 ? 8 : 0);
    if (score > bestScore) { bestScore = score; bx = x; bz = z; bestInfo = { slope: +slope.toFixed(2), clear: +clear.toFixed(1), away: +rr.toFixed(1) }; }
  }
  wolf.pos.x = bx; wolf.pos.z = bz; wolf.pos.y = heightAt(bx, bz) + 0.2; wolf.swimming = false;

  const x = bx + 12, z = bz;
  const b = new Boss(def.camp === 'beast' ? 'enchanted' : 'forest', x, z, false, def);
  bosses.push(b);
  /* the question that decides everything: is the Legend where wolf.attack() looks? */
  const ch0 = chunks.get(b.chunkKey);
  const scan = [];
  for (const [, ch] of chunks) for (const pr of ch.predators) scan.push(pr.sp && pr.sp.label);
  return {
    boss: def.name, hp: def.hp, dmg: def.dmg, scale: def.scale, speed: def.speed, special: def.special || null,
    biteR: +(3.6 + b.sp.scale * 0.7).toFixed(2), wolfScale: wolf.scale, chunkKey: b.chunkKey,
    inChunk: ch0 ? ch0.predators.includes(b) : false, scanned: scan.slice(0, 10), chunkCount: chunks.size,
    wolfLvl: wolf.level, wolfHp: wolf.maxHp, wolfStam: wolf.maxStam, dmgMul: +wolfDamageMul().toFixed(3),
    arena: Object.assign({ x: +bx.toFixed(1), z: +bz.toFixed(1), h: +heightAt(bx, bz).toFixed(1), solidsNear: SOL.length }, bestInfo || {})
  };
}, { LEG, TIER, LVL });
console.log('   🧪 ' + JSON.stringify(lab));
if (!lab.inChunk) console.log('   ⚠ the Legend is not in its birth chunk — only the global scan (bug B8 fix) makes it biteable');

/* ------------------------------------------------------------ the trace ---- */
const TRACE = [];
const rows = [];
const tr = o => { TRACE.push(o); rows.push(o); };
let simLast = null;

/* ============================================ PHASE A — can I hurt it? ===== */
let aPresses = 0, aLanded = 0, aDmg = 0;
if (SANITY > 0) {
  console.log(`\n── A · sanity: head-on swings for ${SANITY}s ──`);
  let prevA = null;
  const t0 = W();
  while (W() - t0 < SANITY * 1000) {
    const f = await H.eyesFight();
    if (!f || !f.ok || !f.bosses.length) break;
    const b = f.bosses[0];
    if (prevA && prevA.bhp - b.hp > 0.01) { aLanded++; aDmg += prevA.bhp - b.hp; }
    const toB = bearingTo(f.w.x, f.w.z, b.x, b.z);
    await H.aimFast(toB, f.cam);
    await H.move({ f: true, sprint: b.d > 6 });
    if (b.d <= b.biteR) { await page.keyboard.press('KeyF'); aPresses++; }
    prevA = { bhp: b.hp };
    tr({ ph: 'A', r: b.d, nose: +wrapPI(toB - f.w.yaw).toFixed(2), press: aPresses, land: aLanded, bhp: b.hp, whp: f.w.hp });
    await sleep(70);
  }
  await H.releaseAll(); await H.move({});
  console.log(`   presses ${aPresses} · landed ${aLanded} · damage ${aDmg.toFixed(0)} of ${lab.hp} (a head-on bite is a FACE bite = 1 dmg, so landed≈damage is the pass mark)`);
  await sleep(400);
}

/* ============================================ PHASE B — the blind-side ring =
   THE WALK RING (every number measured, none guessed):
     · my bite cone is 78.5° and my nose eases onto my movement direction at 9 rad/s,
       so a flat tangent can never bite — I must be closing at ≥ 2.7 m/s. Hence the
       ZIGZAG: two polls cutting 25° inside the tangent (nose ~65° → the cone accepts
       the swing), two pushing 25° out (nose ~115°, radius restored). Net radial drift
       zero, average ω = v·cos25°/r.
     · a Legend's neck turns 2.2 rad/s (2.53 / 2.86 enraged) and only 0.4 rad/s through
       its own 0.55 s wind-up, so per 1.8 s swing cycle the blind side moves by
       1.8·ω − (Ω·1.25 + 0.18·Ω·0.55) = +0.7 rad at ω = 2.11 (walking r = 2.85).
       The gap ACCUMULATES while stamina regenerates. No sprint economy, no exhaustion.
     · inside 4.0 m the Legend stops walking (it only moves when d > reach+0.6), so the
       ring has a fixed pivot; outside it, it comes for me at 12.5 m/s and I close at
       13.5 — head-on only, a lead angle costs the whole 1 m/s of advantage.
     · a Legend has no `aware` field, so a bite from behind is always an AMBUSH:
       (3 behind + 1 ambush) × 1.5 = 6 damage a swing, 7.5 prowling, 9 with Deep Bite.
       A flank is 2 and a face bite 1 — so the swing is only worth pressing when the
       tail is offered.                                                        */
console.log(`\n── B · the walk ring (r ${RING_R} m, cut ${MINCUT} rad) ──`);
let pollMs = 60, dtEma = SPEED * 0.05;
let side = 0, guard = 0, zz = 0, mode = 'close';
let bPresses = 0, bLanded = 0, bDmg = 0, bHits = 0, bDmgTaken = 0;
let simB0 = null, behindLands = 0, faceLands = 0, flankLands = 0;
let closePolls = 0, ringPolls = 0, windPolls = 0, sprintPolls = 0, fleePolls = 0;
let stamMin = 999, rMean = 0, gapMean = 0, blindPolls = 0, spdMean = 0;
let fleeing = false, fleeT0 = 0, prev = null, radOut = false, aimErr = 0;
{
  const t0 = W();
  while (W() - t0 < WALL * 1000 && guard++ < 9000) {
    const w0 = W();
    const f = await H.eyesFight();
    if (!f || !f.ok) { await sleep(100); continue; }
    if (simB0 === null) simB0 = f.clock;
    const dtSim = prev ? +(f.clock - prev.clock).toFixed(3) : SPEED * 0.05;
    simLast = f.clock;
    /* one decision per batch: nudge the sleep until dt lands on SPEED×0.05 */
    if (prev && dtSim >= 0) {
      dtEma = dtEma * 0.75 + dtSim * 0.25;
      if (dtEma > 0.001) pollMs = Math.round(clamp(pollMs * Math.pow((SPEED * 0.05) / dtEma, 0.55), 14, 260));
    }
    const b = f.bosses.filter(x => !x.clone)[0] || f.bosses[0];
    if (prev && b) {
      const done = prev.bhp - b.hp;
      if (done > 0.01) { bLanded++; bDmg += done; if (prev.fm < -0.35) behindLands++; else if (prev.fm > 0.45) faceLands++; else flankLands++; }
      const hurt = prev.whp - f.w.hp;
      if (hurt > 1) { bHits++; bDmgTaken += hurt; }
    }
    if (f.w.deadT > 0) { tr({ ph: 'B', ev: 'dead' }); await H.releaseAll(); await sleep(800); break; }
    if (!f.bosses.length) { tr({ ph: 'B', ev: 'slain', clock: +(f.clock - simB0).toFixed(1) }); break; }

    const r = b.d, toB = bearingTo(f.w.x, f.w.z, b.x, b.z);
    /* ── THE AIM LEAD (closed loop). The wolf's yaw eases toward the commanded heading at
       dt·9, so a wolf orbiting at ω rad/s trails its own command by ≈ ω/9 — measured in run
       1788362904867: commanded 1.12 rad off the bearing-to-Legend, actually travelled 1.56;
       commanded 0.77, travelled 2.09. Every inward cut was filtered into pure tangent, so the
       nose sat at 1.70-2.06 against a 1.37 bite cone and 60 s produced 15 presses. The lead
       measures the shortfall from the wolf's own last-poll displacement and asks for it up
       front, so what the law wants is what the wolf actually does. */
    if (prev && prev.travOk) {
      const e = wrapPI(wrapPI(Math.atan2(f.w.x - prev.wx, f.w.z - prev.wz) - prev.toB) * side
                       - (Math.PI / 2 - prev.cutCmd));
      if (Math.abs(e) < 1.3) aimErr = aimErr * 0.65 + e * 0.35;
      aimErr = Math.max(-0.9, Math.min(0.9, aimErr));
    }
    const g = b.gap, ag = Math.abs(g);
    rMean += r; gapMean += g; spdMean += f.w.spd; stamMin = Math.min(stamMin, f.w.stam);
    if (ag > 1.9) blindPolls++;
    /* A FIXED LAP DIRECTION, chosen once. LAW v8 flipped the orbit when the gap came round
       the far flank, and every flip cost 0.2-0.3 s of yaw swing — measured nose 1.6-2.1 rad
       against a 1.40 bite cone, so half the presses were thrown away mid-turn. dg/dt is
       ω − 2.2·sign(gap): orbiting one way walks the gap up the near flank slowly (+0.49) and
       sweeps it up the far flank fast (+4.89), so a single fixed direction laps the Legend
       every ~4.5 s and never needs a reversal. */
    if (side === 0) side = g >= 0 ? 1 : -1;

    const OMEGA = b.flight ? 5 : b.turn;
    const wEff = b.wind > 0 ? OMEGA * 0.18 : OMEGA;
    let moveDir, cut = 0, sprint = false;

    /* ══ LAW v11 — LEAD THE AIM, HOLD THE SPIRAL, LAP IT, SPRINT THE ARC ════════════════
       Legend (src/p4.js 3223-3266): turnRate 2.2·(1+0.15·phase), ×0.18 during the 0.55 s
       plant; strike lands at the END of the plant if dd ≤ 4.59 m and dot ≥ 0.2 (|gap| ≤ 1.37);
       it only walks while d > 4.0; cycle = atkCd (1.25−0.15·phase) + plant.
       Wolf bite (src/p3.js 779-822): facing < −0.35 (|gap| > 1.93) = BEHIND → (3+1 ambush)
       ×1.5 = 6 hp (a Legend has no `aware`, so every behind bite is an ambush); flank 2;
       face 1; bite cone |nose| ≤ 1.37; atkCd 0.75 s is spent even on a whiff.

       Everything is expressed as θ = the travel angle off the bearing-to-Legend, positive in
       the lap direction: radial = v·cos θ (in), tangential = v·sin θ, ω = v·sin θ / r, and
       nose ≈ θ once the aim lead has converged.
         θ_IN  = 1.20  walk  → radial 2.52 in, ω 2.78, nose 1.20 → BITES
         θ_OUT = 2.45  walk  → radial 5.38 out, ω 1.85, nose 2.45 → no bite, pays the radius
         θ_RUN = 1.45  sprint→ ω 5.70, radial 1.6 in — the arc transit
         θ_SHUT= 0.50  sprint→ radial 11.9 in — closing from beyond its 4.0 m plant line
       TIGHT RING (r0 = 2.05, band [1.85, 2.45]): ω = v·sinθ/r, so the radius is the cheapest
       way to buy turn rate. At 2.05 the bite-capable walk (θ 1.28) gives ω = 3.27 and the
       time-weighted ω over the spiral is 3.04 — above the neck at EVERY phase (2.20 / 2.53 /
       2.86), which is what makes the sprint unnecessary outside the arc transit. Holding r
       needs t_out/t_in = 2.01/4.67 = 0.43, so 70% of polls are bite-capable. dg/dt = ω − Ω·sign(g) with one fixed lap direction:
       +0.3..+0.5 walking the near flank, +4.7 sweeping the far flank, +3.0/+7.4 sprinting the
       arc → a lap ≈ 7.5 s, ~2.7 s of it behind-bite territory, 10 stamina spent and 82
       refunded. Radius band [2.05, 2.65] keeps it planted and out of the degenerate close-in
       geometry (at r = 0.82 the gap readout spun at 7 rad/s).
       NO FLEE EVER: it runs 12.5-16 m/s and the wolf walks 7 — turning my back hands it my
       spine at exactly the range where the claw lands (measured: flee 367/696 polls, ag p50
       0.00, 14 of 19 hits). The parked gap is the armour, and the 3 hp/s regen — which needs
       6 CLEAN seconds — only ever works behind it. */
    const R_LO = 1.85, R_HI = 2.45;
    const TH_IN = 1.28, TH_OUT = 2.30, TH_RUN = 1.45, TH_SHUT = 0.50;
    const DANGER = 1.42;                          // its 78° arc (1.37) plus one poll of margin
    const r0 = RING_R;                            // 2.05 — see the TIGHT-RING note below
    let thWant;
    if (r > 3.95) {
      mode = 'close'; closePolls++;
      thWant = TH_SHUT;                           // drive in already turning, nose 0.50 → bites
      sprint = f.w.stam > 8 && !f.w.exh;
      radOut = false;
    } else {
      mode = b.wind > 0 ? 'wind' : 'ring';
      if (mode === 'ring') ringPolls++; else windPolls++;
      /* radius — a HELD spiral between two rings: the yaw needs ~0.3 s to settle on a
         heading, so a command is only worth giving if it is worth keeping. */
      if (r <= R_LO + (r0 - RING_R)) radOut = true;
      else if (r >= R_HI + (r0 - RING_R)) radOut = false;
      /* sprint ONLY to cross its arc, or to recover a blown-out radius. Run 1788363252951
         sprinted 57% of polls (plant insurance + frenzy assist) and ran the stamina to 6 →
         exhaustion → the arc transit at walk speed → 14 hits in 40 s. On the tight ring the
         walk alone beats the neck at every phase, so the sprint bill is one 0.35 s burst per
         lap: ~6% duty, 10 stamina, refunded fourfold. */
      sprint = (ag < DANGER || r > 3.30) && f.w.stam > 12 && !f.w.exh;
      thWant = sprint ? (ag < DANGER ? TH_RUN : TH_IN) : (radOut ? TH_OUT : TH_IN);
      if (r - r0 > 0.75) { thWant = TH_SHUT; sprint = f.w.stam > 8 && !f.w.exh; }   // badly wide
    }
    const thCmd = thWant - aimErr;                // lead the yaw lag
    cut = Math.PI / 2 - thCmd;                    // the trace's cut field: π/2 − θ asked for
    moveDir = toB + side * thCmd;
    if (sprint) sprintPolls++;

    await H.aimFast(moveDir, f.cam);
    await H.move({ f: true, sprint });
    const nose = Math.abs(wrapPI(toB - f.w.yaw));
    let pressed = 0;
    /* BEHIND-ONLY BITES. Measured in src/p3.js attack(): facing < −0.35 is `behind`
       → (3 + 1 ambush) × 1.5 = 6 hp, while a flank bite is worth 2 and a face bite 1 —
       and a Legend has no `aware` field, so every behind bite counts as an AMBUSH.
       The Legend's own swing lands only while |gap| ≤ 1.37, so waiting for the blind
       side costs nothing in defence: the same parked gap that makes the bite worth 6 is
       the gap that makes its claw whiff. Swings that would only score 2 are not spent. */
    if (r <= b.biteR && nose < 1.30 && b.facingMe < -0.10 && !b.inv) {
      await page.keyboard.press('KeyF'); bPresses++; pressed = 1;
    }
    prev = { clock: f.clock, bhp: b.hp, whp: f.w.hp, fm: b.facingMe,
             wx: f.w.x, wz: f.w.z, toB, cutCmd: cut, travOk: dtSim > 0.02 };
    tr({
      ph: 'B', ms: Math.round(W() - w0), dt: dtSim, pollMs, mode, r: +r.toFixed(2),
      nose: +nose.toFixed(2), cut: +cut.toFixed(2), gap: +g.toFixed(2), ag: +ag.toFixed(2),
      om: +wEff.toFixed(2), side, aErr: +aimErr.toFixed(2), thW: +thWant.toFixed(2), spr: sprint ? 1 : 0, fm: b.facingMe, wind: +b.wind.toFixed(2),
      bph: b.ph, press: pressed, bhp: +b.hp.toFixed(1), whp: +f.w.hp.toFixed(0),
      stam: f.w.stam, spd: f.w.spd, exh: f.w.exh ? 1 : 0, grade: f.w.grade,
      wx: f.w.x, wz: f.w.z, bx: b.x, bz: b.z, hdg: b.hdg, yaw: f.w.yaw,
      toB: +toB.toFixed(3), mvD: +moveDir.toFixed(3)
    });
    if (rows.length % 20 === 0) {
      const L = rows[rows.length - 1];
      process.stdout.write(`   [${(f.clock - simB0).toFixed(1)}s] ${L.mode} r=${L.r} ag=${L.ag} nose=${L.nose} fm=${L.fm} wind=${L.wind} land=${bLanded}/${bPresses} dmg=${bDmg.toFixed(0)} bhp=${L.bhp} whp=${L.whp} st=${L.stam} spd=${L.spd} dt=${L.dt} poll=${L.pollMs}ms\n`);
    }
    await sleep(pollMs);
  }
  await H.releaseAll();
}

const nRows = Math.max(1, rows.length);
rMean /= nRows; gapMean /= nRows;
const simB = simLast !== null && simB0 !== null ? +(simLast - simB0).toFixed(1) : 0;
const dps = simB > 0 ? bDmg / simB : 0;
console.log(`\n── verdict ──`);
if (SANITY > 0) console.log(`   A sanity  : ${aLanded}/${aPresses} presses landed · ${aDmg.toFixed(0)} dmg`);
console.log(`   B ring    : ${bLanded}/${bPresses} swings landed · ${bDmg.toFixed(0)} dmg · ${bLanded ? (bDmg / bLanded).toFixed(2) : '-'} dmg/land`);
console.log(`               landings: behind(6) ${behindLands} · flank(2) ${flankLands} · face(1) ${faceLands}`);
console.log(`               hits taken ${bHits} (${bDmgTaken.toFixed(0)} dmg) · boss time ${simB}s · polls ${rows.length} · poll cadence ${pollMs}ms · dt/poll ${dtEma.toFixed(3)}s`);
console.log(`               gap mean ${gapMean.toFixed(2)} (±π = its tail) · blind side held ${Math.round(blindPolls / nRows * 100)}% · r mean ${rMean.toFixed(2)} · spd mean ${(spdMean / nRows).toFixed(1)} · stam floor ${stamMin}`);
console.log(`               modes: close ${closePolls} · ring ${ringPolls} · wind ${windPolls} · flee ${fleePolls} · sprint ${sprintPolls}`);
console.log(`   dps       : ${dps.toFixed(2)} dmg/sim-s → a ${lab.hp} hp ${lab.boss} falls in ~${dps > 0 ? (lab.hp / dps).toFixed(0) : '∞'}s`);
if (bHits > 0) console.log(`   incoming  : ${(bDmgTaken / Math.max(1, simB)).toFixed(2)} dmg/sim-s · wolf hp ${lab.wolfHp} + regen 3/s → ${bDmgTaken / Math.max(1, simB) > 3 ? 'NET LOSING' : 'NET SURVIVABLE'}`);

const out = path.join('test/speedrun/runs', `probe_fight_${Date.now()}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ lab, params: { SPEED, RATE, LVL, RING_R, MINCUT, LEG, TIER }, phaseA: { presses: aPresses, landed: aLanded, dmg: aDmg }, phaseB: { presses: bPresses, landed: bLanded, dmg: bDmg, behindLands, flankLands, faceLands, hits: bHits, dmgTaken: bDmgTaken, simS: simB, dps }, trace: TRACE }, null, 1));
console.log(`\n📄 ${out}`);
await S.browser.close();
process.exit(0);
