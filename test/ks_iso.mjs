import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 400, height: 260 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=99&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(1500);
const R = await pg.evaluate(async () => {
  dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  audio.init(); audio.resume();
  music.update(0.05);   // force init
  // silence everything else
  music.bus.gain.value = 0;
  for (const k in music.layers) music.layers[k].gain.value = 0;
  const an = audio.ctx.createAnalyser(); an.fftSize = 1024; audio.master.connect(an);
  const f32 = new Float32Array(an.fftSize);
  const peak = () => { an.getFloatTimeDomainData(f32); let m = 0; for (const v of f32) m = Math.max(m, Math.abs(v)); return +m.toFixed(3); };
  const out = { silence: peak() };
  // guitar alone, into the 'melody' layer, bus 0.85
  music.layers.melody.gain.value = 0.3; music.bus.gain.value = 0.85;
  let threw = null;
  try { music.v('guitar', 440, audio.ctx.currentTime + 0.05, 2.5, 0.13, 'melody'); } catch (e) { threw = e.message; }
  await new Promise(r => setTimeout(r, 700));
  out.guitar700ms = peak();
  await new Promise(r => setTimeout(r, 1500));
  out.guitar2200ms = peak();
  // strings pad for comparison
  try { music.v('strings', 220, audio.ctx.currentTime + 0.05, 2.5, 0.2, 'pad'); } catch (e) { threw = e.message; }
  await new Promise(r => setTimeout(r, 600));
  out.strings600ms = peak();
  return { ...out, threw };
});
console.log(JSON.stringify(R));
await b.close();
