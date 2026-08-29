import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1200);
await pg.evaluate(() => document.body.classList.add('touch'));
await pg.waitForTimeout(400);
console.log(JSON.stringify(await pg.evaluate(() => {
  const m = document.getElementById('minimap');
  const cs = getComputedStyle(m);
  return { rect: [m.getBoundingClientRect().width, m.getBoundingClientRect().height].map(v => +v.toFixed(0)),
    csW: cs.width, csH: cs.height, display: cs.display, vis: cs.visibility,
    attr: m.width + 'x' + m.height, parent: m.parentElement.id, match: (() => { let mm = []; for (let i = 0; i < document.styleSheets.length; i++) try { for (const r of document.styleSheets[i].cssRules) if (r.media && matchMedia(r.media.mediaText).matches) mm.push(r.media.mediaText); } catch (e) { } return [...new Set(mm)]; })() };
})));
await b.close();
