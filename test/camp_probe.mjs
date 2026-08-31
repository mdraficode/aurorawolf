import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const url = pathToFileURL('/home/user/index.html').href + '?autostart=1&seed=4242&quality=low';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
pg.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
pg.on('console', m => { if (m.type() === 'error' && !/favicon|Autoplay|AudioContext/i.test(m.text())) errs.push('con: ' + m.text().slice(0, 140)); });
try {
  await pg.goto(url, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play' && window.CAMP, null, { timeout: 90000 });
  await pg.waitForTimeout(2500);
  const r = await pg.evaluate(() => {
    const C = window.CAMP.state();
    return {
      camp: !!window.CAMP, tier: C.tier, leg: C.leg, stage: C.stage, name: C.name,
      avail: QUESTS.avail.length, active: QUESTS.active.length,
      titles: QUESTS.avail.map(q => q.title + ' [' + q.kind + ']').slice(0, 5),
      hud: document.getElementById('questTracker') ? document.getElementById('questTracker').textContent.slice(0, 140) : '-'
    };
  });
  console.log('BOOT:', JSON.stringify(r, null, 1));
  // accept the first choice, then verify one-active rule
  const a = await pg.evaluate(() => {
    const id = QUESTS.avail[0] ? QUESTS.avail[0].id : null;
    if (id) acceptQuest(id);
    const after1 = { active: QUESTS.active.length, avail: QUESTS.avail.length, t: QUESTS.active[0] ? QUESTS.active[0].title : '-' };
    const id2 = null;
    try { acceptQuest('bogus'); } catch (e) { }
    return { after1 };
  });
  console.log('ACCEPT:', JSON.stringify(a));
  const k = await pg.evaluate(() => {
    // fake a kill matching the quest
    const q = QUESTS.active[0];
    if (!q) return { skip: 'no active' };
    if (q.kind === 'hunt') questEvent('kill', { species: q.species, pos: { x: wolf.pos.x, z: wolf.pos.z } });
    else if (q.kind === 'combat') questEvent('kill', { species: 'predator', pos: { x: wolf.pos.x, z: wolf.pos.z } });
    else if (q.kind === 'collect') questEvent('gather', { item: q.item });
    else if (q.kind === 'survive') { q.have = q.need; completeQuest(q); }
    else if (q.kind === 'explore') { q.have = 1; completeQuest(q); }
    return { kind: q.kind, stageAfter: window.CAMP.state().stage, have: q.have || 0 };
  });
  await pg.waitForTimeout(900);
  const k2 = await pg.evaluate(() => ({ stage: window.CAMP.state().stage, avail: QUESTS.avail.length, active: QUESTS.active.length, titles: QUESTS.avail.map(q => q.title).slice(0, 5) }));
  console.log('COMPLETE:', JSON.stringify(k), '->', JSON.stringify(k2));
  console.log('ERRS:', errs.length ? errs.slice(0, 5) : 'none');
} catch (e) { console.log('PROBE CRASH:', String(e.message).slice(0, 300)); console.log('ERRS:', errs.slice(0, 6)); }
await b.close();
