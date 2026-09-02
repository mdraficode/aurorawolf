// One-off M46 migration: GEN 27 widens the cortex 18 → 20 inputs (bear-sense + sky-threat).
// The champion's 256-weights must survive EXACTLY: insert two zero rows (20 weights)
// after the 180-entry input→hidden block. Zero inputs = zero contribution = the same mind.
import fs from 'fs';
const D = new URL('.', import.meta.url).pathname;
const OLD_NI = 18, NEW_NI = 20, NH = 10;
const OLD_W1 = OLD_NI * NH, PAD = (NEW_NI - OLD_NI) * NH;
const champPath = `${D}rafzzer_champion.json`, candPath = `${D}rafzzer_candidate.json`;
const champ = JSON.parse(fs.readFileSync(champPath, 'utf8'));
const w = champ.weights;
if (w.length === OLD_W1 + PAD + NH + NH * 6 + 6) { console.log('champion already at 20-input width'); process.exit(0); }
if (w.length !== OLD_W1 + NH + NH * 6 + 6) { console.log(`unexpected champion width ${w.length}`); process.exit(1); }
const nw = w.slice(0, OLD_W1).concat(Array(PAD).fill(0), w.slice(OLD_W1));
fs.writeFileSync(champPath, JSON.stringify({ ...champ, weights: nw, migrated: `NI 18→20 zero-pad (GEN ${champ.gen} preserved) ${w.length}→${nw.length}` }));
try { fs.unlinkSync(candPath); } catch (e) { }
console.log(`champion GEN ${champ.gen} migrated: ${w.length} → ${nw.length} weights (new senses start neutral)`);
