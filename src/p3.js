/* ================================================================
   Part 3 — the wolf & the animals
   ================================================================ */
/* ============================================================
   LANDMARKS — rare points of interest. Fully data-driven:
   each entry: { label, icon, biomes: {weight map}, resources(pusher, rng, x, z), build(rng) }
   ============================================================ */
function lmRock(w, h, d, col, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matColor(col));
  m.position.set(x, y, z); if (ry) m.rotation.y = ry;
  m.castShadow = true; return m;
}
const LANDMARKS = {
  ancientTree: {
    label: 'Elder Tree', icon: '🌳', biomes: { forest: 0.6, grove: 0.25, taiga: 0.15 },
    solid: [[0, 0, 1.7]],
    resources(pk, rng, x, z) {
      for (let i = 0; i < 3; i++) { const a = rng() * 6.28, r = 3 + rng() * 4; pk.magicShroom.push({ x: x + Math.sin(a) * r, y: heightAt(x + Math.sin(a) * r, z + Math.cos(a) * r) - 0.04, z: z + Math.cos(a) * r, ry: rng() * 6.28, s: 1.1 }); }
    },
    build(rng) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.9, 17, 7), matColor(0x5a4530));
      trunk.position.y = 8.5; trunk.castShadow = true; g.add(trunk);
      for (let i = 0; i < 6; i++) { // roots
        const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.62, 3.4, 5), matColor(0x52402c));
        const a = i / 6 * 6.28;
        rt.position.set(Math.sin(a) * 1.9, 0.9, Math.cos(a) * 1.9); rt.rotation.set(Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7);
        rt.castShadow = true; g.add(rt);
      }
      for (let i = 0; i < 5; i++) { // vast canopy
        const r = 4.2 + rng() * 2.6;
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), matColor(i % 2 ? 0x2e4d2a : 0x35592e));
        c.position.set((rng() - 0.5) * 5.5, 15.5 + rng() * 3.5, (rng() - 0.5) * 5.5);
        c.castShadow = true; g.add(c);
      }
      return g;
    }
  },
  stoneCircle: {
    label: 'Stone Circle', icon: '🪨', biomes: { meadow: 0.5, tundra: 0.3, mountain: 0.2 },
    solid: [[0.00, 7.00, 0.7], [4.50, 5.36, 0.7], [6.89, 1.22, 0.7], [6.06, -3.50, 0.7], [2.39, -6.58, 0.7], [-2.39, -6.58, 0.7], [-6.06, -3.50, 0.7], [-6.89, 1.21, 0.7], [-4.50, 5.36, 0.7], [0, 0, 1.0]],
    resources(pk, rng, x, z) {
      pk.stoneP.push({ x: x + 2, y: heightAt(x + 2, z) - 0.04, z, ry: rng() * 6.28, s: 1.1 });
      pk.bone && pk.bone.push({ x: x - 2.5, y: heightAt(x - 2.5, z + 1) - 0.04, z: z + 1, ry: 0, s: 1 });
    },
    build(rng) {
      const g = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * 6.28, R = 7;
        const hgt = 2.6 + rng() * 1.4;
        const st = lmRock(1.1 + rng() * 0.4, hgt, 0.7, 0x7e838a, Math.sin(a) * R, hgt / 2 - 0.3, Math.cos(a) * R, a + (rng() - 0.5) * 0.4);
        g.add(st);
      }
      const altar = lmRock(1.8, 0.75, 1.8, 0x8a8f96, 0, 0.25, 0, 0.3);
      g.add(altar);
      return g;
    }
  },
  cave: {
    label: 'Cave Mouth', icon: '🕳️', tier: 'common', biomes: { mountain: 0.65, taiga: 0.2, tundra: 0.15 }, enterable: true,
    solid: [[0, 0, 2.6]],
    resources(pk, rng, x, z) { for (let i = 0; i < 3; i++) pk.stoneP.push({ x: x + (rng() - 0.5) * 6, y: heightAt(x, z) - 0.04, z: z + (rng() - 0.5) * 6, ry: rng() * 6.28, s: 1 }); },
    build(rng) {
      const g = new THREE.Group();
      const mound = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 1), matColor(0x6d7076));
      mound.position.y = 0.6; mound.scale.y = 0.8; mound.castShadow = true; g.add(mound);
      const lP = lmRock(1.1, 3.2, 1.1, 0x74777d, -1.25, 1.6, 1.4, 0.1);
      const rP = lmRock(1.1, 3.2, 1.1, 0x74777d, 1.25, 1.6, 1.4, -0.1);
      const lintel = lmRock(3.8, 0.9, 1.2, 0x6a6d73, 0, 3.4, 1.4, 0);
      g.add(lP); g.add(rP); g.add(lintel);
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.15, 12), new THREE.MeshBasicMaterial({ color: 0x05070a }));
      mouth.position.set(0, 1.35, 2.02); g.add(mouth);
      return g;
    }
  },
  shrine: {
    label: 'Ruined Shrine', icon: '⛩️', biomes: { grove: 0.4, enchanted: 0.35, forest: 0.25 },
    solid: [[-2.2, 1.6, 0.4], [2.2, 1.6, 0.4], [-2.2, -1.6, 0.4], [2.2, -1.6, 0.4], [0, 0, 1.1]],
    resources(pk, rng, x, z) {
      pk.magicShroom.push({ x: x + 1.6, y: heightAt(x + 1.6, z - 1.2) - 0.04, z: z - 1.2, ry: rng() * 6.28, s: 1.2 });
      pk.herb.push({ x: x - 1.8, y: heightAt(x - 1.8, z + 1) - 0.04, z: z + 1, ry: 0, s: 1 });
    },
    build(rng) {
      const g = new THREE.Group();
      [[-2.2, 1.6], [2.2, 1.6], [-2.2, -1.6], [2.2, -1.6]].forEach(([px, pz], i) => {
        const hgt = [2.8, 1.4, 2.2, 0.9][i];
        const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, hgt, 6), matColor(0x9a948a));
        pl.position.set(px, hgt / 2, pz); pl.rotation.z = (rng() - 0.5) * 0.12; pl.castShadow = true; g.add(pl);
      });
      const altar = lmRock(2.1, 0.9, 1.2, 0x8b857b, 0, 0.45, 0, 0);
      g.add(altar);
      const ember = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffcf7a }));
      ember.position.set(0, 1.05, 0); g.add(ember);
      g.userData.ember = ember;
      return g;
    }
  },
  logBridge: {
    label: 'Fallen Log Bridge', icon: '🪵', biomes: { any: 1 }, needsWater: true,
    resources() {},
    build(rng) {
      const g = new THREE.Group();
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 15, 8), matColor(0x6a5238));
      log.rotation.z = Math.PI / 2; log.position.y = 0.55; log.castShadow = true; g.add(log);
      for (let i = 0; i < 4; i++) { // moss patches
        const moss = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), matColor(0x4a6b3a));
        moss.position.set((rng() - 0.5) * 10, 1.32, (rng() - 0.5) * 0.8); g.add(moss);
      }
      return g;
    }
  },

  /* ---- rare discoveries (tier: 'rare') & epics (tier: 'epic') ---- */
  cabin: {
    label: 'Abandoned Cabin', icon: '🏚️', tier: 'rare', biomes: { forest: 0.45, taiga: 0.35, meadow: 0.2 },
    solid: [[0, -2.2, 1.3], [0, 2.2, 1.3], [-2.9, 0, 1.1], [2.9, 0, 1.1], [-2, -2.2, 1.0], [2, -2.2, 1.0], [-2, 2.2, 1.0], [2, 2.2, 1.0]],
    resources(pk, rng, x, z) { pk.stick.push({ x: x + 2.5, y: heightAt(x + 2.5, z) - 0.04, z, ry: rng() * 6.28, s: 1.1 }); },
    build(rng) {
      const g = new THREE.Group();
      const wallMat = matColor(0x6b5236);
      const mkWall = (w, h, d, px, py, pz, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(px, py, pz); m.rotation.y = ry; m.castShadow = true; g.add(m); return m; };
      mkWall(6, 2.6, 0.3, 0, 1.3, -2.2, 0); mkWall(6, 2.6, 0.3, 0, 1.3, 2.2, 0);
      mkWall(0.3, 2.6, 4.4, -2.9, 1.3, 0, 0); mkWall(0.3, 2.6, 4.4, 2.9, 1.3, 0, 0);
      const doorway = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 0.34), matColor(0x14100c));
      doorway.position.set(-1.6, 1, -2.2); g.add(doorway);   // dark doorway — long abandoned
      const roofL = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.22, 5.2), matColor(0x4c3b28));
      roofL.position.set(-1.55, 3.35, 0); roofL.rotation.z = 0.62; roofL.castShadow = true; g.add(roofL);
      const roofR = roofL.clone(); roofR.position.x = 1.55; roofR.rotation.z = -0.62; g.add(roofR);
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), matColor(0x777c82));
      chimney.position.set(1.7, 3.6, -0.8); g.add(chimney);
      for (let i = 0; i < 3; i++) { // collapsed fence posts
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.2 + rng(), 5), matColor(0x5d4a33));
        post.position.set(4 + i * 1.4, 0.7, 3.6 + (rng() - 0.5)); post.rotation.z = (rng() - 0.5) * 0.5; g.add(post);
      }
      return g;
    }
  },
  ruins: {
    label: 'Ancient Ruins', icon: '🏛️', tier: 'rare', biomes: { grove: 0.4, meadow: 0.3, forest: 0.3 },
    solid: [[0.00, 5.50, 0.5], [4.76, 2.75, 0.5], [4.76, -2.75, 0.5], [0.00, -5.50, 0.5], [-4.76, -2.75, 0.5], [-4.76, 2.75, 0.5], [0, 0, 1.7], [2.2, 3.4, 0.5]],
    resources(pk, rng, x, z) { pk.stoneP.push({ x: x - 3, y: heightAt(x - 3, z + 2) - 0.04, z: z + 2, ry: rng() * 6.28, s: 1.2 }); },
    build(rng) {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {   // broken colonnade
        const a = i / 6 * 6.28, R = 5.5;
        const hgt = 1 + rng() * 3.4;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, hgt, 7), matColor(0x9b968b));
        col.position.set(Math.sin(a) * R, hgt / 2 - 0.2, Math.cos(a) * R);
        col.rotation.z = (rng() - 0.5) * 0.22; col.castShadow = true; g.add(col);
      }
      const slab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 2.6), matColor(0x8f8a80));
      slab.position.set(0, 0.3, 0); slab.rotation.y = 0.4; g.add(slab);
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 3.6, 7), matColor(0x948f84));
      fallen.rotation.z = Math.PI / 2 - 0.1; fallen.position.set(2.2, 0.45, 3.4); g.add(fallen);
      for (let i = 0; i < 4; i++) {  // reclaiming moss
        const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rng() * 0.4, 0), matColor(0x4d7040));
        moss.position.set((rng() - 0.5) * 8, 0.3, (rng() - 0.5) * 8); g.add(moss);
      }
      return g;
    }
  },
  waterfall: {
    label: 'Waterfall', icon: '🌊', tier: 'rare', biomes: { mountain: 0.55, highland: 0.3, taiga: 0.15 }, needsHigh: true,
    solid: [[0, -1.4, 2.7], [-3.6, 1.8, 0.75], [3.8, 2.1, 0.7]],
    resources(pk, rng, x, z) {},
    build(rng) {
      const g = new THREE.Group();
      const cliff = lmRock(7, 9, 3.4, 0x7d8087, 0, 4.2, -1.4, 0.1);
      g.add(cliff);
      const fallMat = new THREE.MeshStandardMaterial({ color: 0xbfe4f2, transparent: true, opacity: 0.7, roughness: 0.25, metalness: 0 });
      for (let i = 0; i < 3; i++) {   // cascading veils
        const f = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + i * 0.5, 8.6), fallMat);
        f.position.set((i - 1) * 1.1, 4.6, 0.35 + i * 0.12);
        g.add(f);
      }
      const pool = new THREE.Mesh(new THREE.CircleGeometry(4.6, 18), new THREE.MeshStandardMaterial({ color: 0x5590b8, transparent: true, opacity: 0.85, roughness: 0.2 }));
      pool.rotation.x = -Math.PI / 2; pool.position.y = 0.12; g.add(pool);
      const rim1 = lmRock(1.2, 0.9, 1.1, 0x82858c, -3.6, 0.4, 1.8, 0.4);
      const rim2 = lmRock(1.1, 0.8, 1.2, 0x82858c, 3.8, 0.35, 2.1, 1.1);
      g.add(rim1); g.add(rim2);
      g.userData.mist = { x: 0, z: 1.6 };   // spray particles tick below
      return g;
    }
  },
  frozenLake: {
    label: 'Frozen Lake', icon: '🧊', tier: 'rare', biomes: { tundra: 0.6, taiga: 0.25, mountain: 0.15 }, needsWater: true,
    resources(pk, rng, x, z) {},
    build(rng) {
      const g = new THREE.Group();
      const ice = new THREE.Mesh(new THREE.CircleGeometry(7.5, 22), new THREE.MeshStandardMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.92, roughness: 0.15, metalness: 0.05 }));
      ice.rotation.x = -Math.PI / 2; ice.position.y = WATER_Y + 0.12; g.add(ice);
      for (let i = 0; i < 5; i++) {   // pressure cracks
        const crack = new THREE.Mesh(new THREE.BoxGeometry(2 + rng() * 4, 0.02, 0.08 + rng() * 0.08), matColor(0x9fc4d8));
        const a = rng() * 6.28, r = rng() * 5;
        crack.position.set(Math.sin(a) * r, WATER_Y + 0.14, Math.cos(a) * r); crack.rotation.y = rng() * 6.28; g.add(crack);
      }
      for (let i = 0; i < 4; i++) {   // banked snow
        const snow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + rng() * 0.9, 0), matColor(0xe8eff4));
        const a = i / 4 * 6.28 + rng();
        snow.position.set(Math.sin(a) * 7.2, 0.4, Math.cos(a) * 7.2); g.add(snow);
      }
      return g;
    }
  },
  wolfShrine: {
    label: 'Wolf Shrine', icon: '🐺', tier: 'rare', biomes: { forest: 0.4, taiga: 0.35, grove: 0.25 },
    solid: [[0, 0, 1.15]],
    resources(pk, rng, x, z) { pk.magicShroom.push({ x: x + 2.2, y: heightAt(x + 2.2, z) - 0.04, z, ry: rng() * 6.28, s: 1 }); },
    build(rng) {
      const g = new THREE.Group();
      const cairn = lmRock(2.2, 1.1, 1.6, 0x84888e, 0, 0.5, 0, 0.2);
      g.add(cairn);
      const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), matColor(0xe8e2d4));   // offering stone
      skull.position.set(0, 1.2, 0.3); g.add(skull);
      for (let i = 0; i < 2; i++) {   // antler totems
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.7, 5), matColor(0xd8cfc0));
        ant.position.set(-0.9 + i * 1.8, 1.5, -0.4); ant.rotation.z = (i ? -1 : 1) * 0.45; g.add(ant);
        for (let k = 0; k < 3; k++) {
          const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 4), matColor(0xd8cfc0));
          tine.position.set(-0.9 + i * 1.8 + (i ? 0.28 : -0.28), 1.5 + 0.35 + k * 0.4, -0.4);
          tine.rotation.z = (i ? -0.9 : 0.9); g.add(tine);
        }
      }
      const ember = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshBasicMaterial({ color: 0x8fd8ff }));
      ember.position.set(0, 1.62, 0.3); g.add(ember);
      g.userData.ember = ember;      // pale blue watchfire
      return g;
    }
  },
  deposit: {
    label: 'Rare Deposit', icon: '💎', tier: 'rare', biomes: { mountain: 0.5, highland: 0.3, volcanic: 0.2 },
    solid: [[0, 0, 1.35]],
    resources(pk, rng, x, z) { for (let i = 0; i < 4; i++) pk.stoneP.push({ x: x + (rng() - 0.5) * 5, y: heightAt(x, z) - 0.04, z: z + (rng() - 0.5) * 5, ry: rng() * 6.28, s: 1.2 }); },
    build(rng) {
      const g = new THREE.Group();
      const base = lmRock(2.6, 1.2, 2.2, 0x6f7278, 0, 0.5, 0, 0.3);
      g.add(base);
      const gemMat = new THREE.MeshStandardMaterial({ color: 0x7fe8ff, emissive: 0x2a7f96, emissiveIntensity: 0.55, roughness: 0.3 });
      for (let i = 0; i < 6; i++) {
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 + rng() * 0.4), gemMat);
        const a = rng() * 6.28, r = rng() * 1.4;
        gem.position.set(Math.sin(a) * r, 1 + rng() * 0.5, Math.cos(a) * r);
        gem.rotation.set(rng() * 3, rng() * 3, rng() * 3); g.add(gem);
      }
      return g;
    }
  },
  shroomForest: {
    label: 'Mushroom Forest', icon: '🍄', tier: 'epic', biomes: { enchanted: 0.5, forest: 0.3, grove: 0.2 },
    resources(pk, rng, x, z) { for (let i = 0; i < 2; i++) pk.magicShroom.push({ x: x + (rng() - 0.5) * 7, y: heightAt(x, z) - 0.04, z: z + (rng() - 0.5) * 7, ry: rng() * 6.28, s: 1.2 }); },
    build(rng) {
      const g = new THREE.Group();
      const capMat = new THREE.MeshStandardMaterial({ color: 0x9a5ee0, emissive: 0x5a2a8a, emissiveIntensity: 0.4, roughness: 0.6 });
      const stemMat = matColor(0xe8ddf5);
      const stems = []; g.userData.solid = stems;
      for (let i = 0; i < 7; i++) {   // towering caps, 2-5 m tall
        const a = i / 7 * 6.28 + rng() * 0.5, r = 2.5 + rng() * 5.5;
        const hgt = 2 + rng() * 3, capR = 0.8 + rng() * 1.1;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, hgt, 6), stemMat);
        stem.position.set(Math.sin(a) * r, hgt / 2, Math.cos(a) * r); stem.castShadow = true; g.add(stem);
        stems.push([Math.sin(a) * r, Math.cos(a) * r, 0.45]);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(capR, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
        cap.position.set(Math.sin(a) * r, hgt, Math.cos(a) * r); cap.castShadow = true; g.add(cap);
        for (let k = 0; k < 3; k++) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), new THREE.MeshBasicMaterial({ color: 0x7ef0ff }));
          dot.position.set(Math.sin(a) * r + (rng() - 0.5) * capR * 1.3, hgt + 0.1 + rng() * 0.25, Math.cos(a) * r + (rng() - 0.5) * capR * 1.3);
          g.add(dot);
        }
      }
      return g;
    }
  },
  hiddenValley: {
    label: 'Hidden Valley', icon: '🌼', tier: 'epic', biomes: { meadow: 0.5, forest: 0.3, grove: 0.2 },
    resources(pk, rng, x, z) { pk.herb.push({ x: x + 1.5, y: heightAt(x + 1.5, z) - 0.04, z, ry: 0, s: 1.2 }); pk.berryBush.push({ x: x - 2, y: heightAt(x - 2, z) - 0.04, z, ry: rng() * 6.28, s: 1.2 }); },
    build(rng) {
      const g = new THREE.Group();
      // a secret ring of birches around a flower heart
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * 6.28, r = 8 + rng() * 1.5;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 5 + rng() * 3, 5), matColor(0xe6eaea));
        trunk.position.set(Math.sin(a) * r, 3.5, Math.cos(a) * r); trunk.castShadow = true; g.add(trunk);
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 + rng() * 0.7), matColor(0x8fb757));
        crown.position.set(Math.sin(a) * r, 6.5 + rng(), Math.cos(a) * r); g.add(crown);
      }
      for (let i = 0; i < 16; i++) {  // flower carpet
        const a = rng() * 6.28, r = rng() * 6;
        const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + rng() * 0.08, 0), matColor([0xf2a7c3, 0xf7e07a, 0xffffff, 0xb28ff2][(rng() * 4) | 0]));
        fl.position.set(Math.sin(a) * r, 0.35, Math.cos(a) * r); g.add(fl);
      }
      const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: 0xf5d7fa, emissive: 0x8a5ad0, emissiveIntensity: 0.3 }));
      heart.position.y = 0.8; g.add(heart);
      g.userData.ember = heart;
      return g;
    }
  }
};
let landmarkList = [];   // { type, x, z, model, chunkKey } — for minimap & compass

function furMat(hex) {
  return new THREE.MeshStandardMaterial({
    color: hex, map: furTex, bumpMap: furTex, bumpScale: 0.012, roughness: 0.95, metalness: 0
  });
}
function buildWolf() {
  const g = new THREE.Group();
  // high-contrast grey wolf coat
  const mMid   = furMat(0x9aa2ac);
  const mDark  = furMat(0x565d66);
  const mLight = furMat(0xe2e6ea);
  const mBlack = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.5, metalness: 0 });
  const mEye   = new THREE.MeshStandardMaterial({ color: 0xffb62e, roughness: 0.25, metalness: 0, emissive: 0x53350a, emissiveIntensity: 1 });
  const mFang  = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.35, metalness: 0 });

  const SPH = new THREE.SphereGeometry(1, 14, 10);
  const blob = (mat, sx, sy, sz, x, y, z, parent, rz, rx) => {
    const m = new THREE.Mesh(SPH, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    if (rz) m.rotation.z = rz;
    if (rx) m.rotation.x = rx;
    (parent || g).add(m);
    return m;
  };

  // ---- torso: powerful chest, lean hindquarters, dark saddle up the shoulders
  blob(mMid, 0.34, 0.33, 0.74, 0, 0.88, 0.0);
  blob(mMid, 0.36, 0.36, 0.46, 0, 0.88, 0.54);
  blob(mMid, 0.28, 0.27, 0.38, 0, 0.92, -0.52);
  blob(mDark, 0.31, 0.23, 0.72, 0, 1.06, -0.03);
  blob(mDark, 0.27, 0.21, 0.40, 0, 1.05, 0.40);
  blob(mLight, 0.27, 0.20, 0.60, 0, 0.70, 0.05);

  // ---- raised hackles along the spine — reads as aggression
  const spikeG = new THREE.ConeGeometry(0.075, 0.26, 5);
  [[0, 1.20, 0.34], [0, 1.22, 0.14], [0, 1.21, -0.06], [0, 1.19, -0.26]].forEach(p => {
    const h = new THREE.Mesh(spikeG, mDark);
    h.position.set(p[0], p[1], p[2]);
    h.rotation.x = -0.55;
    g.add(h);
  });

  // ---- thick neck with a dark ruff
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.225, 0.52, 10), mMid);
  neck.position.set(0, 1.1, 0.76);
  neck.rotation.x = 0.85;
  g.add(neck);
  blob(mDark, 0.235, 0.2, 0.24, 0, 1.14, 0.66);

  // ---- head: broad angular skull, heavy brow
  const head = new THREE.Group();
  head.position.set(0, 1.33, 1.04);
  g.add(head);
  blob(mMid, 0.20, 0.185, 0.21, 0, 0, 0, head);              // skull
  blob(mDark, 0.185, 0.12, 0.17, 0, 0.10, -0.03, head);      // dark crown
  blob(mMid, 0.075, 0.09, 0.10, 0.165, -0.02, 0.13, head);   // cheek ruffs
  blob(mMid, 0.075, 0.09, 0.10, -0.165, -0.02, 0.13, head);
  blob(mLight, 0.06, 0.07, 0.085, 0.155, -0.05, 0.18, head);
  blob(mLight, 0.06, 0.07, 0.085, -0.155, -0.05, 0.18, head);

  // scowling brows — slanted down toward the nose
  blob(mDark, 0.085, 0.032, 0.06, 0.108, 0.088, 0.10, head, -0.5);
  blob(mDark, 0.085, 0.032, 0.06, -0.108, 0.088, 0.10, head, 0.5);

  // ---- muzzle: broad base, sharp taper, black nose
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.36, 9), mLight);
  muzzle.rotation.x = Math.PI / 2 - 0.06;
  muzzle.position.set(0, -0.05, 0.27);
  head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mBlack);
  nose.position.set(0, -0.03, 0.45);
  head.add(nose);

  // ---- snarl: dark mouth line + bared fangs
  blob(mBlack, 0.078, 0.028, 0.075, 0, -0.118, 0.30, head);
  const fangG = new THREE.ConeGeometry(0.016, 0.062, 4);
  [[0.048, -0.098, 0.345], [-0.048, -0.098, 0.345], [0.082, -0.085, 0.27], [-0.082, -0.085, 0.27]].forEach(p => {
    const f = new THREE.Mesh(fangG, mFang);
    f.position.set(p[0], p[1], p[2]);
    f.rotation.x = Math.PI;
    head.add(f);
  });

  // ---- amber predator eyes with black pupils + dark eyeliner
  const pupilG = new THREE.SphereGeometry(0.015, 6, 5);
  [[1], [-1]].forEach(([side]) => {
    blob(mEye, 0.034, 0.03, 0.03, side * 0.108, 0.032, 0.155, head);
    const pu = new THREE.Mesh(pupilG, mBlack);
    pu.position.set(side * 0.108, 0.032, 0.182);
    head.add(pu);
    blob(mDark, 0.055, 0.018, 0.028, side * 0.108, 0.066, 0.148, head, -side * 0.45);
  });

  // ---- tall pointed ears, pressed forward
  const earGeo = new THREE.ConeGeometry(0.082, 0.3, 5);
  const earInGeo = new THREE.ConeGeometry(0.052, 0.2, 5);
  [[1], [-1]].forEach(([side]) => {
    const e = new THREE.Mesh(earGeo, mDark);
    e.position.set(side * 0.125, 0.29, -0.045);
    e.rotation.z = -side * 0.22;
    e.rotation.x = -0.18;
    head.add(e);
    const ei = new THREE.Mesh(earInGeo, mMid);
    ei.position.set(side * 0.122, 0.26, -0.012);
    ei.rotation.z = -side * 0.22;
    ei.rotation.x = -0.1;
    head.add(ei);
  });

  // ---- tail: bushy, carried low and straight, dark tip
  const tail = new THREE.Group();
  tail.position.set(0, 1.04, -0.8);
  g.add(tail);
  const tailM = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.1, 0.6, 9), mMid);
  tailM.position.set(0, 0.1, -0.26);
  tailM.rotation.x = -0.75;
  tail.add(tailM);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 6), mDark);
  tailTip.position.set(0, 0.31, -0.46);
  tail.add(tailTip);
  tail.rotation.x = 0.3;

  // ---- legs: two segments with joints; muscular thighs behind
  const legs = [], lowers = [];
  const mkLeg = (x, z, thigh) => {
    const up = new THREE.Group();
    up.position.set(x, 0.74, z);
    if (thigh) blob(mMid, 0.085, 0.14, 0.13, 0, 0.08, 0.02, up);
    const upM = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.36, 8), mMid);
    upM.position.y = -0.18;
    up.add(upM);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.083, 8, 6), mMid);
    joint.position.y = 0.02;
    up.add(joint);
    const low = new THREE.Group();
    low.position.y = -0.36;
    up.add(low);
    const lowM = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.36, 8), mMid);
    lowM.position.y = -0.18;
    low.add(lowM);
    const paw = new THREE.Mesh(SPH, mLight);
    paw.scale.set(0.06, 0.05, 0.088);
    paw.position.set(0, -0.37, 0.03);
    low.add(paw);
    g.add(up);
    legs.push(up);
    lowers.push(low);
  };
  mkLeg(0.19, 0.48, false); mkLeg(-0.19, 0.48, false);
  mkLeg(0.2, -0.44, true); mkLeg(-0.2, -0.44, true);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, legs, lowers, head, tail };
}

function bloodBurst(pos, n = 14, big = 1) {   // a registered hit's blood squirt — red, brief, unmistakable
  pool.burst(pos, n, 0xc21018, 0.5 * big, 2.6 * big, 3.2 * big);
  pool.burst(pos, Math.round(n * 0.45), 0x8c0d12, 0.3 * big, 1.7 * big, 2.1 * big);
}

class Wolf {
  constructor() {
    const m = buildWolf();
    this.model = m.group;
    this.legs = m.legs; this.lowers = m.lowers; this.head = m.head; this.tail = m.tail;
    scene.add(this.model);
    this.resetRunState();
    this.findSpawn();
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
  }
  /* reset the per-run body to a brand-new wolf (level 0 'Young Pup', full hp/stamina,
     no perks) — used at boot AND by the in-place "New Game" re-seed. */
  resetRunState() {
    this.pos = V3(0, 20, 0);
    this.vy = 0;
    this.yaw = 0;
    this.speed = 0;
    this.phase = 0;
    this.grounded = false;
    this.swimming = false;
    this.stamina = 100;
    this.exhausted = false;
    this.distance = 0;
    this.howlCd = 0;
    this.senseCd = 0;
    this.atkCd = 0;
    this.atkT = 0;
    this.flyT = 0;
    this.hp = 100; this.maxHp = 100; this.hpBonus = 0;   // hpBonus = permanent perk bonus, recalc-safe
    this.xp = 0; this.xpTotal = 0; this.level = 0; this.xpNext = 70; this.perks = {}; this.title = 'Young Pup';   // levels begin at ZERO — the wild owes no head start; xpTotal = career XP, never erased
    this.maxStam = 100;   // the sprint pool — it grows with every level earned
    this.lastHurt = -99;
    this.invulnT = 0;
    this.deadT = 0;
    this.impactCd = 0;   // solid-collision injury cooldown
    this.crouch = false;  // prowling: low, quiet, unseen
    this.killerPos = null;
    this.diedAt = null;    // where the wolf fell — respawn lands NEAR it
    this.fellTo = null;    // the killer's spot — respawn faces away from it
    this.flyDirY = 0;
    this.trailAcc = 0;
    this.stepAcc = 0;
    delete this._wkx; delete this._wkz; delete this._wkt; delete this._wkcd;
    delete this.sprintLock; delete this.stepDist; delete this.drownToastT;
    if (this.model) this.model.scale.set(1, 1, 1);
  }
  /* find a gentle spawn in the CURRENT world: not underwater, not high mountains.
     Reads heightAt/climateAt/biomeWeights live, so after an in-place re-seed it lands
     the wolf in the brand-new terrain without a page reload. */
  findSpawn() {
    let sx = 0, sz = 0, bestScore = -1;
    for (let i = 0; i < 40; i++) {
      const a = i * 2.399963, r = 40 + i * 14;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      const h = heightAt(x, z);
      if (h < 2 || h > 24) continue;
      const cl = climateAt(x, z, h);
      const w = biomeWeights(x, z, h, cl.temp, cl.moist);
      const score = w.taiga + w.forest * 0.9 + w.meadow * 0.6 - Math.abs(h - 9) * 0.05;
      if (score > bestScore) { bestScore = score; sx = x; sz = z; }
    }
    this.pos.x = sx; this.pos.z = sz;
    this.pos.y = Math.max(heightAt(sx, sz), WATER_Y) + 0.1;
    return { x: sx, z: sz };
  }
  update(dt, input, camYaw, camPitch) {
    if (this.deadT > 0) {          // slain — respawn handled by updateHUD
      this.animate(dt, false);
      return;
    }
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.impactCd > 0) this.impactCd -= dt;
    const mvF = clamp((input.f ? 1 : 0) - (input.b ? 1 : 0) + input.my, -1, 1);
    const mvS = clamp((input.r ? 1 : 0) - (input.l ? 1 : 0) + input.mx, -1, 1);
    const mag = Math.hypot(mvF, mvS);
    const moving = mag > 0.12 && !input.paused;
    if (this.sprintLock && this.exhausted && this.stamina > 1) this.exhausted = false;   // a locked sprint is reborn at the first breath of stamina
    let sprint = input.sprint && moving && !this.exhausted && this.stamina > 0 && !this.swimming;
    if (sprint) {
      /* Spring Steps (the Ancient Stag's / Eagle Legend's gift) — sprint stamina
         drains 25 % slower. SPEEDRUN FIX v6.8: the gift was granted and described
         in the toast but wired to NOTHING, so the stamina economy a Legend fight
         needs never arrived. */
      this.stamina -= 15 * dt * (this.perks.springSteps ? 0.75 : 1);
      if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; sprint = false; }
    } else if (!this.swimming) {
      // no regen while swimming — the swim block drains it instead
      this.stamina = Math.min(this.maxStam, this.stamina + 11 * dt * (this.perks.sandStride ? 1.25 : 1));
      if (this.exhausted && this.stamina > 26) this.exhausted = false;
    }
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.atkT > 0) this.atkT = Math.max(0, this.atkT - dt);

    // ---- magic flight ----
    if (this.flyT > 0) {
      this.flyT -= dt;
      this.stamina = Math.min(this.maxStam, this.stamina + 22 * dt);
      if (this.exhausted && this.stamina > 26) this.exhausted = false;
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
      const rx = Math.sin(camYaw - Math.PI / 2), rz = Math.cos(camYaw - Math.PI / 2);
      let dirX = 0, dirY = 0, dirZ = 0;
      if (moving) {
        dirX = (fx * mvF + rx * mvS) / mag;
        dirZ = (fz * mvF + rz * mvS) / mag;
        dirY = -Math.sin(camPitch) * mvF;   // look down + forward = dive
        this.yaw = angLerp(this.yaw, Math.atan2(dirX, dirZ), Math.min(1, dt * 8));
      }
      if (input.jump) dirY += 0.9;          // hold jump to climb
      const l3 = Math.hypot(dirX, dirY, dirZ);
      if (l3 > 1) { dirX /= l3; dirY /= l3; dirZ /= l3; }
      const target = (moving || input.jump) ? (input.sprint ? 24 : 18) : 0;
      this.speed += clamp(target - this.speed, -40 * dt, 30 * dt);
      this.flyDirY = dirY;
      this.pos.x += dirX * this.speed * dt;
      this.pos.y += dirY * this.speed * dt;
      this.pos.z += dirZ * this.speed * dt;
      this.pos.y = clamp(this.pos.y, Math.max(groundAt(this.pos.x, this.pos.z), groundWaterY()) + 0.7, 130);
      this.distance += this.speed * dt;
      this.grounded = false;
      this.swimming = false;
      this.vy = 0;
      this.trailAcc += dt;
      if (this.trailAcc > 0.07) {
        this.trailAcc = 0;
        pool.burst(this.pos, 2, 0xb07aff, 0.6, 0.3, 0.8);
      }
      if (this.flyT <= 0) toast('✨ The magic fades — back to earth');
      this.animate(dt, sprint);
      return;
    }
    let dirX = 0, dirZ = 0;
    if (moving) {
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
      const rx = Math.sin(camYaw - Math.PI / 2), rz = Math.cos(camYaw - Math.PI / 2);
      dirX = (fx * mvF + rx * mvS) / mag; dirZ = (fz * mvF + rz * mvS) / mag;
      this.yaw = angLerp(this.yaw, Math.atan2(dirX, dirZ), Math.min(1, dt * 9));
    }

    let target = 0;
    if (moving) {
      /* Thunder Charge (the Thunder Bison's / Lion Legend's gift) — sprint 12 %
         faster. SPEEDRUN FIX v6.8: was a dead perk (name + description only); it is
         the difference between 3.1 and 3.4 rad/s of orbit on a Legend's flank, i.e.
         between "keeps the blind side" and "loses it to the turn rate". */
      target = this.swimming ? 4.2 : (sprint ? 13.5 * (this.perks.thunderCharge ? 1.12 : 1) : 7);
      target *= clamp(0.55 + 0.45 * Math.min(1, mag), 0.55, 1); // joystick deflection scales speed
    }
    if (moving && this.grounded) {
      const ah = groundAt(this.pos.x + dirX * 2, this.pos.z + dirZ * 2);
      const grade = Math.max(0, (ah - this.pos.y) / 2);
      target *= clamp(1 / (1 + grade * 0.9), 0.4, 1);
    }
    if (this.crouch && !this.swimming) target *= 0.42;
    this.speed += clamp(target - this.speed, -46 * dt, 34 * dt);
    if (!moving && this.speed < 0.4) this.speed = 0;

    this.pos.x += dirX * this.speed * dt;
    this.pos.z += dirZ * this.speed * dt;
    this.distance += this.speed * dt;
    if (this.speed > 0.5) collideSolids(this, dirX, dirZ);   // big trunks & boulders are solid
    // wedge escape: pressing on but going nowhere — the wild lends a shoulder
    if (moving && this.grounded && this.flyT <= 0) {
      if (this._wkx === undefined) { this._wkx = this.pos.x; this._wkz = this.pos.z; this._wkt = 0; }
      this._wkt += dt;
      this._wkcd = Math.max(0, (this._wkcd || 0) - dt);
      if (this._wkt >= 1.15) {
        if (Math.hypot(this.pos.x - this._wkx, this.pos.z - this._wkz) < 0.55 && this._wkcd <= 0) {
          this._wkcd = 2.5;
          let nx = -Math.sin(this.yaw), nz = -Math.cos(this.yaw), bd = 99;
          for (const [, ch] of chunks) for (const sol of (ch.solids || [])) {
            const ddx = this.pos.x - sol.x, ddz = this.pos.z - sol.z, dd = Math.hypot(ddx, ddz);
            if (dd < 3.4 && dd < bd) { bd = dd; const l = dd || 1; nx = ddx / l; nz = ddz / l; }
          }
          this.pos.x += nx * 0.55; this.pos.z += nz * 0.55;
          this.vy = Math.max(this.vy, 3.2); this.grounded = false;
          this.yaw += 0.7 * (Math.random() < 0.5 ? 1 : -1);   // turn aside and try again
        }
        this._wkx = this.pos.x; this._wkz = this.pos.z; this._wkt = 0;
      }
    } else this._wkt = 0;

    const ground = groundAt(this.pos.x, this.pos.z);
    const wy = groundWaterY();
    this.swimming = wy > -500 && ground < wy - 0.85 && this.pos.y <= wy + 0.1;
    if (input.jump && this.grounded && !this.swimming) {
      this.vy = 8.8; this.grounded = false;
      pool.burst(this.pos, 8, 0xcfc4a8, 1.2, 1.4, 2.2);
    }
    if (this.swimming) {
      this.pos.y += (waterYNow() - 0.42 - this.pos.y) * Math.min(1, dt * 6);
      this.vy = 0; this.grounded = false;
      if (this.speed > 1 && Math.random() < dt * 6) pool.burst(this.pos, 3, 0x9fc3e0, 1.0, 2.2, 1.6);
      // continuous stamina drain; exhaustion in deep water eats health
      this.stamina -= 8 * dt;
      if (this.stamina <= 0) {
        this.stamina = 0; this.exhausted = true;
        this.hp = Math.max(0, this.hp - 3 * dt);
        this.lastHurt = Math.max(this.lastHurt, tSec - 5.9);   // keep regen offline
        setVignette(0.35);
        this.drownToastT = (this.drownToastT || 0) - dt;
        if (this.drownToastT <= 0) { this.drownToastT = 6; toast('⚠️ Exhausted in deep water — swim to shore!'); }
        if (this.hp <= 0 && this.deadT <= 0) wolfDie('the deep water', '🌊');
      }
      // climb-out assist: paddling toward a low bank pops the wolf onto land
      const ax = this.pos.x + Math.sin(this.yaw) * 1.7, az = this.pos.z + Math.cos(this.yaw) * 1.7;
      const ah = groundAt(ax, az);
      if ((moving || input.jump) && ah > waterYNow() - 0.35 && ah < waterYNow() + 1.8) {
        this.swimming = false; this.vy = 6.4; this.grounded = false;
        this.pos.y = Math.max(this.pos.y, waterYNow() - 0.1);
      }
    } else {
      this.vy -= 26 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= ground) {
        if (!this.grounded && this.vy < -9) pool.burst(this.pos, 10, 0xbfb49a, 1.4, 1.2, 2.6);
        this.pos.y = ground; this.vy = 0; this.grounded = true;
      } else if (this.pos.y > ground + 0.05) {
        this.grounded = false;
      }
    }

    this.howlCd = Math.max(0, this.howlCd - dt);
    this.senseCd = Math.max(0, this.senseCd - dt);

    if (sprint && this.grounded) {
      this.stepAcc += dt;
      if (this.stepAcc > 0.12) {
        this.stepAcc = 0;
        pool.burst(this.pos, 2, 0xb9ae94, 0.8, 1.0, 1.4);
      }
    }
    // footsteps: cadence follows gait, timbre follows the ground
    if (this.grounded && this.speed > 0.6) {
      this.stepDist = (this.stepDist || 0) + this.speed * dt;
      if (this.stepDist > (sprint ? 1.9 : 1.25)) {
        this.stepDist = 0;
        audio.step(groundStepType(this.pos.x, this.pos.z));
      }
    }
    this.animate(dt, sprint);
    const ty = this.crouch ? 0.85 : 1;
    if (Math.abs(this.model.scale.y - ty) > 0.01) this.model.scale.y += (ty - this.model.scale.y) * Math.min(1, dt * 7);
  }
  animate(dt, sprint) {
    const m = this.model;
    m.position.copy(this.pos);
    m.rotation.y = this.yaw;
    m.rotation.x = 0;
    const spd = this.speed;
    if (this.flyT > 0) {
      this.phase += dt * (3 + spd * 0.8);
      this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(this.phase * 2.2 + i * 1.7) * 0.45; });
      this.lowers.forEach((low, i) => { low.rotation.x = 0.3 + Math.sin(this.phase * 2.2 + i) * 0.3; });
      this.head.rotation.x = 0.05;
      this.tail.rotation.x = -0.3;
      this.tail.rotation.y = Math.sin(performance.now() / 1000 * 4) * 0.15;
      m.rotation.x = clamp(this.flyDirY, -0.6, 0.6) * -0.7;
      return;
    }
    // claw & bite strike — the paw swings first, the muzzle snaps after (own the frame)
    if (this.atkT > 0) {
      const ph = 1 - this.atkT / 0.38;                 // 0 → 1 through the strike
      if (ph < 0.45) {                                 // PHASE 1 — the right claw swings toward the foe
        const s = ph / 0.45;
        const lift = Math.sin(Math.min(1, s * 2) * Math.PI / 2);   // quick raise…
        const strike = Math.max(0, (s - 0.5) * 2);                 // …then swing down
        this.legs[0].rotation.x = -1.25 * lift + 1.6 * strike * strike;
        this.lowers[0].rotation.x = 0.7 * lift - 1.2 * strike;
        this.head.rotation.x = 0.1 + 0.12 * s;
      } else {                                         // PHASE 2 — the bite follows
        const b = (ph - 0.45) / 0.55;
        const snap = Math.sin(b * Math.PI);
        this.head.rotation.x = 0.1 + 0.6 * snap;       // muzzle snaps down and back
        this.head.rotation.z = 0;
        m.position.x += Math.sin(this.yaw) * snap * 0.3;
        m.position.z += Math.cos(this.yaw) * snap * 0.3;
        m.position.y += snap * 0.1;
        this.legs[0].rotation.x = lerp(this.legs[0].rotation.x, 0.3, dt * 12);
        this.lowers[0].rotation.x = lerp(this.lowers[0].rotation.x, 0, dt * 12);
      }
      this.tail.rotation.x = 0.25;                     // the tail flicks with the lunge
      return;                                          // the strike owns the frame
    }
    this.phase += dt * (2.0 + spd * 1.35);
    const t = performance.now() / 1000;
    const amp = clamp(spd * 0.09, 0, 0.78);
    if (this.swimming) {
      this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(this.phase * 1.6 + i * 1.6) * 0.5; });
      this.lowers.forEach((low, i) => { low.rotation.x = 0.25 + Math.sin(this.phase * 1.6 + i * 1.6 + 1.2) * 0.35; });
      m.position.y += Math.sin(t * 3) * 0.05;
      this.head.rotation.x = 0.18;
      this.tail.rotation.x = 0.15; this.tail.rotation.y = Math.sin(t * 2) * 0.4;
    } else if (!this.grounded) {
      this.legs[0].rotation.x = lerp(this.legs[0].rotation.x, -0.55, dt * 8);
      this.legs[1].rotation.x = lerp(this.legs[1].rotation.x, -0.55, dt * 8);
      this.legs[2].rotation.x = lerp(this.legs[2].rotation.x, 0.6, dt * 8);
      this.legs[3].rotation.x = lerp(this.legs[3].rotation.x, 0.6, dt * 8);
      this.lowers.forEach(low => { low.rotation.x = lerp(low.rotation.x, -0.45, dt * 8); });
      this.head.rotation.x = -0.08;
      this.tail.rotation.x = 0.1; this.tail.rotation.y = Math.sin(t * 6) * 0.2;
    } else if (spd > 0.4) {
      const p = this.phase * (sprint ? 1.25 : 1);
      this.legs[0].rotation.x = Math.sin(p) * amp;
      this.legs[1].rotation.x = Math.sin(p + 0.35) * amp;
      this.legs[2].rotation.x = Math.sin(p + Math.PI) * amp * 0.92;
      this.legs[3].rotation.x = Math.sin(p + Math.PI + 0.35) * amp * 0.92;
      this.lowers[0].rotation.x = Math.max(0, -Math.sin(p)) * amp * 0.85;
      this.lowers[1].rotation.x = Math.max(0, -Math.sin(p + 0.35)) * amp * 0.85;
      this.lowers[2].rotation.x = Math.max(0, Math.sin(p)) * amp * 0.8;
      this.lowers[3].rotation.x = Math.max(0, Math.sin(p + 0.35)) * amp * 0.8;
      m.position.y += Math.abs(Math.sin(p)) * clamp(spd * 0.008, 0, 0.09);
      this.head.rotation.x = 0.17 + Math.sin(t * 2.6) * 0.03;
      this.tail.rotation.x = 0.5 - clamp(spd * 0.02, 0, 0.3);
      this.tail.rotation.y = Math.sin(t * 5) * 0.3;
    } else {
      this.legs.forEach(leg => { leg.rotation.x = lerp(leg.rotation.x, 0, dt * 6); });
      this.lowers.forEach(low => { low.rotation.x = lerp(low.rotation.x, 0, dt * 6); });
      this.tail.rotation.x = 0.42;
      this.tail.rotation.y = Math.sin(t * 1.4) * 0.3;
      m.position.y += Math.sin(t * 1.8) * 0.012;
      this.head.rotation.z = Math.sin(t * 0.6) * 0.06;
      this.head.rotation.x = 0.16 + Math.sin(t * 0.7) * 0.05;
    }
    if (spd > 0.4) this.head.rotation.z = Math.sin(t * 2.2) * 0.03;
    // howling: muzzle to the sky
    if (this.howlCd > 2.6) {
      this.head.rotation.x = -0.62;
      this.head.rotation.z = 0;
      this.tail.rotation.x = -0.15;
    }
  }
  attack() {
    if (this.atkCd > 0) return false;
    this.atkCd = 0.75;
    this.atkT = 0.38;
    audio.snap();
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let best = null, bestD = 99;
    const fightable = rivals.filter(r => !(r.pack && r.pack.stance === 'bonded'));   // never bite your own pack
    /* BUG B8 companion (speedrun rig, 2026-09-02): a Legend is a campaign actor that can
       outlive the chunk it was born in (see disposeChunk), and it hunts across chunk
       borders while its home chunk unloads behind it — so Legends are scanned from the
       global list too. Without this the wolf could stand on top of a Legend and every
       bite would silently find nothing: an unbeatable campaign. */
    const legends = typeof bosses !== 'undefined' ? bosses : [];
    const offer = a => {
      if (!a || a.dead) return;
      const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.6 + a.sp.scale * 0.7 || Math.abs(a.pos.y - this.pos.y) > 3.5) return;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < 0.2) return;       // ~78° bite cone in front
      if (d < bestD) { bestD = d; best = a; }
    };
    for (const ch of chunks.values()) {
      for (const a of ch.animals) offer(a);
      for (const a of ch.predators) offer(a);
      for (const a of fightable) offer(a);
    }
    for (const a of legends) offer(a);
    pool.burst(V3(this.pos.x + fx * 1.5, this.pos.y + 0.9, this.pos.z + fz * 1.5), 0, 0xfff2c8, 0.9, 1.6, 3.2);   // (dust removed — the strike shows in the body now)
    if (best) {
      // where does the bite land? behind · flank · face
      const tfx = Math.sin(best.heading || 0), tfz = Math.cos(best.heading || 0);
      const twx = (this.pos.x - best.pos.x), twz = (this.pos.z - best.pos.z);
      const twl = Math.hypot(twx, twz) || 1;
      const facing = (tfx * twx + tfz * twz) / twl;   // 1 = it stares at you, -1 = you're behind it
      const behind = facing < -0.35, front = facing > 0.45;
      let dmg = (behind ? 3 : front ? 1 : 2) + (this.perks.strongJaw ? 1 : 0);
      const unaware = best.aware === undefined || best.aware < 0.25;
      const ambush = behind && unaware;
      if (ambush) dmg += 1;
      if (this.crouch && behind) dmg += 1;            // a prowling strike from the blind side
      best.hit(dmg, behind, ambush);
      bloodBurst(best.pos, 14 + dmg * 6, 1);          // a real hit means blood
      audio.boneCrunch();
      if (typeof music !== 'undefined') music.hitStab();
      if (ambush) { toast('🩸 AMBUSH! A killing bite from the blind side'); audio.thud(); }
      else if (behind) toast('🔪 Bite from behind — it never saw you');
    }
    return true;
  }
  howl() {
    if (this.howlCd > 0) return false;
    this.howlCd = 5;
    audio.howl();
    toast('🐺 You howl into the wind…');
    for (const ch of chunks.values()) {
      for (const a of ch.animals) {
        const d = a.pos.distanceTo(this.pos);
        if (d < 65) a.startFlee(this.pos);
        else if (d < 130 && a.stats && !a.asleep && Math.random() < a.stats.curiosity * 0.4) a.investigate(this.pos);
      }
    }
    if (window.PACK && window.PACK.onHowl) window.PACK.onHowl();   // THE BONDING CALL — packs in range answer, bond… or bare fangs
    return true;
  }
  wolfSense() {
    if (this.senseCd > 0) return false;
    this.senseCd = 9;
    audio.whoosh();
    toast('👃 Wolf sense — tracks, scent and blood glow in the ground');
    senseT = 6.5;
    return true;
  }
}
const wolf = new Wolf();

/* ---------------- animals ---------------- */
const SPECIES = {
  // tier 1 — easy: slow, notices late, one bite
  rabbit:     { label: 'Rabbit',      scale: 0.58, body: 0xa89484, belly: 0xcfc4b4, legs: 0x8d7b6c, head: 0xa89484, ear: 0.34, earW: 0.09, legH: 0.28, bodyLen: 0.52, bodyH: 0.4, snout: 0, tail: 'puff', antler: 0, walk: 2.0, run: 6.2, detect: 8,  hp: 1, meat: 1, anim: 'hop' },
  hare:       { label: 'Snow Hare',   scale: 0.60, body: 0xeef1f4, belly: 0xffffff, legs: 0xd9dee3, head: 0xeef1f4, ear: 0.38, earW: 0.09, legH: 0.3, bodyLen: 0.54, bodyH: 0.4, snout: 0, tail: 'puff', antler: 0, walk: 2.2, run: 6.6, detect: 8,  hp: 1, meat: 1, anim: 'hop' },
  // tier 2 — moderate: quick but catchable, small bounty
  fox:        { label: 'Fox',         scale: 0.70, body: 0xc96a2f, belly: 0xe8ddca, legs: 0x4a382c, head: 0xc96a2f, ear: 0.16, earW: 0.07, legH: 0.34, bodyLen: 0.62, bodyH: 0.36, snout: 1, tail: 'bushy', antler: 0, walk: 2.4, run: 8.0, detect: 12, hp: 2, meat: 1, pelt: 1 },
  arcticFox:  { label: 'Arctic Fox',  scale: 0.68, body: 0xe8ecef, belly: 0xffffff, legs: 0xcfd6da, head: 0xe8ecef, ear: 0.15, earW: 0.07, legH: 0.32, bodyLen: 0.6, bodyH: 0.36, snout: 1, tail: 'bushy', antler: 0, walk: 2.3, run: 8.2, detect: 12, hp: 2, meat: 1, pelt: 1 },
  goat:       { label: 'Mountain Goat', scale: 1.15, body: 0xd8dbe0, belly: 0xf0f2f4, legs: 0xc2c7cd, head: 0xd8dbe0, ear: 0.14, earW: 0.07, legH: 0.66, bodyLen: 0.9, bodyH: 0.5, snout: 1, tail: 'short', antler: 0, horns: 1, walk: 2.0, run: 8.6, detect: 11, hp: 2, meat: 2, pelt: 1, bone: 1 },
  // tier 3 — hard: fast, wary, tough, rich bounty
  deer:       { label: 'Deer',        scale: 1.25, body: 0xa5713f, belly: 0xd8c2a4, legs: 0x8a5c34, head: 0xa5713f, ear: 0.2, earW: 0.07, legH: 0.72, bodyLen: 1.05, bodyH: 0.52, snout: 1, tail: 'short', antler: 1, walk: 2.2, run: 10.0, detect: 17, hp: 3, meat: 2, pelt: 1, bone: 1 },
  reindeer:   { label: 'Reindeer',    scale: 1.35, body: 0x7d6b58, belly: 0xc9bcae, legs: 0x64513f, head: 0x7d6b58, ear: 0.2, earW: 0.08, legH: 0.78, bodyLen: 1.15, bodyH: 0.56, snout: 1, tail: 'short', antler: 2, walk: 2.1, run: 10.4, detect: 16, hp: 3, meat: 3, pelt: 1, bone: 1 },
  elk:        { label: 'Elk',         scale: 1.60, body: 0x5d4a3a, belly: 0x9a8a76, legs: 0x4c3c2f, head: 0x5d4a3a, ear: 0.18, earW: 0.09, legH: 0.95, bodyLen: 1.35, bodyH: 0.66, snout: 1, tail: 'short', antler: 2, walk: 1.9, run: 10.8, detect: 15, hp: 4, meat: 4, pelt: 1, bone: 2 }
};
const rivals = [];   // roaming rival wolves — targetable by the player's bite

/* ============================================================
   Rival wolf pack — roams the wilds; may ignore, challenge, or
   attack the player. Coordinated stance, pack morale, retreat.
   ============================================================ */
let RIVAL_SEQ = 0;
class RivalWolf {
  constructor(x, z, pack, leader) {
    this.bondId = ++RIVAL_SEQ;   // PACKDBG attributions address mates by this id
    const built = buildWolf();
    this.model = built.group; this.legs = built.legs; this.lowers = built.lowers; this.head = built.head;
    // darker, scarred coat — recolour every mesh so the player's wolf stays untouched
    this.model.traverse(o => {
      if (o.isMesh && o.material && o.material.color) {
        o.material = o.material.clone();
        o.material.color.multiplyScalar(leader ? 0.62 : 0.78);
        if (o.material.color.r + o.material.color.g + o.material.color.b > 1.6) o.material.color.multiplyScalar(0.85);
      }
    });
    scene.add(this.model);
    this.pack = pack;
    this.leader = !!leader;
    this.sp = { scale: leader ? 1.14 : 0.96, label: leader ? 'Rival Alpha' : 'Rival Wolf' };
    this.pos = V3(x, heightAt(x, z), z);
    this.heading = Math.random() * 6.28;
    // ---- PACK LEVEL: packs spawn at the player's XP level (the wild keeps pace) ----
    // stats tuned so a bonded pack STRONGLY assists but never replaces the player:
    // mates are mortal (a couple of enemy bites), and pack DPS stays below the player's.
    this.level = Math.max(1, (pack && pack.level) || 1);
    const k = this.level - 1;
    this.hp = this.maxHp = Math.round((leader ? 20 : 14) + (leader ? 4 : 3.5) * k);
    this.dmg = (leader ? 5 : 4) + 0.45 * k;
    this.runSpd = 12.2 + Math.min(2.2, 0.06 * k);
    this.dead = false;
    this.state = 'roam';
    this.off = { x: (Math.random() - 0.5) * 14, z: (Math.random() - 0.5) * 14 };
    this.atkCd = 0; this.flinchT = 0; this.biteT = 0; this.phase = Math.random() * 6;
    this.circleDir = Math.random() < 0.5 ? 1 : -1;
  }
  hit() {          // player bite lands
    if (this.dead) return;
    if (this.pack.stance === 'bonded') {   // your own pack — a nip only, trust is never broken
      if (this.flinchT <= 0) this.flinchT = 0.14;
      return;
    }
    this.hp -= (this.pack.stance === 'undecided' || this.pack.stance === 'ignore') ? 2 : 1;   // ambush an unaware pack
    AnimalHealthBar.show(this);
    if (this.flinchT <= 0) this.flinchT = 0.3;
    bloodBurst(this.pos, 12, 0.9);
    this.pack.provoked();          // biting a wolf answers the question of stance
    if (this.hp <= 0) this.die();
  }
  hurt(dmg, label) {   // enemy blows land on a bonded packmate
    if (this.dead || this.pack.stance !== 'bonded') return;
    this.hp -= Math.max(1, Math.round(dmg));
    this.flinchT = 0.3;
    bloodBurst(this.pos, 10 + dmg * 3, 1);
    if (this.hp <= 0) { audio.cry(0.8); this.die(true); }
  }
  die(silent) {
    this.dead = true;
    if (!silent) pool.burst(this.pos, 22, 0xffe0a8, 1.6, 3.0, 3.2);
    scene.remove(this.model);
    if (silent) {   // a packmate falls to the wild — no loot, no XP, and its quest toil is lost
      if (typeof updateInv === 'function') updateInv();
      this.pack.memberDown(this);
      return;
    }
    inv.meat += 1; stats.slain++; updateInv();
    audio.cry(0.7);
    if (typeof questEvent === 'function') questEvent('rival', { pos: this.pos });
    if (typeof addXp === 'function') addXp(35);
    toast(`⚔️ Bested a ${this.sp.label}! +1 🥩`, true);
    this.pack.memberDown(this);
  }
  update(dt, tSec) {
    if (this.dead) return;
    tSec = tSec || 0;
    if (this.state === 'bond') { this.bondUpdate(dt, tSec); return; }   // PACK directs a bonded mate's feet
    const pk = this.pack;
    const dxw = wolf.pos.x - this.pos.x, dzw = wolf.pos.z - this.pos.z;
    const dWolf = Math.hypot(dxw, dzw);
    if (dWolf > 320) { this.model.visible = false; return; }   // frozen at distance
    this.model.visible = true;
    if (this.flinchT > 0) { this.flinchT -= dt; return; }
    this.atkCd = Math.max(0, this.atkCd - dt);
    let speed = 0;
    const faceWolf = () => { this.heading = angLerp(this.heading, Math.atan2(dxw, dzw), Math.min(1, dt * 6)); };
    if (this.state === 'roam' || pk.stance === 'ignore') {
      const tx = pk.wp.x + this.off.x, tz = pk.wp.z + this.off.z;
      const dl = Math.hypot(tx - this.pos.x, tz - this.pos.z);
      if (dl > 2) { this.heading = angLerp(this.heading, Math.atan2(tx - this.pos.x, tz - this.pos.z), Math.min(1, dt * 2.5)); speed = 3.4; }
    } else if (this.state === 'challenge' || this.state === 'follow') {
      if (this.state === 'follow' && !this.leader) {   // flankers circle wide while the alpha stares
        const ang = Math.atan2(this.pos.x - wolf.pos.x, this.pos.z - wolf.pos.z) + this.circleDir * dt * 0.35;
        const ring = 11 + (this.off.x % 5);
        const tx = wolf.pos.x + Math.sin(ang) * ring, tz = wolf.pos.z + Math.cos(ang) * ring;
        this.heading = angLerp(this.heading, Math.atan2(tx - this.pos.x, tz - this.pos.z), Math.min(1, dt * 3)); speed = 4.5;
        if (dWolf < 6) faceWolf();
      } else {
        if (dWolf > 13) { faceWolf(); speed = 5.5; }
        else { this.heading = angLerp(this.heading, Math.atan2(dxw, dzw) + this.circleDir * 0.5, Math.min(1, dt * 2)); }
      }
    } else if (this.state === 'attack') {
      faceWolf();
      // a real chase to close in — then plant feet and bite, from any side
      speed = dWolf > 1.8 ? this.runSpd : 0;   // just slower than the player's sprint
      if (dWolf < 2.4 && this.atkCd <= 0) {
        this.atkCd = 1.15;
        this.biteT = 0.36;              // claw, then bite — like every wolf
        bloodBurst(wolf.pos, 14, 1);
        // a bonded packmate may take the bite meant for you
        if (!(window.PACK && window.PACK.intercept(this, this.dmg, this.sp.label, '🐺')))
          wolfTakeDamage(this.dmg, this.pos, this.sp.label, '🐺');
      }
      if (dWolf > 90) this.state = 'follow';    // lost it — regroup
    } else if (this.state === 'flee') {
      this.heading = angLerp(this.heading, Math.atan2(this.pos.x - wolf.pos.x, this.pos.z - wolf.pos.z), Math.min(1, dt * 4));
      speed = 11.5;
    }
    // terrain-aware movement
    const nx = this.pos.x + Math.sin(this.heading) * 2.5, nz = this.pos.z + Math.cos(this.heading) * 2.5;
    if (heightAt(nx, nz) < waterYNow() + 0.3) this.heading += dt * 2.4;
    if (speed > 0) {
      this.pos.x += Math.sin(this.heading) * speed * dt;
      this.pos.z += Math.cos(this.heading) * speed * dt;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
      if (!this.bodyR) this.bodyR = 0.5 * (this.model.scale.x || 1);
      if (pushOutSolids(this, Math.sin(this.heading), Math.cos(this.heading)) < -0.55) this.heading += (Math.random() < 0.5 ? 1 : -1) * 0.5;
    }
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading;
    this.phase += dt * (2 + speed * 1.3);
    const amp = Math.min(0.55, speed * 0.055);
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase * 2 + i * 1.6) * amp; });
    if (this.biteT > 0) {                 // the rival's own claw → bite strike
      this.biteT -= dt;
      const ph = 1 - this.biteT / 0.36;
      if (ph < 0.45) {
        const s = ph / 0.45;
        const lift = Math.sin(Math.min(1, s * 2) * Math.PI / 2);
        const strike = Math.max(0, (s - 0.5) * 2);
        this.legs[0].rotation.x = -1.15 * lift + 1.55 * strike * strike;
        this.lowers[0].rotation.x = 0.65 * lift - 1.15 * strike;
        this.head.rotation.x = 0.12;
      } else {
        const snap = Math.sin((ph - 0.45) / 0.55 * Math.PI);
        this.head.rotation.x = 0.12 + 0.55 * snap;
        this.legs[0].rotation.x = lerp(this.legs[0].rotation.x, 0, dt * 10);
        this.lowers[0].rotation.x = lerp(this.lowers[0].rotation.x, 0, dt * 10);
      }
    }
    else this.head.rotation.x = this.state === 'challenge' ? 0.12 : Math.sin(tSec * 0.6 + this.phase) * 0.12;
  }
  /* a bonded mate's feet are directed by PACK (window.PACK.memberTick) — the pack's goal
     is the player's goal: quests together, fights together, follow when there's nothing to do */
  bondUpdate(dt, tSec) {
    this.atkCd = Math.max(0, this.atkCd - dt);
    const r = (window.PACK && window.PACK.memberTick) ? window.PACK.memberTick(this, dt) : { speed: 0 };
    const speed = r.speed || 0;
    if (r.heading !== undefined) this.heading = angLerp(this.heading, r.heading, Math.min(1, dt * 5));
    if (speed > 0) {
      this.pos.x += Math.sin(this.heading) * speed * dt;
      this.pos.z += Math.cos(this.heading) * speed * dt;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
      if (!this.bodyR) this.bodyR = 0.5 * (this.model.scale.x || 1);
      if (pushOutSolids(this, Math.sin(this.heading), Math.cos(this.heading)) < -0.55) this.heading += (Math.random() < 0.5 ? 1 : -1) * 0.5;
    }
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading;
    this.phase += dt * (2 + speed * 1.3);
    const amp = Math.min(0.55, speed * 0.055);
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase * 2 + i * 1.6) * amp; });
    this.head.rotation.x = Math.sin(tSec * 0.6 + this.phase) * 0.12;
  }
  dispose() { if (!this.dead) { this.dead = true; } scene.remove(this.model); }
}

class RivalPack {
  constructor(x, z) {
    this.stance = 'undecided';     // undecided -> ignore | challenge | attack -> (fight) -> flee | bonded
    this.members = [];
    this.lost = 0;
    this.provokedT = 0;
    this.engageT = 0;
    this.disbanded = false;
    // ---- PACK LEVEL: the pack spawns at the player's current XP level (scaled, never silly) ----
    const pl = (typeof wolf !== 'undefined' && wolf) ? (wolf.level | 0) : 0;
    this.level = Math.max(1, pl + [-1, 0, 0, 1][(Math.random() * 4) | 0]);
    const n = 3 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const m = new RivalWolf(x + (Math.random() - 0.5) * 18, z + (Math.random() - 0.5) * 18, this, i === 0);
      this.members.push(m); rivals.push(m);
    }
    this.wp = { x, z };
    this.newWp = () => { const a = Math.random() * 6.28, r = 30 + Math.random() * 55; this.wp = { x: x + Math.sin(a) * r * 3, z: z + Math.cos(a) * r * 3 }; };
    this.growlT = 2;
  }
  provoked() {
    if (this.stance !== 'attack') { this.stance = 'attack'; this.setStates('attack'); audio.growl(); }
    this.provokedT = 0;
  }
  setStates(st) { for (const m of this.members) if (!m.dead) m.state = this.stance === 'ignore' && st === 'attack' ? 'attack' : st; }
  memberDown(m) {
    this.lost++;
    if (this.stance === 'bonded') {   // a packmate falls — its toil on the current deed is lost (combat damage stands)
      if (window.PACK && window.PACK.memberDown) window.PACK.memberDown(m);
      audio.cry(0.85);
      if (!this.members.some(x => !x.dead)) { this.disbanded = true; if (window.PACK && window.PACK.onPackGone) window.PACK.onPackGone(); }
      return;
    }
    if (this.lost >= 2 || this.members[0].dead) {
      this.stance = 'flee'; this.setStates('flee');
      if (typeof questEvent === 'function') questEvent('packDriven', { pos: { x: this.members[0].pos.x, z: this.members[0].pos.z } });
      if (typeof addXp === 'function') addXp(25);
    }
  }
  update(dt, tSec) {
    const alive = this.members.filter(m => !m.dead);
    if (!alive.length) { this.disbanded = true; return; }
    if (this.stance === 'bonded') {   // the pack's goal is the player's — PACK directs each mate's feet
      for (const m of this.members) m.update(dt, tSec);
      return;
    }
    const dWolf = Math.hypot(alive[0].pos.x - wolf.pos.x, alive[0].pos.z - wolf.pos.z);
    if (this.stance === 'undecided' && dWolf < 80) {
      const r = Math.random();
      this.stance = r < 0.34 ? 'ignore' : r < 0.76 ? 'challenge' : 'attack';
      if (this.stance === 'challenge') { audio.howl(0.72); }
      if (this.stance === 'attack') { audio.growl(); }
      this.setStates(this.stance === 'attack' ? 'attack' : this.stance === 'challenge' ? (alive[0].leader, 'challenge') : 'roam');
      if (this.stance === 'challenge') alive[0].state = 'challenge';
    }
    if (this.stance === 'challenge') {
      this.provokedT += dt;
      this.growlT -= dt;
      if (this.growlT <= 0) { this.growlT = 4 + Math.random() * 3; if (dWolf < 60) audio.growl(); }
      // hold your ground or back away slowly…
      if (dWolf < 7.5) { this.engageT += dt; if (this.engageT > 1.6) this.provoked(); }
      else this.engageT = Math.max(0, this.engageT - dt * 0.5);
      if (dWolf > 70) { this.stance = 'undecided'; this.setStates('roam'); }  // they lose interest
    }
    if (this.stance === 'ignore' && dWolf < 12) { /* even pacifists defend close quarters */ }
    if (this.stance === 'flee' && dWolf > 260) this.disbanded = true;
    if (this.stance === 'ignore' || this.stance === 'undecided') {
      if (Math.hypot(this.wp.x - alive[0].pos.x, this.wp.z - alive[0].pos.z) < 8) this.newWp();
    }
    if (wolf.deadT > 0 && this.stance === 'attack') { this.stance = 'roam'; this.setStates('roam'); }
    for (const m of this.members) m.update(dt, tSec);
    if (alive.length && Math.hypot(alive[0].pos.x - wolf.pos.x, alive[0].pos.z - wolf.pos.z) > 460) this.disbanded = true;
  }
  dispose() { for (const m of this.members) m.dispose(); }
}

const SPECIES_TABLE = {
  taiga:    [['elk', 0.25], ['hare', 0.45], ['arcticFox', 0.3]],
  tundra:   [['reindeer', 0.4], ['hare', 0.4], ['arcticFox', 0.2]],
  forest:   [['deer', 0.35], ['rabbit', 0.4], ['fox', 0.25]],
  grove:    [['deer', 0.3], ['rabbit', 0.45], ['fox', 0.25]],
  meadow:   [['rabbit', 0.6], ['deer', 0.25], ['fox', 0.15]],
  mountain: [['goat', 1]],
  coast:    [['hare', 0.45], ['arcticFox', 0.3], ['rabbit', 0.25]],   // dunes & driftwood
  dry:      [['rabbit', 0.5], ['fox', 0.3], ['goat', 0.2]],           // steppe scrub
  highland: [['goat', 0.55], ['hare', 0.3], ['reindeer', 0.15]]       // crag dwellers
};  // ember wastes stay lifeless — nothing grazes on ash

/* ---- territorial predators: rare, dangerous, rich bounty ---- */
const PREDATORS = {
  bear:  { name: 'bear',   label: 'Brown Bear',   icon: '🐻', scale: 1.9,  hp: 8, dmg: 15, walk: 2.2, run: 11.8, reach: 3.9, atkCd: 1.45, huntsWolf: 1,
           body: 0x5d4128, belly: 0x7a5c3c, legs: 0x4a3520, head: 0x5d4128, meat: 6, pelt: 2, bone: 3, build: 'bear' },
  tiger: { name: 'tiger',  label: 'Tiger',        icon: '🐯', scale: 1.45, hp: 6, dmg: 11, walk: 2.6, run: 13.0, reach: 3.6, atkCd: 1.15, huntsWolf: 1,
           body: 0xc26a1e, belly: 0xe8dcc4, legs: 0xa85716, head: 0xc26a1e, meat: 5, pelt: 2, bone: 2, build: 'cat', stripes: 0x3a2410 },
  snowLeopard: { name: 'snowLeopard', label: 'Snow Leopard', icon: '🐆', scale: 1.3, hp: 5, dmg: 9, walk: 2.5, run: 12.6, reach: 3.4, atkCd: 1.0,
           body: 0xcfd6dd, belly: 0xeef2f5, legs: 0xb8c2cb, head: 0xcfd6dd, meat: 4, pelt: 2, bone: 2, build: 'cat', spots: 0x4a5158 },
  eagle: { name: 'eagle', label: 'Golden Eagle', icon: '🦅', scale: 1.1, hp: 6, dmg: 10, walk: 6.5, run: 17, reach: 2.3, atkCd: 3.6, huntsWolf: 1,
           body: 0x8a5a1c, belly: 0xc9a45a, legs: 0xe8b820, head: 0xa8763a, meat: 3, pelt: 1, bone: 1, build: 'eagle' },
  leopard: { name: 'leopard', label: 'Leopard', icon: '🐆', scale: 1.32, hp: 5, dmg: 10, walk: 2.5, run: 12.8, reach: 3.4, atkCd: 1.05, huntsWolf: 1,
             body: 0xd8a44a, belly: 0xf2e2c0, legs: 0xc28a36, head: 0xd8a44a, meat: 4, pelt: 2, bone: 2, build: 'cat', spots: 0x4a3320 },
  lion: { name: 'lion', label: 'Lion', icon: '🦁', scale: 1.55, hp: 7, dmg: 13, walk: 2.4, run: 12.2, reach: 3.8, atkCd: 1.25, huntsWolf: 1,
          body: 0xc79a54, belly: 0xe8d5ac, legs: 0xa87f3e, head: 0xc79a54, meat: 6, pelt: 2, bone: 3, build: 'cat', mane: 1, maneC: 0x4a3018 }
};
const PREDATOR_TABLE = {
  taiga: [['bear', 1]], forest: [['bear', 0.45], ['tiger', 0.3], ['leopard', 0.25]],
  grove: [['tiger', 0.6], ['leopard', 0.4]], meadow: [['lion', 1]],
  mountain: [['snowLeopard', 1]], tundra: [['snowLeopard', 0.65], ['bear', 0.35]],
  highland: [['snowLeopard', 1]]
};

function buildAnimal(sp) {
  const g = new THREE.Group();
  const mB = matColor(sp.body), mBe = matColor(sp.belly), mL = matColor(sp.legs), mH = matColor(sp.head);
  const lh = sp.legH, bh = sp.bodyH, bl = sp.bodyLen;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.62, bh, bl), mB);
  body.position.y = lh + bh / 2; g.add(body);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.5, bh * 0.35, bl * 0.9), mBe);
  belly.position.y = lh + bh * 0.22; g.add(belly);
  const head = new THREE.Group();
  head.position.set(0, lh + bh * 1.05, bl * 0.55); g.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.5, bh * 0.45, bh * 0.55), mH);
  head.add(skull);
  if (sp.snout) {
    const sn = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.24, bh * 0.2, bh * 0.3), mBe);
    sn.position.set(0, -bh * 0.08, bh * 0.4); head.add(sn);
  }
  const earGeo = new THREE.ConeGeometry(sp.earW, sp.ear, 4);
  const eL = new THREE.Mesh(earGeo, mH); eL.position.set(bh * 0.16, bh * 0.32 + sp.ear * 0.4, -bh * 0.1); head.add(eL);
  const eR = new THREE.Mesh(earGeo, mH); eR.position.set(-bh * 0.16, bh * 0.32 + sp.ear * 0.4, -bh * 0.1); head.add(eR);
  if (sp.antler) {
    const mA = matColor(0xcbb9a0);
    const beam = new THREE.CylinderGeometry(0.015, 0.03, sp.antler === 2 ? 0.42 : 0.34, 4);
    [[1, 0.35], [-1, 0.35], [1, -0.1], [-1, -0.1]].forEach(([side, zz], idx) => {
      const a = new THREE.Mesh(beam, mA);
      a.position.set(side * bh * 0.14, bh * 0.45 + (idx < 2 ? 0.18 : 0.05), zz * bh * 0.3);
      a.rotation.z = -side * 0.5; a.rotation.x = idx < 2 ? -0.3 : 0.35;
      head.add(a);
    });
  }
  if (sp.horns) {
    const mA = matColor(0x9b8f7a);
    const horn = new THREE.ConeGeometry(0.035, 0.3, 5);
    [[1], [-1]].forEach(([side]) => {
      const h = new THREE.Mesh(horn, mA);
      h.position.set(side * bh * 0.16, bh * 0.55, 0);
      h.rotation.z = -side * 0.7;
      head.add(h);
    });
  }
  if (sp.tail === 'puff') {
    const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), mBe);
    t.position.set(0, lh + bh * 0.7, -bl * 0.55); g.add(t);
  } else if (sp.tail === 'bushy') {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.5), mB);
    t.position.set(0, lh + bh * 0.6, -bl * 0.55 - 0.2);
    t.rotation.x = 0.5; g.add(t);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.16), mBe);
    tip.position.set(0, 0.02, -0.3); t.add(tip);
  } else {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), mB);
    t.position.set(0, lh + bh * 0.75, -bl * 0.58); g.add(t);
  }
  const legGeo = new THREE.BoxGeometry(bh * 0.16, lh, bh * 0.18);
  const legs = [];
  const lx = bh * 0.3, lz = bl * 0.38;
  [[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]].forEach(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, lh, z);
    const leg = new THREE.Mesh(legGeo, mL);
    leg.position.y = -lh / 2;
    pivot.add(leg); g.add(pivot); legs.push(pivot);
  });
  g.scale.setScalar(sp.scale);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, legs, head };
}

function buildPredator(sp) {
  const g = new THREE.Group();
  const mB = matColor(sp.body), mBe = matColor(sp.belly), mL = matColor(sp.legs), mH = matColor(sp.head);
  const bear = sp.build === 'bear';
  const lh = bear ? 0.62 : 0.55, bh = bear ? 0.78 : 0.5, bl = bear ? 1.3 : 1.15;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.72, bh, bl), mB);
  body.position.y = lh + bh / 2; g.add(body);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.58, bh * 0.34, bl * 0.88), mBe);
  belly.position.y = lh + bh * 0.2; g.add(belly);
  if (bear) { // shoulder hump
    const hump = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.6, bh * 0.34, bl * 0.3), mB);
    hump.position.set(0, lh + bh * 1.02, -bl * 0.18); g.add(hump);
  }
  if (sp.stripes) { // tiger stripes
    const mS = matColor(sp.stripes);
    for (let i = 0; i < 6; i++) {
      const zz = -bl * 0.38 + i * (bl * 0.15);
      [[1], [-1]].forEach(([side]) => {
        const st = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.05, bh * 0.62, bl * 0.055), mS);
        st.position.set(side * bh * 0.365, lh + bh * 0.55, zz);
        st.rotation.z = side * 0.12; g.add(st);
      });
    }
  }
  if (sp.spots) { // leopard rosettes
    const mS = matColor(sp.spots);
    for (let i = 0; i < 10; i++) {
      const spt = new THREE.Mesh(new THREE.IcosahedronGeometry(bh * 0.05, 0), mS);
      spt.position.set((i % 2 ? 1 : -1) * bh * 0.37, lh + bh * (0.45 + 0.1 * (i % 4)), -bl * 0.4 + i * (bl * 0.09));
      g.add(spt);
    }
  }
  if (sp.mane) { // lion's ruff — a dark crown of fur around the neck
    const mM = matColor(sp.maneC || 0x5a3c1c);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 6.2832;
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.17, bh * 0.34 + bh * 0.08 * Math.sin(i * 2.1), bh * 0.3), mM);
      tuft.position.set(Math.sin(a) * bh * 0.42, lh + bh * 0.92 + bh * 0.1 * Math.cos(a), bl * 0.34 + Math.cos(a) * bh * 0.16);
      tuft.rotation.z = Math.sin(a) * 0.5;
      g.add(tuft);
    }
    const crown = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.9, bh * 0.3, bh * 0.3), mM);
    crown.position.set(0, lh + bh * 1.02, bl * 0.3); g.add(crown);
  }
  const head = new THREE.Group();
  head.position.set(0, lh + bh * 1.12, bl * 0.52); g.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.56, bh * 0.5, bh * 0.6), mH); head.add(skull);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.3, bh * 0.24, bh * 0.34), mBe);
  snout.position.set(0, -bh * 0.1, bh * 0.42); head.add(snout);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.14, bh * 0.08, bh * 0.06), matColor(0x1c1414));
  nose.position.set(0, -bh * 0.03, bh * 0.6); head.add(nose);
  const earGeo = new THREE.IcosahedronGeometry(bh * 0.11, 0);
  const eL = new THREE.Mesh(earGeo, mH); eL.position.set(bh * 0.2, bh * 0.34, -bh * 0.08); head.add(eL);
  const eR = new THREE.Mesh(earGeo, mH); eR.position.set(-bh * 0.2, bh * 0.34, -bh * 0.08); head.add(eR);
  [[bh * 0.1], [-bh * 0.1]].forEach(([xx]) => { // eyes — warning glow
    const eye = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.07, bh * 0.05, bh * 0.03), matColor(0xffb020));
    eye.material = eye.material.clone(); eye.material.emissive = new THREE.Color(bear ? 0xff4010 : 0xffb020);
    eye.position.set(xx, bh * 0.08, bh * 0.3); head.add(eye);
  });
  // fangs
  if (!bear) { // long cat tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(bh * 0.1, bh * 0.1, bl * 0.55), mB);
    tail.position.set(0, lh + bh * 0.85, -bl * 0.75); tail.rotation.x = 0.55; g.add(tail);
  } else {
    const tail = new THREE.Mesh(new THREE.IcosahedronGeometry(bh * 0.09, 0), mB);
    tail.position.set(0, lh + bh * 0.8, -bl * 0.56); g.add(tail);
  }
  const legGeo = new THREE.BoxGeometry(bh * 0.19, lh, bh * 0.2);
  const legs = [];
  const lx = bh * 0.32, lz = bl * 0.4;
  [[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]].forEach(([x, z]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, lh, z);
    const leg = new THREE.Mesh(legGeo, mL); leg.position.y = -lh / 2;
    pivot.add(leg); g.add(pivot); legs.push(pivot);
  });
  g.scale.setScalar(sp.scale);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, legs, head };
}

/* ---- the golden eagle: a long-winged hunter of the open sky ---- */
function buildEagle(sp) {
  const g = new THREE.Group();
  const mB = matColor(sp.body), mBe = matColor(sp.belly), mH = matColor(sp.head),
        mL = matColor(sp.legs), mD = matColor(0x3d2a10), mEye = matColor(0x14100a);
  // body — a hunched teardrop riding the wind
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mB);
  body.scale.set(0.72, 0.6, 1.25); g.add(body);
  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), mBe);
  breast.scale.set(0.6, 0.62, 0.9); breast.position.set(0, -0.05, 0.26); g.add(breast);
  // head — golden crown, hooked beak, fierce eye
  const head = new THREE.Group(); head.position.set(0, 0.36, 0.5); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mH); head.add(skull);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mBe); crown.position.set(0, 0.05, -0.03); head.add(crown);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), mL);
  beak.rotation.x = Math.PI / 2 + 0.3; beak.position.set(0, -0.03, 0.2); head.add(beak);
  const hook = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 5), mD); hook.rotation.x = Math.PI; hook.position.set(0, -0.08, 0.25); head.add(hook);
  [[1], [-1]].forEach(([s]) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), mEye); e.position.set(s * 0.09, 0.06, 0.1); head.add(e); });
  // wings — LONG: pivoted at the shoulders so they can flap, fold and bank
  const wingL = new THREE.Group(); wingL.position.set(-0.2, 0.08, 0.02); g.add(wingL);
  const wingR = new THREE.Group(); wingR.position.set(0.2, 0.08, 0.02); g.add(wingR);
  for (const [wg, s] of [[wingL, -1], [wingR, 1]]) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 0.5), mB);
    main.position.set(s * 0.72, 0, -0.03); wg.add(main);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.035, 0.34), mD);
    tip.position.set(s * 1.62, 0, -0.07); tip.rotation.z = s * 0.1; wg.add(tip);
  }
  // fan tail
  const tail = new THREE.Group(); tail.position.set(0, 0.02, -0.6); g.add(tail);
  tail.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.4), mBe));
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.52), mB); t2.position.y = -0.006; tail.add(t2);
  // golden talons, tucked
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 5), mL); legL.position.set(-0.12, -0.32, 0.28); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.12; g.add(legR);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, head, wingL, wingR, tail };
}

let animalTotal = 0;
let predatorTotal = 0;
let eagleTotal = 0;
/* ============================================================
   LIVING ECOSYSTEM — modular animal AI
   Systems: AnimalStats · AnimalNeeds · AnimalDetection · AnimalAIController ·
   AnimalFlocking · AnimalCombat · AnimalLoot · AnimalAnimation · AnimalLOD · AnimalSpawner (in p4)
   States: idle · wander · graze · seekFood · drink · flee · sleep · rest ·
   alert · investigate · follow · protect   (Predator adds lurk/warn/chase/attack/hunt/return)
   ============================================================ */
const ECO = {   // species ecology & personality baselines (variance per individual in AnimalStats)
  rabbit:    { fear: .85, aggr: .02, int: .3,  herd: 3, yng: .3 },
  hare:      { fear: .9,  aggr: .02, int: .45, herd: 2, yng: .2, nocturnal: 1, snow: 1 },
  fox:       { fear: .5,  aggr: .15, int: .8,  herd: 1, nocturnal: 1, curious: .8 },
  arcticFox: { fear: .5,  aggr: .15, int: .75, herd: 1, nocturnal: 1, curious: .7, snow: 1 },
  goat:      { fear: .3,  aggr: .75, int: .5,  herd: 3, charge: 7 },
  deer:      { fear: .8,  aggr: .12, int: .6,  herd: 4, yng: .25 },
  reindeer:  { fear: .75, aggr: .15, int: .55, herd: 5, yng: .25, snow: 1 },
  elk:       { fear: .55, aggr: .55, int: .55, herd: 2, charge: 11 }
};
function ecoNight() { return dayF < 0.3; }

const AnimalStats = {
  make(name, rng) {
    const sp = Object.assign({}, SPECIES[name], ECO[name] || {});
    const v = (a, f) => a * (1 + (rng() * 2 - 1) * f);
    return {
      sp,
      speedMul: 1 + (rng() * 2 - 1) * 0.15,
      detectMul: Math.max(0.6, 1 + (rng() * 2 - 1) * 0.2),
      fear: Math.max(0.1, v(sp.fear ?? 0.5, 0.3)),
      aggression: Math.max(0, v(sp.aggr ?? 0.1, 0.25)),
      intelligence: Math.min(1, Math.max(0.1, v(sp.int ?? 0.5, 0.2))),
      curiosity: Math.min(1, Math.max(0.05, v(sp.curious ?? 0.3, 0.25))),
      stamRun: Math.max(1.5, v(sp.stamRun ?? 4, 0.3)),
      social: sp.herd > 1 ? 1 : 0.15
    };
  }
};

const AnimalNeeds = {
  init(a) { a.hunger = 15 + Math.random() * 45; a.thirst = 15 + Math.random() * 45; a.energy = 65 + Math.random() * 35; a.safety = 85 + Math.random() * 15; },
  update(a, dt, moving) {
    a.hunger = Math.min(100, a.hunger + dt * 0.4);
    a.thirst = Math.min(100, a.thirst + dt * 0.35);
    a.energy = Math.max(0, Math.min(100, a.energy + (moving ? -dt * 1.5 : dt * (a.asleep ? 5 : 2.4))));
    const danger = (a.aware >= 0.5 ? 2.2 : a.aware > 0 ? 0.7 : 0)
      + (a.wildD != null && a.wildD < 40 ? 1.6 : 0)
      + ((weather.rain > 0.45 || weather.snow > 0.45) ? 0.5 : 0);
    a.safety = clamp(a.safety + dt * (danger ? -danger : (a.cover > 0.3 ? 3.2 : 1.5)), 0, 100);
  },
  dominant(a) {
    if (a.thirst > 78 && a.findWater(false)) return 'drink';
    if (a.hunger > 72) return 'seekFood';
    if (a.injured && a.pos && Math.hypot(a.pos.x - wolf.pos.x, a.pos.z - wolf.pos.z) > 24) return 'seekCover';   // wounded prey goes to ground
    if (a.safety < 24 && a.aware < 0.5) return 'seekCover';
    if (a.energy < 22) return (ecoNight() !== !!a.sp.nocturnal) && a.cover > 0.3 ? 'sleep' : 'rest';
    return null;
  }
};

function coverAt(x, z) {   // vegetation density — blocks sight, offers shelter
  const h = heightAt(x, z);
  const cl = climateAt(x, z, h);
  const w = biomeWeights(x, z, h, cl.temp, cl.moist);
  return clamp((w.forest || 0) + (w.taiga || 0) + (w.grove || 0) + (w.enchanted || 0), 0, 1);
}
let _losT = -9, _losV = 0;
function wolfCover() {     // cached a quarter-second: where the wolf hides
  if (tSec - _losT > 0.25) { _losT = tSec; _losV = coverAt(wolf.pos.x, wolf.pos.z); }
  return _losV;
}
const AnimalDetection = {
  threat(a) {          // 0 unaware · 0.25 uneasy · 0.5 alert · 1 critical
    const d = a.pos.distanceTo(wolf.pos);
    let range = a.sp.detect * a.stats.detectMul;
    range *= wolf.speed > 6 ? 1.3 : wolf.speed > 3 ? 0.85 : 0.55;   // wolf speed = noise
    if (wolf.crouch) range *= wolf.perks.shadowStep ? 0.22 : 0.45;   // low and quiet — Shadow Step (the Shadow Wolf's / Leopard Legend's gift) makes prowling nearly invisible. SPEEDRUN FIX v6.8: the perk was granted but never read anywhere.
    range *= ecoNight() ? (a.sp.nocturnal ? 1.15 : 0.8) : (a.sp.nocturnal ? 0.8 : 1);
    if (weather.rain > 0.3 || weather.snow > 0.3) range *= 0.82;    // heavy weather masks
    if (wolf.swimming) range *= 0.7;
    if (a.asleep) range *= 0.45;
    let band;
    if (d > range * 1.6) band = 0;
    else if (d > range) band = 0.25;
    else if (d > range * 0.55) band = 0.5;
    else return 1;
    // line-of-sight: thick vegetation around the wolf masks it at anything but lunging range
    if (band >= 0.5 && wolfCover() > 0.5) band -= 0.25;
    return band;
  },
  nearestWildPredator(a) {   // bears/tigers hunting independently of the player
    let best = null, bd = 46;
    for (const ch of chunks.values()) {
      for (const pr of ch.predators) {
        if (pr.dead) continue;
        const d = pr.pos.distanceTo(a.pos);
        if (d < bd) { bd = d; best = pr; }
      }
    }
    return best ? { pr: best, d: bd } : null;
  }
};

const AnimalFlocking = {
  steer(a) {           // returns heading pull toward herd + separation, or null
    if (!a.herd) return null;
    let cx = 0, cz = 0, n = 0, sx = 0, sz = 0;
    for (const m of a.herd.members) {
      if (m === a || m.dead) continue;
      const dx = m.pos.x - a.pos.x, dz = m.pos.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d > 42) continue;
      n++; cx += m.pos.x; cz += m.pos.z;
      if (d < 2.4 && d > 0.01) { sx -= dx / d; sz -= dz / d; }
    }
    if (!n) return null;
    const pull = (a.young ? 1.7 : 1) * a.stats.social * 0.5;
    let tx = (cx / n - a.pos.x) * pull + sx * 1.3;
    let tz = (cz / n - a.pos.z) * pull + sz * 1.3;
    const l = Math.hypot(tx, tz);
    return l > 0.05 ? Math.atan2(tx, tz) : null;
  }
};

const AnimalCombat = {
  retaliate(a) {       // cornered beasts fight back; mothers protect young
    if (a.dead || !a.sp.charge) return false;
    if (a.stats.aggression > 0.25 && Math.random() < a.stats.aggression) { a.setState('protect'); return true; }
    return false;
  },
  protectTick(a, dt) { // charge the wolf, strike once, then bolt
    a.heading = angLerp(a.heading, Math.atan2(wolf.pos.x - a.pos.x, wolf.pos.z - a.pos.z), Math.min(1, dt * 7));
    const d = a.pos.distanceTo(wolf.pos);
    if (d < 2.4 + a.sp.scale * 0.6) {
      wolfTakeDamage(a.sp.charge, a.pos, a.sp.label, '🦌');
      pool.burst(a.pos, 10, 0xffb090, 1.2, 2.2, 2.4);
      a.startFlee(wolf.pos);
      return;
    }
    if (a.stateT > 4) a.startFlee(wolf.pos);
  }
};

const AnimalLoot = {
  grant(a) {
    let msg;
    if (a.luminous) {
      inv.meat += a.sp.meat; inv.pelt += 1; inv.bone += 2;
      msg = `🦌 The White Stag falls — the old magic passes on. +${a.sp.meat} 🥩 +1 🧥 +2 🦴`;
      stats.discoveries.add('whiteStag');
    } else {
      msg = `⚔️ Took down a ${a.sp.label}! +${a.sp.meat} 🥩`;
      inv.meat += a.sp.meat;
    }
    if (a.sp.pelt) { inv.pelt += a.sp.pelt; msg += ` +${a.sp.pelt} 🧥`; }
    if (a.sp.bone) { inv.bone += a.sp.bone; msg += ` +${a.sp.bone} 🦴`; }
    stats.caught++;
    toast(msg);
    updateInv();
  }
};

const AnimalAnimation = {
  pose(a, dt, tSec, speed) {
    a.phase += dt * (2 + speed * 1.6);
    const amp = clamp(speed * 0.12, 0, 0.6);
    if (a.asleep) {   // lying low, head tucked
      a.model.position.y = a.pos.y - a.sp.scale * 0.16;
      a.legs.forEach(l => { l.rotation.x = lerp(l.rotation.x, 0.5, dt * 4); });
      a.head.rotation.x = lerp(a.head.rotation.x, 0.55, dt * 3);
      return;
    }
    a.model.position.copy(a.pos);
    if (a.sp.anim === 'hop') {
      if (speed > 0.5) {
        const hop = Math.abs(Math.sin(a.phase * 1.4));
        a.model.position.y += hop * 0.28;
        a.legs[0].rotation.x = a.legs[1].rotation.x = hop * 0.7 - 0.3;
        a.legs[2].rotation.x = a.legs[3].rotation.x = -hop * 0.5;
      } else {
        a.legs.forEach(l => { l.rotation.x = lerp(l.rotation.x, 0, dt * 6); });
        a.head.rotation.x = Math.sin(tSec * 0.7 + a.phase) * 0.5;
      }
    } else {
      a.legs[0].rotation.x = Math.sin(a.phase) * amp;
      a.legs[1].rotation.x = Math.sin(a.phase + Math.PI) * amp;
      a.legs[2].rotation.x = Math.sin(a.phase + Math.PI) * amp;
      a.legs[3].rotation.x = Math.sin(a.phase) * amp;
      if (a.state === 'graze' || a.state === 'drink') a.head.rotation.x = lerp(a.head.rotation.x, 0.55, dt * 3);
      else if (a.state === 'alert' || a.state === 'investigate' || a.state === 'protect') a.head.rotation.x = lerp(a.head.rotation.x, -0.22, dt * 4);
      else if (speed < 0.3) a.head.rotation.x = Math.sin(tSec * 0.5 + a.phase) * 0.45;
      else a.head.rotation.x = lerp(a.head.rotation.x, 0, dt * 3);
    }
  }
};

const AnimalHealthBar = {
  // hidden until the player draws first blood; hugs the crown so close combat keeps it in frame
  show(a) {
    if (!a.bar) {
      a.barCv = document.createElement('canvas'); a.barCv.width = a.level ? 128 : 64; a.barCv.height = a.level ? 22 : 10;   // predators carry their level over the bar
      a.barTex = new THREE.CanvasTexture(a.barCv);
      a.barTex.minFilter = THREE.LinearFilter; a.barTex.magFilter = THREE.LinearFilter;
      a.bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: a.barTex, transparent: true, depthWrite: false, depthTest: false }));
      a.bar.renderOrder = 999;              // never lost behind fur, antlers or foliage
      a.bar.scale.set(a.level ? 3.2 : 1.55, a.level ? 0.52 : 0.24, 1);
      a.model.updateMatrixWorld(true);                       // fresh matrices → honest crown height
      const b = new THREE.Box3().setFromObject(a.model);
      const top = b.isEmpty() ? 1.2 : b.max.y - a.model.position.y;
      const sc = a.model.scale.x || 1;               // the parent's scale multiplies local offsets —
      a.bar.position.y = Math.max(0.35, (top + 0.12) / sc);   // divide it out: hug the crown in world space
      a.model.add(a.bar);
    }
    this.draw(a);
  },
  draw(a) {
    const ctx = a.barCv.getContext('2d');
    const f = Math.max(0, Math.min(1, a.hp / a.maxHp));
    // life drains the green out continuously: green → amber → deep red
    let r, g, b;
    if (f >= 0.5) { const t = (f - 0.5) * 2; r = lerp(0.90, 0.42, t); g = lerp(0.70, 0.76, t); b = lerp(0.22, 0.30, t); }
    else { const t = f * 2; r = lerp(0.85, 0.90, t); g = lerp(0.20, 0.70, t); b = lerp(0.12, 0.22, t); }
    a.barCol = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    const W = a.barCv.width, H = a.barCv.height, y0 = a.level ? 12 : 0;
    ctx.clearRect(0, 0, W, H);
    if (a.level) {   // "Level 10 Bear" — the danger, named
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(12,10,8,0.8)'; ctx.fillRect(0, 0, W, 11);
      ctx.fillStyle = (a.level >= 12) ? '#ff9d6a' : '#ffe9b0';
      ctx.fillText(`Level ${a.level} ${a.sp.label}`, W / 2, 8.5);
    }
    ctx.fillStyle = 'rgba(12,10,8,0.85)'; ctx.fillRect(0, y0, W, 10);
    ctx.fillStyle = '#241d16'; ctx.fillRect(1, y0 + 1, W - 2, 8);
    ctx.fillStyle = a.barCol; ctx.fillRect(1, y0 + 1, Math.round((W - 2) * f), 8);
    a.barTex.needsUpdate = true;
  },
  tick(a) {
    if (!a.bar) return;
    a.bar.material.opacity = a.hp / a.maxHp <= 0.25 ? 0.62 + 0.38 * Math.sin(tSec * 9) : 1;   // critical: pulse
  }
};

const AnimalAIController = {
  STATES: ['idle', 'wander', 'graze', 'seekFood', 'drink', 'flee', 'sleep', 'rest', 'alert', 'investigate', 'follow', 'protect', 'seekCover', 'migrate'],
  perceive(a) {          // awareness of the wolf: distance · speed · direction · night · weather · cover
    a.aware = AnimalDetection.threat(a);
    return a.aware;
  },
  reactWild(a) {         // react to wild predators independent of the player
    const wild = AnimalDetection.nearestWildPredator(a);
    a.wildD = wild ? wild.d : null;
    if (wild && wild.d < a.sp.detect * a.stats.detectMul * 0.8 && a.state !== 'flee' && a.state !== 'protect') {
      if (a.sp.charge && a.stats.aggression > 0.6 && wild.d < 10) a.setState('protect');
      else a.startFlee(wild.pr.pos);
      if (typeof ecoPredation === 'function') ecoPredation(a, wild.pr);   // sometimes the hunt succeeds
      return true;
    }
    return false;
  }
};

const AnimalLOD = { NEAR: 85, FAR: 170, STEP: 0.22 };

const AnimalSpawner = {
  spawnChunk(chunk, cx, cz, rng, sample, pickW) {
    const centerS = sample(cx * CHUNK + CHUNK / 2, cz * CHUNK + CHUNK / 2);
    const entries = Object.entries(centerS.w).filter(e => e[1] > 0.05);
    const centerBiome = pickW(rng, entries);
    const table = SPECIES_TABLE[centerBiome];
    if (!table) return;
    const night = ecoNight();
    // nocturnal species dominate the night shift, diurnal the day
    const wtable = table.map(([k, w]) => {
      const eco = ECO[k];
      if (eco && eco.nocturnal) w *= night ? 1.9 : 0.55;
      else w *= night ? 0.65 : 1.2;
      if (eco && eco.snow && weather.snow > 0.4) w *= 1.35;   // snowfall: winter coats come out
      return [k, w];
    });
    const groups = 1 + (rng() < 0.3 ? 1 : 0);
    for (let g = 0; g < groups; g++) {
      if (animalTotal >= 46) break;
      const kind = pickW(rng, wtable);
      const gx = cx * CHUNK + 10 + rng() * (CHUNK - 20), gz = cz * CHUNK + 10 + rng() * (CHUNK - 20);
      if (heightAt(gx, gz) < 0.9) continue;
      if (Math.hypot(gx - wolf.pos.x, gz - wolf.pos.z) < 34) continue;   // never spawn beside the player
      const herdN = Math.max(1, ((ECO[kind] && ECO[kind].herd) || 1) + (rng() < 0.4 ? 1 : 0) - (rng() < 0.5 ? 1 : 0));
      const herd = herdN > 1 ? { members: [] } : null;
      for (let m = 0; m < herdN; m++) {
        if (animalTotal >= 46) break;
        if (!(ECO_POP[kind] > 0)) break;   // hunted-out lands stay quiet
        ECO_POP[kind]--;
        const ax = gx + (rng() - 0.5) * 8, az = gz + (rng() - 0.5) * 8;
        if (heightAt(ax, az) < 0.8) continue;
        const a = new Animal(kind, ax, az, { herd, leader: m === 0, adult: m === 0 || rng() < 0.6 });
        if (herd) herd.members.push(a);
        chunk.animals.push(a);
      }
    }
  }
};

class Animal {
  constructor(speciesName, x, z, opts) {
    opts = opts || {};
    this.name = speciesName;
    this.stats = AnimalStats.make(speciesName, Math.random);
    this.sp = this.stats.sp;
    this.young = !!(opts.young || (!opts.adult && this.sp.yng && Math.random() < this.sp.yng));
    const built = buildAnimal(this.sp);
    this.model = built.group;
    this.legs = built.legs; this.head = built.head;
    if (this.young) { this.sp = Object.assign({}, this.sp, { label: 'Young ' + this.sp.label, hp: 1, meat: Math.max(1, this.sp.meat - 1), pelt: 0, scale: this.sp.scale * 0.55 }); this.model.scale.setScalar(this.sp.scale); }
    scene.add(this.model);
    this.pos = V3(x, heightAt(x, z), z);
    this.heading = Math.random() * Math.PI * 2;
    this.state = 'graze';
    this.stateT = 0;
    this.timer = 1 + Math.random() * 4;
    this.phase = Math.random() * 9;
    this.fleeT = 0;
    this.runT = 0;            // sprint stamina while fleeing
    this.target = null;
    this.dead = false;
    this.hp = this.sp.hp || 1;
    this.maxHp = this.hp;
    this.flinchT = 0;
    this.asleep = false;
    this.herd = opts.herd || null;
    this.herdLeader = !!opts.leader;
    this.lodT = 0;
    this.aware = 0;
    AnimalNeeds.init(this);
    const w = biomeWeights(x, z, this.pos.y, climateAt(x, z, this.pos.y).temp, climateAt(x, z, this.pos.y).moist);
    this.cover = clamp((w.forest || 0) + (w.taiga || 0) + (w.grove || 0) + (w.enchanted || 0), 0, 1);
    animalTotal++;
  }
  setState(st) { if (this.state !== st) { this.state = st; this.stateT = 0; } this.asleep = st === 'sleep'; }
  findWater(remember) {     // scan for a nearby shore; cached per animal
    if (this._waterT && tSec < this._waterT) return this.waterSpot || null;
    this._waterT = tSec + 6;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * 6.28, r = 14 + i * 3.4;
      const wx = this.pos.x + Math.sin(a) * r, wz = this.pos.z + Math.cos(a) * r;
      if (heightAt(wx, wz) < WATER_Y - 0.2) {
        // walk back to the bank
        for (let k = 1; k <= 4; k++) { const bx = this.pos.x + Math.sin(a) * (r - k * 2), bz = this.pos.z + Math.cos(a) * (r - k * 2); if (heightAt(bx, bz) > WATER_Y + 0.1) { this.waterSpot = { x: bx, z: bz }; return this.waterSpot; } }
      }
    }
    this.waterSpot = null;
    return null;
  }
  hit(dmg = 1, behind = false, ambush = false) {
    if (this.dead) return;
    if (!ambush && this.aware < 0.25 && behind) ambush = true;   // the old stealth rule lives in the new
    this.hp -= dmg;
    AnimalHealthBar.show(this);              // first blood reveals the bar
    this.flinchT = 0.32;
    pool.burst(this.pos, 6 + dmg * 4, ambush ? 0xd23a2a : 0xffb3a0, 1.1, 2.2, 2.6);
    if (!this.injured && this.hp > 0 && this.hp <= Math.ceil((this.sp.hp || 1) / 2)) {
      this.injured = true;                    // it will limp, bleed, and try to hide
      if (this.pos.distanceTo(wolf.pos) < 40) toast(`🩸 The ${this.sp.label.toLowerCase()} is wounded — follow the blood`);
    }
    const dx = this.pos.x - wolf.pos.x, dz = this.pos.z - wolf.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    const nx = this.pos.x + dx / l * 2.2, nz = this.pos.z + dz / l * 2.2;
    if (heightAt(nx, nz) > WATER_Y + 0.2) { this.pos.x = nx; this.pos.z = nz; this.pos.y = heightAt(nx, nz); }
    // panic ripples through the herd
    if (this.herd) for (const m of this.herd.members) if (m !== this && !m.dead && m.pos.distanceTo(this.pos) < 30) m.startFlee(wolf.pos);
    if (this.hp <= 0) this.caught();
    else if (!AnimalCombat.retaliate(this)) this.startFlee(wolf.pos);
  }
  dieSilently() {           // taken by a wild predator — no loot, herd panics
    if (this.dead) return;
    this.dead = true; animalTotal--;
    pool.burst(this.pos, 18, 0xd84a3a, 1.5, 2.6, 3);
    if (this.herd) for (const m of this.herd.members) if (!m.dead) m.startFlee(this.pos);
    scene.remove(this.model);
  }
  seekCoverDir() {        // sniff out the nearest denser patch of forest
    let best = this.cover, dir = null;
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const c = coverAt(this.pos.x + Math.sin(ang) * 14, this.pos.z + Math.cos(ang) * 14);
      if (c > best + 0.05) { best = c; dir = ang; }
    }
    return dir;
  }
  startFlee(from) {
    if (this.dead) return;
    this.setState('flee');
    this.fleeT = 4 + Math.random() * 2.5;
    this.runT = this.stats.stamRun;
    this.heading = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + (Math.random() - 0.5) * 0.8;
    this.aware = 1;
  }
  investigate(pt) { if (this.dead || this.asleep) return; this.target = { x: pt.x, z: pt.z }; this.setState('investigate'); }
  update(dt, tSec) {
    if (this.dead) return;
    const dWolf = this.pos.distanceTo(wolf.pos);
    if (dWolf > AnimalLOD.FAR && !(this.herd && this.herd.route)) { this.model.visible = false; return; }   // far: population-only (frozen) — unless the great herds are on the move
    this.model.visible = true;
    // ---- LOD: mid-distance animals think in bursts ----
    if (dWolf > AnimalLOD.NEAR) { this.lodT += dt; if (this.lodT < AnimalLOD.STEP) return; dt = this.lodT; this.lodT = 0; }
    this.stateT += dt;
    let speed = 0;
    // ---- perception (AI controller) ----
    if (!this.asleep || this.stateT > 1) AnimalAIController.perceive(this);
    const need = this.asleep ? null : AnimalNeeds.dominant(this);
    // ---- AI state machine ----
    if (this.flinchT > 0) {
      this.flinchT -= dt;
      this.model.scale.setScalar(this.sp.scale * (1 + Math.max(0, this.flinchT) / 0.32 * 0.22));
      AnimalAnimation.pose(this, dt, tSec, 0);
      return;
    } else this.model.scale.setScalar(this.sp.scale);
    switch (this.state) {
      case 'flee': {
        this.fleeT -= dt;
        const tired = this.runT <= 0;
        if (!tired) this.runT -= dt;
        speed = this.sp.run * this.stats.speedMul * (tired ? 0.55 : 1) * (this.injured ? 0.6 : 1);
        // smart prey jukes when the wolf lunges close
        if (this.stats.intelligence > 0.6 && dWolf < 6.5 && wolf.atkT > 0 && Math.random() < dt * 2.2)
          this.heading += (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random());
        if (this.injured && dWolf > 24) this.setState('seekCover');   // wounded prey goes to ground
        else if (this.fleeT < -3 && dWolf > this.sp.detect * 1.4) { this.setState('idle'); this.timer = 1; }
        break;
      }
      case 'protect': AnimalCombat.protectTick(this, dt); speed = this.sp.run * 0.9; break;
      case 'migrate': {         // the great herds travel their ancestral route
        const route = this.herd && this.herd.route;
        if (!route) { this.setState('idle'); break; }
        const wp = route[this.mwp || 0];
        if (!wp) { delete this.herd.route; this.setState('graze'); this.timer = 3; break; }
        const dl = Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z);
        if (dl < 7) { this.mwp = (this.mwp || 0) + 1; break; }
        this.heading = angLerp(this.heading, Math.atan2(wp.x - this.pos.x, wp.z - this.pos.z), Math.min(1, dt * 2.6));
        speed = this.sp.walk * 1.45;
        if (this.aware >= 0.5 && dWolf < this.sp.detect * 0.9) { this.setState('alert'); break; }   // spooked off the line
        break;
      }
      case 'seekCover': {
        if (this.cover > 0.32 || this.stateT > 7) { this.setState('rest'); this.timer = 2; break; }  // hidden — it holds still and hopes
        const dir = this.seekCoverDir();
        if (dir !== null) { this.heading = angLerp(this.heading, dir, Math.min(1, dt * 3)); speed = this.sp.walk; }
        else { this.setState('rest'); this.timer = 2; }
        break;
      }
      case 'sleep': {
        const wsl = AnimalDetection.nearestWildPredator(this);
        if (this.aware >= 0.5 || (wsl && wsl.d < 12)) { this.setState('alert'); break; }
        if (!ecoNight() && !this.sp.nocturnal) { this.setState('idle'); this.timer = 1; }
        break;
      }
      case 'rest': {
        if (this.aware >= 0.5) { this.setState('alert'); break; }
        if (this.energy > 55 || (need !== 'rest' && this.stateT > 8)) { this.setState('idle'); this.timer = 0.5; }
        break;
      }
      case 'alert': {
        this.heading = angLerp(this.heading, Math.atan2(this.pos.x - wolf.pos.x, this.pos.z - wolf.pos.z), Math.min(1, dt * 4));
        if (this.aware >= 1) this.startFlee(wolf.pos);
        else if (this.aware <= 0.25) { need ? this.pursue(need) : this.setState('graze'); }
        else if (this.stateT > 2.2 && this.aware < 0.75 && this.stats.curiosity > 0.55 && dWolf > 9) { this.investigate(wolf.pos); }
        break;
      }
      case 'investigate': {
        const dl = this.target ? Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) : 99;
        if (this.aware >= 0.75) { this.startFlee(wolf.pos); break; }
        if (dl > 3) { speed = this.sp.walk; this.heading = angLerp(this.heading, Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z), Math.min(1, dt * 3)); }
        else { this.setState('idle'); this.timer = 2; }
        break;
      }
      case 'seekFood': {
        if (!this.target || this.stateT > 10) {
          const a = Math.random() * 6.28, r = 4 + Math.random() * 10;
          this.target = { x: this.pos.x + Math.sin(a) * r, z: this.pos.z + Math.cos(a) * r };
        }
        const dl = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
        if (dl > 1.5) { speed = this.sp.walk; this.heading = angLerp(this.heading, Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z), Math.min(1, dt * 2.5)); }
        else { this.hunger = Math.max(0, this.hunger - 30); this.setState('graze'); }
        break;
      }
      case 'drink': {
        const wsp = this.waterSpot;
        if (!wsp) { this.thirst = Math.max(0, this.thirst - 10); this.setState('idle'); break; }
        const dl = Math.hypot(wsp.x - this.pos.x, wsp.z - this.pos.z);
        if (dl > 1.6) { speed = this.sp.walk; this.heading = angLerp(this.heading, Math.atan2(wsp.x - this.pos.x, wsp.z - this.pos.z), Math.min(1, dt * 2.5)); }
        else { this.thirst = Math.max(0, this.thirst - 55); if (Math.random() < dt * 3) pool.burst(V3(wsp.x, WATER_Y + 0.2, wsp.z), 2, 0x9fd4e8, 0.3, 1, 1); if (this.thirst < 25) { this.setState('idle'); this.timer = 2; } }
        break;
      }
      case 'follow': {
        const pull = AnimalFlocking.steer(this);
        if (pull !== null) { speed = this.sp.walk * 1.15; this.heading = angLerp(this.heading, pull, Math.min(1, dt * 2.5)); }
        if (this.stateT > 3) this.setState('graze');
        break;
      }
      case 'wander': {
        speed = this.sp.walk;
        const dl = this.target ? Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) : 0;
        if (dl < 1.5) { this.setState('graze'); this.timer = 2 + Math.random() * 5; }
        else this.heading = angLerp(this.heading, Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z), Math.min(1, dt * 3));
        break;
      }
      case 'idle': {
        this.timer -= dt;
        if (this.timer <= 0) {
          if (need) this.pursue(need);
          else if (ecoNight() && !this.sp.nocturnal && this.energy < 75 && this.cover > 0.3 && dWolf > 25) this.setState('sleep');
          else if ((this.sp.nocturnal ? !ecoNight() : ecoNight()) && this.energy < 40) this.setState('rest');
          else if ((weather.rain > 0.3 || weather.snow > 0.3) && Math.random() < 0.45) { this.setState('rest'); this.timer = 3 + Math.random() * 4; }   // stormy: hunker down
          else { const a = Math.random() * 6.28, r = 6 + Math.random() * 16; const tx = this.pos.x + Math.sin(a) * r, tz = this.pos.z + Math.cos(a) * r; if (heightAt(tx, tz) > WATER_Y + 0.4) { this.target = { x: tx, z: tz }; this.setState('wander'); } else this.timer = 1; }
        }
        break;
      }
      default: { // graze
        this.timer -= dt;
        if (this.aware >= 0.5) { this.setState('alert'); break; }
        if (this.timer <= 0) {
          if (need) this.pursue(need);
          else if (this.herd && !this.herdLeader && Math.random() < 0.5) this.setState('follow');
          else { this.setState('idle'); this.timer = 1; }
        }
        break;
      }
    }
    // ---- herd cohesion while moving ----
    if (this.herd && speed > 0 && this.state !== 'flee' && this.state !== 'protect') {
      const pull = AnimalFlocking.steer(this);
      if (pull !== null) this.heading = angLerp(this.heading, pull, Math.min(1, dt * (this.young ? 2.2 : 0.9)));
    }
    // ---- wild predators scare prey independent of the player ----
    AnimalAIController.reactWild(this);
    // ---- terrain-aware movement ----
    const nx = this.pos.x + Math.sin(this.heading) * 2.5, nz = this.pos.z + Math.cos(this.heading) * 2.5;
    if (heightAt(nx, nz) < WATER_Y + 0.3) this.heading += dt * 2.4;
    if (speed > 0) {
      let spd2 = speed;
      if (weather.snow > 0.4 && !this.sp.snow) spd2 *= 0.88;   // plowing through powder
      this.pos.x += Math.sin(this.heading) * spd2 * dt;
      this.pos.z += Math.cos(this.heading) * spd2 * dt;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
    }
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading;
    AnimalNeeds.update(this, dt, speed > 0.3);
    AnimalHealthBar.tick(this);
    AnimalAnimation.pose(this, dt, tSec, speed);
  }
  pursue(need) {
    if (need === 'seekCover') { this.setState(this.cover > 0.32 ? 'rest' : 'seekCover'); return; }
    if (need === 'drink' && this.findWater(true)) { this.setState('drink'); return; }
    if (need === 'seekFood') { this.setState('seekFood'); return; }
    if (need === 'sleep') { this.setState('sleep'); return; }
    if (need === 'rest') { this.setState('rest'); return; }
    this.setState('wander');
  }
  caught() {
    if (this.dead) return;
    this.dead = true;
    audio.cry(1 / Math.max(0.6, (this.sp.scale || 1) * 0.9));
    animalTotal--;
    pool.burst(this.pos, 26, 0xffe0a8, 1.8, 3.4, 3.6);
    AnimalLoot.grant(this);
    if (typeof questEvent === 'function') questEvent('kill', { species: this.name, pos: { x: this.pos.x, z: this.pos.z } });
    if (typeof addXp === 'function') addXp(this.sp.hp >= 4 ? 12 : 6);   // bigger prey, bigger tale
    scene.remove(this.model);
  }
  dispose() {
    if (!this.dead) { this.dead = true; animalTotal--; }
    scene.remove(this.model);
  }
}

/* ============================================================
   Territorial predator — patrols its home range; if the wolf
   steps in, it warns (3 s), then charges. Can be fought and
   killed for a rich bounty.
   ============================================================ */
class Predator {
  constructor(kind, x, z) {
    this.sp = PREDATORS[kind];
    const built = buildPredator(this.sp);
    this.model = built.group;
    this.legs = built.legs; this.head = built.head;
    scene.add(this.model);
    this.pos = V3(x, heightAt(x, z), z);
    this.home = { x, z };
    this.territory = 38;
    this.heading = Math.random() * Math.PI * 2;
    this.state = 'lurk';        // lurk → warn → chase → attack → return
    this.warnT = 0;
    this.timer = 2 + Math.random() * 4;
    this.target = null;
    this.hp = this.sp.hp;
    this.maxHp = this.hp;
    this.flinchT = 0;
    this.atkCd = 0;
    this.biteT = 0;
    this.phase = Math.random() * 9;
    this.dead = false;
    this.threatening = false;
    this.reArmed = true;        // re-arm warning after player leaves
    this.hunger = 30 + Math.random() * 40;
    this.huntTarget = null;
    this.lodT = 0;
    this.nocturnal = (kind === 'tiger' || kind === 'snowLeopard');
    // ---- difficulty level: the wild keeps pace with the wolf who walks it ----
    const pl = (typeof wolf !== 'undefined' && wolf) ? Math.max(0, wolf.level | 0) : 0;
    let lvl = pl + [-1, 0, 0, 1, 1, 2][(Math.random() * 6) | 0];
    if (Math.random() < Math.min(0.30, pl * 0.008)) lvl++;   // the deeper you climb, the sharper the company
    this.level = Math.max(1, lvl);
    const k = this.level - 1;
    this.maxHp = this.hp = Math.round(this.sp.hp * (1 + 0.14 * k));        // hardier
    this.dmg = Math.round(this.sp.dmg * (1 + 0.06 * k) * 10) / 10;         // hits harder
    this.armor = Math.min(3, Math.floor(k / 6));                            // thick hide: bites land softer (never 0)
    this.xpBounty = 20 + 9 * k;                                             // and worth the trouble
    this.ai = {   // advanced mechanics, earned level by level
      runMul: 1 + Math.min(0.28, 0.017 * k),
      cdMul: 1 - Math.min(0.38, 0.024 * k),
      feint: this.level >= 8,          // weaves as it closes — harder to read
      fury: this.level >= 12,          // enrages below a third of its blood
      patient: this.level >= 16        // gives less warning, senses you sooner
    };
    this.territory = 38 * (1 + Math.min(1.3, 0.09 * k));                   // relentless: hunts you farther from home
    predatorTotal++;
  }
  startFlee() { /* predators don't spook — they hold their ground */ }
  hit(dmg = 1, behind = false, ambush = false) {
    if (this.dead) return;
    this.hp -= Math.max(1, dmg - (this.armor || 0));   // a veteran's hide turns part of the bite
    AnimalHealthBar.show(this);              // first blood reveals the bar
    this.flinchT = 0.38;
    bloodBurst(this.pos, 10 + dmg * 5, ambush ? 1.3 : 1);   // the hit's blood, big on an ambush
    if (!this.injured && this.hp > 0 && this.hp <= Math.ceil((this.sp.hp || 1) / 2)) {
      this.injured = true;                    // it will limp, bleed, and try to hide
      if (this.pos.distanceTo(wolf.pos) < 40) toast(`🩸 The ${this.sp.label.toLowerCase()} is wounded — follow the blood`);
    }
    // heavy: only a slight stagger, barely pushed
    const dx = this.pos.x - wolf.pos.x, dz = this.pos.z - wolf.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    const nx = this.pos.x + dx / l * 0.8, nz = this.pos.z + dz / l * 0.8;
    if (heightAt(nx, nz) > WATER_Y + 0.2) {
      this.pos.x = nx; this.pos.z = nz; this.pos.y = heightAt(nx, nz);
    }
    if (this.hp <= 0) this.die();
    else if (this.state === 'lurk' || this.state === 'warn' || this.state === 'return') {
      this.state = 'chase';       // provoked!
      audio.growl();
    }
  }
  die() {
    if (this.dead) return;
    this.dead = true;
    this.threatening = false;
    predatorTotal--;
    pool.burst(this.pos, 34, 0xffd9a8, 2.2, 4.0, 4.2);
    audio.cry(0.55);
    if (typeof questEvent === 'function') questEvent('kill', { species: 'predator', pos: { x: this.pos.x, z: this.pos.z }, level: this.level });
    if (typeof addXp === 'function') addXp(this.xpBounty || 20);
    let msg = `${this.sp.icon} You slew the Level ${this.level} ${this.sp.label}! +${this.xpBounty} XP · +${this.sp.meat} 🥩`;
    inv.meat += this.sp.meat;
    if (this.sp.pelt) { inv.pelt += this.sp.pelt; msg += ` +${this.sp.pelt} 🧥`; }
    if (this.sp.bone) { inv.bone += this.sp.bone; msg += ` +${this.sp.bone} 🦴`; }
    stats.slain++;
    toast(msg, true);
    updateInv();
    scene.remove(this.model);
  }
  update(dt, tSec) {
    if (this.dead) return;
    const dxw = wolf.pos.x - this.pos.x, dzw = wolf.pos.z - this.pos.z;
    const dWolf = Math.hypot(dxw, dzw);
    if (dWolf > 200) { this.model.visible = false; this.threatening = false; return; }
    this.model.visible = true;
    if (this.flinchT > 0) {
      this.flinchT -= dt;
      this.model.scale.setScalar(this.sp.scale * (1 + Math.max(0, this.flinchT) / 0.38 * 0.18));
      this.threatening = true;
      return;                       // staggered by the blow
    }
    this.model.scale.setScalar(this.sp.scale);
    AnimalHealthBar.tick(this);
    const dWolfHome = Math.hypot(wolf.pos.x - this.home.x, wolf.pos.z - this.home.z);
    let speed = 0;
    this.threatening = false;
    this.hunger = Math.min(100, this.hunger + dt * 0.5);
    // LOD: idle-distance predators think in bursts; combat states stay full-rate
    if ((this.state === 'lurk' || this.state === 'return' || this.state === 'sleep') && dWolf > 85) {
      this.lodT += dt;
      if (this.lodT < 0.25) return;
      dt = this.lodT; this.lodT = 0;
    }
    if (this.state === 'lurk') {
      if (dWolfHome < this.territory && this.reArmed && state === 'play' && wolf.deadT <= 0) {
        this.state = 'warn'; this.warnT = 3;
        this.reArmed = false;
        showTerritoryWarning(this.sp);
        audio.growl();
        this.heading = Math.atan2(dxw, dzw);
      } else if (this.sp.huntsWolf && this.hunger > 88 && dWolf < (this.ai.patient ? 58 : 42) && state === 'play' && wolf.deadT <= 0) {
        // starving apex predator: the wolf is on tonight's menu
        this.state = 'warn'; this.warnT = this.ai.patient ? 1.1 : 2.5; this.reArmed = false;
        showTerritoryWarning(this.sp); audio.growl();
        this.heading = Math.atan2(dxw, dzw);
      } else if (this.hunger > 65 && dWolfHome > this.territory) {
        // hungry and unprovoked: hunt wild prey (ecosystem lives without the player)
        let prey = null, pd = 55;
        for (const ch of chunks.values()) {
          for (const an of ch.animals) {
            if (an.dead || an.sp.charge) continue;      // avoids goats & elk
            const d = an.pos.distanceTo(this.pos);
            if (d < pd) { pd = d; prey = an; }
          }
        }
        if (prey) { this.huntTarget = prey; this.state = 'hunt'; }
        else this.hunger = 50;
      } else if (!this.nocturnal && ecoNight() && dWolfHome > this.territory * 0.8 && Math.random() < dt * 0.05) {
        this.state = 'sleep';
      } else {
        if (dWolfHome > this.territory * 1.6) this.reArmed = true;
        this.timer -= dt;
        if (this.timer <= 0) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * 12;
          this.target = { x: this.home.x + Math.sin(a) * r, z: this.home.z + Math.cos(a) * r };
          this.timer = 3 + Math.random() * 5;
        }
        if (this.target) {
          const dl = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
          if (dl > 1.5) { speed = this.sp.walk; this.heading = angLerp(this.heading, Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z), Math.min(1, dt * 2.5)); }
        }
      }
    } else if (this.state === 'warn') {
      // 3-second stare-down: stalks toward the player, preparing to charge
      this.threatening = true;
      this.warnT -= dt;
      this.heading = angLerp(this.heading, Math.atan2(dxw, dzw), Math.min(1, dt * 6));
      speed = this.sp.walk * 1.5;
      if (this.warnT <= 0) { this.state = 'chase'; audio.growl(); }
    } else if (this.state === 'chase') {
      this.threatening = true;
      this.heading = angLerp(this.heading, Math.atan2(dxw, dzw), Math.min(1, dt * 5));
      if (this.ai.fury && !this.furious && this.hp < this.maxHp / 3) {
        this.furious = true; audio.growl();
        if (dWolf < 46) toast(`🔥 The Level ${this.level} ${this.sp.label} is ENRAGED!`);
      }
      speed = this.sp.run * this.ai.runMul * (this.furious ? 1.12 : 1);
      if (dWolf < this.sp.reach * 0.8) { this.state = 'attack'; this.atkCd = 0.3; }
      else if (dWolfHome > this.territory * 1.5) this.state = 'return';  // lost you at the edge of its range
    } else if (this.state === 'attack') {
      this.threatening = true;
      this.heading = angLerp(this.heading, Math.atan2(dxw, dzw), Math.min(1, dt * 7));
      this.atkCd -= dt;
      if (dWolf > this.sp.reach * 1.35) {
        this.state = dWolfHome > this.territory * 1.5 ? 'return' : 'chase';
      } else {
        // close the last strides, plant your feet, THEN bite — a bite from any
        // side (behind, flank, face) lands the same; no more orbiting past
        speed = dWolf > this.sp.reach * 0.6 ? this.sp.walk * 2.6 : 0;
        if (this.ai.feint && dWolf > this.sp.reach * 0.6)
          this.heading += Math.sin(tSec * 4.5 + this.phase) * 0.5 * dt * 22;   // a veteran feints as it closes
        if (this.atkCd <= 0) {
          this.atkCd = this.sp.atkCd * this.ai.cdMul * (this.furious ? 0.75 : 1);
          this.biteT = 0.36;                                     // claw, then bite
          bloodBurst(wolf.pos, 16, 1.1);                          // the wolf's blood
          if (!(window.PACK && window.PACK.intercept(this, this.dmg, this.sp.label, this.sp.icon)))
            wolfTakeDamage(this.dmg, this.pos, `Level ${this.level} ${this.sp.label}`, this.sp.icon);
        }
      }
    } else if (this.state === 'hunt') {
      const prey = this.huntTarget;
      if (!prey || prey.dead) { this.huntTarget = null; this.state = 'return'; }
      else {
        const pd2 = prey.pos.distanceTo(this.pos);
        this.heading = angLerp(this.heading, Math.atan2(prey.pos.x - this.pos.x, prey.pos.z - this.pos.z), Math.min(1, dt * 5));
        speed = this.sp.run * (this.nocturnal && ecoNight() ? 1.1 : 1);
        if (pd2 < 2.3) { prey.dieSilently(); this.hunger = 0; this.huntTarget = null; this.state = 'return'; }
        else if (pd2 > 75) { this.huntTarget = null; this.state = 'return'; }
      }
    } else if (this.state === 'sleep') {
      this.heading += (Math.random() - 0.5) * dt;   // restless slumber
      if (dWolfHome < this.territory * 0.85) { this.state = 'warn'; this.warnT = 3; showTerritoryWarning(this.sp); audio.growl(); }
      else if (!ecoNight() && Math.random() < dt * 0.1) { this.state = 'lurk'; this.timer = 2; }
    } else if (this.state === 'return') {
      const dl = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
      this.heading = angLerp(this.heading, Math.atan2(this.home.x - this.pos.x, this.home.z - this.pos.z), Math.min(1, dt * 4));
      speed = this.sp.walk * 2.2;
      if (dl < 3) { this.state = 'lurk'; this.timer = 2; }
    }
    // terrain-aware movement
    const nx = this.pos.x + Math.sin(this.heading) * 2.5, nz = this.pos.z + Math.cos(this.heading) * 2.5;
    if (heightAt(nx, nz) < WATER_Y + 0.3) this.heading += dt * 2.2;
    if (speed > 0) {
      this.pos.x += Math.sin(this.heading) * speed * dt;
      this.pos.z += Math.cos(this.heading) * speed * dt;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
      if (dWolf < 120 && !caveState.in) {     // the wild is solid to the wild too (near field only: mobile cost)
        if (!this.bodyR) this.bodyR = 0.42 * (this.model.scale.x || 1);
        if (pushOutSolids(this, Math.sin(this.heading), Math.cos(this.heading)) < -0.55)
          this.heading += (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);   // bump → pick a way around
      }
    }
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading;
    this.phase += dt * (2 + speed * 1.7);
    const amp = clamp(speed * 0.12, 0, 0.62);
    this.legs[0].rotation.x = Math.sin(this.phase) * amp;
    this.legs[1].rotation.x = Math.sin(this.phase + Math.PI) * amp;
    this.legs[2].rotation.x = Math.sin(this.phase + Math.PI) * amp;
    this.legs[3].rotation.x = Math.sin(this.phase) * amp;
    if (this.state === 'sleep') { this.legs.forEach(l => { l.rotation.x = lerp(l.rotation.x, 0.5, dt * 3); }); this.head.rotation.x = 0.5; return; }
    if (this.biteT > 0) {                    // the predator's strike: right claw swings, then it bites
      this.biteT -= dt;
      const ph = 1 - this.biteT / 0.36;      // 0 → 1 through the strike
      if (ph < 0.45) {
        const s = ph / 0.45;
        const lift = Math.sin(Math.min(1, s * 2) * Math.PI / 2);
        const strike = Math.max(0, (s - 0.5) * 2);
        this.legs[0].rotation.x = -1.1 * lift + 1.5 * strike * strike;
        this.head.rotation.x = 0.18;
      } else {
        const snap = Math.sin((ph - 0.45) / 0.55 * Math.PI);
        this.head.rotation.x = 0.18 + 0.5 * snap;
        this.legs[0].rotation.x = lerp(this.legs[0].rotation.x, 0, dt * 10);
      }
    }
    else this.head.rotation.x = this.state === 'attack' || this.state === 'chase' ? 0.18 : Math.sin(tSec * 0.5 + this.phase) * 0.25;
  }
  dispose() {
    if (!this.dead) { this.dead = true; predatorTotal--; }
    scene.remove(this.model);
  }
}

/* ============ 🦅 the golden eagle — a sky predator with no territory ============
   It hunts ONLY in daylight (aborts the moment dayF < 0.3, even mid-chase), has no
   home range, and does not let go easily: it circles the player, then suddenly
   dives at the ground — the only time the player can land a hit (its huge wingspan
   makes the low pass a big target). Levels like any predator; spawns rarely. */
class SkyEagle {
  constructor(x, z) {
    this.sp = PREDATORS.eagle;
    const built = buildEagle(this.sp);
    this.model = built.group;
    this.wingL = built.wingL; this.wingR = built.wingR; this.head = built.head; this.tail = built.tail;
    this.model.scale.setScalar(this.sp.scale);
    scene.add(this.model);
    this.pos = V3(x, heightAt(x, z), z);
    this.home = { x, z };                        // no territory, but any generic reader may look
    this.heading = Math.random() * Math.PI * 2;
    this.alt = 17 + Math.random() * 8;          // cruise altitude above the ground
    this.state = 'soar';                        // soar → chase (circles) → attack (dive) → climb → abort
    this.timer = 8 + Math.random() * 10;
    this.atkCd = 0.6;
    this.flinchT = 0; this.biteT = 0; this.biteAnim = 0;
    this.phase = Math.random() * 9;
    this.dead = false; this.threatening = false;
    this.fleeing = false;
    this.territory = 0;                         // the sky has no fences
    this.dm = Math.random() < 0.5 ? 1 : -1;     // circling direction
    this.orbitR = 9 + Math.random() * 5;
    this.breakT = 0; this.abortT = 0; this.abortMsgShown = false;
    this.model.position.copy(this.pos); this.model.position.y = heightAt(x, z) + this.alt;
    eagleTotal++;
    // ---- difficulty level: the sky keeps pace with the wolf who walks it ----
    const pl = (typeof wolf !== 'undefined' && wolf) ? Math.max(0, wolf.level | 0) : 0;
    let lvl = pl + [-1, 0, 0, 1, 1, 2][(Math.random() * 6) | 0];
    if (Math.random() < Math.min(0.30, pl * 0.008)) lvl++;
    this.level = Math.max(1, lvl);
    const k = this.level - 1;
    this.maxHp = this.hp = Math.round(this.sp.hp * (1 + 0.14 * k));        // hardier
    this.dmg = Math.round(this.sp.dmg * (1 + 0.06 * k) * 10) / 10;         // hits harder
    this.armor = Math.min(2, Math.floor(k / 8));                           // feathers turn a bit
    this.xpBounty = 25 + 10 * k;
    this.ai = {
      speed: 1 + Math.min(0.3, 0.02 * k),
      cdMul: Math.max(0.62, 1 - 0.03 * k),
      fury: this.level >= 12                                               // dives twice as often
    };
  }
  startFlee() { /* the eagle does not spook — it owns the sky */ }
  hit(dmg = 1, behind = false, ambush = false) {
    if (this.dead) return;
    this.hp -= Math.max(1, dmg - (this.armor || 0));
    AnimalHealthBar.show(this);
    this.flinchT = 0.42;                       // a hit mid-flight knocks it off its line
    bloodBurst(this.pos, 12 + dmg * 4, 1.2);   // feathers and blood
    if (this.hp <= 0) { this.die(); return; }
    if (this.hp <= this.maxHp * 0.34) { this.fleeing = true; toast(`🦅 The wounded eagle retreats into the sky`, true); }
    else if (this.pos.distanceTo(wolf.pos) < 45) toast(`🦅 The Golden Eagle reels — it climbs away for a moment`);
    this.state = 'climb'; this.breakT = 2.0;
  }
  die() {
    if (this.dead) return;
    this.dead = true; this.threatening = false;
    eagleTotal--;
    pool.burst(this.pos, 30, 0xffd9a8, 2.2, 4.0, 4.2);
    pool.burst(this.pos, 16, 0xc21018, 1.4, 2.4, 3.0);
    audio.cry(0.5);
    if (typeof questEvent === 'function') questEvent('kill', { species: 'predator', pos: { x: this.pos.x, z: this.pos.z }, level: this.level });
    if (typeof addXp === 'function') addXp(this.xpBounty || 20);
    let msg = `${this.sp.icon} You slew the Level ${this.level} Golden Eagle! +${this.xpBounty} XP · +${this.sp.meat} 🥩`;
    inv.meat += this.sp.meat;
    if (this.sp.pelt) { inv.pelt += this.sp.pelt; msg += ` +${this.sp.pelt} 🧥`; }
    if (this.sp.bone) { inv.bone += this.sp.bone; msg += ` +${this.sp.bone} 🦴`; }
    stats.slain++;
    toast(msg, true);
    updateInv();
    scene.remove(this.model);
  }
  dispose() {
    if (!this.dead) { this.dead = true; eagleTotal--; }
    scene.remove(this.model);
  }
  update(dt, tSec) {
    if (this.dead) return;
    const dxw = wolf.pos.x - this.pos.x, dzw = wolf.pos.z - this.pos.z;
    const dWolfH = Math.hypot(dxw, dzw);
    if (dWolfH > 300) { this.dispose(); return; }               // outrun the sky
    if (dWolfH > 240) { this.model.visible = false; this.threatening = false; return; }
    this.model.visible = true;
    if (this.flinchT > 0) { this.flinchT -= dt; this.threatening = true; }
    AnimalHealthBar.tick(this);
    const gyRef = Math.max(heightAt(this.pos.x, this.pos.z), WATER_Y);   // never dips under a lake
    const day = dayF > 0.3;
    // daylight law: as soon as it is dark enough it aborts — even mid-chase
    const wasActive = this.state === 'chase' || this.state === 'attack' || this.state === 'climb';
    if (!day || wolf.deadT > 0 || caveState.in) this.state = 'abort';
    if (!day && wasActive && !this.abortMsgShown) {   // the rescue word, once per eagle
      this.abortMsgShown = true;
      toast('🌑 The darkness saved you from the Eagle', true);
    }
    let speed = 0, altT = this.alt;
    if (this.flinchT > 0) {
      altT = this.alt + 3; speed = 6;                                   // hit — wobbles upward
    } else if (this.state === 'soar') {
      this.threatening = false;
      speed = 6 * this.ai.speed;
      altT = 20 + Math.sin(tSec * 0.3 + this.phase) * 3;
      this.heading += dt * 0.2;
      this.timer -= dt;
      if (day && state === 'play' && wolf.deadT <= 0 && dWolfH < 66 + this.level * 4 && !this.fleeing) {
        this.state = 'chase'; this.threatening = true;
        if (typeof audio !== 'undefined') audio.eagle();
        toast(`🦅 A GOLDEN EAGLE has seen you!`, true);
      }
      if (this.timer <= 0 && dWolfH > 70) this.state = 'abort';          // nothing worth the sky's trouble
    } else if (this.state === 'chase') {
      // it circles the player on a tight ring — does not let go easily
      this.threatening = true;
      this.atkCd -= dt;
      const ang = Math.atan2(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z);   // bearing TO the wolf
      let want;
      if (dWolfH > this.orbitR + 3) want = ang;                     // close the gap
      else if (dWolfH < this.orbitR - 3) want = ang + Math.PI;      // push back out
      else want = ang + (Math.PI / 2) * this.dm;                    // ride the ring
      this.heading = angLerp(this.heading, want, Math.min(1, dt * 3.5));
      speed = (8.5 + this.level * 0.35) * this.ai.speed;
      altT = 11 + Math.sin(tSec * 0.5) * 1.5;
      if (this.atkCd <= 0 && !this.fleeing && dWolfH < this.orbitR * 1.7) {   // a clean window — dive
        this.state = 'attack'; this.diveT = 0; this.diveX = wolf.pos.x; this.diveZ = wolf.pos.z;
      }
    } else if (this.state === 'attack') {
      // the sudden swoop — low, fast, talons forward. The player's only window to hit it.
      this.threatening = true;
      this.diveT += dt;
      const tx = this.diveX, tz = this.diveZ;
      const dT = Math.hypot(tx - this.pos.x, tz - this.pos.z);
      this.heading = angLerp(this.heading, Math.atan2(tx - this.pos.x, tz - this.pos.z), Math.min(1, dt * 5));
      speed = (15 + this.level * 0.7) * this.ai.speed;
      altT = 0.9;                                                       // talon height
      const dyOK = Math.abs(gyRef + this.alt + 1 - (wolf.pos.y + 0.6)) < 2.6;
      if (dWolfH < this.sp.reach * 1.4 && dyOK && this.atkCd <= 0 && this.flinchT <= 0) {
        this.atkCd = (this.ai.fury ? 2.2 : 3.6) * this.ai.cdMul;
        wolfTakeDamage(this.dmg, this.pos, `Level ${this.level} ${this.sp.label}`, this.sp.icon);
        bloodBurst(wolf.pos, 16, 1.2);
        if (typeof audio !== 'undefined') audio.eagle();
        this.state = 'climb'; this.breakT = 1.6;
      } else if (dT < 1.8 || this.alt < 1.3) {                           // swooped past — pull up
        this.state = 'climb'; this.breakT = 1.4;
        if (Math.random() < 0.4) this.dm = -this.dm;
      }
    } else if (this.state === 'climb') {
      this.threatening = true;
      const ang = Math.atan2(wolf.pos.x - this.pos.x, wolf.pos.z - this.pos.z);   // bearing TO the wolf
      this.heading = angLerp(this.heading, ang + Math.PI * 0.8 * this.dm, Math.min(1, dt * 1.8));
      speed = (10.5 + this.level * 0.3) * this.ai.speed;
      altT = 14;
      this.breakT -= dt;
      if (this.breakT <= 0) this.state = (this.fleeing || this.hp <= this.maxHp * 0.34 || !day) ? 'abort' : 'chase';
    } else {                                                              // abort — darkness or wounds
      this.threatening = false;
      const aw = Math.atan2(this.pos.x - wolf.pos.x, this.pos.z - wolf.pos.z);
      this.heading = angLerp(this.heading, aw, Math.min(1, dt * 2));
      speed = 14; altT = 22;
      this.abortT += dt;
      this.timer += dt;
      if (dWolfH > 150 || this.abortT > 12) { this.dispose(); return; }
    }
    // ---- flight: altitude eases toward its target, terrain always rules ----
    this.alt += (altT - this.alt) * Math.min(1, dt * (this.state === 'attack' ? 3.2 : 1.15));
    if (this.state === 'attack') this.alt = Math.max(0.55, this.alt);     // never hits the dirt
    const gyNow = Math.max(heightAt(this.pos.x, this.pos.z), WATER_Y);
    this.pos.x += Math.sin(this.heading) * speed * dt;
    this.pos.z += Math.cos(this.heading) * speed * dt;
    this.pos.y = gyNow + this.alt + 1;
    // ---- the bird wears its flight: bank, pitch, wings ----
    const bankT = this.state === 'attack' ? 0 : (this.state === 'climb' ? -0.45 * this.dm : 0.5 * this.dm);
    this.model.rotation.y = this.heading;
    this.model.rotation.x = this.state === 'attack' ? 0.5 : (this.state === 'climb' ? -0.4 : -0.06);
    this.model.rotation.z += (bankT - this.model.rotation.z) * Math.min(1, dt * 3);
    const flapRate = this.state === 'attack' ? 20 : this.state === 'climb' ? 9 : 4.5;
    const flapAmp = this.state === 'attack' ? 0.1 : this.state === 'climb' ? 0.4 : 0.17;
    const f = Math.sin(tSec * flapRate + this.phase) * flapAmp;
    const sweep = (this.state === 'attack' || this.state === 'climb') ? 0.55 : 0.18;
    this.wingL.rotation.z = -(sweep + f);
    this.wingR.rotation.z = sweep + f;
    this.tail.rotation.x = this.state === 'attack' ? 0.4 : 0.1;
    this.model.position.copy(this.pos);
  }
}
