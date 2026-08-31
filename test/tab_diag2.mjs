import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 700, height: 400 } });
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=4242&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
await pg.click('#questBtn');
await pg.waitForTimeout(800);
const R = await pg.evaluate(() => {
  const tab = document.querySelector('.qtab[data-t="avail"]');
  const r = tab.getBoundingClientRect();
  const el2 = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { logCls: document.getElementById('questLog').className, rect: { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) },
    top: el2 ? String(el2.className || el2.id || el2.tagName) + ' pe=' + getComputedStyle(el2).pointerEvents + ' z=' + getComputedStyle(el2).zIndex : '?',
    tabZ: getComputedStyle(tab).zIndex, logZ: getComputedStyle(document.getElementById('questLog')).zIndex };
});
console.log(JSON.stringify(R));
// now the REAL playwright click:
await pg.click('.qtab[data-t="avail"]').catch(e => console.log('click-err', e.message.split('\n')[0]));
await pg.waitForTimeout(500);
console.log('after page.click:', await pg.evaluate(() => questTab));
await b.close();
