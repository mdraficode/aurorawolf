import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const R = {};
const errs = [];

// ---- mobile, PORTRAIT first ----
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('P: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('C: ' + m.text()); });
await page.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=1337&quality=low');
await page.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 40000 });
await page.waitForTimeout(900);
R.portrait = await page.evaluate(() => ({
  rotateGateShown: getComputedStyle(document.getElementById('rotate')).display === 'flex',
  autoPaused: state === 'pause',
  gateCovers: document.getElementById('rotate').getBoundingClientRect().height >= innerHeight - 2
}));
await page.screenshot({ path: 'shots/18_portrait_gate.png' });

// ---- rotate to LANDSCAPE ----
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(700);
R.afterRotate = await page.evaluate(() => ({
  rotateGateShown: getComputedStyle(document.getElementById('rotate')).display === 'flex',
  state,
  btnResumeThere: !!document.getElementById('btnResume')
}));
const r1 = await page.locator('#btnResume').boundingBox();
if (r1) await page.mouse.click(r1.x + r1.width / 2, r1.y + r1.height / 2);
await page.waitForTimeout(500);
R.resumedAfterRotate = await page.evaluate(() => state === 'play');

// joystick still works in landscape
const jb = await page.locator('#joy').boundingBox();
await page.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2);
await page.mouse.down();
await page.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2 - 44, { steps: 5 });
await page.waitForTimeout(900);
await page.mouse.up();
R.movedAfterResume = await page.evaluate(() => wolf.distance.toFixed(1));
await page.screenshot({ path: 'shots/19_landscape_play.png' });
await ctx.close();

// ---- desktop landscape MENU: row layout (title left / controls right) ----
const dpage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
dpage.on('pageerror', e => errs.push('D: ' + e.message));
await dpage.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?seed=42&quality=low');
await dpage.waitForFunction(() => { const b = document.getElementById('btnStart'); return b && !b.disabled; }, null, { timeout: 40000 });
await dpage.waitForTimeout(400);
R.menuLandscape = await dpage.evaluate(() => {
  const L = document.getElementById('ovLeft').getBoundingClientRect();
  const B = document.getElementById('ovBody').getBoundingClientRect();
  const C = document.querySelector('#ovBody .menu-center');
  const c = C ? C.getBoundingClientRect() : null;
  const rB = document.getElementById('btnRecord');
  const r = rB ? rB.getBoundingClientRect() : null;
  const vpCenter = innerWidth / 2;
  return {
    stacked: L.bottom <= B.top + 12,                                  // title sits ABOVE the menu — the start page is a centred column (not the old left/right split)
    menuCentered: !!c && Math.abs((c.left + c.width / 2) - vpCenter) < 80,  // the two main choices sit near the horizontal page centre
    recordOnRight: !!r && r.left > vpCenter + 100,                    // the side record (Highest Record) docks to the right of the screen
    recordVisible: !!r && r.width > 40,
    titleX: L.left | 0, bodyX: B.left | 0
  };
});
await dpage.screenshot({ path: 'shots/20_menu_landscape.png' });
// enterLandscape on desktop must NOT force fullscreen; Start Game reloads a fresh world + autostarts
await dpage.click('#btnNewGame');
await dpage.waitForTimeout(150);
await dpage.click('#ddNewStart');
await dpage.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 60000 });
R.desktopWindowed = await dpage.evaluate(() => !document.fullscreenElement);
R.desktopPlaying = await dpage.evaluate(() => state === 'play');

R.errors = errs;
console.log(JSON.stringify(R, null, 1));
await browser.close();
