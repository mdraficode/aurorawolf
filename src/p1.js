'use strict';
/* ================================================================
   REVONTULET — Aurora Wolf · an infinite procedural wilderness
   Part 1 — math, noise, terrain & biome functions
   ================================================================ */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function angLerp(a, b, t) {
  let d = (b - a + Math.PI) % (Math.PI * 2);
  if (d < 0) d += Math.PI * 2;
  d -= Math.PI;
  return a + d * t;
}
const wrapPI = a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash2(x, y, s) {
  let h = 1779033703 ^ s;
  h = Math.imul(h ^ x, 3432918353); h = (h << 13) | (h >>> 19);
  h = Math.imul(h ^ y, 461845907); h ^= h >>> 16;
  return h >>> 0;
}

/* ---------------- simplex noise ---------------- */
function makeSimplex(rng) {
  const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function (xin, yin) {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; const g = grad[perm[ii + perm[jj]] & 7]; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
}
function fbm(n, x, y, oct) {
  let a = 1, f = 1, s = 0, norm = 0;
  for (let o = 0; o < oct; o++) { s += a * n(x * f, y * f); norm += a; a *= 0.5; f *= 2.02; }
  return s / norm;
}
function ridged(n, x, y, oct) {
  let a = 0.5, f = 1, s = 0, norm = 0;
  for (let o = 0; o < oct; o++) {
    let v = 1 - Math.abs(n(x * f, y * f)); v *= v;
    s += a * v; norm += a; a *= 0.5; f *= 2.07;
  }
  return s / norm;
}

/* ---------------- world seed & noise fields ---------------- */
const QPARAMS = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
const SEED = (parseInt(QPARAMS.get('seed'), 10) || ((Math.random() * 1e9) | 0)) >>> 0;
const AUTOSTART = QPARAMS.get('autostart') === '1';
const QUALITY = QPARAMS.get('quality') || 'high';

const seedRng = mulberry32(SEED);
const nH    = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // continents
const nD    = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // hills detail
const nM    = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // mountain mask
const nR    = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // ridges
const nT    = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // temperature
const nO    = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // moisture
const nF    = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // forest clumping
const nVar  = makeSimplex(mulberry32(seedRng() * 1e9 | 0));   // ground variation
const nRiver = makeSimplex(mulberry32(seedRng() * 1e9 | 0));  // river bands
const nMagic = makeSimplex(mulberry32(seedRng() * 1e9 | 0));  // enchanted grove fields
const nClr   = makeSimplex(mulberry32(seedRng() * 1e9 | 0));  // forest clearings
const nPath  = makeSimplex(mulberry32(seedRng() * 1e9 | 0));  // winding animal paths
const nVol   = makeSimplex(mulberry32(seedRng() * 1e9 | 0));  // volcanic fields

/* ---------------- terrain shape ---------------- */
const CHUNK = 64, SEG = 32, VIEW_R = 3;
const WATER_Y = 0;

function riverBandAt(x, z) {
  // contour lines of a warped noise field = naturally winding, connected channels
  const warp = fbm(nD, x * 0.003 + 91.3, z * 0.003 - 44.1, 2);
  const v = Math.abs(fbm(nRiver, x * 0.0016 + warp * 0.7, z * 0.0016 - warp * 0.6, 3) - 0.5);
  return 1 - ss(0.012, 0.052, v);   // 1 inside the channel, fading to 0
}
function heightAt(x, z) {
  const c     = fbm(nH, x * 0.0013, z * 0.0013, 4);
  const hills = fbm(nD, x * 0.009,  z * 0.009,  3);
  const mm    = ss(0.02, 0.5, fbm(nM, x * 0.0015 + 37.7, z * 0.0015 - 11.3, 3));
  const r     = ridged(nR, x * 0.0042, z * 0.0042, 4);
  let h = 8 + c * 13 + hills * 3.2 + mm * r * r * 56;
  // rivers: carve only through lowlands so mountains stay intact
  const low = ss(14, 8, h) * ss(-1.5, 0.8, h);
  if (low > 0.001 && h < 14) {
    const riv = riverBandAt(x, z) * low;
    if (riv > 0.001) {
      const bed = WATER_Y - 1.4 - nVar(x * 0.04, z * 0.04) * 1.1;
      h = h * (1 - riv) + bed * riv;
    }
  }
  return h;
}
var SEASON_TEMP_BIAS = 0;   // set by the turning year (p4)
function climateAt(x, z, h) {
  const temp  = fbm(nT, x * 0.00062, z * 0.00062, 3) - Math.max(0, h - 25) * 0.016 + SEASON_TEMP_BIAS;
  const moist = fbm(nO, x * 0.00068, z * 0.00068, 3);
  return { temp, moist };
}
const BIOME_INFO = {
  tundra:   { name: 'Frozen Tundra',    icon: '🌨️' },
  taiga:    { name: 'Snowy Taiga',      icon: '🌲' },
  forest:   { name: 'Boreal Forest',    icon: '🌳' },
  grove:    { name: 'Autumn Grove',     icon: '🍁' },
  meadow:   { name: 'Flower Meadows',   icon: '🌸' },
  mountain: { name: 'Frostpeak Mountains', icon: '⛰️' },
  swamp:    { name: 'Murky Swamp',      icon: '🪵' },
  enchanted:{ name: 'Enchanted Grove',   icon: '✨' },
  coast:    { name: 'Coastal Reach',     icon: '🏖️' },
  dry:      { name: 'Dry Valley',        icon: '🏜️' },
  highland: { name: 'Rocky Highlands',   icon: '🪨' },
  volcanic: { name: 'Ember Wastes',      icon: '🌋' },
  shore:    { name: 'Wild Shoreline',   icon: '🌊' }
};
function volField(x, z) { return fbm(nVol, x * 0.0016, z * 0.0016, 2); }   // broad fields, soft fringes
function volcanicAt(x, z) { return ss(0.75, 0.82, volField(x, z)); }   // 1 on the hot ember core
function biomeWeights(x, z, h, temp, moist) {
  const cold = 1 - ss(-0.42, -0.10, temp);
  const warm = ss(0.10, 0.40, temp);
  const mid  = Math.max(0, 1 - cold - warm);
  const wet  = ss(-0.28, 0.12, moist);
  let tundra = cold * (1 - wet), taiga = cold * wet;
  let forest = mid * wet, grove = warm * wet;
  let meadow = mid * (1 - wet) * 0.85 + warm * (1 - wet);
  const mt = ss(27, 38, h);
  // dry valley — parched steppe carved out of meadow in arid noise troughs
  let dry = meadow * ss(-0.25, -0.42, moist) * (1 - mt);
  meadow *= 1 - dry * 0.9;
  // swamp — saturated lowlands: murky pools, mist, dead trees
  let swamp = ss(0.55, 0.8, moist) * ss(6.8, 3.0, h) * ss(0.35, 0.6, wet) * (1 - mt);
  swamp = Math.max(0, swamp - mt);
  // enchanted grove — rare mystical fields carved out of woodland
  const magicN = fbm(nMagic, x * 0.00085 + 91.7, z * 0.00085 - 45.2, 3);
  let enchanted = ss(0.60, 0.70, magicN) * wet * ss(1.2, 2.6, h) * (1 - mt);
  enchanted *= enchanted > 0 ? (0.55 + 0.45 * ss(0.2, 0.5, forest + grove)) : 1;
  // rocky highlands — bare scree shoulders above the treeline
  let highland = mt * ss(38, 44, h);
  let mountain = mt * (1 - highland);
  // coastal reach — low shorelines, dunes & stream banks
  let coast = ss(4.6, 0.5, h) * (1 - mt);
  if (swamp > 0) { const k = 1 - swamp * 0.8; forest *= k; grove *= k; taiga *= k; meadow *= k; dry *= k; }
  if (enchanted > 0) { const k = 1 - enchanted; forest *= k; grove *= k; swamp *= 1 - enchanted; }
  if (mt > 0) { const k = 1 - mt; tundra *= k; taiga *= k; forest *= k; grove *= k; meadow *= k; dry *= k; }
  if (coast > 0) { const k = 1 - coast * 0.7; forest *= k; grove *= k; meadow *= k; dry *= k; tundra *= k; taiga *= k; }
  // ember wastes — rare scorched volcanic fields
  let vol = ss(0.66, 0.86, volField(x, z)) * ss(0.5, 3.4, h) * (1 - mt);
  if (vol > 0) { const k = 1 - vol; tundra *= k; taiga *= k; forest *= k; grove *= k; meadow *= k; swamp *= k; enchanted *= k; coast *= k; dry *= k; mountain *= k; highland *= k; }
  return { tundra, taiga, forest, grove, meadow, mountain, swamp, enchanted, coast, dry, highland, volcanic: vol };
}
function biomeInfoAt(x, z, h) {
  if (h === undefined) h = heightAt(x, z);
  if (h < 1.0) return BIOME_INFO.shore;
  const c = climateAt(x, z, h);
  const w = biomeWeights(x, z, h, c.temp, c.moist);
  let best = 'forest', bv = -1;
  for (const k in w) if (w[k] > bv) { bv = w[k]; best = k; }
  return BIOME_INFO[best];
}
