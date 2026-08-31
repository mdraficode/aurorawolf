/* CAMPAIGN TEST — the whole machine, verified live in one page:
   board (3-4 choices, one active) → q0 → q1 → prep ×N → awaken → ritual → boss →
   legend slain → … → Beast Master → TROPHY tier 1 → tier 2. Plus speedrun law,
   anti-exploit, and persistence. Uses CAMPDBG only to shorten the ladder (never
   to fake assertions). NOTE: the headless page runs ~4 fps, so everything that
   resolves inside CAMP.tick is polled against game state, not wall-clock waits. */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const URL = pathToFileURL('/home/user/index.html').href + '?autostart=1&seed=4242&quality=low';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
let failed = [];
const ck = (name, cond, extra) => { console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond ? '' : '  ← ' + extra)); if (!cond) failed.push(name + (extra ? ' [' + extra + ']' : '')); };
const sleep = ms => pg.waitForTimeout(ms);
const until = async (fn, timeout = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await pg.evaluate(fn)) return true;
    await sleep(400);
  }
  return false;
};
// run one campaign deed to completion using its own real path (returns kind)
const doDeed = kind => pg.evaluate(k => {
  const find = (ks) => QUESTS.avail.find(q => ks.includes(q.kind)) || QUESTS.avail[0];
  const q = find(['xp', 'harvest', 'herbal', 'scout', 'hunt', 'combat', 'collect', 'explore', 'survive']);
  if (!q) return 'none';
  acceptQuest(q.id);
  if (q.kind === 'xp') { window.CAMPDBG.grantXp(q.need + 10); }
  else if (q.kind === 'harvest') { q.have = q.need - 1; questEvent('kill', { species: 'rabbit', pos: { x: wolf.pos.x, z: wolf.pos.z } }); }
  else if (q.kind === 'scout') { q.have = 1; completeQuest(q); }
  else if (q.kind === 'herbal') { q.have = q.need - 1; questEvent('gather', { item: 'herb' }); }
  else if (q.kind === 'hunt') { q.have = q.need - 1; questEvent('kill', { species: q.species, pos: { x: wolf.pos.x, z: wolf.pos.z } }); }
  else if (q.kind === 'combat') { q.have = q.need - 1; questEvent('kill', { species: 'predator', pos: { x: wolf.pos.x, z: wolf.pos.z } }); }
  else if (q.kind === 'collect') { q.have = q.need - 1; questEvent('gather', { item: q.item }); }
  else if (q.kind === 'explore' || q.kind === 'survive') { q.have = 1; completeQuest(q); }
  return q.kind;
}, kind);
const board = () => pg.evaluate(() => ({ stage: window.CAMP.state().stage, avail: QUESTS.avail.length, kinds: QUESTS.avail.map(q => q.kind), active: QUESTS.active.length, camp: QUESTS.avail.every(q => q.camp) }));

try {
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP, null, { timeout: 90000 });
  await sleep(2600);
  await pg.evaluate(() => { try { localStorage.removeItem('revontulet_campaign_v1'); } catch (e) { } window.CAMPDBG.reset(); });
  await sleep(600);

  /* ---- 1. board: 3-4 campaign choices, none active ---- */
  let R = await board();
  ck('board offered at first play', R.avail >= 3 && R.avail <= 4 && R.active === 0 && R.camp, JSON.stringify(R));
  ck('campaign starts Tier 1 · Leopard', R.stage === 'q0', JSON.stringify({ s: R.stage }));

  /* ---- 2. ONE active quest rule + choices disappear ---- */
  R = await pg.evaluate(() => {
    const ids = QUESTS.avail.map(q => q.id);
    acceptQuest(ids[0]);
    const after1 = { active: QUESTS.active.length, avail: QUESTS.avail.length };
    acceptQuest(ids[1]);   // must be refused
    return { after1, after2: { active: QUESTS.active.length, avail: QUESTS.avail.length }, title: QUESTS.active[0] ? QUESTS.active[0].title : '-' };
  });
  ck('accept → ONE active, choices vanish', R.after1.active === 1 && R.after1.avail === 0, JSON.stringify(R.after1));
  ck('second accept refused', R.after2.active === 1 && R.after2.avail === 0, JSON.stringify(R.after2));

  /* ---- 3. complete the q0 deed → stage q1; ONE unified XP pool (deed + trickle together) ---- */
  R = await pg.evaluate(() => {
    const q = QUESTS.active[0];
    const xp0 = wolf.xp, tot0 = wolf.xpTotal, run0 = RUN.xp;
    if (q.kind === 'hunt') { q.have = q.need - 1; questEvent('kill', { species: q.species, pos: { x: wolf.pos.x, z: wolf.pos.z } }); }
    else if (q.kind === 'explore') { q.have = 1; completeQuest(q); }
    else if (q.kind === 'collect') { q.have = q.need - 1; questEvent('gather', { item: q.item }); }
    else if (q.kind === 'survive') { q.have = q.need; completeQuest(q); }
    const xpAfter = wolf.xp, totAfter = wolf.xpTotal, runAfter = RUN.xp;
    completeQuest(q);   // double-complete must be a no-op
    return { xp0, tot0, run0, xpPaid: xpAfter - xp0, totPaid: totAfter - tot0, runPaid: runAfter - run0, xp2: wolf.xp - xpAfter, tot2: wolf.xpTotal - totAfter };
  });
  await until(() => window.CAMP.state().stage === 'q1');
  R = Object.assign(R, await board());
  ck('q0 completes → stage q1 offered', R.stage === 'q1' && R.avail >= 3 && R.avail <= 4 && R.camp, JSON.stringify(R));
  ck('deed XP paid exactly once (atomic)', R.xpPaid > 0 && R.xp2 === 0, `paid ${R.xpPaid}, double ${R.xp2}`);
  ck('ONE unified pool: career XP = run XP = the single payout', R.totPaid === R.runPaid && R.totPaid > 0 && R.tot2 === 0, `career ${R.totPaid} run ${R.runPaid} (level bar wraps at level-up)`);

  /* ---- 4. q1 → prep ---- */
  await doDeed();
  await until(() => window.CAMP.state().stage === 'prep');
  R = await board();
  ck('q1 completes → preparation', R.stage === 'prep', JSON.stringify(R));

  /* ---- 5. prep × prepNeed → awaken (poll; xp deeds resolve in CAMP.tick) ---- */
  for (let i = 0; i < 4 && !(await pg.evaluate(() => window.CAMP.state().stage === 'awaken')); i++) {
    await doDeed();
    await until(() => QUESTS.active.length === 0 || QUESTS.avail.length > 0, 120000);
  }
  R = await board();
  ck('preparation done → AWAKEN stage with ritual', R.stage === 'awaken' && R.avail === 1 && R.kinds[0] === 'ritual', JSON.stringify(R));
  R = await pg.evaluate(() => window.CAMP.state().altar);
  ck('altar placed in the legend biome', !!R && !!R.x, JSON.stringify(R));

  /* ---- 6. ritual → boss ---- */
  R = await pg.evaluate(() => {
    const a = window.CAMP.state().altar;
    wolf.pos.set(a.x + 2, heightAt(a.x + 2, a.z) + 0.5, a.z);
    const q = QUESTS.avail[0];
    acceptQuest(q.id);
    const near = window.CAMP.nearAltar();
    doGather();   // the E-key path
    return { near, boss: bosses.filter(bo => bo.def && bo.def.camp).length, quest: QUESTS.active[0] ? QUESTS.active[0].title : '-' };
  });
  await sleep(500);
  ck('altar channel succeeds', R.near, String(R.near));
  ck('LEGEND rises at the ritual', R.boss === 1 && R.quest.indexOf('Legend') >= 0, JSON.stringify(R));

  /* ---- 7. slay the legend → next legend, story, no double trophy ---- */
  R = await pg.evaluate(() => {
    const bo = bosses.find(bo => bo.def && bo.def.camp);
    const leg0 = window.CAMP.state().leg;
    bo.hp = 1; bo.die();
    return { leg0, trophies: window.CAMP.state().trophies.length };
  });
  await sleep(500);
  const R7 = await pg.evaluate(() => ({ leg1: window.CAMP.state().leg, stage: window.CAMP.state().stage, perks: !!(wolf.perks && (wolf.perks.shadowStep || wolf.perks.secondWind || wolf.perks.thunderCharge || wolf.perks.winterCoat || wolf.perks.springSteps)) }));
  ck('legend slain → next legend offered', R7.leg1 === R.leg0 + 1, JSON.stringify(R7));
  ck('legend perk granted', R7.perks, '');
  ck('no trophy yet (Beast Master stands)', R.trophies === 0, String(R.trophies));

  /* ---- 8. jump to the Beast Master and finish the tier → TROPHY tier 1 ---- */
  await pg.evaluate(() => { window.CAMPDBG.setLeg(5); window.CAMPDBG.setStage('prep'); });
  await sleep(400);
  for (let i = 0; i < 4 && !(await pg.evaluate(() => window.CAMP.state().stage === 'awaken')); i++) {
    await doDeed();
    await until(() => QUESTS.active.length === 0 || QUESTS.avail.length > 0, 120000);
  }
  R = await board();
  ck('beast prep done → awaken ritual', R.stage === 'awaken' && R.kinds[0] === 'ritual', JSON.stringify(R));
  R = await pg.evaluate(() => {
    const a = window.CAMP.state().altar;
    if (!a) return { skip: 'no altar' };
    wolf.pos.set(a.x + 1.5, heightAt(a.x + 1.5, a.z) + 0.5, a.z);
    const q = QUESTS.avail[0];
    acceptQuest(q.id);
    doGather();
    const bo = bosses.find(bo => bo.def && bo.def.camp && !bo.dead);
    if (bo) { bo.hp = 1; bo.die(); }
    return { boss: !!bo, name: bo ? bo.def.name : '-' };
  });
  await sleep(600);
  R = await pg.evaluate(() => {
    const S = window.CAMP.state();
    return { tier: S.tier, leg: S.leg, trophies: S.trophies.length, bestT: S.best['1'] ? S.best['1'].t : null, elapsed: window.CAMPDBG.elapsed(), stage: S.stage, name: S.name };
  });
  ck('Beast Master defeated', R.trophies === 1, JSON.stringify(R));
  ck('TROPHY tier 1 recorded with time', R.tier === 2 && R.bestT !== null, `tier ${R.tier} best ${R.bestT}`);
  ck('new tier begins at q0 fresh', R.stage === 'q0' && R.leg === 0, JSON.stringify({ s: R.stage, l: R.leg }));
  ck('run timer reset for the new tier', R.elapsed < 60, String(R.elapsed));

  /* ---- 9. speedrun law: pause freezes, play resumes, death never rewinds ---- */
  R = await pg.evaluate(async () => {
    setState('pause');
    const t0 = window.CAMPDBG.elapsed();
    await new Promise(r => setTimeout(r, 1500));
    const t1 = window.CAMPDBG.elapsed();
    setState('play');
    await new Promise(r => setTimeout(r, 1500));
    const t2 = window.CAMPDBG.elapsed();
    return { t0, t1, t2, grewAfter: t2 - t1 };
  });
  ck('timer pauses honestly (≤ small drift)', Math.abs(R.t1 - R.t0) < 0.2, `${R.t0} → ${R.t1}`);
  ck('timer runs when playing again', R.grewAfter > 0.5, String(R.grewAfter));
  R = await pg.evaluate(() => {
    // build a known state: level 5 with a partial bar, a deed in flight, a hard position
    wolf.level = 5; wolf.xp = 40; wolf.xpNext = 500; wolf.xpTotal = 1234;
    const stage0 = window.CAMP.state().stage;
    const q0 = QUESTS.avail[0];
    acceptQuest(q0.id);
    wolf.pos.set(200, heightAt(200, 250) + 0.5, 250);
    const diedAt = { x: wolf.pos.x, z: wolf.pos.z };
    wolfDie('test predator', '💀');
    wolfRespawn();
    return {
      diedAt, stage0, level: wolf.level, xp: wolf.xp, xpNext: wolf.xpNext, xpTotal: wolf.xpTotal,
      stage1: window.CAMP.state().stage, active: QUESTS.active.length, avail: QUESTS.avail.length,
      near: Math.hypot(wolf.pos.x - diedAt.x, wolf.pos.z - diedAt.z), hp: wolf.hp, maxHp: wolf.maxHp
    };
  });
  ck('death fails the deed → manual re-accept (board rebuilt)', R.active === 0 && R.avail >= 3 && R.avail <= 4, `active ${R.active} avail ${R.avail}`);
  ck('death cancels the bar → restart of the current level', R.level === 5 && R.xp === 0 && R.xpNext === 500, `lvl ${R.level} xp ${R.xp} next ${R.xpNext}`);
  ck('death keeps career XP + progression (one pool stands)', R.xpTotal === 1234 && R.stage1 === R.stage0, `total ${R.xpTotal} stage ${R.stage1}`);
  ck('respawn NEAR the fall (≤75 m), alive & healthy', R.near > 0 && R.near <= 75 && R.hp === R.maxHp, `dist ${R.near.toFixed(1)} hp ${R.hp}/${R.maxHp}`);

  /* ---- 10. trophies screen ---- */
  R = await pg.evaluate(() => { window.CAMP.showTrophies(); return { t: document.getElementById('ovTitle').textContent, body: document.getElementById('ovBody').textContent.slice(0, 300) }; });
  ck('TROPHIES panel lists the record', /TROPHIES/i.test(R.t) && /TIER 1/.test(R.body) && /BEST TIER TIME/.test(R.body), R.t);

  /* ---- 11. persistence across reload ---- */
  await pg.evaluate(() => { localStorage.setItem('revontulet_tester', (window.CAMP.state().tier) + '|' + (window.CAMP.state().trophies.length)); wolf.xpTotal = 987; wolf.level = 3; window.CAMP.save(); });
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP, null, { timeout: 90000 });
  await sleep(2500);
  R = await pg.evaluate(() => { const S = window.CAMP.state(); return { tier: S.tier, trophies: S.trophies.length, stage: S.stage, avail: QUESTS.avail.length, key: localStorage.getItem('revontulet_tester'), career: wolf.xpTotal, lvl: wolf.level }; });
  ck('save survives reload (tier 2, trophy kept)', R.tier === 2 && R.trophies === 1 && R.key === '2|1', JSON.stringify(R));
  ck('board rebuilt for the resumed tier', R.avail >= 3 && R.avail <= 4 && R.stage === 'q0', JSON.stringify(R));
  ck('career XP pool restored from checkpoint (reload ≠ reset)', R.career === 987 && R.lvl === 3, `career ${R.career} lvl ${R.lvl}`);
} catch (e) {
  failed.push('crash: ' + String(e.message).slice(0, 200));
} finally {
  await b.close();
}
if (failed.length) { console.log('CAMPAIGN TEST FAIL'); for (const f of failed) console.log('  ❌ ' + f); process.exit(1); }
console.log('CAMPAIGN TEST PASS');
