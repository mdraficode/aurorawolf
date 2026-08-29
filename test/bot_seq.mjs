import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 500, height: 320 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file:///home/user/index.html?autostart=1&seed=5555&quality=low&autopilot=1', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(2500);
const R = await pg.evaluate(async () => {
  const out = { sizes: [], maxActive: 0, abandons: 0, accepts: 0 };
  const spy = [];   // count abandon/accept via BOTLOG types
  const pollGuard = setInterval(() => {   // continuous invariant policing
    out.maxActive = Math.max(out.maxActive, QUESTS.active.length);
    for (const e of (window.BOTLOG || [])) if (!e.__c) { e.__c = 1; if (e.type === 'quest-abandonQuest') out.abandons++; if (e.type === 'quest-acceptQuest') out.accepts++; }
  }, 120);
  const waitAccept = async (prevId, ms) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      const st = window.__botQuest();
      if (st.activeN === 1 && st.questId && st.questId !== prevId) return st;
      await new Promise(r => setTimeout(r, 120));
    }
    return null;
  };
  // PART A — drive the cycle: 7 acceptances
  let prev = null;
  for (let k = 0; k < 7; k++) {
    const st = await waitAccept(prev, 12000);
    if (!st) { out.sizes.push('TIMEOUT'); break; }
    out.sizes.push(st.size + ':' + st.step + '/' + st.of);
    prev = st.questId;
    completeQuest(QUESTS.active[0]);   // the deed is finished — the game's own completion path
    await new Promise(r => setTimeout(r, 700));
  }
  out.accepts -= out.abandons;   // net
  // PART B — 100 s natural window: no touching anything
  const t0 = performance.now();
  while (performance.now() - t0 < 100000) await new Promise(r => setTimeout(r, 500));
  clearInterval(pollGuard);
  out.finalState = window.__botQuest();
  out.botLogN = (window.BOTLOG || []).length;
  return out;
});
console.log('SEQ ' + JSON.stringify({ ...R, errs }));
await b.close();
