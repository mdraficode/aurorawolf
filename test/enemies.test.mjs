import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('file:///home/user/index.html?autostart=1&seed=1337');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
await page.waitForTimeout(1200);
const R = await page.evaluate(() => {
  const R = {}; const dt = 1 / 30;
  // 1. prey bigger
  R.preyScale = { rabbit: SPECIES.rabbit.scale, elk: SPECIES.elk.scale, goat: SPECIES.goat.scale };
  R.preyBigger = SPECIES.rabbit.scale >= 0.55 && SPECIES.elk.scale >= 1.55 && SPECIES.goat.scale >= 1.1;
  // predators defined
  R.defs = { bear: PREDATORS.bear.hp, tiger: PREDATORS.tiger.hp, snowLeopard: PREDATORS.snowLeopard.hp };
  // 2. spawned in world naturally?
  let wild = 0; for (const ch of chunks.values()) wild += ch.predators.length;
  R.wildPredators = wild;
  // 3. force a bear next to us (registered into the local chunk, like real spawns)
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  const homeChunk = chunks.get(ck(ccx, ccz));
  const bear = new Predator('bear', wolf.pos.x + 24, wolf.pos.z);
  homeChunk.predators.push(bear);
  R.bearState0 = bear.state;
  // player steps into territory → warning
  bear.update(dt, tSec);
  R.warnState = bear.state;
  R.bannerShown = document.getElementById('threatWarn').style.display === 'block';
  R.bannerText = document.getElementById('threatWarn').textContent.slice(0, 46);
  // 3-second warning elapses → chase
  for (let i = 0; i < 95; i++) bear.update(dt, tSec + i * dt);
  R.chaseState = bear.state;
  R.bearDistShrinking = bear.pos.distanceTo(wolf.pos) < 24;
  // screen-forward is camYaw + PI: camera faces the threat when camYaw = angle - PI
  const tAng = Math.atan2(bear.pos.x - wolf.pos.x, bear.pos.z - wolf.pos.z);
  camYaw = tAng - Math.PI;
  updateHUD(dt);
  const ta = document.getElementById('threatArrow');
  R.arrowShown = ta.style.display === 'block';
  const m = /rotate\((-?[\d.]+)deg\)/.exec(ta.style.transform);
  R.arrowDegAhead = m ? Math.abs(parseFloat(m[1])) < 2 : null;
  // arrow flips when threat is behind the camera
  camYaw = tAng; updateHUD(dt);
  const m2 = /rotate\((-?[\d.]+)deg\)/.exec(ta.style.transform);
  R.arrowDegBehind = m2 ? Math.abs(Math.abs(parseFloat(m2[1])) - 180) < 2 : null;
  // side check: threat to the camera's right → +90°
  camYaw = tAng - Math.PI / 2 - Math.PI; updateHUD(dt);
  const m3 = /rotate\((-?[\d.]+)deg\)/.exec(ta.style.transform);
  R.arrowDegRight = m3 ? Math.abs(Math.abs(parseFloat(m3[1])) - 90) < 2 : null;
  // 4. damage: put bear adjacent, force bite
  wolf.hp = 100; wolf.invulnT = 0;
  bear.pos.x = wolf.pos.x + 2.5; bear.pos.z = wolf.pos.z; bear.pos.y = heightAt(bear.pos.x, bear.pos.z);
  bear.atkCd = 0; bear.state = 'attack'; bear.flinchT = 0;
  bear.update(dt, tSec);
  R.tookDamage = wolf.hp < 100;
  updateHUD(dt);
  R.hpBarReflects = parseFloat(document.getElementById('hpFill').style.width) < 100;
  R.vignetteFlash = parseFloat(document.getElementById('vignette').style.opacity) > 0;
  // 5. death & respawn
  wolf.hp = 8; wolf.invulnT = 0; bear.atkCd = 0; bear.state = 'attack'; bear.flinchT = 0;
  bear.update(dt, tSec);
  R.died = wolf.deadT > 0;
  R.deathOverlay = document.getElementById('deathOv').classList.contains('show');
  wolfRespawn();
  R.respawned = wolf.hp === 100 && wolf.invulnT > 0 && !document.getElementById('deathOv').classList.contains('show');
  // 6. fight back & kill (bear hp 8)
  const meat0 = inv.meat, pelt0 = inv.pelt, bone0 = inv.bone, slain0 = stats.slain;
  let guard = 0;
  while (!bear.dead && guard++ < 40) {
    wolf.pos.x = bear.pos.x; wolf.pos.z = bear.pos.z - 2.0; wolf.pos.y = bear.pos.y;
    wolf.yaw = Math.atan2(bear.pos.x - wolf.pos.x, bear.pos.z - wolf.pos.z);
    wolf.atkCd = 0; bear.flinchT = 0;
    wolf.attack();
  }
  R.bearDead = bear.dead;
  R.killReward = { meat: inv.meat - meat0, pelt: inv.pelt - pelt0, bone: inv.bone - bone0, slain: stats.slain - slain0 };
  // 7. escape → gives up
  const tiger = new Predator('tiger', wolf.pos.x + 200, wolf.pos.z);
  tiger.state = 'chase';
  tiger.update(dt, tSec); // home is 200m away → immediately returns
  R.returnsHome = tiger.state === 'return' || tiger.state === 'lurk';
  // 8. audio
  R.audio = { growl: typeof audio.growl, thud: typeof audio.thud };
  tiger.dispose();
  if (!bear.dead) { homeChunk.predators.length = 0; bear.dispose(); }
  return R;
});
console.log(JSON.stringify(R, null, 1));
console.log('pageerrors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
const F = [];
if (!R.preyBigger) F.push('prey scale');
if (R.defs.bear !== 8 || R.defs.tiger !== 6 || R.defs.snowLeopard !== 5) F.push('predator defs');
if (R.warnState !== 'warn' || !R.bannerShown) F.push('warning');
if (R.chaseState !== 'chase') F.push('chase');
if (!R.arrowShown || !R.arrowDegAhead || !R.arrowDegBehind || !R.arrowDegRight) F.push('threat arrow');
if (!R.tookDamage || !R.vignetteFlash) F.push('damage');
if (!R.died || !R.deathOverlay || !R.respawned) F.push('death/respawn');
if (!R.bearDead || R.killReward.meat !== 6 || R.killReward.pelt !== 2 || R.killReward.bone !== 3 || R.killReward.slain !== 1) F.push('kill/rewards');
if (!R.returnsHome) F.push('escape');
if (R.audio.growl !== 'function' || R.audio.thud !== 'function') F.push('audio');
if (F.length) { console.log('ENEMY FAIL:', F.join(', ')); process.exit(1); }
console.log('ENEMY TEST PASS');
