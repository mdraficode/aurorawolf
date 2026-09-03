/* RIG PROBE — does aim(bearing) actually make the wolf RUN along that bearing?
   The 180° law: forward = camYaw + PI. Verifies drag → camYaw → wolf.yaw → travel. */
import { boot, sleep, bearingTo, wrapPI } from './human.mjs';

const S = await boot({ seed: 7777, speed: 8, rate: 3, re: 10, quality: 'low', poll: 85 });
const { page, human: H } = S;
const f1 = v => Math.round(v * 100) / 100;
const snap = () => page.evaluate(() => ({ cam: camYaw, yaw: wolf.yaw, x: wolf.pos.x, z: wolf.pos.z, spd: wolf.speed, stam: wolf.stamina | 0 }));

console.log('viewport', page.viewportSize());
console.log('what is under the crosshair?', await page.evaluate(() => {
  const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return el ? (el.id || el.tagName) + ' · closest(CAM_CTRL)=' + !!(el.closest && el.closest('#btns, .tbtn, #minimap, #bigmapWrap, #joyZone, #joy, #btnAI, #invBtn, #questBtn, #questLog, #invWrap, .btn, #toasts, #boot, #deathOv')) : 'none';
}));

for (const want of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7]) {
  const a = await snap();
  const d = await H.aim(want);
  const b = await snap();
  await H.move({ f: true, sprint: true });
  await sleep(900);
  const c = await snap();
  await H.move({});
  const travelled = Math.hypot(c.x - b.x, c.z - b.z);
  const moved = travelled > 1 ? bearingTo(b.x, b.z, c.x, c.z) : null;
  console.log(`want ${f1(want).toString().padStart(6)} · drag ${f1(d)} px-cam ${f1(a.cam)}→${f1(b.cam)} (want cam ${f1(want + Math.PI)}) · yaw ${f1(c.yaw)} · moved ${f1(travelled)}m along ${moved === null ? '—' : f1(moved)} · err ${moved === null ? '—' : f1(wrapPI(moved - want))} · stam ${a.stam}→${c.stam}`);
}
await S.browser.close();
