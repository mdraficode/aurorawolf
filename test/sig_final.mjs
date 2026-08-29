import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=2718&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
const R = await pg.evaluate(async () => {
  const out = {};
  dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  audio.init(); audio.resume(); music.update(0.05);
  const orig = music.v.bind(music); window.__gn = [];
  music.v = (...a) => { if (a[0] === 'guitar') window.__gn.push(+a[1].toFixed(0)); return orig(...a); };
  const an = audio.ctx.createAnalyser(); an.fftSize = 1024; audio.master.connect(an);
  const f32 = new Float32Array(an.fftSize);
  const peak = () => { an.getFloatTimeDomainData(f32); let m = 0; for (const v of f32) m = Math.max(m, Math.abs(v)); return +m.toFixed(3); };
  // wait until the F-drone phrase arrives (beat 32 ≈ 44 s) — the tune plays itself via tick
  const t0 = performance.now();
  while (!window.__gn.includes(98) && performance.now() - t0 < 70000) await new Promise(r => setTimeout(r, 1000));
  out.phraseNotes = [...new Set(window.__gn)];
  out.gotFturn = window.__gn.includes(98);
  out.peakDuring = peak();
  music.bus.gain.value = 0; await new Promise(r => setTimeout(r, 900));
  out.peakMuted = peak();
  music.bus.gain.value = 0.85;
  // the arrow — wait for a guidable quest
  const tq = performance.now();
  while (!(window.questGuide && window.questGuide()) && performance.now() - tq < 45000) await new Promise(r => setTimeout(r, 800));
  const qg = window.questGuide();
  let mesh = null; scene.traverse(o => { if (o.geometry && o.geometry.attributes && o.geometry.attributes.position && o.geometry.attributes.position.count === 9 && o.material && o.material.transparent) mesh = o; });
  out.arrow = qg && mesh ? { scaleZ: mesh.scale.z, depthTest: mesh.material.depthTest, order: mesh.renderOrder, visible: mesh.visible, opacity: mesh.material.opacity } : null;
  out.guide = qg ? qg.kind + ' ' + qg.d.toFixed(0) + 'm' : 'none';
  return out;
});
console.log('SIGFINAL ' + JSON.stringify({ ...R, errs }));
await b.close();
