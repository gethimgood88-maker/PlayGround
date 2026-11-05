import * as THREE from 'three';
import {
  TAU, clamp, damp, rand, randInt, pick, lerp, smoothstep,
  canvasTexture, makeGrassTexture, makeAsphaltTexture, makeConcreteTexture,
  makeSidingTexture, makeRoofTexture, makeSky, makeSignTexture, makeTextSprite,
  box, plane,
} from './utils.js';

export const HOUSE_DEFS = [
  {
    id: 'miller', lot: '01', name: 'THE MILLER HOUSE', short: 'MILLER', theme: 'miller',
    style: 'ranch', tag: 'A CHARMING 1958 RANCH', sub: '3 BED · 2 BATH · 1 ABYSS',
    body: '#dca6a4', accent: '#713847', roof: '#5b3041', trim: '#f0dfc6',
    difficulty: 1, locked: false,
  },
  {
    id: 'vega', lot: '02', name: 'CASA VEGA', short: 'VEGA', theme: 'vega',
    style: 'villa', tag: 'A SUN-DRENCHED VILLA', sub: '4 BED · 3 BATH · ETERNAL HEAT',
    body: '#d99a6c', accent: '#7e332c', roof: '#8e3d2c', trim: '#f3ddbc',
    difficulty: 2, locked: false,
  },
  {
    id: 'ashby', lot: '03', name: 'THE ASHBY SPLIT', short: 'ASHBY', theme: 'ashby',
    style: 'split', tag: 'A GROOVY SPLIT-LEVEL', sub: '3 BED · 1 BATH · 4 DIMENSIONS',
    body: '#a58757', accent: '#4c3928', roof: '#3d2c22', trim: '#dfcbb0',
    difficulty: 3, locked: false,
  },
  {
    id: 'glass', lot: '04', name: 'THE GLASS HOUSE', short: 'GLASS', theme: 'glass',
    style: 'modern', tag: 'A MINIMALIST STATEMENT', sub: '5 BED · 4 BATH · NO EXIT',
    body: '#dfddd2', accent: '#5d6260', roof: '#4b4e4d', trim: '#f4ecd9',
    difficulty: 4, locked: false,
  },
  {
    id: 'hollow', lot: '05', name: 'HOLLOWAY MANOR', short: 'HOLLOWAY', theme: 'hollow',
    style: 'victorian', tag: 'A HISTORIC CENTERPIECE',
    sub: '7 BED · 5 BATH · 1 THRONE', body: '#7e698d', accent: '#382544', roof: '#2b1a35', trim: '#e6d5bf',
    difficulty: 5, locked: true,
  },
];

const HOUSE_RADIUS = 26.5;

function pyramidRoof(w, d, h, mat, overhang = .55) {
  const W = w / 2 + overhang, D = d / 2 + overhang;
  const positions = [];
  const apex = [0, h, 0];
  const corners = [[-W, 0, -D], [W, 0, -D], [W, 0, D], [-W, 0, D]];
  const faces = [[2, 3], [1, 2], [0, 1], [3, 0]];
  for (const [a, b] of faces) {
    const A = corners[a], B = corners[b];
    positions.push(...A, ...apex, ...B);
  }
  positions.push(...corners[0], ...corners[2], ...corners[1], ...corners[0], ...corners[3], ...corners[2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function gableRoof(w, d, h, mat, overhang = .5) {
  const W = w / 2 + overhang, D = d / 2 + overhang;
  const geo = new THREE.BufferGeometry();
  const p = [
    [-W, 0, -D], [W, 0, -D], [0, h, -D], [-W, 0, D], [W, 0, D], [0, h, D],
  ];
  const idx = [
    0, 1, 2, 3, 5, 4, 0, 2, 5, 0, 5, 3, 1, 4, 5, 1, 5, 2,
  ];
  const pos = [];
  for (const i of idx) pos.push(...p[i]);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function makeGlowTexture(color = '255,90,70') {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, `rgba(${color},.95)`);
    g.addColorStop(.25, `rgba(${color},.42)`);
    g.addColorStop(.7, `rgba(${color},.08)`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

function makeTree(scale = 1, foliage = '#385b43') {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#453129', roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18 * scale, .32 * scale, 2.4 * scale, 6), trunkMat);
  trunk.position.y = 1.2 * scale; trunk.castShadow = true; g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: foliage, roughness: .95, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry((1.25 - i * .15) * scale, 0), leafMat);
    m.position.set((i - 1) * .55 * scale, (2.5 + i * .4) * scale, (i % 2) * .3 * scale);
    m.scale.y = .9; m.rotation.set(rand(0, 3), rand(0, 3), 0);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  g.userData.leafMat = leafMat;
  return g;
}

function makePicketFence(length, color = '#e7dcc8') {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: .9 });
  const n = Math.max(2, Math.round(length / .55));
  for (let i = 0; i < n; i++) {
    const p = box(.09, .9, .13, mat, -length / 2 + i * (length / (n - 1)), .52, 0);
    p.geometry = new THREE.ConeGeometry(.1, .16, 4);
    p.geometry.rotateY(Math.PI / 4);
    p.position.y = 1.02;
    g.add(p);
    const post = box(.1, .88, .1, mat, p.position.x, .47, 0);
    g.add(post);
  }
  g.add(box(length, .09, .08, mat, 0, .28, 0));
  g.add(box(length, .09, .08, mat, 0, .72, 0));
  return g;
}

function makeMailbox(accent) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#4c3429', roughness: 1 });
  g.add(box(.13, 1.4, .13, wood, 0, .7, 0));
  const bodyMat = new THREE.MeshStandardMaterial({ color: accent, roughness: .55, metalness: .15 });
  g.add(box(.48, .35, .72, bodyMat, 0, 1.42, 0));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .48, 10, 1, false, 0, Math.PI), bodyMat);
  cap.rotation.z = Math.PI / 2; cap.rotation.y = Math.PI / 2; cap.position.set(0, 1.6, 0); g.add(cap);
  const flagMat = new THREE.MeshStandardMaterial({ color: '#d53838' });
  g.add(box(.04, .38, .22, flagMat, .29, 1.7, -.1));
  return g;
}

function makeLamp(color = '#ffc978') {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#292229', roughness: .55, metalness: .5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .13, 4.7, 8), metal);
  pole.position.y = 2.35; pole.castShadow = true; g.add(pole);
  const arm = box(.8, .08, .08, metal, .35, 4.55, 0); g.add(arm);
  const bulbMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3.2, roughness: .2 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), bulbMat);
  bulb.position.set(.72, 4.42, 0); g.add(bulb);
  const shadeMat = new THREE.MeshStandardMaterial({ color: '#1c151c', roughness: .6 });
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.42, .32, 8, 1, true), shadeMat);
  shade.position.set(.72, 4.65, 0); shade.rotation.x = Math.PI; g.add(shade);
  return g;
}

export class Neighborhood {
  constructor(scene, audio, renderer) {
    this.scene = scene;
    this.audio = audio;
    this.renderer = renderer;
    this.houses = [];
    this.colliders = [];
    this.player = null;
    this.camYaw = 0;
    this.camPitch = .31;
    this.camDist = 11.4;
    this.playerPos = new THREE.Vector3(0, 0, 24);
    this.playerVel = new THREE.Vector3();
    this.walkPhase = 0;
    this.stepTimer = 0;
    this.time = 0;
    this.nearHouse = null;
    this.camPos = new THREE.Vector3(0, 8, 20);
    this.camTarget = new THREE.Vector3();
    this.embers = null;
    this.glowSprites = [];
    this.fountainGlow = null;
    this.build();
  }

  build() {
    const scene = this.scene;
    scene.background = new THREE.Color('#3a1e36');
    scene.fog = new THREE.FogExp2('#5e2c4a', .0085);
    scene.add(makeSky());

    const hemi = new THREE.HemisphereLight('#c98a96', '#2d2236', 2.0);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight('#ffbd94', 3.0);
    dir.position.set(-28, 38, 18);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -40; dir.shadow.camera.right = 40;
    dir.shadow.camera.top = 40; dir.shadow.camera.bottom = -40;
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 100;
    dir.shadow.bias = -.0007;
    scene.add(dir);
    const fill = new THREE.DirectionalLight('#6f7bff', .45);
    fill.position.set(30, 20, -30); scene.add(fill);

    const grassTex = makeGrassTexture();
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, color: '#72835a', roughness: 1 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(78, 80), groundMat);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const asphalt = new THREE.Mesh(
      new THREE.RingGeometry(13.3, 19.5, 96),
      new THREE.MeshStandardMaterial({ map: makeAsphaltTexture(), color: '#66616c', roughness: .96 })
    );
    asphalt.rotation.x = -Math.PI / 2; asphalt.position.y = .025; asphalt.receiveShadow = true; scene.add(asphalt);

    const concreteTex = makeConcreteTexture('#c2b39f');
    const curbMat = new THREE.MeshStandardMaterial({ map: concreteTex, color: '#d3c7b3', roughness: .9 });
    const sidewalkOuter = new THREE.Mesh(new THREE.RingGeometry(19.5, 20.7, 96), curbMat);
    sidewalkOuter.rotation.x = -Math.PI / 2; sidewalkOuter.position.y = .045; sidewalkOuter.receiveShadow = true; scene.add(sidewalkOuter);
    const sidewalkInner = new THREE.Mesh(new THREE.RingGeometry(12.5, 13.3, 96), curbMat);
    sidewalkInner.rotation.x = -Math.PI / 2; sidewalkInner.position.y = .04; sidewalkInner.receiveShadow = true; scene.add(sidewalkInner);
    const curb = new THREE.Mesh(new THREE.TorusGeometry(13.3, .14, 5, 96), curbMat);
    curb.rotation.x = -Math.PI / 2; curb.position.y = .13; scene.add(curb);
    const curb2 = curb.clone(); curb2.geometry = new THREE.TorusGeometry(19.5, .14, 5, 96); curb2.position.y = .13; scene.add(curb2);

    // dashed road markings
    const dashMat = new THREE.MeshBasicMaterial({ color: '#e5c97d' });
    const dashGeo = new THREE.BoxGeometry(.17, .012, 1.3);
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * TAU;
      const d = new THREE.Mesh(dashGeo, dashMat);
      d.position.set(Math.sin(a) * 16.4, .065, Math.cos(a) * 16.4);
      d.rotation.y = a; scene.add(d);
    }

    // central island
    const island = new THREE.Mesh(new THREE.CircleGeometry(12.55, 64), groundMat.clone());
    island.rotation.x = -Math.PI / 2; island.position.y = .05; island.receiveShadow = true; scene.add(island);
    this.buildFountain();

    // houses and lots
    HOUSE_DEFS.forEach((def, i) => {
      const a = -Math.PI / 2 + i * TAU / 5;
      const x = Math.cos(a) * HOUSE_RADIUS;
      const z = Math.sin(a) * HOUSE_RADIUS;
      const rot = Math.atan2(-x, -z);
      const house = this.buildHouse(def, i, x, z, rot);
      this.houses.push(house);
      scene.add(house.group);
    });

    // street lamps
    const lampSpots = [
      [-18.6, -10.4], [20.3, -7.2], [17.2, 17.1], [-17.2, 17.1], [-21.7, 4.5],
    ];
    lampSpots.forEach(([x, z], i) => {
      const lamp = makeLamp(i % 2 ? '#ff9b6b' : '#ffd08e');
      lamp.position.set(x, 0, z);
      lamp.rotation.y = Math.atan2(-x, -z);
      scene.add(lamp);
      const glow = this.makeGlowSprite('#ffb36e', 4.6);
      glow.position.set(x, 4.42, z); scene.add(glow); this.glowSprites.push(glow);
    });

    // trees & shrubs around lots and outside
    this.trees = [];
    const treeSpots = [
      [-10.8, -24.5, 1.1], [9.5, -29.8, .9], [27.8, 3.2, 1.0], [31.8, -17.6, .8],
      [7.2, 30.3, 1.2], [-8.2, 29.1, .9], [-30.5, 1.4, 1.0], [-28.4, 18.9, .85],
      [22.7, 28.2, 1.0], [-33.8, -15.4, .9], [35.5, 12.5, .8], [1.5, -39.5, 1.2],
      [-37.5, 10.8, 1.1], [34.7, -30.8, 1.0], [-13.5, 39.5, .9],
    ];
    treeSpots.forEach(([x, z, s], i) => {
      const t = makeTree(s, i % 3 === 0 ? '#3c624d' : i % 3 === 1 ? '#49633c' : '#345442');
      t.position.set(x, 0, z); t.rotation.y = rand(0, TAU); scene.add(t);
      this.trees.push(t);
      this.colliders.push({ type: 'circle', x, z, r: .5 * s });
    });

    // shrubs near houses
    const shrubMat = new THREE.MeshStandardMaterial({ color: '#3c5d3d', roughness: 1, flatShading: true });
    for (let i = 0; i < 45; i++) {
      const a = rand(0, TAU), r = rand(21, 37);
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(.35, .9), 0), shrubMat);
      s.position.set(Math.cos(a) * r, .4, Math.sin(a) * r);
      s.scale.y = .7; s.rotation.y = rand(0, TAU); s.castShadow = true; scene.add(s);
    }

    // a couple of parked hearses / cars
    this.buildCar(-22.7, -7.6, 2.2, '#44615e', '#e7dfcc');
    this.buildCar(23.9, 11.7, -2.4, '#9a4c63', '#2c2028');

    // distant mountain silhouette
    const mtnMat = new THREE.MeshBasicMaterial({ color: '#3b2142', fog: true });
    for (let i = 0; i < 27; i++) {
      const a = i / 27 * TAU + rand(-.04, .04);
      const r = 79 + rand(-6, 8);
      const h = rand(8, 24), w = rand(9, 20);
      const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 4), mtnMat);
      m.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r);
      m.rotation.y = rand(0, 1);
      m.scale.z = .55;
      scene.add(m);
    }

    // clouds
    const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffb0a3', transparent: true, opacity: .12, depthWrite: false });
    for (let i = 0; i < 12; i++) {
      const cl = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(rand(3, 7), 6, 4), cloudMat);
        s.position.set(rand(-6, 6), rand(-1, 1.5), rand(-3, 3)); s.scale.y = .35; cl.add(s);
      }
      const a = rand(0, TAU), r = rand(35, 80);
      cl.position.set(Math.cos(a) * r, rand(20, 38), Math.sin(a) * r);
      scene.add(cl);
    }

    this.buildPlayer();
    this.buildEmbers();
    this.resetPlayer();
  }

  makeGlowSprite(rgb, scale = 2) {
    if (rgb.startsWith('#')) {
      const n = parseInt(rgb.slice(1), 16);
      rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    }
    const tex = makeGlowTexture(rgb);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 });
    const s = new THREE.Sprite(mat);
    s.scale.set(scale, scale, 1);
    return s;
  }

  buildFountain() {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: '#b5a695', roughness: .82 });
    const darkStone = new THREE.MeshStandardMaterial({ color: '#6d635d', roughness: .9 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.35, .68, 40), stone);
    basin.position.y = .34; basin.receiveShadow = true; basin.castShadow = true; g.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.1, .15, 6, 40), darkStone);
    rim.rotation.x = Math.PI / 2; rim.position.y = .7; g.add(rim);
    const waterMat = new THREE.MeshStandardMaterial({ color: '#7d1738', emissive: '#9e1d35', emissiveIntensity: .65, roughness: .18, metalness: .4 });
    const water = new THREE.Mesh(new THREE.CircleGeometry(3.8, 36), waterMat);
    water.rotation.x = -Math.PI / 2; water.position.y = .59; g.add(water);
    g.add(box(1.1, 1.5, 1.1, darkStone, 0, 1.1, 0));
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.5, .8, 1.4, 8), stone);
    column.position.y = 2.25; g.add(column);
    // a small uncanny homeowner statue
    const statueMat = new THREE.MeshStandardMaterial({ color: '#5b4452', roughness: .85 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.9, 7), statueMat);
    body.position.y = 3.5; body.rotation.z = .08; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.36, 8, 6), statueMat);
    head.position.set(.08, 4.55, 0); g.add(head);
    const hornMat = new THREE.MeshStandardMaterial({ color: '#2b1e2a', roughness: .7 });
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(.1, .55, 6), hornMat);
      horn.position.set(.08 + s * .24, 4.9, 0); horn.rotation.z = s * -.4; g.add(horn);
    }
    for (const s of [-1, 1]) {
      const wing = box(.12, 1.2, .75, statueMat, .08 + s * .58, 3.75, -.1);
      wing.rotation.z = s * -.35; g.add(wing);
    }
    const eyes = new THREE.MeshBasicMaterial({ color: '#ff3b32' });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 4), eyes);
      e.position.set(.08 + s * .14, 4.57, .33); g.add(e);
    }
    const glow = this.makeGlowSprite('255,45,50', 8);
    glow.position.y = 3.3; g.add(glow); this.fountainGlow = glow;
    const light = new THREE.PointLight('#ff3b50', 1.2, 15, 2); light.position.y = 2.5; g.add(light);
    this.scene.add(g);
    this.colliders.push({ type: 'circle', x: 0, z: 0, r: 4.45 });
    this.fountain = g;
  }

  buildCar(x, z, rot, bodyColor, roofColor) {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: .4, metalness: .35 });
    const glass = new THREE.MeshStandardMaterial({ color: '#1b2630', roughness: .18, metalness: .5, emissive: '#1b1b32', emissiveIntensity: .25 });
    const tire = new THREE.MeshStandardMaterial({ color: '#151217', roughness: .9 });
    const body = box(4.1, .72, 1.9, paint, 0, .75, 0); g.add(body);
    const hood = box(1.4, .45, 1.83, paint, 1.45, 1.03, 0); g.add(hood);
    const cabin = box(2.1, .78, 1.72, glass, -.35, 1.35, 0); g.add(cabin);
    const roof = box(1.95, .13, 1.74, paint, -.35, 1.76, 0); g.add(roof);
    for (const sx of [-1.4, 1.35]) for (const sz of [-.9, .9]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .28, 12), tire);
      w.rotation.x = Math.PI / 2; w.position.set(sx, .4, sz); g.add(w);
    }
    // headlights
    for (const sz of [-.58, .58]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(.04, .2, .38), new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffb25b', emissiveIntensity: 2.5 }));
      l.position.set(2.17, .82, sz); g.add(l);
    }
    g.position.set(x, 0, z); g.rotation.y = rot; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(g);
    this.colliders.push({ type: 'obb', x, z, hx: 2.2, hz: 1.1, rot });
  }

  buildHouse(def, index, x, z, rot) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rot;

    const siding = new THREE.MeshStandardMaterial({ map: makeSidingTexture(def.body, 'rgba(60,25,35,.18)', def.style === 'split' ? 'brick' : def.style === 'villa' ? 'stucco' : def.style === 'modern' ? 'panel' : def.style === 'victorian' ? 'vertical' : 'siding'), roughness: .82 });
    const roofMat = new THREE.MeshStandardMaterial({ map: makeRoofTexture(def.roof, def.style === 'villa' ? 'tile' : 'shingle'), roughness: .9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: def.trim, roughness: .78 });
    const accentMat = new THREE.MeshStandardMaterial({ color: def.accent, roughness: .7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#241923', roughness: .8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#ffc078', emissive: '#ff5d2e', emissiveIntensity: 1.45, roughness: .22, metalness: .15 });
    const calmGlass = new THREE.MeshStandardMaterial({ color: '#d8bca0', emissive: '#c66b4a', emissiveIntensity: .35, roughness: .25 });
    const doorMat = new THREE.MeshStandardMaterial({ color: '#ff5b43', emissive: '#ff2f2f', emissiveIntensity: 1.1, roughness: .35, metalness: .1 });
    const windowGlass = index === 3 ? glassMat : calmGlass;

    // foundations and lawn patch
    group.add(box(11.5, .16, 9.4, new THREE.MeshStandardMaterial({ map: makeConcreteTexture('#b6a58f'), roughness: .95 }), 0, .08, 0));
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(9.6, 36), new THREE.MeshStandardMaterial({ map: makeGrassTexture('#526a42', '#3b5235'), roughness: 1 }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = .035; lawn.receiveShadow = true; group.add(lawn);

    let bodyW = 7.8, bodyD = 5.5, bodyH = 2.9, doorZ = bodyD / 2 + .03;

    if (def.style === 'ranch') {
      bodyW = 7.6; bodyD = 5.4; bodyH = 2.85; doorZ = bodyD / 2 + .03;
      const body = box(bodyW, bodyH, bodyD, siding, 0, bodyH / 2 + .16, 0); group.add(body);
      const roof = pyramidRoof(bodyW, bodyD, 2.5, roofMat); roof.position.y = bodyH + .16; group.add(roof);
      // garage
      group.add(box(3.5, 2.4, 4.6, siding, -5.35, 1.36, -.25));
      const garageRoof = pyramidRoof(3.4, 4.5, 1.15, roofMat, .45); garageRoof.position.set(-5.35, 2.56, -.25); group.add(garageRoof);
      group.add(box(2.8, 1.95, .12, trimMat, -5.3, 1.24, 2.11));
      for (let i = 0; i < 4; i++) group.add(box(2.75, .04, .05, accentMat, -5.3, .55 + i * .35, 2.18));
      // windows
      this.addWindow(group, -2.2, 1.72, bodyD / 2 + .07, 1.25, 1.15, 0, trimMat, windowGlass);
      this.addWindow(group, 2.2, 1.72, bodyD / 2 + .07, 1.25, 1.15, 0, trimMat, windowGlass);
      this.addWindow(group, bodyW / 2 + .07, 1.72, .8, 1.2, 1.1, Math.PI / 2, trimMat, windowGlass);
      this.addWindow(group, -bodyW / 2 - .07, 1.72, -.4, 1.0, 1.15, -Math.PI / 2, trimMat, windowGlass);
      // porch
      group.add(box(3.5, .18, 1.65, trimMat, 0, 2.55, 3.35));
      group.add(box(3.0, .12, 1.25, darkMat, 0, .15, 3.05));
      for (const sx of [-1.5, 1.5]) group.add(box(.16, 2.3, .16, trimMat, sx, 1.28, 3.55));
      // chimney
      group.add(box(.62, 1.75, .62, accentMat, 2.35, bodyH + 2.1, -.55));
      group.add(box(.85, .16, .85, darkMat, 2.35, bodyH + 3.0, -.55));
    } else if (def.style === 'villa') {
      bodyW = 8.2; bodyD = 5.6; bodyH = 3.5; doorZ = bodyD / 2 + .03;
      group.add(box(8.2, 3.5, 5.6, siding, 0, 1.91, 0));
      const roof = pyramidRoof(8.2, 5.6, 1.4, roofMat, .8); roof.position.y = 3.66; group.add(roof);
      group.add(box(.62, .52, 5.9, accentMat, -4.05, .42, 0));
      // arched porch
      group.add(box(4.5, .18, 1.8, trimMat, 0, 2.9, 3.55));
      group.add(box(4.4, .14, 1.4, darkMat, 0, .16, 3.3));
      for (const sx of [-1.85, 1.85]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(.2, .25, 2.65, 10), trimMat);
        col.position.set(sx, 1.47, 3.75); group.add(col);
      }
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.55, .15, 6, 22, Math.PI), trimMat);
      arch.position.set(0, 2.9, 3.82); group.add(arch);
      // tower
      group.add(box(2.1, 4.45, 2.1, siding, -3.15, 2.35, -.5));
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.7, 4), roofMat);
      towerRoof.rotation.y = Math.PI / 4; towerRoof.position.set(-3.15, 4.85, -.5); group.add(towerRoof);
      this.addWindow(group, -2.2, 1.85, bodyD / 2 + .07, 1.15, 1.15, 0, trimMat, windowGlass);
      this.addWindow(group, 2.2, 1.85, bodyD / 2 + .07, 1.15, 1.15, 0, trimMat, windowGlass);
      this.addWindow(group, -3.15, 3.2, 3.2, .85, 1.1, 0, trimMat, windowGlass);
      this.addWindow(group, bodyW / 2 + .07, 1.9, 1.0, 1.2, 1.05, Math.PI / 2, trimMat, windowGlass);
      // tile details
      group.add(box(8.0, .12, .15, accentMat, 0, 3.55, 2.84));
    } else if (def.style === 'split') {
      bodyW = 8.0; bodyD = 5.7; bodyH = 2.25; doorZ = bodyD / 2 + .03;
      group.add(box(8.0, 2.25, 5.7, siding, 0, 1.3, 0));
      const upperSiding = new THREE.MeshStandardMaterial({ map: makeSidingTexture('#8d6e49', 'rgba(30,20,10,.3)', 'siding'), roughness: .9 });
      group.add(box(5.4, 2.4, 4.8, upperSiding, -1.05, 3.62, -.45));
      group.add(box(7.9, .22, 5.8, darkMat, 0, 2.48, 0));
      group.add(box(5.6, .2, 4.9, darkMat, -1.05, 4.83, -.45));
      group.add(box(8.8, .15, 6.5, roofMat, -1.0, 4.96, -.45));
      // garage right
      group.add(box(3.2, 2.1, 4.4, siding, 5.65, 1.22, -.5));
      group.add(box(3.6, .16, 4.8, roofMat, 5.65, 2.34, -.5));
      group.add(box(2.5, 1.8, .1, trimMat, 5.65, 1.12, 1.72));
      // entry
      group.add(box(2.6, .16, 1.5, darkMat, 1.0, .18, 3.15));
      group.add(box(2.7, .16, 1.6, darkMat, 1.0, 2.4, 3.2));
      group.add(box(.14, 2.25, .14, trimMat, -.25, 1.24, 3.6));
      group.add(box(.14, 2.25, .14, trimMat, 2.25, 1.24, 3.6));
      this.addWindow(group, -1.05, 3.55, 1.98, 2.1, 1.0, 0, trimMat, windowGlass);
      this.addWindow(group, -3.2, 3.55, .98, 1.0, 1.0, 0, trimMat, windowGlass);
      this.addWindow(group, 2.45, 1.55, 2.87, 1.35, 1.0, 0, trimMat, windowGlass);
      this.addWindow(group, 4.1, 1.6, -.5, 1.15, .95, 0, trimMat, windowGlass);
      // steps
      for (let i = 0; i < 3; i++) group.add(box(1.2 + i * .3, .16, .5 - i * .12, darkMat, 1.0, .08 + i * .15, 4.0 + i * .45));
    } else if (def.style === 'modern') {
      bodyW = 8.4; bodyD = 5.7; bodyH = 2.8; doorZ = bodyD / 2 + .03;
      group.add(box(8.4, 2.6, 5.7, siding, 0, 1.46, 0));
      const upper = new THREE.MeshStandardMaterial({ color: '#e7e2d5', roughness: .65 });
      group.add(box(6.2, 2.35, 4.6, upper, 1.15, 3.94, -.5));
      group.add(box(9.8, .2, 6.6, darkMat, .3, 2.83, 0));
      group.add(box(8.9, .18, 6.4, darkMat, .7, 5.2, -.5));
      // huge glass band
      const glowBand = box(5.6, 1.55, .08, glassMat, 1.15, 3.92, 1.82); group.add(glowBand);
      for (let i = 0; i < 4; i++) group.add(box(.06, 1.6, .12, darkMat, -1.3 + i * 1.6, 3.92, 1.9));
      group.add(box(4.8, 1.2, .08, glassMat, -1.4, 1.6, 2.87));
      // carport
      group.add(box(5.1, .2, 4.8, darkMat, 4.9, 2.5, 2.0));
      for (const sx of [2.8, 7.0]) group.add(box(.16, 2.45, .16, darkMat, sx, 1.28, 4.3));
      // door
      group.add(box(2.2, .15, 1.2, trimMat, 0, .18, 3.25));
      group.add(box(.18, 2.3, .2, accentMat, -1.4, 1.3, 3.12));
      group.add(box(.18, 2.3, .2, accentMat, 1.4, 1.3, 3.12));
      group.add(box(3.0, .18, .25, accentMat, 0, 2.45, 3.12));
      // cactus / sculptural tree
      const sculpt = new THREE.Mesh(new THREE.IcosahedronGeometry(.65, 0), new THREE.MeshStandardMaterial({ color: '#415b43', roughness: 1 }));
      sculpt.position.set(-3.7, 1.0, 4.2); group.add(sculpt);
      group.add(box(.1, 1.0, .1, darkMat, -3.7, .5, 4.2));
    } else {
      bodyW = 6.8; bodyD = 5.6; bodyH = 4.6; doorZ = bodyD / 2 + .03;
      group.add(box(6.8, 4.6, 5.6, siding, 0, 2.46, 0));
      const roof = pyramidRoof(6.8, 5.6, 3.0, roofMat, .65); roof.position.y = 4.76; group.add(roof);
      // turret
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.8, 5.4, 12), siding);
      tower.position.set(2.55, 2.86, 1.15); tower.castShadow = true; group.add(tower);
      const turretRoof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 3.1, 12), roofMat);
      turretRoof.position.set(2.55, 7.1, 1.15); group.add(turretRoof);
      // tower windows
      this.addWindow(group, 2.55, 5.05, 2.92, .72, .95, 0, trimMat, glassMat);
      // wraparound porch
      group.add(box(8.4, .16, 1.9, trimMat, 0, 2.25, 3.55));
      group.add(box(8.3, .14, 1.6, darkMat, 0, .14, 3.35));
      group.add(box(1.9, .16, 5.6, trimMat, 3.3, 2.25, 1.2));
      for (const sx of [-3.2, -1.2, .8, 3.0]) {
        group.add(box(.15, 2.15, .15, trimMat, sx, 1.15, 3.9));
        group.add(box(.18, .65, .18, trimMat, sx, 2.6, 3.9));
      }
      for (let i = 0; i < 10; i++) group.add(box(.08, .55, .08, trimMat, -3.9 + i * .85, .47, 4.35));
      group.add(box(8.1, .09, .08, trimMat, 0, .76, 4.35));
      // tall windows
      this.addWindow(group, -2.1, 2.1, bodyD / 2 + .07, 1.0, 1.7, 0, trimMat, glassMat);
      this.addWindow(group, 1.1, 2.15, bodyD / 2 + .07, 1.0, 1.75, 0, trimMat, glassMat);
      this.addWindow(group, bodyW / 2 + .07, 2.15, -.5, 1.15, 1.5, Math.PI / 2, trimMat, glassMat);
      // gothic trim
      group.add(box(7.1, .14, .2, accentMat, 0, 4.55, 2.86));
      group.add(box(.2, 2.4, .16, accentMat, -2.7, 1.3, 2.88));
      group.add(box(.2, 2.4, .16, accentMat, 2.7, 1.3, 2.88));
    }

    // front door (all styles)
    const door = box(1.18, 2.15, .13, doorMat, 0, 1.32, doorZ);
    door.name = 'frontDoor'; group.add(door);
    group.add(box(1.48, 2.45, .16, darkMat, 0, 1.37, doorZ - .06));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffe39d', metalness: .85, roughness: .25 }));
    knob.position.set(.37, 1.32, doorZ + .12); group.add(knob);
    // glowing sigil
    const sigilMat = new THREE.MeshBasicMaterial({ color: '#ff5240', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
    const sigil = new THREE.Mesh(new THREE.RingGeometry(.05, .19, 6), sigilMat);
    sigil.position.set(0, 1.65, doorZ + .085); group.add(sigil);
    const doorGlow = this.makeGlowSprite('255,65,45', 2.8);
    doorGlow.position.set(0, 1.35, doorZ + .4); group.add(doorGlow);
    const doorLight = new THREE.PointLight('#ff4d3e', 1.1, 8, 2); doorLight.position.set(0, 1.8, doorZ + .6); group.add(doorLight);

    // yard: path, driveway, mailbox, sign, fence
    const pathMat = new THREE.MeshStandardMaterial({ color: '#b8ab98', roughness: .95 });
    group.add(box(1.45, .07, 3.2, pathMat, 0, .08, 4.55));
    const driveMat = new THREE.MeshStandardMaterial({ map: makeConcreteTexture('#9b958b'), color: '#aaa49a', roughness: .96 });
    const driveX = def.style === 'ranch' ? -5.3 : def.style === 'split' || def.style === 'modern' ? 5.2 : 3.9;
    group.add(box(3.0, .06, 4.6, driveMat, driveX, .045, 6.1));

    const sign = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, 1.5, 6), darkMat);
    post.position.y = .75; sign.add(post);
    const signMat = new THREE.MeshStandardMaterial({ map: makeSignTexture(`${def.lot} · ${def.short}`, def.tag, '#ffc857'), roughness: .8, side: THREE.DoubleSide });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.25, .56), signMat);
    board.position.set(0, 1.37, 0.025); sign.add(board);
    // back of sign
    const back = box(2.25, .56, .035, darkMat, 0, 1.37, 0); sign.add(back);
    sign.position.set(-3.0, 0, 6.4);
    sign.rotation.y = .06;
    group.add(sign);
    const mailbox = makeMailbox(def.accent); mailbox.position.set(2.7, 0, 6.5); mailbox.rotation.y = -.1; group.add(mailbox);
    for (const sx of [-4.6, 4.6]) {
      const f = makePicketFence(3.6, def.trim);
      f.position.set(sx, 0, 4.9); f.rotation.y = Math.PI / 2; group.add(f);
    }
    // flower bed
    const soil = box(3.2, .08, 1.1, new THREE.MeshStandardMaterial({ color: '#3b2a26', roughness: 1 }), 0, .05, 3.85); group.add(soil);
    const flowerColors = ['#ff7d9f', '#ffd36e', '#c98aff'];
    for (let i = 0; i < 14; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .35, 3), new THREE.MeshStandardMaterial({ color: '#365a34' }));
      stem.position.set(rand(-1.5, 1.5), .23, rand(3.55, 4.12)); group.add(stem);
      const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshStandardMaterial({ color: pick(flowerColors), emissive: pick(flowerColors), emissiveIntensity: .15, roughness: .5 }));
      bloom.position.set(stem.position.x, .42, stem.position.z); group.add(bloom);
    }

    // status beacon over roof
    const beacon = new THREE.Group();
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#ff5971', transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.23, 0), beaconMat);
    beacon.add(diamond);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#ff5971', transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.09, .33, 5.2, 8, 1, true), beamMat);
    beam.position.y = 2.6; beacon.add(beam);
    beacon.position.set(0, 7.9, 0); group.add(beacon);

    const lock = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bar = box(1.8, .11, .1, new THREE.MeshStandardMaterial({ color: '#6d2031', metalness: .5, roughness: .45 }), 0, 1.0 + i * .55, doorZ + .18);
      bar.rotation.z = -.18; lock.add(bar);
    }
    const lockGlow = this.makeGlowSprite('255,40,80', 3.1); lockGlow.position.set(0, 1.4, doorZ + .45); lock.add(lockGlow);
    lock.visible = def.locked; group.add(lock);
    const sealedSign = makeTextSprite('SEALED', { bg: 'rgba(25,10,18,.75)', color: '#ff7c91', size: 52, scale: .9, width: 256, height: 96 });
    sealedSign.position.set(0, 2.9, doorZ + .8); sealedSign.visible = def.locked; group.add(sealedSign);

    // door world position / collider
    const doorLocal = new THREE.Vector3(0, 0, doorZ + .44);
    const doorWorld = doorLocal.clone().applyMatrix4(group.matrixWorld);
    // ensure matrix updated
    group.updateMatrixWorld(true);
    doorWorld.copy(doorLocal).applyMatrix4(group.matrixWorld);

    const house = {
      def, index, group, doorWorld, doorLocal,
      bodyW, bodyD, bodyH, bodyCollider: { type: 'obb', x, z, hx: bodyW / 2 + (def.style === 'modern' ? .9 : .35), hz: bodyD / 2 + .55, rot },
      doorMat, glassMat, sigil, sigilMat, doorGlow, doorLight, beacon, beaconMat, beamMat, lock, sealedSign, signMat, sign, cleared: false, locked: def.locked,
      beaconBaseY: 7.9,
    };
    this.colliders.push(house.bodyCollider);
    return house;
  }

  addWindow(group, x, y, z, w, h, ry, frameMat, glassMat) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = ry;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
    glass.position.z = .02; g.add(glass);
    // frames
    g.add(box(w + .16, .08, .08, frameMat, 0, h / 2 + .04, .05));
    g.add(box(w + .16, .08, .08, frameMat, 0, -h / 2 - .04, .05));
    g.add(box(.08, h + .16, .08, frameMat, -w / 2 - .04, 0, .05));
    g.add(box(.08, h + .16, .08, frameMat, w / 2 + .04, 0, .05));
    g.add(box(.05, h, .06, frameMat, 0, 0, .05));
    g.add(box(w, .05, .06, frameMat, 0, 0, .05));
    group.add(g);
    return g;
  }

  buildPlayer() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: '#e5ad8b', roughness: .7 });
    const blazer = new THREE.MeshStandardMaterial({ color: '#f0c96b', roughness: .7 });
    const blazerDark = new THREE.MeshStandardMaterial({ color: '#c49a46', roughness: .75 });
    const pants = new THREE.MeshStandardMaterial({ color: '#2f3b55', roughness: .85 });
    const shoe = new THREE.MeshStandardMaterial({ color: '#241c24', roughness: .8 });
    const hair = new THREE.MeshStandardMaterial({ color: '#3b2528', roughness: .9 });

    const leftLeg = new THREE.Group(); leftLeg.position.set(-.18, .92, 0);
    const ll = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .55, 4, 8), pants); ll.position.y = -.3; leftLeg.add(ll);
    const ls = box(.25, .15, .4, shoe, 0, -.68, .08); leftLeg.add(ls);
    g.add(leftLeg);
    const rightLeg = leftLeg.clone(); rightLeg.position.x = .18; g.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.31, .55, 5, 10), blazer);
    torso.position.y = 1.44; torso.scale.z = .72; torso.castShadow = true; g.add(torso);
    const lapel = box(.28, .5, .06, blazerDark, 0, 1.56, .25); g.add(lapel);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, .18, 8), skin); neck.position.y = 1.85; g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 14, 11), skin); head.position.y = 2.12; head.scale.set(.9, 1, .9); head.castShadow = true; g.add(head);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(.285, 12, 8, 0, TAU, 0, Math.PI * .62), hair); hairCap.position.y = 2.16; g.add(hairCap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), hair); bun.position.set(0, 2.3, -.23); g.add(bun);
    // sunglasses
    const shadeMat = new THREE.MeshStandardMaterial({ color: '#1c1420', metalness: .4, roughness: .25 });
    for (const s of [-1, 1]) {
      const lens = box(.15, .09, .04, shadeMat, s * .1, 2.14, .23); g.add(lens);
    }
    // arms
    const leftArm = new THREE.Group(); leftArm.position.set(-.36, 1.66, 0); leftArm.rotation.z = -.18;
    const la = new THREE.Mesh(new THREE.CapsuleGeometry(.09, .56, 3, 8), blazer); la.position.y = -.3; leftArm.add(la);
    const lh = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), skin); lh.position.y = -.63; leftArm.add(lh);
    g.add(leftArm);
    const rightArm = new THREE.Group(); rightArm.position.set(.37, 1.66, 0); rightArm.rotation.z = .25;
    const ra = new THREE.Mesh(new THREE.CapsuleGeometry(.09, .52, 3, 8), blazer); ra.position.y = -.29; rightArm.add(ra);
    const rh = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), skin); rh.position.y = -.6; rightArm.add(rh);
    // clipboard
    const clip = box(.3, .4, .04, new THREE.MeshStandardMaterial({ color: '#8c5f43', roughness: .8 }), .06, -.77, .13);
    clip.rotation.x = -.2; rightArm.add(clip);
    g.add(rightArm);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.55, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; shadow.scale.set(1, .65, 1); g.add(shadow);

    g.userData = { leftLeg, rightLeg, leftArm, rightArm, torso, head, shadow };
    g.position.copy(this.playerPos);
    this.scene.add(g);
    this.player = g;
  }

  buildEmbers() {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU), r = rand(8, 55);
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = rand(.1, 16);
      positions[i * 3 + 2] = Math.sin(a) * r;
      speeds[i] = rand(.12, .55);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: '#ff9a63', size: .14, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    pts.userData.speeds = speeds;
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.embers = pts;
  }

  resetPlayer() {
    this.playerPos.set(0, 0, 24);
    this.playerVel.set(0, 0, 0);
    this.camYaw = 0;
    this.camPitch = .31;
    if (this.player) {
      this.player.position.copy(this.playerPos);
      this.player.rotation.y = Math.PI;
      this.player.visible = true;
    }
    this.camPos.set(0, 7.2, 35);
  }

  resolveCollisions(pos, radius) {
    for (let iteration = 0; iteration < 2; iteration++) {
      for (const c of this.colliders) {
        if (c.type === 'circle') {
          const dx = pos.x - c.x, dz = pos.z - c.z;
          const d = Math.hypot(dx, dz);
          if (d < c.r + radius && d > .0001) {
            const push = c.r + radius - d;
            pos.x += dx / d * push; pos.z += dz / d * push;
          }
        } else if (c.type === 'obb') {
          const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
          const dx = pos.x - c.x, dz = pos.z - c.z;
          let lx = dx * cos - dz * sin;
          let lz = dx * sin + dz * cos;
          const clx = clamp(lx, -c.hx, c.hx), clz = clamp(lz, -c.hz, c.hz);
          if (Math.abs(lx) < c.hx && Math.abs(lz) < c.hz) {
            const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
            if (px < pz) lx = Math.sign(lx || 1) * (c.hx + radius);
            else lz = Math.sign(lz || 1) * (c.hz + radius);
          } else {
            const ex = lx - clx, ez = lz - clz;
            const d = Math.hypot(ex, ez);
            if (d < radius && d > .0001) {
              lx = clx + ex / d * radius; lz = clz + ez / d * radius;
            }
          }
          pos.x = c.x + lx * cos + lz * sin;
          pos.z = c.z - lx * sin + lz * cos;
        }
      }
    }
    const r = Math.hypot(pos.x, pos.z);
    if (r > 61) { pos.x *= 61 / r; pos.z *= 61 / r; }
  }

  update(dt, input, camera, active = true) {
    this.time += dt;
    if (this.embers) {
      const pos = this.embers.geometry.attributes.position.array;
      const speeds = this.embers.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        pos[i * 3 + 1] += speeds[i] * dt;
        pos[i * 3] += Math.sin(this.time * .7 + i) * .002;
        if (pos[i * 3 + 1] > 16) pos[i * 3 + 1] = .1;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
    }
    this.fountainGlow.material.opacity = .45 + Math.sin(this.time * 2.2) * .12;
    this.fountainGlow.scale.setScalar(7.5 + Math.sin(this.time * 1.3) * .6);

    for (const h of this.houses) {
      const pulse = .5 + Math.sin(this.time * 2.4 + h.index) * .18;
      h.beacon.rotation.y += dt * .75;
      h.beacon.position.y = h.beaconBaseY + Math.sin(this.time * 1.6 + h.index) * .2;
      h.beaconMat.opacity = pulse;
      h.beamMat.opacity = pulse * .16;
      h.doorGlow.material.opacity = .6 + Math.sin(this.time * 3 + h.index) * .18;
      h.sigil.rotation.z += dt * .6;
      if (h.cleared) {
        h.beaconMat.color.set('#8ff0c6'); h.beamMat.color.set('#8ff0c6');
        h.doorMat.emissive.set('#43e0a8'); h.doorMat.color.set('#6be8bd'); h.doorGlow.material.color.set('#8ff0c6');
        h.doorLight.color.set('#6bf0bf');
      }
    }

    if (!active) return;
    const maxSpeed = 7.4;
    const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const wish = new THREE.Vector3().addScaledVector(forward, input.moveY).addScaledVector(right, input.moveX);
    if (wish.lengthSq() > 1) wish.normalize();
    const targetVel = wish.multiplyScalar(maxSpeed * (input.sprint ? 1.16 : 1));
    this.playerVel.x = damp(this.playerVel.x, targetVel.x, 11, dt);
    this.playerVel.z = damp(this.playerVel.z, targetVel.z, 11, dt);

    const nextX = this.playerPos.x + this.playerVel.x * dt;
    const nextZ = this.playerPos.z + this.playerVel.z * dt;
    const candidate = new THREE.Vector3(nextX, 0, nextZ);
    this.resolveCollisions(candidate, .5);
    this.playerPos.x = candidate.x; this.playerPos.z = candidate.z;

    const speed = this.playerVel.length();
    if (speed > .2) {
      const targetRot = Math.atan2(this.playerVel.x, this.playerVel.z);
      let diff = ((targetRot - this.player.rotation.y + Math.PI) % TAU + TAU) % TAU - Math.PI;
      this.player.rotation.y += diff * Math.min(1, dt * 12);
      this.walkPhase += dt * speed * 1.45;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) { this.audio.step(); this.stepTimer = speed > 5 ? .27 : .38; }
    } else {
      this.walkPhase = damp(this.walkPhase, Math.round(this.walkPhase / Math.PI) * Math.PI, 8, dt);
      this.stepTimer = 0;
    }
    const swing = Math.sin(this.walkPhase) * Math.min(1, speed / 4) * .55;
    const u = this.player.userData;
    u.leftLeg.rotation.x = swing; u.rightLeg.rotation.x = -swing;
    u.leftArm.rotation.x = -swing * .6; u.rightArm.rotation.x = swing * .4;
    u.torso.position.y = 1.44 + Math.abs(Math.sin(this.walkPhase)) * .035;
    u.head.position.y = 2.12 + Math.abs(Math.sin(this.walkPhase)) * .03;
    this.player.position.set(this.playerPos.x, 0, this.playerPos.z);

    // camera
    const focus = new THREE.Vector3(this.playerPos.x, 1.45, this.playerPos.z);
    const hDist = Math.cos(this.camPitch) * this.camDist;
    const desired = new THREE.Vector3(
      focus.x + Math.sin(this.camYaw) * hDist,
      focus.y + Math.sin(this.camPitch) * this.camDist + .4,
      focus.z + Math.cos(this.camYaw) * hDist,
    );
    desired.y = Math.max(.8, desired.y);
    this.camPos.x = damp(this.camPos.x, desired.x, 7.5, dt);
    this.camPos.y = damp(this.camPos.y, desired.y, 7.5, dt);
    this.camPos.z = damp(this.camPos.z, desired.z, 7.5, dt);
    camera.position.copy(this.camPos);
    camera.lookAt(focus);
    this.camTarget.copy(focus);

    // proximity
    let near = null, best = 6.1;
    for (const h of this.houses) {
      const d = Math.hypot(this.playerPos.x - h.doorWorld.x, this.playerPos.z - h.doorWorld.z);
      if (d < best) { best = d; near = h; }
    }
    this.nearHouse = near;
    return near;
  }

  updateTitle(dt, camera) {
    this.time += dt;
    const t = this.time * .075;
    const x = Math.sin(t) * 30, z = Math.cos(t) * 30;
    camera.position.set(x, 15 + Math.sin(t * 1.3) * 2, z);
    camera.lookAt(0, 2.5, 0);
    if (this.embers) {
      const pos = this.embers.geometry.attributes.position.array;
      const speeds = this.embers.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        pos[i * 3 + 1] += speeds[i] * dt;
        if (pos[i * 3 + 1] > 16) pos[i * 3 + 1] = .1;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
    }
    for (const h of this.houses) {
      h.beacon.rotation.y += dt * .75;
      h.beacon.position.y = h.beaconBaseY + Math.sin(this.time * 1.6 + h.index) * .2;
      h.doorGlow.material.opacity = .6 + Math.sin(this.time * 3 + h.index) * .18;
      h.sigil.rotation.z += dt * .6;
    }
  }

  markCleared(id) {
    const h = this.houses.find(h => h.def.id === id);
    if (!h) return;
    h.cleared = true;
    h.locked = false;
    h.lock.visible = false;
    h.sealedSign.visible = false;
    h.signMat.map.dispose();
    h.signMat.map = makeSignTexture(`${h.def.lot} · SOLD`, 'SOMEONE IS HOME', '#8ff0c6');
    h.signMat.needsUpdate = true;
    const sold = makeTextSprite('SOLD', { bg: 'rgba(24,20,16,.8)', color: '#ffc857', size: 64, scale: .95, width: 256, height: 96 });
    sold.position.set(0, h.bodyH + 2.4, h.bodyD / 2 + .6);
    h.group.add(sold);
    h.soldSprite = sold;
  }

  unlockFinal() {
    const h = this.houses.find(h => h.def.id === 'hollow');
    if (!h) return;
    h.locked = false;
    h.lock.visible = false;
    h.sealedSign.visible = false;
    this.audio.portal();
  }

  countCleared() { return this.houses.filter(h => h.cleared).length; }

  getCompass(cameraYaw) {
    const remaining = this.houses.filter(h => !h.cleared);
    if (!remaining.length) return null;
    let best = null, bestD = Infinity;
    for (const h of remaining) {
      const d = Math.hypot(this.playerPos.x - h.doorWorld.x, this.playerPos.z - h.doorWorld.z);
      if (d < bestD) { bestD = d; best = h; }
    }
    if (!best) return null;
    const dx = best.doorWorld.x - this.playerPos.x, dz = best.doorWorld.z - this.playerPos.z;
    const inv = Math.hypot(dx, dz) || 1;
    const fwdX = -Math.sin(cameraYaw), fwdZ = -Math.cos(cameraYaw);
    const rightX = Math.cos(cameraYaw), rightZ = -Math.sin(cameraYaw);
    const localX = (dx * rightX + dz * rightZ) / inv;
    const localZ = (dx * fwdX + dz * fwdZ) / inv;
    return { angle: Math.atan2(localX, localZ), house: best, dist: bestD };
  }
}
