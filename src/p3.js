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
    label: 'Cave Mouth', icon: '🕳️', biomes: { mountain: 0.65, taiga: 0.2, tundra: 0.15 },
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

class Wolf {
  constructor() {
    const m = buildWolf();
    this.model = m.group;
    this.legs = m.legs; this.lowers = m.lowers; this.head = m.head; this.tail = m.tail;
    scene.add(this.model);
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
    this.hp = 100; this.maxHp = 100;
    this.lastHurt = -99;
    this.invulnT = 0;
    this.deadT = 0;
    this.killerPos = null;
    this.flyDirY = 0;
    this.trailAcc = 0;
    this.stepAcc = 0;
    // find a gentle spawn: not underwater, not high mountains
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
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
  }
  update(dt, input, camYaw, camPitch) {
    if (this.deadT > 0) {          // slain — respawn handled by updateHUD
      this.animate(dt, false);
      return;
    }
    if (this.invulnT > 0) this.invulnT -= dt;
    const mvF = clamp((input.f ? 1 : 0) - (input.b ? 1 : 0) + input.my, -1, 1);
    const mvS = clamp((input.r ? 1 : 0) - (input.l ? 1 : 0) + input.mx, -1, 1);
    const mag = Math.hypot(mvF, mvS);
    const moving = mag > 0.12 && !input.paused;
    let sprint = input.sprint && moving && !this.exhausted && this.stamina > 0 && !this.swimming;
    if (sprint) {
      this.stamina -= 15 * dt;
      if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; sprint = false; }
    } else if (!this.swimming) {
      // no regen while swimming — the swim block drains it instead
      this.stamina = Math.min(100, this.stamina + 11 * dt);
      if (this.exhausted && this.stamina > 26) this.exhausted = false;
    }
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.atkT > 0) this.atkT = Math.max(0, this.atkT - dt);

    // ---- magic flight ----
    if (this.flyT > 0) {
      this.flyT -= dt;
      this.stamina = Math.min(100, this.stamina + 22 * dt);
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
      this.pos.y = clamp(this.pos.y, Math.max(heightAt(this.pos.x, this.pos.z), WATER_Y) + 0.7, 130);
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
      target = this.swimming ? 4.2 : (sprint ? 13.5 : 7);
      target *= clamp(0.55 + 0.45 * Math.min(1, mag), 0.55, 1); // joystick deflection scales speed
    }
    if (moving && this.grounded) {
      const ah = heightAt(this.pos.x + dirX * 2, this.pos.z + dirZ * 2);
      const grade = Math.max(0, (ah - this.pos.y) / 2);
      target *= clamp(1 / (1 + grade * 0.9), 0.4, 1);
    }
    this.speed += clamp(target - this.speed, -46 * dt, 34 * dt);
    if (!moving && this.speed < 0.4) this.speed = 0;

    this.pos.x += dirX * this.speed * dt;
    this.pos.z += dirZ * this.speed * dt;
    this.distance += this.speed * dt;

    const ground = heightAt(this.pos.x, this.pos.z);
    this.swimming = ground < WATER_Y - 0.85 && this.pos.y <= WATER_Y + 0.1;
    if (input.jump && this.grounded && !this.swimming) {
      this.vy = 8.8; this.grounded = false;
      pool.burst(this.pos, 8, 0xcfc4a8, 1.2, 1.4, 2.2);
    }
    if (this.swimming) {
      this.pos.y += (WATER_Y - 0.42 - this.pos.y) * Math.min(1, dt * 6);
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
      const ah = heightAt(ax, az);
      if ((moving || input.jump) && ah > WATER_Y - 0.35 && ah < WATER_Y + 1.8) {
        this.swimming = false; this.vy = 6.4; this.grounded = false;
        this.pos.y = Math.max(this.pos.y, WATER_Y - 0.1);
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
    this.animate(dt, sprint);
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
    // bite & claw lunge
    if (this.atkT > 0) {
      const k = Math.sin((1 - this.atkT / 0.38) * Math.PI);
      this.head.rotation.x = 0.1 - k * 0.7;
      m.position.x += Math.sin(this.yaw) * k * 0.35;
      m.position.z += Math.cos(this.yaw) * k * 0.35;
      m.position.y += k * 0.12;
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
    for (const ch of chunks.values()) {
      const targets = ch.animals.concat(ch.predators);
      for (const a of targets) {
        if (a.dead) continue;
        const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 3.6 + a.sp.scale * 0.7 || Math.abs(a.pos.y - this.pos.y) > 3.5) continue;
        const dot = (dx * fx + dz * fz) / (d || 1);
        if (dot < 0.2) continue;   // ~78° bite cone in front
        if (d < bestD) { bestD = d; best = a; }
      }
    }
    pool.burst(V3(this.pos.x + fx * 1.5, this.pos.y + 0.9, this.pos.z + fz * 1.5), 10, 0xfff2c8, 0.9, 1.6, 3.2);
    if (best) best.hit();
    return true;
  }
  howl() {
    if (this.howlCd > 0) return false;
    this.howlCd = 5;
    audio.howl();
    toast('🐺 You howl into the wind…');
    for (const ch of chunks.values()) {
      for (const a of ch.animals) {
        if (a.pos.distanceTo(this.pos) < 65) a.startFlee(this.pos);
      }
    }
    return true;
  }
  wolfSense() {
    if (this.senseCd > 0) return false;
    this.senseCd = 9;
    toast('👃 Wolf sense — you can smell nearby life');
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
const SPECIES_TABLE = {
  taiga:    [['elk', 0.25], ['hare', 0.45], ['arcticFox', 0.3]],
  tundra:   [['reindeer', 0.4], ['hare', 0.4], ['arcticFox', 0.2]],
  forest:   [['deer', 0.35], ['rabbit', 0.4], ['fox', 0.25]],
  grove:    [['deer', 0.3], ['rabbit', 0.45], ['fox', 0.25]],
  meadow:   [['rabbit', 0.6], ['deer', 0.25], ['fox', 0.15]],
  mountain: [['goat', 1]]
};

/* ---- territorial predators: rare, dangerous, rich bounty ---- */
const PREDATORS = {
  bear:  { name: 'bear',   label: 'Brown Bear',   icon: '🐻', scale: 1.9,  hp: 8, dmg: 15, walk: 2.2, run: 11.8, reach: 3.9, atkCd: 1.45,
           body: 0x5d4128, belly: 0x7a5c3c, legs: 0x4a3520, head: 0x5d4128, meat: 6, pelt: 2, bone: 3, build: 'bear' },
  tiger: { name: 'tiger',  label: 'Tiger',        icon: '🐯', scale: 1.45, hp: 6, dmg: 11, walk: 2.6, run: 13.0, reach: 3.6, atkCd: 1.15,
           body: 0xc26a1e, belly: 0xe8dcc4, legs: 0xa85716, head: 0xc26a1e, meat: 5, pelt: 2, bone: 2, build: 'cat', stripes: 0x3a2410 },
  snowLeopard: { name: 'snowLeopard', label: 'Snow Leopard', icon: '🐆', scale: 1.3, hp: 5, dmg: 9, walk: 2.5, run: 12.6, reach: 3.4, atkCd: 1.0,
           body: 0xcfd6dd, belly: 0xeef2f5, legs: 0xb8c2cb, head: 0xcfd6dd, meat: 4, pelt: 2, bone: 2, build: 'cat', spots: 0x4a5158 }
};
const PREDATOR_TABLE = {
  taiga: [['bear', 1]], forest: [['bear', 0.6], ['tiger', 0.4]],
  grove: [['tiger', 0.7], ['bear', 0.3]], mountain: [['snowLeopard', 1]], tundra: [['snowLeopard', 0.65], ['bear', 0.35]]
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
let animalTotal = 0;
let predatorTotal = 0;
class Animal {
  constructor(speciesName, x, z) {
    this.sp = SPECIES[speciesName];
    this.name = speciesName;
    const built = buildAnimal(this.sp);
    this.model = built.group;
    this.legs = built.legs; this.head = built.head;
    scene.add(this.model);
    this.pos = V3(x, heightAt(x, z), z);
    this.heading = Math.random() * Math.PI * 2;
    this.state = 'graze';
    this.timer = 1 + Math.random() * 4;
    this.phase = Math.random() * 9;
    this.fleeT = 0;
    this.target = null;
    this.dead = false;
    this.hp = this.sp.hp || 1;
    this.flinchT = 0;
    animalTotal++;
  }
  hit() {
    if (this.dead) return;
    this.hp--;
    this.flinchT = 0.32;
    pool.burst(this.pos, 12, 0xffb3a0, 1.1, 2.2, 2.6);
    const dx = this.pos.x - wolf.pos.x, dz = this.pos.z - wolf.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    const nx = this.pos.x + dx / l * 2.2, nz = this.pos.z + dz / l * 2.2;
    if (heightAt(nx, nz) > WATER_Y + 0.2) {
      this.pos.x = nx; this.pos.z = nz;
      this.pos.y = heightAt(nx, nz);
    }
    if (this.hp <= 0) this.caught();
    else this.startFlee(wolf.pos);
  }
  startFlee(from) {
    if (this.dead) return;
    this.state = 'flee';
    this.fleeT = 4 + Math.random() * 2.5;
    this.heading = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + (Math.random() - 0.5) * 0.8;
  }
  update(dt, tSec) {
    if (this.dead) return;
    const dWolf = this.pos.distanceTo(wolf.pos);
    if (dWolf > 230) { this.model.visible = false; return; }
    this.model.visible = true;
    const detect = this.sp.detect * (wolf.speed > 6 ? 1.25 : wolf.speed > 3 ? 0.8 : 0.55);
    if (dWolf < detect && this.state !== 'flee' && (wolf.speed > 3 || dWolf < detect * 0.45)) {
      this.startFlee(wolf.pos);
    }
    let speed = 0;
    if (this.state === 'flee') {
      this.fleeT -= dt;
      speed = this.sp.run * (this.fleeT < 0 ? 0.55 : 1);
      if (this.fleeT < -3) { this.state = 'graze'; this.timer = 2; }
    } else if (this.state === 'wander') {
      speed = this.sp.walk;
      const dl = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
      if (dl < 1.5) { this.state = 'graze'; this.timer = 2 + Math.random() * 5; }
      else this.heading = angLerp(this.heading, Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z), Math.min(1, dt * 3));
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 16;
        const tx = this.pos.x + Math.sin(a) * r, tz = this.pos.z + Math.cos(a) * r;
        if (heightAt(tx, tz) > WATER_Y + 0.4) { this.target = { x: tx, z: tz }; this.state = 'wander'; }
        else this.timer = 1;
      }
    }
    const nx = this.pos.x + Math.sin(this.heading) * 2.5, nz = this.pos.z + Math.cos(this.heading) * 2.5;
    if (heightAt(nx, nz) < WATER_Y + 0.3) this.heading += dt * 2.4;
    if (speed > 0) {
      this.pos.x += Math.sin(this.heading) * speed * dt;
      this.pos.z += Math.cos(this.heading) * speed * dt;
      this.pos.y = heightAt(this.pos.x, this.pos.z);
    }
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading;
    if (this.flinchT > 0) {
      this.flinchT -= dt;
      this.model.scale.setScalar(this.sp.scale * (1 + Math.max(0, this.flinchT) / 0.32 * 0.22));
    } else {
      this.model.scale.setScalar(this.sp.scale);
    }
    this.phase += dt * (2 + speed * 1.6);
    const amp = clamp(speed * 0.12, 0, 0.6);
    if (this.sp.anim === 'hop') {
      if (speed > 0.5) {
        const hop = Math.abs(Math.sin(this.phase * 1.4));
        this.model.position.y += hop * 0.28;
        this.legs[0].rotation.x = this.legs[1].rotation.x = hop * 0.7 - 0.3;
        this.legs[2].rotation.x = this.legs[3].rotation.x = -hop * 0.5;
      } else {
        this.legs.forEach(l => { l.rotation.x = lerp(l.rotation.x, 0, dt * 6); });
        this.head.rotation.x = Math.sin(tSec * 0.7 + this.phase) * 0.5;
      }
    } else {
      this.legs[0].rotation.x = Math.sin(this.phase) * amp;
      this.legs[1].rotation.x = Math.sin(this.phase + Math.PI) * amp;
      this.legs[2].rotation.x = Math.sin(this.phase + Math.PI) * amp;
      this.legs[3].rotation.x = Math.sin(this.phase) * amp;
      if (speed < 0.3) this.head.rotation.x = Math.sin(tSec * 0.5 + this.phase) * 0.45;
      else this.head.rotation.x = lerp(this.head.rotation.x, 0, dt * 3);
    }
  }
  caught() {
    if (this.dead) return;
    this.dead = true;
    animalTotal--;
    pool.burst(this.pos, 26, 0xffe0a8, 1.8, 3.4, 3.6);
    let msg = `⚔️ Took down a ${this.sp.label}! +${this.sp.meat} 🥩`;
    inv.meat += this.sp.meat;
    if (this.sp.pelt) { inv.pelt += this.sp.pelt; msg += ` +${this.sp.pelt} 🧥`; }
    if (this.sp.bone) { inv.bone += this.sp.bone; msg += ` +${this.sp.bone} 🦴`; }
    stats.caught++;
    toast(msg);
    updateInv();
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
    this.flinchT = 0;
    this.atkCd = 0;
    this.biteT = 0;
    this.phase = Math.random() * 9;
    this.dead = false;
    this.threatening = false;
    this.reArmed = true;        // re-arm warning after player leaves
    predatorTotal++;
  }
  startFlee() { /* predators don't spook — they hold their ground */ }
  hit() {
    if (this.dead) return;
    this.hp--;
    this.flinchT = 0.38;
    pool.burst(this.pos, 14, 0xffb3a0, 1.2, 2.4, 2.8);
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
    let msg = `${this.sp.icon} You slew the ${this.sp.label}! +${this.sp.meat} 🥩`;
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
    const dWolfHome = Math.hypot(wolf.pos.x - this.home.x, wolf.pos.z - this.home.z);
    let speed = 0;
    this.threatening = false;
    if (this.state === 'lurk') {
      if (dWolfHome < this.territory && this.reArmed && state === 'play' && wolf.deadT <= 0) {
        this.state = 'warn'; this.warnT = 3;
        this.reArmed = false;
        showTerritoryWarning(this.sp);
        audio.growl();
        this.heading = Math.atan2(dxw, dzw);
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
      speed = this.sp.run;
      if (dWolf < this.sp.reach * 0.8) { this.state = 'attack'; this.atkCd = 0.3; }
      else if (dWolfHome > this.territory * 1.5) this.state = 'return';  // lost you at the edge of its range
    } else if (this.state === 'attack') {
      this.threatening = true;
      this.heading = angLerp(this.heading, Math.atan2(dxw, dzw), Math.min(1, dt * 7));
      this.atkCd -= dt;
      if (dWolf > this.sp.reach * 1.35) {
        this.state = dWolfHome > this.territory * 1.5 ? 'return' : 'chase';
      } else if (this.atkCd <= 0) {
        this.atkCd = this.sp.atkCd;
        this.biteT = 0.32;
        pool.burst(V3(this.pos.x + dxw / (dWolf || 1) * 1.2, this.pos.y + 1, this.pos.z + dzw / (dWolf || 1) * 1.2), 8, 0xff5040, 0.8, 1.6, 2.2);
        if (dWolf < this.sp.reach) wolfTakeDamage(this.sp.dmg, this.pos, this.sp.label, this.sp.icon);
      }
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
    }
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.heading;
    this.phase += dt * (2 + speed * 1.7);
    const amp = clamp(speed * 0.12, 0, 0.62);
    this.legs[0].rotation.x = Math.sin(this.phase) * amp;
    this.legs[1].rotation.x = Math.sin(this.phase + Math.PI) * amp;
    this.legs[2].rotation.x = Math.sin(this.phase + Math.PI) * amp;
    this.legs[3].rotation.x = Math.sin(this.phase) * amp;
    if (this.biteT > 0) { this.biteT -= dt; this.head.rotation.x = 0.55; }
    else this.head.rotation.x = this.state === 'attack' || this.state === 'chase' ? 0.18 : Math.sin(tSec * 0.5 + this.phase) * 0.25;
  }
  dispose() {
    if (!this.dead) { this.dead = true; predatorTotal--; }
    scene.remove(this.model);
  }
}
