/* ============================================================================
   🔬 AIM/MOTOR PROBE — does one poll of "aimFast + hold W" actually produce the
   commanded travel bearing, at fight cadence, on the fight's own terrain?
   ----------------------------------------------------------------------------
   Every fight law in this rig is built on one assumption: that setting the camera
   to `bearing + PI` makes the wolf RUN along `bearing`, and that its nose (yaw)
   eases onto that bearing fast enough to bite inside the 78.5° cone. The ring
   probe showed noses 0.5-1.0 rad away from the commanded angle, so this walks the
   chain link by link and prints each one:

     camBefore → (drag) → camAfter → command → yaw → actual travel bearing
     dCam   : what the drag did to the camera      (should be exactly the aim error)
     dYaw   : what the body did with it             (should converge on `command`)
     dGo    : where the feet actually went          (position delta over the poll)
     grade  : the terrain slope factor              (multiplies speed, not bearing)

   usage: node test/speedrun/_aim_fast_probe.mjs [--turn=0.35] [--polls=40]
   ============================================================================ */
import { boot, sleep, wrapPI, bearingTo } from './human.mjs';

const arg = (k, d) => { const m = new RegExp(`--${k}=([^\\s]+)`).exec(process.argv.join(' ')); return m ? m[1] : d; };
const TURN = +arg('turn', 0.35);      // rad the commanded bearing rotates per poll (the ring's rate)
const POLLS = +arg('polls', 40);
const SPRINT = arg('sprint', '0') === '1';

const S = await boot({ seed: '7777', speed: 2, rate: 4, re: 10, name: 'AIMFAST', quality: 'low' });
const { page, human: H } = S;
console.log(`\n🔬 aim/motor probe · command rotates ${TURN} rad/poll · sprint=${SPRINT ? 1 : 0}`);

/* flat ground, no company: nothing to blame but the aim and the motor */
await page.evaluate(() => {
  for (const ch of chunks.values()) { ch.animals.length = 0; ch.predators.length = 0; }
});

let cmd = await page.evaluate(() => wolf.yaw + Math.PI);   // start behind the wolf
let prev = null;
const rows = [];
for (let i = 0; i < POLLS; i++) {
  const st = await page.evaluate(() => ({ cam: camYaw, yaw: wolf.yaw, x: wolf.pos.x, z: wolf.pos.z, vd: viewDist, spd: wolf.speed, g: wolf.grounded }));
  cmd = wrapPI(cmd + TURN);
  await H.aimFast(cmd, st.cam);
  await H.move({ f: true, sprint: SPRINT });
  await sleep(60);
  const st2 = await page.evaluate(() => ({ cam: camYaw, yaw: wolf.yaw, x: wolf.pos.x, z: wolf.pos.z, spd: wolf.speed, exh: wolf.exhausted, stam: wolf.stamina }));
  const go = prev ? bearingTo(prev.x, prev.z, st2.x, st2.z) : null;
  const moved = prev ? Math.hypot(st2.x - prev.x, st2.z - prev.z) : 0;
  rows.push({
    i, dCam: +wrapPI(st2.cam - st.cam).toFixed(3), want: +wrapPI(cmd + Math.PI - st.cam).toFixed(3),
    camErr: +wrapPI(cmd + Math.PI - st2.cam).toFixed(3),
    yawErr: +wrapPI(cmd - st2.yaw).toFixed(3),
    goErr: go === null ? null : +wrapPI(cmd - go).toFixed(3),
    moved: +moved.toFixed(2), spd: +st2.spd.toFixed(2), vd: +st.vd.toFixed(2)
  });
  prev = { x: st2.x, z: st2.z };
}
await H.releaseAll();

console.log('  i  dCam    want   camErr  yawErr  goErr  moved  spd   viewDist');
for (const r of rows) console.log(`${String(r.i).padStart(3)} ${String(r.dCam).padStart(7)} ${String(r.want).padStart(7)} ${String(r.camErr).padStart(7)} ${String(r.yawErr).padStart(7)} ${r.goErr === null ? '      -' : String(r.goErr).padStart(7)} ${String(r.moved).padStart(6)} ${String(r.spd).padStart(6)} ${String(r.vd).padStart(6)}`);
const nz = rows.filter(r => r.goErr !== null && r.moved > 0.2);
const mean = k => nz.length ? +(nz.reduce((a, c) => a + Math.abs(c[k]), 0) / nz.length).toFixed(3) : null;
console.log(`\n  mean |camErr| ${mean('camErr')} · |yawErr| ${mean('yawErr')} · |goErr| ${mean('goErr')} rad over ${nz.length} moving polls`);
console.log(`  viewDist ${rows[0].vd} (sens = 0.0078·clamp(vd/8.5, .55, 1.5))`);
await S.browser.close();
process.exit(0);
