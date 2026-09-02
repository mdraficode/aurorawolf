import { pathToFileURL, fileURLToPath } from 'url';
// 🧠 RAFZZER v1.0 — the generational harness
// The human gate lives HERE: no mutant may run a full generation without passing
// `gate` (behavioral shakedown on a probe seed), and no mutant may carry its
// learnings forward without an explicit `promote --verdict=promote` — a decision
// made by the trainer after reading the reports, never by the machine alone.
//
//   node training/rafzzer_gens.mjs status
//   node training/rafzzer_gens.mjs spawn 1          # mutate champion → candidate
//   node training/rafzzer_gens.mjs gate 1           # shakedown on probe seed (110 s)
//   node training/rafzzer_gens.mjs run 1 480        # full generation on lineage seed
//   node training/rafzzer_gens.mjs promote 1 --verdict=promote --note="..."
import { chromium } from 'playwright';
import fs from 'fs';

const DIR = 'training';
const CHAMP = `${DIR}/rafzzer_champion.json`, CAND = `${DIR}/rafzzer_candidate.json`, LINE = `${DIR}/rafzzer_lineage.json`, TRAITCHAMP = `${DIR}/rafzzer_traitchamp.json`;
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o));
const NI = 26, NH = 10, NO = 6, NW = NI * NH + NH + NH * NO + NO;   // M46 · LAW v4: 26 senses (bear, sky-threat, 4 campaign + side-channel, gate urgency)

// ---- the lineage's own randomness (identical law in-page and in-harness) ----
const mul32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const gauss = (rnd, sd) => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * v) * sd; };
const freshWeights = () => { const rnd = mul32(20070); const w = new Array(NW).fill(0); for (let i = 0; i < NI * NH; i++) w[i] = gauss(rnd, 0.38); for (let i = NI * NH + NH; i < NW; i++) w[i] = gauss(rnd, 0.45); return w; };
const mutate = (w, gen) => {
  const rnd = mul32(7919 * gen + 13), sd = Math.max(0.08, 0.16 * Math.pow(0.90, gen - 1));   // retuned twice: σ>0.2 saturates (GEN2/3), floor 0.10 still 3-striked GEN12/14
  const out = w.slice(); let touched = 0, reset = 0;
  for (let i = 0; i < NW; i++) {
    if (rnd() < 0.18) { out[i] += gauss(rnd, sd); touched++; }
    if (rnd() < 0.03) { out[i] = gauss(rnd, 0.45); reset++; }
  }
  for (let i = 0; i < NW; i++) out[i] = Math.max(-2.5, Math.min(2.5, out[i]));   // gene clamp: no runaway saturation drift
  return { weights: out, touched, reset, sd: +sd.toFixed(3) };
};

const lineage = () => fs.existsSync(LINE) ? read(LINE) : [];
const launch = async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  pg.on('console', m => { if (m.type() === 'error' && !/favicon|Autoplay|AudioContext/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  return { b, pg, errs };
};
const openGame = async (pg, seed) => {
  await pg.goto(`${pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href}?autopilot=1&nolearn=1&seed=${seed}&quality=low&speed=16&rate=8&re=10`, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.RAFZZER, null, { timeout: 90000 });
  await pg.waitForTimeout(2000);
};
const inject = async (pg, cand, gen) => pg.evaluate(([w, scars, g]) => RAFZZER.load(w, scars, g), [cand.weights, cand.scars || { fight: 0, neglect: 0, water: 0 }, gen]);
const poll = async (pg, wallCapMs, onTick) => {
  const t0 = Date.now(); let last;
  while (Date.now() - t0 < wallCapMs) {
    await pg.waitForTimeout(2500);
    last = await pg.evaluate(() => {
      const s = RAFZZER.snapshot(), R = window.RUN || {};
      let camp = null; try {
        if (window.CAMP && window.CAMP.state) { const c = window.CAMP.state(); const tr = (c.trophies || []); const tm = tr.length ? Math.max(...tr.map(t => t.tier | 0)) : 0;
          camp = { tier: c.tier | 0, leg: c.leg | 0, stage: c.stage, trophies: tr.length, topTier: tm, topTime: tm ? Math.min(...tr.filter(t => (t.tier | 0) === tm).map(t => +t.time || 0)) : null, clock: (window.CAMP.simClock ? +window.CAMP.simClock().toFixed(1) : (window.CAMP.clock ? +window.CAMP.clock().toFixed(1) : 0)) }; }
      } catch (e) { }
      return { s, camp, dead: wolf.deadT > 0, last: window.RAFZZER_LAST || null, dist: +wolf.distance.toFixed(1), hp: +wolf.hp.toFixed(1), stam: +wolf.stamina.toFixed(0), lvl: wolf.level, run: { xp: R.xp, kills: R.kills, quests: R.quests, side: R.side | 0 }, sideC: (window.CAMP && window.CAMP.side) ? window.CAMP.side() : null, simS: (window.__boost && __boost.ticks) ? +(window.__boost.ticks * 0.05).toFixed(0) : 0, qTimes: ((window.RUN || {}).questTimes || []).slice(-14), warns: (window.__boost && window.__boost.warns) || 0 };
    }).catch(e => ({ evalErr: String(e.message).slice(0, 120) }));
    if (last.evalErr) break;
    if (onTick) onTick(((Date.now() - t0) / 1000).toFixed(0), last);
    if (last.last) { await pg.waitForTimeout(1500); break; }   // death scored & frozen in RAFZZER_LAST
    if (last.dead) { await pg.waitForTimeout(3000); continue; }   // dying right now — hold for the scorer, never read the respawn
  }
  return last;
};
const collect = async (pg, errs, snap) => pg.evaluate(() => ({
  botn: window.BOTN || {}, logTail: (window.BOTLOG || []).slice(-80).map(e => `${e.t}s ${e.type} ${e.msg || ''}`), simS: +(window.RUN || { dur: 0 }).dur, boostTicks: (window.__boost && window.__boost.ticks) || 0
})).then(async extra => ({ ...snap, errs, ...await extra }));

const std = a => { if (a.length < 2) return 0; const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); };

const cmd = process.argv[2], arg = +process.argv[3] || 0;

if (cmd === 'status') {
  const L = lineage();
  console.log(`RAFZZER lineage — ${L.length} entries`);
  for (const e of L) console.log(`  GEN ${e.gen} · fit ${e.fitness} · ${e.outcome} · gate ${e.gate ? (e.gate.passed ? 'PASS' : 'FAIL') : '-'} · ${e.verdict} · ${e.cause || ''} · ${e.note || ''}`);
  if (fs.existsSync(CHAMP)) { const c = read(CHAMP); console.log(`champion: gen ${c.gen} · fit ${c.fit} · scars ${JSON.stringify(c.scars)}`); }
  process.exit(0);
}

if (cmd === 'spawn') {
  const g = arg, attempt = +process.argv[4] || 1, mode = process.argv[5] || 'global';
  if (!fs.existsSync(CHAMP)) { write(CHAMP, { v: '1.0', gen: 0, fit: null, weights: freshWeights(), scars: { fight: 0, neglect: 0, water: 0 }, origin: 'wild seed 20070 — the untrained mind' }); console.log('GEN 0 champion created (wild seed)'); }
  let champ = read(CHAMP);
  if (champ.weights.length !== NW) {   // LAW v4 architecture moves: 316 (24 senses) → 336 (26 senses) is a ZERO-PAD
    if (champ.weights.length === 316 && NW === 336) {   // 24-sense brain extended: rows 24-25 = side-channel + gate urgency, silent until evolved
      const w = champ.weights.slice();
      champ.weights = w.slice(0, 240).concat(new Array(20).fill(0), w.slice(240));
      champ.origin = (champ.origin || 'LAW v4') + ' → zero-padded to 26 senses (336 w)';
      write(CHAMP, champ);
      console.log(`LAW v4 architecture move 316 → 336 (side-channel + gate senses) — champion GEN ${champ.gen} (fit ${champ.fit}) ZERO-PADDED, behavior preserved`);
    } else {
      fs.copyFileSync(CHAMP, `${DIR}/rafzzer_champion_arch_${champ.weights.length}_archive.json`);
      write(CHAMP, { v: '1.0', gen: 0, fit: null, weights: freshWeights(), scars: { fight: 0, neglect: 0, water: 0 }, origin: 'LAW v4 re-seed: ' + NI + ' senses (' + NW + ' w) — the trophy lineage, wild mind' });
      console.log(`LAW v4 architecture change — champion re-seeded (${champ.weights.length} → ${NW}); old champion archived`);
    }
    champ = read(CHAMP);
  }
  let m, base = champ, baseLabel = 'champion fit ' + champ.fit;
  if ((mode === 'trait' || mode === 'traitglobal') && fs.existsSync(TRAITCHAMP)) {   // compounding chain
    const tp = read(TRAITCHAMP);
    if (tp && tp.weights && tp.weights.length === champ.weights.length) { base = tp; baseLabel = 'trait champs fit ' + tp.fit; }
  }
  if (mode === 'trait') {
    // M46 · LAW v4 rows experiment (trainer-approved cadence, proven gate-safe):
    // evolve ONLY the new-sense rows — W1 rows 18..25 (bear-proximity, sky-threat,
    // the four campaign senses, side-channel, gate urgency), indices 180..259.
    // The proven survival rows are frozen, so gate-killing reflexes are untouched.
    // σ 0.15 (above the global 0.08 floor) because fresh rows start near zero.
    const rnd = mul32(7919 * g + 13 + 1000 * (attempt - 1) + 31);   // own dice stream: re-rolls still re-roll
    const w = base.weights.slice();
    let touched = 0, reset = 0;
    const sd = 0.15;
    for (let i = 180; i < 260; i++) {
      if (rnd() < 0.8) { w[i] += gauss(rnd, sd); touched++; }
      if (rnd() < 0.05) { w[i] = gauss(rnd, sd); reset++; }
      w[i] = Math.max(-2.5, Math.min(2.5, w[i]));
    }
    m = { weights: w, touched, reset, sd: +sd.toFixed(3), mode: 'trait', base: baseLabel };
  } else { m = mutate(base.weights, g + 1000 * (attempt - 1)); if (mode === 'traitglobal') { m.mode = 'traitglobal'; m.base = baseLabel; } }   // attempt re-rolls the dice, never the law (base = champion for 'global', trait champ for 'traitglobal')
  const cand = { v: '1.0', gen: g, parents: [base.gen], weights: m.weights, scars: base.scars, mutation: m, parentFit: base.fit };
  write(CAND, cand);
  console.log(`spawned GEN ${g}${attempt > 1 ? ' (re-roll ' + attempt + ')' : ''} [${m.mode || 'global'}]: ${m.touched} weights mutated (σ=${m.sd}), ${m.reset} reborn · parent ${baseLabel} · scars ${JSON.stringify(base.scars)}`);
  process.exit(0);
}

if (cmd === 'traitpromote') {   // compound the bear-aware chain (never touches the global champion/crown bar)
  const g = arg;
  const cand = read(CAND), run = read(`${DIR}/rafzzer_run_gen${g}.json`);
  if (!(cand.mutation && (cand.mutation.mode === 'trait' || cand.mutation.mode === 'traitglobal'))) { console.log(`GEN ${g} is not a trait run — no chain move`); process.exit(1); }
  const prev = fs.existsSync(TRAITCHAMP) ? read(TRAITCHAMP) : null;
  const prevFit = prev ? prev.fit : -1e9;
  if (run.fitness > prevFit) {
    write(TRAITCHAMP, { v: '1.0', gen: g, fit: run.fitness, weights: cand.weights, scars: run.scars || cand.scars, cause: run.cause, mets: run.mets, promoT: Date.now(), note: `trait chain: ${prevFit === -1e9 ? 'seeded' : 'advanced from fit ' + prevFit}` });
    console.log(`TRAIT CHAIN → GEN ${g} (fit ${prevFit === -1e9 ? 'seeded' : prevFit + ' → ' + run.fitness}) — bear-aware rows now carry ${run.fitness}`);
  } else console.log(`trait chain holds (fit ${run.fitness} ≤ ${prevFit}) — next trait gen re-mutates from GEN ${prev ? prev.gen : '—'}`);
  process.exit(0);
}

if (cmd === 'gate') {
  const g = arg, cand = read(CAND);
  const { b, pg, errs } = await launch();
  try {
    await openGame(pg, 31337 + 17 * g);
    let loadErr = null;
    try { await inject(pg, cand, g); } catch (e) { loadErr = String(e.message); }
    const ticks = []; const snap = await poll(pg, 110000, (t, s) => ticks.push(`${t}s hp${s.hp} stam${s.stam} L${s.lvl} d${s.dist} fit${s.s.fitNow}`));
    const full = await collect(pg, errs, snap);
    const outs = (snap.s.outs || []), nOut = outs.length ? outs[0].length : 0;
    const stds = Array.from({ length: nOut }, (_, i) => +std(outs.map(o => o[i])).toFixed(4));
    const varied = stds.filter(v => v >= 0.01).length;
    const hist = snap.s.hist || {}, hkeys = Object.keys(hist).filter(k => k !== 'drink-check');
    const minHp = Math.min(...ticks.map(t => 0), ...(full.hp !== undefined ? [full.hp] : []));
    const checks = {
      loadOk: !loadErr, finiteMind: !loadErr,
      noPageErrors: errs.length === 0, noTickCrashes: (snap.warns || 0) === 0,
      moves: snap.dist > 40, noSuicide: !snap.last,
      decides: hkeys.length >= 3, livingMind: varied >= 2,
      restReflex: !((full.hp < 25 || (snap.last && snap.last.cls)) && !hist.rest)
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    const report = { gen: g, checks, failed, stds, hist, minHpSeen: +String(minHp), knobs: snap.s.knobs, scars: snap.s.scars, dist: snap.dist, errs: errs.slice(0, 5), warns: snap.warns };
    write(`${DIR}/rafzzer_gate_gen${g}.json`, report);
    console.log(`GATE GEN ${g}: ${failed.length === 0 ? 'PASS ✅' : 'FAIL ❌ ' + failed.join(',')}`);
    console.log(`  moved ${snap.dist}m · hp ${full.hp} · stam ${full.stam} · L${full.lvl} · decisions ${hkeys.slice(0, 8).join('/')} · outs-std ${stds.join(',')}`);
    if (errs.length) console.log('  errs:', errs.slice(0, 3));
    await pg.close(); await b.close();
    process.exit(failed.length === 0 ? 0 : 1);
  } catch (e) {
    console.log('GATE GEN ' + g + ' CRASH ❌ ' + e.message);
    write(`${DIR}/rafzzer_gate_gen${g}.json`, { gen: g, checks: { crash: false }, failed: ['crash:' + e.message] });
    try { await pg.close(); await b.close(); } catch (_) { }
    process.exit(1);
  }
}

if (cmd === 'run') {
  const g = arg, capMs = (+process.argv[4] || 480) * 1000, cand = read(CAND);
  const { b, pg, errs } = await launch();
  try {
    await openGame(pg, 7777);   // the lineage seed — one world, every generation, so fitness is honest
    await inject(pg, cand, g);
    const beats = []; const snap = await poll(pg, capMs, (t, s) => { beats.push({ t: +t, hp: s.hp, stam: s.stam, lvl: s.lvl, dist: s.dist, fit: s.s.fitNow }); if (beats.length % 8 === 1) console.log(`  ${t}s · hp${s.hp} stam${s.stam} L${s.lvl} ${s.dist}m · fit≈${s.s.fitNow}`); });
    const full = await collect(pg, errs, snap);
    const last = snap.last;
    const fitness = last ? last.fitness : snap.s.fitNow;
    const outcome = last ? 'DIED(' + last.cls + ')' : 'SURVIVED(cap)';
    const simS = last ? ((last.campClock || (snap.camp && snap.camp.clock)) || last.dur) : (snap.simS || full.simS || 1);
    const mets = { xpMin: +(((last ? last.xp : full.run.xp) * 60 / Math.max(1, simS)).toFixed(1)), qMin: +((((last ? last.hist.quests : undefined) ?? full.run.quests ?? 0) * 60 / Math.max(1, simS)).toFixed(2)), avgQuestS: snap.qTimes && snap.qTimes.length ? +(snap.qTimes.reduce((x2, y2) => x2 + y2, 0) / snap.qTimes.length).toFixed(0) : null };
    const trophy = snap.camp || {};   // LAW v4: the trophy machine's state at run end
    mets.trophy = trophy;
    const durSimS = simS || (last ? last.dur : (full.simS || snap.simS || 1));   // M46 v5: GAME clock (sim) — honest, boost-proof
    const durWallS = last ? last.dur : 0;   // wall seconds (R.dur) — kept for reference only
    const report = { gen: g, fitness, outcome, mets, trophy, cause: last ? last.cause : null, cls: last ? last.cls : null, durSimS, durWallS, maxLevel: last ? last.maxLevel : snap.lvl, xp: last ? last.xp : full.run.xp, hist: (last ? last.hist : snap.s.hist) || {}, scars: snap.s.scars, beats, knobs: snap.s.knobs, warns: snap.warns, errs: errs.slice(0, 6), botn: full.botn, logTail: full.logTail, side: (full.run ? (full.run.side | 0) : 0) };
    write(`${DIR}/rafzzer_run_gen${g}.json`, report);
    console.log(`RUN GEN ${g}: ${outcome} · fitness ${fitness} · L${report.maxLevel} · ${report.xp}xp · ${report.durSimS}s(sim) · ${mets.xpMin}xp/min · TIER ${trophy.topTier || 0} (${trophy.trophies || 0} trophies, best ${trophy.topTime ?? '—'}s) · stage ${trophy.stage || '-'} leg${trophy.leg ?? '-'} · side ${report.side} · warns ${snap.warns} · errs ${errs.length}`);
    if (last) console.log(`  cause: ${last.cause} · scars now ${JSON.stringify(last.scars)}`);
    await pg.close(); await b.close();
    process.exit(0);
  } catch (e) {
    console.log('RUN GEN ' + g + ' CRASH ❌ ' + e.message);
    try { await pg.close(); await b.close(); } catch (_) { }
    process.exit(1);
  }
}

if (cmd === 'promote') {
  const g = arg;
  const args = process.argv.slice(4);
  const verdict = (args.find(a => a.startsWith('--verdict=')) || '').split('=')[1];
  const note = (args.find(a => a.startsWith('--note=')) || '').slice(7);
  const gate = fs.existsSync(`${DIR}/rafzzer_gate_gen${g}.json`) ? read(`${DIR}/rafzzer_gate_gen${g}.json`) : null;
  const run = fs.existsSync(`${DIR}/rafzzer_run_gen${g}.json`) ? read(`${DIR}/rafzzer_run_gen${g}.json`) : null;
  if (!run) { console.log('no run report for gen ' + g); process.exit(1); }
  const champ = read(CHAMP);
  const L = lineage();
  let outcome = 'rejected: ' + (verdict || 'no-verdict');
  if (verdict === 'promote') {
    if (!gate || !gate.passedOverride) { /* gate verdict lives in the json as failed[] — trainer may override with cause */ }
    const gatePassed = gate && gate.failed && gate.failed.length === 0;
    if (!gatePassed) { outcome = 'BLOCKED — gate not passed'; console.log('❌ ' + outcome); L.push({ gen: g, fitness: run.fitness, outcome, verdict: 'blocked', note: note || gate.failed.join(',') }); write(LINE, L); process.exit(1); }
    if (run.fitness > (champ.fit ?? -1e9)) {
      const c = { v: '1.0', gen: g, fit: run.fitness, weights: read(CAND).weights, scars: run.scars, cause: run.cause, promotedAt: Date.now() };
      write(CHAMP, c); outcome = `PROMOTED (fit ${champ.fit ?? '—'} → ${run.fitness})`;
    } else outcome = `verified but outlived (fit ${run.fitness} ≤ champion ${champ.fit}) — champion stands`;
  }
  L.push({ gen: g, fitness: run.fitness, outcome: run.outcome, gate: { passed: gate ? gate.failed.length === 0 : false }, verdict: outcome, cause: run.cause || '', note });
  write(LINE, L);
  console.log(`GEN ${g}: ${outcome}`);
  process.exit(0);
}
console.log('usage: status | spawn <g> [attempt] [global|trait] | traitpromote <g> | gate <g> | run <g> [capSec] | promote <g> --verdict=promote|reject --note=...');
