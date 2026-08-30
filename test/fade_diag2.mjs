import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 390 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=31337&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1200);
console.log(JSON.stringify(await pg.evaluate(async () => {
  const all = document.querySelectorAll('#mmOrbit');
  const orb = all[0];
  const chain = [];
  let n = orb;
  while (n && n !== document.body) { const cs = getComputedStyle(n); chain.push((n.id || n.className.toString().slice(0, 14) || n.tagName) + ':' + cs.opacity + '/' + cs.display); n = n.parentElement; }
  orb.classList.add('wake');
  document.body.offsetHeight;   // force reflow
  const immediate = getComputedStyle(orb).opacity;
  await new Promise(r => setTimeout(r, 500));
  return { dupCount: all.length, matches: orb.matches('#mmOrbit.wake'), chain, immediate, after500: getComputedStyle(orb).opacity, styleAttr: orb.getAttribute('style') };
})));
await b.close();
