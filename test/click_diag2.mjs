import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 350 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=4242&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
try { await pg.click('#questBtn', { timeout: 6000 }); console.log('CLICK OK, log open:', await pg.evaluate(() => document.getElementById('questLog').classList.contains('show'))); }
catch (e) { console.log('CLICK FAIL:', e.message.split('\n')[0]); 
  const probe = await pg.evaluate(() => { const r = document.getElementById('questBtn').getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height].map(v => +v.toFixed(1)), dpr: devicePixelRatio, atCenter: (document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) || {}).id }; });
  console.log('state at fail:', JSON.stringify(probe)); }
await b.close();
