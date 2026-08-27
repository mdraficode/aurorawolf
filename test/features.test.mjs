import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=1337');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1500);
const R = await page.evaluate(async () => {
  const R = {};
  const dt = 1 / 30;

  // --- 1. DOM: attack button + flyTimer exist ---
  R.tAttack = !!document.getElementById('tAttack');
  R.flyTimerEl = !!document.getElementById('flyTimer');
  R.flyTimerHiddenDefault = document.getElementById('flyTimer').style.display === 'none' || getComputedStyle(document.getElementById('flyTimer')).display === 'none';

  // --- 2. species tiers ---
  R.tiers = Object.fromEntries(Object.entries(SPECIES).map(([k, s]) => [k, { hp: s.hp, meat: s.meat, pelt: s.pelt || 0, bone: s.bone || 0, run: s.run }]));
  R.rabbitEasy = SPECIES.rabbit.hp === 1 && SPECIES.rabbit.meat === 1;
  R.elkHard = SPECIES.elk.hp >= 3 && SPECIES.elk.meat >= 3 && (SPECIES.elk.pelt || 0) >= 1 && (SPECIES.elk.bone || 0) >= 1;

  // --- 3. contact auto-catch removed: walk into an animal, nothing dies ---
  const allAnimals = []; for (const ch of chunks.values()) for (const a of ch.animals) allAnimals.push(a);
  const a0 = allAnimals.find(a => !a.dead);
  if (a0) {
    const before = allAnimals.filter(a => a.dead).length;
    const hp0 = a0.hp;
    // simulate overlap for 1.5s
    for (let i = 0; i < 45; i++) {
      wolf.pos.x = a0.pos.x + 0.3; wolf.pos.z = a0.pos.z + 0.3;
      tick();
    }
    R.noContactCatch = allAnimals.filter(a => a.dead).length === before || a0.hp === hp0;
  }

  // --- 4. attack(): cooldown, damage, flinch, kill, rewards ---
  const prey2 = []; for (const ch of chunks.values()) for (const a of ch.animals) if (!a.dead) prey2.push(a);
  const prey = prey2[0] || null;
  if (prey) {
    const stand = () => { // 2 m in front of prey along +z, facing it
      wolf.pos.x = prey.pos.x; wolf.pos.z = prey.pos.z - 2.0; wolf.pos.y = prey.pos.y;
      wolf.yaw = Math.atan2(prey.pos.x - wolf.pos.x, prey.pos.z - wolf.pos.z);
    };
    stand();
    const hp0 = prey.hp, meat0 = inv.meat, pelt0 = inv.pelt || 0, bone0 = inv.bone || 0;
    R.firstHit = wolf.attack();
    R.atkCdSet = wolf.atkCd > 0.5;
    R.cooldownBlocks = wolf.attack() === false;
    R.hpDropped = prey.hp <= hp0 - 1;   // ambush bonus: unaware prey takes 2
    // burn cooldown, then kill it (prey is knocked back / flees — re-approach each swing)
    let guard = 0;
    while (!prey.dead && guard++ < 20) { wolf.atkCd = 0; stand(); wolf.attack(); }
    R.killed = prey.dead;
    R.reward = { meat: inv.meat - meat0, pelt: (inv.pelt || 0) - pelt0, bone: (inv.bone || 0) - bone0 };
    R.rewardMatches = (inv.meat - meat0) === prey.sp.meat && (inv.pelt || 0) - pelt0 === (prey.sp.pelt || 0) && (inv.bone || 0) - bone0 === (prey.sp.bone || 0);
    wolf.atkCd = 0;
  }

  // --- 5. KeyF input wiring ---
  R.fKey = typeof keys.KeyF !== 'undefined' || true; // presence of handler checked below
  wolf.atkCd = 0;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
  R.fWired = wolf.atkCd > 0;
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF' }));

  // --- 6. flight via magic mushroom gather ---
  const FDT = 1 / 30;
  const inp = { f: false, b: false, l: false, r: false, sprint: false, jump: false, mx: 0, my: 0 };
  const flyInput = Object.assign({}, inp, { f: true, jump: true });
  // gather path sets flyT=10; do the same, then verify update() takes the flight branch
  wolf.flyT = 10;
  wolf.update(FDT, inp, camYaw + Math.PI, camPitch);
  R.flightStarts = wolf.flyT > 9 && wolf.grounded === false;
  // climb for 2 s: hold forward + jump
  const groundY = heightAt(wolf.pos.x, wolf.pos.z);
  let peak = 0;
  for (let i = 0; i < 60; i++) { wolf.update(FDT, flyInput, camYaw + Math.PI, camPitch); wolf.animate(FDT); peak = Math.max(peak, wolf.pos.y - heightAt(wolf.pos.x, wolf.pos.z)); }
  R.climbs = peak > 3;
  R.flySpeed = +wolf.speed.toFixed(1);
  R.fastInAir = wolf.speed > 14; // target 18
  R.stamRegenFlying = wolf.stamina > 90; // +22/s while flying
  updateHUD(0.05);
  R.flyTimerShown = document.getElementById('flyTimer').style.display !== 'none' && document.getElementById('flyTimer').textContent.includes('Flight');
  // expire: no input, let gravity land the wolf
  wolf.flyT = 0.01;
  let guard2 = 0;
  while (wolf.grounded !== true && guard2++ < 300) { wolf.update(FDT, inp, camYaw + Math.PI, camPitch); wolf.animate(FDT); }
  R.landsAfterExpiry = wolf.grounded === true;
  updateHUD(0.05);
  R.flyTimerHiddenAfter = document.getElementById('flyTimer').style.display === 'none';
  R.flyTZero = wolf.flyT <= 0;

  // --- 7. magic mushrooms exist in world (scan loaded chunks) ---
  let shrooms = 0, totalPk = 0;
  for (const ch of chunks.values()) { for (const p of ch.pickups) { totalPk++; if (p.type === 'magicShroom' && !p.gathered) shrooms++; } }
  R.pickupsLoaded = totalPk;
  R.magicShroomsNearby = shrooms; // may be 0 at this exact spot — informational

  // --- 8. audio methods exist ---
  R.audioFns = { snap: typeof audio.snap, chime: typeof audio.chime };
  return R;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.slice(0, 3).join(' | ') : 'none');
await browser.close();
const fails = [];
if (!R.tAttack || !R.flyTimerEl) fails.push('missing DOM');
if (!R.rabbitEasy || !R.elkHard) fails.push('tiers wrong');
if (R.noContactCatch === false) fails.push('contact auto-catch still active');
if (R.firstHit !== true || R.hpDropped !== true || R.killed !== true || R.rewardMatches !== true) fails.push('attack broken');
if (R.fWired !== true) fails.push('KeyF unwired');
if (R.flightStarts !== true || R.climbs !== true || R.flyTimerShown !== true || R.flyTZero !== true || R.landsAfterExpiry !== true || R.fastInAir !== true) fails.push('flight broken');
if (R.audioFns.snap !== 'function' || R.audioFns.chime !== 'function') fails.push('audio missing');
if (fails.length) { console.log('FEATURE FAIL:', fails.join(', ')); process.exit(1); }
console.log('FEATURE TEST PASS');
