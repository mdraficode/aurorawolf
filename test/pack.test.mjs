/* PACK TEST — howl bonding, pack assist, member-death law, hostile rolls, level scaling, session-only. */
import { chromium } from 'playwright';
import { pathToFileURL , fileURLToPath } from 'url';
const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=4242&quality=low';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
let failed = [];
const ck = (n, c, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  ← ' + x)); if (!c) failed.push(n); };
const sleep = ms => pg.waitForTimeout(ms);
/* NOTE: in headless CI the rAF loop is throttled to a crawl, so the test DRIVES the pack's
   own tick (the very function the game loop calls) to simulate frames deterministically. */
const drive = async (frames = 10, dt = 0.12) => {
  await pg.evaluate(([f, d]) => { for (let i = 0; i < f; i++) window.PACK.tick(d, (tSec || 0) + i * d); }, [frames, dt]);
};
const untilDrive = async (fn, t = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < t) { await drive(12); if (await pg.evaluate(fn)) return true; await sleep(350); }
  return false;
};
try {
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP && window.PACK && typeof RivalPack !== 'undefined', null, { timeout: 90000 });
  await sleep(2500);
  await pg.evaluate(() => { try { localStorage.removeItem('revontulet_campaign_v1'); } catch (e) { } window.CAMPDBG.reset(); wolf.hp = wolf.maxHp; });
  await sleep(600);

  /* ---- 1. spawn a pack (deterministic), leveled to the player's XP level ---- */
  const R1 = await pg.evaluate(() => {
    wolf.level = 7;
    const p = window.PACKDBG.spawn(wolf.pos.x, wolf.pos.z + 220);   // far: no idle stance roll
    return { level: p.level, members: p.members.length, stance: p.stance,
      leader: { hp: p.members[0].maxHp, dmg: p.members[0].dmg, run: p.members[0].runSpd },
      ids: p.members.map(m => m.bondId) };
  });
  ck('pack spawns (3-5 wolves, undecided)', R1.members >= 3 && R1.members <= 5 && R1.stance === 'undecided', JSON.stringify(R1));
  ck('pack leveled to the player XP level (±1)', Math.abs(R1.level - 7) <= 1, `level ${R1.level}`);
  ck('members have bond ids', R1.ids.every(id => id > 0), JSON.stringify(R1.ids));
  ck('member stats scale with level (mortal, but strong)', R1.leader.hp > 14 && R1.leader.dmg > 4 && R1.leader.run > 12, JSON.stringify(R1.leader));

  /* ---- 2. unreachable packs ignore the call; luck decides bond vs fangs; one pack only ---- */
  const R2 = await pg.evaluate(() => {
    const out = {};
    const pk = window.PACKDBG.packNow();
    // (a) out of range — nothing changes
    window.PACKDBG.setRoll(0.1);
    window.PACKDBG.onHowl();
    out.farStance = pk.stance;
    // (b) in range, unlucky roll → the WHOLE pack attacks
    pk.stance = 'ignore';                      // freeze the idle stance roller for determinism
    pk.members[0].pos.x = wolf.pos.x + 60; pk.members[0].pos.z = wolf.pos.z;
    window.PACKDBG.setRoll(0.5);
    window.PACKDBG.onHowl();
    out.attackStance = pk.stance; out.attackStates = pk.members.map(m => m.state);
    // (c) fresh pack + lucky roll → bonded
    pk.disbanded = true; pk.dispose();
    const p2 = window.PACKDBG.spawn(wolf.pos.x, wolf.pos.z + 220);
    p2.stance = 'ignore';
    p2.members[0].pos.x = wolf.pos.x + 60; p2.members[0].pos.z = wolf.pos.z;
    window.PACKDBG.setRoll(0.1);
    window.PACKDBG.onHowl();
    out.bondStance = p2.stance; out.bondStates = p2.members.map(m => m.state);
    // (d) a second bond attempt is refused (one pack, one hunt)
    const p3 = window.PACKDBG.spawn(wolf.pos.x, wolf.pos.z + 220);
    window.PACKDBG.setRoll(0.0);
    window.PACKDBG.onHowl();
    out.secondStance = p3.stance; out.protected = (window.PACKDBG.state() || {}).stance;
    p3.disbanded = true; p3.dispose();
    return out;
  });
  ck('out of range → the call changes nothing', R2.farStance === 'undecided', JSON.stringify(R2.farStance));
  ck('unlucky howl → THE WHOLE PACK attacks', R2.attackStance === 'attack' && R2.attackStates.every(s => s === 'attack'), JSON.stringify(R2.attackStates));
  ck('lucky howl → THE PACK JOINS YOU (bonded)', R2.bondStance === 'bonded' && R2.bondStates.every(s => s === 'bond'), JSON.stringify(R2));
  ck('a second pack cannot be bonded — one pack, one hunt', (R2.protected || '') === 'bonded' && R2.secondStance !== 'bonded', JSON.stringify(R2.secondStance));

  /* ---- 3. with a deed active, the pack hunts it WITH the player ---- */
  const R3 = await pg.evaluate(() => {
    wolf.hp = wolf.maxHp;
    let a = null;
    for (const ch of chunks.values()) { for (const an of ch.animals) if (!an.dead && an.name !== 'deer') { a = an; break; } if (a) break; }
    if (!a) for (const ch of chunks.values()) { for (const an of ch.animals) if (!an.dead) { a = an; break; } if (a) break; }
    if (!a) return { ok: false, why: 'no animals found at all' };
    const killSpot = { x: wolf.pos.x + 18, z: wolf.pos.z + 18 };
    const q = { id: 't' + (Math.random() * 1e9 | 0), camp: true, stage: 'q0', kind: 'hunt', species: a.name, need: 50, have: 0,
      icon: '🎯', title: 'Test hunt: ' + a.name, biome: dominantBiomeAt(killSpot.x, killSpot.z).key, rw: { xp: 40 }, rwText: '40 XP' };
    QUESTS.avail.length = 0; QUESTS.avail.push(q);
    acceptQuest(q.id);
    a.pos.x = killSpot.x; a.pos.z = killSpot.z; a.pos.y = heightAt(killSpot.x, killSpot.z);
    a.aware = 0;
    return { ok: true, species: a.name, active: QUESTS.active.length, need: q.need };
  });
  ck('deed accepted for the pack test (need 50 → never completes)', R3.ok && R3.active === 1, JSON.stringify(R3));
  const hunted = await untilDrive(() => (QUESTS.active[0] ? QUESTS.active[0].have : -1) > 0, 120000);
  const R3b = await pg.evaluate(() => {
    wolf.hp = wolf.maxHp;
    const q = QUESTS.active[0];
    const st = window.PACKDBG.state();
    return { have: q ? q.have : -1, units: st ? st.members.map(m => m.contrib ? m.contrib.units : 0) : [] };
  });
  ck('the pack hunts the deed WITH you', hunted && R3b.have > 0, JSON.stringify(R3b));
  ck('mate contributions are attributed', R3b.units.some(u => u > 0), JSON.stringify(R3b.units));

  /* ---- 4. DEATH LAW: a fallen mate's deed progress is lost ---- */
  const R4 = await pg.evaluate(() => {
    const q = QUESTS.active[0];
    const before = q.have;
    const m0 = window.PACKDBG.state().members.find(mm => mm.contrib && mm.contrib.units > 0);
    let fallen = null, carried = 0;
    if (m0) {
      const rw = rivals.find(r => r.pack && r.pack.stance === 'bonded' && r.bondId === m0.id && !r.dead);
      if (rw) { carried = m0.contrib.units; fallen = rw.bondId; rw.die(true); }   // the wild takes it
    }
    wolf.hp = wolf.maxHp;
    return { before, after: q.have, carried, fallen, expected: Math.max(0, before - carried) };
  });
  ck("a fallen mate's progress is subtracted from the deed", R4.fallen !== null && R4.after === R4.expected, JSON.stringify(R4));

  /* ---- 5. COMBAT EXCEPTION: battle damage stands even when the mate falls ---- */
  const R5 = await pg.evaluate(() => {
    wolf.hp = wolf.maxHp;
    const q = QUESTS.active[0];
    const mates = rivals.filter(r => r.pack && r.pack.stance === 'bonded' && !r.dead);
    let pr = null;
    for (const ch of chunks.values()) for (const p of ch.predators) if (!p.dead && !p.def) { pr = p; break; }
    if (!pr) for (const ch of chunks.values()) for (const p of ch.predators) if (!p.dead) { pr = p; break; }
    if (!pr || !mates.length) return { ok: false, why: !mates.length ? 'no live bonded mate' : 'no predator found' };
    const m = mates[0];
    pr.pos.x = wolf.pos.x + 20; pr.pos.z = wolf.pos.z; pr.pos.y = heightAt(pr.pos.x, pr.pos.z);
    m.pos.x = pr.pos.x + 1.2; m.pos.z = pr.pos.z; m.pos.y = heightAt(m.pos.x, m.pos.z);
    m.atkCd = 0; m._eng = pr;
    const hp0 = pr.hp;
    window.PACK.tick(0.016, 0);
    const hp1 = pr.hp;
    const dmg = Math.round((hp0 - hp1) * 10) / 10;
    m._eng = null;
    // the law itself: combat contributions survive the mate's death
    const haveBefore = q.have;
    m.contrib = { qid: q.id, units: 0, items: {}, combat: true };
    q.have = haveBefore + 3;
    window.PACK.memberDown(m);
    const after = q.have;
    q.have = haveBefore; m.contrib = null;
    return { ok: true, dmg, combatStands: after === haveBefore + 3 };
  });
  ck('a mate bites the enemy for real damage', R5.ok && R5.dmg > 0, JSON.stringify(R5));
  ck('COMBAT EXCEPTION: battle progress is never rolled back', R5.ok && R5.combatStands, JSON.stringify(R5));

  /* ---- 6. hostile packs bite; the HUD reports the bond ---- */
  const R6 = await pg.evaluate(() => {
    wolf.hp = wolf.maxHp;
    const pk = window.PACKDBG.spawn(wolf.pos.x, wolf.pos.z + 220);
    pk.stance = 'ignore';
    pk.members[0].pos.x = wolf.pos.x + 2.0; pk.members[0].pos.z = wolf.pos.z;
    pk.stance = 'attack'; pk.setStates('attack');
    pk.members[0].atkCd = 0;
    const hp0 = wolf.hp;
    for (let i = 0; i < 4; i++) pk.members[0].update(0.1, i * 0.1);
    const hurt = hp0 - wolf.hp;
    pk.disbanded = true; pk.dispose();
    return { hurt, status: window.PACK.status() };
  });
  ck('hostile pack bites the player up close', R6.hurt > 0, JSON.stringify(R6));
  ck('HUD reports the bonded pack', /Pack/.test(R6.status || '') && /bonded/.test(R6.status || ''), R6.status);

  /* ---- 7. session-only: a reload leaves the wilds quiet (documented choice) ---- */
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.PACK, null, { timeout: 90000 });
  await sleep(2000);
  const R7 = await pg.evaluate(() => window.PACKDBG.state());
  ck('pack is session-only — reload dissolves the bond (documented)', R7 === null, JSON.stringify(R7));
} catch (e) { failed.push('crash: ' + String(e.message).slice(0, 240)); } finally { await b.close(); }
if (failed.length) { console.log('PACK TEST FAIL'); for (const f of failed) console.log('  ❌ ' + f); process.exit(1); }
console.log('PACK TEST PASS');
