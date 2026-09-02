/* ============ 🤖 AI PLAY — the wolf plays itself (in-game watch mode) ============
   RAFZZER v1.0 — The Neural AI. The v7 "True Hunter" reflex ladder survives underneath
   as the BRAINSTEM (water escape, anti-stuck, corridor executor, quest discipline — the
   things a wolf must never mislearn). Above it grows a neural cortex: 18 senses →
   10 tanh hidden → 6 sigmoid urges that shape temperament — when to flee, rest, drink,
   yield ground, how patiently to stalk, how freely to sprint. Weights are born from the
   baked champion RAFZZER_SEED and evolve ONLY through gated generations: every death is
   scored, and a mutant may carry its learnings forward solely if it passed the human
   verification gate (test/rafzzer_gens.mjs). Deaths also write SCARS — lineage memory
   that heightens the senses which failed. In-game: tap the 🧠 button. Headless: ?autopilot=1.
   M46 v6.5 (crown bake): build.py injects the lineage champion (test/rafzzer_champion.json)
   into RAFZZER_SEED + RAFZZER_CHAMP_GEN/FIT, so the shipped 🧠 button plays the current crown
   (GEN 50, fit −55 at the time of writing); a browser's own rafzzer_best may only play if it
   outscored the champion. src/autopilot.js keeps the wild mind as the dev fallback. */
(function () {
  const URL_ON = /[?&]autopilot=1/.test(location.search);
  window.RAFZZER_SEED = [0.0234,-0.5621,0.4874,0.6369,0.1669,0.371,0.225,-0.163,-0.4771,0.1247,0.3347,0.1592,1.1324,-0.327,-0.0719,0.1688,0.1704,-0.2587,0.1319,-0.0261,-0.0932,-0.3689,0.7677,0.4295,-0.1013,-0.166,0.6516,-0.119,0.1782,0.6965,0.0414,0.0574,-0.2697,0.0026,0.2275,0.2447,0.0218,-0.3459,0.1511,-0.026,0.1172,-0.2437,0.812,-0.1727,0.1496,-0.2585,-0.001,0.2902,0.1305,-0.2601,-0.1165,0.51,-0.3546,0.1033,0.1996,0.7167,0.0844,0.2185,0.2309,-0.8122,0.4198,-0.7888,-0.0726,0.1041,0.6261,-0.5373,-0.4313,-0.0523,-0.2643,0.2403,0.2959,-0.0621,-0.0084,0.5432,0.2284,0.0606,0.1058,-0.113,0.141,0.3524,0.3378,0.2277,-0.4354,0.0909,-0.5425,0.3781,0.5307,0.0248,0.1206,0.081,-0.0391,-0.6601,-0.3483,-0.6543,-0.6308,0.6237,-0.2714,-0.1454,0.4709,-0.4027,0.4038,-0.6885,0.2765,0.1655,0.0855,-0.5718,0.2635,-0.285,0.1458,-0.0457,0.4714,0.1289,0.0896,0.129,0.109,0.2939,-0.1423,0.0308,0.5143,0.1813,0.3823,-0.9089,-0.0177,0.7681,-0.3915,0.1884,-0.1664,0.283,-0.2703,-0.1549,0.6349,0.302,-0.2537,-0.4975,-0.4685,0.244,-0.384,0.1435,0.3505,0.0189,0.4478,0.1418,-0.3464,0.4441,0.0019,-0.1113,0.4427,-0.2581,-0.251,0.3879,-0.4745,-0.3063,0.0221,0.136,-0.312,0.2218,0.2008,-0.3542,-0.0697,-0.113,0.1741,0.3236,0.3391,0.4144,0.0595,0.3413,0.1899,0.4986,0.0764,0.331,-0.8774,-0.4744,0.7997,-0.2007,0.0401,0.0619,0.1553,0.263,-0.2398,0.0586,0.1847,-0.31,0.1579,-0.2572,0.2519,0.1735,-0.3057,0.0837,0.1766,-0.2572,-0.1305,-0.0525,0.2673,-0.0153,-0.1829,0.3615,-0.233,-0.2173,-0.2046,0.6633,-0.1308,-0.2675,-0.2456,-0.6664,-0.5133,0.2025,-0.0114,0.5363,0.0133,-0.0664,0.0592,-0.3889,-0.1544,0.1725,0.2479,1.0494,0.1634,0.5876,0.3043,0.1107,-0.378,-0.0907,0.4253,0.1973,-0.0174,-0.0364,-0.6411,0.0699,-0.0868,0.7133,0.7998,0.2525,0.284,-0.1488,0.1123,-0.0531,0.3306,0.4337,-0.0737,0.1571,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.6925,0.0542,0.0859,0.6342,-0.836,-0.4266,-0.6151,-0.4088,-1.0398,-0.3954,-0.3039,-0.2527,-0.3186,-0.4549,0.5306,-0.7392,-0.3871,-0.0353,-0.6873,-0.1391,-0.3349,-0.4804,0.2859,0.2231,0.564,-0.4285,-0.4295,0.7369,-0.3899,0.6057,0.6709,0.2712,0.0826,0.6131,-0.5638,0.5733,-0.5669,0.2608,-0.322,-0.2185,1.03,0.3593,0.205,0.2064,-0.0268,-0.0498,0.7662,-1.2373,-0.2882,-0.2788,-0.375,-0.3401,-0.4301,0.3875,-0.8657,-0.6018,0.0501,0.2768,0.123,0.5261,-0.0059,0.7503,0.6658,-0.309,-0.6752,0.1582];   // 🧠 LAW-v4 mind: seed 20070, 26 senses (336 weights) — trophy lineage; rows 24-25 = side-channel + gate urgency (zero-padded from the 316 brain)   // 🧠 LAW-v4 wild mind: seed 20070, 24 senses (316 weights) — the trophy lineage crowns its own champion   // 🧠 LAW-v4 wild mind: seed 20070, 24 senses (316 weights) — the trophy lineage crowns its own champion   // 🧠 baked champion: GEN 9 of the rafzzer lineage (law-v3 fitness 283 — L7/1079xp/79.6xp·min⁻¹, 43s avg quests, cap-survivor); earned its crown through the human gate   // 🧠 baked champion: GEN 3 of the rafzzer lineage (fitness 80 — the cap-survivor, L6/917xp); earned its crown through the human gate

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

  /* ============ 🧠 RAFZZER v1.0 — the neural cortex (generational) ============
     24 senses → 10 tanh → 6 urges, ALL clamped before the brainstem ever sees them:
     a mutant can be brave or cowardly, patient or rash — never suicidal or inert.
     SAFK (safe knobs) ≈ v7.20 baseline: with the cortex dreaming, the wolf still
     plays the proven game. fitness() is the single scoring law, identical in-page
     and in the harness, so no generation can be judged by two different rulers.
     M46 · LAW v4 (TROPHY LAW, 2026-08-31, trainer's core rule): a generation earns
     its keep on TIER TROPHIES — highest tier, fastest top-tier time, most efficient
     road (time/stalls). Senses 20-23 append the campaign cortex (progress, tier,
     deed meter, tier clock); senses 18-19 remain bear-proximity / sky-threat. */
  const RAFZ = window.RAFZZER = (() => {
    const NI = 26, NH = 10, NO = 6, NW = NI * NH + NH + NH * NO + NO;   // 26 senses: + side-channel + gate urgency (LAW v4)
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const mul32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const gauss = (rnd, sd) => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * v) * sd; };
    const fresh = () => { const rnd = mul32(20070); const w = new Array(NW).fill(0); for (let i = 0; i < NI * NH; i++) w[i] = gauss(rnd, 0.38); for (let i = NI * NH + NH; i < NW; i++) w[i] = gauss(rnd, 0.45); return w; };   // Xavier-scaled: an unsaturated mind is a living mind
    const S = { gen: 0, weights: null, scars: { fight: 0, neglect: 0, water: 0 }, hist: {}, outs: [], xs: null, last: null, lastXp: null, xpEMA: 0, goalD: 99, wasSwim: false, external: false, ticks: 0 };
    const NOLEARN = /[?&]nolearn=1/.test(location.search) || !!window.RAFZZER_NO_STORE;   // harness builds: node owns the lineage
    // M46 v6.5: the shipped game boots the BAKED lineage crown — build.py injects the champion
    // (test/rafzzer_champion.json) into RAFZZER_SEED + RAFZZER_CHAMP_GEN/FIT. A browser's own
    // rafzzer_best may only play if it BEAT the champion's fitness: local evolution starts FROM
    // the champion and must outscore it to take the field. Without a baked crown (dev/src or a
    // stale build) the old order stands — local best first, wild seed as the fallback.
    const champFit = Number.isFinite(+window.RAFZZER_CHAMP_FIT) ? +window.RAFZZER_CHAMP_FIT : null;
    if (!NOLEARN) try {   // shipped mode: the on-device challenger — champion-first
      const best = JSON.parse(localStorage.getItem('rafzzer_best') || 'null');
      if (best && best.weights && best.weights.length === NW && best.weights.every(Number.isFinite) && (champFit === null || best.fit > champFit)) {
        S.weights = best.weights.slice(); S.gen = best.gen || 0; S.scars = Object.assign(S.scars, best.scars || {});
      }
    } catch (e) { }
    if (!S.weights) {
      if (window.RAFZZER_SEED && window.RAFZZER_SEED.length === NW) {
        S.weights = window.RAFZZER_SEED.slice();   // the baked crown (the wild mind in dev builds)
        if (Number.isFinite(+window.RAFZZER_CHAMP_GEN)) S.gen = +window.RAFZZER_CHAMP_GEN | 0;   // badge/lineage numbering agree (no +1)
      } else S.weights = fresh();   // no seed at all — the wild mind
    }
    const SAFK = { aggression: 0.5, flee: 0.5, bossEngage: 0.6, restAt: 0.62, drinkAt: 24, yieldR: 26, stalkGive: 8, commitStam: 28, sprintRes: 55, fearMul: 0.95 };
    const K = Object.assign({}, SAFK);
    /* ---- LAW v4 · campaign probe: the trophy machine's live state (one source, in-page law + senses) ---- */
    const NLEG = (() => { try { return (typeof LEGENDS !== 'undefined' ? LEGENDS.length : 5) + 1; } catch (e) { return 6; } })();   // 5 legends + the Beast Master
    const campProbe = () => {
      const C = (window.CAMP && window.CAMP.state) ? window.CAMP.state() : null;
      if (!C) return { on: false, tier: 1, leg: 0, stage: 'q0', prepDone: 0, trophies: [], topTier: 0, topTimes: [], prog: 0, clock: 0, sideP: 0, gateU: 0 };
      const trophies = (C.trophies || []);
      const topTier = trophies.length ? Math.max(...trophies.map(t => t.tier | 0)) : 0;
      const topTimes = trophies.filter(t => (t.tier | 0) === topTier).map(t => +t.time || 0);
      const stF = ({ q0: 0, q1: 0.25, prep: 0.4, awaken: 0.62, boss: 0.8 })[C.stage] || 0;
      const prepF = C.stage === 'prep' ? Math.min(0.24, 0.08 * (C.prepDone | 0)) : 0;   // prepNeed ≤ 3 ⇒ ≤ 0.24
      const prog = Math.min(1, ((C.leg | 0) + stF + prepF) / NLEG);
      let clock = 0; try { clock = (window.CAMP && CAMP.simClock) ? CAMP.simClock() : ((window.CAMP && CAMP.clock) ? CAMP.clock() : 0); } catch (e) { }   // M46 v5: the GAME clock (sim), not wall — boost-proof
      // LAW v4 · SIDE-ERRAND SENSES: the fast-XP channel the level-up deed opens — the cortex
      // must SEE it to urge the wolf onto it. sideP = 1 errand slotted, 0.6 offered on the board,
      // 0 none. gateU = the level-up deed's own meter (how close the climb is).
      let sideP = 0, gateU = 0;
      try { const si = (window.CAMP && window.CAMP.side) ? window.CAMP.side() : null;
        if (si && si.on) { sideP = si.active ? 1 : (si.avail > 0 ? 0.6 : 0); if (si.need) gateU = clamp((si.have || 0) / si.need, 0, 1); }
      } catch (e) { }
      return { on: true, tier: Math.max(1, C.tier | 0), leg: C.leg | 0, stage: C.stage, prepDone: C.prepDone | 0, trophies, topTier, topTimes, prog, clock, sideP, gateU };
    };
    const sense = ctx => {
      const p = ctx.pred && ctx.pred.a, r = (typeof nearestRival === 'function' && nearestRival()) || { d: 999 };
      const CP = campProbe();
      let deedP = 0;
      try { const qa = (typeof QUESTS !== 'undefined' && QUESTS.active && (QUESTS.active.find(q => q.side) || QUESTS.active[0])) || null; if (qa && qa.camp && qa.need) deedP = clamp((qa.have || 0) / qa.need, 0, 1); } catch (e) { }
      let preyD = 999, preyMeat = 0;
      try { const a = nearestAnimal(an => !an.dead && an.sp && an.sp.meat > 0 && !(bot.preyShun && an.sp.label === bot.preyShun.label)); if (a) { preyD = Math.hypot(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z); preyMeat = a.sp.meat; } } catch (e) { }
      // M46 · GEN 27+ (bear-aware scar, born from the eagle-dive evasions): the old
      // predator channel was blind to SHAPES — a Golden Eagle circles at ~10 m and
      // occluded the real ground threat (input 2 said "predator 12 m" while the bear
      // was 90 m). Two new senses: nearest ursine distance, and a graded sky-threat
      // (diving 1.0 / circling 0.55 / soaring 0.25, falling off with range).
      let bearD = 999, skyT = 0;
      try {
        for (const [, ch] of chunks) for (const pr of ch.predators) {
          if (pr.dead) continue;
          const d = Math.hypot(pr.pos.x - wolf.pos.x, pr.pos.z - wolf.pos.z);
          if (pr.sp && pr.sp.build === 'bear') { if (d < bearD) bearD = d; }
          else if (pr.sp && (pr.sp.build === 'eagle' || /eagle/i.test(String(pr.sp.label)))) {
            const t = d < 80 ? (1 - d / 80) * (pr.state === 'attack' ? 1 : pr.state === 'chase' ? 0.55 : 0.25) : 0;
            if (t > skyT) skyT = t;
          }
        }
      } catch (e) { }
      return [
        clamp(wolf.hp / wolf.maxHp, 0, 1), clamp(wolf.stamina / 100, 0, 1),
        clamp((ctx.pred ? ctx.pred.d : 999) / 80, 0, 1),
        p ? clamp(((p.level || 1) - wolf.level) / 10, -1, 1) : 0,
        p && (p.state === 'chase' || p.state === 'attack') ? 1 : 0,
        p ? clamp((p.dmg || (p.sp && p.sp.dmg) || 0) / 20, 0, 1.2) : 0,
        clamp((r.d || 999) / 40, 0, 1), clamp((ctx.bossHit ? ctx.bossHit.d : 999) / 120, 0, 1),
        clamp(preyD / 60, 0, 1), clamp(preyMeat / 8, 0, 1),
        clamp(S.goalD / 80, 0, 1), clamp(S.xpEMA, 0, 1), clamp(wolf.level / 25, 0, 1),
        clamp((typeof weather !== 'undefined' && weather.storm) || 0, 0, 1),
        clamp(((typeof WORLD_EVENTS !== 'undefined' && WORLD_EVENTS.chill) || 0) / 8, 0, 1),
        S.scars.fight / 3, S.scars.neglect / 3, S.scars.water / 3,
        clamp(1 - bearD / 80, 0, 1),  // 18 · ursine PROXIMITY (1 = bear at your paws, 0 = none) — M46 BUGFIX: was bearD/80,
                                      //     which fed "no bear for 80m" as a constant 1.0 → hidden-layer bias → saturated
                                      //     outputs → livingMind gate-strikes (GEN 28a3/29a1/33a1-2 evidence)
        skyT,                         // 19 · graded sky-threat (eagle dive/chase/soar; 0 = no eagle)
        // ---- LAW v4 · the four campaign senses (20-23): the trophy machine, in the cortex's view ----
        CP.prog,                      // 20 · through-tier progress 0..1 — legends slain + stage (q0 0 → trophy 1)
        clamp((CP.tier - 1) / 4, 0, 1),   // 21 · the ladder: tier 1..5 (higher tier = bigger prize, harsher wild)
        deedP,                        // 22 · the CURRENT deed's meter (have/need, 0 = no deed on the board)
        clamp(CP.clock / 600, 0, 2),  // 23 · the tier clock (wall-s since the tier began; 600 s = par)
        CP.sideP,                     // 24 · the fast-XP channel: 1 = side errand slotted, 0.6 = offered, 0 = none
        CP.gateU                      // 25 · the level-up deed's meter (how close the climb is)
      ];
    };
    const think = ctx => {
      S.ticks++;
      try {
        const xpNow = wolf.xp | 0;
        if (S.lastXp !== null) S.xpEMA = S.xpEMA * 0.9 + clamp(xpNow - S.lastXp, 0, 6) / 6 * 0.1;
        S.lastXp = xpNow;
        const x = sense(ctx); S.xs = x;
        const w = S.weights, o = new Array(NO).fill(0);
        const h = new Array(NH).fill(0);
        for (let j = 0; j < NH; j++) { let a = w[NI * NH + j]; for (let i = 0; i < NI; i++) a += x[i] * w[i * NH + j]; h[j] = Math.tanh(a); }
        for (let k2 = 0; k2 < NO; k2++) { let a = w[NW - NO + k2]; const off = NI * NH + NH; for (let j = 0; j < NH; j++) a += h[j] * w[off + j * NO + k2]; o[k2] = 1 / (1 + Math.exp(-0.85 * a)); }   // 0.85 gain: the sigmoid lives on its slope, not its ceiling
        if (!o.every(Number.isFinite)) { Object.assign(K, SAFK); return K; }   // blown mind → reflexes only
        const [aggr, flee, rest, drink, pat, spr] = o;
        K.aggression = aggr; K.flee = flee;
        K.bossEngage = clamp(0.6 - (aggr - 0.5) * 0.3, 0.45, 0.8);
        K.restAt = clamp(0.62 + (rest - 0.5) * 0.44, 0.38, 0.84);
        K.drinkAt = Math.round(clamp(24 + (drink - 0.5) * 28, 12, 40));
        K.yieldR = clamp(26 + (flee - 0.5) * 24, 14, 42);
        K.stalkGive = 3 + (1 - pat) * 10;
        K.commitStam = Math.round(clamp(35 - aggr * 13, 22, 42));
        K.sprintRes = Math.round(clamp(70 - spr * 30, 40, 72));
        K.fearMul = clamp(0.65 + flee * 0.6, 0.55, 1.3);
        S.outs.push(o); if (S.outs.length > 240) S.outs.shift();
        S.wasSwim = !!wolf.swimming;
        return K;
      } catch (e) { Object.assign(K, SAFK); return K; }   // the brainstem never dies for the cortex's dreams
    };
    const classify = c => { c = String(c || ''); if (S.wasSwim) return 'water'; if (/tiger|bear|leopard|lion|wolf|rival|boar|bison|wyrm|dragon|beast|hunter|serpent|stag|eagle|panther|lynx|croc/i.test(c)) return 'fight'; if (/frost|cold|storm|chill|starv|hunger|thirst|ice|freeze/i.test(c)) return 'neglect'; return 'unknown'; };
    const fitness = () => {   // LAW v4 · THE TROPHY LAW (single scoring law, 2026-08-31 — trainer's core rule):
      //   "generation success = the upper-tier TIER TROPHIES; TRUE success = how fast
      //    the highest tier is achieved and how EFFICIENTLY." So the law is:
      //      (1) TROPHIES dominate — exponential in tier (every trophy counts; higher tiers crush lower);
      //      (2) SPEED at the top tier — the faster the trophy's record time, the more honour;
      //      (3) THE ROAD — progress within the current tier is the gradient for runs that
      //          haven't closed the cycle yet (plus legend kills), so evolution never flies blind;
      //      (4) EFFICIENCY — the tier clock and sim time cost, and the wolf pays only for its
      //          own misbehaviour (stuck/loops); deaths end the run and pay a tier-scaled pen.
      const R = window.RUN || {};
      const BN = window.BOTN || {};
      const CP = campProbe();
      const cls = classify(R.cause);
      const pen = ({ fight: 120, water: 200, neglect: 90, unknown: 60 }[cls] || 60) * (1 + 0.6 * (CP.tier - 1));
      const stall = 8 * (BN['stuck'] || 0) + 15 * (BN['bug-bot-loop'] || 0);
      const durS = Math.max(1,
        (() => { try { return (window.CAMP && window.CAMP.simClock) ? window.CAMP.simClock() : 0; } catch (e) { return 0; } })() ||   // M46 v6: the GAME clock — boost-proof
        R.dur || ((window.__boost && __boost.ticks) ? __boost.ticks * 0.05 : (performance.now() - (R.t0 || performance.now())) / 1000));
      let f = 0;
      // (1) THE TROPHIES — the one thing that decides a generation
      for (const t of CP.trophies) f += 1200 * Math.pow(2.5, Math.max(0, (t.tier | 0) - 1));
      // (2) SPEED at the top tier (best record time of the highest tier achieved)
      if (CP.topTimes.length) f += Math.max(0, 1000 - Math.min(...CP.topTimes)) * 0.6 * Math.pow(2.5, Math.max(0, CP.topTier - 1));
      // (3) THE ROAD — the gradient: tier progress + the legends felled
      f += 220 * CP.prog * Math.pow(2.5, CP.tier - 1) + 60 * (R.bosses || 0);
      // (4) EFFICIENCY — every second of the road costs; mistakes cost more than time
      f -= CP.clock * 0.03 * Math.pow(2.5, CP.tier - 1) + 0.012 * durS;
      // small keeps (they feed the campaign's XP gates — never allowed to decide a generation).
      // SIDE ERRANDS (the level-up deed's fast-XP channel): +25 each, capped at 3 — a clear
      // efficiency gradient, but one trophy (1200·2.5^tier) still dwarfs any side streak.
      const xpRate = (R.xp || 0) * 60 / durS;
      f += 0.5 * Math.min(xpRate, 240) + 3 * (R.quests || 0) + 0.04 * (R.xp || 0) + 1.5 * (R.maxLevel || 0) + 1 * (R.kills || 0) + 25 * Math.min(3, (R.side || 0));
      return Math.round(f - pen - stall);
    };
    const die = ctx => {
      try {
        const R = window.RUN || {}, cls = classify(R.cause);
        const fit = fitness();
        const sc = cls === 'unknown' ? 'fight' : cls;
        S.scars[sc] = Math.min(3, (S.scars[sc] || 0) + 1);
        S.last = { fitness: fit, cause: R.cause || 'the wild', cls, dur: +(R.dur || 0).toFixed(1), maxLevel: R.maxLevel || 0, xp: R.xp || 0, hist: Object.assign({}, S.hist), scars: Object.assign({}, S.scars), gen: S.gen, ticks: S.ticks };
        window.RAFZZER_LAST = S.last;
        log('rafzzer-death', { msg: '🧠 GEN ' + S.gen + ' fell — ' + cls + ' · fitness ' + fit + ' · scars ' + S.scars.fight + '/' + S.scars.neglect + '/' + S.scars.water, fitness: fit, cls });
        if (!S.external) try {   // shipped mode self-evolution (never in the harness — node owns the lineage)
          const best = JSON.parse(localStorage.getItem('rafzzer_best') || 'null');
          if (!best || fit > (best.fit || -1e9)) localStorage.setItem('rafzzer_best', JSON.stringify({ fit, gen: S.gen, weights: S.weights, scars: S.scars }));
        } catch (e) { }
      } catch (e) { }
    };
    return {
      get gen() { return S.gen; }, get scars() { return S.scars; }, get hist() { return S.hist; },
      NW, SAFE: SAFK, think, die,
      bump: tag => { S.hist[tag] = (S.hist[tag] || 0) + 1; },
      mode: (m, stalk, dg) => { S.hist[m] = (S.hist[m] || 0) + 1; if (stalk) S.hist.stalk = (S.hist.stalk || 0) + 1; S.goalD = dg; },
      load: (weights, scars, gen) => {   // harness injection — validates before the mind is swapped
        if (!Array.isArray(weights) || weights.length !== NW || !weights.every(Number.isFinite)) throw new Error('RAFZZER.load: corrupt weights (' + (weights && weights.length) + ' of ' + NW + ')');
        S.weights = weights.slice(); S.scars = { fight: 0, neglect: 0, water: 0, ...(scars || {}) };
        ['fight', 'neglect', 'water'].forEach(k2 => S.scars[k2] = clamp(S.scars[k2] | 0, 0, 3));
        S.gen = gen | 0; S.external = true; S.hist = {}; S.outs = []; S.last = null; S.lastXp = null; S.xpEMA = 0; S.goalD = 99; S.ticks = 0;
        log('rafzzer-load', { msg: '🧠 GEN ' + S.gen + ' mind loaded — scars ' + S.scars.fight + '/' + S.scars.neglect + '/' + S.scars.water });
      },
      snapshot: () => ({ gen: S.gen, fitNow: fitness(), knobs: Object.assign({}, K), hist: Object.assign({}, S.hist), scars: Object.assign({}, S.scars), ticks: S.ticks, inputs: S.xs ? S.xs.map(v => +v.toFixed(3)) : null, outs: S.outs.slice(-60), external: S.external, last: S.last })
    };
  })();

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
      const qSum = QUESTS.active.reduce((n, qq) => n + (qq.have || 0), 0) + QUESTS.done.length * 100;
      if (qSum > (bot.qSum || -1)) bot.qProgT = SIMNOW();
      bot.qSum = qSum;
      if (!bot.anchor) bot.anchor = { x: wolf.pos.x, z: wolf.pos.z, t: SIMNOW() };
      else if (SIMNOW() - bot.anchor.t > 180000) {
        const disp = Math.hypot(wolf.pos.x - bot.anchor.x, wolf.pos.z - bot.anchor.z);
        if (disp < 140 && SIMNOW() - (bot.qProgT || 0) > 180000) {   // 3 min parked in one region with zero quest progress — leave
          const qg = window.questGuide ? window.questGuide() : null;
          const yawT = qg && qg.d > 250 ? Math.atan2(qg.x - wolf.pos.x, qg.z - wolf.pos.z) : Math.random() * 6.28;
          bot.trek = { x: wolf.pos.x + Math.sin(yawT) * 450, z: wolf.pos.z + Math.cos(yawT) * 450, until: SIMNOW() + 70000 };
          bot.wander = null; bot.lmStick = null; bot.ford = null;
          log('tether-break', { disp: +disp.toFixed(0), msg: 'this region is spent — striking out for new ground' });
        }
        bot.anchor = { x: wolf.pos.x, z: wolf.pos.z, t: SIMNOW() };
      }
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
  badge.textContent = '● LIVE — 🧠 RAFZZER v1.0 NEURAL AI · GEN ' + RAFZ.gen + (Number.isFinite(+window.RAFZZER_CHAMP_FIT) ? ' · 🏆 CHAMPION fit ' + +window.RAFZZER_CHAMP_FIT + ' (lineage crown)' : '');
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
    trek: null, wanderHist: [], wanderT: 0, pathWin: [], loopN: 0, loopEpoch: 0, loopCd: 0, lmStick: null, lmBlack: null, lmNear: null, lmFails: 0, closeW: null, travStick: null, questLock: null, preyShun: null, lastYaw: undefined, stalkT0: 0, stalkD0: 0, pauseUntil: 0, pauseWhy: ''
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
      if (r.dead || (r.pack && r.pack.stance === 'bonded')) continue;   // one's own pack is family, never a duel
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
    let best = null, bd = 1e9, narrow = null, nd = 1e9;   // narrow = reachable only by fording — last resort
    for (let r = 120; r <= 1000; r += 80)
      for (let a4 = 0; a4 < 6.28; a4 += 0.5) {
        const x = wolf.pos.x + Math.sin(a4) * r, z = wolf.pos.z + Math.cos(a4) * r;
        const ok = anyHigh ? heightAt(x, z) > 38 : dominantBiomeAt(x, z).key === biome;
        if (!ok) continue;
        const d = Math.hypot(x - wolf.pos.x, z - wolf.pos.z);
        let wet = 0;
        for (let k = 1; k <= 3; k++) if (heightAt(wolf.pos.x + (x - wolf.pos.x) * k / 4, wolf.pos.z + (z - wolf.pos.z) * k / 4) < waterYNow() - 0.35) wet++;
        if (wet === 0) { if (d < bd) { bd = d; best = { x, z, d }; } }
        else if (d < nd) { nd = d; narrow = { x, z, d }; }
      }
    return best || narrow;   // prefer dry routes — ford only when the land itself lies across the water
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
  const applyAim = () => { };   // the per-frame glider below does the turning — no more 150 ms lurches
  // ---- the glider: every rendered frame, ease the camera toward the chosen heading ----
  const steerGlide = () => {
    try {
      if (aimYaw !== null && !window.BOT_OFF && typeof state !== 'undefined' && state === 'play') {
        const err = wrapPI(aimYaw + Math.PI - camYaw);
        const rate = 0.028 + 0.085 * (aimEase || 0.45);        // rad/frame: gentle walk-turns, quick bite-turns
        camYaw += Math.sign(err) * Math.min(Math.abs(err) * 0.18, rate);
      }
    } catch (e) { }
    requestAnimationFrame(steerGlide);
  };
  requestAnimationFrame(steerGlide);

  /* ---------------- quest selection: score offers like a player reading the board ---------------- */
  const questScore = q => {
    let s = 1;
    if (q.kind === 'survive') s = q.days ? 6 : 4.5;                       // passive progress, always worth a slot
    else if (q.kind === 'hunt') {
      const ref = SPECIES[q.species];
      const hit = nearestAnimal(a => a.sp === ref || (ref && a.sp.label === ref.label));
      s = hit.d < 160 ? 4 : hit.d < 400 ? 2.5 : 1.2;
    } else if (q.kind === 'collect') {
      // M46 BUGFIX (rafzzer lineage): a deed the land cannot fulfil is a walking stall,
      // not a quest — supply, not distance alone, must decide whether a gather is real.
      const sup = typeof pickupSupply === 'function' ? pickupSupply(q.item) : 1e9;
      const left = Math.max(1, (q.need || 1) - (q.have || 0));
      s = sup >= left + 1 ? (nearestPk(q.item).d < 120 ? 3.6 : 1.4) : 0.25;
    } else if (q.kind === 'combat') {
      s = wolf.hp > wolf.maxHp * 0.8 && wolf.level >= 1 ? 3.4 : 0.35;   // strong wolves take the fight
    } else if (q.kind === 'xp') {
      s = 4.6;   // earns itself — the wolf just keeps living well
    } else if (q.kind === 'harvest') {
      s = nearestAnimal(an => !an.dead && an.sp && an.sp.meat > 0).d < 240 ? 3.2 : 1.6;
    } else if (q.kind === 'herbal') {
      // herbal prep deeds are GATHER deeds (herb or mushroom) — score on supply, like collect
      const sup = (typeof pickupSupply === 'function' ? pickupSupply('herb') + pickupSupply('mushroom') : 1e9);
      s = sup >= (q.need || 1) ? (nearestPk('herb').d < 120 || nearestPk('mushroom').d < 120 ? 3.6 : 1.5) : 0.3;
    } else if (q.kind === 'scout' || q.kind === 'ritual' || q.kind === 'travel') {
      const d = q.wp ? Math.hypot(q.wp.x - wolf.pos.x, q.wp.z - wolf.pos.z) : 400;
      s = d < 320 ? 3.4 : 1.2;
    } else if (q.kind === 'explore') {
      let bd = 1e9, any = false;
      for (const lm of landmarkList) { if (q.lmType && lm.type !== q.lmType) continue; any = true; const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z); if (d < bd) bd = d; }
      s = !any ? 0.4 : bd < 220 ? 3.4 : bd < 500 ? 2 : 1;
    } else if (q.kind === 'rival') s = wolf.level >= 3 && wolf.hp > 70 ? 3 : 0.3;
    if (q.side) {   // LAW v4 · side errands = the fast-XP channel — always worth a slot…
      // M46 v6 coach · …but a FAR errand is a wandering trap (GENS 41/43 walked 9-12 km for
      // 0-3 quests): score by real supply distance so the wolf takes the EFFICIENT errands.
      if (q.kind === 'hunt') {
        const ref = SPECIES[q.species];
        const hit = nearestAnimal(a => a.sp === ref || (ref && a.sp.label === ref.label));
        s = hit.d < 200 ? 9 : hit.d < 500 ? 7 : 4.5;
      } else if (q.kind === 'collect') {
        const sup = typeof pickupSupply === 'function' ? pickupSupply(q.item) : 1e9;
        s = sup >= (q.need || 1) ? (nearestPk(q.item).d < 200 ? 9 : 6.5) : 2;
      } else if (q.kind === 'explore') {
        let bd = 1e9, any = false;
        for (const lm of landmarkList) { if (q.lmType && lm.type !== q.lmType) continue; any = true; const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z); if (d < bd) bd = d; }
        s = !any ? 2 : bd < 250 ? 8.5 : bd < 600 ? 6 : 3;
      } else s = Math.max(s + 3.2, 6);
    }
    if (q.biome === curBiomeKey) s += 1.2;                                 // work the land I'm standing in
    const deeds = (typeof questsDoneByBiome !== 'undefined' ? (questsDoneByBiome[q.biome] || 0) : 0);
    const legendLand = BOSSES[q.biome] && !BOSSES[q.biome].slain;
    if (deeds === 2 && legendLand) s += 2.6;                               // one deed from waking a legend!
    else if (deeds === 2) s += 0.6;
    if (deeds >= 3 && !legendLand) s -= 0.8;                               // spent lands with no legend — move on
    return s;
  };
  /* ---- quest discipline: ONE main deed at a time, at most ONE side errand riding it
         (the level-up deed opens the fast-XP channel: errands are slotted and worked
         as the deed, because they are the efficient road) ---- */
  const QUEST_SEQ = ['small', 'small', 'small', 'medium', 'medium', 'big'];
  const trackProgress = q => {   // shared stall-clock: numeric progress OR approach both count as living
    const pr = q.have || 0;
    if (bot.qPr !== pr) { bot.qPr = pr; bot.qPrT = SIMNOW(); }
    const g = window.questGuide && window.questGuide();
    // M46 BUGFIX (gen11 record): APPROACH is progress for every clock, not just the
    // 12-min flatline — a wolf closing 100 m on the next pickup (or a quarry it can
    // nearly see) is not stalled, and the 5-min/150-s clocks must know it.
    if (g) { const d = g.d | 0; if (bot.qGd === undefined || d < bot.qGd - 3) { bot.qGd = d; bot.qPrT = SIMNOW(); bot.stallT = bot.hardT = SIMNOW(); } bot.qGd = Math.min(bot.qGd === undefined ? d : bot.qGd, d); bot.lastQGd = d; }
    else bot.lastQGd = -1;
  };
  const keepQuestsFilled = () => {
    if (bot.seqIx === undefined) bot.seqIx = 0;
    if (bot.questId === undefined) bot.questId = null;
    if (bot.questIdSide === undefined) bot.questIdSide = false;
    // discipline: ONE main deed, at most ONE side errand — extras go back
    for (let guard = 0; guard < 4; guard++) {
      const mains = QUESTS.active.filter(q => !q.side), sides = QUESTS.active.filter(q => q.side);
      const extra = mains.length > 1 ? (mains.find(q => q.id !== bot.questId) || mains[1])
        : sides.length > 1 ? (sides.find(q => q.id !== bot.questId) || sides[1]) : null;
      if (!extra) break;
      log('quest-extra-back', { msg: 'one deed at a time — ' + extra.title + ' goes back on the board' });
      abandonQuest(extra.id);
    }
    const sideQ = QUESTS.active.find(q => q.side) || null;
    const mainQ = QUESTS.active.find(q => !q.side) || null;
    if (sideQ) {   // the errand IS the deed now — the fast channel gets commitment
      if (bot.questId !== sideQ.id) { bot.questId = sideQ.id; bot.questIdSide = true; }
      trackProgress(sideQ);
      if (sideQ.kind !== 'survive' && SIMNOW() - (bot.qPrT || SIMNOW()) > 600000) {   // 10 min flat — drop the errand, board offers another
        log('side-flatlined', { msg: sideQ.title + ' — not closing; setting the errand aside' });
        bot.shunned.add(sideQ.title);
        abandonQuest(sideQ.id);
        if (bot.questId === sideQ.id) { bot.questId = mainQ ? mainQ.id : null; bot.questIdSide = false; }
        bot.qGd = undefined;
      }
      return;
    }
    if (mainQ) {
      if (!bot.questId || bot.questIdSide) { bot.questId = mainQ.id; bot.questIdSide = false; }   // adopted, or the errand just ended — the main deed is the lock
      trackProgress(mainQ);
      if (mainQ.kind !== 'survive' && SIMNOW() - (bot.qPrT || SIMNOW()) > 720000) {   // 12 min utterly flat — the one honest escape
        log('quest-flatlined', { msg: mainQ.title + ' — no progress nor approach for 12 minutes; setting it aside' });
        bot.shunned.add(mainQ.title);
        abandonQuest(mainQ.id);
        bot.questId = null; bot.qGd = undefined;
        return;
      }
      // LAW v4 · the level-up deed opens the fast channel — slot the best side errand offered
      if (mainQ.kind === 'xp' && QUESTS.avail.some(q => q.side)) {
        let best = null, bs = -1e9;
        for (const q of QUESTS.avail) if (q.side) { const sc = questScore(q) - (bot.shunned.has(q.title) ? 60 : 0); if (sc > bs) { bs = sc; best = q; } }
        if (best) { acceptQuest(best.id); bot.questId = best.id; bot.questIdSide = true; log('side-accept', { msg: 'fast lane: ' + best.title }); }
      }
      return;   // committed: finish what was started — no shuffling
    }
    if (bot.questId) {   // the deed left active — completed (or the rare flatline) — next step of the cycle
      bot.seqIx = (bot.seqIx + 1) % QUEST_SEQ.length;
      bot.questId = null; bot.qGd = undefined; bot.questIdSide = false;
    }
    const want = QUEST_SEQ[bot.seqIx];
    if (typeof refillQuests === 'function') refillQuests();
    let pool = QUESTS.avail.filter(q => window.questSize(q) === want);
    if (!pool.length) {   // the land offers no deed of that weight right now — take the nearest weight, keep the rhythm
      const alt = want === 'big' ? ['medium', 'small'] : want === 'medium' ? ['small', 'big'] : ['medium', 'big'];
      for (const a of alt) { pool = QUESTS.avail.filter(q => window.questSize(q) === a); if (pool.length) { log('quest-substitute', { msg: 'no ' + want + ' deed on the board — taking a ' + a + ' one' }); break; } }
    }
    if (!pool.length) return;
    let best = null, bs = -1e9;
    for (const q of pool) { const sc = questScore(q) - (bot.shunned.has(q.title) ? 50 : 0); if (sc > bs) { bs = sc; best = q; } }
    if (!best) best = pool[0];
    acceptQuest(best.id);
    bot.questId = best.id;
    log('quest-seq', { msg: 'deed ' + (bot.seqIx + 1) + '/6 (' + want + '): ' + best.title });
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
          RAFZ.die({ predD: np.d, bossD: lb.d, rivalD: rv.d });
          // M46 BUGFIX (gen5 record): the 5-min stall clock used to survive the death +
          // respawn teleport and fire on the fresh life. The clock is born again with the wolf —
          // and so is the approach channel (the monotonic guide-distance minimum would
          // otherwise remember the old life's 30 m and swallow a 400 m trek's progress).
          bot.stallQ = null; bot.stallHave = 0; bot.stallT = bot.hardT = SIMNOW(); bot.qPrT = SIMNOW(); bot.qGd = undefined;
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
      const NK = RAFZ.think({ pred, bossHit, frac });   // 🧠 the cortex weighs the moment

      let targetPk = null;   // (declared here — v6.4c TDZ fix: the swim branch (below) reads targetPk but its let was 200 lines down → every swim threw 'Cannot access before initialization' and blinded the tick; GEN 53 was jumped right after a swim)

      /* ---------- 0. water: a wolf swims to shore, always ---------- */
      if (wolf.swimming) {
        let shoreYaw = null, bestH = -1e9;
        for (let k = 0; k < 12; k++) {
          const yy = (k / 12) * Math.PI * 2;
          const h = heightAt(wolf.pos.x + Math.sin(yy) * 10, wolf.pos.z + Math.cos(yy) * 10) - waterYNow();
          if (h > bestH) { bestH = h; shoreYaw = yy; }
        }
        if (bot.ford && SIMNOW() < bot.ford.until) {   // committed crossing — hold straight for the far bank
          aim(bot.ford.yaw, 0.85);
          keys.KeyW = true; keys.ShiftLeft = false; wolf.crouch = false;
          bot.goalText = '🌊 fording toward the deed';
          if (!bot.fordLog || SIMNOW() - bot.fordLog > 15000) { bot.fordLog = SIMNOW(); log('ford', { msg: 'crossing the water — the deed waits beyond' }); }
          applyAim(); return;
        }
        aim(shoreYaw, 0.9);
        keys.KeyW = true; keys.ShiftLeft = false; wolf.crouch = false;
        bot.goalText = '🌊 swimming to shore';
        if (targetPk && bot.pkBlack) { bot.pkBlack.add(targetPk); bot.gatherStick = null; log('pickup-skip', { msg: 'pickup across the water — swimming back, trying another' }); }
        if (!bot.swimLog || SIMNOW() - bot.swimLog > 20000) { bot.swimLog = SIMNOW(); log('swim', { msg: 'in deep water — heading for shore' }); }
        applyAim(); return;
      }

      /* ---------- 1. survive-critical: disengage and run ---------- */
      const bossThreat = bossHit.d < 26;
      const young = wolf.level < 3;
      // v6.4 pack-aware escape: hostile rival packs are NOT heavy hunters (each bite 4-6 dmg) but a
      // swarm of 3-5 members chews a wolf down in seconds — GEN 51 died to the Rival Wolf at L1 while
      // the flee line fired 7 times: the yaw aimed at whichever member was NEAREST that tick, so the
      // wolf zigzagged INSIDE the pack. Flee from the pack CENTROID, cache the heading (refresh at
      // most every 2 sim-s), and HOLD the sprint until nothing hostile is close.
      const packThreat = packHit.a && packHit.a.pack && packHit.a.pack.stance === 'attack' ? packHit.a.pack : null;
      let pCentX = 0, pCentZ = 0, pN = 0;
      if (packThreat) {
        for (const r of rivals) {
          if (r.dead || !r.pack || r.pack.stance !== 'attack') continue;
          const dd = Math.hypot(r.pos.x - wolf.pos.x, r.pos.z - wolf.pos.z);
          if (dd < 70) { pCentX += r.pos.x; pCentZ += r.pos.z; pN++; }
        }
        if (pN) { pCentX /= pN; pCentZ /= pN; }
      }
      const heavyHunter = pred.a && pred.a.sp && (pred.a.sp.dmg || 0) >= 9;   // v6.2: ALL wolf-hunters — cats (9-11) were fleeing at 34% hp = dead before the sprint started (GENS 40-45 died to Leopard/Tiger/SnowLeopard doing exactly this); flee starts at ~55% for any hunter
      // v6.4: a strong wolf on a rival deed (level>=3, hp>70% — mirrors the rival-quest gate) still
      // takes the pack; everyone else treats a hostile pack as hunter-grade (flee from ~58% hp)
      const rivalDeed = !!QUESTS.active.some(q => q.kind === 'rival') && !young && wolf.hp > wolf.maxHp * 0.7;
      const fleeBase = young ? 0.62 : pN ? 0.58 : heavyHunter ? 0.55 : 0.34;
      const fleeAt = Math.max(young ? 0.30 : 0.12, Math.min(0.75, fleeBase + (NK.flee - 0.5) * 0.5));
      // v6.4b THE LEGEND GATE — no dead zone: a legend within 45 m and the wolf is NOT mid-fight
      // with it → flee unless genuinely ready. GEN 52 reached stage 'boss' but stood in the
      // 41–62% band (below bossEngage, above fleeAt) while the Leopard Legend (ambush: flank
      // teleport, ×1.5 bites) ate it in ~6 s — it never even entered the fight loop (0 'boss' bumps).
      const bossNear = bossHit.d < 45;
      const inBossFight = bot.fight === 'boss';
      const fleeLine = (bossNear && !inBossFight) ? Math.max(fleeAt, 0.88) : fleeAt;
      const wantFlee = frac < (rivalDeed ? Math.min(fleeLine, 0.34) : fleeLine) && (pred.d < (young ? 60 : 50) || bossThreat || bossNear);
      const fleeing = bot.fleeUntil && SIMNOW() < bot.fleeUntil;   // hold the escape until genuinely clear
      if (wantFlee || fleeing) {
        const src = bossThreat && (!pred.a || bossHit.d < pred.d) ? bossHit.b.pos : (pN ? { x: pCentX, z: pCentZ } : pred.a.pos);
        const yx = wolf.pos.x - src.x, yz = wolf.pos.z - src.z, m = Math.hypot(yx, yz) || 1;
        let fleeYaw = Math.atan2(yx / m, yz / m);
        let waterExit = false;
        if (pN) {   // v6.4c packs NEVER cross deep water (they veer off at the shore) — a swarm
          // escape aims at the nearest water and COMMITS to the far bank (ford while swimming);
          // on land the wolf can't open 90 m (they give up at dWolf>90) before stamina dies — GEN 51
          // and GEN 53 both fled 7-10× and were chewed to death on the ground.
          let wBest = 1e9;
          for (let k = 0; k < 12; k++) {
            const a2 = k * 0.5236;
            for (let r = 30; r <= 70; r += 20) {
              if (heightAt(wolf.pos.x + Math.sin(a2) * r, wolf.pos.z + Math.cos(a2) * r) < waterYNow() - 0.4) {
                if (r < wBest) { wBest = r; fleeYaw = a2; waterExit = true; }
                break;
              }
            }
          }
        }
        if (!bot.fleeYaw || (SIMNOW() - (bot.fleeYawAt || 0) > 2000 && !bossThreat)) { bot.fleeYaw = fleeYaw; bot.fleeYawAt = SIMNOW(); }
        fleeYaw = bot.fleeYaw;   // stable heading — no tick-to-tick flip-flop inside a swarm
        // never flee into the sea: rotate toward dry land until the exit is safe (unless the
        // escape IS the water — pack pursuers)
        if (!waterExit) for (let k = 0; k < 8 && heightAt(wolf.pos.x + Math.sin(fleeYaw) * 12, wolf.pos.z + Math.cos(fleeYaw) * 12) < waterYNow() - 0.4; k++) {
          fleeYaw += (k % 2 ? 1 : -1) * 0.55 * Math.ceil((k + 1) / 2);
        }
        aim(fleeYaw, 0.6);
        keys.KeyW = true; keys.ShiftLeft = !wolf.exhausted && wolf.stamina > 8;   // burn the tank — escape or die
        wolf.crouch = false; bot.fight = null; bot.goalText = '🏃 fleeing at ' + (frac * 100).toFixed(0) + '% hp';
        if (waterExit && !bot.ford) bot.ford = { yaw: fleeYaw, until: SIMNOW() + 42000 };   // committed crossing — the far bank is the exit
        // hold: keep running until nothing hostile is near AND hp recovered; a missed exit retries
        const safeNow = !bossThreat && pred.d > 45 && frac > fleeAt + 0.06;
        if (safeNow) { bot.fleeUntil = 0; bot.fleeYaw = null; }
        else {
          if (!bot.fleeStart) bot.fleeStart = SIMNOW();
          bot.fleeUntil = Math.min(SIMNOW() + 6000, bot.fleeStart + 20000);   // 20 sim-s cap per episode
        }
        if (!bot.fleeLog || SIMNOW() - bot.fleeLog > 15000) { bot.fleeLog = SIMNOW(); log('flee', { msg: 'badly hurt — disengaging (pack ' + (pN || 0) + ' @ ' + Math.round(pred.d) + 'm → ' + (waterExit ? 'water' : 'land') + ')' }); }
        applyAim(); return;
      }
      bot.fleeUntil = 0; bot.fleeYaw = null; bot.fleeStart = 0;

      /* ---------- 2. boss fight (the story's boss battles) ---------- */
      // v6.4b: (a) once engaged, STAY in the fight down to the 42% cut (no mid-band abandon —
      // GEN 52 dropped below bossEngage and stood eating bites in the dead zone); (b) a FRESH
      // legend-fight needs L8+ and 88%+ hp — otherwise the legend-gate flee line held it at bay
      // while it levels/heals (landmarks +25, kills +8). The 3-dmg-bite wolf can only win the
      // 45hp Legend with ambush bites (behind ×1.5, +1 crouch = 7.5/bite) and full hp.
      if (bossHit.b && bossHit.d < 150 && wolf.level >= 3 &&
          ((bot.fight === 'boss' && frac > 0.42) || (wolf.level >= 8 && frac > 0.88))) {
        RAFZ.bump('boss');
        const b = bossHit.b, d = bossHit.d;
        bot.fight = 'boss';
        wolf.crouch = d < 12 && d > 3.6;   // v6.4b: prowl the blind side — a crouched ambush bite lands 5 dmg ×1.5 = 7.5 vs 3 standing
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
          const facingW = (Math.sin(wolf.yaw) * (b.pos.x - wolf.pos.x) + Math.cos(wolf.yaw) * (b.pos.z - wolf.pos.z)) / (d || 1);
          if (d < 4.4 + b.def.scale * 0.6 && facing < -0.2 && facingW > 0.3 && b.atkCd > 0.4 && SIMNOW() - bot.lastAtk > 900) {
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
      // v6.4d: a wolf rests until it can BOTH fight and flee — hp AND a real sprint tank
      // (stamina regen is a slow 0.5/s when still; GEN 54 left rest at ~70% hp / 20 stamina —
      // the flee line got 2 s of sprint and the Level-5 Lion chewed it 7 times at walk speed)
      if ((frac < NK.restAt || (bot.restT && (frac < Math.max(NK.restAt, 0.82) || wolf.stamina < 45))) && pred.d > 65 && bossHit.d > 130) {
        RAFZ.bump('rest');
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
      RAFZ.bump('drink-check');
      // v6.4d: only set out for water with enough hp to defend the trip (GEN 54 walked 61 m to
      // drink at 55% hp and a Level-5 Lion met it there — dead at the waterline)
      if (((wolf.stamina < NK.drinkAt && !bot.drinking && wolf.hp > wolf.maxHp * 0.55) || (bot.drinking && wolf.stamina < 88)) && pred.d > 55 && !wolf.swimming) {
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
      // CAMPAIGN: on a combat deed, a healthy wolf takes the fight instead of yielding
      bot.huntCombat = !!(QUESTS.active[0] && QUESTS.active[0].camp && QUESTS.active[0].kind === 'combat' && wolf.hp > wolf.maxHp * 0.8);
      // M46 · ursine guard (brainstem rule): against an apex bear while spent, the safe
      // ground starts farther out — a tired wolf cannot out-run a Ursus. Still inside the
      // SAFK envelope: the cortex's own yield knob sets the base, the rule only stretches it.
      const bearApex = pred.a && pred.a.sp && pred.a.sp.build === 'bear' && (pred.a.level || 1) >= wolf.level + 2 && (wolf.stamina < 35 || wolf.exhausted);
      const yieldR = bearApex ? Math.min(NK.yieldR * 1.8, 60) : NK.yieldR;
      if (pred.a && pred.d < yieldR && !bot.drinking && bossHit.d > 90 && !bot.huntCombat) {
        RAFZ.bump('yield');
        const away = Math.atan2(wolf.pos.x - pred.a.pos.x, wolf.pos.z - pred.a.pos.z) + (bot.giveSide || 0);
        aim(away, 0.55);
        keys.KeyW = true; keys.ShiftLeft = pred.d < 14 && wolf.stamina > 30 && !wolf.exhausted;
        wolf.crouch = false;
        bot.goalText = bearApex ? '🐻 ursine guard — giving way early (' + pred.d.toFixed(0) + 'm, spent)' : '↔️ giving way to a ' + (pred.a.sp ? pred.a.sp.label : 'hunter') + ' (' + pred.d.toFixed(0) + 'm)';
        if (!bot.giveSide || Math.random() < 0.02) bot.giveSide = (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
        applyAim(); return;
      }

      /* ---------- 3.6 a hunter is CHASING: walking away loses to a lunge (M46 v6 coach) ----------
         GENS 40-43 all died IN PREP to hunting apexes (Lion L4-5, Bear, Tiger L7) while farming
         deeds: the walk-away yield (3.5) keeps the wolf inside the kill radius of a predator in
         full chase and the burst drains through high HP. Like the howl rule, this is neutral
         coding — no brain change: when a heavy hunter (dmg ≥ 13) is actively chasing/attacking
         within 34 m, the wolf BREAKS CLEAN (sprint to separation; when winded, hard-away walk)
         instead of strolling. It resumes the deed once the threat loses the chase. */
      const hChase = pred.a && pred.a.sp && (pred.a.state === 'chase' || pred.a.state === 'attack') && (pred.a.sp.dmg || 0) >= 9 && pred.a.sp.build !== 'eagle';   // v6.1: cats are dmg 9-11 — the 13 gate left Leopard/Tiger/SnowLeopard uncovered (GENS 40-44 died to them in prep)
      // v6.4c: a CHALLENGED pack is a face-off, not a duel you must take — its members close at 5.5
      // while the wolf walks 7-9, so backing off is a clean, honest escape (GEN 53 died hunting
      // 4 s: the pack converged mid-hunt and chewed it; challenge members never flip pack.stance to
      // 'attack' so the swarm flee never saw them). Rival deeds (rivalDeed) still meet the challenge.
      let pkChal = null;
      if (!rivalDeed) for (const rc of rivals) {
        if (rc.dead || (rc.pack && rc.pack.stance === 'bonded')) continue;
        if (rc.pack && rc.pack.stance === 'challenge') {
          const cd = Math.hypot(rc.pos.x - wolf.pos.x, rc.pos.z - wolf.pos.z);
          if (cd < 34 && (!pkChal || cd < pkChal.d)) pkChal = { a: rc, d: cd };
        }
      }
      if ((hChase || pkChal) && (hChase ? pred.d : pkChal.d) < 34 && !bot.huntCombat && bossHit.d > 90 && frac > fleeAt) {
        const foe = hChase ? pred.a : pkChal.a;
        const fd = hChase ? pred.d : pkChal.d;
        RAFZ.bump('yield');
        const away = Math.atan2(wolf.pos.x - foe.pos.x, wolf.pos.z - foe.pos.z) + (bot.giveSide || 0);
        aim(away, 0.9);
        keys.KeyW = true; keys.ShiftLeft = wolf.stamina > 25 && !wolf.exhausted && fd < 26;
        wolf.crouch = false;
        bot.goalText = '⚔️ breaking clean from ' + (hChase ? 'a hunting ' + (pred.a.sp ? pred.a.sp.label : 'apex') : 'a rival challenge') + ' (' + fd.toFixed(0) + 'm)';
        if (!bot.giveSide || Math.random() < 0.02) bot.giveSide = (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
        applyAim(); return;
      }

      /* ---------- 4. pick the objective ---------- */

      let q = null, goal = bot.goalOverride || null, targetAnimal = null, mode = goal ? 'drink' : 'wander', bestD = 1e9;
      if (bot.questLock && !QUESTS.active.some(qq => qq.id === bot.questLock.id)) bot.questLock = null;   // completed/abandoned
      if (!bot.goalOverride) for (const cq of QUESTS.active) {
        if (bot.questLock && SIMNOW() < bot.questLock.until && cq.id !== bot.questLock.id) continue;   // one deed at a time — juggling two attractors orbits the map between them
        if (cq.kind === 'hunt') {
          if (bot.noHuntUntil && SIMNOW() < bot.noHuntUntil) { const t3 = bot.travelToBiome(cq.biome); if (t3 && bestD === 1e9) { bestD = t3.d + 200; q = cq; goal = t3; mode = 'travel'; } continue; }
          // commitment: keep the same quarry 30 s — no flapping between prey and wander
          if (bot.huntStick && SIMNOW() - (bot.huntStick.at || 0) < 30000) {
            const a2 = bot.huntStick.a;
            if (a2 && !a2.dead) {
              const d2 = Math.hypot(a2.pos.x - wolf.pos.x, a2.pos.z - wolf.pos.z);
              if (d2 < bestD + 80) { bestD = d2; q = cq; goal = { x: a2.pos.x, z: a2.pos.z }; targetAnimal = a2; mode = 'hunt'; continue; }   // committed — this deed hunts, full stop
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
                if (bot.huntFails >= 3) { bot.huntFails = 0; log('hunt-hard', { title: cq.title, msg: 'the quarry is cagey — the deed stands, and so does the wolf' }); }   // one-at-a-time: no more setting deeds aside
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
            const t2 = bot.travStick && bot.travStick.qid === cq.id && SIMNOW() < bot.travStick.until ? bot.travStick.pt : bot.travelToBiome(cq.biome);
            if (t2 && (bestD === 1e9 || t2.d + 120 < bestD)) { bestD = t2.d + 120; q = cq; goal = t2; mode = 'travel'; if (!(bot.travStick && bot.travStick.qid === cq.id && SIMNOW() < bot.travStick.until)) bot.travStick = { qid: cq.id, pt: t2, until: SIMNOW() + 25000 }; }
          }
          else if (hit.a && hit.d < bestD) {
            const across = hit.d > 25 && heightAt(wolf.pos.x + (hit.a.pos.x - wolf.pos.x) * 0.5, wolf.pos.z + (hit.a.pos.z - wolf.pos.z) * 0.5) < waterYNow() - 0.35;
            if (!across) { bestD = hit.d; q = cq; goal = { x: hit.a.pos.x, z: hit.a.pos.z }; targetAnimal = hit.a; mode = 'hunt'; bot.huntStick = { a: hit.a, at: SIMNOW(), d0: hit.d }; }
            else if (bestD === 1e9) { const t4 = bot.travelToBiome(cq.biome); if (t4) { bestD = t4.d + 150; q = cq; goal = t4; mode = 'travel'; } }   // the herd is across the water — hunt this land instead
          }
          else if (!hit.a) {
            const t2 = bot.travStick && bot.travStick.qid === cq.id && SIMNOW() < bot.travStick.until ? bot.travStick.pt : bot.travelToBiome(cq.biome);
            if (t2 && (bestD === 1e9 || t2.d + 120 < bestD)) { bestD = t2.d + 120; q = cq; goal = t2; mode = 'travel'; if (!(bot.travStick && bot.travStick.qid === cq.id && SIMNOW() < bot.travStick.until)) bot.travStick = { qid: cq.id, pt: t2, until: SIMNOW() + 25000 }; }
          }
        } else if (cq.kind === 'collect' || cq.kind === 'herbal') {
          // pick the nearest REACHABLE pickup — some lie across water or behind cliffs.
          // herbal (campaign prep) accepts either herb or mushroom, like the deed itself does.
          const wantInv = cq.kind === 'herbal' ? null : cq.item;
          const wantOk = def2 => def2 ? (wantInv ? def2.inv === wantInv : (def2.inv === 'herb' || def2.inv === 'mushroom')) : false;
          if (!bot.pkBlack) bot.pkBlack = new Set();
          if (bot.pkBlack.size > 40) bot.pkBlack.clear();
          let hit = null;
          if (bot.gatherStick && SIMNOW() - (bot.gatherStick.at || 0) < 40000) {
            const p = bot.gatherStick.p, def2 = PICKUP_DEF[p.type];
            if (p && !p.gathered && wantOk(def2) && !bot.pkBlack.has(p)) hit = { p, d: Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z) };
            else bot.gatherStick = null;
          }
          if (!hit) {
            let cands = [], cands2 = [];
            for (const [, ch2] of chunks) for (const p of ch2.pickups) {
              if (p.gathered || bot.pkBlack.has(p)) continue;
              const def2 = PICKUP_DEF[p.type];
              if (!wantOk(def2)) continue;
              const d = Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z);
              if (d < 240) cands.push({ p, d }); else if (d < 640) cands2.push({ p, d });
            }
            if (!cands.length) cands = cands2;   // M46 BUGFIX: this ground first, but a real harvest farther off is a quest too — 240 m only found stalls
            cands.sort((x, y) => x.d - y.d);
            const predNear = (px, pz, rr) => { for (const [, ch] of chunks) for (const pr of ch.predators) if (!pr.dead && Math.hypot(pr.pos.x - px, pr.pos.z - pz) < rr) return true; return false; };
            cands = cands.filter(c3 => !predNear(c3.p.x, c3.p.z, 26));   // don't pick from a bear's paws — but a predator 30 m off need not veto the whole patch (was 60: the veto emptied boards)
            for (const c2 of cands.slice(0, 5)) {   // nearest 5: first that isn't across deep water
              let blocked = false;
              const steps = Math.max(4, Math.min(14, (c2.d / 18) | 0));   // sample every ~18 m — rivers bend
              for (let k2 = 1; k2 < steps; k2++) {
                const mx = wolf.pos.x + (c2.p.x - wolf.pos.x) * k2 / steps, mz = wolf.pos.z + (c2.p.z - wolf.pos.z) * k2 / steps;
                if (heightAt(mx, mz) < waterYNow() - 0.35) { blocked = true; break; }
              }
              if (!blocked || c2.d < 25) { hit = c2; break; }
            }
          }
          if (hit) bot.gatherStick = { p: hit.p, at: SIMNOW() };
          if (hit.p && hit.d < bestD) { bestD = hit.d; q = cq; goal = { x: hit.p.x, z: hit.p.z }; targetPk = hit.p; mode = 'gather'; }
          else if (!hit.p) warnOnce('nopickup', 'bug-no-pickup-nearby', { key: cq.item || (cq.kind === 'herbal' ? 'herb' : '?'), msg: (cq.kind === 'herbal' ? 'herbal' : 'collect') + ' quest but no ' + (cq.item || 'herb/mushroom') + ' pickups nearby' });
        } else if (cq.kind === 'combat') {
          // CAMPAIGN: slay the hunter — chase the nearest predator while strong
          const pr2 = nearestPred();
          if (pr2.a && pr2.d < 320 && wolf.hp > wolf.maxHp * 0.8) {
            if (pr2.d < bestD) { bestD = pr2.d; q = cq; goal = { x: pr2.a.pos.x, z: pr2.a.pos.z }; targetAnimal = pr2.a; mode = 'hunt'; bot.combatStick = { a: pr2.a, at: SIMNOW() }; }
          }
        } else if (cq.wp) {
          // CAMPAIGN: the machine's waypoint (scout · ritual · travel routes)
          const d = Math.hypot(cq.wp.x - wolf.pos.x, cq.wp.z - wolf.pos.z);
          if (d < bestD) { bestD = d; q = cq; goal = { x: cq.wp.x, z: cq.wp.z }; mode = 'travel'; if (cq.kind === 'ritual') bot.ritualWp = { x: cq.wp.x, z: cq.wp.z }; }
        } else if (cq.kind === 'explore') {
          if (cq.peak) { if (wolf.pos.y < 49) {   // ⛰️ climb the mountain itself — greedy walkable ascent
              let by2 = 0, bg2 = -1e9;
              for (let o = 0; o < 6.28; o += 0.5) { const g2 = heightAt(wolf.pos.x + Math.sin(o) * 14, wolf.pos.z + Math.cos(o) * 14) - wolf.pos.y; if (g2 > bg2) { bg2 = g2; by2 = o; } }
              goal = { x: wolf.pos.x + Math.sin(by2) * 30, z: wolf.pos.z + Math.cos(by2) * 30 }; q = cq; mode = 'explore'; bestD = 1;
              bot.goalText = '⛰️ climbing · y ' + wolf.pos.y.toFixed(0) + '/50 m'; bot.lmStick = null;
            } continue; }
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
            let pool2 = (unfound.length ? unfound : landmarkList.filter(lm => !cq.lmType || lm.type === cq.lmType))
              .filter(lm => !(bot.lmBlack && bot.lmBlack.has(lm)));
            if (SIMNOW() - (bot.farBiasT || 0) < 120000) { const far = pool2.filter(lm => Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z) > 180); if (far.length) pool2 = far; }   // this ground yields nothing — reach far
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
            if (bd2 < 40) {   // at its doorstep — a reachable site is FOUND within a minute
              if (!bot.lmNear || bot.lmNear.lm !== best) bot.lmNear = { lm: best, at: SIMNOW() };
              else if (SIMNOW() - bot.lmNear.at > 35000) {
                log('lm-unreachable', { key: best.type, msg: 'the site will not give — marking it, trying another way' });
                (bot.lmBlack = bot.lmBlack || new Set()).add(best);
                bot.lmStick = null; bot.lmNear = null; bot.lmFails = (bot.lmFails || 0) + 1;
                if (bot.lmFails >= 3) { log('lm-hard', { title: cq.title, msg: 'no path yet — the deed stands; another site, another way' }); bot.lmFails = 0; }   // one-at-a-time: keep the deed, keep trying
              }
            } else if (bot.lmNear && Math.hypot(wolf.pos.x - bot.lmNear.lm.x, wolf.pos.z - bot.lmNear.lm.z) > 60) bot.lmNear = null;
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
      if (q) {
        if (!bot.questLock || bot.questLock.id !== q.id) { bot.questLock = { id: q.id, until: SIMNOW() + 60000 }; log('quest-lock', { title: q.title, msg: 'taking up the deed: ' + q.title }); }
        else if (SIMNOW() > bot.questLock.until - 15000) bot.questLock.until = SIMNOW() + 60000;   // still working it — hold
      }
      // v6.7 boss-kit pilgrimage: before the trial, claim the sky's gifts — the fallen star
      // (Deep Bite +1 bite) and the white stag (Wild-Hardened +5 hp). SHORT detours only,
      // subordinate to every emergency branch above (flee/rest/drink ran first) and to the
      // deed locks; only while no legend stands on the field. The boss road still leads.
      if (!bot.goalOverride && !targetAnimal && !targetPk && (mode === 'wander' || mode === 'travel') && frac > 0.6 && !(typeof bosses !== 'undefined' && bosses.length)) {
        if (!wolf.perks.strongJaw && typeof meteorSite !== 'undefined' && meteorSite && meteorSite.lm && !meteorSite.lm.found) {
          const ms = meteorSite.lm, dms = Math.hypot(ms.x - wolf.pos.x, ms.z - wolf.pos.z);
          if (dms < 380 && (mode === 'wander' || dms + 60 < bestD)) {
            bestD = dms + 60; q = null; goal = { x: ms.x, z: ms.z }; mode = 'travel';
            bot.goalText = '☄️ star-gift → Deep Bite';
            if (SIMNOW() - (bot.starLogT || 0) > 20000) { bot.starLogT = SIMNOW(); log('perk-trek', { msg: 'the fallen star calls — claiming Deep Bite', d: +dms.toFixed(0) }); }
          }
        }
        if (!goal && !wolf.perks.wildHardened && typeof WORLD_EVENTS !== 'undefined' && WORLD_EVENTS.name === 'whiteStag') {
          let stag = null, sd = 240;
          for (const [, ch2] of chunks) for (const a of ch2.animals) {
            if (a.dead || !a.luminous) continue;
            const d2s = Math.hypot(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z);
            if (d2s < sd) { sd = d2s; stag = a; }
          }
          if (stag) {   // tracked live — old magic moves; approach to 12 m and be blessed
            q = null; goal = { x: stag.pos.x, z: stag.pos.z }; mode = 'travel';
            bot.goalText = '🦌 the white stag → Wild-Hardened';
            if (SIMNOW() - (bot.stagLogT || 0) > 20000) { bot.stagLogT = SIMNOW(); log('perk-trek', { msg: 'old magic walks — approach for Wild-Hardened', d: +sd.toFixed(0) }); }
          }
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
      if (goal && !bot.drinking && !targetAnimal && (mode === 'explore' || mode === 'gather' || mode === 'travel')) {
        const dgF = Math.hypot(goal.x - wolf.pos.x, goal.z - wolf.pos.z);
        if (dgF > 10 && !(bot.ford && SIMNOW() < bot.ford.until)) {
          let w0 = -1, w1 = -1;
          for (let k = 0; k <= 20; k++) {
            const t = k / 20;
            if (heightAt(wolf.pos.x + (goal.x - wolf.pos.x) * t, wolf.pos.z + (goal.z - wolf.pos.z) * t) < waterYNow() - 0.35) { if (w0 < 0) w0 = t; w1 = t; }
          }
          if (w0 >= 0 && (w1 - w0) * dgF < 34) { bot.ford = { until: SIMNOW() + 30000, at: SIMNOW(), yaw: Math.atan2(goal.x - wolf.pos.x, goal.z - wolf.pos.z) }; log('ford-set', { w: +((w1 - w0) * dgF).toFixed(0), msg: 'a shallow crossing — fording toward the deed' }); }
        } else if (bot.ford && !wolf.swimming && SIMNOW() - bot.ford.at > 6000) bot.ford = null;   // made it across
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
      if (P.length > 6 && !huntingFresh && !bot.drinking && (mode === 'wander' || mode === 'travel' || dg0 > 60 || ((mode === 'explore' || mode === 'gather') && wolf.distance - (P[0].od || 0) > 25)) && nowS - (bot.loopCd || 0) > 45000) {
        const o = P[0], odGain = wolf.distance - o.od, net = Math.hypot(wolf.pos.x - o.x, wolf.pos.z - o.z);
        let wind = 0;
        for (let i = 2; i < P.length; i++) { const d1 = P[i - 1].br - P[i - 2].br, d2 = P[i].br - P[i - 1].br; if (d1 !== 0 && d2 !== 0 && Math.sign(d1) === Math.sign(d2)) wind += Math.abs(P[i].br - P[i - 2].br) * 0.5; }
        const eff = odGain > 1 ? net / odGain : 1;
        bot.pathEff = +eff.toFixed(2);
        if ((odGain > 30 && eff < 0.25) || (odGain > 25 && wind > 8 && eff < 0.4)) {   // true circles only, at any game speed — weaving through trees is not a loop
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
        if (wolf.swimming && (an.pos.y === undefined || an.pos.y > waterYNow() + 0.4)) {   // the quarry crossed the water — a real wolf lets it go
          bot.preyShun = { label: an.sp.label, until: SIMNOW() + 60000 };
          bot.huntStick = null; targetAnimal = null; goal = null;
          log('chase-river', { msg: 'the quarry made the far bank — letting it go' });
        }
        else {
        const aware = an.aware || 0;
        // stalk only inside real danger of being noticed: crouch-walk is half speed, prey out-walk it otherwise
        const detect = (an.sp.detect || 12) * (wolf.crouch ? 0.5 : 1);
        stalk = d > 6 && d < Math.max(22, detect + 14) && aware < 0.5;
        if (!bot.stalkT0 || SIMNOW() - bot.stalkT0 > 6000) { bot.stalkT0 = SIMNOW(); bot.stalkD0 = d; }
        if (stalk && d > bot.stalkD0 + NK.stalkGive) {   // prey out-trots the crouch-walk — a real player commits or lets go
          if (wolf.stamina > NK.commitStam) { stalk = false; log('stalk-broken', { msg: 'quarry escaping — breaking cover to run it down' }); }
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
      }
      const wantCrouch = stalk || (mode === 'rival' && targetAnimal && Math.hypot(targetAnimal.pos.x - wolf.pos.x, targetAnimal.pos.z - wolf.pos.z) > 14);
      wolf.crouch = !!wantCrouch;

      /* ---------- 6. movement executor (proven v6 core) ---------- */
      bot.goalKey = ((goal.x / 20) | 0) + ',' + ((goal.z / 20) | 0);
      let steer = goal;
      if (bot.detourT && SIMNOW() - bot.detourT < (bot.detourPos && bot.detourPos.wide ? 25000 : 4000)) steer = bot.detourPos;
      else if (bot.detourT) { bot.detourT = 0; bot.goalStuck = Math.max(0, bot.goalStuck - 1); }
      const LOOK = Math.min(34, 7 + wolf.speed * 1.5);   // eyes scale with speed: the faster, the further ahead
      bot.nearSolids = [];
      for (const [, ch] of chunks) for (const sol of (ch.solids || [])) {
        const dd = Math.hypot(sol.x - wolf.pos.x, sol.z - wolf.pos.z);
        if (dd < LOOK + 8) bot.nearSolids.push(sol);
      }
      const clearAt = (px, pz, t) => {   // clearance of a corridor point: nearest trunk surface distance
        let c = 9;
        for (const sol of bot.nearSolids) {
          const d = Math.hypot(sol.x - px, sol.z - pz) - (sol.r || 0.5);
          if (d < c) c = d;
        }
        return c;
      };
      const probe = (yaw, dist) => {   // a true corridor walk: ground, water AND every trunk, every 1.2 m
        let worst = 0;
        const sx2 = Math.sin(yaw), sz2 = Math.cos(yaw);
        const WOLF = 0.85;   // shoulder width — a wolf is not a ray
        for (let t = 1.6; t <= dist; t += 1.2) {
          const px = wolf.pos.x + sx2 * t, pz = wolf.pos.z + sz2 * t;
          const gh = heightAt(px, pz);
          if (gh - wolf.pos.y > 1.8) worst = Math.max(worst, 3.4 - t * 0.22);
          if (gh < waterYNow() - 0.45) worst = Math.max(worst, 2.6 - t * 0.16);
          const c = clearAt(px, pz, t);
          if (c < WOLF) worst = Math.max(worst, 3.8 - t * 0.2 + (WOLF - c) * 1.4);   // nearer & tighter = worse
          if (worst > 3.2) break;
        }
        return worst;
      };
      if (!bot.sideT) bot.sideT = 0;
      const desired = Math.atan2(steer.x - wolf.pos.x, steer.z - wolf.pos.z);
      let pinfo = null;
      const fear = Math.round(Math.max(35, Math.min(85, (wolf.level < 3 ? 68 : 55) * NK.fearMul)));
      const fearOf = (px, pz) => { const d = Math.hypot(px - wolf.pos.x, pz - wolf.pos.z); if (d < fear && (!pinfo || d < pinfo.d)) pinfo = { d, yaw: Math.atan2(px - wolf.pos.x, pz - wolf.pos.z) }; };
      for (const [, ch] of chunks) for (const pr of ch.predators) if (!pr.dead) fearOf(pr.pos.x, pr.pos.z);
      for (const rv of rivals) if (!rv.dead && rv.pack && rv.pack.stance !== 'bonded' && ((rv.pack.stance === 'attack') || Math.hypot(rv.pos.x - wolf.pos.x, rv.pos.z - wolf.pos.z) < 24)) fearOf(rv.pos.x, rv.pos.z);
      let bestYaw = desired, bestScore = 1e9;
      const look = keys.ShiftLeft ? Math.max(16, LOOK * 0.8) : Math.max(10, LOOK * 0.6);   // sprint needs runway — trunks cost 4 HP a hit
      // commit to an overtake side for 2.5 s once blocked — eyes that pick a side and COMMIT (no dither)
      if (probe(desired, look) > 0.3 && SIMNOW() - (bot.sideT || 0) > 2500) {
        let l = 0, r = 0;
        for (let t = 4; t <= look; t += 2) { l += clearAt(wolf.pos.x + Math.sin(desired - 1.1) * t, wolf.pos.z + Math.cos(desired - 1.1) * t, t); r += clearAt(wolf.pos.x + Math.sin(desired + 1.1) * t, wolf.pos.z + Math.cos(desired + 1.1) * t, t); }
        bot.side = r >= l ? 1 : -1; bot.sideT = SIMNOW();
      }
      if (SIMNOW() - (bot.sideT || 0) > 6000) bot.side = null;
      const offs = bot.side === null ? [0, 0.4, -0.4, 0.8, -0.8, 1.25, -1.25, 1.7, -1.7] : [0, 0.45 * bot.side, 0.9 * bot.side, 1.35 * bot.side, 1.8 * bot.side, 2.3 * bot.side, -0.6 * bot.side];
      for (const off of offs) {
        let sc = probe(desired + off, look) + Math.abs(off) * 0.22 + (bot.lastYaw === undefined ? 0 : Math.abs(wrapPI(desired + off - bot.lastYaw)) * 0.18);
        if (bot.side !== null && Math.sign(off || 1) === bot.side) sc -= 0.12;   // the committed side is trusted
        if (pinfo && Math.abs(wrapPI(desired + off - pinfo.yaw)) < 0.7) sc += (fear - pinfo.d) * 0.11 * (wolf.level < 3 ? 2.2 : 1.2);
        if (sc < bestScore) { bestScore = sc; bestYaw = desired + off; }
      }
      bot.avoiding = probe(desired, look) > 0.3;
      aim(bestYaw, 0.45);
      bot.lastYaw = bestYaw;
      const dg = Math.hypot(goal.x - wolf.pos.x, goal.z - wolf.pos.z);
      RAFZ.mode(mode, stalk, dg);
      keys.KeyW = dg > 2.2;
      keys.KeyS = keys.KeyA = keys.KeyD = false;
      const closeSprint = (targetAnimal && (dg < 34 || (mode === 'hunt' && dg < 90))) || (dg > 8 && dg < 48 && !stalk && !bot.drinking && wolf.stamina > NK.sprintRes + 5 && (mode === 'explore' || mode === 'gather' || mode === 'travel'));   // run the last stretch like a player would
      keys.ShiftLeft = !stalk && ((dg > 35 && wolf.stamina > NK.sprintRes && !bot.drinking) || (closeSprint && wolf.stamina > 12)) && !wolf.exhausted;   // travel keeps a cortex-set reserve — no more lap-tether to the water hole
      bot.jumpCd = Math.max(0, (bot.jumpCd || 0) - 0.15);
      const ax = wolf.pos.x + Math.sin(bestYaw) * 1.7, az = wolf.pos.z + Math.cos(bestYaw) * 1.7;
      const lip = heightAt(ax, az) - wolf.pos.y;
      if (bot.jumpCd <= 0 && wolf.grounded && keys.KeyW && (probe(bestYaw, 3.6) > 0.6 || (lip > 1.35 && lip < 2.4))) {
        bot.jumpCd = 1.3; bot.jumpT = SIMNOW();
        if (probe(bestYaw, 3.6) > 0.6) log('jump', { msg: 'hopped an obstacle' });
      }
      keys.Space = bot.jumpT && SIMNOW() - bot.jumpT < 170;

      /* ---------- 6.5 the awakening altar (CAMPAIGN) ---------- */
      if (bot.ritualWp && q && q.kind === 'ritual' && Math.hypot(bot.ritualWp.x - wolf.pos.x, bot.ritualWp.z - wolf.pos.z) < 3.4 && SIMNOW() - (bot.altarCd || 0) > 1400) {
        bot.altarCd = SIMNOW();
        try { doGather(); } catch (e) { }
      }

      /* ---------- 7. strike (prey & rivals) ---------- */
      if (targetAnimal && mode !== 'rival') {
        const d = Math.hypot(targetAnimal.pos.x - wolf.pos.x, targetAnimal.pos.z - wolf.pos.z);
        if (d < 3.2 + (targetAnimal.sp.scale || 1) * 0.7) {
          keys.KeyW = false;
          aim(Math.atan2(targetAnimal.pos.x - wolf.pos.x, targetAnimal.pos.z - wolf.pos.z), 0.85);   // face the bite
          const bxA = targetAnimal.pos.x - wolf.pos.x, bzA = targetAnimal.pos.z - wolf.pos.z, bmA = Math.hypot(bxA, bzA) || 1;
          const facingA = Math.sin(wolf.yaw) * bxA / bmA + Math.cos(wolf.yaw) * bzA / bmA;   // the bite cone is ~78° of BODY yaw — a camera aim alone can whiff mid-turn
          if (facingA > 0.35 && SIMNOW() - bot.lastAtk > 900) {
            bot.lastAtk = SIMNOW();
            const hpB = targetAnimal.hp, wasAware = (targetAnimal.aware || 0) >= 0.25;
            const ty = targetAnimal.heading || 0;
            const behind = (Math.sin(ty) * (wolf.pos.x - targetAnimal.pos.x) + Math.cos(ty) * (wolf.pos.z - targetAnimal.pos.z)) / (d || 1) < -0.35;
            wolf.attack();
            if (behind && !wasAware) log('ambush', { msg: 'AMBUSH — killing bite from the blind side' });
            setTimeout(() => {
              if (targetAnimal.dead) { bot.pauseUntil = SIMNOW() + 2200; bot.pauseWhy = 'savoring the catch'; log('kill', { sp: q ? (q.species || q.kind) : 'xp-hunt', msg: 'caught ' + (q && q.species ? q.species : (targetAnimal.sp.label || 'prey')) + (q ? ' → quest ' + q.have + '/' + q.need : ' · xp hunt') + ' · meat ' + inv.meat }); }
              else if (targetAnimal.hp === hpB) warnOnce('miss' + (SIMNOW() | 0), 'bug-bite-no-effect', { key: (q && q.species) || '?', msg: 'bite in reach did nothing (hp ' + hpB + ', dist ' + d.toFixed(1) + ')' });
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
          const bxR = r.pos.x - wolf.pos.x, bzR = r.pos.z - wolf.pos.z, bmR = Math.hypot(bxR, bzR) || 1;
          const facingR = Math.sin(wolf.yaw) * bxR / bmR + Math.cos(wolf.yaw) * bzR / bmR;
          if (facingR > 0.35 && (r.atkCd === undefined || r.atkCd > 0.5) && SIMNOW() - bot.lastAtk > 900) { bot.lastAtk = SIMNOW(); wolf.attack(); }
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
              log('grind-hard', { title: q.title, msg: 'the ground would not give — the deed stands; re-planning the way' });
              bot.grindKey = '';
            }   // one-at-a-time: no more setting deeds aside
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
      const winKey = (q ? q.id : 'x') + ':' + mode; bot.winKey = winKey;   // per-QUEST window — goal wobble must not reset the clock
      if (dg > 4 && dg < 55 && keys.KeyW) {   // doorstep creep: moving, close, but not ARRIVING (anti-stuck can't see a slow slide)
        if (!bot.closeW || bot.closeW.gk !== winKey) bot.closeW = { gk: winKey, dg0: dg, at: SIMNOW() };
        else if (SIMNOW() - bot.closeW.at > 15000) {
          if (bot.closeW.dg0 - dg < 3) {
            bot.grindN = (bot.grindN || 0) + 1;
            const gy2 = Math.atan2(goal.x - wolf.pos.x, goal.z - wolf.pos.z) + (bot.grindN % 2 ? 1.57 : -1.57);   // walk the perimeter like a player seeking the way up
            bot.detourPos = { x: wolf.pos.x + Math.sin(gy2) * 18, z: wolf.pos.z + Math.cos(gy2) * 18 };
            bot.detourT = SIMNOW() - 12000;   // short peek (wide-detour window trimmed to ~12 s)
            log('doorstep-perimeter', { goal: bot.goalKey, d: +dg.toFixed(0), msg: 'no way in from here — flanking for another approach (' + bot.grindN + ')' });
            if (q && q.kind === 'explore' && bot.lmStick) { (bot.lmBlack = bot.lmBlack || new Set()).add(bot.lmStick.lm); bot.lmStick = null; bot.lmNear = null; }
            if (targetPk && bot.pkBlack) { bot.pkBlack.add(targetPk); bot.gatherStick = null; }
            if (bot.grindN >= 3 && q) {
              log('grind-hard', { title: q.title, msg: 'no way in found yet — the deed stands; another angle' });
              bot.grindN = 0;
            }   // one-at-a-time: no more setting deeds aside
          }
          bot.closeW = null;
        }
      } else bot.closeW = null;

      /* ---------- 8. anti-stuck (game-odometer based) ---------- */
      const moving = keys.KeyW && dg > 6;
      if (moving) {
        if (!bot.stuckPos) bot.stuckPos = { x: wolf.pos.x, z: wolf.pos.z, t: SIMNOW(), od: wolf.distance };
        else if (SIMNOW() - bot.stuckPos.t > 12000) {
          if (wolf.distance - (bot.stuckPos.od || 0) < 4) {
            log('stuck', { x: +wolf.pos.x.toFixed(0), z: +wolf.pos.z.toFixed(0), biome: curBiomeKey, goal: bot.goalKey, msg: 'wanted to move, went nowhere for 9s' });
            bot.unstickT = SIMNOW(); bot.unstickA = undefined;
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
      if (bot.unstickT && SIMNOW() - bot.unstickT < 1500) { keys.Space = true; keys.KeyA = bot.unstickA !== undefined ? bot.unstickA : (bot.unstickA = Math.random() < 0.5); }   // one calm side, no shudder

      /* ---------- 9. flavour: the wolf's voice — and the pack gamble ---------- */
      // LAW v4 · howl POLICY (trainer: the bonding dice live in the policy layer, not the
      // cortex): a speedrunner takes the gamble only when the roll can't kill the run —
      // strong, whole, no legend at the door, no pack already on the attack. Weak or
      // wounded wolves never roll the fangs; they listen again soon.
      bot.howlT -= 0.15;
      if (bot.howlT <= 0) {
        const hpFracNow = wolf.hp / Math.max(1, wolf.maxHp);
        const bHitNow = liveBoss();
        const hostilePack = !!(typeof WORLD_EVENTS !== 'undefined' && WORLD_EVENTS.pack && WORLD_EVENTS.pack.stance === 'attack');
        if (hpFracNow > 0.75 && wolf.level >= 4 && !wolf.swimming && bHitNow.d > 60 && !hostilePack) {
          wolf.howl();
          bot.howlT = 90 + Math.random() * 90;
        } else bot.howlT = 30;   // the wild isn't ready — listen again soon
      }

      /* ---------- 10. quest stall detector (bug-hunt) ---------- */
      const q0 = QUESTS.active[0];
      if (q0) {
        if (bot.stallQ !== q0.id) { bot.stallQ = q0.id; bot.stallHave = q0.have; bot.stallT = SIMNOW(); bot.hardT = SIMNOW(); }
        else if (q0.have > bot.stallHave) { bot.stallHave = q0.have; bot.stallT = SIMNOW(); bot.hardT = SIMNOW(); if (bot.questLock && bot.questLock.id === q0.id) bot.questLock.until = SIMNOW() + 60000; }
        else {
          if (SIMNOW() - bot.stallT > 150000 && SIMNOW() - (bot.farBiasT || 0) > 150000) {
            bot.farBiasT = SIMNOW(); bot.lmStick = null; bot.lmNear = null;
            bot.gatherStick = null; if (bot.pkBlack) bot.pkBlack.clear();   // M46 BUGFIX: the soft retry must also unstick a gather — old sticks/blacklists only re-picked the same spot
            log('quest-drive', { title: q0.title, msg: 'this ground yields nothing — reaching for a site further afield' });
            bot.stallT = SIMNOW();   // soft retry — but the hard clock keeps running
          }
          if (SIMNOW() - bot.hardT > 300000) {   // ABSOLUTE: 5 min without progress and the deed is set aside, no resets
            warnOnce('stall' + q0.id + q0.have, 'bug-quest-stalled', { key: q0.title, msg: 'no progress in 5 min: ' + q0.title + ' stuck at ' + q0.have + '/' + q0.need });
            log('quest-slow', { title: q0.title, msg: 'slow going — but a deed begun is a deed kept' });   // one-at-a-time: the 12-min flatline in keepQuestsFilled is the only exit
            bot.stallT = bot.hardT = SIMNOW();
          }
        }
      }
      applyAim();
    } catch (e) { log('bot-error', { msg: String(e && e.message).slice(0, 140) }); }
  }, Math.max(40, Math.round(150 / (window.BOT_SPEED || 1))));

  /* ---------------- debug tap (harness forensics — inside the brain's closure) ---------------- */
  window.__botQuest = () => ({ step: (bot.seqIx || 0) + 1, of: QUEST_SEQ.length, want: QUEST_SEQ[bot.seqIx || 0], questId: bot.questId || null, activeN: QUESTS.active.length, size: QUESTS.active[0] ? window.questSize(QUESTS.active[0]) : null, title: QUESTS.active[0] ? QUESTS.active[0].title : '' });
  window.BOTDBG = () => ({ goalKey: bot.goalKey, winKey: bot.winKey, closeW: bot.closeW ? { d0: +bot.closeW.dg0.toFixed(0), age: Math.round((SIMNOW() - bot.closeW.at) / 1000) } : null, grindN: bot.grindN || 0, lmBlack: bot.lmBlack ? bot.lmBlack.size : 0, kindShun: bot.kindShun ? Object.keys(bot.kindShun).length : 0, trek: !!bot.trek, ford: !!bot.ford, stallQ: bot.stallQ, hardLeft: bot.hardT ? Math.max(0, 300000 - (SIMNOW() - bot.hardT)) | 0 : -1, pathEff: bot.pathEff });
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
  // M46 v6.6 (bugfix — user report 2026-09-01): DELEGATION, not direct binding. The start overlay
  // (tplStart) is re-injected on every return to it (TROPHIES → BACK, and pause → start), so a
  // direct addEventListener on #btnMenuAI was attached to a node that gets DESTROYED — the fresh
  // #btnMenuAI had no handler and the Rafzzer button silently died after a trophy round-trip.
  // Document-level clicks survive every re-injection; the game already uses this pattern for
  // #btnTrophies/#btnStart (p5.js: "the start template is re-injected, listeners below survive it").
  // The in-game corner #btnAI lives in the static HUD (never re-injected) and toggles the same way.
  document.addEventListener('click', e => {
    const id = e.target && e.target.id;
    if (id === 'btnMenuAI') setAI(true);   // the menu's front door — watch mode
    else if (id === 'btnAI') setAI(!aiOn); // the in-game 🤖 toggle
  });
  if (URL_ON) setAI(true);
  // the corner 🤖 belongs to the game screen — at the menu, the menu entry is the front door
  if (aiBtn) setInterval(() => { try { aiBtn.style.display = (state === 'play' || aiOn) ? '' : 'none'; } catch (e) { } }, 500);
})();
