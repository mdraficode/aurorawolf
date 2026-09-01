import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 400 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=5150&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);

// ---- BUG 1: is the music PHYSICALLY audible now? (analyser on master) ----
const AUD = await pg.evaluate(async () => {
  dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  audio.init(); audio.resume();
  const an = audio.ctx.createAnalyser(); an.fftSize = 512;
  audio.master.connect(an);
  const buf = new Uint8Array(an.fftSize);
  const read = () => { an.getByteTimeDomainData(buf); return buf.reduce((s, v) => s + Math.abs(v - 128), 0) / buf.length; };
  const before = read();   // engine warm, score starting
  for (let i = 0; i < 200; i++) music.update(1 / 30);   // schedule & let ctx clock run
  await new Promise(r => setTimeout(r, 2500));          // a bar of real playback
  const during = read();
  music.bus.gain.value = 0;                              // mute score →
  await new Promise(r => setTimeout(r, 700));
  const after = read();
  return { before: +before.toFixed(2), during: +during.toFixed(2), after: +after.toFixed(2), audible: during > after * 1.5 && during > 0.3 };
});
console.log('AUDIBILITY ' + JSON.stringify(AUD));

// ---- BUG 2: dead-zone grid — where on the right side does a touch NOT become a camera finger? ----
const GRID = await pg.evaluate(() => {
  const cv = renderer.domElement, dead = [];
  for (let fx = 0.42; fx <= 0.97; fx += 0.055)
    for (let fy = 0.08; fy <= 0.94; fy += 0.06) {
      const x = Math.round(innerWidth * fx), y = Math.round(innerHeight * fy);
      const id = 1000 + fx * 100 + fy * 10;
      camPointers.clear();
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
      const claimed = camPointers.has(id);
      dispatchEvent(new PointerEvent('pointerup', { pointerId: id, bubbles: true }));
      if (!claimed) {
        const el = document.elementFromPoint(x, y);
        dead.push({ x, y, el: el ? (el.id || el.tagName + '.' + (el.className || '').toString().slice(0, 24)) : '?', pe: el ? getComputedStyle(el).pointerEvents : '?' });
      }
    }
  camPointers.clear();
  const tally = {};
  for (const d of dead) tally[d.el] = (tally[d.el] || 0) + 1;
  return { deadN: dead.length, tally, sample: dead.slice(0, 8) };
});
console.log('DEADZONE ' + JSON.stringify(GRID));
console.log('ERRS ' + JSON.stringify(errs));
await b.close();
