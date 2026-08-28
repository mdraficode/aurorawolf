// Combat fairness: predator & rival bites must land from EVERY side (rear included).
import { chromium } from 'playwright';

const results = [];
const ck = (name, ok, extra = '') => { results.push([name, !!ok]); console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///home/user/index.html?autostart=1&seed=4242&quality=low');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(1500);

  // helper: hold an attacker at a fixed offset on one side, in melee, and count bites
  const sideTest = (side, dist, ms, kind = 'predator') => page.evaluate(async ({ side, dist, ms, kind }) => {
    window.__hits = [];
    const od = wolfTakeDamage;
    window.wolfTakeDamage = function (dmg, from, label, icon) { window.__hits.push({ dmg }); return od(dmg, from, label, icon); };
    const wx = wolf.pos.x, wz = wolf.pos.z;
    wolf.pos.y = heightAt(wx, wz) + 0.5;
    wolf.yaw = 0; camYaw = 0; wolf.hp = 100; wolf.invulnT = 0; wolf.deadT = 0;
    const dir = { front: 1, back: -1, flank: 1 }[side];
    const useX = side === 'flank';
    const px = wx + (useX ? dist * dir : 0), pz = wz + (useX ? 0 : dist * dir);
    const atk = kind === 'rival' ? new RivalWolf(px, pz, null, false) : new Predator('bear', px, pz);
    if (kind === 'rival') { atk.state = 'attack'; atk.atkCd = 0.05; rivals.push(atk); scene.add(atk.model); }
    else {
      const ch = chunks.get(ck(Math.floor(wolf.pos.x / CHUNK), Math.floor(wolf.pos.z / CHUNK)));   // the wolf's own chunk is always loaded
      ch.predators.push(atk);
      atk.home.x = px; atk.home.z = pz; atk.territory = 999; atk.reArmed = true; atk.hunger = 0;
      atk.state = 'attack'; atk.atkCd = 0.05;
    }
    const hold = setInterval(() => {
      atk.pos.set(wolf.pos.x + (useX ? dist * dir : 0), wolf.pos.y, wolf.pos.z + (useX ? 0 : dist * dir));
      atk.state = 'attack';
      if (atk.atkCd > 0.4) atk.atkCd = 0.4;
    }, 120);
    await new Promise(r => setTimeout(r, ms));
    clearInterval(hold);
    const hits = window.__hits;
    if (kind === 'rival') { const i = rivals.indexOf(atk); if (i >= 0) rivals.splice(i, 1); }
    else atk.dispose();
    wolf.hp = 100; wolf.invulnT = 0;
    return hits.length;
  }, { side, dist, ms, kind });

  // ---- predators bite from every side ----
  const bBack = await sideTest('back', 1.2, 5000);
  const bFront = await sideTest('front', 1.2, 5000);
  const bFlank = await sideTest('flank', 1.8, 5000);
  const bBack3 = await sideTest('back', 3.0, 5000);
  ck('predator bites from BEHIND (point blank)', bBack >= 2, `${bBack} bites`);
  ck('predator bites from the front', bFront >= 2, `${bFront} bites`);
  ck('predator bites from the flank', bFlank >= 2, `${bFlank} bites`);
  ck('predator bites from BEHIND at bite range', bBack3 >= 1, `${bBack3} bites`);
  const fair = Math.abs(bBack - bFront) <= 2;
  ck('rear damage is not weaker than front', fair, `back ${bBack} vs front ${bFront}`);

  // ---- rival wolves bite from behind too (members tick via a live pack event) ----
  const rBack = await page.evaluate(async () => {
    window.__hits = [];
    const od = wolfTakeDamage;
    window.wolfTakeDamage = function (dmg, from, label, icon) { window.__hits.push({ dmg }); return od(dmg, from, label, icon); };
    wolf.hp = 100; wolf.invulnT = 0; wolf.deadT = 0;
    // members only tick via the event's tick() — force the event ACTIVE so Pack.update runs
    WORLD_EVENTS.force('rivalPack');
    await new Promise(r => setTimeout(r, 600));
    const pack = WORLD_EVENTS.pack;
    if (!pack || !pack.members.length) { WORLD_EVENTS.end(); return -1; }
    const m = pack.members[0];
    const hold = setInterval(() => {
      pack.stance = 'attack';   // the pack is hunting — member states are honored
      m.pos.set(wolf.pos.x - Math.sin(wolf.yaw) * 1.3, wolf.pos.y, wolf.pos.z - Math.cos(wolf.yaw) * 1.3);   // directly behind
      m.state = 'attack';
      if (m.atkCd > 0.4) m.atkCd = 0.4;
    }, 120);
    await new Promise(r => setTimeout(r, 5000));
    clearInterval(hold);
    const n = window.__hits.length;
    pack.dispose(); WORLD_EVENTS.pack = null; WORLD_EVENTS.end();
    wolf.hp = 100; wolf.invulnT = 0;
    return n;
  });
  ck('rival wolf bites from BEHIND', rBack >= 2, `${rBack} bites`);

  // ---- and the player still fights back normally (bite cone unaffected) ----
  const fight = await page.evaluate(async () => {
    const px = wolf.pos.x, pz = wolf.pos.z;
    const pr = new Predator('bear', px + Math.sin(wolf.yaw) * 1.6, pz + Math.cos(wolf.yaw) * 1.6);
    const ch = chunks.get(ck(Math.floor(wolf.pos.x / CHUNK), Math.floor(wolf.pos.z / CHUNK)));
    ch.predators.push(pr);
    pr.home.x = pr.pos.x; pr.home.z = pr.pos.z; pr.territory = 999; pr.state = 'attack'; pr.atkCd = 9;
    const hp0 = pr.hp;
    for (let i = 0; i < 10 && !pr.dead; i++) { wolf.atkCd = 0; wolf.attack(); await new Promise(r => setTimeout(r, 260)); }
    pr.dispose();
    return { dented: pr.dead || pr.hp < hp0 };
  });
  ck('player bites still land on predators', fight.dented);

  ck('zero page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
const fails = results.filter(r => !r[1]).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
