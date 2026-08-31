import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=1234&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(async () => {
  const out = {};
  // the first touch wakes everything
  dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  audio.resume();
  out.ctxState = audio.ctx.state;
  for (let i = 0; i < 240; i++) music.update(1 / 30);   // ~8 s of score
  await new Promise(r => setTimeout(r, 300));
  out.bus = +music.bus.gain.value.toFixed(2);
  out.layers = Object.fromEntries(Object.entries(music.layers).map(([k2, g]) => [k2, +g.gain.value.toFixed(3)]));
  out.scheduling = music.nextBeat > audio.ctx.currentTime;   // notes queued ahead = actually playing
  out.bpm = Math.round(music.bpm);
  // pad loudness now vs the old mix (0.3 bus, 0.16 vol, layer .378): audibility ×~4.5
  out.padPeak = +(0.24 * music.layers.pad.gain.value * music.bus.gain.value * 0.55).toFixed(4);
  // hiss beds in fair weather
  audio.setForest(1, 0.3); audio.setAmbient(0.3, 0); audio.setWater(0.3, 0.5);
  await new Promise(r => setTimeout(r, 200));
  out.bedsFair = { leaf: +audio.leafG.gain.value.toFixed(4), wind: +audio.windG.gain.value.toFixed(4), river: +audio.riverG.gain.value.toFixed(3), shore: +audio.shoreG.gain.value.toFixed(4) };
  // storm: leaves may whisper again
  audio.setForest(1, 0.95);
  await new Promise(r => setTimeout(r, 200));
  out.leafStorm = +audio.leafG.gain.value.toFixed(4);
  return out;
});
console.log('MUSIC ' + JSON.stringify({ ...R, errs }));
await b.close();
