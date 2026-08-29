import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=2718&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2000);
const R = await pg.evaluate(async () => {
  const out = {};
  dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  audio.init(); audio.resume();
  // capture every guitar note the scheduler fires
  const orig = music.v.bind(music); const notes = [];
  music.v = (...a) => { if (a[0] === 'guitar') notes.push(+a[1].toFixed(1)); return orig(...a); };
  const an = audio.ctx.createAnalyser(); an.fftSize = 512; audio.master.connect(an);
  const buf = new Uint8Array(an.fftSize);
  const amp = () => { an.getByteTimeDomainData(buf); return +(buf.reduce((s, v) => s + Math.abs(v - 128), 0) / buf.length).toFixed(2); };
  for (let i = 0; i < 900; i++) music.update(1 / 30);   // ~30 s ≈ 22 beats… enough for first phrases
  await new Promise(r => setTimeout(r, 2500));
  out.during = amp();
  music.bus.gain.value = 0; await new Promise(r => setTimeout(r, 800));
  out.muted = amp();
  music.bus.gain.value = 0.85;
  out.guitarNotes = notes.slice(0, 14);
  out.hasMelodyA = notes.includes(440);                       // A4 — the tune's home note
  out.hasDroneA2 = notes.includes(110);                       // low A drone
  out.hasDroneF = notes.includes(98);                         // the F turn under the B phrase (440·2^−27/12 ≈ 98.0)
  out.sigLen = music.sigLen;
  // arrow: longer + sees through the world
  const qg = window.questGuide();
  let mesh = null; scene.traverse(o => { if (o.geometry && o.geometry.attributes && o.geometry.attributes.position && o.geometry.attributes.position.count === 9 && o.material && o.material.transparent) mesh = o; });
  out.arrow = qg && mesh ? { scaleZ: mesh.scale.z, depthTest: mesh.material.depthTest, renderOrder: mesh.renderOrder, visible: mesh.visible } : null;
  out.guide = qg ? qg.kind + ' ' + qg.d.toFixed(0) + 'm' : 'none';
  return out;
});
console.log('SIG ' + JSON.stringify({ ...R, errs }));
await b.close();
