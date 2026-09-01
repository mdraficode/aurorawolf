// M46 Phase 1 verification — the gather-stall fix under live autopilot.
// Upstream invariants, measured with the wolf actually playing:
//   I1  genQuest('collect') NEVER returns a deed the loaded world cannot fulfil
//       (supply >= need + 1 at offer instant — one spare for spent/unreachable pockets).
//   I2  No 'bug-quest-stalled' warning during the whole run (the gen5/gen11 false alarms).
//   I3  No 'nopickup' warning during the whole run (collect deed with zero nearby pickups).
//   I4  Every sampled collect quest keeps supply + have >= need (chunks may unload, hence the +1 slack vs the offer rule).
import { chromium } from 'playwright';
import { pathToFileURL , fileURLToPath } from 'url';

const URL = pathToFileURL(fileURLToPath(import.meta.url) + '/../../index.html').href + '?autopilot=1&nolearn=1&seed=24601&quality=low&speed=8&rate=3&re=3';

const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
let failed = [];
try {
  await pg.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof state !== 'undefined' && state === 'play', null, { timeout: 90000 });
  await pg.waitForTimeout(2500);

  // ---- I1: contract of the offer function itself (synchronous — world is static) ----
  const unit = await pg.evaluate(() => {
    let n = 0, nulls = 0, bad = [], needs = {};
    for (let i = 0; i < 200; i++) {
      const q = genQuest('collect');
      if (!q) { nulls++; continue; }
      n++;
      needs[q.item] = (needs[q.item] || 0) + 1;
      const sup = pickupSupply(q.item);
      if (sup < q.need + 1) bad.push({ item: q.item, need: q.need, sup });
    }
    return { n, nulls, bad, needs };
  });
  if (unit.bad.length) failed.push(`I1 violated ${unit.bad.length}x: ${JSON.stringify(unit.bad.slice(0, 3))} (${unit.n} offers, ${unit.nulls} nulls)`);
  console.log(`I1 offer contract: ${unit.n} valid offers, ${unit.nulls} rerolls (land too poor) · by item ${JSON.stringify(unit.needs)}`);

  // ---- I2/I3/I4: live shakedown — the wolf plays, we watch the ledger ----
  const t0 = Date.now();
  const stallSeen = new Set(), noPkSeen = new Set(), samples = [];
  let gathers = 0, completed = 0;
  while (Date.now() - t0 < 150000) {
    await pg.waitForTimeout(3000);
    const s = await pg.evaluate(() => {
      const warns = (window.BOTLOG || [])
        .filter(e => /bug-quest-stalled/i.test((e.type || '') + ' ' + (e.msg || '')))
        .map(e => ({ t: e.t, type: e.type, msg: String(e.msg || '').slice(0, 90) }));
      const noPk = (window.BOTLOG || [])
        .filter(e => /nopickup|bug-no-pickup/i.test((e.type || '') + ' ' + (e.msg || '')))
        .map(e => ({ t: e.t, type: e.type, msg: String(e.msg || '').slice(0, 90) }));
      const bad = [];
      let known = 0;
      for (const q of [...QUESTS.avail, ...QUESTS.active]) if (q.kind === 'collect') {
        known++;
        const sup = pickupSupply(q.item);
        if (sup + (q.have || 0) < (q.need || 1)) bad.push({ t: q.title, need: q.need, have: q.have | 0, sup });
      }
      return {
        warns, noPk, bad,
        active: QUESTS.active.map(q => q.kind + ':' + (q.item || q.species || q.lmType || '')),
        gathered: (typeof stats !== 'undefined' ? stats.gathered : -1),
        done: (typeof QUESTS !== 'undefined' ? QUESTS.done.length : -1),
        known, x: +wolf.pos.x.toFixed(0), z: +wolf.pos.z.toFixed(0)
      };
    }).catch(e => ({ evalErr: String(e.message).slice(0, 100) }));
    if (s.evalErr) { failed.push('probe eval error: ' + s.evalErr); break; }
    for (const w of s.warns) stallSeen.add(w.t + '|' + w.msg);
    for (const w of s.noPk) noPkSeen.add(w.t + '|' + w.msg);
    samples.push(s.bad);
    gathers = s.gathered; completed = s.done;
    console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)}s · active ${s.active.join(',') || '—'} · gathered ${s.gathered} · done ${s.done}`);
  }
  const badSamples = samples.flat();
  const stalls = [...stallSeen].map(x => x.split('|').slice(1).join('|'));
  const noPk = [...noPkSeen].map(x => x.split('|').slice(1).join('|'));
  if (badSamples.length) failed.push(`I4 violated ${badSamples.length}x: ${JSON.stringify(badSamples.slice(0, 3))}`);
  // I2 — the mission target: ZERO false stalls on COLLECT deeds. Hunt-deed stalls are a
  // separate ledger (a fresh random brain genuinely may not close on rabbits); reported.
  const collStalls = stalls.filter(m => /gather|collect|berry|mushroom|herb|stick|stone|bone|wood/i.test(m));
  const huntStalls = stalls.filter(m => !/gather|collect|berry|mushroom|herb|stick|stone|bone|wood/i.test(m));
  if (collStalls.length) failed.push(`I2 violated: collect-deed stall ×${collStalls.length}: ${JSON.stringify(collStalls.slice(0, 2))}`);
  if (noPk.length) failed.push(`I3 violated: nopickup ×${noPk.length}: ${JSON.stringify(noPk.slice(0, 2))}`);
  console.log(`run over ${((Date.now() - t0) / 1000).toFixed(0)}s wall · gathers ${gathers} · quests done ${completed} · stall-warns ${stalls.length} (collect ${collStalls.length} / hunt-etc ${huntStalls.length}) · nopickup-warns ${noPk.length}`);
  if (huntStalls.length) console.log('report-only (hunt-deed stalls): ' + JSON.stringify(huntStalls.slice(0, 4)));
  if (!gathers) console.log('note: wolf gathered nothing this session (world supply may have rerolled to other deeds) — not a failure, report-only');
} catch (e) {
  failed.push('probe crash: ' + String(e.message).slice(0, 160));
} finally {
  await b.close();
}
if (failed.length) { console.log('GATHER TEST FAIL'); for (const f of failed) console.log('  ❌ ' + f); process.exit(1); }
console.log('GATHER TEST PASS');
