import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
await pg.goto('file:///home/user/index.html?autostart=1&seed=2718&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(6000);
const R = await pg.evaluate(async () => {
  dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  audio.init(); audio.resume();
  await new Promise(r => setTimeout(r, 3000));
  const beds = {}; for (const k of ['windG','rainG','leafG','shoreG','rumbleG','roarG','riverG','fireG']) beds[k] = +(audio[k] ? audio[k].gain.value : -1).toFixed(3);
  const an = audio.ctx.createAnalyser(); an.fftSize = 2048; audio.master.connect(an);
  const buf = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(buf);
  const mx = Math.max(...buf.map(Math.abs));
  // who's connected to master? (walk the graph)
  const fans = [];
  const seen = new Set();
  const walk = (node, depth) => { if (!node || seen.has(node) || depth > 4) return; seen.add(node); if (node._inputs) for (const c of node._inputs) { } };
  // simpler: mute each bed in turn and measure
  const results = {};
  const amp = () => { an.getFloatTimeDomainData(buf); return +Math.max(...buf.map(Math.abs)).toFixed(3); };
  results.base = amp();
  for (const k of Object.keys(beds)) { if (!audio[k]) continue; const g0 = audio[k].gain.value; audio[k].gain.value = 0; await new Promise(r => setTimeout(r, 350)); results[k] = amp(); audio[k].gain.value = g0; }
  results.master = audio.master.gain.value;
  results.musicBus = music.bus ? music.bus.gain.value : -1;
  return { beds, results, peak: mx };
});
console.log(JSON.stringify(R));
await b.close();
