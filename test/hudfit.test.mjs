/* HUD FIT — every round HUD button must keep its text/shape ink inside the button circle.
   Layouts: phone portrait (touch), small landscape (touch), desktop (no touch). */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
let fails = 0;

const audit = () => {
  const out = [];
  for (const el of document.querySelectorAll('#btns .tbtn, #mmOrbit button, #tPause, #fsBtn, .statIco')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || getComputedStyle(el).display === 'none') continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const rad = Math.min(r.width, r.height) / 2 - 2;
    const rects = [];
    const walk = n => {
      if (n.nodeType === 3) { if (n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const rr of rg.getClientRects()) if (rr.width && rr.height) rects.push(rr); } }
      else for (const c of n.childNodes) walk(c);
    };
    walk(el);
    let worst = 0;
    for (const rr of rects) for (const [px, py] of [[rr.left, rr.top], [rr.right, rr.top], [rr.left, rr.bottom], [rr.right, rr.bottom]])
      worst = Math.max(worst, Math.hypot(px - cx, py - cy));
    out.push({ id: el.id || el.className, w: Math.round(r.width), over: +(worst - rad).toFixed(1) });
  }
  return out;
};

const run = async (w, h, label, touch) => {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto(pathToFileURL('/home/user/index.html').href + '?seed=7&quality=low&autostart=1', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP, null, { timeout: 90000 });
  await pg.waitForTimeout(2500);
  await pg.evaluate(t => { if (t) document.body.classList.add('touch'); document.getElementById('btns') && document.getElementById('btns').classList.add('wake'); }, touch);
  await pg.waitForTimeout(400);
  const rows = await pg.evaluate(audit);
  console.log(`\n=== ${label} (${w}x${h}, ${touch ? 'touch' : 'desktop'}) ===`);
  let bad = 0;
  for (const r of rows) {
    const ok = r.over <= 0.5;
    if (!ok) bad++;
    console.log(`  ${ok ? '✓' : '✗'} ${r.id.padEnd(12)} ${String(r.w).padStart(3)}px  overflow ${r.over > 0 ? '+' : ''}${r.over}px ${ok ? '' : '  ← OUTSIDE THE CIRCLE'}`);
  }
  if (bad) fails++;
  await pg.close();
};

await run(420, 800, 'PHONE PORTRAIT', true);
await run(740, 360, 'PHONE LANDSCAPE (small)', true);
await run(1280, 800, 'DESKTOP', false);
await b.close();
if (fails) { console.log(`HUD FIT FAIL (${fails} layout/s)`); process.exit(1); }
console.log('\nHUD FIT PASS');
