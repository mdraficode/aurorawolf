import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const R = {};
const mctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const mp = await mctx.newPage();
const merrs = [];
mp.on('pageerror', e => merrs.push('M: ' + e.message));
await mp.goto('file:///home/user/index.html?autostart=1&seed=1337&quality=low');
await mp.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 40000 });
await mp.waitForTimeout(700);
R.swarmsGone = await mp.evaluate(() => typeof butterflies === 'undefined' && typeof fireflies === 'undefined');
R.layout = await mp.evaluate(() => {
  const box = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const ov = (a, b) => !(a.r < b.l || b.r < a.l || a.b < b.t || b.b < a.t);
  const joy = box('joy'), btns = box('btns'), stam = box('stamWrap'), inv = box('inv'), top = box('topbar'), prompt = box('prompt'), pause = box('tPause'), stats = box('topStats');
  return {
    stamAtTop: stam.t < 100,
    invTopLeft: inv.t < 130 && inv.l < 60,
    joyVsInv: ov(joy, inv), joyVsStam: ov(joy, stam), btnsVsInv: ov(btns, inv), btnsVsStam: ov(btns, stam),
    topbarVsInv: ov(top, inv), pauseVsStats: !stats || ov(pause, stats), promptInFreeSpace: !ov(prompt, joy) && !ov(prompt, btns),
    invBottom: inv.b, joyTop: joy.t, screenH: innerHeight
  };
});
await mp.screenshot({ path: 'shots/16_mobile_layout.png' });
R.errors = merrs;
console.log(JSON.stringify(R, null, 1));
await browser.close();
