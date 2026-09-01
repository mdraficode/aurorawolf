import { pathToFileURL, fileURLToPath } from 'url';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 700, height: 400 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autostart=1&seed=777&quality=low', { timeout: 90000, waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
await pg.waitForTimeout(4000);
const R = await pg.evaluate(async () => {
  const out = {};
  refillQuests();
  out.boardN = QUESTS.avail.length;
  out.kinds = [...new Set(QUESTS.avail.map(q => q.kind))].join(',');
  out.titles = QUESTS.avail.map(q => q.icon + q.title.slice(0, 22));
  // the player accepts two — the board must refill with NEW visible deeds
  acceptQuest(QUESTS.avail[0].id); acceptQuest(QUESTS.avail[0].id);
  refillQuests();
  out.afterAcceptN = QUESTS.avail.length;
  out.activeN = QUESTS.active.length;
  // the bot's consumption pattern: accept→abandon cycles keep the board full
  for (let i = 0; i < 6; i++) { acceptQuest(QUESTS.avail[0].id); abandonQuest(QUESTS.active[QUESTS.active.length - 1].id); refillQuests(); }
  out.afterBotN = QUESTS.avail.length;
  out.uniqueTitles = new Set(QUESTS.avail.map(q => q.title)).size === QUESTS.avail.length;
  // third accept is politely refused (two at a time)
  const before = QUESTS.active.length;
  acceptQuest(QUESTS.avail[0].id);
  out.thirdRefused = QUESTS.active.length === before;
  return out;
});
console.log('BOARD ' + JSON.stringify({ ...R, errs }));
await b.close();
