import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 } });
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1200);
console.log(JSON.stringify(await pg.evaluate(async () => {
  const orb = document.getElementById('mmOrbit');
  const rules = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    let rs; try { rs = document.styleSheets[i].cssRules; } catch (e) { continue; }
    for (const r of rs) {
      const txt = r.cssText || '';
      if (txt.includes('mmOrbit') && txt.includes('opacity')) rules.push(txt.slice(0, 110));
      if (r.cssRules) for (const r2 of r.cssRules) { const t2 = r2.cssText || ''; if (t2.includes('mmOrbit') && t2.includes('opacity')) rules.push('(mq) ' + t2.slice(0, 110)); }
    }
  }
  orb.classList.add('wake');
  await new Promise(r => setTimeout(r, 450));
  const afterClass = getComputedStyle(orb).opacity;
  orb.style.opacity = '1';
  await new Promise(r => setTimeout(r, 400));
  const afterInline = getComputedStyle(orb).opacity;
  return { rules, afterClass, afterInline };
})));
await b.close();
