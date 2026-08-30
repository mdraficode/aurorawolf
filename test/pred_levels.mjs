import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(() => {
  const out = {};
  // 1) spawn distribution at L0 vs L20 (30 samples each)
  const sample = () => { const pr = new Predator('bear', wolf.pos.x + 60, wolf.pos.z + 60); const L = pr.level, hp = pr.maxHp, dmg = pr.dmg, ai = { ...pr.ai }, terr = pr.territory, armor = pr.armor; pr.dispose(); return { L, hp, dmg, armor, terr, ai }; };
  wolf.level = 0; const s0 = Array.from({ length: 30 }, sample);
  wolf.level = 20; const s20 = Array.from({ length: 30 }, sample);
  const avg = a => +(a.reduce((s2, x) => s2 + x.L, 0) / a.length).toFixed(1);
  out.spawn = { atL0: { avgL: avg(s0), maxL: Math.max(...s0.map(x => x.L)), hpRange: [Math.min(...s0.map(x => x.hp)), Math.max(...s0.map(x => x.hp))] },
    atL20: { avgL: avg(s20), minL: Math.min(...s20.map(x => x.L)), maxL: Math.max(...s20.map(x => x.L)), hpRange: [Math.min(...s20.map(x => x.hp)), Math.max(...s20.map(x => x.hp))], terr: Math.max(...s20.map(x => x.terr)) } };
  // 2) forced L22 tiger: mechanics unlocked
  wolf.level = 20;
  let pr = null; for (let i = 0; i < 60 && !(pr && pr.level >= 21); i++) { if (pr) pr.dispose(); pr = new Predator('tiger', wolf.pos.x + 40, wolf.pos.z + 40); }
  out.forced = { level: pr.level, hp: pr.hp, dmg: pr.dmg, armor: pr.armor, feint: pr.ai.feint, fury: pr.ai.fury, patient: pr.ai.patient, cdMul: +pr.ai.cdMul.toFixed(2), runMul: +pr.ai.runMul.toFixed(2), territory: Math.round(pr.territory) };
  // 3) labelled health bar on first blood
  pr.hit(1);
  out.bar = { w: pr.barCv.width, h: pr.barCv.height, scale: [pr.bar.scale.x, pr.bar.scale.y] };
  // 4) scaled bite: force attack state
  const wolfHp0 = (wolf.hp = 200, 200);
  wolf.deadT = 0; wolf.invulnT = 0; wolf.flyT = 0; state = 'play';
  pr.lodT = 0; pr.flinchT = 0; pr.state = 'attack'; pr.atkCd = 0; pr.threatening = true; pr.furious = false;
  wolf.pos.x = pr.pos.x + 1.2; wolf.pos.z = pr.pos.z; wolf.pos.y = heightAt(wolf.pos.x, wolf.pos.z) + 1;
  pr.update(0.06, 100);
  out.bite = { expected: +(pr.dmg * Math.pow(0.982, wolf.level)).toFixed(2), taken: +(wolfHp0 - wolf.hp).toFixed(2) };
  // 5) XP bounty + RUN ledger
  out.bounty = pr.xpBounty;
  pr.die();
  out.afterKill = { predators: RUN.predators, kills: RUN.kills };
  // 6) death writes the chronicle; respawn starts fresh
  addXp(500);   // climb a bit for the record
  out.runMax = RUN.maxLevel;
  wolf.hp = 0.5; wolf.invulnT = 0; wolfTakeDamage(5000, { x: wolf.pos.x + 1, z: wolf.pos.z }, 'Level 22 Tiger', '🐯');
  out.died = wolf.deadT > 0;
  out.saved = { cause: JSON.parse(localStorage.getItem('revontulet_lastRun')).cause, maxLevel: JSON.parse(localStorage.getItem('revontulet_lastRun')).maxLevel, durOK: JSON.parse(localStorage.getItem('revontulet_lastRun')).dur > 0, best: JSON.parse(localStorage.getItem('revontulet_bestRun')).maxLevel };
  wolfRespawn();
  out.freshRun = { maxLevel: RUN.maxLevel, kills: RUN.kills, xp: RUN.xp };
  wolf.level = 0;
  return out;
});
// 7) reload → the start page shows the chronicle
await pg.reload({ timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(2500);
const recap = await pg.evaluate(() => { const r = document.getElementById('runRecap'); return { shown: r.style.display !== 'none' && r.offsetHeight > 0, text: r.textContent.replace(/\s+/g, ' ').slice(0, 220) }; });
console.log('PRED ' + JSON.stringify({ ...R, recap, errs }));
await b.close();
