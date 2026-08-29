import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(800);
console.log(JSON.stringify(await pg.evaluate(() => {
  const e = document.getElementById('btnAI');
  const cs = getComputedStyle(e);
  return { parent: e.parentElement.id || e.parentElement.tagName, display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
    rect: [e.getBoundingClientRect().left, e.getBoundingClientRect().top, e.getBoundingClientRect().width].map(v => +v.toFixed(0)),
    html5: !!document.getElementById('btnAI'), bodyCls: document.body.className };
})));
await b.close();
