/* ================================================================
   Part 4 — chunks, weather, day/night, audio, UI, main loop
   ================================================================ */
const GROUND = {
  tundra: new THREE.Color(0xdfe8ee), taiga: new THREE.Color(0x49624c),
  forest: new THREE.Color(0x4e7a40), grove: new THREE.Color(0x7d8a45),
  meadow: new THREE.Color(0x86a94f), mountain: new THREE.Color(0x8b8e93),
  swamp: new THREE.Color(0x4c5c38), enchanted: new THREE.Color(0x3f7a5c),
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
  enchanted: { weather: { mist: 0.8 },  magic: 5.0, treeDens: 1.05, grassDens: 1.1, fog: 0.7, tint: 0x8a7ad0 }
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
  magicShroom: { label: 'Eat Magic Mushroom',  inv: null, icon: '✨', color: 0xb07aff }
};
const PICKUP_GEO = { berryBush: G.berryBush, mushroom: G.mushroom, herb: G.herb, stick: G.stick, stoneP: G.stoneP, magicShroom: G.magicShroom };
const inv = { berry: 0, mushroom: 0, herb: 0, wood: 0, stone: 0, meat: 0, pelt: 0, bone: 0 };
const stats = { gathered: 0, caught: 0, slain: 0, biomes: new Set(), playT: 0 };
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

  const chunk = { key, cx, cz, group, geo, instanced: [], pickups: [], animals: [], predators: [], landmarks: [] };

  /* ---- placement ---- */
  const rng = mulberry32(hash2(cx, cz, SEED));
  const treeSets = { spruce: [], snowSpruce: [], pine: [], birch: [], autumnBirch: [], rowan: [], oak: [], deadTree: [], dwarfPine: [] };
  const rocks = [], grass = [], flowers = [], bushes = [];
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

  for (let i = 0; i < 150; i++) {
    const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
    const s = sample(x, z);
    if (s.h < 1.4) continue;
    const dens = ss(-0.35, 0.55, fbm(nF, x * 0.012, z * 0.012, 2));
    const biome = pickWeighted(rng, Object.entries(s.w).filter(e => e[1] > 0.02));
    let p = 0, placed = null;
    const item = { x, y: s.h - 0.1, z, ry: rng() * 6.28, s: 1.0 + rng() * 0.8, tint: _c2.setRGB(0.86 + rng() * 0.28, 0.86 + rng() * 0.28, 0.86 + rng() * 0.24).clone() };
    if (biome === 'taiga') {
      p = 0.16 + 0.85 * dens;
      const t = rng() < 0.16 ? 'birch' : (s.cl.temp < -0.32 && rng() < 0.75 ? 'snowSpruce' : 'spruce');
      treeSets[t].push(item); placed = item;
    } else if (biome === 'forest') {
      p = 0.12 + 0.78 * dens;
      const r = rng();
      const t = r < 0.45 ? 'pine' : r < 0.72 ? 'birch' : 'spruce';
      treeSets[t].push(item); placed = item;
    } else if (biome === 'grove') {
      p = 0.12 + 0.72 * dens;
      const r = rng();
      const t = r < 0.5 ? 'autumnBirch' : r < 0.78 ? 'rowan' : 'birch';
      treeSets[t].push(item); placed = item;
    } else if (biome === 'meadow') {
      p = 0.05 + 0.14 * dens;
      const t = rng() < 0.8 ? 'oak' : 'birch';
      treeSets[t].push(item); placed = item;
    } else if (biome === 'tundra') {
      p = 0.13;
      const t = rng() < 0.5 ? 'deadTree' : 'dwarfPine';
      treeSets[t].push(item); placed = item;
    } else if (biome === 'swamp') {
      p = 0.34 + 0.3 * dens;
      const r = rng();
      const t = r < 0.45 ? 'deadTree' : r < 0.7 ? 'dwarfPine' : 'birch';
      treeSets[t].push(item); placed = item;
      if (t === 'birch') item.tint.multiplyScalar(0.82);
    } else if (biome === 'enchanted') {
      p = 0.16 + 0.8 * dens;
      const r = rng();
      const t = r < 0.6 ? 'birch' : r < 0.85 ? 'rowan' : 'spruce';
      treeSets[t].push(item); placed = item;
      // mystical teal-violet canopy tint
      item.tint.setRGB(0.62 + rng() * 0.25, 0.58 + rng() * 0.2, 0.85 + rng() * 0.3);
    } else if (biome === 'mountain') {
      p = s.h < 40 ? 0.08 + 0.34 * dens : 0.015;
      const t = s.cl.temp < -0.25 && rng() < 0.6 ? 'snowSpruce' : 'spruce';
      treeSets[t].push(item); placed = item;
    }
    if (placed && (rng() > p || !slopeOK(x, z, s.h))) {
      for (const k in treeSets) {
        const arr = treeSets[k];
        if (arr.length && arr[arr.length - 1] === placed) arr.pop();
      }
    }
  }

  for (let i = 0; i < 14; i++) {
    const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
    const s = sample(x, z);
    if (s.h < 0.6) continue;
    const p = 0.5 * s.w.mountain + 0.28 * s.w.tundra + 0.1;
    if (rng() < p) {
      const white = Math.max(s.w.tundra, s.w.mountain * ss(38, 48, s.h)) > 0.45;
      const g = 0.75 + rng() * 0.35;
      _c2.setRGB(g, g, Math.min(1, g + 0.04));
      if (white) _c2.setRGB(1.25, 1.28, 1.34);
      rocks.push({ x, y: s.h - 0.15, z, ry: rng() * 6.28, s: 0.5 + rng() * 1.7, tint: _c2.clone() });
    }
  }
  for (let i = 0; i < 85; i++) {
    const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
    const s = sample(x, z);
    if (s.h < 1.2) continue;
    const p = 0.85 * s.w.meadow + 0.6 * s.w.forest + 0.45 * s.w.grove + 0.25 * s.w.taiga;
    if (rng() < p) {
      const gv = 0.75 + rng() * 0.45;
      _c2.setRGB(gv * (0.9 + s.w.grove * 0.35), gv, gv * (0.85 + s.w.taiga * 0.2));
      grass.push({ x, y: s.h - 0.05, z, ry: rng() * 6.28, s: 0.8 + rng() * 1.1, tint: _c2.clone() });
    }
  }
  for (let i = 0; i < 30; i++) {
    const x = cx * CHUNK + rng() * CHUNK, z = cz * CHUNK + rng() * CHUNK;
    const s = sample(x, z);
    if (s.h < 1.2) continue;
    const p = 0.5 * s.w.forest + 0.45 * s.w.taiga + 0.35 * s.w.grove + 0.15 * s.w.meadow;
    if (rng() < p) {
      const bv = 0.8 + rng() * 0.35;
      _c2.setRGB(bv * 0.95, bv, bv * 0.9);
      bushes.push({ x, y: s.h - 0.05, z, ry: rng() * 6.28, s: 0.8 + rng() * 1.3, tint: _c2.clone() });
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
    berryBush: s => 0.42 * (s.w.taiga + s.w.forest + s.w.meadow * 0.7 + s.w.grove * 0.6),
    mushroom:  s => 0.4 * (s.w.forest + s.w.grove * 0.8),
    herb:      s => 0.5 * s.w.meadow,
    stick:     s => 0.38 * (s.w.forest + s.w.taiga + s.w.grove),
    stoneP:    s => 0.5 * (s.w.tundra + s.w.mountain)
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

  /* ---- landmarks: rare, spaced, data-driven ---- */
  if (hash2(cx, cz, SEED ^ 0x5bd1) % 5 === 0) {
    const types = Object.keys(LANDMARKS);
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
      if (ls.h > 1.1) {
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
          const lm = { type, x: model.position.x, z: model.position.z, model, chunkKey: key, ember: model.userData.ember || null };
          landmarkList.push(lm);
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

  /* ---- instantiate ---- */
  for (const t in treeSets) {
    if (!treeSets[t].length) continue;
    const m = makeInstanced(G[t], matVeg, treeSets[t], true);
    if (m) { group.add(m); chunk.instanced.push(m); }
  }
  if (rocks.length) { const m = makeInstanced(G.rock, matVeg, rocks, true); if (m) { group.add(m); chunk.instanced.push(m); } }
  if (grass.length) { const m = makeInstanced(G.grassTuft, matVeg, grass, false); if (m) { group.add(m); chunk.instanced.push(m); } }
  if (flowers.length) { const m = makeInstanced(G.flower, matVeg, flowers, false); if (m) { group.add(m); chunk.instanced.push(m); } }
  if (bushes.length) { const m = makeInstanced(G.bush, matVeg, bushes, false); if (m) { group.add(m); chunk.instanced.push(m); } }
  for (const type in pkSets) {
    if (!pkSets[type].length) continue;
    const m = makeInstanced(PICKUP_GEO[type], type === 'magicShroom' ? matMagic : matVeg, pkSets[type], true);
    if (!m) continue;
    group.add(m); chunk.instanced.push(m);
    pkSets[type].forEach((it, i) => chunk.pickups.push({ type, mesh: m, idx: i, x: it.x, y: it.y, z: it.z, gathered: false }));
  }

  /* ---- animals ---- */
  const centerS = sample(cx * CHUNK + CHUNK / 2, cz * CHUNK + CHUNK / 2);
  const centerBiome = pickWeighted(rng, Object.entries(centerS.w).filter(e => e[1] > 0.05));
  const table = SPECIES_TABLE[centerBiome];
  if (table) {
    const n = 1 + (rng() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      if (animalTotal >= 46) break;
      const x = cx * CHUNK + 8 + rng() * (CHUNK - 16), z = cz * CHUNK + 8 + rng() * (CHUNK - 16);
      if (heightAt(x, z) < 0.9) continue;
      chunk.animals.push(new Animal(pickWeighted(rng, table), x, z));
    }
  }

  /* ---- territorial predators: at most one per chunk, rare, biome-fit ---- */
  if (predatorTotal < 5) {
    const pTable = PREDATOR_TABLE[centerBiome];
    if (pTable && rng() < 0.13) {
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
  for (const m of chunk.instanced) { if (m.dispose) m.dispose(); }
  for (const a of chunk.animals) a.dispose();
  chunk.animals.length = 0;
  for (const pr of chunk.predators) pr.dispose();
  chunk.predators.length = 0;
  for (const lm of chunk.landmarks) { scene.remove(lm.model); const i = landmarkList.indexOf(lm); if (i >= 0) landmarkList.splice(i, 1); }
  chunk.landmarks.length = 0;
  chunks.delete(chunk.key);
}

function maintainChunks(dt) {
  maintainT -= dt;
  if (maintainT <= 0) {
    maintainT = 0.4;
    const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
    genQueue = [];
    for (let dz = -VIEW_R; dz <= VIEW_R; dz++)
      for (let dx = -VIEW_R; dx <= VIEW_R; dx++) {
        const cx = ccx + dx, cz = ccz + dz;
        if (!chunks.has(ck(cx, cz))) genQueue.push({ cx, cz, d: dx * dx + dz * dz });
      }
    genQueue.sort((a, b) => a.d - b.d);
    for (const chunk of Array.from(chunks.values())) {
      if (Math.max(Math.abs(chunk.cx - ccx), Math.abs(chunk.cz - ccz)) > VIEW_R + 1) disposeChunk(chunk);
    }
  }
  let budget = 1;
  while (budget-- > 0 && genQueue.length) {
    const c = genQueue.shift();
    genChunk(c.cx, c.cz);
  }
}

/* ---------------- nearest pickup / gathering ---------------- */
function nearestPickup() {
  const ccx = Math.floor(wolf.pos.x / CHUNK), ccz = Math.floor(wolf.pos.z / CHUNK);
  let best = null, bestD = 2.7;
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
  p.mesh.setMatrixAt(p.idx, zeroM);
  p.mesh.instanceMatrix.needsUpdate = true;
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
  stats.gathered++;
  pool.burst(V3(p.x, p.y + 0.4, p.z), 14, def.color, 0.7, 2.4, 2.2);
  toast(`${def.icon} +1 ${def.label.replace('Gather ', '').replace('Pick up ', '').replace('Grab ', '').replace('Pick ', '')}`);
  updateInv();
}

/* ---------------- wolf sense ---------------- */
let senseT = 0, senseTick = 0;
function updateSense(dt) {
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

function pickWeather() {
  const h = heightAt(wolf.pos.x, wolf.pos.z);
  const cl = climateAt(wolf.pos.x, wolf.pos.z, h);
  let cold = cl.temp < -0.18;
  // biome weather bias (BIOME_CONFIG.weather at the dominant biome)
  const dom = dominantBiomeAt(wolf.pos.x, wolf.pos.z);
  const bw = BIOME_CONFIG[dom.key] && BIOME_CONFIG[dom.key].weather;
  if (bw) {
    if (bw.snow && (dom.w.tundra + dom.w.taiga + dom.w.mountain) > 0.45) cold = true;
    if (bw.fog && Math.random() < bw.fog) weatherT.mistBias = 1; else weatherT.mistBias = 0;
    if (bw.clear && Math.random() < bw.clear) weatherT.cloud = Math.min(weatherT.cloud, 0.25);
  } else weatherT.mistBias = 0;
  const r = Math.random();
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
let dayF = 1, tSec = 0;
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
  window.__biomeFogMul = fogMul; window.__biomeTintAmt = tintAmt;
  const prev = tDay;
  tDay = (tDay + dt * timeScale / DAY_LEN) % 1;
  if (tDay < prev) dayCount++;
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

  let far = 168 * (1 - 0.32 * weather.rain - 0.42 * weather.snow - 0.16 * weather.cloud) * (1 - 0.12 * (1 - dayF));
  far = Math.max(85, far);
  scene.fog.far += (far * (window.__biomeFogMul || 1) - scene.fog.far) * Math.min(1, dt * 2);
  scene.fog.near = scene.fog.far * 0.42;

  hemi.intensity = 0.2 + 0.62 * dayF * (1 - 0.5 * weather.cloud) + flash * 1.5;
  hemi.color.copy(_sky).lerp(SKY.white, 0.3);

  const night = sunAlt < -0.03;
  if (!night) {
    sun.position.set(wolf.pos.x + sunDir.x * 150, wolf.pos.y + sunDir.y * 150, wolf.pos.z + sunDir.z * 150);
    sun.intensity = (0.12 + 1.2 * dayF) * (1 - 0.68 * weather.cloud) * (1 - 0.22 * weather.rain) + flash * 2.2;
    _c3.copy(SKY.sunWarm).lerp(SKY.sunLow, glow);
  } else {
    sun.position.set(wolf.pos.x - sunDir.x * 150, wolf.pos.y - sunDir.y * 150, wolf.pos.z - sunDir.z * 150);
    sun.intensity = 0.14 * (1 - 0.5 * weather.cloud);
    _c3.copy(SKY.moon);
  }
  sun.color.copy(_c3);
  sun.target.position.copy(wolf.pos);
  sun.target.updateMatrixWorld();

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
    b.material.opacity = clamp(op, 0, 0.8);
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
      this.master.connect(this.ctx.destination);
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
      this.windG = mk('bandpass', 360, 0.05);
      this.rainG = mk('highpass', 1600, 0.0);
      this.ready = true;
    } catch (e) { }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); },
  setAmbient(wind, rain) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.windG.gain.setTargetAtTime(0.02 + wind * 0.1, t, 0.8);
    this.rainG.gain.setTargetAtTime(rain * 0.14, t, 0.9);
  },
  howl() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(290, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.55);
    o.frequency.setValueAtTime(620, t + 1.15);
    o.frequency.exponentialRampToValueAtTime(230, t + 2.3);
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
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }
};
let chirpT = 5;

/* ---------------- UI ---------------- */
const el = id => document.getElementById(id);
const ui = {
  weatherIcon: el('weatherIcon'), weatherLabel: el('weatherLabel'),
  clock: el('clock'), biome: el('biome'), seed: el('statSeed'),
  pos: el('statPos'), prompt: el('prompt'),
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
  // shrine embers pulse
  for (const lm of landmarkList) {
    if (lm.ember) lm.ember.material.color.setHSL(0.1, 0.9, 0.55 + Math.sin(tSec * 3 + lm.x) * 0.2);
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
  wolf.hp = 0;
  wolf.deadT = 2.6;
  wolf.killerPos = null;
  const ov = el('deathOv');
  if (ov) { ov.querySelector('#deathMsg').innerHTML = `${icon || '💀'} <b>Slain by ${label || 'the wild'}</b><br><span style="font-size:14px;opacity:.85">The wild claims you… you wake far away, alive.</span>`; ov.classList.add('show'); }
  vignetteA = 0.9;
}
function wolfTakeDamage(dmg, fromPos, label, icon) {
  if (state !== 'play' || wolf.deadT > 0 || wolf.invulnT > 0 || wolf.flyT > 0) return;
  wolf.hp -= dmg;
  wolf.lastHurt = tSec;
  wolf.invulnT = 0.6;
  vignetteA = Math.min(0.85, vignetteA + 0.45);
  audio.thud();
  // knocked back a step
  const dx = wolf.pos.x - fromPos.x, dz = wolf.pos.z - fromPos.z;
  const l = Math.hypot(dx, dz) || 1;
  const nx = wolf.pos.x + dx / l * 1.1, nz = wolf.pos.z + dz / l * 1.1;
  if (heightAt(nx, nz) > WATER_Y + 0.2) { wolf.pos.x = nx; wolf.pos.z = nz; }
  if (wolf.hp <= 0) wolfDie(`the ${label || 'wild'}`, icon);
}
function wolfRespawn() {
  let ang = Math.random() * Math.PI * 2;
  if (wolf.killerPos) ang = Math.atan2(wolf.pos.x - wolf.killerPos.x, wolf.pos.z - wolf.killerPos.z); // run away from the killer
  let rx = wolf.pos.x, rz = wolf.pos.z;
  for (let i = 0; i < 14; i++) {
    const a2 = ang + (i % 2 ? 1 : -1) * i * 0.35;
    const tx = wolf.pos.x + Math.sin(a2) * 95, tz = wolf.pos.z + Math.cos(a2) * 95;
    if (heightAt(tx, tz) > WATER_Y + 0.8) { rx = tx; rz = tz; break; }
  }
  wolf.pos.x = rx; wolf.pos.z = rz; wolf.pos.y = heightAt(rx, rz) + 0.2;
  wolf.hp = wolf.maxHp;
  wolf.invulnT = 3;
  wolf.deadT = 0;
  wolf.stamina = 100; wolf.exhausted = false;
  const ov = el('deathOv');
  if (ov) ov.classList.remove('show');
  vignetteA = 0;
  toast('🐾 You awaken, shaken but alive — your bounty is safe', true);
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
addEventListener('pointerdown', e => { if (e.target && e.target.id === 'minimap') { e.stopPropagation(); toggleBigMap(true); } }, true);
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
function drawMapOverlays(ctx, S, range, opts) {
  const half = S / 2;
  const toMap = (wx, wz) => [half + (wx - wolf.pos.x) / (range * 2) * S, half + (wz - wolf.pos.z) / (range * 2) * S];
  // ---- predator territory rings ----
  ctx.save();
  ctx.setLineDash([5, 4]);
  for (const ch of chunks.values()) {
    for (const pr of ch.predators) {
      if (pr.dead) continue;
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
    ctx.fillStyle = '#3a2c08';
    ctx.fillText(LANDMARKS[lm.type].icon, mx + 6, my + 3);
    if (opts.big) { ctx.fillStyle = '#ffe9b0'; ctx.font = '10px system-ui'; ctx.fillText(LANDMARKS[lm.type].label, mx + 7, my + 14); ctx.font = '13px system-ui'; }
  }
  // ---- hunting predators ----
  for (const ch of chunks.values())
    for (const pr of ch.predators) {
      if (pr.dead || !pr.threatening) continue;
      const [mx, my] = toMap(pr.pos.x, pr.pos.z);
      ctx.fillStyle = 'rgba(255,64,40,.95)';
      ctx.beginPath(); ctx.arc(mx, my, opts.big ? 4 : 3.4, 0, 6.29); ctx.fill();
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
  ctx.rotate(-camYaw);          // north-up map: camera forward = -(sin camYaw, cos camYaw)
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
    wolf.hp = Math.min(wolf.maxHp, wolf.hp + 3 * dt);
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
  updateMinimap(dt);
  if (BIG.open) updateBigMap(dt);
  ui.stam.style.width = wolf.stamina.toFixed(0) + '%';
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
  ui.biome.textContent = `${info.icon} ${info.name}`;
  ui.pos.textContent = `${wolf.pos.x | 0}, ${wolf.pos.z | 0} · ${fpsShow} fps`;
  ui.seed.textContent = 'seed ' + SEED;
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
    el('btnNew').onclick = () => {
      try {
        const u = new URL(location.href);
        u.searchParams.set('seed', String((Math.random() * 1e9) | 0));
        location.href = u.toString();
      } catch (e) { location.reload(); }
    };
  }
  const b = el('btnStart');
  if (b) b.onclick = startGame;
}
function hideOverlay() { ui.overlay.classList.add('hidden'); }

let state = 'boot';
function setState(s) {
  state = s;
  if (s === 'play') { hideOverlay(); ui.hud.classList.remove('hidden'); }
  else if (s === 'pause') { showOverlay('pause'); inputClear(); }
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
  const p = nearestPickup();
  if (p) { gather(p); return; }
  if (drinkCd <= 0 && !wolf.swimming && wolf.grounded && wolf.flyT <= 0 && nearWaterEdge()) {
    drinkCd = 6;
    wolf.stamina = 100; wolf.exhausted = false;
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
if (joyEl) {
  joyEl.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    audio.resume();
    joy.id = e.pointerId;
    try { joyEl.setPointerCapture(e.pointerId); } catch (err) { }
    joySetFromEvent(e);
  });
  joyEl.addEventListener('pointermove', e => {
    if (e.pointerId !== joy.id) return;
    e.stopPropagation();
    joySetFromEvent(e);
  });
  const joyEnd = e => { if (e.pointerId === joy.id) joyRelease(); };
  joyEl.addEventListener('pointerup', joyEnd);
  joyEl.addEventListener('pointercancel', joyEnd);
}

/* -------- touch buttons -------- */
function bindHold(id, down, up) {
  const b = el(id);
  if (!b) return;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    audio.resume();
    down();
    b.classList.add('on');
  });
  const end = () => { b.classList.remove('on'); if (up) up(); };
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('pointerleave', end);
}
bindHold('tJump', () => { keys.Space = true; }, () => { keys.Space = false; });
bindHold('tSprint', () => { touch.sprint = true; }, () => { touch.sprint = false; });
bindHold('tGather', () => doGather());
bindHold('tAttack', () => wolf.attack());
bindHold('tHowl', () => wolf.howl());
bindHold('tSense', () => wolf.wolfSense());
(function () {
  const b = el('tPause');
  if (!b) return;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (state === 'play') setState('pause');
    else if (state === 'pause') setState('play');
  });
})();

/* -------- camera: multi-touch drag look + pinch zoom -------- */
const cv = renderer.domElement;
const camPointers = new Map();
let pinch0 = 0, pinchDist0 = 8.5;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  audio.resume();
  camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (camPointers.size === 2) {
    const pts = [...camPointers.values()];
    pinch0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchDist0 = camDist;
  }
});
addEventListener('pointermove', e => {
  const p = camPointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (state !== 'play') return;
  if (camPointers.size === 1) {
    const sens = 0.0078 * clamp(viewDist / 8.5, 0.55, 1.5);
    camYaw -= dx * sens;
    camPitch = clamp(camPitch + dy * sens * 0.8, 0.06, 1.3);
  } else if (camPointers.size === 2 && pinch0 > 40) {
    const pts = [...camPointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    camDist = clamp(pinchDist0 * pinch0 / d, 3.5, 19);
  }
});
const camPtrEnd = e => { camPointers.delete(e.pointerId); };
addEventListener('pointerup', camPtrEnd);
addEventListener('pointercancel', camPtrEnd);
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
const _v1 = new THREE.Vector3();
let viewYaw = Math.PI, viewPitch = 0.42, viewDist = 8.5;
function updateCamera(dt) {
  // fast, jitter-free smoothing: view angles chase the raw input values
  viewYaw += wrapPI(camYaw - viewYaw) * (1 - Math.exp(-dt * 34));
  viewPitch += (camPitch - viewPitch) * (1 - Math.exp(-dt * 34));
  viewDist += (camDist - viewDist) * (1 - Math.exp(-dt * 12));
  const target = _v1.copy(wolf.pos); target.y += 1.5;
  camTarget.lerp(target, 1 - Math.exp(-dt * 16));
  const cp = Math.cos(viewPitch), sp = Math.sin(viewPitch);
  const px = camTarget.x + Math.sin(viewYaw) * cp * viewDist;
  const pz = camTarget.z + Math.cos(viewYaw) * cp * viewDist;
  const py = camTarget.y + sp * viewDist;
  const gh = heightAt(px, pz) + 0.65;
  camera.position.set(px, Math.max(py, gh), pz);
  camera.lookAt(camTarget);
  const fovT = (wolf.flyT > 0 && wolf.speed > 10) ? 80 : wolf.speed > 9 ? 70 : 62;
  camera.fov = lerp(camera.fov, fovT, Math.min(1, dt * 6));
  camera.updateProjectionMatrix();
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

function tick() {
  requestAnimationFrame(tick);
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
        const b = el('btnStart');
        if (b) { b.disabled = false; b.textContent = 'ENTER THE WILD'; }
        const bl = el('bootLine');
        if (bl) bl.textContent = 'The wilderness awaits…';
      }
    }
    updateAtmosphere(rdt);
    renderer.render(scene, camera);
    return;
  }
  const running = state === 'play';
  const dt = running || state === 'menu' ? rdt : 0;
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
  }
  updateWeather(dt);
  updateAtmosphere(dt);
  updateSense(dt);
  updateMagicGlow(dt);
  pool.update(Math.max(dt, 0.0001));
  audio.setAmbient(weather.wind + weather.storm * 0.4 + (wolf.flyT > 0 ? 1.3 : 0), weather.rain);

  if (audio.ready && dayF > 0.5 && weather.rain < 0.15 && curBiomeKey !== 'tundra' && curBiomeKey !== 'mountain') {
    chirpT -= dt;
    if (chirpT <= 0) { chirpT = 3 + Math.random() * 7; audio.chirp(0.7); }
  }

  updateCamera(rdt);
  updateHUD(rdt);
  renderer.render(scene, camera);
}
window.addEventListener('error', e => {
  const d = document.getElementById('err');
  if (d) { d.style.display = 'block'; d.textContent = '⚠ ' + (e.message || 'error'); }
});
tick();
