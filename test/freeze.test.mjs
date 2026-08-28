// The freeze bug: a meteor site (landmark type outside the LANDMARKS table)
// crashed the minimap draw → the main loop died → total freeze.
import { chromium } from 'playwright';

const results = [];
const ck = (name, ok, extra = '') => { results.push([name, !!ok]); console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///home/user/index.html?autostart=1&seed=3141&quality=low');
  await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
  await page.waitForTimeout(1000);

  // ---- the exact scenario: a meteor site lands beside the player ----
  const before = await page.evaluate(() => ({ t: tSec, fps: perfN }));
  await page.evaluate(() => makeMeteorSite(wolf.pos.x + 30, wolf.pos.z + 25));
  await page.waitForTimeout(1800);   // many frames with the meteor on the minimap
  const after = await page.evaluate(() => ({
    t: tSec, frames: perfN,
    banner: document.getElementById('err').style.display,
    bannerText: document.getElementById('err').textContent,
    meteor: landmarkList.some(l => l.type === 'meteor')
  }));
  ck('meteor site exists beside the player', after.meteor);
  ck('minimap draws it without throwing', after.banner !== 'block', after.bannerText || 'no banner');
  ck('loop alive: time advanced', after.t > before.t, `tSec ${before.t.toFixed(1)} → ${after.t.toFixed(1)}`);
  ck('loop alive: frames rendered', after.frames > before.fps, `frames ${before.fps} → ${after.frames}`);
  ck('zero page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  // ---- big map too: landmark labels on the wide view ----
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(1200);
  const big = await page.evaluate(() => ({ open: BIG.open, banner: document.getElementById('err').style.display }));
  ck('big map draws the meteor without throwing', big.open && big.banner !== 'block');
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(400);

  // ---- resilience: even a genuine error must not freeze the game ----
  await page.evaluate(() => { audio.init(); audio.resume(); });   // ambience (incl. setWater) runs once audio exists
  await page.waitForTimeout(400);
  const alive = await page.evaluate(async () => {
    const t0 = tSec, f0 = perfN;
    let threw = false; const calls = { n: 0 };
    const orig = audio.setWater;
    audio.setWater = (...a) => {           // one frame hiccups, the rest are fine
      calls.n++;
      if (!threw) { threw = true; throw new Error('synthetic hiccup'); }
      return orig(...a);
    };
    await new Promise(r => setTimeout(r, 1500));
    audio.setWater = orig;
    return { calls: calls.n, advanced: tSec > t0 + 0.05, frames: perfN > f0 + 2, banner: document.getElementById('err').style.display, text: document.getElementById('err').textContent };
  });
  ck('a thrown error does NOT freeze the game', alive.calls > 0 && alive.advanced && alive.frames, `setWater×${alive.calls}, loop kept running`);
  ck('error is bannered as recovering', alive.banner === 'block' && /recovering/.test(alive.text), alive.text.slice(0, 50));

  // ---- and the banner heals itself ----
  await page.waitForFunction(() => document.getElementById('err').style.display !== 'block', null, { timeout: 15000 });
  ck('banner clears after recovery', true);

  ck('still zero page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
const fails = results.filter(r => !r[1]).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
