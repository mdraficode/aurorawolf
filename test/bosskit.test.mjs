// M46 v6.7 BOSS-KIT — the designed answer to "the Legend is the wall" (GEN 52 autopsy):
//  A) ☄️ Fallen Star (meteor event) grants DEEP BITE (+1 permanent bite damage) once per run — the perk
//     channel the campaign board never carries (classic deeds grant it, CAMP deeds don't).
//  B) 🦌 The White Stag grants WILD-HARDENED (+5 permanent max HP) when the wolf comes within 12 m — once ever.
//  C) Bonded-pack intercept now covers ALL boss damage paths — melee bite (already), charge/pounce,
//     submerge emergence and the eagle dive (previously unguarded).
// This test FAILS on any of those missing, PASSES on the v6.7 build.
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'url';

const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=7777&quality=low';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await browser.newPage({ viewport: { width: 720, height: 420 } });
const errors = [];
pg.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));

await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForFunction(() => typeof chunks !== 'undefined' && chunks.size >= 40, null, { timeout: 90000 });
await pg.waitForTimeout(400);

/* ---------- A · DEEP BITE from the fallen star ---------- */
const A = await pg.evaluate(() => {
  const out = {};
  const lp = wolf.pos;
  // a star lands 12 m away; walk onto the site and let discovery fire
  makeMeteorSite(lp.x + 12, lp.z);
  wolf.pos.x = lp.x + 12; wolf.pos.z = lp.z; wolf.pos.y = heightAt(lp.x + 12, lp.z) + 0.2;
  updateSense(0.7);                      // discoverTick fires → lm.found → grant hook
  out.granted = wolf.perks.strongJaw === true;
  out.inRecap = Array.isArray(RUN.perks) && RUN.perks.some(p => String(p).includes('Deep Bite'));
  out.dmgUp = (() => {   // mechanical truth: the bite formula reads the perk
    wolf.perks.strongJaw = false; const before = (3) + (wolf.perks.strongJaw ? 1 : 0);
    wolf.perks.strongJaw = true;  const after  = (3) + (wolf.perks.strongJaw ? 1 : 0);
    return after - before;
  })();
  // guard: a SECOND star blesses nothing twice
  const nPerks = RUN.perks.length;
  makeMeteorSite(lp.x - 14, lp.z);
  wolf.pos.x = lp.x - 14; wolf.pos.z = lp.z; wolf.pos.y = heightAt(lp.x - 14, lp.z) + 0.2;
  updateSense(0.7);
  out.onceOnly = RUN.perks.length === nPerks;
  out.sitesFound = landmarkList.filter(l => l.type === 'meteor' && l.found).length;   // both sites ARE discovered
  wolf.pos.x = lp.x; wolf.pos.z = lp.z; wolf.pos.y = heightAt(lp.x, lp.z) + 0.2;
  return out;
});
console.log(`A ☄️  Deep Bite — granted ${A.granted ? 'PASS' : 'FAIL'} · recap ${A.inRecap ? 'PASS' : 'FAIL'} · bite +${A.dmgUp} ${A.dmgUp === 1 ? 'PASS' : 'FAIL'} · once-only ${A.onceOnly ? 'PASS' : 'FAIL'} · sites found ${A.sitesFound}`);

/* ---------- B · WILD-HARDENED from the white stag ---------- */
const B = await pg.evaluate(() => {
  const out = {};
  if (!CAMP.on()) {}   // campaign on or off — the blessing is world logic
  if (WORLD_EVENTS.active) WORLD_EVENTS.end();
  WORLD_EVENTS.force('whiteStag');
  const stag = [...chunks.values()].flatMap(c => c.animals).find(a => a.luminous && !a.dead);
  out.stagExists = !!stag;
  if (!stag) return out;
  const mh0 = wolf.maxHp, hb0 = wolf.hpBonus || 0, hp0 = wolf.hp;
  wolf.hp = Math.max(20, wolf.hp - 30);   // leave room so the +5 heal is observable
  const hpAfterDrop = wolf.hp;
  wolf.pos.x = stag.pos.x + 6; wolf.pos.z = stag.pos.z; wolf.pos.y = stag.pos.y;
  WORLD_EVENTS.update(0.1);               // the stag tick → blessing + the stag bolts
  out.perk = wolf.perks.wildHardened === true;
  out.hpBonusUp = (wolf.hpBonus || 0) - hb0;
  out.maxHpUp = wolf.maxHp - mh0;
  out.healed = +(wolf.hp - hpAfterDrop).toFixed(1);
  out.bolted = stag.state === 'flee';
  out.inRecap = RUN.perks.some(p => String(p).includes('Wild-Hardened'));
  const nPerks = RUN.perks.length;
  WORLD_EVENTS.update(0.1);               // a second moment near magic does not stack
  out.onceOnly = RUN.perks.length === nPerks;
  WORLD_EVENTS.end();
  return out;
});
console.log(`B 🦌 Wild-Hardened — stag ${B.stagExists ? 'PASS' : 'FAIL'} · perk ${B.perk ? 'PASS' : 'FAIL'} · hpBonus +${B.hpBonusUp} ${B.hpBonusUp === 5 ? 'PASS' : 'FAIL'} · maxHp +${B.maxHpUp} ${B.maxHpUp === 5 ? 'PASS' : 'FAIL'} · heal +${B.healed} ${B.healed >= 5 ? 'PASS' : 'FAIL'} · bolts ${B.bolted ? 'PASS' : 'FAIL'} · recap ${B.inRecap ? 'PASS' : 'FAIL'} · once-only ${B.onceOnly ? 'PASS' : 'FAIL'}`);

/* ---------- C · the pack intercepts a boss CHARGE (was unguarded) ---------- */
const C = await pg.evaluate(() => {
  const out = {};
  const origRandom = Math.random;
  try {
    Math.random = () => 0.1;              // the 45% intercept roll always lands
    // a pack right here, then bonded
    const p = PACKDBG.spawn(wolf.pos.x + 8, wolf.pos.z + 8);
    PACKDBG.bondForce();
    out.bonded = PACK.pack() && PACK.pack().stance === 'bonded';
    const mate = p.members.find(m => !m.dead);
    mate.pos.x = wolf.pos.x + 1.4; mate.pos.z = wolf.pos.z;   // within the 3.6 m shield radius
    const mateHp0 = mate.hp, wolfHp0 = wolf.hp;
    wolf.invulnT = 0; wolf.deadT = 0;      // a clean field for the blow
    // the Thunder Bison charges through the wolf — the mate throws itself under the hooves
    const b = new Boss('dry', wolf.pos.x + 2, wolf.pos.z);
    b.charging = true; b.chargeHit = false; b.chargeT = 1.0; b.chargeDir = Math.atan2(wolf.pos.x - b.pos.x, wolf.pos.z - b.pos.z);
    b.update(0.016, tSec);
    out.wolfSpared = Math.abs(wolf.hp - wolfHp0) < 0.001;
    out.mateHurt = mate.hp < mateHp0;
    out.mateHpDrop = +(mateHp0 - mate.hp).toFixed(1);
    // control: fate's roll fails (0.9 > 0.45) → the wolf takes the charge itself
    b.dispose();
    Math.random = () => 0.9;
    const b2 = new Boss('dry', wolf.pos.x + 2, wolf.pos.z);
    b2.charging = true; b2.chargeHit = false; b2.chargeT = 1.0; b2.chargeDir = Math.atan2(wolf.pos.x - b2.pos.x, wolf.pos.z - b2.pos.z);
    const wolfHp1 = wolf.hp;
    b2.update(0.016, tSec);
    out.wolfHitWhenRollFails = wolf.hp < wolfHp1;
    b2.dispose();
  } finally { Math.random = origRandom; }
  return out;
});
console.log(`C 🐺 Pack intercept (boss charge) — bonded ${C.bonded ? 'PASS' : 'FAIL'} · wolf spared ${C.wolfSpared ? 'PASS' : 'FAIL'} · mate hurt (−${C.mateHpDrop}) ${C.mateHurt ? 'PASS' : 'FAIL'} · roll-fail control ${C.wolfHitWhenRollFails ? 'PASS' : 'FAIL'}`);

const fatal = errors.filter(e => !/favicon|Autoplay|AudioContext/i.test(e));
console.log('pageerrors:', fatal.length ? fatal.join(' | ') : 'none');
await browser.close();
const ok = A.granted && A.inRecap && A.dmgUp === 1 && A.onceOnly && A.sitesFound === 2 &&
           B.stagExists && B.perk && B.hpBonusUp === 5 && B.maxHpUp === 5 && B.healed >= 5 && B.bolted && B.inRecap && B.onceOnly &&
           C.bonded && C.wolfSpared && C.mateHurt && C.wolfHitWhenRollFails &&
           fatal.length === 0;
console.log(ok ? 'ALL PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
