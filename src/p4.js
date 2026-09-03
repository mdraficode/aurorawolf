/* ================================================================
   Part 4 — chunks, weather, day/night, audio, UI, main loop
   ================================================================ */
const GROUND = {
  tundra: new THREE.Color(0xdfe8ee), taiga: new THREE.Color(0x49624c),
  forest: new THREE.Color(0x4e7a40), grove: new THREE.Color(0x7d8a45),
  meadow: new THREE.Color(0x86a94f), mountain: new THREE.Color(0x8b8e93),
  swamp: new THREE.Color(0x4c5c38), enchanted: new THREE.Color(0x3f7a5c),
  coast: new THREE.Color(0xcabb8e), dry: new THREE.Color(0xb3a066),
  highland: new THREE.Color(0x9a9da0), volcanic: new THREE.Color(0x453934),
  sand: new THREE.Color(0xd2c39a), snow: new THREE.Color(0xf3f6f9),
  bed: new THREE.Color(0x8c8468)
};
/* ============================================================
   BIOME_CONFIG — data-driven biome tuning.
   weather: biases applied when this biome dominates at the wolf;
   magic: magic-mushroom spawn multiplier; treeDens/grassDens: density
   scaling; fog: fog-distance multiplier; tint: ambient ground tint.
   ============================================================ */
const BIOME_CONFIG = {
  taiga:     { weather: { snow: 0.45 }, magic: 0.35, treeDens: 1.0, grassDens: 0.8, fog: 1.0 },
  tundra:    { weather: { snow: 0.75 }, magic: 0,    treeDens: 0.5, grassDens: 0.35, fog: 1.05 },
  forest:    { weather: { rain: 0.15 }, magic: 0.45, treeDens: 1.0, grassDens: 1.0, fog: 1.0 },
  grove:     { weather: { rain: 0.1 },  magic: 0.45, treeDens: 0.9, grassDens: 1.0, fog: 1.0 },
  meadow:    { weather: { clear: 0.4 }, magic: 0.1,  treeDens: 0.25, grassDens: 1.4, fog: 1.1 },
  mountain:  { weather: { snow: 0.5 },  magic: 0,    treeDens: 0.4, grassDens: 0.3, fog: 0.95 },
  swamp:     { weather: { fog: 0.6, rain: 0.35 }, magic: 0.3, treeDens: 0.55, grassDens: 1.15, fog: 0.62, tint: 0x5a6b4a },
  enchanted: { weather: { mist: 0.8 },  magic: 5.0, treeDens: 1.05, grassDens: 1.1, fog: 0.7, tint: 0x8a7ad0 },
  coast:     { weather: { clear: 0.5, fog: 0.15 }, magic: 0, treeDens: 0.3,  grassDens: 1.3, fog: 1.12 },
  dry:       { weather: { clear: 0.6 },  magic: 0,   treeDens: 0.25, grassDens: 0.7, fog: 1.08, tint: 0xb8a878 },
  highland:  { weather: { snow: 0.45 },  magic: 0,   treeDens: 0.15, grassDens: 0.25, fog: 0.95, tint: 0x9aa0a8 },
  volcanic:  { weather: { fog: 0.5 },    magic: 0,   treeDens: 0.1,  grassDens: 0.1, fog: 0.8,  tint: 0x4a3833 }
};
function dominantBiomeAt(x, z) {
  const h = heightAt(x, z);
  const cl = climateAt(x, z, h);
  const w = biomeWeights(x, z, h, cl.temp, cl.moist);
  let best = 'forest', bv = -1;
  for (const k in w) if (w[k] > bv) { bv = w[k]; best = k; }
  return { key: best, w, h };
}
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color();
function groundColor(out, x, z, h, w, temp, grade) {
  out.setRGB(0, 0, 0);
  let sum = 0;
  for (const k in w) { out.r += GROUND[k].r * w[k]; out.g += GROUND[k].g * w[k]; out.b += GROUND[k].b * w[k]; sum += w[k]; }
  if (sum > 0) { out.r /= sum; out.g /= sum; out.b /= sum; }
  const beach = 1 - ss(0.5, 1.7, h);
  if (h < 2.2) out.lerp(GROUND.sand, beach * 0.9);
  if (h < 0.3) out.lerp(GROUND.bed, ss(0.3, -2.5, h) * 0.85);
  const steep = ss(0.55, 1.05, grade);
  if (steep > 0) out.lerp(GROUND.mountain, steep * 0.8);
  const coldF = ss(-0.3, -0.6, temp);
  const snowline = 46 - 26 * coldF;
  const snowAmt = Math.max(ss(snowline, snowline + 8, h), coldF * ss(-0.45, -0.75, temp));
  if (snowAmt > 0) out.lerp(GROUND.snow, clamp(snowAmt, 0, 1));
  const v = 0.9 + 0.17 * nVar(x * 0.13, z * 0.13);
  out.r *= v; out.g *= v; out.b *= v;
  return out;
}

/* ---------------- pickups ---------------- */
const PICKUP_DEF = {
  berryBush: { label: 'Gather Lingonberries', inv: 'berry', icon: '🫐', color: 0xc2223a },
  mushroom:  { label: 'Pick Mushroom',        inv: 'mushroom', icon: '🍄', color: 0xd8956a },
  herb:      { label: 'Gather Herbs',         inv: 'herb', icon: '🌿', color: 0xa8e0a0 },
  stick:     { label: 'Grab Stick',           inv: 'wood', icon: '🪵', color: 0xb98d5e },
  stoneP:    { label: 'Pick up Stone',        inv: 'stone', icon: '🪨', color: 0xd0d4d8 },
  caveEnter: { label: 'Enter Cave',        inv: null, icon: '🕳️', color: 0x223244 },
  caveExit:  { label: 'Leave Cave',        inv: null, icon: '☀️', color: 0xd8c8a0 },
  bone:      { label: 'Gather Bone',        inv: 'bone', icon: '🦴', color: 0xd8d2c4 },
  magicShroom: { label: 'Eat Magic Mushroom',  inv: null, icon: '✨', color: 0xb07aff }
};
const PICKUP_GEO = { berryBush: G.berryBush, mushroom: G.mushroom, herb: G.herb, stick: G.stick, stoneP: G.stoneP, magicShroom: G.magicShroom };
const inv = { berry: 0, mushroom: 0, herb: 0, wood: 0, stone: 0, meat: 0, pelt: 0, bone: 0 };
const stats = { gathered: 0, caught: 0, slain: 0, biomes: new Set(), playT: 0, discoveries: new Set(), firstFinds: 0 };
const zeroM = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);

/* ---------------- chunks ---------------- */
const chunks = new Map();
let genQueue = [];
let maintainT = 0;
const ck = (cx, cz) => cx + ',' + cz;

function pickWeighted(rng, entries) {
  let sum = 0; for (const e of entries) sum += e[1];
  let r = rng() * sum;
  for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}

/* ================= the boreal forest engine =================
   Layered vegetation — canopy (15-40 m) / mid-story / young trees /
   understory / floor detail — placed in organic clusters with
   noise-driven clearings and winding animal paths. All instanced;
   counts scale with QUALITY for mobile. */
const FOREST = {
  Q: QUALITY === 'low' ? 0.7 : 1,
  BASE: TREE_BASE_H,
  POOLS: {   // [species, weight, tier]
    taiga:     [['spruceTall', .26, 'canopy'], ['spruce', .22, 'mid'], ['fir', .13, 'mid'], ['birchTall', .08, 'canopy'], ['birch', .09, 'mid'], ['snowSpruce', .06, 'mid'], ['deadPine', .05, 'canopy'], ['youngConifer', .11, 'young']],
    forest:    [['pineTall', .23, 'canopy'], ['spruceTall', .17, 'canopy'], ['pine', .17, 'mid'], ['oakTall', .14, 'canopy'], ['oak', .10, 'mid'], ['birchTall', .09, 'canopy'], ['birch', .06, 'mid'], ['youngBroad', .04, 'young']],
    grove:     [['birchTall', .26, 'canopy'], ['autumnBirch', .21, 'mid'], ['rowan', .15, 'mid'], ['oakTall', .14, 'canopy'], ['youngBroad', .13, 'young'], ['birch', .11, 'mid']],
    enchanted: [['birchTall', .30, 'canopy'], ['rowan', .17, 'mid'], ['spruceTall', .19, 'canopy'], ['autumnBirch', .16, 'mid'], ['birch', .10, 'mid'], ['youngBroad', .08, 'young']],
    meadow:    [['oakTall', .34, 'canopy'], ['oak', .30, 'mid'], ['birch', .22, 'mid'], ['youngBroad', .14, 'young']],
    tundra:    [['deadPine', .30, 'canopy'], ['deadTree', .30, 'mid'], ['dwarfPine', .40, 'mid']],
    swamp:     [['deadPine', .26, 'canopy'], ['deadTree', .26, 'mid'], ['dwarfPine', .22, 'mid'], ['birch', .26, 'mid']],
    mountain:  [['spruce', .40, 'mid'], ['snowSpruce', .28, 'mid'], ['fir', .20, 'mid'], ['spruceTall', .12, 'canopy']],
    coast:     [['pine', .32, 'mid'], ['fallenTree', .28, 'mid'], ['youngConifer', .40, 'young']],
    dry:       [['deadTree', .40, 'mid'], ['dwarfPine', .30, 'mid'], ['birch', .30, 'mid']],
    highland:  [['dwarfPine', .50, 'mid'], ['deadTree', .30, 'mid'], ['spruce', .20, 'mid']],
    volcanic:  [['deadPine', .55, 'canopy'], ['deadTree', .45, 'mid']]
  },
  pick(pool, rng) {
    let tot = 0; for (const e of pool) tot += e[1];
    let r = rng() * tot;
    for (const e of pool) { r -= e[1]; if (r <= 0) return e; }
    return pool[pool.length - 1];
  },
  poolFor(w, rng) {           // biome mix at a spot decides the species pool
    const entries = [];
    for (const k in this.POOLS) { const wt = w[k] || 0; if (wt > 0.04) entries.push([this.POOLS[k], wt]); }
    if (!entries.length) return null;
    let tot = 0; for (const e of entries) tot += e[1];
    let r = rng() * tot;
    for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  },
  clearingAt(x, z) { return ss(0.5, 0.72, fbm(nClr, x * 0.021, z * 0.021, 2)); },
  pathAt(x, z) { return 1 - ss(0.009, 0.028, Math.abs(fbm(nPath, x * 0.016, z * 0.016, 2) - 0.5)); },
  place(treeSets, bushes, ferns, grass, leafPatches, branches, glowFlowers, cx, cz, rng, sample, slopeOK) {
    const Q = this.Q, x0 = cx * CHUNK, z0 = cz * CHUNK;
    const stats = { canopy: 0, mid: 0, young: 0, understory: 0, floor: 0, trees: [] };
    // coarse trunk grid: keeps trunks from fusing while staying organic
    const cell = new Map();
    const crowded = (x, z, r) => {
      const gx = Math.floor(x / 2.4), gz = Math.floor(z / 2.4);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const arr = cell.get((gx + a) + ',' + (gz + b)); if (!arr) continue;
        for (let q = 0; q < arr.length; q++) {
          const dx = arr[q][0] - x, dz = arr[q][1] - z;
          if (dx * dx + dz * dz < r * r) return true;
        }
      }
      return false;
    };
    const mark = (x, z) => {
      const k = Math.floor(x / 2.4) + ',' + Math.floor(z / 2.4);
      let a = cell.get(k); if (!a) { a = []; cell.set(k, a); }
      a.push([x, z]);
    };
    const c0 = sample(x0 + 32, z0 + 32), w0 = c0.w;
    const forestF = Math.min(1, (w0.forest || 0) + (w0.taiga || 0) + (w0.grove || 0) * 0.9 + (w0.enchanted || 0) * 0.95 + (w0.swamp || 0) * 0.5 + (w0.mountain || 0) * 0.3);
    // stand clusters — each breeds mostly true
    const clusters = [];
    const nCl = Math.round((1 + forestF * 4) * (0.7 + rng() * 0.6));
    for (let i = 0; i < nCl; i++) {
      const cp = this.poolFor(sample(x0 + 10 + rng() * (CHUNK - 20), z0 + 10 + rng() * (CHUNK - 20)).w, rng);
      if (cp) clusters.push({ x: x0 + 8 + rng() * (CHUNK - 16), z: z0 + 8 + rng() * (CHUNK - 16), dom: this.pick(cp, rng) });
    }
    const tries = Math.min(260, Math.round((30 + 205 * forestF) * Q));
    for (let t = 0; t < tries; t++) {
      let x, z;
      if (clusters.length && rng() < 0.58) {          // clustered majority
        const c = clusters[(rng() * clusters.length) | 0];
        const ang = rng() * 6.283, r = Math.pow(rng(), 0.6) * 13;
        x = c.x + Math.sin(ang) * r; z = c.z + Math.cos(ang) * r;
        if (x < x0 + 0.5 || x >= x0 + CHUNK - 0.5 || z < z0 + 0.5 || z >= z0 + CHUNK - 0.5) continue;
      } else { x = x0 + rng() * CHUNK; z = z0 + rng() * CHUNK; }
      const s = sample(x, z);
      if (s.h < 1.4) continue;
      const dens = ss(-0.35, 0.55, fbm(nF, x * 0.012, z * 0.012, 2));
      const open = this.clearingAt(x, z), path = this.pathAt(x, z);
      const bf = (s.w.forest || 0) + (s.w.taiga || 0) + (s.w.grove || 0) * 0.9 + (s.w.enchanted || 0) * 0.95 +
                 (s.w.swamp || 0) * 0.5 + (s.w.mountain || 0) * (s.h < 40 ? 0.35 : 0.05) + (s.w.meadow || 0) * 0.16 + (s.w.tundra || 0) * 0.22 +
                 (s.w.coast || 0) * 0.16 + (s.w.dry || 0) * 0.2 + (s.w.highland || 0) * 0.18 + (s.w.volcanic || 0) * 0.12;
      let p = (0.1 + 0.92 * dens) * bf * (1 - open * 0.95) * (1 - path * 0.93);
      if ((s.w.meadow || 0) > 0.5) p *= 0.32;          // meadows stay airy
      if (rng() > p || !slopeOK(x, z, s.h) || crowded(x, z, 1.5)) continue;
      let dom;
      if (rng() < 0.62 && clusters.length) dom = clusters[(rng() * clusters.length) | 0].dom;
      else { const pool = this.poolFor(s.w, rng); if (!pool) continue; dom = this.pick(pool, rng); }
      const type = dom[0], tier = dom[2];
      let h;
      if (tier === 'canopy') h = rng() < 0.06 ? 29 + rng() * 10 : 15 + rng() * 12;   // 6% old growth 29-39 m
      else if (tier === 'young') h = 2.2 + rng() * 3.2;
      else h = (this.BASE[type] || 7) * (0.92 + rng() * 0.85);
      if (type === 'deadPine') h = 11 + rng() * 9;
      const sy = h / (this.BASE[type] || 7), sxv = sy * (0.85 + rng() * 0.3);
      const tv = 0.86 + rng() * 0.28;
      const tint = _c2.setRGB(tv * (0.9 + rng() * 0.2), tv, tv * (0.85 + rng() * 0.25)).clone();
      if ((s.w.enchanted || 0) > 0.4) tint.setRGB(0.62 + rng() * 0.25, 0.58 + rng() * 0.2, 0.85 + rng() * 0.3);
      else if ((s.w.volcanic || 0) > 0.4) tint.multiplyScalar(0.45);
      else if ((s.w.dry || 0) > 0.45) tint.setRGB(tv * 0.98, tv * 0.82, tv * 0.5);
      else if (type === 'birch' && (s.w.swamp || 0) > 0.4) tint.multiplyScalar(0.82);
      treeSets[type].push({ x, y: s.h - 0.12, z, ry: rng() * 6.283, rx: type === 'deadPine' ? (rng() - 0.5) * 0.12 : 0, sx: sxv, sy, sz: sxv * (0.9 + rng() * 0.2), tint });
      mark(x, z);
      if (tier === 'canopy') stats.canopy++; else if (tier === 'young') stats.young++; else stats.mid++;
      stats.trees.push({ x, z, h, y: s.h });
    }
    // ---- understory: bushes & ferns, thick in dense stands, thin on paths ----
    for (let i = 0, n = Math.round(52 * Q); i < n; i++) {
      const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
      const s = sample(x, z);
      if (s.h < 1.2) continue;
      const dens = ss(-0.35, 0.55, fbm(nF, x * 0.012, z * 0.012, 2));
      const p = ((s.w.forest || 0) * 0.62 + (s.w.taiga || 0) * 0.55 + (s.w.grove || 0) * 0.5 + (s.w.enchanted || 0) * 0.5 + (s.w.meadow || 0) * 0.18 + (s.w.coast || 0) * 0.14 + (s.w.dry || 0) * 0.16) *
                (0.5 + 0.75 * dens) * (1 - this.clearingAt(x, z) * 0.55) * (1 - this.pathAt(x, z) * 0.75);
      if (rng() > p) continue;
      const dst = rng() < 0.42 + (s.w.taiga || 0) * 0.25 ? ferns : bushes;
      const bv = 0.78 + rng() * 0.4;
      dst.push({ x, y: s.h - 0.05, z, ry: rng() * 6.283, s: 0.7 + rng() * 1.1, tint: _c2.setRGB(bv * 0.95, bv, bv * 0.88).clone() });
      stats.understory++;
    }
    // ---- floor: grass, leaf litter, dead branches ----
    for (let i = 0, n = Math.round(150 * Q * (0.6 + 0.5 * ((w0.meadow || 0) + forestF * 0.6))); i < n; i++) {
      const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
      const s = sample(x, z);
      if (s.h < 1.2) continue;
      const p = (0.85 * (s.w.meadow || 0) + 0.7 * (s.w.forest || 0) + 0.5 * (s.w.grove || 0) + 0.32 * (s.w.taiga || 0) + 0.3 * (s.w.enchanted || 0) + 0.5 * (s.w.coast || 0) + 0.42 * (s.w.dry || 0)) * (1 - this.pathAt(x, z) * 0.5);
      if (rng() > p) continue;
      const gv = 0.75 + rng() * 0.45;
      const dried = (s.w.dry || 0) + (s.w.coast || 0) * 0.5;
      grass.push({ x, y: s.h - 0.05, z, ry: rng() * 6.283, s: 0.7 + rng() * 0.85, tint: _c2.setRGB(gv * (0.9 + (s.w.grove || 0) * 0.35 + dried * 0.12), gv * (1 - dried * 0.22), gv * (0.85 + (s.w.taiga || 0) * 0.2 - dried * 0.45)).clone() });
      stats.floor++;
    }
    const LEAF_TINTS = [0x8a6a34, 0x6d5a30, 0x9c7a3c, 0xb0803f, 0x5d4a2a];
    for (let i = 0, n = Math.round(20 * Q); i < n; i++) {
      const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
      const s = sample(x, z);
      if (s.h < 1.2) continue;
      const p = 0.62 * ((s.w.forest || 0) + (s.w.grove || 0) * 0.95 + (s.w.enchanted || 0) * 0.5 + (s.w.taiga || 0) * 0.22);
      if (rng() > p) continue;
      leafPatches.push({ x, y: s.h - 0.02, z, ry: rng() * 6.283, s: 0.7 + rng() * 1.0, tint: _c2.setHex(LEAF_TINTS[(rng() * LEAF_TINTS.length) | 0]).clone() });
      stats.floor++;
    }
    for (let i = 0, n = Math.round(13 * Q); i < n; i++) {
      const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
      const s = sample(x, z);
      if (s.h < 1.2) continue;
      const p = 0.55 * ((s.w.forest || 0) + (s.w.taiga || 0) * 0.8 + (s.w.grove || 0) * 0.7 + (s.w.enchanted || 0) * 0.4);
      if (rng() > p) continue;
      branches.push({ x, y: s.h - 0.02, z, ry: rng() * 6.283, s: 0.8 + rng() * 1.1 });
      stats.floor++;
    }
    // ---- moon petals: faintly glowing night flowers, rare as surprises ----
    for (let i = 0, n = Math.round(5 * Q); i < n; i++) {
      const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
      const s = sample(x, z);
      if (s.h < 1.2) continue;
      const p = 0.05 * ((s.w.enchanted || 0) * 1.6 + (s.w.forest || 0) * 0.5 + (s.w.grove || 0) * 0.45 + (s.w.swamp || 0) * 0.3);
      if (rng() > p) continue;
      const cx2 = x + (rng() - 0.5) * 6, cz2 = z + (rng() - 0.5) * 6;
      for (let k = 0, m = 2 + (rng() * 3 | 0); k < m; k++) {
        const fx = cx2 + (rng() - 0.5) * 3.4, fz = cz2 + (rng() - 0.5) * 3.4;
        const fs = sample(fx, fz);
        if (fs.h < 1.2) continue;
        glowFlowers.push({ x: fx, y: fs.h - 0.02, z: fz, ry: rng() * 6.283, s: 0.7 + rng() * 0.6 });
      }
    }
    const MOSS_TINTS = [0x4a5f33, 0x55682f, 0x3f5a3a];
    for (let i = 0, n = Math.round(12 * Q); i < n; i++) {   // moss: shady, damp northern ground
      const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
      const s = sample(x, z);
      if (s.h < 1.2) continue;
      const p = 0.34 * ((s.w.taiga || 0) + (s.w.swamp || 0) * 0.9 + (s.w.forest || 0) * 0.5 + (s.w.mountain || 0) * 0.25 + (s.w.highland || 0) * 0.22);
      if (rng() > p) continue;
      leafPatches.push({ x, y: s.h - 0.015, z, ry: rng() * 6.283, s: 0.6 + rng() * 0.9, tint: _c2.setHex(MOSS_TINTS[(rng() * MOSS_TINTS.length) | 0]).clone() });
      stats.floor++;
    }
    // ---- windfall: fallen trunks & stumps where the stand is old ----
    for (let i = 0; i < 3; i++) {
      const x = x0 + 6 + rng() * (CHUNK - 12), z = z0 + 6 + rng() * (CHUNK - 12);
      const s = sample(x, z);
      if (s.h < 1.4) continue;
      if (rng() > 0.4 * forestF * ss(-0.1, 0.6, fbm(nF, x * 0.012, z * 0.012, 2))) continue;
      if (rng() < 0.6) treeSets.fallenTree.push({ x, y: s.h - 0.06, z, ry: rng() * 6.283, rz: (rng() - 0.5) * 0.1, s: 0.7 + rng() * 0.65 });
      else treeSets.stump.push({ x, y: s.h - 0.08, z, ry: rng() * 6.283, s: 0.8 + rng() * 0.7 });
    }
    return stats;
  }
};

const IMP_CLASS = {
  spruceTall: 'conifer', spruce: 'conifer', snowSpruce: 'conifer', pineTall: 'conifer', pine: 'conifer', fir: 'conifer', youngConifer: 'conifer', dwarfPine: 'conifer',
  birchTall: 'broad', birch: 'broad', autumnBirch: 'broad', rowan: 'broad', oakTall: 'broad', oak: 'broad', youngBroad: 'broad',
  deadPine: 'dead', deadTree: 'dead'
};
/* builds (and rebuilds) a chunk's vegetation: full geometry up close,
   3 crossed-quad impostor meshes + no floor detail when far */
function buildChunkVeg(chunk, far) {
  for (const m of chunk.vegMeshes) {
    chunk.group.remove(m);
    if (m.userData.ownGeo) m.userData.ownGeo.dispose();
    if (m.dispose) m.dispose();
  }
  chunk.vegMeshes.length = 0;
  const items = chunk.vegItems, floor = chunk.floorItems;
  if (far) {
    const byCls = { conifer: [], broad: [], dead: [] };
    for (const k in items.trees) for (const it of items.trees[k]) {
      const cls = IMP_CLASS[k]; if (!cls) continue;
      const h = it.sy * (TREE_BASE_H[k] || 7);
      const w = h * (cls === 'broad' ? 0.85 : cls === 'dead' ? 0.55 : 0.6);
      byCls[cls].push({ x: it.x, y: it.y + h * 0.5 - 0.5, z: it.z, ry: it.ry || 0, sx: w, sy: h, sz: w, tint: it.tint });
    }
    for (const cls in byCls) {
      if (!byCls[cls].length) continue;
      const m = makeInstanced(G['imp' + cls[0].toUpperCase() + cls.slice(1)], matImp[cls], byCls[cls], false, true);
      if (m) { m.userData.impostor = true; chunk.group.add(m); chunk.vegMeshes.push(m); }
    }
    chunk.lod = 'far';
  } else {
    for (const k in items.trees) {
      if (!items.trees[k].length) continue;
      const m = makeInstanced(G[k], matVeg, items.trees[k], true, true);
      if (m) { m.userData.species = k; chunk.group.add(m); chunk.vegMeshes.push(m); }
    }
    const FLOOR_GEO = { grass: [G.grassTuft], bushes: [G.bush], ferns: [G.fern], leafPatches: [G.leafPatch], branches: [G.branch], flowers: [G.flower], glowFlowers: [G.flower, matGlow] };
    for (const key in FLOOR_GEO) {
      const arr = floor[key]; if (!arr || !arr.length) continue;
      const fe = FLOOR_GEO[key];
      const m = makeInstanced(fe[0], fe[1] || matVeg, arr, false, true);
      if (m) { m.userData.floor = true; chunk.group.add(m); chunk.vegMeshes.push(m); }
    }
    chunk.lod = 'near';
  }
}
function groundStepType(x, z) {      // footstep timbre by ground cover
  const h = heightAt(x, z);
  if (h < WATER_Y + 0.3) return 'water';
  const cl = climateAt(x, z, h);
  if (weather.snow > 0.25 || cl.temp < -0.45) return 'snow';
  const w = biomeWeights(x, z, h, cl.temp, cl.moist);
  if ((w.volcanic || 0) > 0.45) return 'ash';
  if (h < 2.6 && (w.coast || 0) > 0.45) return 'sand';
  if ((w.mountain || 0) > 0.45 || (w.highland || 0) > 0.4) return 'rock';
  if (coverAt(x, z) > 0.35 || (w.taiga || 0) > 0.4) return 'forest';
  return 'meadow';
}

function genChunk(cx, cz) {
  const key = ck(cx, cz);
  if (chunks.has(key)) return;
  const group = new THREE.Group();
  scene.add(group);
  const step = CHUNK / SEG;
  const N = SEG + 1;
  const heights = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++)
      heights[j * N + i] = heightAt(cx * CHUNK + i * step, cz * CHUNK + j * step);

  const pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const idx = j * N + i;
      const x = cx * CHUNK + i * step, z = cz * CHUNK + j * step;
      const h = heights[idx];
      const hx = heights[j * N + Math.min(SEG, i + 1)] - heights[j * N + Math.max(0, i - 1)];
      const hz = heights[Math.min(SEG, j + 1) * N + i] - heights[Math.max(0, j - 1) * N + i];
      const grade = Math.hypot(hx, hz) / (2 * step);
      const cl = climateAt(x, z, h);
      const w = biomeWeights(x, z, h, cl.temp, cl.moist);
      groundColor(_c1, x, z, h, w, cl.temp, grade);
      pos[idx * 3] = x; pos[idx * 3 + 1] = h; pos[idx * 3 + 2] = z;
      col[idx * 3] = _c1.r; col[idx * 3 + 1] = _c1.g; col[idx * 3 + 2] = _c1.b;
    }
  }
  const index = [];
  for (let j = 0; j < SEG; j++)
    for (let i = 0; i < SEG; i++) {
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, matTerrain);
  terrain.receiveShadow = true;
  group.add(terrain);

  const chunk = { key, cx, cz, group, geo, instanced: [], vegMeshes: [], lod: 'near', vegItems: null, floorItems: null, pickups: [], animals: [], predators: [], landmarks: [] };

  /* ---- placement ---- */
  const rng = mulberry32(hash2(cx, cz, SEED));
  const treeSets = { spruce: [], snowSpruce: [], pine: [], birch: [], autumnBirch: [], rowan: [], oak: [], deadTree: [], dwarfPine: [],
    spruceTall: [], pineTall: [], birchTall: [], oakTall: [], fir: [], deadPine: [], youngConifer: [], youngBroad: [], fallenTree: [], stump: [] };
  const rocks = [], flowers = [];
  let grass = [], bushes = [], ferns = [], leafPatches = [], branches = [], glowFlowers = [];
  const pkSets = { berryBush: [], mushroom: [], herb: [], stick: [], stoneP: [], magicShroom: [] };

  const sample = (bx, bz) => {
    const h = heightAt(bx, bz);
    const cl = climateAt(bx, bz, h);
    const w = biomeWeights(bx, bz, h, cl.temp, cl.moist);
    return { h, cl, w };
  };
  const slopeOK = (bx, bz, h) => {
    const g = Math.abs(heightAt(bx + 1.2, bz + 0.9) - h) / 1.5;
    return g < 0.85;
  };

  /* ---- boreal forest: layered stands, clearings, paths ---- */
  chunk.veg = FOREST.place(treeSets, bushes, ferns, grass, leafPatches, branches, glowFlowers, cx, cz, rng, sample, slopeOK);

  for (let i = 0; i < 18; i++) {
    const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
    const s = sample(x, z);
    if (s.h < 0.6) continue;
    const p = 0.5 * s.w.mountain + 0.28 * s.w.tundra + 0.42 * s.w.highland + 0.3 * s.w.dry + 0.5 * s.w.volcanic + 0.16 * s.w.coast + 0.1;
    if (rng() < p) {
      const white = Math.max(s.w.tundra, s.w.mountain * ss(38, 48, s.h)) > 0.45;
      const g = 0.75 + rng() * 0.35;
      _c2.setRGB(g, g, Math.min(1, g + 0.04));
      if (white) _c2.setRGB(1.25, 1.28, 1.34);
      rocks.push({ x, y: s.h - 0.15, z, ry: rng() * 6.28, s: 0.5 + rng() * 1.7, tint: _c2.clone() });
    }
  }
  const FLOWER_COLS = [0xf2a7c3, 0xf7e07a, 0xffffff, 0xb28ff2, 0xff8f5e];
  for (let i = 0; i < 26; i++) {
    const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
    const s = sample(x, z);
    if (s.h < 1.2) continue;
    if (rng() < 0.75 * s.w.meadow + 0.2 * s.w.grove) {
      flowers.push({ x, y: s.h - 0.02, z, ry: rng() * 6.28, s: 0.8 + rng() * 0.8, tint: _c2.set(FLOWER_COLS[(rng() * 5) | 0]).clone() });
    }
  }
  let lastSample = null;
  const pkTries = {
    berryBush: s => 0.42 * (s.w.taiga + s.w.forest + s.w.meadow * 0.7 + s.w.grove * 0.6 + s.w.coast * 0.55),
    mushroom:  s => 0.4 * (s.w.forest + s.w.grove * 0.8),
    herb:      s => 0.5 * s.w.meadow + 0.3 * s.w.dry,
    stick:     s => 0.38 * (s.w.forest + s.w.taiga + s.w.grove) + 0.4 * s.w.coast,
    stoneP:    s => 0.5 * (s.w.tundra + s.w.mountain) + 0.32 * s.w.highland + 0.3 * s.w.volcanic + 0.18 * s.w.dry
  };
  for (const type in pkTries) {
    for (let i = 0; i < 6; i++) {
      const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
      lastSample = sample(x, z);
      if (lastSample.h < 1.0) continue;
      if (rng() < pkTries[type](lastSample)) {
        pkSets[type].push({ x, y: lastSample.h - 0.04, z, ry: rng() * 6.28, s: 0.9 + rng() * 0.5 });
      }
    }
  }

  chunk.solids = [];   // big trunks, boulders, landmark stone — the solid world
    /* ---- landmarks: tiered rarity — common sights, rare finds, epics you tell stories about ---- */
  const hLm = hash2(cx, cz, SEED ^ 0x5bd1);
  const tierRoll = hLm % 5 === 0 ? 'common' : hLm % 11 === 5 ? 'rare' : hLm % 71 === 37 ? 'epic' : null;
  if (tierRoll) {
    const types = Object.keys(LANDMARKS).filter(k => (LANDMARKS[k].tier || 'common') === tierRoll);
    let type = types[hash2(cx, cz, SEED ^ 0x9e37) % types.length];
    const def = LANDMARKS[type];
    const cS = sample(cx * CHUNK + CHUNK / 2, cz * CHUNK + CHUNK / 2);
    // biome gate — pickWeighted over def.biomes vs chunk weights (logBridge takes any)
    let okBiome = def.biomes.any === 1;
    if (!okBiome) {
      const bset = Object.entries(def.biomes);
      const bw = bset.reduce((t, [k, wt]) => t + wt * (cS.w[k] || 0), 0);
      okBiome = bw > 0.22;
    }
    if (okBiome) {
      const lx = cx * CHUNK + 14 + rng() * (CHUNK - 28), lz = cz * CHUNK + 14 + rng() * (CHUNK - 28);
      const ls = sample(lx, lz);
      if (def.needsHigh && ls.h < 22) { /* waterfalls need a hillside */ }
      else if (ls.h > 1.1) {
        let model = def.build(rng), ry = rng() * 6.28;
        if (def.needsWater) {
          // find water in this chunk; lay the log along the shoreline contour (across the water)
          let found = false;
          for (let t2 = 0; t2 < 12 && !found; t2++) {
            const wx = cx * CHUNK + 8 + rng() * (CHUNK - 16), wz = cz * CHUNK + 8 + rng() * (CHUNK - 16);
            if (heightAt(wx, wz) < WATER_Y - 0.4) {
              const gx = heightAt(wx + 2, wz) - heightAt(wx - 2, wz), gz = heightAt(wx, wz + 2) - heightAt(wx, wz - 2);
              ry = Math.atan2(gx, gz) + Math.PI / 2;   // perpendicular to the bank gradient
              model.position.set(wx, WATER_Y + 0.25, wz);
              model.rotation.y = ry; found = true;
            }
          }
          if (!found) { model = null; }
        }
        if (model) {
          if (!def.needsWater) { model.position.set(lx, ls.h - 0.25, lz); model.rotation.y = ry; }
          scene.add(model);
          const lm = { type, x: model.position.x, z: model.position.z, model, chunkKey: key, ember: model.userData.ember || null, mist: model.userData.mist || null, found: false, tier: def.tier || 'common', label: def.label };
          landmarkList.push(lm);
          if (def.enterable) chunk.pickups.push({ type: 'caveEnter', mesh: null, idx: 0, x: model.position.x, y: model.position.y + 1.3, z: model.position.z + 2.2, gathered: false, lm });
          const lmSolids = def.solid || model.userData.solid || null;
          if (lmSolids) {
            const cR = Math.cos(ry), sR = Math.sin(ry);
            for (const [sdx, sdz, sr] of lmSolids) chunk.solids.push({ x: lm.x + sdx * cR + sdz * sR, z: lm.z - sdx * sR + sdz * cR, r: sr });
          }
          chunk.landmarks = chunk.landmarks || [];
          chunk.landmarks.push(lm);
          def.resources(pkSets, rng, lm.x, lm.z);   // special nearby resources
        }
      }
    }
  }

  // magic mushrooms — common in the Enchanted Grove, rare elsewhere
  const ench = sample(cx * CHUNK + CHUNK / 2, cz * CHUNK + CHUNK / 2).w.enchanted || 0;
  const tries = 2 + (ench > 0.3 ? 3 : 0);
  for (let i = 0; i < tries; i++) {
    const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
    const s3 = sample(x, z);
    if (s3.h < 1.0) continue;
    let pMg = 0.30 * s3.w.enchanted;
    for (const bk in BIOME_CONFIG) pMg += 0.045 * (s3.w[bk] || 0) * BIOME_CONFIG[bk].magic;
    if (rng() < pMg) {
      pkSets.magicShroom.push({ x, y: s3.h - 0.04, z, ry: rng() * 6.28, s: 1.0 + rng() * 0.4 });
    }
  }

  /* ---- keep landmarks clear of trunks & thickets ---- */
  const lmPts = [];
  for (const l of landmarkList)
    if (l.x > cx * CHUNK - 6 && l.x < cx * CHUNK + CHUNK + 6 && l.z > cz * CHUNK - 6 && l.z < cz * CHUNK + CHUNK + 6) lmPts.push(l);
  if (lmPts.length) {
    const R2 = 9 * 9;
    const clearOf = arr => arr.filter(it => {
      for (const l of lmPts) { const dx = it.x - l.x, dz = it.z - l.z; if (dx * dx + dz * dz < R2) return false; }
      return true;
    });
    for (const k in treeSets) treeSets[k] = clearOf(treeSets[k]);
    grass = clearOf(grass); bushes = clearOf(bushes); ferns = clearOf(ferns); leafPatches = clearOf(leafPatches); branches = clearOf(branches); glowFlowers = clearOf(glowFlowers);
    if (chunk.veg) chunk.veg.trees = clearOf(chunk.veg.trees);   // keep the census honest
  }

  /* ---- instantiate: full meshes near, impostors far ---- */
  chunk.vegItems = { trees: treeSets };
  for (const k in treeSets) {
    const br = SOLID_TRUNK_R[k]; if (!br) continue;
    for (const t of treeSets[k]) chunk.solids.push({ x: t.x, z: t.z, r: br * (t.sx || 1) });
  }
  for (const rk of rocks) if (rk.s >= 1.0) chunk.solids.push({ x: rk.x, z: rk.z, r: 0.8 * rk.s });
  for (const t of (treeSets.fallenTree || [])) {   // a log is a wall of circles laid end to end
    const L = 8.5 * (t.s || 1), r = 0.5 * (t.s || 1);
    const ax = Math.sin(t.ry || 0), az = Math.cos(t.ry || 0);
    for (let k = -2; k <= 2; k++) chunk.solids.push({ x: t.x + ax * k * L * 0.19, z: t.z + az * k * L * 0.19, r });
  }
  for (const t of (treeSets.stump || [])) chunk.solids.push({ x: t.x, z: t.z, r: 0.52 * (t.s || 1) });
  chunk.floorItems = { grass, bushes, ferns, leafPatches, branches, flowers, glowFlowers };
  const dC0 = Math.hypot(cx * CHUNK + 32 - wolf.pos.x, cz * CHUNK + 32 - wolf.pos.z);
  buildChunkVeg(chunk, dC0 > 124);
  if (rocks.length) { const m = makeInstanced(G.rock, matVeg, rocks, true, true); if (m) { group.add(m); chunk.instanced.push(m); } }
  for (const type in pkSets) {
    if (!pkSets[type].length) continue;
    const m = makeInstanced(PICKUP_GEO[type], type === 'magicShroom' ? matMagic : matVeg, pkSets[type], true);
    if (!m) continue;
    group.add(m); chunk.instanced.push(m);
    pkSets[type].forEach((it, i) => chunk.pickups.push({ type, mesh: m, idx: i, x: it.x, y: it.y, z: it.z, gathered: false }));
  }

  /* ---- animals: herds, ecology, spawn-zone rules ---- */
  const centerS = sample(cx * CHUNK + CHUNK / 2, cz * CHUNK + CHUNK / 2);
  const centerBiome = pickWeighted(rng, Object.entries(centerS.w).filter(e => e[1] > 0.05));
  AnimalSpawner.spawnChunk(chunk, cx, cz, rng, sample, pickWeighted);

  /* ---- territorial predators: at most one per chunk, rare, biome-fit ---- */
  if (predatorTotal < 5) {
    const pTable = PREDATOR_TABLE[centerBiome];
    if (pTable && rng() < 0.13 + Math.min(0.10, Math.max(0, wolf.level) * 0.0022)) {   // the strong attract the strong
      const px = cx * CHUNK + 10 + rng() * (CHUNK - 20), pz = cz * CHUNK + 10 + rng() * (CHUNK - 20);
      if (heightAt(px, pz) > 1.2)
        chunk.predators.push(new Predator(pickWeighted(rng, pTable), px, pz));
    }
  }
  chunks.set(key, chunk);
}

function disposeChunk(chunk) {
  scene.remove(chunk.group);
  chunk.geo.dispose();
  for (const m of chunk.instanced) { if (m.dispose) m.dispose(); if (m.userData && m.userData.ownGeo) m.userData.ownGeo.dispose(); }
  for (const m of chunk.vegMeshes) { if (m.userData.ownGeo) m.userData.ownGeo.dispose(); if (m.dispose) m.dispose(); }
  for (const a of chunk.animals) { if (!a.dead && ECO_CAP[a.name] !== undefined) ECO_POP[a.name]++; a.dispose(); }
  chunk.animals.length = 0;
  /* BUG B8 (found by the speedrun rig, 2026-09-02): a LEGEND used to be disposed here.
     A Boss registers itself in the chunk it SPAWNED in, and the wolf's bite only scans
     loaded chunks — so once the player outran that chunk (fleeing to heal, kiting, or
     just being chased 260 m across the map) disposeChunk() deleted the Legend outright:
     model gone, bosses[] entry gone, and THE CAMPAIGN SOFTLOCKED because its boss stage
     waits forever for an onSlain that can now never fire. A Legend is a story actor, not
     scenery: detach it from the chunk, leave it alive and hunting. */
  for (const pr of chunk.predators) if (!(pr instanceof Boss)) pr.dispose();
  chunk.predators.length = 0;
  for (const lm of chunk.landmarks) { scene.remove(lm.model); const i = landmarkList.indexOf(lm); if (i >= 0) landmarkList.splice(i, 1); }
  chunk.landmarks.length = 0;
  chunks.delete(chunk.key);
}

function maintainChunks(dt) {
  if (caveState.in) return;   // the surface waits while you are under it
  maintainT -= dt;
  if (maintainT <= 0) {
    maintainT = 0.4;
    const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
    const elevated = wolf.pos.y > 34;              // on a ridge, the world unrolls
    const viewR = VIEW_R + (elevated ? 1 : 0);
    genQueue = [];
    for (let dz = -viewR; dz <= viewR; dz++)
      for (let dx = -viewR; dx <= viewR; dx++) {
        const cx = ccx + dx, cz = ccz + dz;
        if (!chunks.has(ck(cx, cz))) genQueue.push({ cx, cz, d: dx * dx + dz * dz });
      }
    genQueue.sort((a, b) => a.d - b.d);
    for (const chunk of Array.from(chunks.values())) {
      if (Math.max(Math.abs(chunk.cx - ccx), Math.abs(chunk.cz - ccz)) > viewR + 1) disposeChunk(chunk);
    }
    // vegetation LOD: near = full geometry, far = impostors (hysteresis 116-132 m); closest first
    const lodWanted = [];
    for (const chunk of chunks.values()) {
      const d = Math.hypot(chunk.cx * CHUNK + 32 - wolf.pos.x, chunk.cz * CHUNK + 32 - wolf.pos.z);
      const want = d > 132 ? 'far' : d < 116 ? 'near' : chunk.lod;
      if (want !== chunk.lod) lodWanted.push([d, chunk, want]);
    }
    lodWanted.sort((a, b) => a[0] - b[0]);
    let n2 = 0;
    for (let i = 0; i < lodWanted.length && n2 < 3; i++) if (lodWanted[i][2] === 'near') { buildChunkVeg(lodWanted[i][1], false); n2++; }   // closest first: visual pop-in
    for (let i = lodWanted.length - 1; i >= 0 && n2 < 5; i--) if (lodWanted[i][2] === 'far') { buildChunkVeg(lodWanted[i][1], true); n2++; }        // farthest first: perf
  }
  let budget = 2;
  while (budget-- > 0 && genQueue.length) {
    const c = genQueue.shift();
    genChunk(c.cx, c.cz);
  }
}

/* ---------------- nearest pickup / gathering ---------------- */
function nearestPickup() {
  if (caveState.in) {                 // underground: the cave's own trove
    let best = null, bestD = 2.7;
    for (const p of caveState.pickups) {
      if (p.gathered) continue;
      const d = Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z, (p.y - wolf.pos.y) * 0.7);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  let best = null, bestD = 2.7;
  if (meteorSite) for (const p of meteorSite.loose) {
    if (p.gathered) continue;
    const d = Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z, (p.y - wolf.pos.y) * 0.7);
    if (d < bestD) { bestD = d; best = p; }
  }
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const ch = chunks.get(ck(ccx + dx, ccz + dz));
      if (!ch) continue;
      for (const p of ch.pickups) {
        if (p.gathered) continue;
        const d = Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z, (p.y - wolf.pos.y) * 0.7);
        if (d < bestD) { bestD = d; best = p; }
      }
    }
  return best;
}
function gather(p) {
  const def = PICKUP_DEF[p.type];
  p.gathered = true;
  if (p.type === 'caveEnter') { enterCave(p.lm); return; }
  if (p.type === 'caveExit') { exitCave(); return; }
  if (p.mesh && p.mesh.setMatrixAt) {
    p.mesh.setMatrixAt(p.idx, zeroM);
    p.mesh.instanceMatrix.needsUpdate = true;
  } else if (p.mesh) p.mesh.visible = false;
  if (p.type === 'magicShroom') {
    stats.gathered++;
    wolf.flyT = 10;
    wolf.vy = 0;
    pool.burst(V3(p.x, p.y + 0.6, p.z), 24, 0xb07aff, 1.2, 3.2, 3);
    audio.chime();
    toast('✨ Magic mushroom — flight for 10 seconds!', true);
    return;
  }
  inv[def.inv]++;
  questEvent('gather', { item: def.inv });
  addXp(3);
  stats.gathered++;
  pool.burst(V3(p.x, p.y + 0.4, p.z), 14, def.color, 0.7, 2.4, 2.2);
  toast(`${def.icon} +1 ${def.label.replace('Gather ', '').replace('Pick up ', '').replace('Grab ', '').replace('Pick ', '')}`);
  updateInv();
}

/* ---------------- wolf sense ---------------- */
let senseT = 0, senseTick = 0, discoverTick = 1;
/* ---- senses: the wolf reads the ground — tracks, scent, blood ---- */
const SENSE = { scents: [], tracks: [], hearT: 0, trampleT: 0 };
let scentCloud = null, trackMarks = null;
function ensureSenseMeshes() {
  if (!scentCloud) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(160 * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(160 * 3), 3));
    scentCloud = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    scentCloud.frustumCulled = false; scentCloud.visible = false; scentCloud.renderOrder = 5;
    scene.add(scentCloud);
  }
  if (!trackMarks) {
    trackMarks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.52), new THREE.MeshBasicMaterial({ color: 0x241f1c, transparent: true, opacity: 0.5, depthWrite: false }), 140);
    trackMarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    trackMarks.frustumCulled = false; trackMarks.visible = false; trackMarks.renderOrder = 4;
    scene.add(trackMarks);
  }
}
const SCENT_COL = { prey: [0.42, 0.85, 0.5], pred: [1, 0.32, 0.25], blood: [0.75, 0.08, 0.08], rival: [0.72, 0.5, 0.95] };
function updateSenseFX() {          // paint tracks & scent while the sense burns
  ensureSenseMeshes();
  const on = senseT > 0 && !caveState.in;
  scentCloud.visible = on; trackMarks.visible = on;
  if (!on) return;
  const pos = scentCloud.geometry.attributes.position, col = scentCloud.geometry.attributes.color;
  const now = tSec;
  let n = 0;
  for (const sc of SENSE.scents) {
    if (n >= 160) break;
    const age = (now - sc.t) / 60;                     // scent fades over a minute
    if (age > 1) continue;
    pos.setXYZ(n, sc.x, groundAt(sc.x, sc.z) + 0.35, sc.z);
    const c = SCENT_COL[sc.k], f = (1 - age) * 0.95;
    col.setXYZ(n, c[0] * f, c[1] * f, c[2] * f);
    n++;
  }
  scentCloud.geometry.setDrawRange(0, n);
  pos.needsUpdate = true; col.needsUpdate = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  let m = 0;
  for (const tr of SENSE.tracks) {
    if (m >= 140) break;
    const age = (now - tr.t) / 90;
    if (age > 1) continue;
    P.set(tr.x, groundAt(tr.x, tr.z) + 0.04, tr.z);
    E.set(-Math.PI / 2, 0, -tr.dir); Q.setFromEuler(E);
    M.compose(P, Q, S1);
    trackMarks.setMatrixAt(m++, M);
  }
  trackMarks.count = m;
  trackMarks.instanceMatrix.needsUpdate = true;
}
function updateSensesTick() {       // slow tick: the world leaves its marks
  let hear = null, hearD = 58;
  for (const ch of chunks.values()) {
    if (Math.abs(ch.cx * CHUNK + 32 - wolf.pos.x) > 90 || Math.abs(ch.cz * CHUNK + 32 - wolf.pos.z) > 90) continue;
    for (const a of ch.animals.concat(ch.predators)) {
      if (a.dead) continue;
      const d = Math.hypot(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z);
      if (d > 80) continue;
      const lx = a._lx !== undefined ? a._lx : a.pos.x, lz = a._lz !== undefined ? a._lz : a.pos.z;
      const moved = Math.hypot(a.pos.x - lx, a.pos.z - lz);
      const mvDir = Math.atan2(a.pos.x - lx, a.pos.z - lz);
      a._lx = a.pos.x; a._lz = a.pos.z;
      // tracks in snow and soft ground — stride by stride
      a._trAcc = (a._trAcc || 0) + moved;
      if (a._trAcc > 2.2) { a._trAcc = 0; SENSE.tracks.push({ x: a.pos.x, z: a.pos.z, dir: mvDir, t: tSec }); if (SENSE.tracks.length > 140) SENSE.tracks.shift(); }
      // scent: everything that breathes leaves one
      a._scT = (a._scT || 0) - 0.6;
      if (a._scT <= 0) {
        a._scT = a.sp.huntsWolf ? 3 : 4.5;
        SENSE.scents.push({ x: a.pos.x, z: a.pos.z, k: a.sp.huntsWolf ? 'pred' : 'prey', t: tSec });
        if (SENSE.scents.length > 160) SENSE.scents.shift();
      }
      // blood tells the strongest story
      if (a.injured) {
        SENSE.scents.push({ x: a.pos.x, z: a.pos.z, k: 'blood', t: tSec });
        if (SENSE.scents.length > 160) SENSE.scents.shift();
        if (d < 60 && Math.random() < 0.5) pool.burst(V3(a.pos.x, a.pos.y + 0.3, a.pos.z), 1, 0x8f1414, 0.5, 0.9, 1.2);
      }
      // hearing: the closest thing that moves
      if (moved > 0.4 && d < hearD) { hearD = d; hear = a; }
    }
  }
  for (const r of rivals) {          // other wolves pass through
    if (r.dead) continue;
    if (Math.hypot(r.pos.x - wolf.pos.x, r.pos.z - wolf.pos.z) < 80) {
      SENSE.scents.push({ x: r.pos.x, z: r.pos.z, k: 'rival', t: tSec });
      if (SENSE.scents.length > 160) SENSE.scents.shift();
    }
  }
  // you hear it before you see it
  SENSE.hearT -= 0.6;
  if (hear && (senseT > 0 ? hearD < 58 : hearD < 24) && SENSE.hearT <= 0) {
    SENSE.hearT = senseT > 0 ? 1.4 : 4;
    pool.burst(V3(hear.pos.x, hear.pos.y + 1.1, hear.pos.z), 3, 0xf0e6c8, 0.6, 1.1, 0.9);
  }
  // broken vegetation: sprinting through cover
  SENSE.trampleT -= 0.6;
  if (wolf.speed > 9 && !wolf.swimming && coverAt(wolf.pos) > 0.45 && SENSE.trampleT <= 0) {
    SENSE.trampleT = 0.25;
    pool.burst(V3(wolf.pos.x, wolf.pos.y + 0.5, wolf.pos.z), 4, 0x6f8f4a, 0.8, 1.4, 1.6);
  }
}
function updatePawPrints(dt) {
  if (!pawPrints) {
    pawPrints = { list: [], lastD: wolf.distance, side: 1, mesh: null, rebuild: 0 };
    pawPrints.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.24, 0.34), new THREE.MeshBasicMaterial({ color: 0x35302a, transparent: true, opacity: 0.4, depthWrite: false }), 140);
    pawPrints.mesh.frustumCulled = false; pawPrints.mesh.renderOrder = 3;
    scene.add(pawPrints.mesh);
  }
  const P = pawPrints;
  if (!caveState.in && wolf.speed > 1.2 && !wolf.swimming && wolf.flyT <= 0 && wolf.deadT <= 0) {
    const st = groundStepType(wolf.pos.x, wolf.pos.z);
    if (st === 'snow' || st === 'sand' || st === 'ash') {
      if (wolf.distance - P.lastD > 1.05) {
        P.lastD = wolf.distance; P.side = -P.side;
        const bx = wolf.pos.x - Math.sin(wolf.yaw) * 0.5 + Math.cos(wolf.yaw) * 0.16 * P.side;
        const bz = wolf.pos.z - Math.cos(wolf.yaw) * 0.5 - Math.sin(wolf.yaw) * 0.16 * P.side;
        P.list.push({ x: bx, z: bz, y: groundAt(bx, bz) + 0.035, dir: wolf.yaw, t: tSec });
        if (P.list.length > 140) P.list.shift();
      }
    } else P.lastD = wolf.distance;
  }
  P.rebuild -= dt;
  if (P.rebuild <= 0) {
    P.rebuild = 0.5;
    P.list = P.list.filter(p => tSec - p.t < 30);   // the wild heals its surface
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S1 = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3();
    for (let i = 0; i < P.list.length; i++) {
      const p = P.list[i];
      V.set(p.x, p.y, p.z); E.set(-Math.PI / 2, 0, -p.dir); Q.setFromEuler(E);
      M.compose(V, Q, S1); P.mesh.setMatrixAt(i, M);
    }
    P.mesh.count = P.list.length;
    P.mesh.instanceMatrix.needsUpdate = true;
  }
}
function updateSense(dt) {
  discoverTick -= dt;   // discoveries & senses always tick, sense or not
  if (discoverTick <= 0) {
    discoverTick = 0.6;
    updateSensesTick();
    for (const lm of landmarkList) {
      if (lm.found) continue;
      if (Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z) > 19) continue;
      lm.found = true;
      questEvent('discover', { type: lm.type, x: lm.x, z: lm.z });
      addXp(lm.tier === 'epic' ? 60 : lm.tier === 'rare' ? 25 : 10);
      RUN.landmarks++;
      const first = !stats.discoveries.has(lm.type);
      stats.discoveries.add(lm.type);
      if (first) {
        stats.firstFinds++;
        toast(`📍 First discovery: ${lm.label}! ${lm.tier === 'epic' ? '✨ A sight few wolves ever see…' : lm.tier === 'rare' ? 'A rare find.' : ''}`, true);
        if (lm.tier !== 'common') { wolf.hp = Math.min(wolf.maxHp, wolf.hp + 25); wolf.stamina = wolf.maxStam; audio.chime(); }   // the wild rewards curiosity
        music.fanfare();
      } else toast(`📍 ${lm.label}`);
      if (lm.type === 'meteor') grantPerkDeepBite();   // v6.7 BOSS-KIT: the fallen star blesses its finder — Deep Bite (+1 bite, permanent). Fires on every unblessed site discovered (first or not).
    }
  }
  updateSenseFX();
  if (senseT <= 0) return;
  senseT -= dt; senseTick -= dt;
  if (senseTick > 0) return;
  senseTick = 0.45;
  for (const ch of chunks.values()) {
    if (Math.abs(ch.cx * CHUNK + 32 - wolf.pos.x) > 90 || Math.abs(ch.cz * CHUNK + 32 - wolf.pos.z) > 90) continue;
    for (const p of ch.pickups) {
      if (p.gathered) continue;
      if (Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z) < 34)
        pool.burst(V3(p.x, p.y + 0.5, p.z), 1, PICKUP_DEF[p.type].color, 0.3, 0.8, 0.5);
    }
    for (const a of ch.animals) {
      if (!a.dead && a.pos.distanceTo(wolf.pos) < 40) pool.burst(a.pos, 2, 0xff6a4a, 0.8, 1.2, 0.6);
    }
    for (const pr of ch.predators) {
      if (!pr.dead && pr.pos.distanceTo(wolf.pos) < 46) pool.burst(pr.pos, 3, 0xff2020, 1.0, 1.4, 0.7);
    }
  }
}

/* ---------------- weather ---------------- */
const WEATHER_STATES = {
  clear:    { cloud: 0.08, precip: 0,    wind: 0.12, storm: 0, label: 'Clear',    icon: '☀️' },
  fair:     { cloud: 0.32, precip: 0,    wind: 0.3,  storm: 0, label: 'Fair',     icon: '🌤️' },
  overcast: { cloud: 0.82, precip: 0,    wind: 0.5,  storm: 0, label: 'Overcast', icon: '☁️' },
  precip:   { cloud: 0.94, precip: 0.7,  wind: 0.55, storm: 0, label: 'Rain',     icon: '🌧️' },
  storm:    { cloud: 1.0,  precip: 1.0,  wind: 1.0,  storm: 1, label: 'Storm',    icon: '⛈️' }
};
const weather = { cloud: 0.3, rain: 0, snow: 0, wind: 0.3, storm: 0, label: 'Fair', icon: '🌤️', timer: 25 };
const weatherT = { cloud: 0.3, rain: 0, snow: 0, wind: 0.3, storm: 0, label: 'Fair', icon: '🌤️' };
let lightningT = 6, flash = 0;

/* ---- living populations: the world keeps count, and life comes back ---- */
const ECO_POP = {}, ECO_CAP = {};
(function initEco() {
  for (const bi in SPECIES_TABLE)
    for (const [k, w] of SPECIES_TABLE[bi]) {
      if (ECO_CAP[k] !== undefined) continue;
      const herd = (ECO[k] && ECO[k].herd) || 1;
      ECO_CAP[k] = herd >= 3 ? 34 : herd === 2 ? 26 : 18;
      ECO_POP[k] = ECO_CAP[k];   // the world begins full of life
    }
})();
let ecoT = 0;
function updateEco(dt) {
  ecoT -= dt;
  if (ecoT > 0) return;
  ecoT = 12;
  for (const k in ECO_CAP) {
    const pop = ECO_POP[k], cap = ECO_CAP[k];
    if (pop >= cap || pop <= 0) continue;
    if (Math.random() < 0.16 * SEASON.birth * (0.35 + 0.65 * pop / cap)) {
      ECO_POP[k]++;
      // a birth the player can witness: near a live herd
      let parent = null;
      for (const ch of chunks.values())
        for (const a of ch.animals)
          if (!a.dead && a.name === k && !a.young && a.pos.distanceTo(wolf.pos) < 150 && !caveState.in) { parent = a; break; }
      if (parent && animalTotal < 46) {
        const fawn = new Animal(k, parent.pos.x + 1.5, parent.pos.z + 1, { young: true, herd: parent.herd });
        parent.herd && parent.herd.members && parent.herd.members.push(fawn);
        const chp = chunks.get(ck(Math.floor(fawn.pos.x / CHUNK), Math.floor(fawn.pos.z / CHUNK)));
        if (chp) { chp.animals.push(fawn); if (fawn.pos.distanceTo(wolf.pos) < 90) toast(`🌱 A ${fawn.sp.label.toLowerCase()} is born — the herd grows`); }
        else fawn.dispose();
      }
    }
  }
}
function ecoPredation(prey, pr) {          // the wild feeds itself
  if (prey.dead || pr.dead) return;
  if (Math.hypot(prey.pos.x - pr.pos.x, prey.pos.z - pr.pos.z) > 7) return;
  if (Math.random() > 0.02) return;        // most hunts fail
  prey.dieSilently();                      // herd panics, no loot — the wild feeds itself
  pr.hunger = Math.max(0, pr.hunger - 45);
}
/* ---- the turning year: seasons ride the existing day counter ---- */
const SEASON_LEN = 3;   // game days per season → a 12-day year
const SEASONS = [
  { id: 'spring', name: 'Spring', icon: '🌸', temp: 0.06, rain: 0.18, birth: 2.4, tag: 'Rain returns. The herds give birth.' },
  { id: 'summer', name: 'Summer', icon: '☀️', temp: 0.2,  rain: 0.02, birth: 1.5, tag: 'Long warm days. Life is plentiful.' },
  { id: 'autumn', name: 'Autumn', icon: '🍁', temp: -0.06, rain: 0.06, birth: 0.5, tag: 'The great herds move. Gather what you can.' },
  { id: 'winter', name: 'Winter', icon: '❄️', temp: -0.26, rain: 0.02, birth: 0.15, tag: 'The land sleeps. Hunt wisely.' }
];
const SEASON = { i: -1, id: 'summer', icon: '☀️', birth: 1, rain: 0 };
function updateSeasons() {
  const total = dayCount + tDay;
  const i = Math.floor(total / SEASON_LEN) % 4;
  if (i === SEASON.i) return;
  const first = SEASON.i === -1;
  SEASON.i = i;
  const sn = SEASONS[i];
  SEASON.id = sn.id; SEASON.icon = sn.icon; SEASON.birth = sn.birth; SEASON.rain = sn.rain;
  SEASON_TEMP_BIAS = sn.temp;
  if (!first) toast(`${sn.icon} ${sn.name} — ${sn.tag}`, true);
}
function pickWeather() {
  const h = heightAt(wolf.pos.x, wolf.pos.z);
  const cl = climateAt(wolf.pos.x, wolf.pos.z, h);
  let cold = cl.temp < -0.18;
  // biome weather bias (BIOME_CONFIG.weather at the dominant biome)
  const dom = dominantBiomeAt(wolf.pos.x, wolf.pos.z);
  const bw = BIOME_CONFIG[dom.key] && BIOME_CONFIG[dom.key].weather;
  if (bw) {
    if (bw.snow && (dom.w.tundra + dom.w.taiga + dom.w.mountain + dom.w.highland) > 0.45) cold = true;
    if (bw.fog && Math.random() < bw.fog) weatherT.mistBias = 1; else weatherT.mistBias = 0;
    if (bw.clear && Math.random() < bw.clear) weatherT.cloud = Math.min(weatherT.cloud, 0.25);
  } else weatherT.mistBias = 0;
  const r = Math.random() - (SEASON.rain || 0);   // spring skies lean wet
  let st;
  if (r < 0.26) st = 'clear';
  else if (r < 0.55) st = 'fair';
  else if (r < 0.74) st = 'overcast';
  else if (r < 0.92) st = cold ? 'precip' : (Math.random() < 0.3 ? 'storm' : 'precip');
  else st = cold ? 'precip' : 'storm';
  const w = WEATHER_STATES[st];
  weatherT.cloud = w.cloud; weatherT.storm = w.storm; weatherT.wind = w.wind;
  const amount = 0.55 + Math.random() * 0.35;
  if (w.precip > 0) {
    if (cold) { weatherT.snow = amount; weatherT.rain = 0; weatherT.label = 'Snow'; weatherT.icon = '🌨️'; }
    else { weatherT.rain = amount; weatherT.snow = 0; weatherT.label = w.label; weatherT.icon = w.icon; }
  } else { weatherT.rain = 0; weatherT.snow = 0; weatherT.label = w.label; weatherT.icon = w.icon; }
  weather.timer = 40 + Math.random() * 75;
}
function waterYNow() { return WATER_Y + WORLD_EVENTS.floodH; }

/* ============================================================
   Dynamic world events — an unpredictable director rolls rare,
   dramatic events: storms, blizzards, floods, forest fires,
   great migrations, rival wolf packs. Weather becomes gameplay.
   ============================================================ */
let meteorSite = null;
function makeMeteorSite(ix, iz) {   // star-metal on the earth
  const g = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4c4650, emissive: 0xb06a2a, emissiveIntensity: 0.35, roughness: 0.8 });
  for (let i = 0; i < 5; i++) {
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.7, 0), rockMat);
    const a = Math.random() * 6.28, r = Math.random() * 3.2;
    rk.position.set(ix + Math.sin(a) * r, heightAt(ix + Math.sin(a) * r, iz + Math.cos(a) * r) + 0.15, iz + Math.cos(a) * r);
    rk.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(rk);
  }
  const pit = new THREE.Mesh(new THREE.CircleGeometry(4.4, 16), new THREE.MeshStandardMaterial({ color: 0x2a2422, roughness: 1 }));
  pit.rotation.x = -Math.PI / 2; pit.position.set(ix, heightAt(ix, iz) + 0.02, iz);
  g.add(pit);
  scene.add(g);
  pool.burst(V3(ix, heightAt(ix, iz) + 1, iz), 30, 0xffb36a, 2, 4, 3);
  const lm = { type: 'meteor', x: ix, z: iz, model: g, chunkKey: null, ember: null, mist: null, found: false, tier: 'rare', label: 'Fallen Star', mapIcon: '☄️' };
  landmarkList.push(lm);
  const loose = [];
  const drop = (type, x, z) => {
    const geo = PICKUP_GEO[type];
    const m = new THREE.Mesh(geo, type === 'magicShroom' ? matMagic : matVeg);
    m.position.set(x, heightAt(x, z) + 0.05, z);
    g.add(m);
    loose.push({ type, x, y: heightAt(x, z), z, gathered: false, mesh: m });
  };
  for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, r = 1 + Math.random() * 2.6; drop('stoneP', ix + Math.sin(a) * r, iz + Math.cos(a) * r); }
  drop('magicShroom', ix + 2.4, iz - 1.5);
  meteorSite = { group: g, lm, loose, ttl: 300 };
  toast('💥 The star struck the earth — seek the fall site!', true);
}
const WORLD_EVENTS = {
  active: null, name: null, t: 0, dur: 0, auroraBoost: 1,
  cooldown: 60 + Math.random() * 60,
  rollT: 12,
  fireAt: null,     // { x, z, r } while a fire burns
  floodH: 0,        // river swell in metres
  chill: 0,         // blizzard cold (subtracted from felt temperature)
  pack: null,
  update(dt) {
    if (this.active) {
      this.t += dt;
      this.active.tick(dt, this.t);
      if (this.t >= this.dur || this.active.done) this.end();
      return;
    }
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    this.rollT -= dt;
    if (this.rollT <= 0) {
      this.rollT = 14 + Math.random() * 10;
      const ev = this.pickEvent();
      if (ev) this.start(ev.name, ev.make());
    }
  },
  pickEvent() {    // weighted by where you are and what the sky is doing
    const dom = dominantBiomeAt(wolf.pos.x, wolf.pos.z);
    const k = dom.key, w = dom.w;
    const opts = [];
    const push = (name, wt, make) => { if (wt > 0 && !this.recent.includes(name)) opts.push({ name, wt, make }); };
    push('storm', 1.0, () => EVENTS.storm());
    push('rivalPack', (typeof QUESTS !== 'undefined' && QUESTS.active.some(q => q.kind === 'rival')) ? 2.6 : 0.85, () => EVENTS.rivalPack());   // a deed to drive them off calls the pack
    push('migration', (w.forest || 0) + (w.taiga || 0) + (w.meadow || 0) + (w.grove || 0) > 0.5 ? 0.8 : 0.15, () => EVENTS.migration());
    push('blizzard', (k === 'tundra' || k === 'taiga' || k === 'mountain' || k === 'highland') ? 0.9 : (weather.snow > 0.2 ? 0.5 : 0.08), () => EVENTS.blizzard());
    push('fire', weather.rain < 0.15 && dayF > 0.4 && ((w.forest || 0) + (w.grove || 0) + (w.taiga || 0) > 0.55) ? 0.7 : 0, () => EVENTS.fire());
    push('flood', (weather.rain > 0.45 || weather.storm > 0.5) ? 0.8 : 0.05, () => EVENTS.flood());
    // mysticism: only at night, only rarely — wonder must stay wondrous
    if (dayF < 0.25 && !caveState.in) {
      push('aurora', 0.17, () => EVENTS.aurora());
      push('meteor', 0.13, () => EVENTS.meteor());
      push('whiteStag', 0.15, () => EVENTS.whiteStag());
    }
    if (!opts.length) return null;
    let tot = 0; for (const o of opts) tot += o.wt;
    let r = Math.random() * tot;
    for (const o of opts) { r -= o.wt; if (r <= 0) return o; }
    return opts[opts.length - 1];
  },
  recent: [],
  start(name, ev) {
    this.active = ev; this.name = name; this.t = 0; this.dur = ev.dur;
    this.recent.unshift(name); if (this.recent.length > 3) this.recent.pop();
    if (ev.begin) ev.begin();
  },
  end() {
    if (this.active && this.active.finish) this.active.finish();
    this.active = null; this.name = null;
    this.fireAt = null; this.chill = 0; this.auroraBoost = 1;
    this.cooldown = 110 + Math.random() * 90;   // the world holds its breath
  },
  force(name) {   // tests & debugging
    const ev = EVENTS[name]();
    this.start(name, ev);
    return this.name === name;
  }
};

const EVENTS = {
  storm() {
    return {
      dur: 100 + Math.random() * 50,
      begin() {
        weatherT.cloud = 1; weatherT.storm = 1; weatherT.wind = 0.95;
        weatherT.rain = 0.8; weatherT.snow = 0;
        weather.timer = this.dur + 10;   // the sky stays committed
        toast('🌩️ A storm rolls in — seek shelter!', true);
      },
      tick() { weather.timer = Math.max(weather.timer, 20); }
    };
  },
  blizzard() {
    return {
      dur: 90 + Math.random() * 50,
      begin() {
        weatherT.cloud = 1; weatherT.storm = 0.3; weatherT.wind = 1;
        weatherT.snow = 1; weatherT.rain = 0;
        weather.timer = this.dur + 10;
        WORLD_EVENTS.chill = 0.55;
        toast('❄️ Blizzard! The world turns white — keep moving!', true);
      },
      tick() { weather.timer = Math.max(weather.timer, 20); },
      finish() { WORLD_EVENTS.chill = 0; }
    };
  },
  flood() {
    return {
      dur: 130 + Math.random() * 50, phase: 0,
      begin() {
        weatherT.cloud = 1; weatherT.rain = 0.85; weatherT.storm = 0.5; weatherT.wind = 0.7;
        weather.timer = this.dur + 10;
        toast('🌊 Heavy rains — the rivers are rising!', true);
        this.plane = new THREE.Mesh(
          new THREE.PlaneGeometry(1500, 1500),
          new THREE.MeshStandardMaterial({ color: 0x4a708c, transparent: true, opacity: 0.0, roughness: 0.3, metalness: 0, depthWrite: false })
        );
        this.plane.rotation.x = -Math.PI / 2;
        this.plane.renderOrder = 1;
        scene.add(this.plane);
      },
      tick(dt, t) {
        if (t < 35) WORLD_EVENTS.floodH = Math.min(1.55, WORLD_EVENTS.floodH + dt * 0.05);
        else if (WORLD_EVENTS.dur - t < 30) { WORLD_EVENTS.floodH = Math.max(0, WORLD_EVENTS.floodH - dt * 0.06); }
        this.plane.position.set(wolf.pos.x, WATER_Y + WORLD_EVENTS.floodH, wolf.pos.z);
        this.plane.material.opacity = Math.min(0.55, WORLD_EVENTS.floodH * 0.4);
      },
      finish() {
        WORLD_EVENTS.floodH = 0;
        scene.remove(this.plane);
        this.plane.geometry.dispose(); this.plane.material.dispose();
        toast('🌊 The flood recedes.');
      }
    };
  },
  fire() {
    // find a wooded patch to ignite
    let spot = null;
    for (let i = 0; i < 60 && !spot; i++) {
      const a = Math.random() * 6.28, d = 60 + Math.random() * 70;
      const x = wolf.pos.x + Math.sin(a) * d, z = wolf.pos.z + Math.cos(a) * d;
      const h = heightAt(x, z), cl = climateAt(x, z, h);
      const w = biomeWeights(x, z, h, cl.temp, cl.moist);
      if (h < 1.5 || (w.forest || 0) + (w.grove || 0) + (w.taiga || 0) < 0.5) continue;
      const ch = chunks.get(Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK));
      if (!ch || !ch.veg || ch.veg.trees.length < 8) continue;   // ignite where there is fuel
      spot = { x, z };
    }
    if (!spot) return { dur: 1, tick() { } };
    return {
      dur: 200, r: 3, maxR: 30 + Math.random() * 12, charT: 0,
      begin() {
        WORLD_EVENTS.fireAt = { x: spot.x, z: spot.z, r: this.r };
        toast('🔥 Forest fire! The flames spread on the wind!', true);
      },
      tick(dt) {
        const f = WORLD_EVENTS.fireAt;
        f.r += (weather.rain > 0.4 ? -0.8 : 0.3) * dt;   // rain beats it back
        if (f.r <= 1 || f.r > this.maxR) { this.done = true; return; }
        // panic ripples ahead of the flames
        for (const ch of chunks.values()) for (const a of ch.animals) {
          if (a.dead || a.state === 'flee') continue;
          const d = Math.hypot(a.pos.x - f.x, a.pos.z - f.z);
          if (d < f.r + 45) a.startFlee(f);
        }
        // embers & smoke
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * 6.28, rr = Math.random() * f.r;
          const px = f.x + Math.sin(a) * rr, pz = f.z + Math.cos(a) * rr;
          pool.burst(V3(px, heightAt(px, pz) + 1 + Math.random() * 3, pz), 2, Math.random() < 0.6 ? 0xff7020 : 0x2a2622, 1.4, 2.2, 1.8);
        }
        this.charT -= dt;
        if (this.charT <= 0) { this.charT = 1.2; charVegetation(f.x, f.z, f.r); }
      },
      finish() {
        WORLD_EVENTS.fireAt = null;
        toast('🔥 The fire burns itself out.');
      }
    };
  },
  migration() {
    const herd = { members: [], route: [] };
    return {
      dur: 260,
      begin() {
        // a route that crosses near the player: start 190 m out, waypoints past them
        const th = Math.random() * 6.28;
        const px = Math.cos(th), pz = -Math.sin(th);          // travel direction
        const sx = wolf.pos.x - px * 190 + pz * 60, sz = wolf.pos.z - pz * 190 - px * 60;
        for (let i = 0; i < 6; i++) herd.route.push({ x: sx + px * i * 90, z: sz + pz * i * 90 });
        const dom = dominantBiomeAt(wolf.pos.x, wolf.pos.z);
        const kind = (dom.w.taiga || 0) + (dom.w.tundra || 0) > 0.4 ? 'reindeer' : 'deer';
        const cx0 = Math.floor(sx / CHUNK) + ',' + Math.floor(sz / CHUNK);
        let ch = chunks.get(cx0) || [...chunks.values()][0];
        for (let i = 0; i < 16; i++) {
          const a = new Animal(kind, sx + (Math.random() - 0.5) * 26, sz + (Math.random() - 0.5) * 26, { herd, leader: i === 0, adult: i < 3 || Math.random() < 0.7 });
          if (a.pos.y < WATER_Y + 0.5) { a.dispose(); continue; }
          herd.members.push(a); ch.animals.push(a);
          a.setState('migrate');
        }
        this.count = () => herd.members.filter(m => !m.dead).length;
        audio.howl(0.55);
        toast('🦌 A great migration passes through — follow the herd!', true);
      },
      tick() {
        const alive = this.count ? this.count() : 0;
        if (!alive || !herd.route) this.done = true;
      },
      finish() { delete herd.route; }
    };
  },
  aurora() {                // the sky itself performs
    return {
      dur: 85,
      begin() {
        WORLD_EVENTS.auroraBoost = 2.35;
        toast('🌌 The northern sky ignites — the lights dance tonight!', true);
        audio.howl(0.8);
        setTimeout(() => audio.ready && audio.howl(0.62), 2600);
      },
      tick() { },
      finish() { WORLD_EVENTS.auroraBoost = 1; }
    };
  },
  meteor() {                // a star falls
    const ev = { dur: 34, t: 0, impacted: false, streak: null, from: null, to: null };
    return {
      dur: 34,
      begin() {
        const a = Math.random() * 6.28;
        ev.from = { x: wolf.pos.x + Math.sin(a) * 420, y: 240, z: wolf.pos.z + Math.cos(a) * 420 };
        ev.to = { x: wolf.pos.x + Math.sin(a + 0.9) * (170 + Math.random() * 80), y: 0, z: wolf.pos.z + Math.cos(a + 0.9) * (170 + Math.random() * 80) };
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        sp.scale.set(26, 26, 1);
        sp.position.set(ev.from.x, ev.from.y, ev.from.z);
        scene.add(sp);
        ev.streak = sp;
        toast('🌠 A star falls beyond the trees…', true);
      },
      tick(dt) {
        ev.t += dt;
        const k = Math.min(1, ev.t / 3.2);
        ev.streak.position.set(ev.from.x + (ev.to.x - ev.from.x) * k, ev.from.y + (ev.to.y - ev.from.y) * k, ev.from.z + (ev.to.z - ev.from.z) * k);
        ev.streak.material.opacity = 1 - Math.max(0, k - 0.75) * 4;
        if (k >= 1 && !ev.impacted) {
          ev.impacted = true;
          scene.remove(ev.streak);
          const ix = ev.to.x, iz = ev.to.z;
          if (heightAt(ix, iz) > 1.2) makeMeteorSite(ix, iz);
          else this.done = true;
        }
      },
      finish() { if (ev.streak) scene.remove(ev.streak); }
    };
  },
  whiteStag() {             // old magic walks
    const ev = { stag: null, seen: false };
    return {
      dur: 300,
      begin() {
        let x = wolf.pos.x, z = wolf.pos.z;
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * 6.28, d = 110 + Math.random() * 60;
          x = wolf.pos.x + Math.sin(a) * d; z = wolf.pos.z + Math.cos(a) * d;
          if (heightAt(x, z) > 1.5) break;
        }
        const st = new Animal('reindeer', x, z, { adult: true });
        st.luminous = true;
        st.model.traverse(o => {
          if (o.isMesh && o.material && o.material.color) {
            o.material = o.material.clone();
            o.material.color.lerp(new THREE.Color(0xf2f6ff), 0.8);
            o.material.emissive = new THREE.Color(0x8fd0ff);
            o.material.emissiveIntensity = 0.42;
          }
        });
        st.aware = 0;
        const ch = chunks.get(Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK)) || [...chunks.values()][0];
        if (ch) ch.animals.push(st);
        ev.stag = st;
        stats.discoveries.add('whiteStag');
      },
      tick() {
        const st = ev.stag;
        if (!st || st.dead) { this.done = true; return; }
        if (!ev.seen && st.aware >= 0.5 && st.pos.distanceTo(wolf.pos) < 70) {
          ev.seen = true;
          toast('🦌 A white stag! Old magic walks these woods — follow it.', true);
          audio.chime();
        }
        // v6.7 BOSS-KIT: the stag blesses the wolf it lets come close (12 m) — Wild-Hardened, once ever.
        if (!wolf.perks.wildHardened && st.pos.distanceTo(wolf.pos) < 12) {
          grantPerkWildHardened();
          st.startFlee(wolf.pos);   // the blessing given, old magic is gone like a breath
        }
      },
      finish() { const st = ev.stag; if (st && !st.dead) st.dispose(); }
    };
  },
  rivalPack() {
    return {
      dur: 240,
      begin() {
        let x = 0, z = 0;
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * 6.28, d = 150 + Math.random() * 90;   // near enough that a brave howl can reach them
          x = wolf.pos.x + Math.sin(a) * d; z = wolf.pos.z + Math.cos(a) * d;
          if (heightAt(x, z) > 1.2) break;
        }
        WORLD_EVENTS.pack = new RivalPack(x, z);
        toast(`🐺 A Level ${WORLD_EVENTS.pack.level} pack prowls these lands… your howl might reach them.`, true);
      },
      tick(dt) {
        const p = WORLD_EVENTS.pack;
        if (!p) { this.done = true; return; }
        if (p.stance === 'bonded') { this.done = true; return; }   // sworn packs are PACK's to move now — the event lets go
        p.update(dt, tSec);
        if (p.disbanded) {
          p.dispose();
          for (let i = rivals.length - 1; i >= 0; i--) if (rivals[i].dead) rivals.splice(i, 1);
          WORLD_EVENTS.pack = null;
          this.done = true;
        }
      },
      finish() {
        const p = WORLD_EVENTS.pack;
        if (p && p.stance !== 'bonded') { p.dispose(); WORLD_EVENTS.pack = null; }   // never strike down the player's own pack
        for (let i = rivals.length - 1; i >= 0; i--) { const r = rivals[i]; if (!(r.pack && r.pack.stance === 'bonded')) rivals.splice(i, 1); }
      }
    };
  }
};

function charVegetation(fx, fz, fr) {   // scorched earth: char trunks, blacken ground
  const fr2 = fr * fr;
  for (const ch of chunks.values()) {
    const dx = ch.cx * CHUNK + 32 - fx, dz = ch.cz * CHUNK + 32 - fz;
    if (dx * dx + dz * dz > (fr + 70) * (fr + 70)) continue;
    // tree canopies -> charcoal instances
    if (ch.vegItems && ch.lod === 'near') {
      for (const k in ch.vegItems.trees) {
        const arr = ch.vegItems.trees[k];
        let mesh = null;
        for (const m of ch.vegMeshes) if (m.userData.species === k) { mesh = m; break; }
        if (!mesh || !mesh.instanceColor) continue;
        let touched = false;
        for (let i = 0; i < arr.length; i++) {
          const it = arr[i];
          const key = k + ':' + i;
          if (ch.charred && ch.charred.has(key)) continue;
          const ddx = it.x - fx, ddz = it.z - fz;
          if (ddx * ddx + ddz * ddz > fr2) continue;
          mesh.setColorAt(i, _c3.setRGB(0.16 + Math.random() * 0.05, 0.13 + Math.random() * 0.04, 0.11 + Math.random() * 0.04));
          touched = true;
          if (!ch.charred) ch.charred = new Set();
          ch.charred.add(key);
        }
        if (touched) mesh.instanceColor.needsUpdate = true;
      }
    }
    // ground -> ash
    if (ch.geo && ch.geo.attributes.color) {
      const pos = ch.geo.attributes.position, col = ch.geo.attributes.color;
      let touched = false;
      for (let i = 0; i < pos.count; i++) {
        const ddx = pos.getX(i) - fx, ddz = pos.getZ(i) - fz;
        if (ddx * ddx + ddz * ddz > fr2) continue;
        if (ch.scorched && ch.scorched.has(i)) continue;
        col.setXYZ(i, col.getX(i) * 0.3, col.getY(i) * 0.28, col.getZ(i) * 0.26);
        touched = true;
        if (!ch.scorched) ch.scorched = new Set();
        ch.scorched.add(i);
      }
      if (touched) col.needsUpdate = true;
    }
  }
}

/* ============================================================
   Caves & the underground — enter through a cave mouth (E),
   descend into a living cavern: crystals, pools, mushrooms,
   rare stones… and things that sleep in the dark.
   ============================================================ */
const caveState = {
  in: false, group: null, y0: 0, R: 26, cx: 0, cz: 0, variant: 'cave',
  pickups: [], predators: [], lights: [], poolAt: null, entrance: null,
  reentryCd: 0, dripT: 2, discovered: false
};
function groundAt(x, z) { return caveState.in ? caveFloorAt(x, z) : heightAt(x, z); }
/* ---- solids: big trunks & boulders block the wolf — the world has edges you can run into ---- */
const SOLID_TRUNK_R = {   // base trunk (bottom) radius per species, × instance sx
  spruce: 0.18, snowSpruce: 0.18, pine: 0.2, birch: 0.12, autumnBirch: 0.12, rowan: 0.11,
  oak: 0.3, deadTree: 0.17, spruceTall: 0.34, pineTall: 0.42, oakTall: 0.6, birchTall: 0.2,
  fir: 0.2, deadPine: 0.4
};
const WOLF_BODY_R = 0.55;
function collideSolids(w, dx, dz) {
  if (w.flyT > 0) return;                    // magic flight passes the trunks
  const worst = pushOutSolids(w, dx, dz);
  if (worst >= 0) return;                    // grazed nothing solid
  const spd0 = w.speed;
  if (worst < -0.8) w.speed *= 0.22;         // head-on: the world says no
  else w.speed *= Math.min(1, 1 + worst * 1.2);   // glancing: scrub a little, slide along
  // full-speed crash into wood or stone bites a little
  if (worst < -0.82 && spd0 > 10.5 && w.impactCd <= 0 && w.deadT <= 0) {
    w.impactCd = 1.5;
    w.hp = Math.max(1, w.hp - 4);
    w.lastHurt = tSec;
    w.invulnT = Math.max(w.invulnT || 0, 0.3);
    vignetteA = Math.min(0.5, vignetteA + 0.3);
    audio.thud();
    pool.burst(w.pos, 9, 0xa89478, 1.2, 2, 1.8);
    if (tSec - (w.impactToastT || -9) > 8) { w.impactToastT = tSec; toast('💥 Crashed at full speed! −4 HP — watch the trees and rocks'); }
  }
}
function pushOutSolids(o, dx, dz) {          // circles push a body out; returns most head-on normal hit
  const R = o.bodyR || WOLF_BODY_R;
  let worst = 0;
  if (caveState.in) {
    for (const so of caveState.solids) {
      const ddx = o.pos.x - so.x; if (ddx > 3.2 || ddx < -3.2) continue;
      const ddz = o.pos.z - so.z; if (ddz > 3.2 || ddz < -3.2) continue;
      const rr = so.r + R, d2 = ddx * ddx + ddz * ddz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.0001, nx = ddx / d, nz = ddz / d;
      o.pos.x += nx * (rr - d); o.pos.z += nz * (rr - d);
      const vn = dx * nx + dz * nz;
      if (vn < worst) worst = vn;
    }
  } else {
    const c0x = Math.floor(o.pos.x / CHUNK), c0z = Math.floor(o.pos.z / CHUNK);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const ch = chunks.get(ck(c0x + a, c0z + b));
      if (!ch || !ch.solids) continue;
      for (const so of ch.solids) {
        const ddx = o.pos.x - so.x; if (ddx > 3.2 || ddx < -3.2) continue;
        const ddz = o.pos.z - so.z; if (ddz > 3.2 || ddz < -3.2) continue;
        const rr = so.r + R, d2 = ddx * ddx + ddz * ddz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 0.0001, nx = ddx / d, nz = ddz / d;
        o.pos.x += nx * (rr - d); o.pos.z += nz * (rr - d);
        const vn = dx * nx + dz * nz;
        if (vn < worst) worst = vn;
      }
    }
  }
  return worst;
}
function groundWaterY() { return caveState.in ? -999 : waterYNow(); }
function caveFloorAt(x, z) {
  let y = caveState.y0 + (fbm(nVar, x * 0.09, z * 0.09, 2) - 0.5) * 0.9;
  if (caveState.poolAt) {
    const d = Math.hypot(x - caveState.poolAt.x, z - caveState.poolAt.z);
    y -= (1 - ss(1.2, 4.6, d)) * 1.35;   // basin
  }
  const dc = Math.hypot(x - caveState.cx, z - caveState.cz);
  y += ss(caveState.R * 0.62, caveState.R * 0.98, dc) * (caveState.R * 0.34);   // walls rise at the rim
  return y;
}
function enterCave(lm) {
  if (caveState.in || caveState.reentryCd > 0 || !lm) return;
  for (const q of QUESTS.active) if (q.kind === 'survive' && q.days && q.have > 0) { q.have = 0; q.prog0 = dayCount; toast('🌗 You den in a cave — the sky-survival count begins again'); questHudDirty = true; }
  const rng = mulberry32((hash2(lm.x | 0, lm.z | 0, SEED ^ 0xc0ffee) >>> 0) || 1234);
  const surfY = heightAt(lm.x, lm.z);
  caveState.in = true;
  caveState.cx = lm.x; caveState.cz = lm.z;
  caveState.y0 = surfY - 34;
  caveState.R = 24 + rng() * 7;
  caveState.variant = rng() < 0.25 ? 'crystal' : 'cave';
  caveState.entrance = { x: lm.x, z: lm.z, y: surfY };
  caveState.pickups = []; caveState.predators = []; caveState.lights = []; caveState.solids = [];
  caveState.discovered = false;
  buildCave(rng);
  for (const ch of chunks.values()) ch.group.visible = false;   // the surface waits, unseen
  wolf.pos.x = lm.x; wolf.pos.z = lm.z + caveState.R * 0.45;
  wolf.pos.y = caveFloorAt(wolf.pos.x, wolf.pos.z) + 0.2;
  wolf.vy = 0;
  pool.burst(wolf.pos, 16, 0x8a7a5a, 1, 2, 2);
  if (caveState.variant === 'crystal') {
    stats.discoveries.add('crystalCave'); stats.firstFinds++;
    toast('💎 A crystal cave! Light that few wolves ever see…', true);
    audio.chime();
  } else toast('🕳️ You slip into the dark…', true);
}
function exitCave() {
  if (!caveState.in) return;
  const e = caveState.entrance;
  caveState.in = false;
  wolf.pos.x = e.x; wolf.pos.z = e.z + 4; wolf.pos.y = e.y + 0.2;
  wolf.vy = 0;
  caveState.reentryCd = 4;
  for (const ch of chunks.values()) ch.group.visible = true;    // the world returns
  disposeCave();
  toast('☀️ Back under the open sky.');
}
function disposeCave() {
  caveState.solids = [];
  for (const ch of chunks.values()) ch.group.visible = true;
  if (caveState.group) {
    caveState.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
    scene.remove(caveState.group);
    caveState.group = null;
  }
  for (const l of caveState.lights) scene.remove(l);
  caveState.lights = [];
  for (const p of caveState.predators) p.dispose();
  caveState.predators = [];
  caveState.pickups = [];
}
function cavePickupMesh(type, x, y, z, rng) {
  const geo = PICKUP_GEO[type]; if (!geo) return null;
  const m = new THREE.Mesh(geo, type === 'magicShroom' ? matMagic : matVeg);
  m.position.set(x, y + 0.05, z);
  m.rotation.y = rng() * 6.28;
  const sc = 0.9 + rng() * 0.5; m.scale.setScalar(sc);
  caveState.group.add(m);
  return m;
}
function buildCave(rng) {
  const g = new THREE.Group();
  caveState.group = g;
  const { y0, R, cx, cz } = caveState;
  // shell — the dark belly of the hill
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 1, metalness: 0, side: THREE.BackSide });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 26, 18), shellMat);
  shell.position.set(cx, y0 + R * 0.62, cz); shell.scale.y = 0.8;
  g.add(shell);
  // rugged floor, matching caveFloorAt
  const SEG2 = 14;
  const floor = new THREE.PlaneGeometry(R * 2.1, R * 2.1, SEG2, SEG2);
  floor.rotateX(-Math.PI / 2);
  const fp = floor.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setY(i, caveFloorAt(cx + fp.getX(i), cz + fp.getZ(i)) - y0);
  const floorMesh = new THREE.Mesh(floor, new THREE.MeshStandardMaterial({ color: 0x554a3d, roughness: 1 }));
  floorMesh.position.set(cx, y0, cz);
  floorMesh.receiveShadow = true;
  g.add(floorMesh);
  const spot = (minR, maxR) => { const a = rng() * 6.28, r = minR + rng() * (maxR - minR); return { x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r }; };
  // rim rocks
  for (let i = 0; i < 8; i++) {
    const sp = spot(R * 0.7, R * 0.95);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + rng() * 1.8, 0), matColor(0x5d564c));
    rock.position.set(sp.x, caveFloorAt(sp.x, sp.z) + 0.4, sp.z); rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    g.add(rock);
    caveState.solids.push({ x: sp.x, z: sp.z, r: 0.95 + (rock.geometry.parameters.radius - 1) * 0.6 });
  }
  // stalagmites & stalactites
  for (let i = 0; i < 9; i++) {
    const sp = spot(R * 0.25, R * 0.8);
    const h2 = 1.2 + rng() * 2.8;
    const st = new THREE.Mesh(new THREE.ConeGeometry(0.4 + rng() * 0.7, h2, 6), matColor(0x6b6258));
    st.position.set(sp.x, caveFloorAt(sp.x, sp.z) + h2 / 2 - 0.2, sp.z);
    g.add(st);
    caveState.solids.push({ x: sp.x, z: sp.z, r: 0.45 });
    if (rng() < 0.7) {
      const sp2 = spot(R * 0.2, R * 0.75);
      const h3 = 1 + rng() * 2.4;
      const ct = new THREE.Mesh(new THREE.ConeGeometry(0.3 + rng() * 0.5, h3, 6), matColor(0x655c52));
      ct.rotation.x = Math.PI; ct.position.set(sp2.x, y0 + R * 0.62 * 0.8 + 2.5 - rng() * 2, sp2.z);
      g.add(ct);
    }
  }
  // crystals — always some, glorious in the crystal variant
  const nCry = caveState.variant === 'crystal' ? 5 + (rng() * 3 | 0) : 1 + (rng() * 2 | 0);
  const cryMat = new THREE.MeshStandardMaterial({ color: 0x7fe8ff, emissive: 0x2a8fa8, emissiveIntensity: 0.9, roughness: 0.25 });
  for (let i = 0; i < nCry; i++) {
    const sp = spot(R * 0.3, R * 0.85);
    const cl = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 + rng() * 0.55), cryMat);
      gem.position.set((rng() - 0.5) * 1.2, rng() * 0.8, (rng() - 0.5) * 1.2);
      gem.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      cl.add(gem);
    }
    cl.position.set(sp.x, caveFloorAt(sp.x, sp.z), sp.z);
    g.add(cl);
    if (caveState.lights.length < 1 && caveState.variant === 'crystal') {
      const pl = new THREE.PointLight(0x5fd8ef, 1.15, 22, 1.6);
      pl.position.set(sp.x, caveFloorAt(sp.x, sp.z) + 1.6, sp.z);
      scene.add(pl); caveState.lights.push(pl);
    }
  }
  // water pool
  if (rng() < 0.62) {
    const sp = spot(R * 0.3, R * 0.6);
    caveState.poolAt = sp;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4.3, 18), new THREE.MeshStandardMaterial({ color: 0x2e5566, transparent: true, opacity: 0.82, roughness: 0.2 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(sp.x, y0 - 0.5, sp.z);
    g.add(pool);
  } else caveState.poolAt = null;
  // mushrooms & loot
  const drop = (type, x, z) => { const m = cavePickupMesh(type, x, caveFloorAt(x, z), z, rng); if (m) caveState.pickups.push({ type, x, y: caveFloorAt(x, z), z, gathered: false, mesh: m }); };
  for (let i = 0, n = 2 + (rng() * 3 | 0); i < n; i++) { const sp = spot(R * 0.25, R * 0.8); drop('mushroom', sp.x, sp.z); }
  if (rng() < 0.55) { const sp = spot(R * 0.3, R * 0.7); drop('magicShroom', sp.x, sp.z); if (rng() < 0.5) drop('magicShroom', sp.x + 1.2, sp.z + 0.8); }
  for (let i = 0, n = 3 + (rng() * 3 | 0); i < n; i++) { const sp = spot(R * 0.3, R * 0.9); drop('stoneP', sp.x, sp.z); }
  for (let i = 0, n = 1 + (rng() * 2 | 0); i < n; i++) { const sp = spot(R * 0.3, R * 0.8); drop('stick', sp.x, sp.z); }
  // a lucky hunter's cache — treasure of the deep dark
  if (rng() < 0.4) {
    const cs = spot(R * 0.5, R * 0.75);
    const cache = new THREE.Group();
    const skullM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), matColor(0xd8d2c4));
    skullM.position.set(0, 0.3, 0); cache.add(skullM);
    for (let i = 0; i < 5; i++) {
      const bn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6 + rng() * 0.4, 4), matColor(0xcfc9bb));
      bn.position.set((rng() - 0.5) * 1.6, 0.08, (rng() - 0.5) * 1.6);
      bn.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.4, rng() * 6.28, 0);
      cache.add(bn);
    }
    cache.position.set(cs.x, caveFloorAt(cs.x, cs.z), cs.z);
    g.add(cache);
    caveState.pickups.push({ type: 'bone', x: cs.x, y: caveFloorAt(cs.x, cs.z), z: cs.z, gathered: false, mesh: null, cache: true });
  }
  // old bones — something fed here
  const bs = spot(R * 0.4, R * 0.7);
  for (let i = 0; i < 4; i++) {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7 + rng() * 0.6, 4), matColor(0xd8d2c4));
    bone.position.set(bs.x + (rng() - 0.5) * 2, caveFloorAt(bs.x, bs.z) + 0.1, bs.z + (rng() - 0.5) * 2);
    bone.rotation.set(Math.PI / 2, rng() * 6.28, 0); g.add(bone);
  }
  // the sleeper in the dark
  if (rng() < 0.45) {
    const sp = spot(R * 0.45, R * 0.6);
    const bear = new Predator('bear', sp.x, sp.z);
    bear.home.x = sp.x; bear.home.z = sp.z;
    bear.pos.y = caveFloorAt(sp.x, sp.z);
    bear.state = 'sleep';
    bear.model.position.copy(bear.pos);
    caveState.predators.push(bear);
  }
  // the way out
  const ex = { x: cx, z: cz + R * 0.82 };
  const exitGlow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 14), new THREE.MeshBasicMaterial({ color: 0x8fb8d8, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  exitGlow.position.set(ex.x, caveFloorAt(ex.x, ex.z) + 2.2, ex.z);
  g.add(exitGlow);
  caveState.pickups.push({ type: 'caveExit', x: ex.x, y: caveFloorAt(ex.x, ex.z), z: ex.z, gathered: false, mesh: null });
  scene.add(g);
}
function caveTick(dt) {
  caveState.reentryCd = Math.max(0, caveState.reentryCd - dt);
  // keep the wolf inside the cavern
  const dc = Math.hypot(wolf.pos.x - caveState.cx, wolf.pos.z - caveState.cz);
  const lim = caveState.R - 2;
  if (dc > lim) {
    const k = lim / dc;
    wolf.pos.x = caveState.cx + (wolf.pos.x - caveState.cx) * k;
    wolf.pos.z = caveState.cz + (wolf.pos.z - caveState.cz) * k;
  }
  // underground predators ride the cave floor, not the surface heightfield
  for (const p of caveState.predators) {
    if (!p.dead) { p.pos.y = caveFloorAt(p.pos.x, p.pos.z); p.model.position.copy(p.pos); }
  }
  // drips & cold
  caveState.dripT -= dt;
  if (caveState.dripT <= 0) { caveState.dripT = 1.5 + Math.random() * 4; audio.drip(); }
  if (wolf.stamina < wolf.maxStam) wolf.stamina = Math.min(wolf.maxStam, wolf.stamina + dt * 0.5);   // still, cold air: slow recovery
}

let envToastT = 0, emberT = 0;
function updateEnvironment(dt) {      // regional hazards: scorching ash, bitter cold, dry heat, mire
  if (state !== 'play' || wolf.deadT > 0) return;
  if (caveState.in) {                 // underground: still air, biting chill, no sky-borne hazards
    wolf.stamina = Math.max(0, wolf.stamina - 0.3 * dt);
    return;
  }
  const h = heightAt(wolf.pos.x, wolf.pos.z);
  const cl = climateAt(wolf.pos.x, wolf.pos.z, h);
  const w = biomeWeights(wolf.pos.x, wolf.pos.z, h, cl.temp, cl.moist);
  envToastT -= dt;
  const ember = volcanicAt(wolf.pos.x, wolf.pos.z);
  if (ember > 0.5 && wolf.pos.y < h + 0.5) {
    emberT += dt;
    if (emberT > 1.2) {               // a breath of grace before the burn
      wolf.hp = Math.max(1, wolf.hp - 2.4 * dt);      // staggers, never kills outright
      wolf.stamina = Math.max(0, wolf.stamina - 6 * dt);
      vignetteA = Math.min(0.7, vignetteA + dt * 0.5);
      if (Math.random() < dt * 2.5) pool.burst(V3(wolf.pos.x, h + 0.3, wolf.pos.z), 2, 0xff8030, 0.9, 1.8, 1.4);
      if (envToastT <= 0) { toast('🌋 Scorching ground — move off the embers!', true); envToastT = 9; }
    }
  } else emberT = 0;
  const felt = cl.temp - WORLD_EVENTS.chill * (wolf.perks.winterCoat ? 0.5 : 1) * (wolf.perks.stormborn ? 0.8 : 1);
  if (felt < -0.5 && dayF < 0.3) {
    wolf.stamina = Math.max(0, wolf.stamina - (1.6 + WORLD_EVENTS.chill * 4) * dt * (wolf.perks.winterCoat ? 0.5 : 1));
    if (envToastT <= 0 && felt < -0.62) { toast('🥶 Bitter cold — keep moving'); envToastT = 22; }
  }
  if (WORLD_EVENTS.name === 'blizzard') {
    wolf.stamina = Math.max(0, wolf.stamina - 0.9 * dt);   // fighting the whiteout
    if (envToastT <= 0 && coverAt(wolf.pos.x, wolf.pos.z) < 0.35) { toast('❄️ The blizzard bites — find the lee of the trees'); envToastT = 18; }
  }
  if (weather.storm > 0.6 && weather.rain > 0.5) {         // exposed in the storm
    const cover = coverAt(wolf.pos.x, wolf.pos.z);
    if (cover < 0.35) {
      wolf.hp = Math.max(20, wolf.hp - 1.1 * dt * (wolf.perks.skywatcher ? 0.5 : 1));          // battered, not slain — storms respect the sky-worn
      wolf.stamina = Math.max(0, wolf.stamina - 2.2 * dt);
      if (envToastT <= 0) { toast('🌩️ The storm batters you — take shelter under cover!'); envToastT = 14; }
    }
  }
  if ((w.dry || 0) > 0.5 && dayF > 0.55) {
    wolf.stamina = Math.max(0, wolf.stamina - 1.1 * dt);
    if (envToastT <= 0) { toast('☀️ The dry heat saps your strength'); envToastT = 22; }
  }
  if ((w.swamp || 0) > 0.55) wolf.stamina = Math.max(0, wolf.stamina - 0.7 * dt);   // wading the mire
}
function updateWeather(dt) {
  weather.timer -= dt;
  if (weather.timer <= 0) pickWeather();
  const k = 1 - Math.exp(-dt / 6.5);
  weather.cloud += (weatherT.cloud - weather.cloud) * k;
  weather.rain += (weatherT.rain - weather.rain) * k;
  weather.snow += (weatherT.snow - weather.snow) * k;
  weather.wind += (weatherT.wind - weather.wind) * k;
  weather.storm += (weatherT.storm - weather.storm) * k;
  if (weather.storm > 0.55 && weather.rain > 0.4) {
    lightningT -= dt;
    if (lightningT <= 0) {
      lightningT = 4 + Math.random() * 9;
      flash = 1;
      audio.thunder();
    }
  }
  flash = Math.max(0, flash - dt * 3.4);
}

/* ---------------- day / night ---------------- */
const DAY_LEN = 240;
let tDay = 0.34, dayCount = 1, timeScale = 1;
let dayF = 1, tSec = 0, eagleSpawnT = 60;
const SKY = {
  day: new THREE.Color(0x7ec0e8), night: new THREE.Color(0x0b1226),
  dawn: new THREE.Color(0xf28c5a), cloudDay: new THREE.Color(0x9aa6ae),
  cloudNight: new THREE.Color(0x161d2a), stormSky: new THREE.Color(0x3f4850), white: new THREE.Color(0xffffff),
  sunWarm: new THREE.Color(0xfff2dc), sunLow: new THREE.Color(0xffab62),
  moon: new THREE.Color(0xa9c1e8), waterDay: new THREE.Color(0x3b7ea8),
  waterNight: new THREE.Color(0x16324a), waterStorm: new THREE.Color(0x5a6a72)
};
const _sky = new THREE.Color();
let _biomeTint = new THREE.Color();
function updateAtmosphere(dt) {
  // biome ambience: fog distance + tint from local biome weights
  let fogMul = 1, tintAmt = 0;
  const h0 = heightAt(wolf.pos.x, wolf.pos.z);
  const cl0 = climateAt(wolf.pos.x, wolf.pos.z, h0);
  const w0 = biomeWeights(wolf.pos.x, wolf.pos.z, h0, cl0.temp, cl0.moist);
  for (const bk in BIOME_CONFIG) {
    const cfg = BIOME_CONFIG[bk];
    if (cfg.fog !== 1) fogMul *= 1 - (1 - cfg.fog) * (w0[bk] || 0);
    if (cfg.tint) { _biomeTint.setHex(cfg.tint); tintAmt = Math.max(tintAmt, (w0[bk] || 0) * 0.5); }
  }
  window.__biomeFogMul = fogMul; window.__biomeTintAmt = tintAmt; window.__biomeW = w0;
  const prev = tDay;
  tDay = (tDay + dt * timeScale / DAY_LEN) % 1;
  if (tDay < prev) { dayCount++; questEvent('day', {}); }
  questEvent('height', { y: wolf.pos.y });
  const th = (tDay - 0.25) * Math.PI * 2;
  const sunAlt = Math.sin(th);
  const sunDir = V3(Math.cos(th) * 0.62, sunAlt, 0.35);
  dayF = ss(-0.1, 0.22, sunAlt);
  const glow = Math.exp(-Math.pow(sunAlt / 0.17, 2));

  _sky.copy(SKY.night).lerp(SKY.day, dayF);
  _sky.lerp(SKY.dawn, glow * 0.55);
  _sky.lerp(dayF > 0.5 ? SKY.cloudDay : SKY.cloudNight, weather.cloud * (0.3 + 0.35 * dayF));
  _sky.lerp(SKY.stormSky, weather.storm * (0.2 + 0.5 * dayF));
  _sky.lerp(SKY.white, flash * 0.55);
  scene.background.copy(_sky);
  scene.fog.color.copy(_sky).lerp(SKY.white, 0.05);
  if (window.__biomeTintAmt > 0) scene.fog.color.lerp(_biomeTint, window.__biomeTintAmt);

  let far = 260 * (1 - 0.32 * weather.rain - 0.42 * weather.snow - 0.16 * weather.cloud) * (1 - 0.12 * (1 - dayF));
  far = Math.max(110, far);
  if (wolf.pos.y > 34) far *= 1.38;   // from a ridge, the land unrolls to the haze
  far *= 1 - 0.16 * dawnMistA;         // dawn fog fills the valleys
  if (WORLD_EVENTS.name === 'blizzard') far *= 0.5;
  scene.fog.far += (far * (window.__biomeFogMul || 1) - scene.fog.far) * Math.min(1, dt * 2);
  if (caveState.in) {                 // the underground dark
    scene.fog.color.setHex(0x05070b);
    scene.fog.near = 1.5; scene.fog.far = 30;
    scene.background.setHex(0x03040a);
    sun.intensity = 0.12; hemi.intensity = 0.2;
  } else {
    scene.fog.near = 24;
    hemi.intensity = 0.6;
  }
  scene.fog.near = scene.fog.far * 0.42;

  hemi.intensity = 0.2 + 0.62 * dayF * (1 - 0.5 * weather.cloud) + flash * 1.5;
  hemi.color.copy(_sky).lerp(SKY.white, 0.3);

  const night = sunAlt < -0.03;
  if (!night) {
    sun.position.set(wolf.pos.x + sunDir.x * 150, wolf.pos.y + sunDir.y * 150, wolf.pos.z + sunDir.z * 150);
    if (!caveState.in) sun.intensity = (0.12 + 1.2 * dayF) * (1 - 0.68 * weather.cloud) * (1 - 0.22 * weather.rain) + flash * 2.2;
    _c3.copy(SKY.sunWarm).lerp(SKY.sunLow, glow);
  } else {
    sun.position.set(wolf.pos.x - sunDir.x * 150, wolf.pos.y - sunDir.y * 150, wolf.pos.z - sunDir.z * 150);
    sun.intensity = 0.14 * (1 - 0.5 * weather.cloud);
    _c3.copy(SKY.moon);
  }
  sun.color.copy(_c3);
  sun.target.position.copy(wolf.pos);
  sun.target.updateMatrixWorld();

  // ---- the sun's blessing: lens flare when you face it ----
  if (!flareGrp) {
    flareGrp = [];
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: i === 0 ? 0xffe9c4 : 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.scale.setScalar(9 + i * 7);
      scene.add(sp); flareGrp.push(sp);
    }
  }
  const _fv = new THREE.Vector3();
  camera.getWorldDirection(_fv);
  const sunDot = _fv.dot(sunDir);
  const flareA = clamp((sunDot - 0.55) / 0.45, 0, 1) * clamp(dayF * 1.5, 0, 1) * (1 - weather.cloud * 0.85) * 0.55;
  for (let i = 0; i < 3; i++) {
    flareGrp[i].position.copy(camera.position).addScaledVector(sunDir, 700 * (0.45 + i * 0.22));
    flareGrp[i].material.opacity = flareA * (i === 0 ? 0.55 : 0.3);
  }
  // ---- god rays: shafts between the trunks ----
  if (!raysGrp) {
    raysGrp = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 24), new THREE.MeshBasicMaterial({ map: texGlow, color: 0xfff2d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.renderOrder = 2; scene.add(m); raysGrp.push(m);
    }
  }
  const raysOn = !caveState.in && coverAt(wolf.pos.x, wolf.pos.z) > 0.55 && dayF > 0.28 && dayF < 0.62 && weather.cloud < 0.5;
  for (let i = 0; i < 5; i++) {
    const m = raysGrp[i];
    const a = i * 2.39 + (i * i) * 0.7, r = 11 + (i * 7) % 15;
    const gx = wolf.pos.x + Math.sin(a) * r, gz = wolf.pos.z + Math.cos(a) * r;
    m.position.set(gx, groundAt(gx, gz) + 9.5, gz);
    m.quaternion.copy(camera.quaternion);
    const target = raysOn ? 0.045 + 0.03 * (0.5 + 0.5 * Math.sin(tSec * 0.6 + i * 1.7)) : 0;
    m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 2);
  }
  // ---- dawn mist sleeping in the valleys ----
  dawnMistA = ss(0.2, 0.26, tDay) * (1 - ss(0.33, 0.39, tDay));
  if (!mistGrp) {
    mistGrp = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: 0xeef3f8, transparent: true, opacity: 0, depthWrite: false }));
      sp.scale.set(34, 16, 1);
      sp.userData.reset = true;
      scene.add(sp); mistGrp.push(sp);
    }
  }
  for (const sp of mistGrp) {
    if (sp.userData.reset || sp.position.distanceTo(wolf.pos) > 55) {
      const a = Math.random() * 6.28, r = 16 + Math.random() * 26;
      const mx = wolf.pos.x + Math.sin(a) * r, mz = wolf.pos.z + Math.cos(a) * r;
      sp.position.set(mx, groundAt(mx, mz) + 2.5, mz);
      sp.userData.reset = false;
    }
    sp.position.x += dt * 0.4;
    sp.material.opacity += (dawnMistA * 0.06 - sp.material.opacity) * Math.min(1, dt * 1.5);
  }
  skyG.position.copy(wolf.pos);
  sunSprite.position.copy(camera.position).addScaledVector(sunDir, 700);
  sunSprite.material.opacity = clamp(dayF * (1 - weather.cloud * 0.9), 0, 1) * 0.95;
  moonSprite.position.copy(camera.position).addScaledVector(sunDir, -700);
  moonSprite.material.opacity = clamp((1 - dayF) * (1 - weather.cloud * 0.75), 0, 1) * 0.95;
  stars.material.opacity = clamp((1 - dayF) * (1 - weather.cloud * 0.85), 0, 1);
  stars.rotation.y = tSec * 0.004;

  const hWolf = heightAt(wolf.pos.x, wolf.pos.z);
  const clWolf = climateAt(wolf.pos.x, wolf.pos.z, hWolf);
  auroraBands.forEach(b => {
    let op = 0;
    if (clWolf.temp < -0.08 && dayF < 0.3) {
      op = (1 - dayF * 3) * (1 - weather.cloud) * (0.3 + 0.28 * Math.sin(tSec * 0.22 + b.userData.phase));
    }
    op *= (WORLD_EVENTS.auroraBoost || 1) * (1 + ((window.__biomeW && window.__biomeW.mountain) || 0) * 0.5);
    b.material.opacity = clamp(op, 0, 0.95);
    b.material.map.offset.x += dt * 0.01;
    b.lookAt(wolf.pos.x, b.position.y, wolf.pos.z);
  });

  clouds.forEach(c => {
    c.position.x += weather.wind * dt * (6 + c.userData.speed * 8);
    c.position.z += weather.wind * dt * 3;
    if (c.position.x - wolf.pos.x > 780) c.position.x -= 1560;
    if (c.position.x - wolf.pos.x < -780) c.position.x += 1560;
    if (c.position.z - wolf.pos.z > 780) c.position.z -= 1560;
    if (c.position.z - wolf.pos.z < -780) c.position.z += 1560;
    c.material.opacity = weather.cloud * (0.16 + 0.42 * dayF) + 0.06;
    const shade = 1 - 0.55 * weather.storm - 0.45 * (1 - dayF);
    c.material.color.setRGB(shade, shade, shade * 1.04);
  });

  water.position.x = wolf.pos.x;
  water.position.z = wolf.pos.z;
  water.position.y = WATER_Y + Math.sin(tSec * 0.8) * 0.05;
  _c3.copy(SKY.waterNight).lerp(SKY.waterDay, dayF);
  waterMat.color.copy(_c3).lerp(SKY.waterStorm, weather.storm * 0.5);

  updatePrecipitation(rainSys, weather.rain, 62, 0.4, dt, tSec);
  updatePrecipitation(snowSys, weather.snow, 3.4, 0.9, dt, tSec);
}

/* ---------------- audio (all synthesized) ---------------- */
const audio = {
  ctx: null, master: null, windG: null, rainG: null, ready: false, muted: false,
  init() {
    if (this.ready) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      const lim = this.ctx.createDynamicsCompressor();   // a gentle ceiling — the wild may swell, never blast
      lim.threshold.value = -7; lim.knee.value = 5; lim.ratio.value = 14; lim.attack.value = 0.004; lim.release.value = 0.26;
      this.master.connect(lim); lim.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      const mk = (filterType, freq, gain) => {
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const f = this.ctx.createBiquadFilter();
        f.type = filterType; f.frequency.value = freq;
        const g = this.ctx.createGain(); g.gain.value = gain;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start();
        return g;
      };
      this.windG = mk('bandpass', 360, 0.0);   // retired haze — kept wired for weather sweeps only
      this.rainG = mk('highpass', 1600, 0.0);
      this.leafG = mk('bandpass', 900, 0.0);   // wind in the crowns
      this.shoreG = mk('lowpass', 200, 0.0);    // distant surf, soft
      this.rumbleG = mk('lowpass', 55, 0.0);     // volcanic tremor
      this.roarG = mk('lowpass', 300, 0.0);       // a waterfall's weight
      this.riverG = mk('lowpass', 330, 0.0);        // living water nearby — a murmur, never a hiss
      this.fireG = mk('bandpass', 1350, 0.0);    // crackling flames
      this.ready = true;
    } catch (e) { }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); },
  setAmbient(wind, rain) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.windG.gain.setTargetAtTime(0, t, 0.8);   // the constant hiss is retired — ambience lives in music and weather
    this.rainG.gain.setTargetAtTime(rain * 0.14, t, 0.9);
  },
  setForest(cover, wind) {   // crowns stir only when the wind truly blows — silence in still air
    if (!this.ready || !this.leafG) return;
    const gust = wind > 0.45 ? (wind - 0.45) * 0.022 * (0.35 + 0.65 * cover) : 0;
    this.leafG.gain.setTargetAtTime(gust, this.ctx.currentTime, 1.2);
  },
  setBiome(w) {              // regional beds: surf on the shore, tremor in the wastes
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (this.shoreG) this.shoreG.gain.setTargetAtTime(0.025 * (w.coast || 0), t, 1.2);
    if (this.rumbleG) this.rumbleG.gain.setTargetAtTime(0.075 * (w.volcanic || 0), t, 1.2);
  },
  drip() {                   // caves: water counting the centuries
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    const f = 900 + Math.random() * 700;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.13);
  },
  croak() {                  // swamp nights
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = this.ctx.createOscillator(); o.type = 'square';
      const f = 84 + Math.random() * 26;
      o.frequency.setValueAtTime(f, t + i * 0.16);
      o.frequency.exponentialRampToValueAtTime(f * 0.72, t + i * 0.16 + 0.11);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.028, t + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.13);
      const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420;
      o.connect(g); g.connect(fl); fl.connect(this.master);
      o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.15);
    }
  },
  step(type) {               // footstep timbre by ground: soft moss, crunching snow, clicks on rock
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.5;
    const P = { forest: ['lowpass', 420, 0.055], meadow: ['lowpass', 640, 0.05], rock: ['bandpass', 1500, 0.05], snow: ['lowpass', 900, 0.065], water: ['bandpass', 700, 0.05], ash: ['lowpass', 520, 0.07], sand: ['lowpass', 820, 0.045] }[type] || ['lowpass', 500, 0.04];
    const f = this.ctx.createBiquadFilter(); f.type = P[0]; f.frequency.value = P[1]; f.Q.value = 0.9;
    const g = this.ctx.createGain();
    const dur = type === 'snow' ? 0.14 : 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(P[2] * (0.8 + Math.random() * 0.4), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },
  howl(pitch) {
    pitch = pitch || 1;   // rival packs howl lower
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(290 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(620 * pitch, t + 0.55);
    o.frequency.setValueAtTime(620 * pitch, t + 1.15);
    o.frequency.exponentialRampToValueAtTime(230 * pitch, t + 2.3);
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibG = this.ctx.createGain(); vibG.gain.value = 7;
    vib.connect(vibG); vibG.connect(o.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34, t + 0.35);
    g.gain.setValueAtTime(0.34, t + 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    const dl = this.ctx.createDelay();
    dl.delayTime.value = 0.26;
    const fb = this.ctx.createGain(); fb.gain.value = 0.32;
    o.connect(g); g.connect(this.master);
    g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(this.master);
    o.start(t); vib.start(t);
    o.stop(t + 2.7); vib.stop(t + 2.7);
  },
  thunder() {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.5 + Math.random() * 1.4;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(320, t);
    f.frequency.exponentialRampToValueAtTime(70, t + 2.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 2.5);
  },
  snap() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(250, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.15);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.11, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + 0.2);
  },
  growl() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(72, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.8);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 11;
    const lg = this.ctx.createGain(); lg.gain.value = 0.14;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 1); lfo.start(t); lfo.stop(t + 1);
  },
  thud() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.3);
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const nf = this.ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 500;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.3, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(nf); nf.connect(ng); ng.connect(this.master);
    src.start(t); src.stop(t + 0.14);
  },
  chime() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => {
      const t = t0 + i * 0.09;
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = fr;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.55);
    });
  },
  chirp(vol) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2 + (Math.random() * 2 | 0); i++) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      const f0 = 1900 + Math.random() * 1400;
      const st = t + i * 0.14 + Math.random() * 0.04;
      o.frequency.setValueAtTime(f0, st);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.4, st + 0.05);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.9, st + 0.11);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.06 * vol, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.13);
      o.connect(g); g.connect(this.master);
      o.start(st); o.stop(st + 0.15);
    }
  },
  setWater(roar, river) {    // falling water has weight; rivers murmur by proximity
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.roarG.gain.setTargetAtTime(roar * 0.8, t, 0.6);
    this.riverG.gain.setTargetAtTime(river * 0.35, t, 0.6);   // water keeps its voice, loses the edge
  },
  growlVar(kind) {           // aggressive · warning · pain — three voices of the wolf
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const P = { aggressive: [90, 0.4, 1.1], warning: [130, 0.22, 0.5], pain: [170, 0.3, 0.7] }[kind] || [110, 0.25, 0.6];
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = P[0] * 6; f.Q.value = 2;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = P[0];
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = kind === 'aggressive' ? 11 : 7;
    const lg = this.ctx.createGain(); lg.gain.value = P[0] * 0.4; lfo.connect(lg); lg.connect(o.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(P[1] * 0.5, t + P[2] * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + P[2]);
    src.connect(f); f.connect(g); o.connect(g); g.connect(this.master);
    src.start(t); o.start(t); lfo.start(t);
    src.stop(t + P[2] + 0.05); o.stop(t + P[2] + 0.05); lfo.stop(t + P[2] + 0.05);
  },
  whimper() {                // low hp: a small hurt sound
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(860, t + 0.18); o.frequency.linearRampToValueAtTime(520, t + 0.42);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.5);
  },
  bark() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    for (const dt0 of [0, 0.16]) {
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 0.8;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 620; f.Q.value = 1.4;
      const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(240, t + dt0); o.frequency.exponentialRampToValueAtTime(140, t + dt0 + 0.1);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + dt0); g.gain.linearRampToValueAtTime(0.16, t + dt0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dt0 + 0.12);
      src.connect(f); f.connect(g); o.connect(g); g.connect(this.master);
      src.start(t + dt0); o.start(t + dt0); src.stop(t + dt0 + 0.15); o.stop(t + dt0 + 0.15);
    }
  },
  pant() {                   // stamina low: quick double breaths
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    for (const dt0 of [0, 0.28]) {
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 0.9;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt0); g.gain.linearRampToValueAtTime(0.05, t + dt0 + 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dt0 + 0.22);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t + dt0); src.stop(t + dt0 + 0.25);
    }
  },
  breath(vol) {              // running lungs
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 0.7;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.09); g.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.45);
  },
  boneCrunch() {             // the bite lands
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [dt0, fr, vol] of [[0, 2600, 0.14], [0.03, 1400, 0.1], [0.05, 700, 0.08]]) {
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 1 + Math.random() * 0.3;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fr; f.Q.value = 1.2;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t + dt0); g.gain.exponentialRampToValueAtTime(0.0001, t + dt0 + 0.07);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t + dt0); src.stop(t + dt0 + 0.09);
    }
  },
  cry(pitch) {               // a death cry, pitched by the beast
    pitch = pitch || 1;
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(340 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(150 * pitch, t + 0.55);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(lp); lp.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.65);
  },
  iceCrack() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 1.6;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(f); f.connect(g); o.connect(g); g.connect(this.master);
    src.start(t); o.start(t); src.stop(t + 0.18); o.stop(t + 0.18);
  },
  branchSnap() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 1.2;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000; f.Q.value = 2.2;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.1);
  },
  rustle() {                 // pushing through bushes
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 0.85;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.4);
  },
  owl() {                    // the night watchman
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [dt0, fr] of [[0, 380], [0.35, 330]]) {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + dt0); g.gain.linearRampToValueAtTime(0.06, t + dt0 + 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dt0 + 0.28);
      o.connect(g); g.connect(this.master); o.start(t + dt0); o.stop(t + dt0 + 0.3);
    }
  },
  eagle() {                  // high country
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.5);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.6);
  },
  uiClick() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.06);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.09);
  },
  whoosh() {                 // senses open
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.5);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.65);
  },
  speciesCall(label, vol) {      // the wild speaks: each animal its own voice, heard when you're near
    if (!this.ready || this.muted) return;
    vol = vol == null ? 0.5 : vol;
    const t = this.ctx.currentTime;
    const V = {
      Rabbit:      () => { this.tone('sine', 1100, t, 0.07, 0.035 * vol); this.tone('sine', 1500, t + 0.09, 0.06, 0.025 * vol); },
      'Snow Hare': () => this.speciesCall('Rabbit', vol),
      Fox:         () => { this.tone('triangle', 620, t, 0.1, 0.04 * vol); this.tone('triangle', 830, t + 0.12, 0.12, 0.035 * vol); },
      'Arctic Fox': () => this.speciesCall('Fox', vol),
      'Mountain Goat': () => { for (let i = 0; i < 3; i++) this.tone('square', 300 + Math.random() * 40, t + i * 0.13, 0.1, 0.018 * vol); },
      Deer:        () => { this.tone('sawtooth', 190, t, 0.22, 0.03 * vol, 150); },
      Reindeer:    () => { this.tone('sawtooth', 160, t, 0.26, 0.032 * vol, 120); },
      Elk:         () => { this.tone('sawtooth', 140, t, 0.5, 0.04 * vol, 95); this.tone('sawtooth', 180, t + 0.3, 0.4, 0.03 * vol, 120); }
    }[label];
    if (V) { try { V(); } catch (e) { } }
  },
  tone(type, f, t, dur, vol, glideTo) {   // one clean note — the voice battery's atom
    if (!this.ready || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  birdPeep(vol) {                // the flock overhead
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    this.tone('sine', 2600 + Math.random() * 700, t, 0.05, 0.02 * vol);
    this.tone('sine', 3200 + Math.random() * 600, t + 0.07, 0.04, 0.016 * vol);
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }
};
/* ============================================================
   MUSIC — a living score, synthesized note by note.
   Layers (pad · melody · percussion · bass · choir · bells) crossfade
   between exploration, the hunt and combat; every biome sings its own
   theme; night detunes the world; the mystic events ring bells.
   ============================================================ */
const music = {
  bus: null, wet: null, layers: {}, nextBeat: 0, beat: 0, bar: 0,
  state: 'explore', stateT: 0, intensity: 0.2, bpm: 60, theme: 'forest',
  comboN: 0, comboT: 0, started: false,
  THEMES: {   // the voice of each land
    forest:   { root: 293.66, scale: [0, 2, 4, 7, 9],        instr: 'flute',   pad: 'warm',  perc: 'soft',  bass: 0 },
    taiga:    { root: 293.66, scale: [0, 2, 4, 7, 9],        instr: 'flute',   pad: 'warm',  perc: 'soft',  bass: 0 },
    mountain: { root: 220.00, scale: [0, 3, 7, 10, 14],      instr: 'piano',   pad: 'choir', perc: 'none',  bass: 0 },
    tundra:   { root: 220.00, scale: [0, 3, 7, 10, 14],      instr: 'piano',   pad: 'choir', perc: 'none',  bass: 0 },
    highland: { root: 220.00, scale: [0, 3, 7, 10, 14],      instr: 'piano',   pad: 'choir', perc: 'none',  bass: 0 },
    swamp:    { root: 110.00, scale: [0, 1, 3, 6, 8],        instr: 'none',    pad: 'dark',  perc: 'none',  bass: 1 },
    grove:    { root: 261.63, scale: [0, 2, 3, 5, 7, 8, 10], instr: 'strings', pad: 'warm',  perc: 'soft',  bass: 0 },
    meadow:   { root: 329.63, scale: [0, 2, 4, 7, 9],        instr: 'kalimba', pad: 'warm',  perc: 'shaker',bass: 0 },
    dry:      { root: 246.94, scale: [0, 1, 4, 5, 7, 8, 11], instr: 'oud',     pad: 'dark',  perc: 'soft',  bass: 0 },
    volcanic: { root: 246.94, scale: [0, 1, 4, 5, 7, 8, 11], instr: 'oud',     pad: 'dark',  perc: 'soft',  bass: 1 },
    enchanted:{ root: 392.00, scale: [0, 2, 4, 7, 9, 11],    instr: 'bells',   pad: 'choir', perc: 'none',  bass: 0 },
    coast:    { root: 261.63, scale: [0, 2, 4, 7, 9],        instr: 'none',    pad: 'warm',  perc: 'none',  bass: 0 }
  },
  SIG: null, sigLen: 64,
  buildSig() {   // semitones from A4 · [offset, lengthInBeats] · a tune that belongs to these wilds
    const A = [[0, 2], [3, 2], [7, 3], [5, 1], [3, 2], [2, 2], [0, 4]];
    const B = [[7, 2], [10, 2], [12, 3], [10, 1], [7, 2], [5, 2], [3, 2], [2, 2]];
    const A2 = [[0, 2], [3, 2], [7, 2], [5, 2], [3, 2], [2, 2], [0, 4]];
    const DRONE = [-24, -24, -27, -24];   // A · A · F · A — the bittersweet turn under B
    const seq = [], phrases = [A, A, B, A2];
    let at = 0;
    phrases.forEach((ph, pi) => {
      seq.push({ at, drone: DRONE[pi], len: 16 });
      for (const [semi, len] of ph) { seq.push({ at, semi, len }); at += len; }
      at = 16 * (pi + 1);
    });
    this.SIG = seq; this.sigLen = at;
  },
  init() {
    if (this.bus || !audio.ctx) return;
    if (!this.SIG) this.buildSig();
    const ctx = audio.ctx;
    this.bus = ctx.createGain(); this.bus.gain.value = 0.0;
    this.bus.connect(audio.master);
    // a small cathedral: generated impulse reverb
    const len = ctx.sampleRate * 1.9, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.conv = ctx.createConvolver(); this.conv.buffer = ir;
    this.wet = ctx.createGain(); this.wet.gain.value = 0.18;
    this.bus.connect(this.conv); this.conv.connect(this.wet); this.wet.connect(audio.master);
    for (const k of ['pad', 'melody', 'perc', 'bass', 'choir', 'bells']) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(this.bus); this.layers[k] = g;
    }
    this.nextBeat = ctx.currentTime + 0.3;
    this.started = true;
  },
  /* ---- instruments ---- */
  v(instrument, f, t, dur, vol, layer, detune) {
    const ctx = audio.ctx, o = [], g = ctx.createGain();
    const wet2 = this.layers[layer];
    if (instrument === 'flute') {
      const os = ctx.createOscillator(); os.type = 'triangle'; os.frequency.value = f;
      const vib = ctx.createOscillator(); vib.frequency.value = 4.6 + Math.random();
      const vg = ctx.createGain(); vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(os.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.12);
      g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      os.connect(g); o.push(os, vib); this.stop(o, t, t + dur + 0.05);
    } else if (instrument === 'guitar') {   // a soft plucked string — the game's signature voice (cycle-free: always stable)
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4; lp.frequency.value = 1250 + f * 0.35;   // the wooden body
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = f;
      const g1 = ctx.createGain(); g1.gain.value = 0.62; o1.connect(g1); g1.connect(lp);
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2.003;   // a soft shimmer string
      const g2 = ctx.createGain(); g2.gain.value = 0.2; o2.connect(g2); g2.connect(lp);
      const pick = ctx.createBufferSource(); pick.buffer = audio.noiseBuf; pick.playbackRate.value = 3;   // the fingernail
      const pg = ctx.createGain(); pg.gain.setValueAtTime(0.5, t); pg.gain.linearRampToValueAtTime(0, t + 0.014);
      const ph = ctx.createBiquadFilter(); ph.type = 'highpass'; ph.frequency.value = 1500;
      pick.connect(ph); ph.connect(pg); pg.connect(g);
      lp.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.setValueAtTime(vol, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.1);   // a long wooden ring
      o.push(o1, o2, pick); this.stop(o, t, t + dur + 1.2);
    } else if (instrument === 'piano') {
      for (const [m, a] of [[1, 1], [2, 0.35], [3, 0.12]]) {
        const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = f * m;
        const gg = ctx.createGain(); gg.gain.setValueAtTime(a * vol, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur * (m === 1 ? 1 : 0.5));
        os.connect(gg); gg.connect(g); o.push(os);
      }
      g.gain.value = 1; this.stop(o, t, t + dur + 0.05);
    } else if (instrument === 'strings') {
      for (const dt2 of [-6, 5]) {
        const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = dt2 + (detune || 0);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
        os.connect(lp); lp.connect(g); o.push(os);
      }
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.45);
      g.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      this.stop(o, t, t + dur + 0.05);
    } else if (instrument === 'oud') {
      const os = ctx.createOscillator(); os.type = 'sawtooth';
      os.frequency.setValueAtTime(f * 0.985, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      os.connect(lp); lp.connect(g); o.push(os); this.stop(o, t, t + dur + 0.05);
    } else if (instrument === 'kalimba') {
      for (const [m, a] of [[1, 1], [2.76, 0.2]]) {
        const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = f * m;
        const gg = ctx.createGain(); gg.gain.setValueAtTime(a * vol, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur * (m === 1 ? 1 : 0.35));
        os.connect(gg); gg.connect(g); o.push(os);
      }
      g.gain.value = 1; this.stop(o, t, t + dur + 0.05);
    } else if (instrument === 'bells') {
      for (const [m, a, d2] of [[1, 1, 1], [2.76, 0.4, 0.7], [5.4, 0.15, 0.4]]) {
        const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = f * m;
        const gg = ctx.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(a * vol, t + 0.01);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + dur * d2 + 0.1);
        os.connect(gg); gg.connect(g); o.push(os);
      }
      g.gain.value = 1; this.stop(o, t, t + dur + 0.2);
    } else if (instrument === 'choir') {
      for (const dt2 of [-8, 6, 0]) {
        const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = f; os.detune.value = dt2;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        os.connect(lp); lp.connect(g); o.push(os);
      }
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0.0001, t + dur); this.stop(o, t, t + dur + 0.05);
    } else if (instrument === 'kick') {
      const os = ctx.createOscillator(); os.type = 'sine';
      os.frequency.setValueAtTime(130, t); os.frequency.exponentialRampToValueAtTime(44, t + 0.16);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      os.connect(g); o.push(os); this.stop(o, t, t + 0.25);
    } else if (instrument === 'tom') {
      const os = ctx.createOscillator(); os.type = 'sine';
      os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.2);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      os.connect(g); o.push(os); this.stop(o, t, t + 0.32);
    } else if (instrument === 'shaker') {
      const src = ctx.createBufferSource(); src.buffer = audio.noiseBuf; src.playbackRate.value = 1.4;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      src.connect(hp); hp.connect(g); o.push(src); this.stop(o, t, t + 0.1);
    } else if (instrument === 'stab') {   // brass hit on landed bites
      for (const dt2 of [0, -7, -12]) {
        const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = dt2;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t);
        lp.frequency.exponentialRampToValueAtTime(500, t + 0.28);
        os.connect(lp); lp.connect(g); o.push(os);
      }
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      this.stop(o, t, t + 0.34);
    }
    g.connect(wet2);
  },
  stop(list, t0, t1) { for (const n of list) { try { n.start(t0); } catch (e) {} try { n.stop(t1); } catch (e) {} } },   // a note must BEGIN before it ends — this bug muted the entire score
  chordF(root, semis) { return semis.map(s => root * Math.pow(2, s / 12)); },
  note(th, deg, oct) {
    const sc = th.scale, n = sc[((deg % sc.length) + sc.length) % sc.length] + 12 * Math.floor(deg / sc.length);
    return th.root * Math.pow(2, (n + 12 * (oct || 0)) / 12);
  },
  /* ---- the director: what does this moment need to sound like? ---- */
  direct() {
    let st = 'explore', it = 0.22, epic = false;
    if (this.boss) { this.state = 'combat'; this.epic = true; this.intensity = 0.95; return; }   // a legend demands its own music
    if (!caveState.in) {
      for (const ch of chunks.values())
        for (const pr of ch.predators)
          if (!pr.dead && (pr.state === 'chase' || pr.state === 'attack') && pr.pos.distanceTo(wolf.pos) < 70) {
            st = 'combat';
            it = Math.max(it, 0.55 + (1 - wolf.hp / wolf.maxHp) * 0.35 + (pr.state === 'attack' ? 0.08 : 0));
          }
      if (WORLD_EVENTS.name === 'rivalPack') {   // the pack battle: this land's boss fight
        st = 'combat'; epic = true;
        let dead = 0, alive = 0;
        for (const r of rivals) r.dead ? dead++ : alive++;
        it = Math.max(it, 0.7 + dead * 0.1 + (alive <= 1 ? 0.1 : 0) + (1 - wolf.hp / wolf.maxHp) * 0.2);
      }
      if (st !== 'combat') {
        const hunting = senseT > 0 || (wolf.crouch && nearestPrey() < 34);
        if (hunting) { st = 'hunt'; it = 0.3 + Math.max(0, 1 - nearestPrey() / 34) * 0.3; }
      }
    } else { st = 'explore'; it = 0.15; }
    if (weather.storm > 0.55) it = Math.min(1, it + 0.08);
    this.state = st; this.intensity = it; this.epic = epic;
  },
  update(dt) {
    if (!audio.ready) return;
    this.init();
    if (audio.muted || !this.started) return;
    this.direct();
    const night = dayF < 0.3, mystical = ['aurora', 'whiteStag', 'meteor'].includes(WORLD_EVENTS.name);
    const th = this.THEMES[this.theme] || this.THEMES.forest;
    const cave = caveState.in;
    this.bpm = (st => st === 'combat' ? 96 + this.intensity * 60 : st === 'hunt' ? 56 : 44)(this.state) - (night ? 3 : 0);   // slow, breathing days
    const T = {
      explore: { pad: cave ? 0.52 : 0.44, melody: cave ? 0 : 0.3, perc: 0, bass: cave ? 0.06 : 0.24, choir: th.pad === 'choir' ? 0.16 : 0, bells: 0 },   // the signature guitar sings over warm pads
      hunt:    { pad: 0.12, melody: 0.06, perc: 0.08, bass: 0.08, choir: 0, bells: 0 },   // a soft pulse under the stalk
      combat:  { pad: 0.22, melody: 0.12, perc: 0.34, bass: 0.2, choir: this.epic ? 0.3 : 0, bells: 0 }
    }[this.state];
    if (mystical && this.state === 'explore') T.bells = 0.2, T.choir = Math.max(T.choir, 0.2);
    const k = Math.min(1, dt * 1.6);
    for (const key in this.layers) this.layers[key].gain.value += ((T[key] || 0) * 0.9 - this.layers[key].gain.value) * k;
    this.wet.gain.value += ((cave ? 0.5 : night ? 0.4 : this.state === 'combat' ? 0.12 : 0.28) - this.wet.gain.value) * k;   // a softer, larger space
    this.bus.gain.value += (0.85 - this.bus.gain.value) * k;   // the score stands in the mix, not under it
    // schedule ahead
    const ctx = audio.ctx, ahead = ctx.currentTime + 1.1;
    let guard = 0;
    while (this.nextBeat < ahead && guard++ < 24) {
      const t = this.nextBeat, b = this.beat % 8;
      const pitchMul = night ? Math.pow(2, -2 / 12) : 1;
      const inst = th.instr;
      if (b === 0) {   // a new bar breathes
        this.bar++;
        const deg = [0, 3, 4, 2][this.bar % 4];
        const chordSemis = [0, 2, 4].map(x => th.scale[(deg + x) % th.scale.length] + (deg + x >= th.scale.length ? 12 : 0));
        const fs = this.chordF(th.root * pitchMul, [chordSemis[0], chordSemis[1] + 0, chordSemis[2]]);
        this.v(th.pad === 'dark' ? 'strings' : th.pad === 'choir' ? 'choir' : 'strings', fs[0] / 2, t, 8 * 60 / this.bpm * 0.99, 0.24, 'pad', night ? 12 : 0);
        this.v(th.pad === 'choir' ? 'choir' : 'strings', fs[1], t + 0.05, 8 * 60 / this.bpm * 0.97, 0.16, 'pad');
        this.v(th.pad === 'choir' ? 'choir' : 'strings', fs[2] / 2, t, 8 * 60 / this.bpm * 0.97, 0.12, 'bass');
        if (this.epic) this.v('choir', fs[0], t, 8 * 60 / this.bpm, 0.14, 'choir');
      }
      // THE SIGNATURE TUNE: a plucked-string lullaby that follows the player everywhere
      if (this.state === 'explore' && !cave) {
        if (!this.SIG) this.buildSig();
        const bb = this.beat % this.sigLen;
        for (const nt of this.SIG) {
          if (nt.at !== bb) continue;
          if (nt.drone !== undefined) this.v('guitar', 440 * Math.pow(2, nt.drone / 12) * pitchMul, t, 15 * 60 / this.bpm, 0.15, 'bass');   // the low string hums
          else {
            this.v('guitar', 440 * Math.pow(2, nt.semi / 12) * pitchMul, t, nt.len * 60 / this.bpm * 0.94, 0.26, 'melody');   // the tune leads
            if (mystical && Math.random() < 0.35) this.v('bells', 440 * Math.pow(2, (nt.semi + 12) / 12) * pitchMul, t + 0.24, 1.8, 0.06, 'bells');   // aurora evenings sparkle
          }
        }
      } else if (inst !== 'none' && !cave && this.state !== 'explore') {   // the pulse states keep their sparse walk
        const dens = this.state === 'hunt' ? 0.08 : 0.28;
        if (Math.random() < dens && b % 2 === 0) {
          const deg = (Math.random() * 8) | 0, oct = Math.random() < 0.25 ? 1 : 0;
          this.v(inst, this.note(th, deg, oct) * pitchMul, t, inst === 'piano' ? 2.2 : 2.0, 0.085, 'melody');
        }
      }
      // percussion speaks the state
      if (this.state === 'hunt') {   // the heartbeat: closer prey, faster pulse
        if (b % 2 === 0) this.v('kick', 60, t, 0, 0.16 + this.intensity * 0.12, 'perc');
        if (b % 2 === 1 && this.intensity > 0.45) this.v('kick', 55, t, 0, 0.1, 'perc');
      } else if (this.state === 'combat') {
        if (b === 0 || b === 4) this.v('kick', 0, t, 0, 0.3, 'perc');
        if (b === 4) this.v('tom', 190 * pitchMul, t, 0, 0.2, 'perc');
        if (this.intensity > 0.8 && b % 1 === 0) this.v('kick', 0, t, 0, 0.16, 'perc');   // the fierce finale
        if (b === 6 && Math.random() < 0.5) this.v('tom', 150 * pitchMul, t, 0, 0.16, 'perc');
        if (th.perc !== 'none' && b % 2 === 1) this.v('shaker', 0, t, 0, 0.08, 'perc');
      } else if (th.perc === 'shaker' && (b === 2 || b === 6) && !night) this.v('shaker', 0, t, 0, 0.07, 'perc');
      this.beat++;
      this.nextBeat += 60 / this.bpm;
    }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.comboN = 0; }
  },
  hitStab() {   // brass on a landed bite — pitch climbs with the combo
    if (!this.started || audio.muted) return;
    this.comboN = Math.min(this.comboN + 1, 8); this.comboT = 1.9;
    const th = this.THEMES[this.theme] || this.THEMES.forest;
    this.v('stab', th.root * 2 * Math.pow(2, this.comboN / 25), audio.ctx.currentTime + 0.01, 0.32, 0.2, 'perc');
  },
  fanfare() {   // a discovery worth remembering
    if (!this.started || audio.muted) return;
    const th = this.THEMES[this.theme] || this.THEMES.forest, t = audio.ctx.currentTime + 0.05;
    [0, 2, 4, 7].forEach((d, i) => this.v('bells', this.note(th, d, 1), t + i * 0.11, 1.2, 0.14, 'bells'));
  }
};
function nearestPrey() {
  let best = 999;
  for (const ch of chunks.values())
    for (const a of ch.animals) {
      if (a.dead) continue;
      const d = a.pos.distanceTo(wolf.pos);
      if (d < best && (!a.aware || a.aware < 0.5)) best = d;
    }
  return best;
}
let chirpT = 5, croakT = 4, breathT = 0, pantT = 0, whimperT = 0, owlT = 6, cricketT = 3, eagleT = 10, farHowlT = 15, voiceT = 2; const voiceCd = {};
let dawnMistA = 0, pawPrints = null, flareGrp = null, raysGrp = null, mistGrp = null;

/* ============================================================
   PURPOSE — quests, bosses, the Spirit Wolf, and the wisdom
   of the wild. The open world gains a memory of your deeds.
   ============================================================ */
const TITLES = ['Young Pup', 'Wanderer', 'Hunter', 'Stalker', 'Storm-Woolf', 'Legend of the Aurora'];
const xpNeed = L => Math.round(70 * Math.pow(1.24, L));   // each level ~24% dearer — no cap, ever
function recalcWolfLevel() {   // strength flows FROM the level — so death can take it back cleanly; permanent perks (hpBonus) survive
  wolf.maxStam = 100 * (1 + 0.05 * wolf.level);    // +5% sprint pool per level, unbounded
  wolf.maxHp = 100 + 8 * wolf.level + (wolf.hpBonus || 0);   // +8 max HP per level, permanent perk bonus preserved
}
const wolfDamageMul = () => Math.pow(0.982, wolf.level);   // damage taken shrinks 1.8% a level — always less, never zero
window.freshRun = () => ({ t0: performance.now(), kills: 0, predators: 0, quests: 0, landmarks: 0, bosses: 0, xp: 0, maxLevel: 0, perks: [], questTimes: [], dist0: wolf.distance || 0, cause: null, icon: null, dur: 0 });
window.RUN = window.freshRun();
window.updateRunRecap = function () {   // the start page's chronicle of the last run + the record
  const box = el('runRecap'); if (!box) return;
  let last = null, best = null;
  try { last = JSON.parse(localStorage.getItem('revontulet_lastRun') || 'null'); best = JSON.parse(localStorage.getItem('revontulet_bestRun') || 'null'); } catch (e) { }
  if (!last) { box.style.display = 'none'; return; }
  const mm = Math.floor((last.dur || 0) / 60), ss = Math.floor((last.dur || 0) % 60);
  const mins = mm > 0 ? mm + 'm ' : '';
  box.style.display = 'block';
  box.innerHTML = `<div class="rr-head">⭐ LAST RUN — pushed to <b>Level ${last.maxLevel}</b>${best && best.maxLevel > last.maxLevel ? ` &nbsp;·&nbsp; 🏆 RECORD <b>Level ${best.maxLevel}</b>` : ' &nbsp;·&nbsp; 🏆 <b>NEW RECORD!</b>'}</div>` +
    `<div class="rr-line">💀 Slain by ${last.cause || 'the wild'} · survived <b>${mins}${ss}s</b> of it</div>` +
    `<div class="rr-line">✨ ${last.xp} XP earned · 🩸 ${last.kills} prey (${last.predators} predators) · 📜 ${last.quests} quests</div>` +
    `<div class="rr-line">🧭 ${last.landmarks} landmarks · 👑 ${last.bosses} legends${last.perks && last.perks.length ? ' · achievements: ' + last.perks.join(', ') : ''}</div>`;
};
function addXp(n) {
  wolf.xp += n;
  wolf.xpTotal = (wolf.xpTotal || 0) + Math.max(0, n);   // ONE unified XP pool — career XP, monotonic (death resets level progress only)
  RUN.xp += n; if (wolf.level > RUN.maxLevel) RUN.maxLevel = wolf.level;
  while (wolf.xp >= wolf.xpNext) {
    wolf.xp -= wolf.xpNext;
    wolf.level++;
    wolf.xpNext = xpNeed(wolf.level);
    recalcWolfLevel();
    wolf.hp = Math.min(wolf.maxHp, wolf.hp + 8);
    wolf.stamina = Math.min(wolf.maxStam, wolf.stamina + 5);
    wolf.title = TITLES[Math.min(TITLES.length - 1, (wolf.level / 2) | 0)] || 'Legend of the Aurora';
    const dr = (1 - wolfDamageMul()) * 100, sp = 5 * wolf.level;
    toast(`🎉 CONGRATULATIONS! Level ${wolf.level} — damage taken −${dr.toFixed(1)}% · sprint stamina +${sp}%`, true);
    music.fanfare();
    const lv = el('lvCard');
    if (lv) { lv.textContent = `⭐ LEVEL ${wolf.level} — ${wolf.title} · damage −${dr.toFixed(1)}% · sprint +${sp}%`; lv.classList.remove('show'); void lv.offsetWidth; lv.classList.add('show'); }
  }
  questHudDirty = true;
}
/* ---- the quest engine ---- */
const QUESTS = { active: [], avail: [], done: [] };
let questHudDirty = true, questTab = 'active';
const questsDoneByBiome = {};
const COLLECT_ITEMS = { herb: { label: 'herbs', icon: '🌿' }, berry: { label: 'lingonberries', icon: '🍒' }, mushroom: { label: 'mushrooms', icon: '🍄' }, stone: { label: 'stones', icon: '🪨' }, bone: { label: 'bones', icon: '🦴' }, wood: { label: 'sticks', icon: '🪵' } };
function questBiomePick() {   // quests come from the lands you walk — only lands where wildlife actually lives
  const cur = curBiomeKey;
  const keys = Object.keys(BIOME_INFO).filter(k => SPECIES_TABLE[k]);   // no hunts in the ember wastes / shores
  if (cur && SPECIES_TABLE[cur] && Math.random() < 0.6) return cur;
  return keys[(keys.indexOf(cur) + 1 + ((Math.random() * (keys.length - 1)) | 0)) % keys.length] || 'forest';
}
const pluralOf = (label, n) => {   // Fox → Foxes, Deer → Deer, Rabbit → Rabbits
  if (n === 1) return label;
  if (/y$/i.test(label)) return label.slice(0, -1) + 'ies';
  if (/(s|x|ch|sh)$/i.test(label)) return label + 'es';
  if (/deer|sheep|fish/i.test(label)) return label;
  return label + 's';
};
function nearbySpeciesCounts() {   // what actually roams the loaded world right now
  const counts = {};
  for (const [, ch] of chunks) for (const a of ch.animals) if (!a.dead) counts[a.name] = (counts[a.name] || 0) + 1;
  return counts;
}
function pickupSupply(item) {   // M46: how many ungathered pickups of this item exist in the living world?
  let n = 0;
  for (const [, ch] of chunks) for (const pk of ch.pickups) {
    if (pk.gathered) continue;
    const def = PICKUP_DEF[pk.type];
    if (def && def.inv === item) n++;
  }
  return n;
}
function genQuest(kind) {
  const biome = questBiomePick();
  const info = BIOME_INFO[biome] || BIOME_INFO.forest;
  const bName = info.name, bIcon = info.icon;
  const kinds = ['hunt', 'explore', 'collect', 'rival', 'survive'];
  kind = kind || kinds[(Math.random() * kinds.length) | 0];
  if (kind === 'hunt') {
    const table = SPECIES_TABLE[biome];
    if (!table) return genQuest('explore');   // a land without prey offers a journey instead
    const live = nearbySpeciesCounts();
    // prefer quarry you can actually find nearby, then the biome's own table
    const inBiome = table.map(e => e[0]);
    const prey = inBiome.filter(k => SPECIES[k] && (SPECIES[k].hp || 1) <= 3 && !SPECIES[k].huntsWolf && live[k] > 0);
    const fallback = inBiome.filter(k => SPECIES[k] && (SPECIES[k].hp || 1) <= 3 && !SPECIES[k].huntsWolf);
    const pool = prey.length ? prey : (fallback.length ? fallback : inBiome);
    const species = pool[(Math.random() * pool.length) | 0] || 'deer';
    const n = 2 + ((Math.random() * 3) | 0);
    const sp = SPECIES[species];
    const pn = pluralOf(sp.label, n).toLowerCase();
    return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: sp.icon || '⚔️', title: `Hunt ${n} ${pluralOf(sp.label, n)}`,
      desc: `Bring down ${n} ${pn} — they roam the ${bName}. Gold light marks your quarry when it is near.`,
      need: n, have: 0, species, rw: { xp: 120 + n * 25, items: { meat: 2 } }, rwText: `${120 + n * 25} XP · 2 🥩` };
  }
  if (kind === 'explore') {
    // only promise what the world actually holds: unfound landmarks that exist (in-biome first)
    const byBiome = [], anywhere = [];
    for (const lm of landmarkList) {
      if (lm.found) continue;
      const b = LANDMARKS[lm.type] && LANDMARKS[lm.type].biomes;
      if (!b) continue;
      if (b.any || (b[biome] || 0) > 0.15) byBiome.push(lm); else anywhere.push(lm);
    }
    const pick = byBiome.length ? byBiome : anywhere;
    if (Math.random() < 0.8 && pick.length) {
      const lm = pick[(Math.random() * pick.length) | 0];
      const type = lm.type, def = LANDMARKS[type];
      return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: def.icon, title: `Discover: ${def.label}`,
        desc: `Find a ${def.label} — a waypoint marks the way on your map. Its site becomes a fast-travel point.`,
        need: 1, have: 0, lmType: type, rw: { xp: 180, ft: true }, rwText: '180 XP · 🗺️ fast travel unlocked' };
    }
    // BUGFIX (rafzzer lineage): never promise a 50 m throne the terrain doesn't hold —
    // the peak quest was offered in lowlands where it can't complete (5-min stall treadmill).
    let throne = false;
    for (let k = 0; k < 12 && !throne; k++) {
      const ang = k / 12 * 6.2832;
      for (const r of [80, 140, 220, 330, 470]) {
        if (heightAt(wolf.pos.x + Math.sin(ang) * r, wolf.pos.z + Math.cos(ang) * r) > 50.5) { throne = true; break; }
      }
    }
    if (throne) return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: '⛰️', title: 'Climb a High Peak',
      desc: 'Reach a height of 50 meters — stand where the eagles do and watch the world unroll.',
      need: 1, have: 0, peak: true, rw: { xp: 200, mapReveal: true }, rwText: '200 XP · 🗺️ wider map' };
  }
  if (kind === 'collect') {
    const keys2 = Object.keys(COLLECT_ITEMS).filter(k => k !== 'bone');   // bones lie in caves, not on quests
    const n = 3 + ((Math.random() * 4) | 0);
    // M46 BUGFIX (rafzzer lineage): no more 'Gather 6 mushrooms' stuck at 0/6 — only
    // offer a gather when the land ACTUALLY holds the resource (with one spare for
    // spent or unreachable pockets); otherwise the board rerolls to another deed.
    const viable = [];
    for (const k2 of keys2) if (pickupSupply(k2) >= n + 1) viable.push(k2);
    if (!viable.length) return null;   // this ground gathers nothing — the wild offers another kind of deed
    const item = viable[(Math.random() * viable.length) | 0];
    const c = COLLECT_ITEMS[item];
    return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: c.icon, title: `Gather ${n} ${c.label}`,
      desc: `Gather ${n} ${c.label} from the wild. Related finds shimmer with faint gold light.`, need: n, have: 0, item,
      rw: { xp: 110 + n * 15, boost: 'maxHp' }, rwText: `${110 + n * 15} XP · ❤️ +5 max HP (permanent)` };
  }
  if (kind === 'rival') {
    if (Math.random() < 0.5) return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: '🐺', title: 'Drive Off a Rival Pack',
      desc: 'Stand your ground: defeat two wolves of a rival pack and the rest will flee before you.', need: 1, have: 0, pack: true,
      rw: { xp: 240, boost: 'strongJaw' }, rwText: '240 XP · 🦷 +1 bite damage (permanent)' };
    return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: '🐺', title: 'Defeat 2 Rival Wolves',
      desc: 'Other wolves hunt these lands too. Best two of them in honest combat.', need: 2, have: 0, rival: true,
      rw: { xp: 260, boost: 'strongJaw' }, rwText: '260 XP · 🦷 +1 bite damage (permanent)' };
  }
  if (kind === 'survive') {
    if (Math.random() < 0.5) {
      const n = 2 + ((Math.random() * 2) | 0);
      return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: '🌗', title: `Survive ${n} days under the open sky`,
        desc: `Endure ${n} full day-night cycles without once denning in a cave. The sky is your roof.`, need: n, have: 0, days: true, prog0: dayCount,
        rw: { xp: 230, perk: 'skywatcher' }, rwText: '230 XP · 🌩️ storm resistance (permanent)' };
    }
    const n = 2 + ((Math.random() * 2) | 0);
    return { id: 'q' + (Math.random() * 1e9 | 0), kind, biome, icon: '⛈️', title: `Hunt ${n} beasts in foul weather`,
      desc: `Rain, storm or blizzard — the true hunter does not wait for clear skies. Kill ${n} animals in bad weather.`, need: n, have: 0, stormy: true,
      rw: { xp: 210, perk: 'stormborn' }, rwText: '210 XP · 🌩️ weather resistance (permanent)' };
  }
  return null;
}
window.questSize = function (q) {   // the weight of a deed — errand, journey, or trial
  if (!q) return 'small';
  if (q.kind === 'survive') return 'big';                             // outlast the sky or the storm — a trial
  if (q.kind === 'explore' || q.kind === 'rival') return 'medium';    // a journey, or a pack to face
  const n = q.need || 0;
  if (q.kind === 'hunt') return n >= 4 ? 'medium' : 'small';
  if (q.kind === 'collect') return n >= 5 ? 'medium' : 'small';
  return 'small';
};
function refillQuests() {   // a FULL board: every kind of deed the land can offer, always visible
  if (window.CAMP && window.CAMP.on()) { window.CAMP.refill(); return; }   // CAMPAIGN: the board is the campaign's 3–4 choices
  const BOARD = ['survive', 'hunt', 'explore', 'collect', 'rival', 'hunt', 'collect', 'explore'];
  const dup = q => QUESTS.avail.some(o => o.title === q.title) || QUESTS.active.some(o => o.title === q.title);
  for (const kind of BOARD) {
    if (QUESTS.avail.length >= BOARD.length) break;
    let q = null, tries = 0;
    while (!q && tries++ < 10) { const c = genQuest(kind); if (c && !dup(c)) q = c; }
    if (q) QUESTS.avail.push(q);
  }
  let guard = 0;   // top up if the land is poor in some kind
  while (QUESTS.avail.length < 6 && guard++ < 30) { const q = genQuest(); if (q && !dup(q)) QUESTS.avail.push(q); }
}
function acceptQuest(id) {
  const q0 = (QUESTS.pool || []).find(q2 => q2.id === id); if (q0 && !q0.t0) q0.t0 = performance.now();   // the clock starts at acceptance
  const pre = QUESTS.avail.find(q2 => q2.id === id) || null;
  if (window.CAMP && window.CAMP.on()) {   // CAMPAIGN: ONE main deed at a time — side errands ride WITH the level-up deed
    const mainN = QUESTS.active.filter(q2 => !q2.side).length, sideN = QUESTS.active.filter(q2 => q2.side).length;
    if (pre && pre.side) {
      if (sideN >= 1) { toast('⚡ One side errand at a time — finish it or set it aside'); return; }
      if (!QUESTS.active.some(q2 => q2.kind === 'xp')) { toast('⚡ Side errands serve the level-up deed — accept it first'); return; }
    } else if (mainN >= 1) { toast('📜 One deed at a time — the campaign demands focus'); return; }
  } else if (QUESTS.active.length >= 2) { toast('📋 Two deeds at most — finish what you started'); return; }
  const i = QUESTS.avail.findIndex(q => q.id === id);
  if (i < 0) return;
  const q = QUESTS.avail.splice(i, 1)[0];
  if (window.CAMP && window.CAMP.onAccept) window.CAMP.onAccept(q);
  q.acceptedDay = dayCount;
  if (!q.t0) q.t0 = performance.now(); QUESTS.active.push(q);
  audio.uiClick();
  toast(`${q.icon} Quest accepted: ${q.title}`);
  questHudDirty = true; renderQuests();
}
function abandonQuest(id) {
  const i = QUESTS.active.findIndex(q => q.id === id);
  if (i < 0) return;
  const q = QUESTS.active.splice(i, 1)[0];
  if (window.CAMP && window.CAMP.onAbandon) {   // CAMPAIGN: setting a deed aside returns you to the choice board — no XP, same stage
    if (window.CAMP.onAbandon(q)) { questHudDirty = true; return; }
  }
  QUESTS.avail.push(q); q.have = q.days ? 0 : q.have;
  toast(`📋 Set aside: ${q.title}`);
  questHudDirty = true; renderQuests();
}
function completeQuest(q) {
  if (q._done) return;   // M46 CAMPAIGN: completion is atomic — exactly once, ever (anti-exploit)
  q._done = true;
  RUN.quests++;
  if (q.side) RUN.side = (RUN.side || 0) + 1;   // the fast-XP channel, counted for the law's efficiency term
  if (q.t0) RUN.questTimes.push(+((performance.now() - q.t0) / 1000).toFixed(1));   // accept→complete age, seconds
  if (q.rw && q.rw.perk) RUN.perks.push({ stormborn: '🌩️ Weather-Worn', skywatcher: '⚡ Storm-Touched' }[q.rw.perk] || q.rw.perk);
  if (q.rw && q.rw.boost) RUN.perks.push({ maxHp: '❤️ Wild-Hardened', strongJaw: '🦷 Deep Bite' }[q.rw.boost] || q.rw.boost);
  const i = QUESTS.active.indexOf(q);
  if (i >= 0) QUESTS.active.splice(i, 1);
  q.doneT = tSec;
  QUESTS.done.push(q);
  questsDoneByBiome[q.biome] = (questsDoneByBiome[q.biome] || 0) + 1;
  addXp(q.rw.xp || 100);
  if (q.rw.items) for (const k in q.rw.items) { inv[k] = (inv[k] || 0) + q.rw.items[k]; }
  updateInv();
  if (q.rw.boost === 'maxHp') { wolf.maxHp += 5; wolf.hp += 5; wolf.hpBonus = (wolf.hpBonus || 0) + 5; toast('❤️ The wild hardens you: +5 max HP (permanent)', true); }
  if (q.rw.boost === 'strongJaw') { wolf.perks.strongJaw = true; toast('🦷 Your bite deepens: +1 damage (permanent)', true); }
  if (q.rw.perk === 'skywatcher') { wolf.perks.skywatcher = true; toast('🌩️ Storms bite you less now (permanent)', true); }
  if (q.rw.perk === 'stormborn') { wolf.perks.stormborn = true; toast('🌨️ Weather-worn: cold and wet cost less (permanent)', true); }
  if (q.rw.mapReveal) { BIG.range = Math.min(700, BIG.range + 130); toast('🗺️ Your map reaches further', true); }
  if (q.rw.ft && q.ftPos) { FAST_TRAVEL.push({ name: q.title.replace('Discover: ', ''), x: q.ftPos.x, z: q.ftPos.z }); toast('🗺️ Fast-travel point unlocked — click it on the big map', true); }
  toast(`✅ Quest complete: ${q.title} · +${q.rw.xp} XP`, true);
  music.fanfare();
  if (window.CAMP && window.CAMP.on() && q.camp) window.CAMP.onQuestComplete(q);   // CAMPAIGN: advance the machine, then refill
  else { refillQuests(); maybeAwakenBoss(q.biome); }   // free deeds (tests, ancients) keep the old board
  questHudDirty = true; renderQuests();
}
let caveDaysLock = -1;   // survival quests reset if you den
function questEvent(kind, data) {
  if (kind === 'kill') { RUN.kills++; if (data && data.species === 'predator') RUN.predators++; addXp(data && data.species === 'predator' ? 6 : 3); }   // unified XP trickle — bigger deeds, bigger XP
  for (const q of [...QUESTS.active]) {
    if (q.camp && window.CAMP && window.CAMP.onEvent && window.CAMP.onEvent(q, kind, data)) continue;   // CAMPAIGN kinds answer first; classic kinds fall through
    if (q.kind === 'hunt' && kind === 'kill' && data.species === q.species) {
      const bk = dominantBiomeAt(data.pos.x, data.pos.z).key;
      if (bk === q.biome || data.species !== 'deer') { q.have++; if (q.have >= q.need) completeQuest(q); else { questHudDirty = true; toast(`${q.icon} ${q.title}: ${q.have}/${q.need}`); } }
    } else if (q.kind === 'explore' && q.lmType && kind === 'discover' && data.type === q.lmType) {
      q.have = 1; q.ftPos = { x: data.x, z: data.z }; completeQuest(q);
    } else if (q.kind === 'explore' && q.peak && kind === 'height' && data.y > 50) {
      q.have = 1; completeQuest(q);
    } else if (q.kind === 'collect' && kind === 'gather' && data.item === q.item) {
      q.have++; if (q.have >= q.need) completeQuest(q); else { questHudDirty = true; toast(`${q.icon} ${q.title}: ${q.have}/${q.need}`); }
    } else if (q.kind === 'rival' && q.pack && kind === 'packDriven') {
      q.have = 1; completeQuest(q);
    } else if (q.kind === 'rival' && q.rival && kind === 'rival') {
      q.have++; if (q.have >= q.need) completeQuest(q); else { questHudDirty = true; toast(`${q.icon} ${q.title}: ${q.have}/${q.need}`); }
    } else if (q.kind === 'survive' && q.days && kind === 'day') {
      const since = dayCount - (q.prog0 !== undefined ? q.prog0 : q.acceptedDay);
      q.have = Math.min(q.need, since);
      if (since >= q.need) completeQuest(q); else questHudDirty = true;
    } else if (q.kind === 'survive' && q.stormy && kind === 'kill' && (weather.rain > 0.35 || weather.storm > 0.4 || weather.snow > 0.5)) {
      q.have++; if (q.have >= q.need) completeQuest(q); else { questHudDirty = true; toast(`${q.icon} ${q.title}: ${q.have}/${q.need}`); }
    }
  }
}
/* ---- quest log UI ---- */
function renderQuests() {
  const list = el('questList');
  if (!list) return;
  const src = questTab === 'active' ? QUESTS.active : questTab === 'avail' ? QUESTS.avail : QUESTS.done;
  list.innerHTML = '';
  if (!src.length) list.innerHTML = '<div class="qcard" style="opacity:.6">' + (questTab === 'active' ? 'No deeds underway. Seek the wild.' : questTab === 'avail' ? 'The wild is quiet… for now.' : 'Nothing written yet.') + '</div>';
  for (const q of src) {
    const d = document.createElement('div');
    d.className = 'qcard';
    const pct = Math.min(100, (q.have / q.need) * 100);
    d.innerHTML = `<div class="qt">${q.icon} ${q.title}</div><div class="qd">${q.desc}</div>` +
      `<div class="qr">Rewards: ${q.rwText || ''}</div><div class="qbar"><div style="width:${pct}%"></div></div>` +
      (questTab === 'active' ? `<button class="qact" data-ab="${q.id}">Set aside</button>` :
       questTab === 'avail' ? `<button class="qact" data-ac="${q.id}">Accept</button>` :
       `<span class="qdone">✓ done — the wild remembers</span>`);
    list.appendChild(d);
  }
}
function questHudTick() {
  if (questHudDirty) {
    questHudDirty = false;
    const tr = el('questTracker');
    if (tr) {
      let h = (window.CAMP && window.CAMP.on() && window.CAMP.hud) ? window.CAMP.hud() : '';
      h += `<div class="qt-line">⭐ Lv ${wolf.level} <b>${wolf.title}</b> · ${wolf.xp | 0}/${wolf.xpNext} XP</div>`;
      for (const q of QUESTS.active) h += `<div class="qt-line">${q.icon} ${q.title} — <b>${q.have}/${q.need}</b></div>`;
      tr.innerHTML = h;
    }
  }
}
function toggleQuestLog(force) {
  const q = el('questLog');
  if (!q) return;
  const show = force !== undefined ? force : !q.classList.contains('show');
  q.classList.toggle('show', show);
  if (show) { audio.uiClick(); renderQuests(); }
}

/* ---- fast travel: the paths you have earned ---- */
const FAST_TRAVEL = [];
let FT_HITS = [];
function bigMapTravel(e) {
  const cv = el('bigmap');
  if (!cv || !BIG.open) return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (cv.width / r.width), y = (e.clientY - r.top) * (cv.height / r.height);
  for (const f of FT_HITS) {
    if (Math.hypot(f.sx - x, f.sy - y) < 16) {
      if (caveState.in) { toast('🕳️ Not from under the earth'); return; }
      if (bosses.length) { toast('💀 Not while a legend watches'); return; }
      wolf.pos.x = f.x; wolf.pos.z = f.z; wolf.pos.y = heightAt(f.x, f.z) + 1;
      pool.burst(wolf.pos, 14, 0xbfe0ff, 1, 2, 2);
      toggleBigMap(false);
      toast(`🗺️ You take the old paths to ${f.name}`);
      return;
    }
  }
}
/* ============================================================
   BOSS-KIT BLESSINGS (v6.7) — the mystic world events arm the wolf for
   the Legend fight. The CLASSIC deeds used to be the only road to these
   perks — the campaign board doesn't carry them, so the wild itself gives:
   · ☄️  Deep Bite (perks.strongJaw): +1 permanent bite damage — claim the fallen star.
   · 🦌  Wild-Hardened (perks.wildHardened): +5 permanent max HP — be SEEN by the white stag (come within 12 m).
   Both are once-ever per run, survive death (hpBonus is recalc-safe), and ride the
   standard channels: toast + chime + fanfare + RUN.perks (the recap's achievement line).
   ============================================================ */
function grantPerkDeepBite() {
  if (typeof wolf === 'undefined' || wolf.perks.strongJaw) return false;
  wolf.perks.strongJaw = true;
  if (window.RUN) RUN.perks.push('☄️ Deep Bite — star-metal in the fangs');
  toast('☄️ Star-metal sings in your jaws — DEEP BITE: +1 bite damage (permanent)', true);
  audio.chime(); music.fanfare();
  return true;
}
function grantPerkWildHardened() {
  if (typeof wolf === 'undefined' || wolf.perks.wildHardened) return false;
  wolf.perks.wildHardened = true;
  wolf.hpBonus = (wolf.hpBonus || 0) + 5;
  recalcWolfLevel();                                     // maxHp = 100 + 8·level + hpBonus — survives death like every perk
  wolf.hp = Math.min(wolf.maxHp, wolf.hp + 5);
  if (window.RUN) RUN.perks.push('🦌 Wild-Hardened — the stag’s blessing');
  toast('🦌 The white stag meets your eyes — WILD-HARDENED: +5 max HP (permanent)', true);
  audio.chime(); music.fanfare();
  return true;
}

/* ============================================================
   LEGENDS — one beast per wild land, woken by your deeds
   ============================================================ */
const BOSSES = {
  forest:   { name: 'The Ancient Stag',  icon: '🦌', hp: 60,  dmg: 16, speed: 9.6, scale: 2.5, build: 'reindeer', glow: 0xffe2a0, special: 'summon',  ability: 'springSteps',  abilityName: 'Spring Steps',  abilityDesc: 'sprint stamina drains 25% slower' },
  mountain: { name: 'The Frost Bear',    icon: '🐻‍❄️', hp: 95, dmg: 21, speed: 8.4, scale: 2.7, build: 'bearP',    glow: 0xbfe8ff, special: 'ice',      ability: 'winterCoat',  abilityName: 'Winter Coat',  abilityDesc: 'blizzards and bitter cold bite half as deep' },
  tundra:   { name: 'The Frost Bear',    icon: '🐻‍❄️', hp: 95, dmg: 21, speed: 8.4, scale: 2.7, build: 'bearP',    glow: 0xbfe8ff, special: 'ice',      ability: 'winterCoat',  abilityName: 'Winter Coat',  abilityDesc: 'blizzards and bitter cold bite half as deep' },
  swamp:    { name: 'The Hydra Croc',    icon: '🐊', hp: 80,  dmg: 18, speed: 8.9, scale: 2.2, build: 'croc',     glow: 0x9fe89a, special: 'submerge', ability: 'secondWind',  abilityName: 'Second Wind',  abilityDesc: 'health regenerates 50% faster' },
  dry:      { name: 'The Thunder Bison', icon: '🐃', hp: 110, dmg: 24, speed: 8.0, scale: 2.4, build: 'bison',    glow: 0xffcf8a, special: 'charge',   ability: 'thunderCharge', abilityName: 'Thunder Charge', abilityDesc: 'sprint 12% faster' },
  grove:    { name: 'The Shadow Wolf',   icon: '🐺', hp: 70,  dmg: 19, speed: 10.4, scale: 1.9, build: 'shadow',  glow: 0x9a7aff, special: 'shadow',   ability: 'shadowStep',  abilityName: 'Shadow Step',  abilityDesc: 'prowling is nearly invisible' },
  volcanic: { name: 'The Sand Wyrm',     icon: '🐍', hp: 85,  dmg: 22, speed: 8.6, scale: 2.3, build: 'wyrm',     glow: 0xffb060, special: 'burrow',  ability: 'sandStride',  abilityName: 'Sand Stride',  abilityDesc: 'stamina returns 25% faster' }
};
const bosses = [];
let bossSlowmoT = 0;
function buildBossModel(def) {
  let g;
  if (def.build === 'shadow') {
    const w = buildWolf().group;
    w.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(0x14101c); o.material.transparent = true; o.material.opacity = 0.72; o.material.emissive = new THREE.Color(0x3a2a66); o.material.emissiveIntensity = 0.5; } });
    g = w;
  } else if (def.build === 'croc') {
    g = new THREE.Group();
    const bodyM = matColor(0x3a5a3a);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 4.4), bodyM); body.position.y = 0.5; g.add(body);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.6), matColor(0x466846)); jaw.position.set(0, 0.45, 2.9); g.add(jaw);
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), new THREE.MeshBasicMaterial({ color: def.glow })); eye.position.set(0.42 * s, 0.95, 1.9); g.add(eye); }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 5), bodyM); tail.rotation.x = Math.PI / 2; tail.position.set(0, 0.5, -3.1); g.add(tail);
    for (let i = 0; i < 4; i++) { const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), matColor(0x2c442c)); ridge.position.set(0, 0.98, -0.4 - i * 0.8); g.add(ridge); }
  } else if (def.build === 'wyrm') {
    g = new THREE.Group();
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const r = 0.85 - i * 0.09;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), matColor(0x8a6a42));
      seg.position.set(0, 0.8, -i * 1.05);
      seg.scale.set(1, 0.85, 1.15);
      g.add(seg);
      if (i < 4) { const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 4), matColor(0x6a4c2e)); fin.position.set(0, 0.8 + r, -i * 1.05); g.add(fin); }
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.6), matColor(0x9a7850)); head.position.set(0, 0.9, 1.4); g.add(head);
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshBasicMaterial({ color: def.glow })); eye.position.set(0.5 * s, 1.25, 2.0); g.add(eye); }
  } else if (def.build === 'bison') {
    const built = buildAnimal(SPECIES.elk);
    g = built.group || built;
    g.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.setHex(0x4a3626); } });
    const hump = new THREE.Mesh(new THREE.SphereGeometry(1.15, 7, 6), matColor(0x3c2c1e)); hump.position.set(0, 1.9, 0.6); hump.scale.set(1, 0.8, 1.2); g.add(hump);
  } else if (def.build === 'bearP') {
    const built = buildPredator(PREDATORS.bear);
    g = built.group;
    g.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.setHex(0xe8f0f4); } });
  } else if (def.modelSp) {
    // CAMPAIGN legends: the same species as the wild animal, scaled up and crowned
    let built;
    if (def.modelSp === 'eagle') built = buildEagle(PREDATORS.eagle).group;
    else built = buildPredator(PREDATORS[def.modelSp]).group;
    built.traverse(o => {   // a legend wears its aura
      if (o.isMesh && o.material && o.material.color && !o.material.emissive) {
        o.material = o.material.clone(); o.material.emissive = new THREE.Color(def.glow); o.material.emissiveIntensity = 0.16;
      }
    });
    g = built;
  } else {
    const built = buildAnimal(SPECIES.reindeer);
    g = built.group || built;
    g.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0xd8c9a8), 0.5); } });
  }
  g.scale.setScalar(def.scale);
  // the mark of a legend: a crown of light
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: def.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(3.6);
  halo.position.y = 2.6;
  halo.userData.halo = true;
  g.add(halo);
  g.userData.halo = halo;
  return g;
}
class Boss {
  constructor(biomeKey, x, z, isClone, defOverride) {
    this.biome = biomeKey;
    this.def = defOverride || BOSSES[biomeKey];
    this.isClone = !!isClone;
    this.sp = { label: this.def.name, scale: this.def.scale * 0.5, reach: 3.4, icon: this.def.icon };   // sp.scale*0.7 sets bite range for the player
    this.model = buildBossModel(this.def);
    if (isClone) this.model.scale.setScalar(this.def.scale * 0.66);
    scene.add(this.model);
    this.pos = V3(x, heightAt(x, z), z);
    this.heading = 0;
    this.hp = isClone ? Math.max(8, Math.round(this.def.hp * 0.32)) : this.def.hp;
    this.maxHp = this.hp;
    this.dead = false;
    this.state = 'stalk';
    this.atkCd = 0;
    this.biteT = 0; this.biteWind = 0.55; this.biteDmg = 0; this.biteKb = 1;   // telegraphed strike (v6.7)
    this.specT = 5 + Math.random() * 3;
    this.subT = 0;          // submerge/burrow timer
    this.invuln = false;
    this.chargeT = 0;       // bison telegraph/dash
    this.charging = false;
    this.icePatches = [];
    this.phase = 0;
    this.alt = 0;           // the eagle legend's sky
    this.chunkKey = ck(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
    const ch = chunks.get(this.chunkKey);
    if (ch) ch.predators.push(this);
    if (!isClone) {
      toast(`💀 ${this.def.name} has come!`, true);
      audio.growlVar('aggressive');
      const q = { id: 'boss' + (Math.random() * 1e9 | 0), kind: 'boss', biome: biomeKey, icon: this.def.icon, title: `Legend: ${this.def.name}`,
        desc: `Defeat ${this.def.name}. Its gift will be yours forever.`, need: 1, have: 0, rw: { xp: this.def.xp || 400 }, rwText: `${this.def.xp || 400} XP · ✨ ${this.def.abilityName} — ${this.def.abilityDesc}` };
      if (this.def.camp) { q.camp = this.def.camp; q.bossRef = this; q.campStage = 'boss'; }
      if (!q.t0) q.t0 = performance.now(); QUESTS.active.push(q);
      this.quest = q;
      questHudDirty = true;
    }
  }
  hit(dmg, behind, ambush) {
    if (this.dead || this.invuln) return;
    this.hp -= dmg * (ambush ? 1.5 : 1);
    this.flinchT = 0.2;
    bloodBurst(this.pos, 12 + dmg * 3, ambush ? 1.4 : 1);
    audio.boneCrunch();
    music.hitStab();
    const bb = el('bossBar');
    if (bb) el('bossFill').style.width = Math.max(0, this.hp / this.maxHp * 100) + '%';
    // phases: the legend will not fall quietly
    const f = this.hp / this.maxHp;
    if (!this.isClone && this.phase < 1 && f < 0.5) { this.phase = 1; toast(`💀 ${this.def.name} rears — the fight deepens`, true); audio.growlVar('aggressive'); }
    if (!this.isClone && this.phase < 2 && f < 0.25) { this.phase = 2; toast(`💀 ${this.def.name} is frenzied!`, true); }
    if (this.hp <= 0) this.die();
  }
  die() {
    if (this.dead) return;
    this.dead = true;
    pool.burst(this.pos, 60, this.def.glow, 3, 5, 4);
    pool.burst(this.pos, 40, 0xffe9b0, 2, 4, 3.4);
    bossSlowmoT = 1.5;                    // the world holds its breath
    audio.cry(0.4); audio.thud(); music.fanfare();
    if (!this.isClone) {
      this.def.slain = true; this.def.awake = false; this.def.live = false;   // a legend falls but once
      wolf.perks[this.def.ability] = true;
      addXp(this.def.xp || 400); RUN.bosses++;
      toast(`✨ ${this.def.name} falls — its gift is yours: ${this.def.abilityName} (${this.def.abilityDesc})`, true);
      if (this.quest) { const i = QUESTS.active.indexOf(this.quest); if (i >= 0) QUESTS.active.splice(i, 1); if (!this.quest._done) { this.quest._done = true; QUESTS.done.push(this.quest); questsDoneByBiome[this.biome] = (questsDoneByBiome[this.biome] || 0) + 1; } questHudDirty = true; }
      if (this.def.onSlain) this.def.onSlain(this);   // CAMPAIGN: story, rewards, next Legend
      /* BUG B9 (found by the speedrun rig): the shadow-wolf / beast-master echoes this
         Legend bred were never cleaned up. They outlived it at full damage, hunted the
         player through the NEXT leg of the campaign, and — because bosses[] stayed
         non-empty — permanently locked the old-path fast travel ("Not while a legend
         watches"). A legend's magic dies with the legend. */
      for (const c of [...bosses]) if (c !== this && c.isClone && !c.dead) { c.dead = true; c.dispose(); }
      const bb = el('bossBar'); if (bb) bb.classList.remove('show');
      music.boss = false;
    }
    this.dispose();
  }
  dispose() {
    const ch = chunks.get(this.chunkKey);
    if (ch) { const i = ch.predators.indexOf(this); if (i >= 0) ch.predators.splice(i, 1); }
    scene.remove(this.model);
    for (const p of this.icePatches) scene.remove(p);
    this.icePatches.length = 0;
    const i = bosses.indexOf(this);
    if (i >= 0) bosses.splice(i, 1);
    if (bosses.length === 0) { music.boss = false; const bb = el('bossBar'); if (bb) bb.classList.remove('show'); }
  }
  update(dt, tSec) {
    if (this.dead) return;
    const dx = wolf.pos.x - this.pos.x, dz = wolf.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const sp = this.def.speed * (1 + this.phase * (0.14 + (this.def.fury ? 0.10 : 0)));   // the tiger's fury: faster as it bleeds
    // submerged / burrowed: unhittable, repositions, then strikes
    if (this.subT > 0) {
      this.subT -= dt;
      this.model.visible = this.def.special === 'ice';
      if (this.subT <= 0) {
        this.invuln = false; this.model.visible = true;
        const a = Math.random() * 6.28;
        this.pos.x = wolf.pos.x + Math.sin(a) * 3.4; this.pos.z = wolf.pos.z + Math.cos(a) * 3.4;
        this.pos.y = heightAt(this.pos.x, this.pos.z);
        pool.burst(this.pos, 26, this.def.special === 'burrow' ? 0xc2a266 : 0x5a8a6a, 2, 3.4, 3);
        audio.thud();
        if (Math.hypot(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z) < 3.2)   // v6.7: the pack shields the emergence bite too
          if (!(window.PACK && window.PACK.intercept(this, this.def.dmg, this.def.name, this.def.icon)))
            wolfTakeDamage(this.def.dmg, this.pos, this.def.name, this.def.icon);
      }
      this.model.position.copy(this.pos);
      return;
    }
    // the bison's charge: telegraph, then thunder
    if (this.charging) {
      this.chargeT -= dt;
      this.pos.x += Math.sin(this.chargeDir) * 19 * dt;
      this.pos.z += Math.cos(this.chargeDir) * 19 * dt;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
      pool.burst(this.pos, 3, 0xc2a273, 1.4, 2.2, 1.8);
      if (Math.hypot(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z) < 2.6 && !this.chargeHit) {   // v6.7: a mate can throw itself under the charge
        this.chargeHit = true;
        if (!(window.PACK && window.PACK.intercept(this, this.def.dmg + 6, this.def.name, this.def.icon)))
          wolfTakeDamage(this.def.dmg + 6, this.pos, this.def.name, this.def.icon);
      }
      if (this.chargeT <= 0) { this.charging = false; this.atkCd = 1.6; }
      this.model.position.copy(this.pos); this.model.rotation.y = this.chargeDir;
      return;
    }
    // the Golden Eagle Legend: airborne — your window is the dive
    if (this.def.flight) {
      this.diveT = Math.max(0, (this.diveT || 0) - dt);
      this.diveCd = Math.max(0, (this.diveCd || 0) - dt);
      if (this.alt <= 1.35 && this.diveT <= 0) this.alt = Math.min(this.def.cruiseAlt || 13, this.alt + 5 * dt);
      if (this.diveT > 0) this.alt = Math.max(1.1, this.alt - 17 * dt);
      const onGround = this.alt <= 1.35;
      this.invuln = !onGround;                               // only strikeable in the dive window
      if (this.diveT <= 0 && d < 34 && this.diveCd <= 0) {
        this.diveT = 1.12; this.diveHit = false; this.divePass = 0;
        this.diveCd = (this.def.diveGap || 6) - this.phase * 1.1;
        audio.cry(0.5);
      }
      if (this.diveT > 0) {
        if (onGround) {
          const dw = Math.hypot(dx, dz) || 1;
          if (dw < 3.1 && !this.diveHit) {   // v6.7: the pack answers the sky too
            this.diveHit = true;
            if (!(window.PACK && window.PACK.intercept(this, this.def.dmg, this.def.name, this.def.icon)))
              wolfTakeDamage(this.def.dmg, this.pos, this.def.name, this.def.icon);
          }
          this.divePass += dt;
          this.pos.x += (dx / dw) * this.def.speed * 0.9 * dt;
          this.pos.z += (dz / dw) * this.def.speed * 0.9 * dt;
          if (this.divePass > 0.55) this.diveT = 0.01;        // skim past, climb away
        } else {
          this.pos.x += Math.sin(this.heading) * this.def.speed * 0.8 * dt;
          this.pos.z += Math.cos(this.heading) * this.def.speed * 0.8 * dt;
        }
      } else {
        this.circleA = (this.circleA === undefined ? Math.random() * 6.28 : this.circleA + dt * 1.15);
        this.pos.x = wolf.pos.x + Math.sin(this.circleA) * 11;
        this.pos.z = wolf.pos.z + Math.cos(this.circleA) * 11;
      }
      this.pos.y = heightAt(this.pos.x, this.pos.z) + this.alt;
      this.model.position.copy(this.pos);
      this.model.rotation.x = this.diveT > 0 ? 0.5 : -0.06;
      this.model.rotation.y = Math.atan2(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z);
      return;
    }
    // the Lion Legend's tactics: pace a ring around the prey, then pounce
    if (this.tacT > 0) {
      this.tacT -= dt;
      this.tacA = (this.tacA === undefined ? Math.random() * 6.28 : this.tacA + dt * 2.1);
      this.pos.x = wolf.pos.x + Math.sin(this.tacA) * 9;
      this.pos.z = wolf.pos.z + Math.cos(this.tacA) * 9;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
      this.model.position.copy(this.pos); this.model.rotation.y = this.tacA + Math.PI;
      if (this.tacT <= 0) {                                   // the pounce
        this.charging = true; this.chargeHit = false; this.chargeT = 0.52;
        this.chargeDir = Math.atan2(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z);
        audio.thud();
      }
      return;
    }
    /* ---- approach, and TURN like every other creature in the wild ----
       SPEEDRUN FIX v6.7 (the DPS wall — this made the tier-1 trophy UNREACHABLE):
       the heading used to SNAP onto the wolf on every single tick, so `facing` in
       Wolf.attack() was always +1.00 → every bite on a Legend was a FACE bite for
       1 damage. The whole advertised combat grammar (behind ×3 · flank ×2 · the
       blind-side AMBUSH ×1.5 · prowl +1 · Deep Bite +1) was dead content against
       bosses, so the deep Legends were a pure maths wall: Bear 112 hp = 84 s of
       uninterrupted biting, Beast Master 190 hp = 142 s, while the Legend lands
       14–26 damage every 1.25 s. Measured proof: test/speedrun/probe_boss_dps.mjs
       (boss-facing 1.00 from all 8 bearings, 1 dmg standing / 2 with Deep Bite).
       Now the heading EASES at a turn rate a sprinting wolf can outrun and a
       walking wolf cannot (orbit: sprint 13.5/4.4 m ≈ 3.1 rad/s > 2.2 rad/s;
       walk 7/4.4 ≈ 1.6 rad/s < 2.2), so the blind side is something you EARN —
       exactly the skill the rest of the game already teaches. */
    const wantH = Math.atan2(dx, dz);
    /* SPEEDRUN FIX v6.7b — CONSTANT-RATE turn, not exponential easing. Easing leaves a
       permanent bearing lag proportional to the target's orbit rate (lag ≈ ω/k), so even a
       player who merely WALKED the circle stayed outside the strike arc and the Legend
       could not bite anything: probe 3 measured 0.09 dps in over 200 s. A constant-rate
       turn is the honest race it should be — a Legend that turns faster than you run
       catches up and holds your bearing (you eat the swing), one that turns slower never
       does (it bites air). Walk 7 m/s at 3.9 m = 1.8 rad/s < 2.2 → caught.
       Sprint 13.5 m/s at 3.9 m = 3.5 rad/s > 2.2 → never caught. */
    const turnRate = (this.def.flight ? 5 : 2.2) * (1 + this.phase * 0.15) * (this.biteT > 0 ? 0.18 : 1);
    const dTurn = wrapPI(wantH - this.heading);
    const stepT = Math.min(Math.abs(dTurn), turnRate * dt);
    this.heading = wrapPI(this.heading + (dTurn < 0 ? -stepT : stepT));
    if (this.biteT > 0) {
      /* SPEEDRUN FIX v6.7 (the survival wall): the Legend's bite used to land the
         instant its cooldown expired, from any angle, with no wind-up — an
         undodgeable 11–21 dps. It now plants, telegraphs (growl + dust + rear-back,
         the same 0.36→0.55 s claw-then-bite every predator and rival wolf uses) and
         the blow lands where the swing ENDS, inside the same ~78° arc the player's
         own bite uses. Keep sprinting the circle and the Legend bites air; hesitate,
         walk, or run out of stamina and you eat it. */
      this.biteT -= dt;
      this.model.rotation.x = -0.20 * Math.max(0, this.biteT / this.biteWind);
      if (this.biteT <= 0) {
        this.model.rotation.x = 0;
        const dd = Math.hypot(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z);
        const dot = dd ? (Math.sin(this.heading) * (wolf.pos.x - this.pos.x) + Math.cos(this.heading) * (wolf.pos.z - this.pos.z)) / dd : 1;
        if (dd <= this.sp.reach * 1.35 && dot >= 0.2) {
          if (!(window.PACK && window.PACK.intercept(this, this.biteDmg, this.def.name, this.def.icon)))
            wolfTakeDamage(this.biteDmg, this.pos, this.def.name, this.def.icon, this.biteKb);
        } else {   // a whiff — the player circled out of the arc
          pool.burst(V3(this.pos.x + Math.sin(this.heading) * 2.3, this.pos.y + 1.2, this.pos.z + Math.cos(this.heading) * 2.3), 7, 0xd8d2c0, 0.9, 1.5, 1.9);
          audio.thud();
        }
      }
    } else if (d > this.sp.reach + 0.6) {
      /* BUG B10 (found by the speedrun rig, 2026-09-02): the Legend used to WALK ALONG ITS
         OWN NOSE. That is honest for the strike arc — the constant-rate neck turn (fix v6.7b)
         is the whole blind-side grammar — but it is degenerate for locomotion: a player who
         wins the turn race (orbit 3.1 rad/s vs neck 2.2) puts the nose past 90°, and the
         beast then runs AWAY from the very player who outmanoeuvred it, at 12.5 m/s against
         the wolf's 13.5. Measured with test/speedrun/probe_fight.mjs: the reward for owning
         the blind side was a 1 m/s chase that never ended, every arrival was head-on, so
         every bite was a FACE bite for 1 damage and the tier-1 trophy stayed out of reach.
         THE BODY NOW PURSUES THE PREY; ONLY THE HEAD IS LIMITED BY THE NECK. heading still
         eases at 2.2 rad/s and still decides where the swing lands, so nothing about the
         combat grammar changes — a Legend simply no longer flees its own blind side. */
      this.pos.x += (dx / d) * sp * dt;
      this.pos.z += (dz / d) * sp * dt;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
    } else if (this.atkCd <= 0) {
      this.atkCd = (this.def.atkGap || 1.25) - this.phase * 0.15;
      let kbMul = 1;
      if (this.def.special === 'knockback') { kbMul = 2.6; this.atkCd += 0.3; }   // the Bear Legend throws you
      this.biteDmg = this.def.dmg * (this.def.special === 'knockback' ? 1.1 : 1) * (this.ambushNext ? 1.5 : 1);
      this.biteKb = this.ambushNext ? Math.max(kbMul, 1.7) : kbMul;
      this.biteWind = 0.55; this.biteT = this.biteWind;   // plant + telegraph, then the swing
      this.ambushNext = 0;
      pool.burst(V3(this.pos.x, this.pos.y + 1.3, this.pos.z), 9, 0xffd9a0, 1.0, 1.7, 2.1);
      audio.growlVar('aggressive');
    }
    this.atkCd -= dt;
    // the special, each legend its own
    this.specT -= dt * (1 + this.phase * 0.3);
    if (this.specT <= 0 && d < 60) {
      this.specT = this.def.special === 'shadow' ? 7 : this.def.special === 'ambush' ? 8 : this.def.special === 'tactics' ? 9 : this.def.special === 'fury' ? 10 : this.def.special === 'echo' ? 8 : this.def.special === 'dive' ? 7 : 11 - this.phase * 2;
      const sp2 = this.def.special;
      if (sp2 === 'summon') {
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * 6.28;
          const f2 = new Animal('deer', this.pos.x + Math.sin(a) * 5, this.pos.z + Math.cos(a) * 5);
          f2.startFlee(this.pos);
          const chp = chunks.get(ck(Math.floor(f2.pos.x / CHUNK), Math.floor(f2.pos.z / CHUNK)));
          if (chp) chp.animals.push(f2);
        }
        pool.burst(this.pos, 14, 0xd8c9a8, 1.4, 2.6, 2.2);
      } else if (sp2 === 'ice') {
        const p = new THREE.Mesh(new THREE.CircleGeometry(2.6, 14), new THREE.MeshBasicMaterial({ color: 0xbfe4f4, transparent: true, opacity: 0.4, depthWrite: false }));
        p.rotation.x = -Math.PI / 2;
        p.position.set(wolf.pos.x, heightAt(wolf.pos.x, wolf.pos.z) + 0.05, wolf.pos.z);
        scene.add(p); this.icePatches.push(p);
      } else if (sp2 === 'submerge' || sp2 === 'burrow') {
        this.subT = 3.2; this.invuln = true; this.model.visible = false;
        pool.burst(this.pos, 20, sp2 === 'burrow' ? 0xc2a266 : 0x4a6a5a, 1.6, 2.6, 2.4);
      } else if (sp2 === 'charge') {
        this.charging = true; this.chargeHit = false;
        this.chargeT = 1.15;
        this.chargeDir = Math.atan2(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z);
        pool.burst(this.pos, 16, 0xc2a273, 1.4, 2.4, 2);   // dust flies: the ground warns you
        audio.thud();
      } else if (sp2 === 'shadow') {
        pool.burst(this.pos, 22, 0x6a4ac2, 1.6, 2.8, 2.4);
        const a = Math.random() * 6.28;
        this.pos.x = wolf.pos.x + Math.sin(a) * 13; this.pos.z = wolf.pos.z + Math.cos(a) * 13;
        this.pos.y = heightAt(this.pos.x, this.pos.z);
        pool.burst(this.pos, 22, 0x8a6ae2, 1.6, 2.8, 2.4);
        if (this.phase >= 1 && bosses.filter(b => !b.dead && b.isClone).length < 2) bosses.push(new Boss(this.biome, this.pos.x + 2, this.pos.z, true));   // shadows breed shadows
      } else if (sp2 === 'ambush') {   // LEOPARD: gone, then at your flank in a breath
        pool.burst(this.pos, 18, 0xcfe0ee, 1.5, 2.5, 2.2);
        const back = wolf.yaw + Math.PI + (Math.random() < 0.5 ? 0.55 : -0.55);
        this.pos.x = wolf.pos.x + Math.sin(back) * 6.5; this.pos.z = wolf.pos.z + Math.cos(back) * 6.5;
        this.pos.y = heightAt(this.pos.x, this.pos.z);
        this.ambushNext = 1;
        pool.burst(this.pos, 14, 0xd8ecf8, 1.3, 2.1, 1.9);
        audio.cry(0.3);
      } else if (sp2 === 'fury') {     // TIGER: a lunge across the clearing
        this.charging = true; this.chargeHit = false; this.chargeT = 0.62;
        this.chargeDir = Math.atan2(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z);
        pool.burst(this.pos, 12, 0xc2a273, 1.2, 2, 1.8);
        audio.thud();
      } else if (sp2 === 'tactics') {  // LION: mark the ring…
        this.tacT = 2.4;
        pool.burst(this.pos, 10, 0xe6cf9a, 1.2, 2, 1.6);
        audio.growlVar('warning');
      } else if (sp2 === 'echo') {     // BEAST MASTER: the dark gives back your own
        pool.burst(this.pos, 26, 0xff5040, 1.9, 3.1, 2.7);
        const a = Math.random() * 6.28;
        this.pos.x = wolf.pos.x + Math.sin(a) * 12; this.pos.z = wolf.pos.z + Math.cos(a) * 12;
        this.pos.y = heightAt(this.pos.x, this.pos.z);
        pool.burst(this.pos, 20, 0xff8a70, 1.5, 2.6, 2.3);
        if (this.phase >= 1 && bosses.filter(b => !b.dead && b.isClone).length < 3) bosses.push(new Boss(this.biome, this.pos.x + 3, this.pos.z, true, this.def));
      }
    }
    // fade ice patches
    for (let i = this.icePatches.length - 1; i >= 0; i--) {
      const p = this.icePatches[i];
      p.material.opacity -= dt * 0.05;
      if (p.material.opacity <= 0.05) { scene.remove(p); this.icePatches.splice(i, 1); }
    }
    // the halo breathes
    if (this.model.userData.halo) this.model.userData.halo.material.opacity = 0.35 + 0.2 * Math.sin(tSec * 2.4);
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading;
  }
}
function maybeAwakenBoss(biome) {
  const def = BOSSES[biome];
  if (!def || def.awake || def.slain) return;
  if ((questsDoneByBiome[biome] || 0) < 3) return;
  if (!SPIRIT.met) return;
  def.awake = true;
  toast(`💀 A legend stirs: ${def.name} in the ${BIOME_INFO[biome].name}…`, true);
  audio.growlVar('warning');
}
function bossTick(dt) {
  // spawn the awakened legend when you walk its land
  for (const k in BOSSES) {
    const def = BOSSES[k];
    if (def.awake && !def.slain && !def.live && curBiomeKey === k && !caveState.in) {
      def.live = true;
      const a = Math.random() * 6.28;
      const x = wolf.pos.x + Math.sin(a) * 65, z = wolf.pos.z + Math.cos(a) * 65;
      bosses.push(new Boss(k, x, z));
    }
  }
  for (const b of [...bosses]) b.update(dt, tSec);
  // the bar and the music of legends
  let show = null;
  for (const b of bosses) if (!b.isClone && !b.dead) { const d = Math.hypot(b.pos.x - wolf.pos.x, b.pos.z - wolf.pos.z); if (d < 120) show = b; }
  const bb = el('bossBar');
  if (bb) {
    if (show) {
      bb.classList.add('show');
      el('bossName').textContent = `${show.def.icon} ${show.def.name}${show.phase >= 2 ? ' — FRENZIED' : show.phase >= 1 ? ' — ENRAGED' : ''}`;
      el('bossFill').style.width = Math.max(0, show.hp / show.maxHp * 100) + '%';
    } else bb.classList.remove('show');
  }
  music.boss = !!show;
}
/* ============================================================
   THE SPIRIT WOLF — an old ghost who remembers everything
   ============================================================ */
const SPIRIT = { met: false, active: null, cd: 60, lines: [
  'The lands keep count of your deeds, little hunter. Three in one land, and its legend wakes.',
  'I ran these hills when the ice was young. The stag with the burning crown still owes me a race.',
  'Caves remember. Sleep in one and the sky forgets you for a day.',
  'When the pack that is not yours flees before you, you are beginning to be a wolf worth fearing.',
  'The white stag is old and clever. Come from behind, as I taught your grandsire.',
  'The wyrm under the ember wastes feels your footsteps through the sand. Keep moving.',
  'Storms are loud. Loud things cannot hear you prowl.'
] };
let CINEMA = { active: false, t: 0, dur: 10 };
function spiritTick(dt) {
  if (CINEMA.active) {
    CINEMA.t += dt;
    inputClear();
    const k = Math.min(1, CINEMA.t / CINEMA.dur);
    const a = k * Math.PI * 2 - Math.PI / 2;
    camera.position.set(wolf.pos.x + Math.sin(a) * 150, Math.max(wolf.pos.y + 80, 70), wolf.pos.z + Math.cos(a) * 150);
    camera.lookAt(wolf.pos.x, wolf.pos.y + 4, wolf.pos.z);
    if (CINEMA.t >= CINEMA.dur) {
      CINEMA.active = false;
      el('cineTop').classList.remove('on'); el('cineBot').classList.remove('on');
      toast('🐺 The Spirit Wolf: "Three deeds in one land wake its legend. Seek the ghost-lights."', true);
    }
    return;
  }
  SPIRIT.cd -= dt;
  if (SPIRIT.active) {
    const sp = SPIRIT.active;
    sp.t += dt;
    sp.model.position.y = heightAt(sp.x, sp.z) + 0.15 + Math.sin(sp.t * 1.7) * 0.12;
    sp.model.rotation.y = Math.atan2(wolf.pos.x - sp.x, wolf.pos.z - sp.z);
    if (sp.t > 12) {   // the message fades with the mist
      pool.burst(V3(sp.x, heightAt(sp.x, sp.z) + 1, sp.z), 30, 0xcfe4ff, 1.4, 2.6, 2.6);
      scene.remove(sp.model);
      SPIRIT.active = null;
      el('spiritCard').classList.remove('show');
    }
    return;
  }
  if (SPIRIT.cd > 0 || caveState.in) return;
  SPIRIT.cd = 90 + Math.random() * 60;
  // he waits by the mouths of caves
  for (const lm of landmarkList) {
    if (lm.type !== 'cave') continue;
    const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
    if (d > 55 && d < 90 && Math.random() < 0.5) {
      const g = buildWolf().group;
      g.traverse(o => {
        if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(0xdde8f2); o.material.transparent = true; o.material.opacity = 0.55; o.material.emissive = new THREE.Color(0x9fd0ff); o.material.emissiveIntensity = 0.35; }
      });
      g.scale.setScalar(1.06);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: 0xbfe0ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(3.2); halo.position.y = 1.4; g.add(halo);
      const a = Math.random() * 6.28;
      const sx = lm.x + Math.sin(a) * 7, sz = lm.z + Math.cos(a) * 7;
      g.position.set(sx, heightAt(sx, sz) + 0.15, sz);
      scene.add(g);
      pool.burst(V3(sx, heightAt(sx, sz) + 1, sz), 18, 0xcfe4ff, 1.2, 2.2, 2.4);
      audio.howl(0.5);
      SPIRIT.active = { model: g, x: sx, z: sz, t: 0 };
      const card = el('spiritCard');
      if (card) {
        const line = SPIRIT.lines[(Math.random() * SPIRIT.lines.length) | 0];
        card.innerHTML = `<div class="who">🐺 THE SPIRIT WOLF</div>${line}`;
        card.classList.add('show');
        setTimeout(() => card.classList.remove('show'), 9000);
      }
      if (!SPIRIT.met) {
        SPIRIT.met = true;
        CINEMA.active = true; CINEMA.t = 0;
        el('cineTop').classList.add('on'); el('cineBot').classList.add('on');
        audio.howl(0.55);
        setTimeout(() => audio.ready && audio.howl(0.62), 2800);
        toast('🐺 An old wolf of light looks at you — and the world opens…', true);
      } else {
        toast('🐺 The Spirit Wolf fades into the mist…');
      }
      break;
    }
  }
}
/* ---- quest cadence: markers, waypoints, the golden quarry ---- */
let questMarkT = 0, questMarks = [];
function questTick(dt) {
  questHudTick();
  questMarkT -= dt;
  if (questMarkT <= 0) {
    questMarkT = 0.5;
    // hunt targets glow gold through the trees
    for (const m of questMarks) scene.remove(m);
    questMarks.length = 0;
    for (const q of QUESTS.active) {
      if (q.kind !== 'hunt') continue;
      for (const ch of chunks.values())
        for (const a of ch.animals) {
          if (a.dead || a.name !== q.species) continue;
          const d = a.pos.distanceTo(wolf.pos);
          if (d > 50) continue;
          const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: 0xffd76a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
          mk.scale.setScalar(1.6);
          mk.position.set(a.pos.x, a.pos.y + 2.2 + a.sp.scale, a.pos.z);
          mk.renderOrder = 6;
          scene.add(mk);
          questMarks.push(mk);
        }
    }
  }
  // collection finds shimmer
  for (const q of QUESTS.active) {
    if (q.kind !== 'collect' || Math.random() > 0.3) continue;
    for (const ch of chunks.values()) {
      if (Math.abs(ch.cx * CHUNK + 32 - wolf.pos.x) > 60 || Math.abs(ch.cz * CHUNK + 32 - wolf.pos.z) > 60) continue;
      for (const p of ch.pickups) {
        if (p.gathered || (PICKUP_DEF[p.type] || {}).inv !== q.item) continue;
        if (Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z) < 26) pool.burst(V3(p.x, p.y + 0.5, p.z), 1, 0xffd76a, 0.4, 0.9, 0.8);
      }
    }
  }
}

/* ---------------- UI ---------------- */
const el = id => document.getElementById(id);
const ui = {
  weatherIcon: el('weatherIcon'), weatherLabel: el('weatherLabel'),
  clock: el('clock'), biome: el('biome'),
  prompt: el('prompt'),
  stam: el('stamFill'), toasts: el('toasts'), hud: el('hud'),
  overlay: el('overlay'), ovTitle: el('ovTitle'), ovBody: el('ovBody')
};
function toast(msg, big) {
  const d = document.createElement('div');
  d.className = 'toast' + (big ? ' big' : '');
  d.textContent = msg;
  ui.toasts.appendChild(d);
  requestAnimationFrame(() => d.classList.add('show'));
  setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 500); }, big ? 3400 : 2600);
  while (ui.toasts.children.length > 4) ui.toasts.firstChild.remove();
}
function updateInv() {
  for (const k in inv) {
    const n = el('chip-' + k);
    if (n) n.textContent = inv[k];
  }
}
let portraitMQ = null;
try { portraitMQ = matchMedia('(orientation: portrait)'); } catch (e) { }
let lastBiomeKey = null, biomeToastT = 0, curBiomeKey = 'forest';
let hudT = 0, fpsAcc = 0, fpsN = 0, fpsShow = 60;
let shroomGlowT = 0;
function updateMagicGlow(dt) {
  // moon petals breathe — brightest at night
  matGlow.emissiveIntensity = (dayF < 0.35 ? 0.85 : 0.3) * (0.75 + 0.25 * Math.sin(tSec * 1.7));
  // fallen-star sites fade back into the wild
  if (meteorSite) {
    meteorSite.ttl -= dt;
    if (meteorSite.ttl <= 0) {
      scene.remove(meteorSite.group);
      meteorSite.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
      const li = landmarkList.indexOf(meteorSite.lm);
      if (li >= 0) landmarkList.splice(li, 1);
      meteorSite = null;
    }
  }
  // shrine embers pulse · waterfall spray
  for (const lm of landmarkList) {
    if (lm.ember) {
      if (lm.type === 'wolfShrine') lm.ember.material.color.setHSL(0.55, 0.8, 0.6 + Math.sin(tSec * 2.2 + lm.x) * 0.2);
      else if (lm.type === 'hiddenValley') lm.ember.material.color.setHSL(0.78, 0.6, 0.62 + Math.sin(tSec * 1.6 + lm.x) * 0.18);
      else lm.ember.material.color.setHSL(0.1, 0.9, 0.55 + Math.sin(tSec * 3 + lm.x) * 0.2);
    }
    if (lm.mist && Math.random() < 0.5 && Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z) < 130)
      pool.burst(V3(lm.x + lm.mist.x + (Math.random() - 0.5) * 3, lm.model.position.y + 5.5 + Math.random() * 3.5, lm.z + lm.mist.z + (Math.random() - 0.5) * 2), 1, 0xd8ecf4, 0.5, 1.4, 0.9);
  }
  shroomGlowT -= dt;
  if (shroomGlowT > 0) return;
  shroomGlowT = 0.4;
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const ch = chunks.get(ck(ccx + dx, ccz + dz));
      if (!ch) continue;
      for (const p of ch.pickups) {
        if (p.gathered || p.type !== 'magicShroom') continue;
        if (Math.hypot(p.x - wolf.pos.x, p.z - wolf.pos.z) < 42)
          pool.burst(V3(p.x, p.y + 0.7, p.z), 1, 0xb07aff, 0.25, 0.7, 0.3);
      }
    }
}
/* ---------------- combat: wolf health & threat UI ---------------- */
let vignetteA = 0, warnBannerT = 0;
function setVignette(a) { vignetteA = Math.max(vignetteA, a); }
function wolfDie(label, icon) {
  RUN.cause = label || 'the wild'; RUN.icon = icon || '💀';
  RUN.dur = (performance.now() - RUN.t0) / 1000;
  try {
    localStorage.setItem('revontulet_lastRun', JSON.stringify(RUN));
    const best = JSON.parse(localStorage.getItem('revontulet_bestRun') || 'null');
    if (!best || RUN.maxLevel > best.maxLevel || (RUN.maxLevel === best.maxLevel && RUN.xp > best.xp))
      localStorage.setItem('revontulet_bestRun', JSON.stringify(RUN));
  } catch (e) { }
  wolf.hp = 0;
  wolf.deadT = 2.6;
  wolf.diedAt = { x: wolf.pos.x, z: wolf.pos.z };                       // the fall's spot — you wake NEAR it
  wolf.fellTo = wolf.killerPos ? { x: wolf.killerPos.x, z: wolf.killerPos.z } : null;   // and away from the killer
  wolf.killerPos = null;
  const ov = el('deathOv');
  if (ov) { ov.querySelector('#deathMsg').innerHTML = `${icon || '💀'} <b>Slain by ${label || 'the wild'}</b><br><span style="font-size:14px;opacity:.85">Your deed is lost and your level progress resets — and the higher you climb, the dearer the wild's price.</span>`; ov.classList.add('show'); }
  vignetteA = 0.9;
}
function wolfTakeDamage(dmg, fromPos, label, icon, kbMul) {
  if (state !== 'play' || wolf.deadT > 0 || wolf.invulnT > 0 || wolf.flyT > 0) return;
  wolf.hp -= dmg * wolfDamageMul();   // an experienced wolf stiffens against the blow
  wolf.lastHurt = tSec;
  wolf.killerPos = { x: fromPos.x, z: fromPos.z };   // remembered for the respawn: wake NEAR the fall, away from the killer
  wolf.invulnT = 0.6;
  vignetteA = Math.min(0.85, vignetteA + 0.45);
  audio.thud();
  // knocked back a step (kbMul: the Bear Legend and pals throw the wolf for real)
  const kb = Math.max(0.4, kbMul || 1);
  const dx = wolf.pos.x - fromPos.x, dz = wolf.pos.z - fromPos.z;
  const l = Math.hypot(dx, dz) || 1;
  const nx = wolf.pos.x + dx / l * 1.1 * kb, nz = wolf.pos.z + dz / l * 1.1 * kb;
  if (heightAt(nx, nz) > WATER_Y + 0.2) { wolf.pos.x = nx; wolf.pos.z = nz; }
  if (wolf.hp <= 0) wolfDie(`the ${label || 'wild'}`, icon);
}
function wolfRespawn() {
  if (caveState.in) exitCave();   // no dying underground: the wild carries you back to the mouth
  // NEW LAW: wake NEAR the fall (14–44 m), on dry land, away from the killer and from living predators
  const spot = wolf.diedAt || { x: wolf.pos.x, z: wolf.pos.z };
  const away = wolf.fellTo ? Math.atan2(spot.x - wolf.fellTo.x, spot.z - wolf.fellTo.z) : Math.random() * Math.PI * 2;
  let rx = spot.x, rz = spot.z, found = false;
  for (let i = 0; i < 22 && !found; i++) {
    const a2 = away + (Math.random() - 0.5) * 1.9;   // mostly away, some scatter
    const r = 14 + Math.random() * 30;
    const tx = spot.x + Math.sin(a2) * r, tz = spot.z + Math.cos(a2) * r;
    if (heightAt(tx, tz) <= WATER_Y + 0.8) continue;
    let safe = true;
    const ccx = Math.floor(tx / CHUNK), ccz = Math.floor(tz / CHUNK);
    for (let dzz = -1; dzz <= 1 && safe; dzz++) for (let dxx = -1; dxx <= 1 && safe; dxx++) {
      const ch = chunks.get(ck(ccx + dxx, ccz + dzz));
      if (!ch) continue;
      for (const pr of ch.predators) if (!pr.dead && Math.hypot(pr.pos.x - tx, pr.pos.z - tz) < 24) { safe = false; break; }
    }
    if (safe) { rx = tx; rz = tz; found = true; }
  }
  wolf.pos.x = rx; wolf.pos.z = rz; wolf.pos.y = heightAt(rx, rz) + 0.2;
  // DEATH RIGOR — the penalty hardens with every level gained (a time cost, never a trophy cost):
  //   · every death cancels the bar → you restart the current level (beginning of the previous level)
  //   · from level 12 the wild takes levels too: 12–16 → −1 · 17–21 → −2 · 22–26 → −3 · 27+ → −4 (cap)
  //   · career XP (xpTotal), tier, legend, stage and the run timer ALWAYS STAND — the goal stays
  //     "higher-tier trophies in the shortest run", so deaths cost time, never progress.
  const rigLv = wolf.level;
  const regress = rigLv >= 12 ? Math.min(4, 1 + ((rigLv - 12) / 5 | 0)) : 0;
  if (regress) wolf.level = Math.max(0, rigLv - regress);
  wolf.xp = 0;                              // cancel the level bar
  wolf.xpNext = xpNeed(wolf.level);         // restart the bar of the (previous) level
  window.RUN = window.freshRun();   // the session record restarts — the campaign record stands
  if (window.CAMP && window.CAMP.onDeath) window.CAMP.onDeath();   // CAMPAIGN: the deed fails → back to the board for a manual re-accept; stage/tier/timer/progression stand (no timer exploit)
  recalcWolfLevel();
  wolf.hp = wolf.maxHp;
  wolf.invulnT = 3;
  wolf.deadT = 0;
  wolf.stamina = wolf.maxStam; wolf.exhausted = false;
  const ov = el('deathOv');
  if (ov) ov.classList.remove('show');
  vignetteA = 0;
  questHudDirty = true;
  toast(regress
    ? `💀 The wild takes its due — Level ${rigLv} → ${wolf.level}. The deed is lost; the hunt for the Legend continues.`
    : '🐾 You wake near where you fell — the deed is lost, your level bar resets. The hunt for the Legend continues.', true);
}
function showTerritoryWarning(sp) {
  const w = el('threatWarn');
  if (!w) return;
  warnBannerT = 3;
  w.innerHTML = `⚠️ ${sp.icon} <b>${sp.label.toUpperCase()} TERRITORY</b> — it has seen you! — 3.0s`;
  w.style.display = 'block';
}
function updateThreatArrow() {
  const arrow = el('threatArrow');
  if (!arrow) return;
  let best = null, bestD = 130;
  for (const ch of chunks.values()) {
    for (const pr of ch.predators) {
      if (pr.dead || !pr.threatening) continue;
      const d = pr.pos.distanceTo(wolf.pos);
      if (d < bestD) { bestD = d; best = pr; }
    }
  }
  if (!best || wolf.flyT > 0) { arrow.style.display = 'none'; return; }
  arrow.style.display = 'block';
  const a = Math.atan2(best.pos.x - wolf.pos.x, best.pos.z - wolf.pos.z);
  // screen-forward is camYaw + PI (camera sits at +camYaw behind the wolf)
  const deg = (camYaw + Math.PI - a) * 180 / Math.PI;
  arrow.style.transform = `translate(-50%,-50%) rotate(${deg}deg)`;
}

/* ---------------- minimap ---------------- */
const MM = { size: 168, px: 64, range: 150, t: 0, lastX: 1e9, lastZ: 1e9, on: true };
addEventListener('pointerdown', e => { if (e.target && e.target.id === 'minimap') { e.stopPropagation(); audio.uiClick(); toggleBigMap(true); } }, true);
const mmBase = document.createElement('canvas'); mmBase.width = MM.px; mmBase.height = MM.px;
const mmBaseCtx = mmBase.getContext('2d');
const MM_RES_DOT = {};
for (const k in PICKUP_DEF) MM_RES_DOT[k] = '#' + new THREE.Color(PICKUP_DEF[k].color).getHexString();
function mapTerrainPass(ctx, px, range, cx, cz) {
  const img = ctx.createImageData(px, px);
  const step = range * 2 / px;
  for (let j = 0; j < px; j++) {
    for (let i = 0; i < px; i++) {
      const wx = cx + (i - px / 2) * step, wz = cz + (j - px / 2) * step;
      const h = heightAt(wx, wz);
      const o = (j * px + i) * 4;
      let r = 0, g = 0, b = 0;
      if (h < WATER_Y - 0.15) {              // clear blue water marks, depth-shaded
        const d = Math.min(1, (WATER_Y - h) / 4.5);
        r = 46 + (1 - d) * 60; g = 120 + (1 - d) * 70; b = 210 + (1 - d) * 40;
      } else {
        const cl = climateAt(wx, wz, h);
        const w = biomeWeights(wx, wz, h, cl.temp, cl.moist);
        let sum = 0;
        for (const k in w) {
          const c = GROUND[k]; if (!c) continue;
          r += c.r * w[k]; g += c.g * w[k]; b += c.b * w[k]; sum += w[k];
        }
        if (sum > 0) { r /= sum; g /= sum; b /= sum; }
        const sh = 0.75 + Math.min(0.45, h / 60) * 0.5;
        r = Math.min(255, r * 255 * sh); g = Math.min(255, g * 255 * sh); b = Math.min(255, b * 255 * sh);
      }
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
/* ---------------- quest guidance: one source of truth ----------------
   Returns the nearest known point that completes the first guidable active quest.
   The map line, the ground arrow — and the autopilot — all read this. */
window.__qgLock = null;   // the committed destination — held until reached, done, or lost
window.questGuide = function () {
  try {
    const dist2 = (x, z) => Math.hypot(x - wolf.pos.x, z - wolf.pos.z);
    const L = window.__qgLock;
    if (L) {   // ---- keep pointing at the SAME place: validate, track, never wander ----
      const q = QUESTS.active.find(a => a.id === L.qid);
      let live = !!q;
      if (live) {
        if (L.an) { if (L.an.dead) live = false; else { L.x = L.an.pos.x; L.z = L.an.pos.z; } }          // quarry roams — follow THAT animal
        else if (L.pk) { if (L.pk.gathered) live = false; }
        else if (L.rv) { if (L.rv.dead) live = false; else { L.x = L.rv.pos.x; L.z = L.rv.pos.z; } }
        else if (L.lm && L.lm.found) live = false;
        if (live && !L.an && !L.rv && dist2(L.x, L.z) < 9) live = false;   // arrived at a fixed place — decide the next
      }
      if (live) return { x: L.x, z: L.z, d: dist2(L.x, L.z), label: L.label, kind: L.kind };
      window.__qgLock = null;
    }
    // ---- decide ONCE: the NEAREST reachable place among all active quests — then commit to it ----
    let best = null;
    for (const q of QUESTS.active) {
      let c = null;
      if (q.kind === 'explore' && q.lmType) {
        for (const lm of landmarkList) {
          if (lm.type !== q.lmType || lm.found) continue;
          const d = dist2(lm.x, lm.z);
          if (!c || d < c.d) c = { x: lm.x, z: lm.z, d, label: q.title, kind: 'explore', lm };
        }
        /* SPEEDRUN FIX v6.7: landmarkList only holds landmarks whose chunk is
           streamed, so a deed that named a landmark 500 m out lost its gold line the
           moment that chunk unloaded — the player was left walking blind on a deed
           that could not be finished. The deed remembers the place it promised. */
        if (!c && q.wp) c = { x: q.wp.x, z: q.wp.z, d: dist2(q.wp.x, q.wp.z), label: q.title, kind: 'explore' };
      } else if (q.kind === 'explore' && q.peak) {
        // BUGFIX (rafzzer lineage): the quest crowns at y > 50 — the guide used to point at
        // the highest nearby bump (often 20 m on low terrain) → climb, nothing, re-pick, 5-min
        // stalls. Now it only points at thrones that exist: nearest ground above 50.5 m.
        let t = null, bd = 1e9;
        for (let k = 0; k < 12; k++) {
          const ang = k / 12 * 6.2832;
          for (const r of [80, 140, 220, 330, 470]) {
            const x = wolf.pos.x + Math.sin(ang) * r, z = wolf.pos.z + Math.cos(ang) * r;
            const h = heightAt(x, z);
            if (h > 50.5 && r < bd) { bd = r; t = { x, z }; }
          }
        }
        if (t) c = { x: t.x, z: t.z, d: dist2(t.x, t.z), label: q.title, kind: 'peak', peak: true };
      } else if (q.kind === 'hunt' && q.species) {
        const want = (SPECIES[q.species] && SPECIES[q.species].label) || q.species;   // label≠key mismatch made the old guide blind to real quarry
        for (const [, ch] of chunks) for (const an of ch.animals) {
          if (an.dead || (an.sp && an.sp.label !== want)) continue;
          const d = dist2(an.pos.x, an.pos.z);
          if (d < 500 && (!c || d < c.d)) c = { x: an.pos.x, z: an.pos.z, d, label: q.title, kind: 'hunt', an };
        }
        if (!c && q.biome) {   // no quarry in range — point the way to the land where it lives (cached 30 s)
          if (!window.__qgCache || performance.now() - window.__qgCache.t > 30000) {
            let fb = null, fbd = 1e9;
            for (let r = 160; r <= 800; r += 120) for (let k = 0; k < 12; k++) {
              const a2 = k / 12 * 6.2832, x = wolf.pos.x + Math.sin(a2) * r, z = wolf.pos.z + Math.cos(a2) * r;
              if (dominantBiomeAt(x, z).key === q.biome) { const d = Math.hypot(x - wolf.pos.x, z - wolf.pos.z); if (d < fbd) { fbd = d; fb = { x, z }; } }
            }
            window.__qgCache = { t: performance.now(), pt: fb };
          }
          const fb = window.__qgCache.pt;
          if (fb) c = { x: fb.x, z: fb.z, d: dist2(fb.x, fb.z), label: q.title, kind: 'biome' };
        }
      } else if (q.wp) {   // CAMPAIGN: the machine hands the guide a point (altar, scout, travel…)
        c = { x: q.wp.x, z: q.wp.z, d: dist2(q.wp.x, q.wp.z), label: q.title, kind: 'wp' };
      } else if (q.kind === 'collect' && q.item) {
        for (const [, ch] of chunks) for (const pk of ch.pickups) {
          if (pk.gathered) continue;
          const def = PICKUP_DEF[pk.type];
          if (!def || def.inv !== q.item) continue;
          const d = dist2(pk.x, pk.z);
          // M46 BUGFIX (rafzzer lineage): was 320 — the guide pointed at nothing on a long
          // trek, and the 12-min valve read the honest march as a stall and set the deed aside.
          if (d < 640 && (!c || d < c.d)) c = { x: pk.x, z: pk.z, d, label: q.title, kind: 'collect', pk };
        }
      } else if (q.kind === 'rival') {
        for (const rv of rivals) {
          if (rv.dead) continue;
          const d = dist2(rv.pos.x, rv.pos.z);
          if (d < 320 && (!c || d < c.d)) c = { x: rv.pos.x, z: rv.pos.z, d, label: q.title, kind: 'rival', rv };
        }
      }
      if (c && (!best || c.d < best.d)) { c.q = q; best = c; }
    }
    if (best) {
      window.__qgLock = { qid: best.q.id, x: best.x, z: best.z, label: best.label, kind: best.kind,
        an: best.an || null, pk: best.pk || null, rv: best.rv || null, lm: best.lm || null, peak: !!best.peak };
      return { x: best.x, z: best.z, d: best.d, label: best.label, kind: best.kind };
    }
    return null;
  } catch (e) { return null; }
};

function drawMapOverlays(ctx, S, range, opts) {
  const half = S / 2;
  const toMap = (wx, wz) => [half + (wx - wolf.pos.x) / (range * 2) * S, half + (wz - wolf.pos.z) / (range * 2) * S];
  // CAMPAIGN: the legend's ground (ring) and the awakening altar (gold pulse)
  if (window.CAMP && window.CAMP.mapMarks) for (const m of window.CAMP.mapMarks()) {
    const [mx, my] = toMap(m.x, m.z);
    if (Math.abs(mx - half) > half + 40 || Math.abs(my - half) > half + 40) continue;
    if (m.ring) {
      ctx.strokeStyle = m.color; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(mx, my, Math.max(6, m.ring / (range * 2) * S), 0, 6.29); ctx.stroke();
    }
    const pulse = 4 + Math.sin(tSec * 3) * 1.2;
    ctx.strokeStyle = m.color; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(mx, my, pulse + 2.5, 0, 6.29); ctx.stroke();
    ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(mx, my, 2.6, 0, 6.29); ctx.fill();
  }
  // ---- quest waypoint: where the deed calls you ----
  for (const q of QUESTS.active) {
    if (q.kind !== 'explore' || !q.lmType) continue;
    let tgt = null, bd = 1e9;
    for (const lm of landmarkList) {
      if (lm.type !== q.lmType) continue;
      const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
      if (d < bd) { bd = d; tgt = lm; }
    }
    if (!tgt && q.wp) tgt = { x: q.wp.x, z: q.wp.z };   // SPEEDRUN FIX v6.7: the promised place still draws (chunk unloaded)
    if (!tgt) continue;
    const [qx, qy] = toMap(tgt.x, tgt.z);
    const cx = Math.max(10, Math.min(S - 10, qx)), cy = Math.max(10, Math.min(S - 10, qy));
    const pulse = 5 + Math.sin(tSec * 4) * 1.6;
    ctx.save();
    ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, cy, pulse + 3, 0, 6.29); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.29); ctx.fill();
    if (opts.big) { ctx.font = 'bold 11px system-ui'; ctx.fillText('✦', cx + 8, cy + 4); }
    ctx.restore();
  }
  // ---- quest guide line: follow the dotted path to the deed ----
  const qg = window.questGuide ? window.questGuide() : null;
  if (qg) {
    const ang = Math.atan2(qg.z - wolf.pos.z, qg.x - wolf.pos.x);
    const ex = half + Math.cos(ang) * (half - 8), ey = half + Math.sin(ang) * (half - 8);
    const [gx2, gy2] = toMap(qg.x, qg.z);
    const onMap = gx2 >= 0 && gx2 <= S && gy2 >= 0 && gy2 <= S;
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = 'rgba(255,215,106,.55)';
    ctx.lineWidth = opts.big ? 2 : 1.5;
    ctx.beginPath(); ctx.moveTo(half, half);
    ctx.lineTo(onMap ? gx2 : ex, onMap ? gy2 : ey);
    ctx.stroke();
    ctx.setLineDash([]);
    if (opts.big) {
      const lx = half + Math.cos(ang) * (half * 0.55), ly = half + Math.sin(ang) * (half * 0.55);
      ctx.fillStyle = 'rgba(255,233,176,.95)'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('📜 ' + qg.d.toFixed(0) + 'm', lx, ly - 5);
      ctx.textAlign = 'start';
    }
    ctx.restore();
  }
  // ---- fast travel: the paths you have earned (big map only) ----
  if (opts.big) {
    FT_HITS = [];
    for (const f of FAST_TRAVEL) {
      const [fx, fy] = toMap(f.x, f.z);
      if (fx < -10 || fx > S + 10 || fy < -10 || fy > S + 10) continue;
      ctx.save();
      ctx.fillStyle = '#8fd8ff';
      ctx.beginPath(); ctx.arc(fx, fy, 5.4, 0, 6.29); ctx.fill();
      ctx.strokeStyle = 'rgba(210,240,255,.9)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(fx, fy, 8.4, 0, 6.29); ctx.stroke();
      ctx.font = '10px system-ui'; ctx.fillStyle = '#bfe8ff'; ctx.textAlign = 'center';
      ctx.fillText('travel', fx, fy + 19);
      ctx.restore();
      FT_HITS.push({ sx: fx, sy: fy, x: f.x, z: f.z });
    }
  }
  // ---- predator territory rings ----
  ctx.save();
  ctx.setLineDash([5, 4]);
  for (const ch of chunks.values()) {
    for (const pr of ch.predators) {
      if (pr.dead || !(pr.territory > 0)) continue;   // the eagle has no territory — no ring
      const [hx, hy] = toMap(pr.home.x, pr.home.z);
      const rr = pr.territory / (range * 2) * S;
      if (hx + rr < 0 || hx - rr > S || hy + rr < 0 || hy - rr > S) continue;
      ctx.strokeStyle = pr.threatening ? 'rgba(255,60,40,.95)' : 'rgba(255,90,60,.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(hx, hy, rr, 0, 6.29); ctx.stroke();
    }
  }
  ctx.restore();
  // ---- resource dots ----
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  const resR = opts.big ? 6 : 3;   // search radius in chunks
  for (let dz = -resR; dz <= resR; dz++)
    for (let dx = -resR; dx <= resR; dx++) {
      const ch = chunks.get(ck(ccx + dx, ccz + dz));
      if (!ch) continue;
      for (const pk2 of ch.pickups) {
        if (pk2.gathered) continue;
        const [mx, my] = toMap(pk2.x, pk2.z);
        if (mx < -2 || mx > S + 2 || my < -2 || my > S + 2) continue;
        const dRes = Math.hypot(pk2.x - wolf.pos.x, pk2.z - wolf.pos.z);
        if (pk2.type === 'magicShroom') {
          if (dRes > range * 0.85) continue;                    // special: generous reach, modest size
          ctx.fillStyle = '#c88fff';
          ctx.beginPath(); ctx.arc(mx, my, opts.big ? 2.4 : 2.6, 0, 6.29); ctx.fill();
        } else if (!opts.big) {                                 // normal: tiny, only truly nearby
          if (dRes > 70) continue;
          ctx.globalAlpha = 0.55 + 0.45 * (1 - dRes / 70);
          ctx.fillStyle = MM_RES_DOT[pk2.type] || '#ddd';
          ctx.beginPath(); ctx.arc(mx, my, 1.15, 0, 6.29); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
  // ---- landmarks ----
  ctx.font = (opts.big ? 13 : 11) + 'px system-ui';
  for (const lm of landmarkList) {
    const [mx, my] = toMap(lm.x, lm.z);
    if (mx < -10 || mx > S + 10 || my < -10 || my > S + 10) continue;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(mx, my, opts.big ? 4.4 : 3.2, 0, 6.29); ctx.fill();
    ctx.strokeStyle = 'rgba(40,28,0,.85)'; ctx.lineWidth = 1; ctx.stroke();
    const ldef = LANDMARKS[lm.type];   // event landmarks (meteor…) live outside the table
    ctx.fillStyle = '#3a2c08';
    ctx.fillText(ldef ? ldef.icon : (lm.mapIcon || '✦'), mx + 6, my + 3);
    if (opts.big) { ctx.fillStyle = '#ffe9b0'; ctx.font = '10px system-ui'; ctx.fillText(ldef ? ldef.label : (lm.label || lm.type), mx + 7, my + 14); ctx.font = '13px system-ui'; }
  }
  // ---- predators: every one is a red dot; a hunting one BLINKS ---- 
  for (const ch of chunks.values())
    for (const pr of ch.predators) {
      if (pr.dead) continue;
      const [mx, my] = toMap(pr.pos.x, pr.pos.z);
      if (mx < -10 || mx > S + 10 || my < -10 || my > S + 10) continue;
      const active = !!pr.threatening;                      // it has you in its sights
      if (active) {
        const pulse = 0.5 + 0.5 * Math.sin((tSec || 0) * 9);   // the warning blink
        ctx.fillStyle = `rgba(255,36,22,${(0.5 + 0.5 * pulse).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(mx, my, opts.big ? 4.6 : 4, 0, 6.29); ctx.fill();
        ctx.strokeStyle = `rgba(255,80,50,${(0.75 * pulse).toFixed(2)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(mx, my, (opts.big ? 7.5 : 6.5) + pulse * 2.6, 0, 6.29); ctx.stroke();
        window.__mmBlink = (window.__mmBlink || 0) + 1;
      } else {
        ctx.fillStyle = 'rgba(255,64,40,.62)';
        ctx.beginPath(); ctx.arc(mx, my, opts.big ? 3.4 : 2.8, 0, 6.29); ctx.fill();
      }
      window.__mmPred = (window.__mmPred || 0) + 1;
    }
  // ---- landmark guidance chevron (nearest within 340 m) ----
  let guide = null, gd = 340;
  for (const lm of landmarkList) {
    const d2 = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
    if (d2 < gd) { gd = d2; guide = lm; }
  }
  if (guide) {
    const ang = Math.atan2(guide.z - wolf.pos.z, guide.x - wolf.pos.x);   // canvas-space angle
    const gr = half - 12;
    const gx = half + Math.cos(ang) * gr, gy = half + Math.sin(ang) * gr;
    ctx.save();
    ctx.translate(gx, gy); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(255,215,106,.95)';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -5.5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 5.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,0,.9)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    const tx = half + Math.cos(ang) * (gr - 24), ty = half + Math.sin(ang) * (gr - 24);
    ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(gd.toFixed(0) + 'm', tx, ty + 3);
    ctx.textAlign = 'start';
  }
  // ---- player arrow (screen-forward = camYaw + PI) ----
  ctx.save();
  ctx.translate(half, half);
  ctx.rotate(Math.PI - wolf.yaw);   // north-up map: wolf faces (sin yaw, cos yaw); arrow tracks the PLAYER, not the camera
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4.6, 5.4); ctx.lineTo(0, 2.8); ctx.lineTo(-4.6, 5.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,40,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}
function drawMinimapOverlay() {
  const cv = el('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const S = cv.width, half = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(half, half, half - 2, 0, 6.29); ctx.clip();
  // base scrolls with the player between terrain refreshes — always accurate
  const offX = (MM.lastX - wolf.pos.x) / (MM.range * 2) * S;
  const offY = (MM.lastZ - wolf.pos.z) / (MM.range * 2) * S;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mmBase, 0, 0, MM.px, MM.px, offX, offY, S, S);
  drawMapOverlays(ctx, S, MM.range, { big: false });
  ctx.restore();
  ctx.strokeStyle = 'rgba(200,225,255,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(half, half, half - 2, 0, 6.29); ctx.stroke();
  ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = '#eef4ff';
  ctx.fillText('N', half, 12); ctx.fillText('S', half, S - 5);
  ctx.fillText('W', 10, half + 4); ctx.fillText('E', S - 10, half + 4);
  ctx.textAlign = 'start';
}
let questArrowMesh = null;
const _agc = new THREE.Color(), _agt = new THREE.Color();
const _ae1 = new THREE.Vector3(), _ae2 = new THREE.Vector3(), _an = new THREE.Vector3();
const _aq = new THREE.Quaternion(), _aq2 = new THREE.Quaternion(), _UP = new THREE.Vector3(0, 1, 0);
function arrowGroundLum() {   // what the arrow actually lies on — sampled exactly the way the terrain is shaded
  let L = 0, n = 0;
  for (const e of [[0, 0], [1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4]]) {
    const x = wolf.pos.x + e[0], z = wolf.pos.z + e[1];
    const h = heightAt(x, z);
    const cl = climateAt(x, z, h);
    const w = biomeWeights(x, z, h, cl.temp, cl.moist);
    const grade = (Math.abs(heightAt(x + 2, z) - heightAt(x - 2, z)) + Math.abs(heightAt(x, z + 2) - heightAt(x, z - 2))) / 8;
    groundColor(_agc, x, z, h, w, cl.temp, grade);
    L += 0.2126 * _agc.r + 0.7152 * _agc.g + 0.0722 * _agc.b; n++;
  }
  const light = Math.max(0.15, Math.min(1.15, sun.intensity || 1));   // night dims even snow — the arrow must answer
  return (L / n) * light;
}
window.__arrowGroundLum = () => arrowGroundLum();
function arrowTargetColor(st) {   // the opposite of the land — darker overall, as demanded twice
  const BRIGHT = 0.54, DARK = 0.21;
  if (st.mode === 'dark') _agt.setHSL(0.068, 0.92, DARK);       // deep burnt ember — sinks into snow, sand, sun-grass
  else _agt.setHSL(0.10, 0.96, BRIGHT);                         // rich gold — glows against night, spruce, peat
  return _agt;
}
const arrowScene = new THREE.Scene();   // pass 2 of rendering: ONLY the wolf may hide the arrow — never terrain, trees or walls
if (typeof scene !== 'undefined' && scene.fog) arrowScene.fog = scene.fog;
const arrowOccluder = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ colorWrite: false }));
arrowOccluder.scale.set(0.8, 0.78, 1.32);   // the wolf's silhouette — it writes depth and nothing else
arrowScene.add(arrowOccluder);
function buildQuestArrow() {   // ONE continuous ribbon: a single stretched line from tail to tip, draped vertex-by-vertex
  const v = [], W = 0.39;
  for (let z = -0.8; z < 2.699; z += 0.4)   // the shaft: a cross-section every 0.4 m — no joints, no cracks
    v.push(-W, 0, z, W, 0, z, W, 0, z + 0.4, -W, 0, z, W, 0, z + 0.4, -W, 0, z + 0.4);
  // a proper BOTTOM-NOTCHED arrowhead: two swept-back barbs, a deep V notch cut
  // into the base, and the point ahead — not a diamond, a barbed arrow
  const BL = [-0.95, 2.5], TIP = [0, 4.0], BR = [0.95, 2.5], NOTCH = [0, 3.0];
  const tri = (p2, q, r) => v.push(p2[0], 0, p2[1], q[0], 0, q[1], r[0], 0, r[1]);
  tri(BL, TIP, NOTCH); tri(TIP, BR, NOTCH);   // the two barbs; the V between them stays empty
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
  const matFill = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.4, depthWrite: false, depthTest: true, side: THREE.DoubleSide });
  const m = new THREE.Mesh(g, matFill);
  m.renderOrder = 999; m.frustumCulled = false;
  const grp = new THREE.Group(); grp.add(m);
  grp.userData = { ribbon: m, matFill, st: { mode: 'bright', lum: 0.5, acc: 1 } };
  return grp;
}
function updateQuestArrow(dt) {
  try {
    const qg = window.questGuide ? window.questGuide() : null;
    if (!questArrowMesh) { questArrowMesh = buildQuestArrow(); arrowScene.add(questArrowMesh); }
    const ud = questArrowMesh.userData, st = ud.st;
    arrowOccluder.position.copy(wolf.model.position);   // the wolf's body is the one thing that overlaps the arrow
    arrowOccluder.rotation.y = wolf.model.rotation.y;
    if (!qg || qg.d < 10) { questArrowMesh.visible = false; return; }
    const yaw = Math.atan2(qg.x - wolf.pos.x, qg.z - wolf.pos.z);
    const bx = Math.sin(yaw), bz = Math.cos(yaw);
    const ORIG = 1.05;   // the tail tucks UNDER the body — the wolf hides it, and it emerges at the silhouette: from underneath the wolf
    const m = ud.ribbon;
    m.rotation.set(0, yaw, 0);
    m.position.set(wolf.pos.x + bx * ORIG, 0, wolf.pos.z + bz * ORIG);
    const pa = m.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) {   // every vertex lies ON the ground — hills, spines, cliffs
      const vx = pa.getX(i), vz = pa.getZ(i);
      pa.setY(i, heightAt(m.position.x + vx * bz + vz * bx, m.position.z - vx * bx + vz * bz) + 0.06);
    }
    pa.needsUpdate = true;
    questArrowMesh.visible = true;
    st.acc += dt || 0.016;
    if (st.acc > 0.25) {
      st.acc = 0; st.lum = arrowGroundLum();
      if (st.mode === 'bright' && st.lum > 0.47) st.mode = 'dark';
      else if (st.mode === 'dark' && st.lum < 0.37) st.mode = 'bright';
    }
    arrowTargetColor(st);
    ud.matFill.color.lerp(_agt, 1 - Math.exp(-(dt || 0.016) * 7));
    ud.matFill.opacity = 0.4 + 0.13 * (0.5 + 0.5 * Math.sin(tSec * 2.4));
  } catch (e) { }
}

/* ---------------- birds: the living sky ---------------- */
const BIRDS = { list: [] };
function makeBird() {
  const g = new THREE.Group();
  const col = [0x3a322b, 0x54423a, 0x2b2f38, 0x6b5a4a][(Math.random() * 4) | 0];
  const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 4), mat);
  body.rotation.x = Math.PI / 2;   // beak forward
  g.add(body);
  const wingG = new THREE.PlaneGeometry(0.52, 0.2);
  const wl = new THREE.Mesh(wingG, mat); wl.position.x = -0.26; g.add(wl);
  const wr = new THREE.Mesh(wingG, mat); wr.position.x = 0.26; g.add(wr);
  g.userData = { wl, wr, flap: Math.random() * 6 };
  scene.add(g);
  return g;
}
function birdSpawnPoint() {
  const a4 = Math.random() * 6.28, r = 30 + Math.random() * 55;
  const x = wolf.pos.x + Math.sin(a4) * r, z = wolf.pos.z + Math.cos(a4) * r;
  return { x, z, y: Math.max(heightAt(x, z), WATER_Y) + 4 + Math.random() * 5 };
}
function birdTarget(b) {   // alternate between a tree perch and a ground feeding spot
  b.hop = !b.hop;
  if (b.hop) {   // a tree crown (or a boulder — birds aren't proud)
    let best = null, bd = 1e9;
    for (const [, ch] of chunks) for (const sol of (ch.solids || [])) {
      const d = Math.hypot(sol.x - b.mesh.position.x, sol.z - b.mesh.position.z);
      if (d < bd && d < 70 && d > 6) { bd = d; best = sol; }
    }
    if (best) return { x: best.x + (Math.random() - 0.5) * 2, z: best.z + (Math.random() - 0.5) * 2, y: heightAt(best.x, best.z) + 4.6 + Math.random() * 1.6, kind: 'perch' };
  }
  const a4 = Math.random() * 6.28, r = 8 + Math.random() * 26;
  const x = b.mesh.position.x + Math.sin(a4) * r, z = b.mesh.position.z + Math.cos(a4) * r;
  return { x, z, y: Math.max(heightAt(x, z), WATER_Y) + 0.12, kind: 'ground' };
}
function updateBirds(dt) {
  if (state !== 'play') return;
  // keep a small flock alive near the wolf
  while (BIRDS.list.length < 7) {
    const pt = birdSpawnPoint();
    if (pt.y < WATER_Y + 1.5) continue;
    const mesh = makeBird();
    mesh.position.set(pt.x, pt.y, pt.z);
    const b3 = { mesh, state: 'fly', tgt: { x: pt.x, z: pt.z, y: pt.y, kind: 'ground' }, t: 0, speed: 8 + Math.random() * 4, hop: Math.random() < 0.5, peepT: 2 + Math.random() * 6 };
    b3.tgt = birdTarget(b3); b3.tgt.y = Math.max(b3.tgt.y, pt.y + 2);   // glide in from the sky
    BIRDS.list.push(b3);
    break;
  }
  for (let i = BIRDS.list.length - 1; i >= 0; i--) {
    const b = BIRDS.list[i], m = b.mesh;
    const dWolf = Math.hypot(m.position.x - wolf.pos.x, m.position.z - wolf.pos.z);
    if (dWolf > 150) { scene.remove(m); BIRDS.list.splice(i, 1); continue; }
    b.t += dt;
    // the wolf's shadow bursts the flock
    if (dWolf < 11 && b.state !== 'fly') {
      const away = Math.atan2(m.position.x - wolf.pos.x, m.position.z - wolf.pos.z);
      b.tgt = { x: m.position.x + Math.sin(away) * 60, z: m.position.z + Math.cos(away) * 60, y: m.position.y + 14, kind: 'fly' };
      b.state = 'fly'; b.speed = 15 + Math.random() * 4;
      audio.birdPeep(0.9);
    }
    const ud = m.userData;
    if (b.state === 'fly') {
      const dx = b.tgt.x - m.position.x, dy = b.tgt.y - m.position.y, dz = b.tgt.z - m.position.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      const step = Math.min(d, b.speed * dt);
      m.position.x += dx / d * step; m.position.y += dy / d * step + Math.sin(b.t * 3) * 0.01; m.position.z += dz / d * step;
      m.rotation.y = Math.atan2(dx, dz);
      ud.flap += dt * 22;
      ud.wl.rotation.y = Math.sin(ud.flap) * 0.9; ud.wr.rotation.y = -Math.sin(ud.flap) * 0.9;
      if (d < 1.2) {
        if (b.tgt.kind === 'fly') { b.tgt = birdTarget(b); continue; }
        b.state = b.tgt.kind === 'perch' ? 'perch' : 'ground';
        b.t = 0; b.timer = b.state === 'perch' ? 4 + Math.random() * 5 : 3 + Math.random() * 4;
        if (dWolf < 38 && Math.random() < 0.5) audio.birdPeep(0.5);
      }
    } else {
      ud.flap += dt * 3;   // folded wings, idle stir
      ud.wl.rotation.y = Math.sin(ud.flap) * 0.12; ud.wr.rotation.y = -Math.sin(ud.flap) * 0.12;
      m.rotation.y += Math.sin(b.t * 0.7) * dt * 0.6;   // a wary head-turn
      if (b.state === 'ground') {
        m.position.y = b.tgt.y + Math.abs(Math.sin(b.t * 6)) * 0.05;   // little hops and pecks
        m.rotation.x = Math.max(0, Math.sin(b.t * 4)) * 0.5;
      }
      b.peepT -= dt;
      if (b.peepT <= 0 && dWolf < 40) { b.peepT = 4 + Math.random() * 8; audio.birdPeep(0.35); }
      if (b.t > b.timer) { b.tgt = birdTarget(b); b.state = 'fly'; b.speed = 8 + Math.random() * 4; }
    }
  }
}

function updateMinimap(dt) {
  const cv = el('minimap');
  if (!cv) return;
  if (!MM.on || state !== 'play') { cv.style.display = 'none'; return; }
  cv.style.display = 'block';
  MM.t -= dt;
  if (MM.t > 0 && Math.hypot(wolf.pos.x - MM.lastX, wolf.pos.z - MM.lastZ) < 4) { drawMinimapOverlay(); return; }
  MM.t = 0.7; MM.lastX = wolf.pos.x; MM.lastZ = wolf.pos.z;
  mapTerrainPass(mmBaseCtx, MM.px, MM.range, wolf.pos.x, wolf.pos.z);
  drawMinimapOverlay();
}

/* ---------------- big centered map (M / click minimap) ---------------- */
const BIG = { open: false, px: 120, range: 450, t: 0, lastX: 1e9, lastZ: 1e9 };
const bigBase = document.createElement('canvas'); bigBase.width = BIG.px; bigBase.height = BIG.px;
const bigBaseCtx = bigBase.getContext('2d');
function toggleBigMap(force) {
  BIG.open = force !== undefined ? force : !BIG.open;
  const w = el('bigmapWrap');
  if (w) { w.classList.toggle('show', BIG.open); if (BIG.open) { BIG.t = 0; BIG.lastX = 1e9; updateBigMap(0); } }
}
document.addEventListener('DOMContentLoaded', () => {
  const bc = document.getElementById('bigmapClose');
  if (bc) bc.addEventListener('click', () => toggleBigMap(false));
  const bw = document.getElementById('bigmapWrap');
  if (bw) bw.addEventListener('pointerdown', e => { if (e.target === bw) toggleBigMap(false); });
});
function updateBigMap(dt) {
  const cv = el('bigmap');
  if (!cv || !BIG.open) return;
  BIG.t -= dt;
  const moved = Math.hypot(wolf.pos.x - BIG.lastX, wolf.pos.z - BIG.lastZ);
  if (BIG.t > 0 && moved < 14) { drawBigMap(); return; }
  BIG.t = 0.6; BIG.lastX = wolf.pos.x; BIG.lastZ = wolf.pos.z;
  mapTerrainPass(bigBaseCtx, BIG.px, BIG.range, wolf.pos.x, wolf.pos.z);
  drawBigMap();
}
function drawBigMap() {
  const cv = el('bigmap');
  const ctx = cv.getContext('2d');
  const S = cv.width;
  ctx.clearRect(0, 0, S, S);
  const offX = (BIG.lastX - wolf.pos.x) / (BIG.range * 2) * S;
  const offY = (BIG.lastZ - wolf.pos.z) / (BIG.range * 2) * S;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bigBase, 0, 0, BIG.px, BIG.px, offX, offY, S, S);
  drawMapOverlays(ctx, S, BIG.range, { big: true });
  ctx.strokeStyle = 'rgba(200,225,255,.5)'; ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, S - 4, S - 4);
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#eef4ff';
  ctx.fillText('N', S / 2, 24); ctx.fillText('S', S / 2, S - 12);
  ctx.fillText('W', 16, S / 2 + 5); ctx.fillText('E', S - 16, S / 2 + 5);
  ctx.textAlign = 'start';
}

function updateHUD(dt) {
  // landscape-first: if a touch device is portrait, the rotate gate covers the
  // screen — pause the world until it's turned back to landscape
  if (state === 'play' && portraitMQ && portraitMQ.matches && document.body.classList.contains('touch')) {
    setState('pause');
  }
  const flyEl = el('flyTimer');
  if (flyEl) {
    if (wolf.flyT > 0) {
      flyEl.style.display = 'block';
      flyEl.textContent = `✨ Flight ${wolf.flyT.toFixed(1)}s`;
    } else flyEl.style.display = 'none';
  }
  // health
  if (wolf.hp < wolf.maxHp && tSec - wolf.lastHurt > 6 && wolf.deadT <= 0)
    wolf.hp = Math.min(wolf.maxHp, wolf.hp + 3 * dt * (wolf.perks.secondWind ? 1.5 : 1));
  const hpEl = el('hpFill');
  if (hpEl) {
    hpEl.style.width = (wolf.hp / wolf.maxHp * 100).toFixed(0) + '%';
    hpEl.style.background = wolf.hp < 30 ? '#e0483a' : wolf.hp < 60 ? '#e08a3a' : 'linear-gradient(90deg,#ff8a7a,#d8442f)';
  }
  const vg = el('vignette');
  if (vg) {
    vignetteA = Math.max(0, vignetteA - dt * 0.55);
    vg.style.opacity = vignetteA.toFixed(3);
  }
  if (wolf.deadT > 0) { if (wolf.deadT - dt <= 0) wolfRespawn(); else wolf.deadT -= dt; }
  const tw = el('threatWarn');
  if (tw) {
    warnBannerT -= dt;
    if (warnBannerT <= 0) tw.style.display = 'none';
    else {
      let wt = 0;
      for (const ch of chunks.values()) for (const pr of ch.predators) if (!pr.dead && pr.state === 'warn') wt = Math.max(wt, pr.warnT);
      if (wt > 0) tw.innerHTML = tw.innerHTML.replace(/— \d+(\.\d+)?s/, `— ${wt.toFixed(1)}s`);
    }
  }
  updateThreatArrow();
  updateQuestArrow(dt);
  updateMinimap(dt);
  if (BIG.open) updateBigMap(dt);
  ui.stam.style.width = (wolf.stamina / wolf.maxStam * 100).toFixed(0) + '%';
  const xpF = el('xpFill'); if (xpF) xpF.style.width = Math.min(100, wolf.xp / wolf.xpNext * 100).toFixed(1) + '%';
  if (window.__toggles) { if (window.__toggles.tSprint.on) touch.sprint = true; if (window.__toggles.tJump.on) keys.Space = true; }   // locked actions re-assert every frame
  const _st = (id, v) => { const e2 = el(id); if (e2 && e2.textContent !== v) e2.textContent = v; };
  _st('hpPct', Math.max(0, Math.round(wolf.hp)) + '%');            // the heart beats the number
  const _xl = el('xpLvl');
  if (_xl) { const v2 = String(wolf.level); if (_xl.textContent !== v2) { _xl.textContent = v2; _xl.style.fontSize = v2.length > 2 ? '9px' : '12px'; } }   // the star counts the climb
  ui.stam.style.background = wolf.exhausted ? '#c95b4a' : 'linear-gradient(90deg,#7ef0c0,#4db8e8)';
  hudT -= dt; fpsAcc += dt; fpsN++;
  if (hudT > 0) return;
  hudT = 0.25;
  fpsShow = Math.round(fpsN / Math.max(0.001, fpsAcc));
  fpsAcc = 0; fpsN = 0;
  const mins = (tDay * 24 * 60) | 0;
  const hh = String((mins / 60 | 0)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  ui.clock.textContent = `Day ${dayCount} · ${hh}:${mm}`;
  ui.weatherIcon.textContent = weather.icon;
  ui.weatherLabel.textContent = weather.label;
  const info = biomeInfoAt(wolf.pos.x, wolf.pos.z);
  curBiomeKey = info === BIOME_INFO.shore ? 'shore' : Object.keys(BIOME_INFO).find(k => BIOME_INFO[k] === info);
  const tC = Math.round((climateAt(wolf.pos.x, wolf.pos.z, heightAt(wolf.pos.x, wolf.pos.z)).temp - WORLD_EVENTS.chill) * 28);
  ui.biome.textContent = `${SEASON.icon} ${info.icon} ${info.name} · ${tC}°C`;
  biomeToastT -= 0.25;
  if (curBiomeKey !== lastBiomeKey) {
    if (lastBiomeKey !== null && biomeToastT <= 0 && curBiomeKey !== 'shore') {
      stats.biomes.add(curBiomeKey);
      toast(`${info.icon} Entering ${info.name}`, true);
      biomeToastT = 10;
    }
    lastBiomeKey = curBiomeKey;
  }
  if (drinkCd > 0) drinkCd -= 0.25;
  const p = nearestPickup();
  if (p && state === 'play') {
    ui.prompt.textContent = `E — ${PICKUP_DEF[p.type].label}`;
    ui.prompt.classList.add('on');
  } else if (state === 'play' && drinkCd <= 0 && !wolf.swimming && wolf.grounded && nearWaterEdge()) {
    ui.prompt.textContent = 'E — 💧 Drink water';
    ui.prompt.classList.add('on');
  } else {
    ui.prompt.classList.remove('on');
  }
}

function showOverlay(mode) {
  ui.overlay.classList.remove('hidden');
  ui.overlay.dataset.mode = mode;
  if (mode === 'start') {
    ui.ovTitle.textContent = 'REVONTULET';
    ui.ovBody.innerHTML = document.getElementById('tplStart').innerHTML;
    if (window.updateRunRecap) window.updateRunRecap();   // the chronicle greets you on the start page
    if (window.CAMP && window.CAMP.onMenuRefresh) window.CAMP.onMenuRefresh();   // CAMPAIGN: name prompt + trophies wiring
    if (state === 'menu') menuReady();   // returning from TROPHIES / pause menu — the start button must be live again (fix: stuck "SUMMONING THE WILD…")
  } else if (mode === 'pause') {
    ui.ovTitle.textContent = 'PAUSED';
    ui.ovBody.innerHTML = document.getElementById('tplPause').innerHTML;
    el('pStats').innerHTML =
      `Days survived: <b>${dayCount}</b> · Distance: <b>${(wolf.distance / 1000).toFixed(2)} km</b><br>` +
      `Gathered: <b>${stats.gathered}</b> · Caught: <b>${stats.caught}</b> · Predators slain <b>${stats.slain || 0}</b><br>` +
      `Pelts <b>${inv.pelt}</b> · Bones <b>${inv.bone}</b><br>` +
      `Biomes found: <b>${stats.biomes.size}/6</b><br>` +
      `World seed: <b>${SEED}</b>`;
    el('btnResume').onclick = () => setState('play');
    el('btnNew').onclick = newGame;
  }
  const b = el('btnStart');
  if (b) b.onclick = startGame;
  const ng = el('btnNewGame');         // home page NEW GAME (fresh world + fresh wolf, record kept)
  if (ng) ng.onclick = newGame;
}

/* NEW GAME — a whole new world + a fresh wolf, while the all-time record stands.
   Rolls a new random seed, resets the campaign (level 1, tier 1), then reloads the page
   with ?seed=<new> so the world actually regenerates. The high-score recap
   (revontulet_bestRun / revontulet_lastRun) is separate and never cleared. */
function newGame() {
  let s;
  if (window.CAMP && window.CAMP.newGame) s = window.CAMP.newGame();
  else s = ((Math.random() * 1e9) | 0) >>> 0;
  try {
    const u = new URL(location.href);
    u.searchParams.set('seed', String(s));
    location.href = u.toString();
  } catch (e) { location.reload(); }
}
function hideOverlay() { ui.overlay.classList.add('hidden'); }

/* the start page only becomes tappable once the world has booted — but the template is
   re-injected every time we return to it (TROPHIES → BACK), so the button must be re-armed
   on every return, not only during the one-time boot transition. */
function menuReady() {
  const b = el('btnStart');
  if (b) {
    b.disabled = false;
    const hasSave = window.CAMP && window.CAMP.hasSave && window.CAMP.hasSave();
    b.textContent = hasSave ? '▶ CONTINUE' : 'ENTER THE WILD';
  }
  if (window.updateRunRecap) window.updateRunRecap();
  const bl = el('bootLine');
  if (bl) bl.textContent = 'The wilderness awaits…';
}

let state = 'boot';
function setState(s) {
  state = s;
  if (s === 'play') { hideOverlay(); ui.hud.classList.remove('hidden'); if (window.CAMP && window.CAMP.onResume) window.CAMP.onResume(); }
  else {
    if (typeof toggleQuestLog === 'function') toggleQuestLog(false);
    if (s === 'pause') { showOverlay('pause'); inputClear(); if (window.CAMP && window.CAMP.onPause) window.CAMP.onPause(); }
  }
}
function enterLandscape() {
  try {
    if (!document.body.classList.contains('touch')) return;
    const root = document.documentElement;
    const doLock = () => {
      try {
        if (screen.orientation && screen.orientation.lock)
          screen.orientation.lock('landscape').catch(() => { });
      } catch (e) { }
    };
    if (root.requestFullscreen && !document.fullscreenElement) {
      const pr = root.requestFullscreen();
      if (pr && pr.then) pr.then(doLock).catch(() => { });
    } else doLock();
  } catch (e) { }
}
function startGame() {
  audio.init(); audio.resume();
  enterLandscape();
  setState('play');
  toast('🐺 Roam free — the wild is endless', true);
}

/* ---------------- input ---------------- */
const keys = {};
let camYaw = Math.PI, camPitch = 0.42, camDist = 8.5;
const input = { f: false, b: false, l: false, r: false, sprint: false, jump: false, paused: false, mx: 0, my: 0 };
function inputClear() {
  input.f = input.b = input.l = input.r = input.sprint = input.jump = input.paused = false;
  input.mx = 0; input.my = 0;
  touch.sprint = false;
  for (const k in keys) keys[k] = false;
}
let drinkCd = 0;
function nearWaterEdge() {
  for (let a = 0; a < 6.28; a += 0.62) {
    const wx = wolf.pos.x + Math.sin(a) * 2.4, wz = wolf.pos.z + Math.cos(a) * 2.4;
    if (heightAt(wx, wz) < WATER_Y - 0.15) return true;
  }
  return false;
}
function doGather() {
  // CAMPAIGN: the awakening altar — channel the ritual with the same interact key (it outranks nearby pickups)
  if (window.CAMP && window.CAMP.ritualReady()) { window.CAMP.useAltar(); return; }
  const p = nearestPickup();
  if (p) { gather(p); return; }
  if (drinkCd <= 0 && !wolf.swimming && wolf.grounded && wolf.flyT <= 0 && nearWaterEdge()) {
    drinkCd = 6;
    wolf.stamina = wolf.maxStam; wolf.exhausted = false;
    wolf.hp = Math.min(wolf.maxHp, wolf.hp + 6);
    audio.chime();
    toast('💧 You drink the cold water — stamina restored');
    pool.burst(V3(wolf.pos.x, WATER_Y + 0.2, wolf.pos.z), 8, 0x9fd4e8, 0.4, 1.2, 1.2);
  }
}
addEventListener('keydown', e => {
  if (e.repeat) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    return;
  }
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  audio.resume();
  if (state === 'play') {
    switch (e.code) {
      case 'KeyE': doGather(); break;
      case 'KeyF': wolf.attack(); break;
      case 'KeyJ': toggleQuestLog(); break;
      case 'KeyI': if (typeof toggleInv === 'function') toggleInv(); break;
      case 'KeyX': wolf.crouch = !wolf.crouch; toast(wolf.crouch ? '🐾 Prowling — low, quiet, hard to see' : '🐾 Standing tall'); break;
      case 'KeyH': wolf.howl(); break;
      case 'KeyQ': wolf.wolfSense(); break;
      case 'KeyC': camYaw = wolf.yaw + Math.PI; break;
      case 'KeyT': timeScale = timeScale === 1 ? 8 : 1; toast(timeScale > 1 ? '⏩ Time flows ×8' : '⏱ Time flows normally'); break;
      case 'KeyM': toggleBigMap(); break;
      case 'KeyK': toast(audio.toggleMute() ? '🔇 Muted' : '🔊 Sound on'); break;
      case 'KeyN': MM.on = !MM.on; toast(MM.on ? '🗺️ Minimap on' : '🗺️ Minimap off'); break;
      case 'KeyP': setState('pause'); break;
      case 'Escape': if (BIG.open) toggleBigMap(false); else setState('pause'); break;
    }
  } else if (state === 'pause' && (e.code === 'KeyP' || e.code === 'Escape')) {
    setState('play');
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', inputClear);

/* -------- touch detection -------- */
try {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const noHover = matchMedia('(hover: none)').matches;
  if (coarse || noHover) document.body.classList.add('touch');
} catch (e) { }

/* -------- virtual joystick -------- */
const touch = { sprint: false };
const joy = { id: null, x: 0, y: 0, mag: 0 };
const joyEl = el('joy'), joyKnob = el('joyKnob');
function joySetFromEvent(e) {
  const r = joyEl.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = (e.clientX - cx) / (r.width * 0.36);
  let dy = (e.clientY - cy) / (r.height * 0.36);
  const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  joy.x = dx; joy.y = dy; joy.mag = Math.min(1, m);
  joyKnob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
}
function joyRelease() {
  joy.id = null; joy.x = 0; joy.y = 0; joy.mag = 0;
  joyKnob.style.transform = 'translate(0px, 0px)';
}
const joyZone = el('joyZone');
let joyHanded = null;   // a flung pointer handed over to the camera
function joyDown(e) {
  e.preventDefault(); e.stopPropagation();
  audio.resume();
  joy.id = e.pointerId;
  joy.sx = e.clientX; joy.sy = e.clientY; joy.t0 = performance.now(); joy.fling = false;
  const zr = joyZone ? joyZone.getBoundingClientRect() : null;
  joy.zt = zr ? zr.top : -99; joy.zb = zr ? zr.bottom : 1e9;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { }
  // the ring springs up under the thumb, wherever in the field it landed
  const R = 66;
  const cx = Math.max(R + 8, Math.min(innerWidth - R - 8, e.clientX));
  const cy = Math.max(R + 8, Math.min(innerHeight - R - 8, e.clientY));
  joyEl.style.left = (cx - R) + 'px';
  joyEl.style.top = (cy - R) + 'px';
  joyEl.classList.add('live');   // the stick wakes under your thumb
  joySetFromEvent(e);
}
function joyHome() {   // back to the corner until called again
  joyEl.style.left = '88px';
  joyEl.style.top = 'calc(100vh - 156px)';
}
function joyMove(e) {
  if (e.pointerId !== joy.id) return;
  e.stopPropagation();
  // the thumb owns this finger until it lifts — swipe as far as you like, the stick holds on
  const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dx0 = e.clientX - cx, dy0 = e.clientY - cy;
  const drag = Math.hypot(dx0, dy0);
  if (drag > r.width * 0.62) {   // thumb roaming past the rim — carry the anchor along beneath it
    const k = (drag - r.width * 0.62) / drag;
    joyEl.style.left = (r.left + dx0 * k) + 'px';
    joyEl.style.top = (r.top + dy0 * k) + 'px';
  }
  joySetFromEvent(e);
}
const joyEnd = e => {
  if (e.pointerId === joy.id) { joyRelease(); joyEl.classList.remove('live'); joyHome(); }
};
for (const jt of [joyEl, joyZone]) {
  if (!jt) continue;
  jt.addEventListener('pointerdown', joyDown);
  jt.addEventListener('pointermove', joyMove);
  jt.addEventListener('pointerup', joyEnd);
  jt.addEventListener('pointercancel', joyEnd);
}
if (joyEl) {
  // teach once: when play begins, show the stick for a breath — then it stays out of the way
  let joyTaught = false;
  const joyTeach = setInterval(() => {
    if (joyTaught || state !== 'play') return;
    joyTaught = true; clearInterval(joyTeach);
    joyEl.classList.add('live');
    setTimeout(() => { if (joy.id == null) joyEl.classList.remove('live'); }, 2600);
  }, 500);
}

/* -------- touch buttons: press-locked, slide-away-friendly -------- */
let btnsWakeT = 0;
const btnPointers = new Map();   // pointerId → {btn, rect, handed}
function wakeBtns() {   // a touched button wakes both clusters for a moment
  const root = el('btns'), orb = el('mmOrbit');
  if (root) root.classList.add('wake');
  if (orb) { orb.classList.add('wake'); orb.style.opacity = '1'; }   // inline — immune to style-recalc stalls
  clearTimeout(btnsWakeT);
  btnsWakeT = setTimeout(() => {
    if (root) root.classList.remove('wake');
    if (orb) { orb.classList.remove('wake'); orb.style.opacity = ''; }   // back to the CSS rest state (faded)
  }, 2200);
}
for (const id of ['invBtn', 'questBtn', 'btnAI', 'tPause']) { const b = el(id); if (b) b.addEventListener('pointerdown', wakeBtns); }   // the map's arch wakes too
/* ---- the fullscreen toggle: visible whenever the game is not fullscreen ---- */
(function () {
  const fb = el('fsBtn'); if (!fb) return;
  const root = document.documentElement;
  const canFS = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  if (!canFS) return;   // no fullscreen API (iPhone Safari) — no button
  let wasFS = false, attnIv = 0;
  const attention = () => {   // 3 seconds of glow and blink — the screen let go, look here
    clearInterval(attnIv);
    const t0 = performance.now();
    attnIv = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      if (t > 3 || document.fullscreenElement || document.webkitFullscreenElement) { clearInterval(attnIv); fb.style.opacity = ''; fb.style.boxShadow = ''; return; }
      const blink = 0.5 + 0.5 * Math.sin(t * 12.57);          // ~2 Hz blink
      const glow = 0.5 + 0.5 * Math.sin(t * 6.28);            // 1 Hz breathing halo
      fb.style.opacity = (0.45 + 0.55 * blink).toFixed(2);
      fb.style.boxShadow = '0 0 ' + (7 + 9 * glow).toFixed(1) + 'px 3px rgba(140, 200, 255, .9)';
    }, 50);
  };
  const sync = () => {
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    fb.classList.toggle('show', !fs);
    if (wasFS && !fs) attention();   // just left fullscreen — demand the eyes
    wasFS = fs;
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  let sawPtr = false;
  const go = () => {
    try {
      const cur = document.fullscreenElement || document.webkitFullscreenElement;
      if (cur) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      else { const p = root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen(); if (p && p.catch) p.catch(() => { }); }
    } catch (err) { }
    setTimeout(sync, 50); sync();
  };
  fb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); sawPtr = true; go(); });
  fb.addEventListener('click', e => { e.preventDefault(); if (!sawPtr) go(); sawPtr = false; });   // event-paired — one action per tap
  setInterval(sync, 1000); sync();   // slow heartbeat — covers any browser that fumbles the change event
})();
function bindHold(id, down, up) {
  const b = el(id);
  if (!b) return;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    audio.resume(); audio.uiClick();
    wakeBtns();
    down();
    b.classList.add('on');
    // the hold locks on press: this finger owns the button until it lifts,
    // wherever it wanders — and past the button it becomes a camera drag
    btnPointers.set(e.pointerId, { btn: b, rect: b.getBoundingClientRect(), handed: false });
    try { b.setPointerCapture(e.pointerId); } catch (err) { }
  });
  b.addEventListener('pointermove', e => {
    const st = btnPointers.get(e.pointerId);
    if (!st || st.handed) return;
    const r = st.rect;
    if (e.clientX < r.left - 10 || e.clientX > r.right + 10 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10) {
      st.handed = true;
      if (camPointers.size === 0) {   // no other finger on the lens — this one takes it
        pinch0 = 0;   // never a pinch from a button handoff
        camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, fromBtn: true });
      }
    }
  });
  const end = e => {
    if (btnPointers.has(e.pointerId)) {
      btnPointers.delete(e.pointerId);
      camPointers.delete(e.pointerId);
      b.classList.remove('on');
      if (up) up();
    }
  };
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
}
bindHold('tGather', () => doGather());
/* ---- tap-toggle locks: sprint / attack / jump run themselves until tapped again ---- */
const TOGGLES = {
  tSprint: { on: false }, tAttack: { on: false }, tJump: { on: false }
};
window.__toggles = TOGGLES;
for (const id of ['tSprint', 'tAttack', 'tJump']) {
  const b = el(id); if (!b) continue;
  const t = TOGGLES[id];
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    t.on = !t.on;
    b.classList.toggle('on', t.on);   // lit = the action runs itself
    audio.resume(); audio.uiClick(); wakeBtns();
    if (id === 'tSprint') { touch.sprint = t.on; wolf.sprintLock = t.on; }
    if (id === 'tJump') keys.Space = t.on;
    if (id === 'tAttack') {
      clearInterval(t.iv);
      if (t.on) t.iv = setInterval(() => { if (state === 'play' && wolf.deadT <= 0) wolf.attack(); }, 150);   // wolf.attack() self-gates on its cooldown
    }
    btnPointers.set(e.pointerId, { btn: b, rect: b.getBoundingClientRect(), handed: false });
    try { b.setPointerCapture(e.pointerId); } catch (err) { }
  });
  const end = e => { if (btnPointers.has(e.pointerId)) { btnPointers.delete(e.pointerId); camPointers.delete(e.pointerId); } };   // the lock survives the lift
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
}
bindHold('tHowl', () => wolf.howl());
bindHold('tProwl', () => { wolf.crouch = !wolf.crouch; toast(wolf.crouch ? '🐾 Prowling' : '🐾 Standing'); });
(function () {
  const ib = el('invBtn'), iw = el('invWrap');
  const toggleInv = f => {
    if (!iw) return;
    const show = f !== undefined ? f : !iw.classList.contains('show');
    iw.classList.toggle('show', show);
    if (show) { audio.uiClick(); updateInv(); }
  };
  window.toggleInv = toggleInv;
  // BULLETPROOF toggle — EVENT-PAIRED, not time-guarded: pointerdown toggles and marks the tap;
  // the trailing click (which phones may delay by SECONDS) only acts if it came from a tap that never
  // fired pointerdown. One physical tap = exactly one toggle, whatever the browser duplicates or delays.
  let sawPtr = false;
  if (ib) {
    ib.addEventListener('pointerdown', e => { e.preventDefault(); sawPtr = true; toggleInv(); });
    ib.addEventListener('click', e => { e.preventDefault(); if (!sawPtr) toggleInv(); sawPtr = false; });
  }
  let sawPtrX = false;
  const ic = el('invClose');
  if (ic) {
    ic.addEventListener('pointerdown', e => { e.preventDefault(); sawPtrX = true; toggleInv(false); });
    ic.addEventListener('click', e => { e.preventDefault(); if (!sawPtrX) toggleInv(false); sawPtrX = false; });
  }
  if (iw) iw.addEventListener('pointerdown', e => { if (e.target === iw) toggleInv(false); });   // tap the shade to close
})();
(function () {
  const qb = el('questBtn');
  if (qb) qb.addEventListener('click', () => toggleQuestLog());
  const qx = el('questX');
  if (qx) qx.addEventListener('click', () => toggleQuestLog(false));
  const tabs = document.querySelectorAll('.qtab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    questTab = t.dataset.t;
    audio.uiClick();
    renderQuests();
  }));
  const ql = el('questList');
  if (ql) ql.addEventListener('click', e => {
    const ac = e.target.getAttribute && e.target.getAttribute('data-ac');
    const ab = e.target.getAttribute && e.target.getAttribute('data-ab');
    if (ac) acceptQuest(ac);
    else if (ab) abandonQuest(ab);
  });
  const bm = el('bigmap');
  if (bm) bm.addEventListener('click', bigMapTravel);
  refillQuests();   // the wild offers its first deeds
})();
bindHold('tSense', () => wolf.wolfSense());
(function () {
  const b = el('tPause');
  if (!b) return;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    b.classList.add('on');
    setTimeout(() => b.classList.remove('on'), 350);
    if (state === 'play') setState('pause');
    else if (state === 'pause') setState('play');
  });
})();

/* -------- camera: multi-touch drag look + pinch zoom -------- */
const cv = renderer.domElement;
const PITCH_MAX = Math.PI / 2 - 0.001;   // true straight-up / straight-down
const camPointers = new Map();
let pinch0 = 0, pinchDist0 = 8.5;
cv.addEventListener('contextmenu', e => e.preventDefault());
const CAM_CTRL = '#btns, .tbtn, #minimap, #bigmapWrap, #joyZone, #joy, #btnAI, #invBtn, #questBtn, #questLog, #invWrap, .btn, #toasts, #boot, #deathOv';
addEventListener('pointerdown', e => {   // the camera owns the RAW WORLD — and never steals a single UI click
  audio.resume();
  const t = e.target;
  const rawWorld = t === cv || t === document.body || t === document.documentElement || (t && t.id === 'hud');
  if (!rawWorld || (t && t.closest && t.closest(CAM_CTRL))) return;   // buttons, tabs, cards, overlays keep their touches
  if (camPointers.has(e.pointerId)) camPointers.delete(e.pointerId);   // a reused id starts clean
  try { cv.setPointerCapture(e.pointerId); } catch (err) { }           // the swipe stays ours wherever it slides
  camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (camPointers.size === 2 && [...camPointers.values()].every(q => !q.fromBtn)) {   // a pinch needs two real canvas fingers
    const pts = [...camPointers.values()];
    pinch0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchDist0 = camDist;
  } else pinch0 = 0;
});
addEventListener('pointermove', e => {
  const p = camPointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (state !== 'play') return;
  if (camPointers.size === 2 && pinch0 > 40 && [...camPointers.values()].every(q => !q.fromBtn)) {
    const pts = [...camPointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    camDist = clamp(pinchDist0 * pinch0 / d, 3.5, 19);
  } else {
    // pan by whichever finger moves — a held button's finger, a canvas finger, either
    const sens = 0.0078 * clamp(viewDist / 8.5, 0.55, 1.5);
    const vGain = document.body.classList.contains('touch') ? 1.5 : 1;   // a thumb's short swipe = the whole sky
    camYaw -= dx * sens;
    camPitch = clamp(camPitch + dy * sens * vGain, -PITCH_MAX, PITCH_MAX);   // free look — the full 90°, soil to zenith
  }
});
addEventListener('pointerdown', () => { audio.init(); audio.resume(); }, { capture: true });   // any first touch wakes the score
const camPtrEnd = e => { camPointers.delete(e.pointerId); btnPointers.delete(e.pointerId); };
addEventListener('pointerup', camPtrEnd);
function camEdgeHold(dt) {   // thumb parked at the top/bottom edge: keep tilting to the full 90°
  if (state !== 'play' || camPointers.size !== 1) return;
  const p = [...camPointers.values()][0];
  const EDGE = Math.max(48, innerHeight * 0.12), RATE = 1.5;   // rad/s while held near the edge
  if (p.y < EDGE) camPitch = clamp(camPitch - RATE * dt, -PITCH_MAX, PITCH_MAX);
  else if (p.y > innerHeight - EDGE) camPitch = clamp(camPitch + RATE * dt, -PITCH_MAX, PITCH_MAX);
}
addEventListener('pointercancel', camPtrEnd);
/* ghost sweep: touch events carry the authoritative list of fingers still down —
   a swallowed pointerup can never leave a stale "pinch partner" that kills the next swipe */
const camSweep = e => {
  const ids = new Set([...(e.touches || [])].map(t => t.identifier));
  for (const k of [...camPointers.keys()]) if (!ids.has(k)) camPointers.delete(k);
};
addEventListener('touchend', camSweep, { passive: true });
addEventListener('touchcancel', camSweep, { passive: true });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  camDist = clamp(camDist + e.deltaY * 0.012, 3.5, 19);
}, { passive: false });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function readInput() {
  input.f = !!(keys.KeyW || keys.ArrowUp);
  input.b = !!(keys.KeyS || keys.ArrowDown);
  input.l = !!(keys.KeyA || keys.ArrowLeft);
  input.r = !!(keys.KeyD || keys.ArrowRight);
  input.sprint = !!(keys.ShiftLeft || keys.ShiftRight || touch.sprint);
  input.jump = !!keys.Space;
  input.mx = joy.id !== null ? joy.x : 0;
  input.my = joy.id !== null ? -joy.y : 0;
}

/* ---------------- camera ---------------- */
const camTarget = V3(0, 0, 0);
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
let viewYaw = Math.PI, viewPitch = 0.42, viewDist = 8.5;
function updateCamera(dt) {
  // fast, jitter-free smoothing: view angles chase the raw input values
  viewYaw += wrapPI(camYaw - viewYaw) * (1 - Math.exp(-dt * 34));
  viewPitch += (camPitch - viewPitch) * (1 - Math.exp(-dt * 34));
  viewDist += (camDist - viewDist) * (1 - Math.exp(-dt * 12));
  const target = _v1.copy(wolf.pos); target.y += 1.5;
  camTarget.lerp(target, 1 - Math.exp(-dt * 16));
  // free look with a decoupled orbit AND a sky-gaze: as the view climbs, the
  // camera glides in above the wolf's head — at the full 90° it looks straight
  // up from just above the wolf, so the wolf is BEHIND the camera: nothing but
  // sky in the whole frame, exactly like craning your head back yourself
  const posPitch = Math.max(viewPitch, -0.35);
  const cp = Math.cos(posPitch), sp = Math.sin(posPitch);
  const px = camTarget.x + Math.sin(viewYaw) * cp * viewDist;
  const pz = camTarget.z + Math.cos(viewYaw) * cp * viewDist;
  const py = camTarget.y + sp * viewDist;
  const bt = clamp((-viewPitch - 0.3) / 0.45, 0, 1);   // starts just above level, complete by ~43° up
  const skyB = bt * bt * (3 - 2 * bt);   // smooth glide: orbit → above-the-head
  const fx = px + (camTarget.x - px) * skyB;
  const fz = pz + (camTarget.z - pz) * skyB;
  const fy = py + (camTarget.y + 0.85 - py) * skyB;
  const gh = groundAt(fx, fz) + 0.65;
  camera.position.set(fx, Math.max(fy, gh), fz);
  const look = _v2.set(
    -Math.sin(viewYaw) * Math.cos(viewPitch),
    -Math.sin(viewPitch),
    -Math.cos(viewYaw) * Math.cos(viewPitch)
  );
  camera.lookAt(_v3.copy(camTarget).add(look.multiplyScalar(4)));
  const fovT = (wolf.flyT > 0 && wolf.speed > 10) ? 80 : wolf.speed > 9 ? 70 : 62;
  camera.fov = lerp(camera.fov, fovT, Math.min(1, dt * 6));
  camera.updateProjectionMatrix();
}

// ?audit=1 — every HP drop is logged with its call site (damage-source audit)
if (/[?&]audit=1/.test(location.search)) {
  let _hp = wolf.hp;
  try {
    Object.defineProperty(wolf, 'hp', { configurable: true, get() { return _hp; }, set(v) { if (v < _hp - 0.01) console.log('[audit] hp ' + _hp.toFixed(1) + ' → ' + v.toFixed(1) + ' @ ' + (new Error().stack.split('\n')[2] || '').trim()); _hp = v; } });
  } catch (e) { }
}

/* ---------------- boot & main loop ---------------- */
const clock = new THREE.Clock();
let bootList = [], bootDone = 0;
let perfT = 0, perfN = 0, perfDone = false;
(function initBoot() {
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  for (let dz = -2; dz <= 2; dz++)
    for (let dx = -2; dx <= 2; dx++)
      bootList.push({ cx: ccx + dx, cz: ccz + dz, d: dx * dx + dz * dz });
  bootList.sort((a, b) => a.d - b.d);
  camYaw = wolf.yaw + Math.PI;
  camTarget.copy(wolf.pos); camTarget.y += 1.5;
  updateCamera(0.016);
  updateAtmosphere(0);
  showOverlay('start');
  if (AUTOSTART) ui.overlay.classList.add('hidden');
})();

let lastErrShown = '', lastErrT = -9;
function errShow(msg) {   // banner an error but never kill the loop
  const d = document.getElementById('err');
  if (!d) return;
  const t = performance.now() / 1000;
  if (msg === lastErrShown && t - lastErrT < 2) return;   // no spamming every frame
  lastErrShown = msg; lastErrT = t;
  d.style.display = 'block';
  d.textContent = '⚠ ' + msg + ' — recovering';
  clearTimeout(errShow._t);
  errShow._t = setTimeout(() => { d.style.display = 'none'; }, 6000);
}
function tick() {
  requestAnimationFrame(tick);
  try {
  const rdt = Math.min(clock.getDelta(), 0.05);
  if (state === 'boot') {
    for (let i = 0; i < 2 && bootDone < bootList.length; i++) {
      genChunk(bootList[bootDone].cx, bootList[bootDone].cz);
      bootDone++;
    }
    const bar = el('bootBar');
    if (bar) bar.style.width = Math.round(bootDone / bootList.length * 100) + '%';
    if (bootDone >= bootList.length) {
      if (AUTOSTART) {
        state = 'play';
        ui.hud.classList.remove('hidden');
      } else {
        state = 'menu';
        menuReady();
      }
    }
    updateAtmosphere(rdt);
    renderer.render(scene, camera);
    if (questArrowMesh && questArrowMesh.visible) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(arrowScene, camera); renderer.autoClear = true; }
    return;
  }
  const wantBlur = (state === 'pause' || document.getElementById('bigmapWrap').classList.contains('show')) ? 'blur(5px) brightness(0.85)' : '';   // gameplay suspended — the world steps back (not the live menu vista: too costly to composite)
  if (renderer.domElement.style.filter !== wantBlur) renderer.domElement.style.filter = wantBlur;
  const running = state === 'play';
  if (bossSlowmoT > 0) bossSlowmoT -= rdt;   // a legend's death: the world holds its breath
  const dt = (running || state === 'menu' ? rdt : 0) * (bossSlowmoT > 0 ? 0.3 : 1);
  tSec += dt;
  if (running) stats.playT += rdt;

  // adaptive performance: if the device struggles, shed shadows & resolution
  if (!perfDone) {
    perfT += rdt; perfN++;
    if (perfT > 6) {
      perfDone = true;
      if (perfN / perfT < 24 && renderer.shadowMap.enabled) {
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
        sun.castShadow = false;
        scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
        toast('⚙ Performance mode: shadows off for smoother play');
      }
    }
  }

  if (running) {
    readInput();
    wolf.update(dt, input, camYaw + Math.PI, camPitch);
  } else if (state === 'menu') {
    wolf.animate(rdt, false);
  }
  if (state === 'menu') camYaw += rdt * 0.12;

  maintainChunks(rdt);
  if (state !== 'pause') {
    const adt = Math.max(dt, 0.0001);
    for (const ch of chunks.values()) {
      for (const a of ch.animals) a.update(adt, tSec);
      for (const pr of ch.predators) pr.update(adt, tSec);
    }
    // ---- 🦅 the golden eagle: a rare sighting, daylight only ----
    eagleSpawnT -= adt;
    if (eagleSpawnT <= 0) {
      eagleSpawnT = 80 + Math.random() * 100;            // rare — about one sighting per day of light
      if (eagleTotal < 1 && dayF > 0.55 && state === 'play' && !caveState.in && wolf.deadT <= 0) {
        const ea = Math.random() * Math.PI * 2, er = 55 + Math.random() * 45;
        const ex = wolf.pos.x + Math.sin(ea) * er, ez = wolf.pos.z + Math.cos(ea) * er;
        const ech = chunks.get(ck(Math.floor(ex / CHUNK), Math.floor(ez / CHUNK)));
        if (ech) ech.predators.push(new SkyEagle(ex, ez));
      }
    }
  }
  updateWeather(dt);
  updateAtmosphere(dt);
  updateSense(dt);
  updateMagicGlow(dt);
  pool.update(Math.max(dt, 0.0001));
  if (!caveState.in) WORLD_EVENTS.update(dt);
  if (caveState.in) caveTick(dt);
  updateSeasons();
  if (!caveState.in) updateEco(dt);
  if (running) { bossTick(dt); spiritTick(rdt); questTick(dt); if (window.CAMP && window.CAMP.tick) window.CAMP.tick(dt); if (window.PACK && window.PACK.tick) window.PACK.tick(dt, tSec); }
  updateEnvironment(dt);
  if (audio.ready && audio.fireG) {
    const f = WORLD_EVENTS.fireAt;
    const g = f ? Math.max(0, 1 - Math.hypot(wolf.pos.x - f.x, wolf.pos.z - f.z) / 130) * 0.1 : 0;
    audio.fireG.gain.setTargetAtTime(g, audio.ctx.currentTime, 0.4);
  }
  audio.setAmbient(weather.wind + weather.storm * 0.4 + (wolf.flyT > 0 ? 1.3 : 0), weather.rain);
  const wCov = coverAt(wolf.pos.x, wolf.pos.z);
  audio.setForest(wCov, weather.wind + weather.storm * 0.4);
  audio.setBiome(window.__biomeW || {});
  if (audio.ready && curBiomeKey === 'swamp' && dayF < 0.35) {
    croakT -= dt;
    if (croakT <= 0) { croakT = 2.5 + Math.random() * 5; audio.croak(); }
  }

  if (audio.ready && dayF > 0.5 && weather.rain < 0.15 && curBiomeKey !== 'tundra' && curBiomeKey !== 'mountain') {
    chirpT -= dt;
    if (chirpT <= 0) { chirpT = 2.6 - wCov * 1.2 + Math.random() * 6; audio.chirp(0.45 + 0.45 * wCov); }   // songbirds hold forth in the canopy
  }
  updateBirds(dt);
  // ---- the wild speaks: animals near the wolf answer in their own voices ----
  voiceT -= dt;
  if (voiceT <= 0) {
    voiceT = 0.9 + Math.random() * 0.7;
    let near = null, nd = 34;
    for (const [, ch] of chunks) for (const an of ch.animals) {
      if (an.dead) continue;
      const d = Math.hypot(an.pos.x - wolf.pos.x, an.pos.z - wolf.pos.z);
      if (d < nd) { nd = d; near = an; }
    }
    if (near) {
      const lab = near.sp.label, now2 = tSec;
      const cd = voiceCd[lab] || 0;
      if (now2 > cd) { voiceCd[lab] = now2 + 9 + Math.random() * 10; audio.speciesCall(lab, 0.85 - nd / 44); }
    }
  }

  /* ---- the living soundtrack: state, theme, body, wild voices ---- */
  if (audio.ready) {
    if (music.THEMES[curBiomeKey]) music.theme = curBiomeKey;   // each land sings its own song
    music.update(dt);
    // the wolf's body: breath, pants, whimpers, crunch of ground
    const tempHere = climateAt(wolf.pos.x, wolf.pos.z, heightAt(wolf.pos.x, wolf.pos.z)).temp;
    breathT -= dt;
    if (breathT <= 0) {
      const running2 = wolf.speed > 7.5;
      breathT = running2 ? 0.85 : 2.3;
      if (wolf.speed > 1.5 || wolf.stamina < 30) audio.breath(running2 ? 0.05 : 0.022);
      if (tempHere < -0.15 && !wolf.swimming && wolf.deadT <= 0) pool.burst(V3(wolf.pos.x + Math.sin(wolf.yaw) * 0.9, wolf.pos.y + 0.75, wolf.pos.z + Math.cos(wolf.yaw) * 0.9), 1, 0xeaf4fa, 0.32, 0.5, 0.8);   // breath hangs in the cold
    }
    if (wolf.stamina < 28 && wolf.deadT <= 0) { pantT -= dt; if (pantT <= 0) { pantT = 1.5; audio.pant(); } }
    if (wolf.hp < 30 && wolf.hp > 0 && wolf.deadT <= 0) { whimperT -= dt; if (whimperT <= 0) { whimperT = 3.8; audio.whimper(); } }
    if (wolf.speed > 2 && !wolf.swimming && wolf.flyT <= 0) {
      const st = groundStepType(wolf.pos.x, wolf.pos.z);
      if (st === 'snow' && tempHere < -0.3 && Math.random() < dt * 0.05) audio.iceCrack();       // deep cold talks
      if (wCov > 0.45 && Math.random() < dt * 0.04) audio.branchSnap();                            // old wood gives way
      if (wolf.speed > 7 && wCov > 0.4 && Math.random() < dt * 0.3) audio.rustle();                // pushing through brush
    }
    // falling water: the roar of falls, the murmur of rivers
    let roar = 0;
    for (const lm of landmarkList) if (lm.type === 'waterfall') {
      const d = Math.hypot(lm.x - wolf.pos.x, lm.z - wolf.pos.z);
      roar = Math.max(roar, (1 - Math.min(1, d / 130)) * 0.3);
    }
    let river = 0;
    for (const [ox, oz] of [[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9]]) {
      if (heightAt(wolf.pos.x + ox, wolf.pos.z + oz) < waterYNow() - 0.1) { river = 0.1 - Math.hypot(ox, oz) * 0.008; break; }
    }
    audio.setWater(roar, Math.max(0, river));
    // wild voices: owls, crickets, eagles — and other wolves, far off
    owlT -= dt; cricketT -= dt; eagleT -= dt; farHowlT -= dt;
    if (dayF < 0.28 && wCov > 0.3 && owlT <= 0) { owlT = 9 + Math.random() * 14; audio.owl(); }
    if (dayF < 0.4 && (curBiomeKey === 'meadow' || curBiomeKey === 'forest' || curBiomeKey === 'grove') && weather.rain < 0.2 && cricketT <= 0) { cricketT = 1.4 + Math.random() * 2.2; audio.chirp(0.12); }
    if (dayF > 0.5 && (curBiomeKey === 'mountain' || curBiomeKey === 'highland') && eagleT <= 0) { eagleT = 16 + Math.random() * 22; audio.eagle(); }
    if (farHowlT <= 0) {
      farHowlT = 18 + Math.random() * 20;
      let near = false;
      for (const r of rivals) if (!r.dead && r.pos.distanceTo(wolf.pos) < 420) { near = true; break; }
      if (near && !caveState.in) audio.howl(0.58);   // the pack sings in the distance
    }
  }
  updatePawPrints(dt);   // the wolf writes its passage, sound or silence

  camEdgeHold(rdt);
  updateCamera(rdt);
  updateHUD(rdt);
  renderer.render(scene, camera);
  if (questArrowMesh && questArrowMesh.visible) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(arrowScene, camera); renderer.autoClear = true; }   // pass 2: the arrow, overlapped only by the wolf
  } catch (ex) {
    errShow(ex && ex.message ? ex.message : String(ex));
  }
}
window.addEventListener('error', e => {
  const d = document.getElementById('err');
  if (d) { d.style.display = 'block'; d.textContent = '⚠ ' + (e.message || 'error'); }
});
tick();
