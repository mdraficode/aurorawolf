import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 700, height: 400 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=4242&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(() => {
  const out = {};
  const tab = document.querySelector('.qtab[data-t="avail"]');
  out.tabExists = !!tab;
  const r = tab.getBoundingClientRect();
  out.tabRect = { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) };
  document.getElementById('questBtn').click();   // open log (DOM click, no hit-test)
  tab.click();                                    // DOM click on the tab
  out.tabAfterDomClick = questTab;
  out.cardsAvail = document.querySelectorAll('#questList .qcard').length;
  // who is on top at the tab's center? (hit-test truth)
  const el2 = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  out.topAtTab = el2 ? (el2.className || el2.id || el2.tagName) + ' pe=' + getComputedStyle(el2).pointerEvents : '?';
  out.logCls = document.getElementById('questLog').className;
  return out;
});
console.log(JSON.stringify(R));
await b.close();
