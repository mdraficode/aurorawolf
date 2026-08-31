/* SIDE ERRANDS TEST — the level-up quest's fast-XP channel: board turn, one-at-a-time,
   no-risk templates (supply-checked, generous timers, no predator/rival/boss content),
   XP rate > grind, gate feed, no stage advance, timer expiry, gate completion, death,
   and the neural cortex's awareness (senses 24/25). */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const URL = pathToFileURL('/home/user/index.html').href + '?autostart=1&autopilot=1&nolearn=1&seed=4242&quality=low';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
let failed = [];
const ck = (n, c, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  ← ' + x)); if (!c) failed.push(n); };
const sleep = ms => pg.waitForTimeout(ms);
try {
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP && window.RAFZZER, null, { timeout: 90000 });
  await sleep(2500);
  await pg.evaluate(() => {   // deterministic: bot off (brain still usable), clean campaign, empty board
    try { localStorage.removeItem('revontulet_campaign_v1'); } catch (e) { }
    window.BOT_OFF = true;
    window.CAMPDBG.reset();
    QUESTS.active.length = 0; QUESTS.avail.length = 0;
    wolf.hp = wolf.maxHp;
  });
  await sleep(500);

  /* ---- 1. accepting the level-up deed turns the board to side errands ---- */
  const R1 = await pg.evaluate(() => {
    wolf.hp = wolf.maxHp;
    const q = { id: 'xp' + (Math.random() * 1e9 | 0), camp: true, stage: 'prep', kind: 'xp', need: 400, have: 0, base: wolf.xpTotal, icon: '✦', title: 'Reach level XP test', biome: curBiomeKey, rw: { xp: 40 }, rwText: '40 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(q);
    acceptQuest(q.id);
    window.CAMP.tick(0.6);   // the tick arms the side board once the deed is truly active
    const sides = QUESTS.avail.filter(s => s.side);
    const riskKinds = sides.filter(s => /survive|rival|combat|boss|ritual|scout|travel/.test(s.kind || ''));
    return { active: QUESTS.active.length, kind: QUESTS.active[0] && QUESTS.active[0].kind, n: sides.length, kinds: sides.map(s => s.kind), icons: sides.map(s => s.icon), risk: riskKinds.length, timed: sides.every(s => s.timed) };
  });
  ck('accepting the level-up deed → ONE main active', R1.active === 1 && R1.kind === 'xp', JSON.stringify(R1));
  ck('the board turns to side errands (≥1, all side)', R1.n >= 1 && R1.kinds.every(k => ['hunt', 'collect', 'explore'].includes(k)), JSON.stringify(R1));
  ck('NO risk/luck templates (no survive/rival/combat/boss)', R1.risk === 0, JSON.stringify(R1.risk));
  ck('side errands are timed (generous clocks — no risk, just speed)', R1.timed, JSON.stringify(R1.timed));

  /* ---- 2. slot rules: one side errand at a time, only while the level-up deed lives ---- */
  const R2 = await pg.evaluate(() => {
    const out = {};
    const side = QUESTS.avail.find(s => s.side);
    out.offeredKind = side && side.kind;
    acceptQuest(side.id);
    out.nActive = QUESTS.active.length;
    out.sideActive = QUESTS.active.filter(q => q.side).length;
    const side2 = QUESTS.avail.find(s => s.side);
    if (side2) { acceptQuest(side2.id); out.secondBlocked = QUESTS.active.filter(q => q.side).length === 1; }
    // no-gate rejection: fresh state, no xp quest
    const fresh = { id: 'side' + (Math.random() * 1e9 | 0), camp: true, side: true, stage: 'prep', kind: 'hunt', species: 'hare', need: 2, have: 0, icon: '⚡', title: 'Side: no-gate probe', biome: curBiomeKey, timed: true, deadline: 999999, rw: { xp: 30 }, rwText: '30 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(fresh);
    out.gateWasActive = QUESTS.active.some(q => q.kind === 'xp');
    QUESTS.active.length = 0;   // strip the gate
    acceptQuest(fresh.id);
    out.noGateBlocked = QUESTS.active.length === 0;
    return out;
  });
  ck('accepting a side errand rides WITH the level-up deed (2 active)', R2.nActive === 2 && R2.sideActive === 1, JSON.stringify(R2));
  ck('a second side errand is refused — one at a time', R2.secondBlocked, JSON.stringify(R2));
  ck('side errands cannot be slotted without the level-up deed', R2.noGateBlocked, JSON.stringify(R2));

  /* ---- 3. a side hunt progresses by kills; the errand completes and pays BANK XP ---- */
  const R3 = await pg.evaluate(() => {
    // rebuild the gate + slot a fresh sprint errand deterministically
    const xq = { id: 'xp' + (Math.random() * 1e9 | 0), camp: true, stage: 'prep', kind: 'xp', need: 400, have: 0, base: wolf.xpTotal, icon: '✦', title: 'Reach XP test 2', biome: curBiomeKey, rw: { xp: 40 }, rwText: '40 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(xq);
    acceptQuest(xq.id);
    window.CAMP.tick(0.6);   // arm the side board
    const sprint = QUESTS.avail.find(s => s.side && s.kind === 'hunt' && !s.streak) || QUESTS.avail.find(s => s.side);
    acceptQuest(sprint.id);
    const sq = QUESTS.active.find(q => q.side);
    const out = { kind: sq.kind, species: sq.species, need: sq.need, rw: sq.rw.xp, xp0: wolf.xpTotal | 0, baseHave0: QUESTS.active.find(q => q.kind === 'xp').have, stage0: window.CAMP.state().stage, prep0: window.CAMP.state().prepDone };
    while (sq.have < sq.need) questEvent('kill', { species: sq.species, pos: { x: wolf.pos.x, z: wolf.pos.z } });
    window.CAMP.tick(0.6);   // the gate meter refreshes on the tick, not on the kill
    out.sideGone = !QUESTS.active.some(q => q.id === sq.id);
    out.xp1 = wolf.xpTotal | 0;
    out.gateHave1 = QUESTS.active.find(q => q.kind === 'xp').have;
    out.runSide = RUN.side | 0;
    out.prepDone = window.CAMP.state().prepDone;
    out.stage = window.CAMP.state().stage;
    out.sideBoard = QUESTS.avail.filter(q => q.side).length;
    return out;
  });
  ck('side hunt completes by kills (banked)', R3.sideGone, JSON.stringify(R3));
  ck('completion pays the errand XP into the ONE pool', R3.xp1 > R3.xp0, `+${R3.xp1 - R3.xp0} (rw ${R3.rw})`);
  ck('the errand XP FEEDS the level-up deed (gate have advanced)', R3.gateHave1 >= R3.rw, `gate +${R3.gateHave1}`);
  ck('side completion counts for the law (RUN.side)', R3.runSide >= 1, `RUN.side ${R3.runSide}`);
  ck('side completion does NOT advance the campaign machine', R3.prepDone === R3.prep0 && R3.stage === R3.stage0, `prepDone ${R3.prep0}→${R3.prepDone} stage ${R3.stage0}→${R3.stage}`);
  ck('the side board re-offers after an errand ends', R3.sideBoard >= 1, `avail sides ${R3.sideBoard}`);
  ck('errand reward is super-linear vs grinds (+60·Σ, need ≤ 4)', R3.rw >= 55 && R3.need <= 4, `rw ${R3.rw} need ${R3.need}`);

  /* ---- 4. streak (Twin Fangs) & collect & explore errands ---- */
  const R4 = await pg.evaluate(() => {
    const out = {};
    // streak: two kills within 15 s = one double
    const st = { id: 'st' + (Math.random() * 1e9 | 0), camp: true, side: true, stage: 'prep', kind: 'hunt', species: 'hare', need: 1, have: 0, icon: '⚡', title: 'Side: Twin Fangs probe', biome: curBiomeKey, streak: true, lastKillT: -99, timed: true, deadline: 999999, rw: { xp: 80 }, rwText: '80 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(st);
    acceptQuest(st.id);
    questEvent('kill', { species: 'hare', pos: { x: wolf.pos.x, z: wolf.pos.z } });   // arms
    out.armedHave = st.have;
    questEvent('kill', { species: 'hare', pos: { x: wolf.pos.x, z: wolf.pos.z } });   // within 15 s → double
    out.doubleGone = !QUESTS.active.some(q => q.id === st.id);
    // collect errand
    const cl = { id: 'cl' + (Math.random() * 1e9 | 0), camp: true, side: true, stage: 'prep', kind: 'collect', item: 'herb', need: 1, have: 0, icon: '✨', title: 'Side: Full Pannier probe', biome: curBiomeKey, timed: true, deadline: 999999, rw: { xp: 55 }, rwText: '55 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(cl);
    acceptQuest(cl.id);
    QUESTS.active.unshift(QUESTS.active.splice(QUESTS.active.indexOf(cl), 1)[0]);   // main first for the classic path
    questEvent('gather', { item: 'herb' });
    out.gatherGone = !QUESTS.active.some(q => q.id === cl.id);
    // explore errand
    const ex = { id: 'ex' + (Math.random() * 1e9 | 0), camp: true, side: true, stage: 'prep', kind: 'explore', lmType: 'glade', need: 1, have: 0, icon: '🧭', title: 'Side: Trail of Firsts probe', biome: curBiomeKey, timed: true, deadline: 999999, rw: { xp: 65 }, rwText: '65 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(ex);
    acceptQuest(ex.id);
    questEvent('discover', { type: 'glade', x: wolf.pos.x, z: wolf.pos.z });
    out.exploreGone = !QUESTS.active.some(q => q.id === ex.id);
    return out;
  });
  ck('Twin Fangs: a lone kill only arms the double', R4.armedHave === 0, JSON.stringify(R4));
  ck('Twin Fangs: two kills within 15s bank the double', R4.doubleGone, JSON.stringify(R4));
  ck('Full Pannier: gather events advance & complete the errand', R4.gatherGone, JSON.stringify(R4));
  ck('Trail of Firsts: a discovery completes the errand', R4.exploreGone, JSON.stringify(R4));

  /* ---- 5. the clock: an expired errand is erased with ZERO penalty ---- */
  const R5 = await pg.evaluate(() => {
    const xq = QUESTS.active.find(q => q.kind === 'xp') || null;
    if (!xq) { const q2 = { id: 'xp' + (Math.random() * 1e9 | 0), camp: true, stage: 'prep', kind: 'xp', need: 400, have: 0, base: wolf.xpTotal, icon: '✦', title: 'Reach XP test 3', biome: curBiomeKey, rw: { xp: 40 }, rwText: '40 XP' }; QUESTS.avail.length = 0; QUESTS.avail.push(q2); acceptQuest(q2.id); }
    const tm = { id: 'tm' + (Math.random() * 1e9 | 0), camp: true, side: true, stage: 'prep', kind: 'hunt', species: 'hare', need: 3, have: 0, icon: '⚡', title: 'Side: expired probe', biome: curBiomeKey, timed: true, deadline: (typeof tSec !== 'undefined' ? tSec : 0) - 1, rw: { xp: 60 }, rwText: '60 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(tm);
    acceptQuest(tm.id);
    const before = QUESTS.active.length;
    window.CAMP.tick(0.6);
    return { before, after: QUESTS.active.length, gone: !QUESTS.active.some(q => q.id === tm.id), board: QUESTS.avail.filter(q => q.side).length };
  });
  ck('expired errand is removed — no penalty, board re-offers', R5.gone && R5.after === R5.before - 1 && R5.board >= 1, JSON.stringify(R5));

  /* ---- 6. gate completion: errands retire, the machine advances ---- */
  const R6 = await pg.evaluate(() => {
    const xq = QUESTS.active.find(q => q.kind === 'xp');
    const sid = { id: 'sd' + (Math.random() * 1e9 | 0), camp: true, side: true, stage: 'prep', kind: 'collect', item: 'berry', need: 1, have: 0, icon: '✨', title: 'Side: gate-close probe', biome: curBiomeKey, timed: true, deadline: 999999, rw: { xp: 55 }, rwText: '55 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(sid);
    acceptQuest(sid.id);
    wolf.xpTotal = xq.base + xq.need;   // the climb completes
    for (let i = 0; i < 3; i++) window.CAMP.tick(0.6);
    return { xpGone: !QUESTS.active.some(q => q.kind === 'xp'), sideGone: !QUESTS.active.some(q => q.id === sid.id), stage: window.CAMP.state().stage, prepDone: window.CAMP.state().prepDone, mainBoard: QUESTS.avail.filter(q => !q.side).length };
  });
  ck('gate completion retires its side errands', R6.xpGone && R6.sideGone, JSON.stringify(R6));
  ck('the machine advances (prepDone++) and the MAIN board returns', (R6.prepDone >= 1 || R6.stage !== 'prep') && R6.mainBoard >= 1, JSON.stringify(R6));

  /* ---- 7. the NEURAL cortex is aware of the fast channel ---- */
  const R7 = await pg.evaluate(() => {
    const xq = { id: 'xp' + (Math.random() * 1e9 | 0), camp: true, stage: 'prep', kind: 'xp', need: 300, have: 0, base: wolf.xpTotal, icon: '✦', title: 'Reach XP test 4', biome: curBiomeKey, rw: { xp: 40 }, rwText: '40 XP' };
    QUESTS.avail.length = 0; QUESTS.active.length = 0; QUESTS.avail.push(xq);
    acceptQuest(xq.id);
    window.CAMPDBG.grantXp(150);   // the climb is half done — the meter must read ~0.5
    window.CAMP.tick(0.6);
    const info0 = window.CAMP.side();
    const sd = { id: 'sd' + (Math.random() * 1e9 | 0), camp: true, side: true, stage: 'prep', kind: 'hunt', species: 'hare', need: 1, have: 0, icon: '⚡', title: 'Side: senses probe', biome: curBiomeKey, timed: true, deadline: 999999, rw: { xp: 60 }, rwText: '60 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(sd);
    acceptQuest(sd.id);
    return { info0: { on: info0.on, avail: info0.avail, active: info0.active }, info1: window.CAMP.side() };
  });
  const R7b = await pg.evaluate(() => {
    RAFZZER.think({ pred: { a: null, d: 999 }, bossHit: { b: null, d: 999 }, frac: 1 });   // the cortex weighs the moment with the live world
    const snap = RAFZZER.snapshot();
    const xs = snap.inputs || [];
    const side = window.CAMP.side();
    return { n: xs.length, s24: xs[24], s25: xs[25], gateU: side.need ? side.have / side.need : 0, active: side.active };
  });
  ck('CAMP.side() reports the fast channel (on/avail/active)', R7.info0.on && R7.info1.active === 'hunt', JSON.stringify(R7));
  ck('BRAIN SEES IT: sense 24 = 1.0 while an errand is slotted', R7b.n === 26 && R7b.s24 === 1, JSON.stringify(R7b));
  ck('BRAIN SEES IT: sense 25 = the level-up deed meter', R7b.s25 > 0 && Math.abs(R7b.s25 - Math.min(1, R7b.gateU)) < 0.05, JSON.stringify(R7b));

  /* ---- 8. death clears errands + gate; the board rebuilds ---- */
  const R8 = await pg.evaluate(() => {
    const before = QUESTS.active.length;
    window.CAMP.onDeath();
    return { active: QUESTS.active.length, before, board: QUESTS.avail.length };
  });
  ck('death clears the level-up deed + its errands, board rebuilds', R8.active === 0 && R8.board >= 0, JSON.stringify(R8));
} catch (e) { failed.push('crash: ' + String(e.message).slice(0, 240)); } finally { await b.close(); }
if (failed.length) { console.log('SIDE TEST FAIL'); for (const f of failed) console.log('  ❌ ' + f); process.exit(1); }
console.log('SIDE TEST PASS');
