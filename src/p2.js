/* ================================================================
   Part 2 — scene, sky, particles, vegetation library
   ================================================================ */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------------- renderer / scene / lights ---------------- */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}
if (!webglAvailable()) {
  document.getElementById('ovTitle').textContent = 'WEBGL UNAVAILABLE';
  document.getElementById('ovBody').innerHTML =
    '<div class="ov-tip" style="font-size:15px;line-height:2">This viewer or device has WebGL blocked, so the 3D wilderness cannot render here.<br><br>' +
    '⬇ <b>Download index.html</b> and open it in Chrome, Edge or Firefox —<br>the entire game lives inside that one file, no internet needed.</div>';
  throw new Error('WebGL unavailable');
}
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY === 'low' ? 1 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = QUALITY !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
renderer.domElement.id = 'game';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b7d9);
scene.fog = new THREE.Fog(0x87b7d9, 70, 165);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2500);

const hemi = new THREE.HemisphereLight(0xbcd8ee, 0x59503e, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
sun.castShadow = QUALITY !== 'low';
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -62; sun.shadow.camera.right = 62;
sun.shadow.camera.top = 62; sun.shadow.camera.bottom = -62;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 420;
sun.shadow.bias = -0.0007;
scene.add(sun); scene.add(sun.target);

/* ---------------- canvas textures ---------------- */
function canvasTex(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  return t;
}
const texSoft = canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const texStreak = canvasTex(32, (g, s) => {
  const gr = g.createLinearGradient(0, 0, 0, s);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.35, 'rgba(255,255,255,.9)');
  gr.addColorStop(0.65, 'rgba(255,255,255,.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(s * 0.42, 0, s * 0.16, s);
});
const texCloud = canvasTex(256, (g, s) => {
  const rr = mulberry32(7);
  for (let i = 0; i < 14; i++) {
    const x = s * (0.2 + rr() * 0.6), y = s * (0.35 + rr() * 0.3), r = s * (0.09 + rr() * 0.16);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
});
const texGlow = canvasTex(128, (g, s) => {
  const gr = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,244,214,.85)');
  gr.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const texMoon = canvasTex(128, (g, s) => {
  const c = s / 2;
  const gr = g.createRadialGradient(c, c, s * 0.2, c, c, c);
  gr.addColorStop(0, 'rgba(235,240,250,1)'); gr.addColorStop(0.72, 'rgba(215,224,240,1)');
  gr.addColorStop(0.82, 'rgba(190,205,230,.35)'); gr.addColorStop(1, 'rgba(190,205,230,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
  g.fillStyle = 'rgba(160,175,200,.5)';
  [[0.38, 0.4, 0.07], [0.6, 0.55, 0.05], [0.45, 0.68, 0.04], [0.62, 0.32, 0.03]].forEach(([x, y, r]) => {
    g.beginPath(); g.arc(s * x, s * y, s * r, 0, 7); g.fill();
  });
});
const texWing = canvasTex(32, (g, s) => {
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath(); g.ellipse(s * 0.32, s * 0.5, s * 0.28, s * 0.18, -0.4, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.68, s * 0.5, s * 0.28, s * 0.18, 0.4, 0, 7); g.fill();
});
const texAurora = canvasTex(256, (g, s) => {
  const rr = mulberry32(23);
  const cols = ['rgba(90,255,180,', 'rgba(60,230,160,', 'rgba(120,220,255,', 'rgba(180,120,255,'];
  for (let i = 0; i < 46; i++) {
    const x = rr() * s, w = 2 + rr() * 9;
    const col = cols[(rr() * cols.length) | 0];
    const topFade = g.createLinearGradient(0, 0, 0, s);
    topFade.addColorStop(0, col + '0)');
    topFade.addColorStop(0.45, col + (0.25 + rr() * 0.5) + ')');
    topFade.addColorStop(0.85, col + (0.1 + rr() * 0.3) + ')');
    topFade.addColorStop(1, col + '0)');
    g.fillStyle = topFade;
    g.fillRect(x, 0, w, s);
  }
});

/* ---------------- sky group ---------------- */
const skyG = new THREE.Group();
scene.add(skyG);

const stars = (() => {
  const N = 800, pos = new Float32Array(N * 3);
  const rr = mulberry32(99);
  for (let i = 0; i < N; i++) {
    let x, y, z, l;
    do { x = rr() * 2 - 1; y = rr(); z = rr() * 2 - 1; l = Math.hypot(x, y, z); } while (l > 1 || l < 0.3);
    pos[i*3] = x / l * 900; pos[i*3+1] = y / l * 900; pos[i*3+2] = z / l * 900;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.2, sizeAttenuation: false, map: texSoft, transparent: true,
    opacity: 0, depthWrite: false, fog: false, color: 0xdfe8ff
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false; skyG.add(p); return p;
})();

const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: texGlow, color: 0xffdda8, transparent: true, opacity: 1,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false
}));
sunSprite.scale.set(210, 210, 1); skyG.add(sunSprite);

const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: texMoon, transparent: true, opacity: 0, depthWrite: false, fog: false
}));
moonSprite.scale.set(70, 70, 1); skyG.add(moonSprite);

const auroraBands = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1000 - i * 160, 190 + i * 40),
    new THREE.MeshBasicMaterial({
      map: texAurora, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide
    })
  );
  m.position.set((i - 1) * 130, 300 + i * 45, -420 - i * 90);
  m.rotation.x = -0.25; m.rotation.z = (i - 1) * 0.14;
  m.userData.phase = i * 2.1;
  skyG.add(m); auroraBands.push(m);
}

const clouds = [];
for (let i = 0; i < 16; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texCloud, transparent: true, opacity: 0, depthWrite: false, fog: false
  }));
  const rr = mulberry32(500 + i);
  sp.position.set((rr() - 0.5) * 1300, 115 + rr() * 45, (rr() - 0.5) * 1300);
  const s = 190 + rr() * 230;
  sp.scale.set(s, s * 0.42, 1);
  sp.userData.speed = 0.6 + rr() * 0.8;
  skyG.add(sp); clouds.push(sp);
}

/* ---------------- water ---------------- */
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x2f6d92, transparent: true, opacity: 0.78, roughness: 0.3, metalness: 0.12
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1700), waterMat);
water.rotation.x = -Math.PI / 2;
water.position.y = WATER_Y;
scene.add(water);

/* ---------------- particle systems ---------------- */
function makePrecipitation(count, boxX, boxY, boxZ, size, map, color, opacity) {
  const pos = new Float32Array(count * 3);
  const rr = mulberry32(count);
  for (let i = 0; i < count; i++) {
    pos[i*3] = (rr() - 0.5) * boxX;
    pos[i*3+1] = (rr() - 0.5) * boxY;
    pos[i*3+2] = (rr() - 0.5) * boxZ;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.PointsMaterial({
    size, map, color, transparent: true, opacity, depthWrite: false
  });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false; pts.frustumCulled = false;
  scene.add(pts);
  return { pts, count, boxX, boxY, boxZ, rr: mulberry32(count * 7 + 1) };
}
const rainSys = makePrecipitation(2200, 90, 36, 90, 1.7, texStreak, 0xa8c4d8, 0.4);
const snowSys = makePrecipitation(1700, 80, 26, 80, 2.4, texSoft, 0xffffff, 0.9);

function updatePrecipitation(sys, amount, fall, sway, dt, tSec) {
  if (amount <= 0.01) { sys.pts.visible = false; return; }
  sys.pts.visible = true;
  const n = Math.min(sys.count, Math.floor(sys.count * amount));
  sys.pts.geometry.setDrawRange(0, n);
  sys.pts.material.opacity = Math.min(0.95, 0.25 + amount * 0.6);
  const pos = sys.pts.geometry.attributes.position;
  const cam = camera.position;
  const windX = weather.wind * 9;
  for (let i = 0; i < n; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    y -= fall * dt;
    x += (windX + Math.sin(tSec * 1.3 + i) * sway) * dt;
    if (y < cam.y - sys.boxY * 0.55 || Math.abs(x - cam.x) > sys.boxX * 0.55 || Math.abs(z - cam.z) > sys.boxZ * 0.55) {
      y = cam.y + sys.boxY * 0.45 + sys.rr() * 6;
      x = cam.x + (sys.rr() - 0.5) * sys.boxX;
      z = cam.z + (sys.rr() - 0.5) * sys.boxZ;
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
}

/* generic additive burst pool (sparkles, dust, poofs) */
const pool = (() => {
  const N = 260;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3), life = new Float32Array(N), maxLife = new Float32Array(N);
  const base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -9999;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.PointsMaterial({
    size: 3.4, map: texSoft, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; scene.add(pts);
  let cursor = 0;
  return {
    burst(center, n, colorHex, spread, up, speed) {
      const c = new THREE.Color(colorHex);
      for (let k = 0; k < n; k++) {
        const i = cursor; cursor = (cursor + 1) % N;
        pos[i*3]   = center.x + (Math.random() - 0.5) * spread;
        pos[i*3+1] = center.y + (Math.random() - 0.5) * spread * 0.5 + 0.2;
        pos[i*3+2] = center.z + (Math.random() - 0.5) * spread;
        base[i*3] = c.r; base[i*3+1] = c.g; base[i*3+2] = c.b;
        vel[i*3]   = (Math.random() - 0.5) * speed;
        vel[i*3+1] = up * (0.4 + Math.random() * 0.9);
        vel[i*3+2] = (Math.random() - 0.5) * speed;
        life[i] = maxLife[i] = 0.6 + Math.random() * 0.7;
      }
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) { pos[i*3+1] = -9999; col[i*3] = col[i*3+1] = col[i*3+2] = 0; continue; }
        pos[i*3]   += vel[i*3] * dt;
        pos[i*3+1] += vel[i*3+1] * dt;
        pos[i*3+2] += vel[i*3+2] * dt;
        vel[i*3+1] -= 2.4 * dt;
        const f = life[i] / maxLife[i];
        col[i*3] = base[i*3] * f; col[i*3+1] = base[i*3+1] * f; col[i*3+2] = base[i*3+2] * f;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  };
})();

/* butterflies (day, warm biomes) & fireflies (night, forest biomes) — removed:
   the floating light specks read as noise rather than life, so the ambience now
   comes from weather, aurora and audio alone */

/* ---------------- shared materials & geometry baking ---------------- */
const furTex = (() => {
  const t = canvasTex(128, (g, s) => {
    g.fillStyle = '#9aa1a9';
    g.fillRect(0, 0, s, s);
    const rr = mulberry32(11);
    for (let i = 0; i < 2800; i++) {
      const x = rr() * s, y = rr() * s, len = 3 + rr() * 10;
      g.strokeStyle = rr() < 0.5
        ? `rgba(255,255,255,${0.04 + rr() * 0.1})`
        : `rgba(18,22,28,${0.04 + rr() * 0.1})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y - len / 2);
      g.lineTo(x + (rr() - 0.5) * 2, y + len / 2);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
const matTerrain  = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
const matVeg      = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
const matMagic = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, emissive: 0x8a4fff, emissiveIntensity: 0.42 });
const matColorCache = {};
function matColor(hex) {
  if (!matColorCache[hex]) matColorCache[hex] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0, bumpMap: furTex, bumpScale: 0.008 });
  return matColorCache[hex];
}

function bakeParts(parts) {
  const pos = [], col = [];
  const M = new THREE.Matrix4(), NM = new THREE.Matrix3();
  const c = new THREE.Color();
  for (const [geo, colorHex, m] of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    M.identity(); if (m) M.copy(m);
    NM.getNormalMatrix(M);
    c.set(colorHex);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(M);
      pos.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    }
    if (geo.index) g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}
function T(x, y, z, rx, ry, rz, s) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s || 1, s || 1, s || 1));
  return m;
}

/* ---------------- vegetation / prop geometry library ---------------- */
const G = {};
(function buildLib() {
  const cyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg || 6);
  const cone = (r, h, seg) => new THREE.ConeGeometry(r, h, seg || 7);
  const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
  const dod = (r) => new THREE.DodecahedronGeometry(r, 0);
  const plane = (w, h) => new THREE.PlaneGeometry(w, h);
  const sph = (r) => new THREE.SphereGeometry(r, 5, 4);

  G.spruce = bakeParts([
    [cyl(0.1, 0.18, 2.2), 0x5f4230, T(0, 1.1, 0)],
    [cone(1.75, 1.9), 0x2c4a32, T(0, 2.6, 0)],
    [cone(1.45, 1.7), 0x33553a, T(0, 3.7, 0)],
    [cone(1.12, 1.5), 0x2c4a32, T(0, 4.75, 0)],
    [cone(0.8, 1.3), 0x33553a, T(0, 5.7, 0)],
    [cone(0.5, 1.15), 0x3a5f42, T(0, 6.5, 0)]
  ]);
  G.snowSpruce = bakeParts([
    [cyl(0.1, 0.18, 2.2), 0x5f4230, T(0, 1.1, 0)],
    [cone(1.75, 1.9), 0x39604a, T(0, 2.6, 0)],
    [cone(1.45, 1.7), 0x3f6a52, T(0, 3.7, 0)],
    [cone(1.12, 1.5), 0x47755c, T(0, 4.75, 0)],
    [cone(0.8, 1.3), 0x4d7c63, T(0, 5.7, 0)],
    [cone(0.5, 1.15), 0x54826a, T(0, 6.5, 0)],
    [cone(0.95, 0.7), 0xecf2f5, T(0, 4.1, 0)],
    [cone(0.68, 0.62), 0xecf2f5, T(0, 5.1, 0)],
    [cone(0.42, 0.52), 0xeef3f6, T(0, 5.95, 0)],
    [cone(0.22, 0.4), 0xecf2f5, T(0, 6.75, 0)]
  ]);
  G.pine = bakeParts([
    [cyl(0.12, 0.2, 2.6), 0x64452f, T(0, 1.3, 0)],
    [cone(1.9, 2.1), 0x2f5738, T(0, 3.0, 0)],
    [cone(1.4, 1.8), 0x376344, T(0, 4.4, 0)],
    [cone(0.95, 1.5), 0x2f5738, T(0, 5.6, 0)],
    [cone(0.55, 1.2), 0x3b6a48, T(0, 6.6, 0)]
  ]);
  G.birch = bakeParts([
    [cyl(0.07, 0.12, 3.4), 0xe6eaea, T(0, 1.7, 0)],
    [ico(1.0), 0x82ac4a, T(0, 4.1, 0)],
    [ico(0.75), 0x8fb757, T(0.5, 5.0, 0.2)],
    [ico(0.65), 0x76a244, T(-0.55, 4.5, -0.25)],
    [ico(0.5), 0x8ab352, T(0.05, 5.55, -0.35)]
  ]);
  G.autumnBirch = bakeParts([
    [cyl(0.07, 0.12, 3.4), 0xe6eaea, T(0, 1.7, 0)],
    [ico(1.0), 0xd8862c, T(0, 4.1, 0)],
    [ico(0.75), 0xc7563a, T(0.5, 5.0, 0.2)],
    [ico(0.65), 0xe0b13d, T(-0.55, 4.5, -0.25)],
    [ico(0.5), 0xd99a30, T(0.05, 5.55, -0.35)]
  ]);
  G.rowan = bakeParts([
    [cyl(0.07, 0.11, 2.8), 0x6f5238, T(0, 1.4, 0)],
    [ico(0.7), 0x5d7d3a, T(0, 3.4, 0)],
    [ico(0.5), 0x527236, T(0.4, 4.2, 0.15)],
    [ico(0.42), 0x668842, T(-0.38, 3.9, -0.2)],
    [sph(0.08), 0xe0512f, T(0.3, 3.2, 0.32)], [sph(0.08), 0xe0512f, T(-0.35, 3.4, 0.15)],
    [sph(0.08), 0xe0512f, T(0.1, 3.7, 0.42)], [sph(0.08), 0xe0512f, T(-0.15, 4.3, -0.3)],
    [sph(0.08), 0xe0512f, T(0.45, 4.0, -0.12)], [sph(0.07), 0xe0512f, T(0.05, 4.5, 0.2)]
  ]);
  G.oak = bakeParts([
    [cyl(0.17, 0.3, 2.2), 0x63432c, T(0, 1.1, 0)],
    [ico(1.5), 0x44682f, T(0, 3.4, 0)],
    [ico(1.15), 0x4c7136, T(0.95, 4.2, 0.3)],
    [ico(1.05), 0x3f6129, T(-0.9, 3.8, -0.35)],
    [ico(0.9), 0x4a6d33, T(0.1, 4.9, -0.5)]
  ]);
  G.deadTree = bakeParts([
    [cyl(0.08, 0.17, 3.6), 0x8a8276, T(0, 1.8, 0)],
    [cyl(0.03, 0.06, 1.3), 0x837b70, T(0.5, 2.7, 0, 0, 0, -0.95)],
    [cyl(0.03, 0.05, 1.1), 0x837b70, T(-0.45, 2.2, 0, 0, 0, 1.15)],
    [cyl(0.025, 0.045, 0.9), 0x7c746a, T(0.15, 3.4, -0.1, 0, 0, -0.5)]
  ]);
  G.dwarfPine = bakeParts([
    [cone(0.85, 1.2), 0x3a5f45, T(0, 0.6, 0)],
    [cone(0.55, 0.95), 0x446b50, T(0, 1.3, 0)],
    [cone(0.3, 0.7), 0x4c7557, T(0, 1.85, 0)]
  ]);
  G.bush = bakeParts([
    [ico(0.55), 0x3c6640, T(0, 0.5, 0)],
    [ico(0.42), 0x446c42, T(0.45, 0.42, 0.12)],
    [ico(0.38), 0x37603b, T(-0.42, 0.4, 0.2)],
    [ico(0.3), 0x487046, T(0.05, 0.72, -0.3)]
  ]);
  G.rock = bakeParts([[dod(1), 0x8f9297, T(0, 0.25, 0, 0.2, 0.4, 0.15, 1)]]);
  G.grassTuft = bakeParts([
    [plane(0.9, 1.0), 0x76a44e, T(0, 0.5, 0)],
    [plane(0.9, 1.0), 0x76a44e, T(0, 0.5, 0, 0, Math.PI / 3, 0)],
    [plane(0.9, 1.0), 0x76a44e, T(0, 0.5, 0, 0, Math.PI * 2 / 3, 0)]
  ]);
  G.flower = bakeParts([
    [cyl(0.02, 0.02, 0.55), 0x4f7d3a, T(0, 0.27, 0)],
    [ico(0.13), 0xffffff, T(0, 0.6, 0)],
    [ico(0.1), 0xffffff, T(0.14, 0.46, 0.08)]
  ]);
  G.berryBush = bakeParts([
    [ico(0.5), 0x3f6b3d, T(0, 0.4, 0)], [ico(0.38), 0x486f42, T(0.4, 0.32, 0.2)],
    [ico(0.34), 0x3a6338, T(-0.35, 0.3, -0.18)],
    [sph(0.075), 0xc2223a, T(0.2, 0.55, 0.28)], [sph(0.075), 0xc2223a, T(-0.3, 0.6, 0.1)],
    [sph(0.075), 0xc2223a, T(0.05, 0.3, 0.42)], [sph(0.075), 0xc2223a, T(0.35, 0.45, -0.3)],
    [sph(0.075), 0xc2223a, T(-0.15, 0.75, 0.22)], [sph(0.075), 0xc2223a, T(-0.42, 0.42, 0.3)]
  ]);
  G.mushroom = bakeParts([
    [cyl(0.05, 0.075, 0.3), 0xefe7d8, T(0, 0.15, 0)],
    [new THREE.SphereGeometry(0.22, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0xb3342c, T(0, 0.28, 0)],
    [sph(0.035), 0xf5efe2, T(0.1, 0.38, 0.06)], [sph(0.03), 0xf5efe2, T(-0.08, 0.4, -0.07)],
    [sph(0.03), 0xf5efe2, T(0.02, 0.43, 0.12)]
  ]);
  G.magicShroom = bakeParts([
    [cyl(0.055, 0.09, 0.5), 0xe8ddf5, T(0, 0.25, 0)],
    [new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0x7d3cc9, T(0, 0.46, 0)],
    [new THREE.SphereGeometry(0.18, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x9a5ee0, T(0, 0.63, 0)],
    [sph(0.05), 0x7ef0ff, T(0.12, 0.6, 0.09)], [sph(0.045), 0x7ef0ff, T(-0.11, 0.55, 0.13)],
    [sph(0.04), 0x7ef0ff, T(0.02, 0.68, -0.13)], [sph(0.03), 0x7ef0ff, T(-0.04, 0.7, 0.1)]
  ]);
  G.herb = bakeParts([
    [plane(0.5, 0.6), 0x9fc57a, T(0, 0.3, 0)],
    [plane(0.5, 0.6), 0x9fc57a, T(0, 0.3, 0, 0, Math.PI / 2.5, 0)],
    [sph(0.05), 0xf3f7e8, T(0.1, 0.6, 0.05)], [sph(0.045), 0xf3f7e8, T(-0.08, 0.55, 0.1)]
  ]);
  G.stick = bakeParts([
    [cyl(0.03, 0.05, 0.85), 0x7d5b3a, T(0, 0.07, 0, 0, 0.4, 1.45)]
  ]);
  G.stoneP = bakeParts([[dod(0.24), 0x9a9da2, T(0, 0.14, 0, 0.3, 0.5, 0.2, 1)]]);
})();

function makeInstanced(geom, mat, items, shadow) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geom, mat, items.length);
  const d = new THREE.Object3D();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    d.position.set(it.x, it.y, it.z);
    d.rotation.set(0, it.ry || 0, 0);
    const s = it.s || 1;
    d.scale.set(s, s, s);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
    if (it.tint) m.setColorAt(i, it.tint);
  }
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = !!shadow;
  m.receiveShadow = true;
  m.frustumCulled = false;
  return m;
}
