import * as THREE from 'three';
import {
  TAU, clamp, damp, rand, randInt, pick, lerp, makeWallpaperTexture,
  makeFloorTexture, makeTextSprite, box, canvasTexture,
} from './utils.js';

const N = 23;
const CELL = 2.7;
const HALF = N * CELL / 2;
const WALL_H = 4.8;

const PLANS = {
  miller: {
    rooms: [
      { x0: 9, z0: 17, x1: 13, z1: 20, type: 'entry' },
      { x0: 10, z0: 11, x1: 12, z1: 17, type: 'hall' },
      { x0: 4, z0: 12, x1: 9, z1: 17, type: 'living' },
      { x0: 13, z0: 12, x1: 18, z1: 17, type: 'kitchen' },
      { x0: 6, z0: 6, x1: 15, z1: 10, type: 'dining' },
      { x0: 3, z0: 5, x1: 6, z1: 10, type: 'study' },
      { x0: 15, z0: 5, x1: 19, z1: 10, type: 'bedroom' },
      { x0: 9, z0: 9, x1: 13, z1: 12, type: 'hall' },
    ],
    spawn: [11, 19],
  },
  vega: {
    rooms: [
      { x0: 9, z0: 18, x1: 13, z1: 20, type: 'entry' },
      { x0: 10, z0: 13, x1: 12, z1: 18, type: 'hall' },
      { x0: 7, z0: 7, x1: 15, z1: 14, type: 'courtyard' },
      { x0: 2, z0: 7, x1: 7, z1: 14, type: 'living' },
      { x0: 15, z0: 7, x1: 20, z1: 14, type: 'kitchen' },
      { x0: 4, z0: 3, x1: 18, z1: 6, type: 'dining' },
      { x0: 15, z0: 15, x1: 19, z1: 18, type: 'bedroom' },
    ],
    spawn: [11, 19],
  },
  ashby: {
    rooms: [
      { x0: 10, z0: 18, x1: 12, z1: 20, type: 'entry' },
      { x0: 6, z0: 14, x1: 12, z1: 18, type: 'hall' },
      { x0: 2, z0: 11, x1: 7, z1: 17, type: 'living' },
      { x0: 12, z0: 13, x1: 18, z1: 17, type: 'kitchen' },
      { x0: 8, z0: 9, x1: 11, z1: 13, type: 'hall' },
      { x0: 3, z0: 5, x1: 8, z1: 10, type: 'game' },
      { x0: 12, z0: 5, x1: 19, z1: 11, type: 'bedroom' },
      { x0: 8, z0: 3, x1: 12, z1: 8, type: 'study' },
      { x0: 15, z0: 14, x1: 19, z1: 17, type: 'bath' },
    ],
    spawn: [11, 19],
  },
  glass: {
    rooms: [
      { x0: 10, z0: 18, x1: 13, z1: 20, type: 'entry' },
      { x0: 3, z0: 10, x1: 20, z1: 17, type: 'living' },
      { x0: 3, z0: 4, x1: 9, z1: 9, type: 'gallery' },
      { x0: 13, z0: 4, x1: 20, z1: 9, type: 'kitchen' },
      { x0: 10, z0: 4, x1: 13, z1: 18, type: 'hall' },
      { x0: 3, z0: 2, x1: 9, z1: 4, type: 'bath' },
      { x0: 13, z0: 2, x1: 20, z1: 4, type: 'study' },
      { x0: 16, z0: 10, x1: 20, z1: 14, type: 'dining' },
    ],
    spawn: [11, 19],
  },
  hollow: {
    rooms: [
      { x0: 10, z0: 18, x1: 12, z1: 20, type: 'entry' },
      { x0: 8, z0: 12, x1: 14, z1: 19, type: 'living' },
      { x0: 15, z0: 12, x1: 20, z1: 18, type: 'parlor' },
      { x0: 2, z0: 12, x1: 7, z1: 18, type: 'dining' },
      { x0: 4, z0: 9, x1: 18, z1: 11, type: 'hall' },
      { x0: 2, z0: 4, x1: 7, z1: 8, type: 'library' },
      { x0: 8, z0: 3, x1: 14, z1: 8, type: 'chapel' },
      { x0: 15, z0: 5, x1: 20, z1: 8, type: 'bedroom' },
    ],
    spawn: [11, 19],
  },
};

const PALETTES = {
  miller: { wood: '#4f302e', fabric: '#a4485c', metal: '#c19654', rug: '#713042', lamp: '#ffb36b', glow: '#ff5a5a' },
  vega: { wood: '#5c3323', fabric: '#ad482d', metal: '#d2a14d', rug: '#7c292a', lamp: '#ff974d', glow: '#ff5b35' },
  ashby: { wood: '#4a3420', fabric: '#66723f', metal: '#ab8f4e', rug: '#6e492b', lamp: '#ffd06b', glow: '#ff7c3d' },
  glass: { wood: '#766858', fabric: '#b7b5a9', metal: '#333b3d', rug: '#c4baa8', lamp: '#9debd3', glow: '#ff6b55' },
  hollow: { wood: '#321f2d', fabric: '#5c2e54', metal: '#8c704e', rug: '#3d2242', lamp: '#c79aff', glow: '#ff3b58' },
};

const WAVES = {
  1: [
    ['imp', 'imp', 'imp'],
    ['imp', 'imp', 'floater'],
  ],
  2: [
    ['imp', 'imp', 'floater'],
    ['imp', 'imp', 'imp', 'floater'],
  ],
  3: [
    ['imp', 'imp', 'floater'],
    ['imp', 'imp', 'floater', 'floater'],
    ['brute', 'imp', 'imp'],
  ],
  4: [
    ['floater', 'floater', 'imp'],
    ['brute', 'imp', 'imp', 'floater'],
    ['imp', 'imp', 'floater', 'floater', 'brute'],
  ],
  5: [
    ['imp', 'imp', 'imp', 'floater'],
    ['brute', 'imp', 'imp', 'floater', 'floater'],
    ['imp', 'imp', 'imp', 'floater', 'floater', 'brute'],
    ['boss', 'imp', 'imp'],
  ],
};

function cellToWorld(gx, gz) {
  return new THREE.Vector3(-HALF + (gx + .5) * CELL, 0, -HALF + (gz + .5) * CELL);
}

function worldToCell(x, z) {
  return [Math.floor((x + HALF) / CELL), Math.floor((z + HALF) / CELL)];
}

function glowTexture(rgb = '255,70,70') {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(.22, `rgba(${rgb},.55)`);
    g.addColorStop(.65, `rgba(${rgb},.1)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

function glowSprite(rgb, size = 2, opacity = .8) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(rgb), color: '#ffffff', transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

function canvasPortrait(theme) {
  return canvasTexture(192, 256, (ctx, w, h) => {
    ctx.fillStyle = theme === 'glass' ? '#b9bbaf' : theme === 'hollow' ? '#2b1b32' : '#5a3d34';
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, h * .38, 4, w / 2, h * .38, w * .6);
    glow.addColorStop(0, theme === 'glass' ? 'rgba(160,240,215,.5)' : 'rgba(226,150,108,.4)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#171019';
    ctx.beginPath(); ctx.ellipse(w / 2, h * .57, w * .28, h * .36, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2c202a';
    ctx.beginPath(); ctx.ellipse(w / 2, h * .35, w * .16, h * .2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,228,195,.55)';
    ctx.beginPath(); ctx.ellipse(w * .43, h * .34, 4, 7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * .57, h * .34, 4, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(10,5,10,.65)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(w / 2, h * .39, w * .12, .2, Math.PI - .2); ctx.stroke();
    // scratches
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = `rgba(240,220,200,${.03 + Math.random() * .08})`;
      ctx.beginPath(); ctx.moveTo(Math.random() * w, 0); ctx.lineTo(Math.random() * w, h); ctx.stroke();
    }
  }, { clamp: true });
}

function makeCrossPickup() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#8ff0c6', emissive: '#38d399', emissiveIntensity: 1.8, roughness: .3 });
  g.add(box(.09, .42, .08, mat, 0, 0, 0));
  g.add(box(.32, .09, .08, mat, 0, .05, 0));
  const glow = glowSprite('90,255,190', 1.7, .6); g.add(glow);
  g.position.y = 1.15;
  return g;
}

export class HouseLevel {
  constructor(def, audio, callbacks = {}) {
    this.def = def;
    this.audio = audio;
    this.cb = callbacks;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, .04, 120);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    const playerLight = new THREE.PointLight('#ffd2a2', 1.25, 13, 2);
    playerLight.position.set(0, -.05, -.1);
    this.camera.add(playerLight);
    this.playerLight = playerLight;
    this.palette = PALETTES[def.theme] || PALETTES.miller;
    this.plan = PLANS[def.theme] || PLANS.miller;
    this.floor = Array.from({ length: N }, () => new Array(N).fill(false));
    this.state = 'intro';
    this.time = 0;
    this.waveIndex = -1;
    this.waves = WAVES[def.difficulty] || WAVES[1];
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.effects = [];
    this.shots = [];
    this.obstacles = [];
    this.health = 100;
    this.maxHealth = 100;
    this.ammo = 8;
    this.maxAmmo = 8;
    this.fireCooldown = 0;
    this.reloadTimer = 0;
    this.firing = false;
    this.yaw = 0;
    this.pitch = 0;
    this.lookDX = 0;
    this.lookDY = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.bob = 0;
    this.walkTime = 0;
    this.shake = 0;
    this.viewKick = 0;
    this.dead = false;
    this.exitActive = false;
    this.exitNear = false;
    this.spawned = 0;
    this.kills = 0;
    this.introTimer = 2.2;
    this.waveDelay = 0;
    this.flowTimer = 0;
    this.flow = new Int16Array(N * N).fill(-1);
    this.enemyId = 0;
    this.lastDamage = 0;
    this.trigger = false;
    this.shellPump = 0;
    this.buildLevel();
  }

  buildLevel() {
    this.buildMap();
    this.buildAtmosphere();
    this.buildProps();
    this.buildPlayer();
    this.buildWeapon();
    this.setupSpawn();
    this.uiUpdate();
  }

  buildMap() {
    for (const room of this.plan.rooms) {
      for (let z = room.z0; z <= room.z1; z++) {
        for (let x = room.x0; x <= room.x1; x++) {
          if (x > 0 && x < N - 1 && z > 0 && z < N - 1) this.floor[z][x] = true;
        }
      }
    }
    const [sx, sz] = this.plan.spawn;
    this.spawnCell = [sx, sz];

    const theme = this.def.theme;
    const wallMat = new THREE.MeshStandardMaterial({
      map: makeWallpaperTexture(theme), color: '#f1ddd0', roughness: .91,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      map: makeFloorTexture(theme), color: '#c6b4aa', roughness: .88,
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      color: theme === 'glass' ? '#9aa59c' : '#5c3b45', roughness: .95,
      emissive: theme === 'glass' ? '#20302b' : '#2b121c', emissiveIntensity: .55,
    });
    this.wallMat = wallMat; this.floorMat = floorMat;

    const floorGeo = new THREE.PlaneGeometry(N * CELL, N * CELL);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(floorGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2; ceiling.position.y = WALL_H; ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    // structural beams in the ceiling
    const beamMat = new THREE.MeshStandardMaterial({ color: theme === 'glass' ? '#5a625d' : '#3a2029', roughness: .9 });
    for (let z = 2; z < N - 1; z += 5) {
      const beam = box(N * CELL, .18, .22, beamMat, 0, WALL_H - .1, -HALF + z * CELL);
      this.scene.add(beam);
    }
    // ceiling fixtures so the rooms read as interiors, not voids
    const fixtureMat = new THREE.MeshBasicMaterial({ color: this.palette.lamp });
    const fixtureTrim = new THREE.MeshStandardMaterial({ color: theme === 'glass' ? '#59635d' : '#2a1820', roughness: .7, metalness: .3 });
    for (const [fx, fz] of [[6, 6], [16, 6], [6, 14], [16, 14], [11, 10], [11, 19], [11, 16], [5, 18], [18, 12]]) {
      if (!this.isFloor(fx, fz)) continue;
      const px = this.cellCenterX(fx), pz = this.cellCenterZ(fz);
      const trim = new THREE.Mesh(new THREE.CylinderGeometry(.42, .34, .12, 12), fixtureTrim);
      trim.position.set(px, WALL_H - .06, pz); this.scene.add(trim);
      const disk = new THREE.Mesh(new THREE.CircleGeometry(.3, 12), fixtureMat);
      disk.rotation.x = Math.PI / 2; disk.position.set(px, WALL_H - .13, pz); this.scene.add(disk);
      const halo = glowSprite(this.def.theme === 'glass' ? '150,255,220' : '255,186,118', 1.6, .32);
      halo.position.set(px, WALL_H - .22, pz); this.scene.add(halo);
    }

    const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
    this.wallGeo = wallGeo;
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (this.floor[z][x]) continue;
        let nearFloor = false;
        for (let dz = -1; dz <= 1 && !nearFloor; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (this.isFloor(x + dx, z + dz)) { nearFloor = true; break; }
          }
        }
        if (!nearFloor) continue;
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(-HALF + (x + .5) * CELL, WALL_H / 2, -HALF + (z + .5) * CELL);
        wall.castShadow = true; wall.receiveShadow = true;
        this.scene.add(wall);
      }
    }

    // baseboards around the room edges
    const baseMat = new THREE.MeshStandardMaterial({ color: theme === 'glass' ? '#4d524e' : '#1d1118', roughness: .8 });
    for (let z = 1; z < N - 1; z++) {
      for (let x = 1; x < N - 1; x++) {
        if (!this.floor[z][x]) continue;
        if (!this.isFloor(x + 1, z)) this.scene.add(box(.11, .24, CELL, baseMat, this.cellCenterX(x) + CELL / 2 - .05, .12, this.cellCenterZ(z)));
        if (!this.isFloor(x - 1, z)) this.scene.add(box(.11, .24, CELL, baseMat, this.cellCenterX(x) - CELL / 2 + .05, .12, this.cellCenterZ(z)));
        if (!this.isFloor(x, z + 1)) this.scene.add(box(CELL, .24, .11, baseMat, this.cellCenterX(x), .12, this.cellCenterZ(z) + CELL / 2 - .05));
        if (!this.isFloor(x, z - 1)) this.scene.add(box(CELL, .24, .11, baseMat, this.cellCenterX(x), .12, this.cellCenterZ(z) - CELL / 2 + .05));
      }
    }

    // room floors: rugs and special center medallions
    this.rooms = this.plan.rooms.map(room => {
      const cx = (this.cellCenterX(Math.floor((room.x0 + room.x1) / 2)) + this.cellCenterX(Math.ceil((room.x0 + room.x1) / 2))) / 2;
      const cz = (this.cellCenterZ(Math.floor((room.z0 + room.z1) / 2)) + this.cellCenterZ(Math.ceil((room.z0 + room.z1) / 2))) / 2;
      return { ...room, cx, cz, w: (room.x1 - room.x0 + 1) * CELL, d: (room.z1 - room.z0 + 1) * CELL };
    });

    // corridor runner rugs
    for (const room of this.plan.rooms) {
      if (room.type !== 'hall' && room.type !== 'entry') continue;
      const w = (room.x1 - room.x0 + 1) * CELL, d = (room.z1 - room.z0 + 1) * CELL;
      if (w < 8.5) {
        const rug = box(w * .55, .025, d * .72, new THREE.MeshStandardMaterial({ color: this.palette.rug, roughness: .95 }), this.roomCenter(room).x, .06, this.roomCenter(room).z);
        this.scene.add(rug);
      }
    }
  }

  roomCenter(room) {
    return new THREE.Vector3(
      (this.cellCenterX(room.x0) + this.cellCenterX(room.x1)) / 2,
      0,
      (this.cellCenterZ(room.z0) + this.cellCenterZ(room.z1)) / 2,
    );
  }

  cellCenterX(x) { return -HALF + (x + .5) * CELL; }
  cellCenterZ(z) { return -HALF + (z + .5) * CELL; }
  isFloor(x, z) { return x >= 0 && z >= 0 && x < N && z < N && this.floor[z][x]; }
  isWall(x, z) { return !this.isFloor(x, z); }

  buildAtmosphere() {
    const fogColors = {
      miller: '#3a1624', vega: '#3b1518', ashby: '#2c1d12', glass: '#182723', hollow: '#1b0e25',
    };
    const fog = fogColors[this.def.theme] || '#2a1220';
    this.scene.background = new THREE.Color(fog);
    this.scene.fog = new THREE.FogExp2(fog, .023);

    const hemi = new THREE.HemisphereLight(this.def.theme === 'glass' ? '#c4ffe9' : '#f0b59b', '#1d111a', 2.25);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(this.palette.lamp, 1.7);
    dir.position.set(-12, 18, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -30; dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30; dir.shadow.camera.bottom = -30;
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 70;
    dir.shadow.bias = -.0008;
    this.scene.add(dir);

    // practical lights placed through the house
    const lightPositions = [
      [this.cellCenterX(6), 3.2, this.cellCenterZ(14)],
      [this.cellCenterX(16), 3.2, this.cellCenterZ(14)],
      [this.cellCenterX(8), 3.2, this.cellCenterZ(7)],
      [this.cellCenterX(16), 3.2, this.cellCenterZ(6)],
      [this.cellCenterX(11), 3.2, this.cellCenterZ(16)],
    ];
    lightPositions.forEach((p, i) => {
      const l = new THREE.PointLight(i % 2 ? this.palette.glow : this.palette.lamp, 2.1, 15, 2);
      l.position.set(p[0], p[1], p[2]); this.scene.add(l);
    });
    const exitLight = new THREE.PointLight('#8ff0c6', .65, 8, 2);
    const sp = cellToWorld(this.spawnCell[0], this.spawnCell[1]);
    exitLight.position.set(sp.x, 2.5, sp.z); this.scene.add(exitLight);
    this.exitLight = exitLight;

    // chandeliers & hanging bulbs
    for (let i = 0; i < 5; i++) {
      const [gx, gz] = [randInt(4, 18), randInt(5, 17)];
      if (!this.isFloor(gx, gz)) continue;
      const p = cellToWorld(gx, gz);
      const cord = box(.03, 1.1, .03, new THREE.MeshStandardMaterial({ color: '#141015' }), p.x, WALL_H - .55, p.z);
      this.scene.add(cord);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), new THREE.MeshBasicMaterial({ color: this.palette.lamp }));
      bulb.position.set(p.x, WALL_H - 1.15, p.z); this.scene.add(bulb);
      const glow = glowSprite(this.def.theme === 'glass' ? '150,255,220' : '255,180,110', 1.8, .55);
      glow.position.copy(bulb.position); this.scene.add(glow);
    }

    // dust / ash motes
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand(-HALF + 3, HALF - 3);
      positions[i * 3 + 1] = rand(.2, WALL_H - .3);
      positions[i * 3 + 2] = rand(-HALF + 3, HALF - 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const motes = new THREE.Points(geo, new THREE.PointsMaterial({
      color: this.def.theme === 'glass' ? '#b7ffe4' : '#ffc08b', size: .055, transparent: true,
      opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    motes.frustumCulled = false;
    this.scene.add(motes);
    this.motes = motes;

    // ritual circle around the exit
    const rune = new THREE.Group();
    const runeMat = new THREE.MeshBasicMaterial({ color: '#ff4d55', transparent: true, opacity: .36, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const [r, tube] of [[1.2, .035], [1.55, .015], [.7, .018]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + tube, 40), runeMat);
      ring.rotation.x = -Math.PI / 2; rune.add(ring);
    }
    for (let i = 0; i < 5; i++) {
      const a0 = i / 5 * TAU - Math.PI / 2;
      const a1 = (i + 2) / 5 * TAU - Math.PI / 2;
      const pts = [];
      for (let k = 0; k <= 1; k += .05) {
        const a = lerp(a0, a1, k);
        pts.push(new THREE.Vector3(Math.cos(a) * 1.2, .01, Math.sin(a) * 1.2));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ff5364', transparent: true, opacity: .25, blending: THREE.AdditiveBlending }));
      line.rotation.x = 0; rune.add(line);
    }
    rune.position.copy(sp); rune.position.y = .055; rune.rotation.y = rand(0, TAU);
    this.scene.add(rune);
    this.rune = rune;
    this.exitRune = rune;

    this.buildPortal(sp);
  }

  buildPortal(sp) {
    const group = new THREE.Group();
    group.position.set(sp.x, 0, sp.z);
    group.visible = false;
    const mat = new THREE.MeshBasicMaterial({ color: '#8ff0c6', transparent: true, opacity: .82, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, .09, 8, 40), mat);
    ring.position.y = 1.45; group.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.48, .025, 6, 40), mat.clone());
    ring2.material.opacity = .4; ring2.position.y = 1.45; group.add(ring2);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), new THREE.MeshBasicMaterial({ color: '#173e35', transparent: true, opacity: .72, side: THREE.DoubleSide, depthWrite: false }));
    disk.position.y = 1.45; group.add(disk);
    const glow = glowSprite('100,255,195', 5.2, .65); glow.position.y = 1.5; group.add(glow);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, 1.35, 4.3, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#62e9bd', transparent: true, opacity: .12, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 2.15; group.add(beam);
    const light = new THREE.PointLight('#8ff0c6', 2.2, 12, 2); light.position.y = 1.6; group.add(light);
    this.scene.add(group);
    this.portal = { group, ring, ring2, disk, glow, beam, mat, t: 0 };
  }

  buildProps() {
    for (const room of this.rooms) {
      if (['living', 'dining', 'kitchen', 'bedroom', 'bath', 'study', 'parlor', 'library', 'chapel', 'game', 'courtyard', 'gallery', 'entry'].includes(room.type)) {
        this.decorateRoom(room);
      }
    }

    // blood, bones and other evidence of poor staging
    const bloodTex = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(84,5,17,.72)';
      const blobs = 9;
      for (let i = 0; i < blobs; i++) {
        const x = rand(w * .25, w * .75), y = rand(h * .25, h * .75), r = rand(10, 52);
        ctx.beginPath(); ctx.ellipse(x, y, r, r * rand(.3, .9), rand(0, TAU), 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 18; i++) {
        ctx.beginPath(); ctx.arc(rand(0, w), rand(0, h), rand(1, 8), 0, TAU); ctx.fill();
      }
    }, { clamp: true });
    const bloodMat = new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, opacity: .78, depthWrite: false });
    const cells = this.floorCells();
    for (let i = 0; i < 16; i++) {
      const [gx, gz] = pick(cells);
      const p = cellToWorld(gx, gz);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(rand(1.3, 3.6), rand(1.3, 3.2)), bloodMat);
      b.rotation.x = -Math.PI / 2; b.rotation.z = rand(0, TAU);
      b.position.set(p.x + rand(-.5, .5), .062, p.z + rand(-.5, .5));
      this.scene.add(b);
    }

    for (let i = 0; i < 7; i++) {
      const [gx, gz] = pick(cells);
      if (Math.hypot(gx - this.spawnCell[0], gz - this.spawnCell[1]) < 2) continue;
      const p = cellToWorld(gx, gz);
      this.scene.add(this.makeBonePile(p.x, p.z));
    }

    for (let i = 0; i < 5; i++) {
      const [gx, gz] = pick(cells);
      const p = cellToWorld(gx, gz);
      this.scene.add(this.makeCandleCluster(p.x, p.z, i === 0));
    }

    for (let i = 0; i < 8; i++) {
      const [gx, gz] = pick(cells);
      const p = cellToWorld(gx, gz);
      const flesh = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: '#5f1022', roughness: .72, emissive: '#37040d', emissiveIntensity: .55 });
      for (let j = 0; j < 3; j++) {
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(.25, .55), 0), mat);
        blob.position.set(rand(-.4, .4), rand(.1, .35), rand(-.4, .4)); blob.scale.y = rand(.6, 1.2); flesh.add(blob);
      }
      flesh.position.set(p.x, 0, p.z); this.scene.add(flesh);
    }

    // chains from the ceiling
    for (let i = 0; i < 10; i++) {
      const [gx, gz] = pick(cells);
      const p = cellToWorld(gx, gz);
      const chain = new THREE.Group();
      const n = randInt(3, 7);
      for (let j = 0; j < n; j++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(.09, .022, 5, 8), new THREE.MeshStandardMaterial({ color: '#7a7164', metalness: .7, roughness: .4 }));
        link.position.y = WALL_H - .4 - j * .18; link.rotation.y = j % 2 ? Math.PI / 2 : 0; link.rotation.x = .2; chain.add(link);
      }
      chain.position.set(p.x, 0, p.z); this.scene.add(chain);
    }

    // creepy portraits
    for (let i = 0; i < 7; i++) {
      const [gx, gz] = pick(cells);
      const sides = [];
      if (this.isWall(gx + 1, gz)) sides.push({ nx: 1, nz: 0, ry: -Math.PI / 2 });
      if (this.isWall(gx - 1, gz)) sides.push({ nx: -1, nz: 0, ry: Math.PI / 2 });
      if (this.isWall(gx, gz + 1)) sides.push({ nx: 0, nz: 1, ry: 0 });
      if (this.isWall(gx, gz - 1)) sides.push({ nx: 0, nz: -1, ry: Math.PI });
      if (!sides.length) continue;
      const sd = pick(sides);
      const p = cellToWorld(gx, gz);
      const frame = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: '#2d1c25', roughness: .6 });
      frame.add(box(1.0, 1.34, .08, wood, 0, 0, 0));
      const tex = canvasPortrait(this.def.theme);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(.78, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: .75 }));
      pic.position.z = .05; frame.add(pic);
      frame.position.set(p.x + sd.nx * (CELL / 2 - .05), 2.4, p.z + sd.nz * (CELL / 2 - .05));
      frame.rotation.y = sd.ry;
      this.scene.add(frame);
    }

    // graffiti near the exit
    const graffitiTex = canvasTexture(512, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(112,12,26,.72)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.font = 'italic 700 92px "Special Elite", monospace'; ctx.textAlign = 'center';
      ctx.strokeText('DON\'T BUY', w / 2, 105);
      ctx.font = 'italic 700 63px "Special Elite", monospace';
      ctx.strokeText('IT KNOWS', w / 2, 185);
    }, { clamp: true });
    const graf = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({ map: graffitiTex, transparent: true, depthWrite: false }));
    graf.position.set(this.cellCenterX(15), 2.3, this.cellCenterZ(16) - 1.36);
    this.scene.add(graf);

    // scattered dining chairs / couches are handled by room decoration
    // dim red emergency light for the ritual circle
    const ritualLight = new THREE.PointLight('#ff334d', 1.7, 10, 2);
    const sp = cellToWorld(this.spawnCell[0], this.spawnCell[1]);
    ritualLight.position.set(sp.x, 2.0, sp.z); this.scene.add(ritualLight);
    this.ritualLight = ritualLight;
  }

  floorCells() {
    const arr = [];
    for (let z = 2; z < N - 2; z++) for (let x = 2; x < N - 2; x++) if (this.floor[z][x]) arr.push([x, z]);
    return arr;
  }

  decorateRoom(room) {
    const c = this.roomCenter(room);
    const pal = this.palette;
    const rot = pick([0, Math.PI, Math.PI / 2, -Math.PI / 2]);
    switch (room.type) {
      case 'living': {
        const rug = this.makeRug(room.w * .7, room.d * .6, pal.rug);
        rug.position.set(c.x, .055, c.z); this.scene.add(rug);
        const sofa = makeSofa(pal); sofa.position.set(c.x, 0, c.z + 1.1); sofa.rotation.y = Math.PI; this.scene.add(sofa);
        const table = makeCoffeeTable(pal); table.position.set(c.x, 0, c.z - .5); this.scene.add(table);
        const tv = makeTV(pal); tv.position.set(c.x, 0, c.z + (room.d / 2 - 1.0)); tv.rotation.y = Math.PI; this.scene.add(tv);
        break;
      }
      case 'dining': {
        const set = makeDiningSet(pal, Math.min(room.w * .55, 5.2));
        set.position.set(c.x, 0, c.z); set.rotation.y = rot; this.scene.add(set);
        const chandelier = makeChandelier(pal); chandelier.position.set(c.x, WALL_H - 1.2, c.z); this.scene.add(chandelier);
        break;
      }
      case 'kitchen': {
        const island = makeKitchenIsland(pal); island.position.set(c.x, 0, c.z); island.rotation.y = rot; this.scene.add(island);
        const counter = makeCounter(pal, room.w * .65); counter.position.set(c.x - (rot === 0 ? 0 : 1.2), 0, c.z - (rot === 0 ? 2.4 : 0)); this.scene.add(counter);
        break;
      }
      case 'bedroom': {
        const bed = makeBed(pal); bed.position.set(c.x, 0, c.z); bed.rotation.y = rot; this.scene.add(bed);
        const night = makeNightstand(pal); night.position.set(c.x + (rot % Math.PI === 0 ? 2.0 : 0), 0, c.z + (rot % Math.PI === 0 ? 0 : 2.0)); this.scene.add(night);
        break;
      }
      case 'bath': {
        const tub = makeBathtub(pal); tub.position.set(c.x, 0, c.z); tub.rotation.y = rot; this.scene.add(tub);
        break;
      }
      case 'study': {
        const desk = makeDesk(pal); desk.position.set(c.x, 0, c.z); desk.rotation.y = rot; this.scene.add(desk);
        const shelf = makeBookshelf(pal, 2.4); shelf.position.set(c.x - (room.w / 2 - .8), 0, c.z); shelf.rotation.y = Math.PI / 2; this.scene.add(shelf);
        break;
      }
      case 'parlor': {
        const piano = makePiano(pal); piano.position.set(c.x - .8, 0, c.z + .4); piano.rotation.y = rot; this.scene.add(piano);
        const sofa = makeSofa(pal); sofa.position.set(c.x + 1.4, 0, c.z - 1.2); sofa.rotation.y = -rot; this.scene.add(sofa);
        break;
      }
      case 'library': {
        for (let i = -1; i <= 1; i++) {
          const shelf = makeBookshelf(pal, 2.6); shelf.position.set(c.x + i * 2.8, 0, c.z - room.d / 2 + .8); this.scene.add(shelf);
        }
        const table = makeCoffeeTable(pal); table.position.set(c.x, 0, c.z + .6); this.scene.add(table);
        break;
      }
      case 'chapel': {
        const altar = makeAltar(pal); altar.position.set(c.x, 0, c.z - 1.0); this.scene.add(altar);
        for (let i = 0; i < 6; i++) {
          const bench = box(3.4, .32, .42, new THREE.MeshStandardMaterial({ color: '#37222d', roughness: .85 }), c.x, .58, c.z + 1.2 + i * .8);
          this.scene.add(bench);
          this.scene.add(box(.12, .58, .36, new THREE.MeshStandardMaterial({ color: '#2a1922' }), c.x - 1.4, .29, c.z + 1.2 + i * .8));
          this.scene.add(box(.12, .58, .36, new THREE.MeshStandardMaterial({ color: '#2a1922' }), c.x + 1.4, .29, c.z + 1.2 + i * .8));
        }
        const candleMat = new THREE.MeshStandardMaterial({ color: '#f2dba5', emissive: '#ffb45c', emissiveIntensity: 1.2 });
        for (const sx of [-1.4, 1.4]) {
          const cand = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .85, 8), candleMat);
          cand.position.set(c.x + sx, 1.45, c.z - 1.0); this.scene.add(cand);
          const flame = glowSprite('255,170,80', .8, .8); flame.position.set(c.x + sx, 1.95, c.z - 1.0); this.scene.add(flame);
        }
        break;
      }
      case 'game': {
        const table = makeDiningSet(pal, 3.3, '#38553c');
        table.position.set(c.x, 0, c.z); table.rotation.y = rot; this.scene.add(table);
        const lamp = makeChandelier(pal); lamp.position.set(c.x, WALL_H - 1.4, c.z); this.scene.add(lamp);
        break;
      }
      case 'gallery': {
        for (let i = 0; i < 3; i++) {
          const ped = makePedestal(pal); ped.position.set(c.x - 2.2 + i * 2.2, 0, c.z + 1.0); this.scene.add(ped);
        }
        const rug = this.makeRug(room.w * .72, room.d * .55, pal.rug); rug.position.set(c.x, .055, c.z); this.scene.add(rug);
        break;
      }
      case 'courtyard': {
        const fountain = makeIndoorFountain(pal); fountain.position.set(c.x, 0, c.z); this.scene.add(fountain);
        for (const [sx, sz] of [[-3.8, -2.8], [3.8, -2.8], [-3.8, 2.8], [3.8, 2.8]]) {
          const col = box(.55, WALL_H, .55, new THREE.MeshStandardMaterial({ color: '#b9a892', roughness: .85 }), c.x + sx, WALL_H / 2, c.z + sz);
          this.scene.add(col);
        }
        break;
      }
      case 'entry': {
        const rug = this.makeRug(2.8, 2.2, pal.rug); rug.position.set(c.x, .055, c.z); this.scene.add(rug);
        const console = makeDesk(pal);
        console.scale.setScalar(.78);
        console.position.set(c.x - (room.w / 2 - 1.0), 0, c.z - 1.2);
        console.rotation.y = Math.PI / 2;
        this.scene.add(console);
        break;
      }
    }
  }

  makeRug(w, d, color) {
    const rug = box(w, .025, d, new THREE.MeshStandardMaterial({ color, roughness: .98 }), 0, 0, 0);
    const border = box(w + .18, .02, d + .18, new THREE.MeshStandardMaterial({ color: '#24151d', roughness: 1 }), 0, -.012, 0);
    const g = new THREE.Group(); g.add(border); g.add(rug);
    return g;
  }

  makeBonePile(x, z) {
    const g = new THREE.Group();
    const bone = new THREE.MeshStandardMaterial({ color: '#d6c9ae', roughness: .85 });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(rand(.035, .07), rand(.035, .08), rand(.28, .8), 6), bone);
      b.position.set(rand(-.45, .45), rand(.05, .18), rand(-.45, .45));
      b.rotation.set(rand(-.4, .4), rand(0, TAU), Math.PI / 2 + rand(-.4, .4));
      g.add(b);
    }
    const skull = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), bone); skull.position.set(0, .15, 0); skull.scale.set(.9, 1, .8); g.add(skull);
    for (const s of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(.045, 5, 4), new THREE.MeshBasicMaterial({ color: '#160b10' }));
      socket.position.set(s * .075, .17, .14); g.add(socket);
    }
    g.position.set(x, 0, z);
    return g;
  }

  makeCandleCluster(x, z, withLight) {
    const g = new THREE.Group();
    const wax = new THREE.MeshStandardMaterial({ color: '#e8d3a9', roughness: .8, emissive: '#ffab55', emissiveIntensity: .18 });
    const hold = new THREE.MeshStandardMaterial({ color: '#7b6847', metalness: .6, roughness: .35 });
    for (let i = 0; i < 5; i++) {
      const h = rand(.2, .65);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.035, .04, h, 7), wax);
      c.position.set(rand(-.25, .25), h / 2, rand(-.25, .25)); g.add(c);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(.035, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffc373' }));
      flame.position.set(c.position.x, h + .04, c.position.z); g.add(flame);
    }
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, .04, 10), hold); plate.position.y = .02; g.add(plate);
    g.position.set(x, 0, z);
    if (withLight) {
      const l = new THREE.PointLight('#ff9c52', 1.1, 7, 2); l.position.set(x, 1.1, z); this.scene.add(l);
    }
    return g;
  }

  buildPlayer() {
    this.pos = new THREE.Vector3();
    this.eyeHeight = 1.68;
    this.radius = .4;
    this.walkTime = 0;
    this.stepTimer = 0;
    this.weaponBob = 0;
  }

  buildWeapon() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: '#272127', metalness: .8, roughness: .28 });
    const steel = new THREE.MeshStandardMaterial({ color: '#5b5359', metalness: .9, roughness: .23 });
    const wood = new THREE.MeshStandardMaterial({ color: '#5a3527', roughness: .62 });
    const red = new THREE.MeshStandardMaterial({ color: '#8f2634', roughness: .5, emissive: '#5e101b', emissiveIntensity: .4 });

    const stock = box(.13, .15, .48, wood, .02, -.01, .28); stock.rotation.x = -.12; g.add(stock);
    const receiver = box(.11, .12, .4, dark, 0, .01, -.05); g.add(receiver);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.035, .042, .8, 10), steel);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .035, -.55); g.add(barrel);
    const under = new THREE.Mesh(new THREE.CylinderGeometry(.025, .028, .62, 8), dark);
    under.rotation.x = Math.PI / 2; under.position.set(0, -.035, -.49); g.add(under);
    const pump = box(.11, .09, .24, wood, 0, -.028, -.38); g.add(pump);
    const heat = box(.085, .055, .2, red, 0, .085, -.34); g.add(heat);
    const grip = box(.08, .2, .1, wood, 0, -.15, .13); grip.rotation.x = -.3; g.add(grip);
    const sight = box(.03, .05, .03, steel, 0, .1, -.78); g.add(sight);
    const trigger = box(.035, .06, .03, dark, 0, -.05, .02); g.add(trigger);

    const muzzle = glowSprite('255,185,75', .55, .95);
    muzzle.position.set(0, .035, -.98); muzzle.visible = false; g.add(muzzle);
    const light = new THREE.PointLight('#ffb35f', 0, 8, 2); light.position.set(0, .2, -1.0); g.add(light);

    g.position.set(.32, -.33, -.98);
    g.rotation.set(.015, -.045, -.012);
    g.scale.setScalar(.78);
    this.camera.add(g);
    this.weapon = g;
    this.weaponBase = g.position.clone();
    this.muzzle = muzzle;
    this.muzzleLight = light;
    this.recoil = 0;
    this.muzzleTimer = 0;
  }

  setupSpawn() {
    const sp = cellToWorld(this.spawnCell[0], this.spawnCell[1]);
    this.pos.set(sp.x, 0, sp.z);
    this.yaw = 0;
    this.pitch = 0;
    this.camera.position.set(sp.x, this.eyeHeight, sp.z);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.updateFlow();
    this.startPos = sp.clone();
  }

  setInput(mx, my) { this.moveX = mx; this.moveY = my; }
  addLook(dx, dy) { this.lookDX += dx; this.lookDY += dy; }
  startFiring() { this.firing = true; }
  stopFiring() { this.firing = false; }

  update(dt) {
    this.time += dt;
    if (this.state === 'dead') {
      this.updateCamera(dt);
      this.updateEffects(dt);
      return;
    }
    this.yaw -= this.lookDX;
    this.pitch = clamp(this.pitch - this.lookDY, -1.15, 1.08);
    this.lookDX = 0; this.lookDY = 0;

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.viewKick = damp(this.viewKick, 0, 10, dt);
    this.shake = Math.max(0, this.shake - dt * 2.3);

    if (this.state === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.state = 'combat';
        this.startWave();
      }
    } else if (this.state === 'intermission') {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) this.startWave();
    }

    if (this.state === 'combat' || this.state === 'cleared' || this.state === 'intermission' || this.state === 'intro') {
      this.updatePlayer(dt);
    }
    this.updateWeapon(dt);
    if (this.state === 'combat' || this.state === 'cleared') {
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updatePickups(dt);
      this.updateFlowTimer(dt);
    }
    this.updatePortal(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);
    this.updateMotes(dt);
    this.checkExit(dt);
    this.updateHUDTimer(dt);
  }

  updatePlayer(dt) {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3().addScaledVector(forward, this.moveY).addScaledVector(right, this.moveX);
    if (wish.lengthSq() > 1) wish.normalize();
    const speed = 5.9;
    const dx = wish.x * speed * dt, dz = wish.z * speed * dt;

    if (!this.collides(this.pos.x + dx, this.pos.z, this.radius)) this.pos.x += dx;
    if (!this.collides(this.pos.x, this.pos.z + dz, this.radius)) this.pos.z += dz;

    const moving = wish.lengthSq() > .02;
    if (moving) {
      this.walkTime += dt * (6.4 + Math.abs(Math.sin(this.walkTime)) * .8);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) { this.audio.step(); this.stepTimer = .34; }
    } else {
      this.stepTimer = 0;
    }
    this.weaponBob = damp(this.weaponBob, moving ? 1 : 0, 8, dt);
  }

  collides(x, z, r = .38) {
    const samples = [
      [x + r, z], [x - r, z], [x, z + r], [x, z - r],
      [x + r * .7, z + r * .7], [x - r * .7, z + r * .7], [x + r * .7, z - r * .7], [x - r * .7, z - r * .7],
    ];
    for (const [sx, sz] of samples) {
      const [gx, gz] = worldToCell(sx, sz);
      if (!this.isFloor(gx, gz)) return true;
    }
    return false;
  }

  collidesPoint(x, z) {
    const [gx, gz] = worldToCell(x, z);
    return !this.isFloor(gx, gz);
  }

  updateCamera(dt) {
    const bob = Math.sin(this.walkTime) * .035 * this.weaponBob;
    const sway = Math.cos(this.walkTime * .5) * .022 * this.weaponBob;
    const sx = (Math.random() - .5) * this.shake * .06;
    const sy = (Math.random() - .5) * this.shake * .06;
    this.camera.position.set(this.pos.x + sway, this.eyeHeight + bob + sy, this.pos.z + sx);
    this.camera.rotation.set(this.pitch + this.viewKick + (Math.random() - .5) * this.shake * .02, this.yaw + sx * .4, 0, 'YXZ');
  }

  updateWeapon(dt) {
    this.recoil = damp(this.recoil, 0, 12, dt);
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    this.muzzle.visible = this.muzzleTimer > 0;
    this.muzzleLight.intensity = this.muzzleTimer > 0 ? 3.2 : 0;
    const b = this.weaponBob;
    const bobX = Math.cos(this.walkTime * .5) * .008 * b;
    const bobY = Math.abs(Math.sin(this.walkTime)) * .012 * b;
    this.weapon.position.set(this.weaponBase.x + bobX, this.weaponBase.y + bobY - this.recoil * .03, this.weaponBase.z + this.recoil * .13);
    this.weapon.rotation.x = .015 + this.recoil * .15;
    this.weapon.rotation.y = -.035 + Math.sin(this.walkTime * .5) * .01 * b;
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      this.weapon.rotation.x += .22;
      this.weapon.position.y -= .08;
      if (this.reloadTimer <= 0 && this.state !== 'dead') {
        this.ammo = this.maxAmmo;
        this.cb.onAmmo?.(this.ammo, this.maxAmmo);
        this.audio.pump();
      }
    }
    if (this.firing && this.fireCooldown <= 0 && this.reloadTimer <= 0 && !this.dead) {
      this.shoot();
    }
    if (this.firing && this.ammo <= 0 && this.reloadTimer <= 0) this.reloadTimer = 1.0;
  }

  shoot() {
    if (this.ammo <= 0) { this.reloadTimer = 1.0; return; }
    this.ammo--;
    this.cb.onAmmo?.(this.ammo, this.maxAmmo);
    this.fireCooldown = .72;
    this.recoil = 1;
    this.viewKick += .032;
    this.shake = Math.max(this.shake, .7);
    this.muzzleTimer = .065;
    this.audio.shotgun();
    this.cb.onShoot?.();

    const origin = this.camera.position.clone();
    const baseEuler = new THREE.Euler(this.pitch + this.viewKick, this.yaw, 0, 'YXZ');
    const baseDir = new THREE.Vector3(0, 0, -1).applyEuler(baseEuler);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    const up = new THREE.Vector3(0, 1, 0);

    let hitAny = false;
    for (let p = 0; p < 8; p++) {
      const dir = baseDir.clone()
        .addScaledVector(right, rand(-.035, .035))
        .addScaledVector(up, rand(-.03, .03))
        .normalize();
      const wallDist = this.rayWallDist(origin, dir, 50);
      let bestT = wallDist, bestEnemy = null;
      for (const e of this.enemies) {
        if (e.dead || e.spawnT > .45) continue;
        const c = new THREE.Vector3(e.group.position.x, e.hitY, e.group.position.z);
        const oc = c.clone().sub(origin);
        const tca = oc.dot(dir);
        if (tca < 0 || tca > bestT) continue;
        const d2 = oc.lengthSq() - tca * tca;
        const hitR = e.hitR;
        if (d2 < hitR * hitR) {
          const t = tca - Math.sqrt(hitR * hitR - d2);
          if (t > 0 && t < bestT) { bestT = t; bestEnemy = e; }
        }
      }
      const hit = origin.clone().addScaledVector(dir, bestT);
      if (bestEnemy) {
        hitAny = true;
        this.damageEnemy(bestEnemy, 14, dir);
        this.spawnBurst(hit, '160,15,25', 7, .055, 2.8, true);
      } else {
        if (p < 4) this.spawnBurst(hit, '255,170,80', 3, .04, 1.8, false);
      }
      if (p < 5) this.addTracer(origin.clone().addScaledVector(dir, .6), hit, bestEnemy ? '#ff7160' : '#ffd08a');
    }
    if (hitAny) this.cb.onHit?.();
    if (this.ammo <= 0) this.reloadTimer = 1.05;
  }

  rayWallDist(origin, dir, maxDist) {
    const step = .18;
    for (let t = .2; t < maxDist; t += step) {
      const x = origin.x + dir.x * t, z = origin.z + dir.z * t;
      if (this.collidesPoint(x, z)) return t;
    }
    return maxDist;
  }

  damageEnemy(enemy, dmg, dir) {
    if (enemy.dead) return;
    enemy.hp -= dmg;
    enemy.flash = .08;
    enemy.hitShake = .12;
    for (const m of enemy.mats) {
      if (m.emissive) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 2.5; }
    }
    this.audio.hit();
    if (enemy.isBoss) this.cb.onBoss?.(Math.max(0, enemy.hp), enemy.maxHp);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills++;
    this.cb.onKill?.(enemy.type, this.kills);
    this.audio.impDie();
    const p = enemy.group.position.clone(); p.y = enemy.hitY;
    this.spawnBurst(p, enemy.type === 'floater' ? '255,120,60' : '120,10,22', 22, .09, 4.2, true);
    this.spawnBurst(p, '255,180,80', 8, .06, 2.2, false);
    if (Math.random() < .34) this.spawnPickup(enemy.group.position.x, enemy.group.position.z);
    this.scene.remove(enemy.group);
    if (enemy.isBoss) this.cb.onBoss?.(0, enemy.maxHp);
    const left = this.enemies.filter(e => !e.dead).length;
    this.cb.onEnemies?.(left);
    if (left === 0) this.waveCleared();
  }

  spawnPickup(x, z) {
    const g = makeCrossPickup();
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.pickups.push({ group: g, t: 0, x, z });
  }

  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.t += dt;
      p.group.position.y = 1.04 + Math.sin(p.t * 2.6) * .12;
      p.group.rotation.y += dt * 1.8;
      const d = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
      if (d < 1.15) {
        this.health = Math.min(this.maxHealth, this.health + 18);
        this.cb.onHealth?.(this.health, this.maxHealth);
        this.cb.onPickup?.();
        this.audio.pickup();
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  updatePortal(dt) {
    if (!this.portal) return;
    const p = this.portal;
    p.t += dt;
    p.ring.rotation.z += dt * .7;
    p.ring2.rotation.z -= dt * .4;
    p.disk.rotation.z += dt * .25;
    p.glow.material.opacity = .45 + Math.sin(p.t * 2.8) * .16;
    p.glow.scale.setScalar(5.0 + Math.sin(p.t * 1.7) * .6);
    if (this.exitActive) {
      this.exitRune.rotation.y += dt * .2;
      this.exitRune.children.forEach((c, i) => { if (c.material) c.material.opacity = .28 + Math.sin(this.time * 2 + i) * .12; });
    }
  }

  checkExit() {
    if (!this.exitActive) return;
    const d = Math.hypot(this.pos.x - this.startPos.x, this.pos.z - this.startPos.z);
    const near = d < 2.15;
    if (near !== this.exitNear) {
      this.exitNear = near;
      this.cb.onExitNear?.(near);
    }
  }

  requestExit() {
    if (this.exitActive && this.exitNear && this.state !== 'dead') {
      this.firing = false;
      this.state = 'exiting';
      this.cb.onExit?.();
      return true;
    }
    return false;
  }

  updateMotes(dt) {
    if (!this.motes) return;
    const pos = this.motes.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] += dt * .06;
      pos[i] += Math.sin(this.time * .3 + i) * .0008;
      if (pos[i + 1] > WALL_H - .2) pos[i + 1] = .2;
    }
    this.motes.geometry.attributes.position.needsUpdate = true;
  }

  updateHUDTimer(dt) {
    this.hudTimer = (this.hudTimer || 0) + dt;
    if (this.hudTimer > .25) {
      this.hudTimer = 0;
      this.cb.onEnemies?.(this.enemies.filter(e => !e.dead).length);
    }
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  startWave() {
    this.waveIndex++;
    if (this.waveIndex >= this.waves.length) return;
    this.state = 'combat';
    this.updateFlow();
    const comp = this.waves[this.waveIndex];
    const candidates = this.floorCells().filter(([x, z]) => {
      const idx = z * N + x;
      return this.flow[idx] < 0 || this.flow[idx] > 5;
    });
    const pool = candidates.length >= comp.length ? candidates : this.floorCells();
    const used = new Set();
    // The Seller gets a stage: the largest room, straight ahead of the entry,
    // so the final encounter opens with him in view instead of in a far closet.
    let bossCell = null;
    if (comp.includes('boss')) {
      const stage = this.rooms
        .filter(r => r.type !== 'entry')
        .sort((a, b) => (b.w * b.d) - (a.w * a.d))[0];
      if (stage) {
        const cell = worldToCell(stage.cx, stage.cz);
        if (this.isFloor(cell[0], cell[1])) bossCell = cell;
      }
    }
    comp.forEach((type, i) => {
      if (type === 'boss' && bossCell) {
        this.spawnEnemy('boss', bossCell);
        used.add(bossCell[0] + ',' + bossCell[1]);
        return;
      }
      let cell = null;
      for (let tries = 0; tries < 40; tries++) {
        const c = pick(pool);
        const key = c[0] + ',' + c[1];
        if (!used.has(key)) { cell = c; used.add(key); break; }
      }
      if (!cell) cell = pick(pool);
      this.spawnEnemy(type, cell);
    });
    this.spawned += comp.length;
    this.cb.onAmmo?.(this.ammo, this.maxAmmo);
    this.cb.onWave?.(this.waveIndex + 1, this.waves.length, comp.length);
    this.cb.onEnemies?.(this.enemies.filter(e => !e.dead).length);
    this.cb.onBanner?.(
      this.waveIndex === 0 ? 'OPEN HOUSE' : `WAVE ${this.waveIndex + 1} OF ${this.waves.length}`,
      this.waveIndex === 0 ? 'WELCOME HOME' : 'THEY KEEP COMING',
      this.waveIndex === 0 ? 'THE PREVIOUS OWNERS NEVER LEFT' : 'CLEANSE EVERY ROOM',
    );
    this.audio.wave();
    const boss = comp.includes('boss');
    if (boss) {
      const bossEnemy = this.enemies.find(e => e.isBoss && !e.dead);
      this.cb.onBoss?.(bossEnemy?.hp ?? 1, bossEnemy?.maxHp ?? 1);
      this.cb.onMessage?.('THE SELLER HAS ARRIVED', true);
    }
  }

  spawnEnemy(type, cell) {
    this.enemyId++;
    const cfg = {
      imp: { hp: 62, speed: 2.35, damage: 9, atkRange: 1.85, atkCd: 1.15, hitR: .53, hitY: 1.05, baseY: 0, melee: true },
      floater: { hp: 40, speed: 1.8, damage: 9, atkRange: 18, atkCd: 2.35, hitR: .52, hitY: 1.65, baseY: .55, melee: false },
      brute: { hp: 170, speed: 1.58, damage: 19, atkRange: 2.45, atkCd: 1.55, hitR: .82, hitY: 1.28, baseY: 0, melee: true },
      boss: { hp: 520, speed: 1.42, damage: 27, atkRange: 3.05, atkCd: 1.3, hitR: 1.22, hitY: 1.85, baseY: 0, melee: true, isBoss: true },
    }[type];
    const scale = type === 'boss' ? 1.62 : type === 'brute' ? 1.08 : 1;
    const visual = makeEnemyVisual(type, this.palette, scale);
    const p = cellToWorld(cell[0], cell[1]);
    const group = visual.group;
    group.position.set(p.x, cfg.baseY, p.z);
    group.scale.setScalar(.01);
    this.scene.add(group);
    if (type === 'boss') {
      const label = makeTextSprite('THE SELLER', { color: '#ff7b8d', size: 54, width: 400, height: 84, scale: .62 });
      label.position.set(0, 3.4, 0); group.add(label);
    }
    const enemy = {
      id: this.enemyId, type, group, ...cfg, maxHp: cfg.hp, hp: cfg.hp,
      hitY: cfg.hitY * scale + cfg.baseY, hitR: cfg.hitR * scale, baseScale: scale,
      mats: visual.mats, parts: visual.parts, dead: false, spawnT: .9, flash: 0,
      atkTimer: rand(.6, 1.8), losTimer: 0, los: false, targetCell: null,
      walkPhase: rand(0, TAU), baseY: cfg.baseY, lunge: 0, hitShake: 0,
      isBoss: !!cfg.isBoss, bobOffset: rand(0, TAU),
    };
    this.enemies.push(enemy);
    this.spawnBurst(new THREE.Vector3(p.x, cfg.hitY, p.z), type === 'boss' ? '255,70,80' : '255,110,60', type === 'boss' ? 30 : 14, .08, 2.5, true);
    this.audio.growl();
  }

  waveCleared() {
    if (this.state !== 'combat') return;
    if (this.waveIndex >= this.waves.length - 1) {
      this.state = 'cleared';
      this.exitActive = true;
      this.portal.group.visible = true;
      this.cb.onClear?.();
      this.cb.onExitReady?.(true);
      this.audio.clear();
      this.cb.onBanner?.('HOUSE CLEARED', 'SOUL CLEANSED', 'STEP INTO THE PORTAL TO HEAD OUTSIDE', 3400);
      this.cb.onMessage?.('THE PORTAL IS OPEN');
    } else {
      this.state = 'intermission';
      this.waveDelay = 2.8;
      this.audio.clear();
      this.cb.onBanner?.('ROOMS CLEARED', 'HOLD THE LINE', 'SOMETHING ELSE IS COMING UP THE BASEMENT STAIRS');
    }
  }

  updateFlow() {
    this.flow.fill(-1);
    const [sx, sz] = worldToCell(this.pos.x, this.pos.z);
    if (!this.isFloor(sx, sz)) return;
    const q = [sz * N + sx];
    this.flow[sz * N + sx] = 0;
    let head = 0;
    while (head < q.length) {
      const idx = q[head++];
      const x = idx % N, z = Math.floor(idx / N);
      const d = this.flow[idx];
      const neighbors = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]];
      for (const [nx, nz] of neighbors) {
        if (!this.isFloor(nx, nz)) continue;
        const ni = nz * N + nx;
        if (this.flow[ni] === -1) { this.flow[ni] = d + 1; q.push(ni); }
      }
    }
  }

  updateFlowTimer(dt) {
    this.flowTimer -= dt;
    if (this.flowTimer <= 0) {
      this.flowTimer = .38;
      this.updateFlow();
    }
  }

  flowTarget(enemy) {
    const [gx, gz] = worldToCell(enemy.group.position.x, enemy.group.position.z);
    let best = this.flow[gz * N + gx];
    let bx = gx, bz = gz;
    for (const [nx, nz] of [[gx + 1, gz], [gx - 1, gz], [gx, gz + 1], [gx, gz - 1]]) {
      if (!this.isFloor(nx, nz)) continue;
      const v = this.flow[nz * N + nx];
      if (v >= 0 && (best < 0 || v < best)) { best = v; bx = nx; bz = nz; }
    }
    return cellToWorld(bx, bz);
  }

  hasLOS(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const d = Math.hypot(dx, dz);
    if (d < .2) return true;
    const steps = Math.ceil(d / .35);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.collidesPoint(ax + dx * t, az + dz * t)) return false;
    }
    return true;
  }

  updateEnemies(dt) {
    const alive = this.enemies.filter(e => !e.dead);
    for (const e of alive) {
      if (e.spawnT > 0) {
        e.spawnT -= dt;
        const p = clamp(1 - e.spawnT / .9, 0, 1);
        const s = (p < .8 ? p / .8 : 1 + Math.sin((p - .8) * Math.PI / .2) * .08) * e.baseScale;
        e.group.scale.setScalar(s);
        e.group.position.y = e.baseY;
        continue;
      }
      e.flash = Math.max(0, e.flash - dt);
      if (e.flash <= 0) {
        for (const m of e.mats) {
          if (m.emissive) { m.emissive.copy(m.userData.baseEmissive || new THREE.Color(0, 0, 0)); m.emissiveIntensity = m.userData.baseEmissiveIntensity ?? 1; }
        }
      }
      e.atkTimer -= dt;
      e.losTimer -= dt;
      if (e.losTimer <= 0) {
        e.losTimer = .18;
        e.los = this.hasLOS(e.group.position.x, e.group.position.z, this.pos.x, this.pos.z);
      }
      const dx = this.pos.x - e.group.position.x, dz = this.pos.z - e.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < .001) continue;
      const nx = dx / dist, nz = dz / dist;
      e.group.rotation.y = Math.atan2(nx, nz);
      e.lunge = Math.max(0, e.lunge - dt * 4);

      let moveX = 0, moveZ = 0;
      if (e.type === 'floater') {
        if (e.los && dist < 19) {
          if (dist > 8) { moveX = nx * .45; moveZ = nz * .45; }
          else if (dist < 4.5) { moveX = -nx * .55; moveZ = -nz * .55; }
          else { moveX = -nz * .35; moveZ = nx * .35; }
          if (e.atkTimer <= 0) {
            e.atkTimer = e.atkCd + rand(-.2, .35);
            this.shootFireball(e);
          }
        } else {
          const t = this.flowTarget(e);
          const tx = t.x - e.group.position.x, tz = t.z - e.group.position.z;
          const td = Math.hypot(tx, tz);
          if (td > .3) { moveX = tx / td; moveZ = tz / td; }
        }
        e.group.position.y = e.baseY + Math.sin(this.time * 2.1 + e.bobOffset) * .28;
      } else {
        const close = e.los && dist < e.atkRange;
        if (close) {
          if (e.atkTimer <= 0) {
            e.atkTimer = e.atkCd;
            e.lunge = 1;
            this.damagePlayer(e.damage);
            this.audio.growl();
          }
        } else {
          if (e.los && dist < 10) { moveX = nx; moveZ = nz; }
          else {
            const t = this.flowTarget(e);
            const tx = t.x - e.group.position.x, tz = t.z - e.group.position.z;
            const td = Math.hypot(tx, tz);
            if (td > .25) { moveX = tx / td; moveZ = tz / td; }
          }
        }
        e.group.position.y = e.baseY;
      }

      if (moveX || moveZ) {
        const sp = e.speed;
        const candX = e.group.position.x + moveX * sp * dt;
        const candZ = e.group.position.z + moveZ * sp * dt;
        if (!this.collides(candX, candZ, .45)) {
          e.group.position.x = candX; e.group.position.z = candZ;
        } else if (!this.collides(candX, e.group.position.z, .45)) {
          e.group.position.x = candX;
        } else if (!this.collides(e.group.position.x, candZ, .45)) {
          e.group.position.z = candZ;
        }
        e.walkPhase += dt * sp * 3.2;
      }
      this.animateEnemy(e, dt);
    }

    // separate enemies so they do not occupy the same doorway
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        if (a.spawnT > 0 || b.spawnT > 0) continue;
        const dx = b.group.position.x - a.group.position.x;
        const dz = b.group.position.z - a.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.0 && d > .001) {
          const push = (1.0 - d) * .5;
          const nx = dx / d, nz = dz / d;
          if (!this.collides(a.group.position.x - nx * push, a.group.position.z - nz * push, .4)) {
            a.group.position.x -= nx * push; a.group.position.z -= nz * push;
          }
          if (!this.collides(b.group.position.x + nx * push, b.group.position.z + nz * push, .4)) {
            b.group.position.x += nx * push; b.group.position.z += nz * push;
          }
        }
      }
    }
  }

  animateEnemy(e, dt) {
    const p = e.parts;
    if (!p) return;
    const swing = Math.sin(e.walkPhase) * .55;
    if (p.legL) p.legL.rotation.x = swing;
    if (p.legR) p.legR.rotation.x = -swing;
    if (p.armL) p.armL.rotation.x = -swing * .8 - e.lunge * 1.2;
    if (p.armR) p.armR.rotation.x = swing * .8 - e.lunge * 1.2;
    if (p.body) p.body.position.y = (p.bodyBaseY || 0) + Math.abs(Math.sin(e.walkPhase)) * .03;
    if (e.type === 'floater') {
      e.group.rotation.z = Math.sin(this.time * 1.7 + e.bobOffset) * .08;
      if (p.armL) p.armL.rotation.z = .8 + Math.sin(this.time * 3) * .15;
      if (p.armR) p.armR.rotation.z = -.8 - Math.sin(this.time * 3) * .15;
    }
  }

  shootFireball(e) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#ff7a3c' });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.19, 8, 6), mat);
    group.add(ball);
    const glow = glowSprite('255,85,45', 1.8, .8); group.add(glow);
    const p = new THREE.Vector3(e.group.position.x, e.hitY + .1, e.group.position.z);
    group.position.copy(p);
    this.scene.add(group);
    const target = new THREE.Vector3(this.pos.x, 1.15, this.pos.z);
    const vel = target.sub(p).normalize().multiplyScalar(8.2);
    this.projectiles.push({ group, vel, life: 4.5, glow, radius: .26 });
    this.audio.tone?.(180, .2, 'sawtooth', .06, 0, 80);
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.group.position.addScaledVector(p.vel, dt);
      p.glow.material.opacity = .5 + Math.sin(this.time * 14 + i) * .2;
      const pos = p.group.position;
      let hit = p.life <= 0 || this.collidesPoint(pos.x, pos.z);
      const pd = Math.hypot(pos.x - this.pos.x, pos.z - this.pos.z);
      if (pd < .65 && Math.abs(pos.y - 1.2) < 1.1) hit = true;
      if (hit) {
        this.spawnBurst(pos, '255,110,55', 12, .06, 3, false);
        if (pd < .8) this.damagePlayer(9);
        this.scene.remove(p.group);
        this.projectiles.splice(i, 1);
      }
    }
  }

  damagePlayer(amount) {
    if (this.dead || this.state === 'dead' || this.state === 'cleared' || this.state === 'exiting') return;
    if (this.damageCd > 0) return;
    this.damageCd = .38;
    this.health -= amount;
    this.shake = 1.6;
    this.cb.onHealth?.(Math.max(0, this.health), this.maxHealth);
    this.cb.onDamage?.(amount);
    this.audio.hurt();
    if (this.health <= 0) this.die();
  }

  die() {
    if (this.state === 'dead') return;
    this.health = 0;
    this.dead = true;
    this.state = 'dead';
    this.firing = false;
    this.weapon.visible = false;
    this.audio.death();
    this.shake = 3;
    this.cb.onDeath?.();
  }

  updateEffects(dt) {
    this.damageCd = Math.max(0, (this.damageCd || 0) - dt);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      const pos = fx.geo.attributes.position.array;
      for (let j = 0; j < fx.vel.length; j++) {
        fx.vel[j].y -= fx.gravity * dt;
        pos[j * 3] += fx.vel[j].x * dt;
        pos[j * 3 + 1] += fx.vel[j].y * dt;
        pos[j * 3 + 2] += fx.vel[j].z * dt;
      }
      fx.geo.attributes.position.needsUpdate = true;
      fx.mat.opacity = clamp(fx.life / fx.maxLife, 0, 1) * fx.opacity;
      if (fx.life <= 0) {
        this.scene.remove(fx.points);
        fx.geo.dispose(); fx.mat.dispose();
        this.effects.splice(i, 1);
      }
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt;
      s.mat.opacity = clamp(s.life / s.maxLife, 0, 1) * .7;
      if (s.life <= 0) {
        this.scene.remove(s.line);
        s.line.geometry.dispose(); s.mat.dispose();
        this.shots.splice(i, 1);
      }
    }
  }

  spawnBurst(pos, rgb, count, size, speed, gravity) {
    const positions = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y; positions[i * 3 + 2] = pos.z;
      const a = rand(0, TAU), p = rand(0, Math.PI);
      const s = rand(.3, 1) * speed;
      vel.push(new THREE.Vector3(Math.sin(p) * Math.cos(a) * s, Math.cos(p) * s * .8 + speed * .2, Math.sin(p) * Math.sin(a) * s));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: `rgb(${rgb})`, size, transparent: true, opacity: .95, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.effects.push({ points: pts, geo, mat, vel, life: rand(.3, .7), maxLife: .7, gravity: gravity ? 7 : 1.2, opacity: .95 });
  }

  addTracer(a, b, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.shots.push({ line, mat, life: .07, maxLife: .07 });
  }

  updateBoss(dt) { /* reserved for the seller's grand entrance */ }

  uiUpdate() {
    this.cb.onHealth?.(this.health, this.maxHealth);
    this.cb.onAmmo?.(this.ammo, this.maxAmmo);
    this.cb.onEnemies?.(0);
    this.cb.onWave?.(0, this.waves.length, 0);
  }

  dispose() {
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const arr = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of arr) {
          for (const k of Object.keys(m)) {
            const v = m[k];
            if (v && v.isTexture) v.dispose();
          }
          m.dispose();
        }
      }
    });
    this.scene.clear();
  }
}

function enemyMaterial(color, opts = {}, mats) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? .72, metalness: opts.metalness ?? .05,
    emissive: opts.emissive ?? '#000000', emissiveIntensity: opts.emissiveIntensity ?? 1,
    flatShading: opts.flatShading ?? true,
  });
  m.userData.baseEmissive = new THREE.Color(opts.emissive || '#000000');
  m.userData.baseEmissiveIntensity = opts.emissiveIntensity ?? 1;
  mats.push(m);
  return m;
}

function makeEnemyVisual(type, pal, scale = 1) {
  const group = new THREE.Group();
  const mats = [];
  const parts = {};
  const skin = enemyMaterial(type === 'floater' ? '#d8ccb1' : type === 'brute' ? '#5d1825' : '#a73a32', { roughness: .8, emissive: '#230207', emissiveIntensity: .5 }, mats);
  const dark = enemyMaterial('#2b0e16', { roughness: .65 }, mats);
  const horn = enemyMaterial('#e6d8b8', { roughness: .55 }, mats);
  const fire = enemyMaterial('#ff5936', { emissive: '#ff3c1f', emissiveIntensity: 2.2, roughness: .3 }, mats);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffd35e' });

  if (type === 'imp') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.31, .52, 4, 8), skin);
    body.position.y = 1.05; body.scale.z = .72; group.add(body); parts.body = body; parts.bodyBaseY = 1.05;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), dark); belly.position.set(0, .98, .17); belly.scale.set(1, .8, .5); group.add(belly);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), skin); head.position.y = 1.65; group.add(head); parts.head = head;
    const jaw = box(.24, .09, .16, dark, 0, 1.48, .21); group.add(jaw);
    for (const s of [-1, 1]) {
      const horns = new THREE.Mesh(new THREE.ConeGeometry(.065, .38, 5), horn);
      horns.position.set(s * .24, 1.91, -.02); horns.rotation.z = s * -.55; group.add(horns);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 4), eyeMat);
      eye.position.set(s * .12, 1.68, .26); group.add(eye);
    }
    const legGeo = new THREE.CapsuleGeometry(.1, .42, 3, 6);
    const legL = new THREE.Group(); legL.position.set(-.17, .55, 0);
    const ll = new THREE.Mesh(legGeo, skin); ll.position.y = -.25; legL.add(ll);
    const lf = box(.2, .11, .33, dark, 0, -.51, .06); legL.add(lf); group.add(legL);
    const legR = new THREE.Group(); legR.position.set(.17, .55, 0);
    const rl = new THREE.Mesh(legGeo, skin); rl.position.y = -.25; legR.add(rl);
    const rf = box(.2, .11, .33, dark, 0, -.51, .06); legR.add(rf); group.add(legR);
    parts.legL = legL; parts.legR = legR;
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(s * .34, 1.3, 0);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .4, 3, 6), skin); a.position.y = -.22; arm.add(a);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 4), horn); claw.position.y = -.49; claw.rotation.x = Math.PI; arm.add(claw);
      arm.rotation.z = s * .25;
      group.add(arm); if (s < 0) parts.armL = arm; else parts.armR = arm;
    }
    group.scale.setScalar(scale);
    return { group, mats, parts };
  }

  if (type === 'floater') {
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(.33, 1), skin);
    skull.position.y = 1.55; skull.scale.set(1, 1.05, .9); group.add(skull); parts.body = skull; parts.bodyBaseY = 1.55;
    const jaw = box(.3, .13, .25, skin, 0, 1.28, .06); group.add(jaw);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.07, 7, 5), new THREE.MeshBasicMaterial({ color: '#ff502d' }));
      eye.position.set(s * .12, 1.58, .27); group.add(eye);
      const hornMesh = new THREE.Mesh(new THREE.ConeGeometry(.06, .25, 5), horn);
      hornMesh.position.set(s * .25, 1.82, -.02); hornMesh.rotation.z = s * -.4; group.add(hornMesh);
    }
    // spectral lower body
    const clothMat = enemyMaterial('#3b1425', { emissive: '#1e0710', emissiveIntensity: .6, roughness: .9 }, mats);
    for (let i = 0; i < 4; i++) {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(.09, .55, 5), clothMat);
      tail.position.set((i - 1.5) * .11, .95, 0); tail.rotation.z = (i - 1.5) * .2; group.add(tail);
    }
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(s * .26, 1.45, -.08);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .28, 3, 5), skin); a.position.y = -.15; arm.add(a);
      arm.rotation.z = s * .9; group.add(arm); if (s < 0) parts.armL = arm; else parts.armR = arm;
    }
    const aura = glowSprite('255,80,45', 1.8, .35); aura.position.y = 1.45; group.add(aura);
    const fireOrb = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 4), fire); fireOrb.position.y = 1.1; group.add(fireOrb);
    group.scale.setScalar(scale);
    return { group, mats, parts };
  }

  // brute / boss
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.5, .68, 4, 8), skin);
  body.position.y = 1.25; body.scale.z = .85; group.add(body); parts.body = body; parts.bodyBaseY = 1.25;
  const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(.4, 0), dark); chest.position.set(0, 1.32, .28); chest.scale.set(1, .8, .55); group.add(chest);
  const rune = new THREE.Mesh(new THREE.RingGeometry(.07, .15, 6), new THREE.MeshBasicMaterial({ color: '#ff5d42' }));
  rune.position.set(0, 1.35, .56); group.add(rune);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 0), skin); head.position.y = 2.03; head.scale.set(1.1, .9, .95); group.add(head); parts.head = head;
  for (const s of [-1, 1]) {
    const horns = new THREE.Mesh(new THREE.ConeGeometry(.11, .62, 5), horn);
    horns.position.set(s * .31, 2.33, -.04); horns.rotation.z = s * -.5; group.add(horns);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.055, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffbd4a' }));
    eye.position.set(s * .14, 2.06, .29); group.add(eye);
    const shoulder = new THREE.Mesh(new THREE.ConeGeometry(.16, .4, 5), horn);
    shoulder.position.set(s * .55, 1.7, 0); shoulder.rotation.z = s * -.9; group.add(shoulder);
  }
  const legGeo = new THREE.CapsuleGeometry(.16, .58, 3, 6);
  const legL = new THREE.Group(); legL.position.set(-.26, .7, 0);
  const ll = new THREE.Mesh(legGeo, skin); ll.position.y = -.35; legL.add(ll);
  const lf = box(.3, .14, .48, dark, 0, -.7, .08); legL.add(lf); group.add(legL);
  const legR = new THREE.Group(); legR.position.set(.26, .7, 0);
  const rl = new THREE.Mesh(legGeo, skin); rl.position.y = -.35; legR.add(rl);
  const rf = box(.3, .14, .48, dark, 0, -.7, .08); legR.add(rf); group.add(legR);
  parts.legL = legL; parts.legR = legR;
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * .55, 1.55, 0);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .6, 3, 6), skin); a.position.y = -.35; arm.add(a);
    const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(.19, 0), dark); fist.position.y = -.72; arm.add(fist);
    arm.rotation.z = s * .12; group.add(arm); if (s < 0) parts.armL = arm; else parts.armR = arm;
  }
  if (type === 'boss') {
    const crownMat = enemyMaterial('#d7a13d', { metalness: .6, roughness: .3, emissive: '#6d3a07', emissiveIntensity: .6 }, mats);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(.065, .35, 4), crownMat);
      const a = i / 5 * TAU;
      spike.position.set(Math.cos(a) * .24, 2.39, Math.sin(a) * .24); spike.rotation.z = Math.cos(a) * .3; group.add(spike);
    }
    const glow = glowSprite('255,55,70', 2.6, .25); glow.position.y = 1.5; group.add(glow);
  }
  group.scale.setScalar(scale);
  return { group, mats, parts };
}

function makeSofa(pal) {
  const g = new THREE.Group();
  const fabric = new THREE.MeshStandardMaterial({ color: pal.fabric, roughness: .96 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2d1a22', roughness: .9 });
  g.add(box(2.9, .38, 1.05, fabric, 0, .46, 0));
  g.add(box(2.9, .75, .24, fabric, 0, .76, -.45));
  for (const s of [-1, 1]) g.add(box(.22, .58, 1.05, fabric, s * 1.36, .56, 0));
  for (let i = -1; i <= 1; i++) g.add(box(.82, .15, .82, fabric, i * .9, .67, .04));
  for (const sx of [-1.15, 1.15]) for (const sz of [-.33, .33]) g.add(box(.08, .24, .08, dark, sx, .14, sz));
  return g;
}

function makeCoffeeTable(pal) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .65 });
  g.add(box(1.9, .12, 1.0, wood, 0, .48, 0));
  for (const sx of [-.8, .8]) for (const sz of [-.36, .36]) g.add(box(.08, .42, .08, wood, sx, .22, sz));
  const glass = new THREE.MeshStandardMaterial({ color: '#9db4b0', transparent: true, opacity: .28, roughness: .1, metalness: .1 });
  g.add(box(1.5, .04, .68, glass, 0, .56, 0));
  return g;
}

function makeTV(pal) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#17131a', roughness: .5, metalness: .3 });
  g.add(box(1.85, .8, .12, dark, 0, .85, 0));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.58, .62), new THREE.MeshBasicMaterial({ color: '#a9152b' }));
  screen.position.set(0, .85, .075); g.add(screen);
  for (const sx of [-.6, .6]) g.add(box(.08, .35, .35, dark, sx, .18, .1));
  // bent antenna
  g.add(box(.025, .55, .02, dark, -.15, 1.45, 0)); g.add(box(.025, .5, .02, dark, .15, 1.48, 0));
  return g;
}

function makeDiningSet(pal, width = 4.4, topColor = null) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .68 });
  const top = new THREE.MeshStandardMaterial({ color: topColor || pal.wood, roughness: .82 });
  g.add(box(width, .16, 1.35, top, 0, .82, 0));
  for (const sx of [-width * .36, width * .36]) for (const sz of [-.48, .48]) g.add(box(.12, .8, .12, wood, sx, .4, sz));
  const chairMat = new THREE.MeshStandardMaterial({ color: '#2e1d24', roughness: .9 });
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const x = (i - 1) * width * .28;
      const z = s * 1.2;
      g.add(box(.48, .1, .46, chairMat, x, .48, z));
      g.add(box(.48, .62, .08, chairMat, x, .8, z + s * .2));
      for (const lx of [-.18, .18]) for (const lz of [-.16, .16]) g.add(box(.05, .46, .05, chairMat, x + lx, .23, z + lz));
    }
  }
  // plates / candles
  for (let i = 0; i < 3; i++) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .02, 12), new THREE.MeshStandardMaterial({ color: '#ded1b7', roughness: .4 }));
    plate.position.set((i - 1) * width * .28, .91, 0); g.add(plate);
  }
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .4, 8), new THREE.MeshStandardMaterial({ color: '#efd9ac', emissive: '#ffb266', emissiveIntensity: .6 }));
  candle.position.set(0, 1.1, 0); g.add(candle);
  return g;
}

function makeChandelier(pal) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: pal.metal, metalness: .8, roughness: .3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, .04, 6, 22), metal);
  ring.rotation.x = Math.PI / 2; g.add(ring);
  const glow = glowSprite('255,190,110', 3.4, .35); g.add(glow);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(.035, .04, .35, 6), new THREE.MeshStandardMaterial({ color: '#ead7af', emissive: '#ffb266', emissiveIntensity: 1.1 }));
    candle.position.set(Math.cos(a) * 1.0, .18, Math.sin(a) * 1.0); g.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(.045, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffd08a' }));
    flame.position.set(candle.position.x, .41, candle.position.z); g.add(flame);
  }
  g.add(box(.03, 1.2, .03, metal, 0, .7, 0));
  return g;
}

function makeKitchenIsland(pal) {
  const g = new THREE.Group();
  const cabinet = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .75 });
  const top = new THREE.MeshStandardMaterial({ color: '#b9b3a4', roughness: .42 });
  g.add(box(3.2, .85, 1.5, cabinet, 0, .45, 0));
  g.add(box(3.4, .1, 1.68, top, 0, .93, 0));
  for (let i = -1; i <= 1; i++) {
    g.add(box(.88, .55, .06, cabinet, i * .95, .48, .78));
    g.add(box(.18, .03, .06, new THREE.MeshStandardMaterial({ color: pal.metal, metalness: .8 }), i * .95, .64, .82));
  }
  for (const s of [-1, 1]) {
    const stool = new THREE.Group();
    stool.position.set(s * 1.75, 0, .7);
    stool.add(new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .08, 12), new THREE.MeshStandardMaterial({ color: pal.fabric, roughness: .9 })));
    stool.children[0].position.y = .62;
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; stool.add(box(.04, .62, .04, cabinet, Math.cos(a) * .18, .31, Math.sin(a) * .18)); }
    g.add(stool);
  }
  return g;
}

function makeCounter(pal, width = 4) {
  const g = new THREE.Group();
  const cabinet = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .8 });
  const top = new THREE.MeshStandardMaterial({ color: '#aaa496', roughness: .45 });
  g.add(box(width, .88, .85, cabinet, 0, .45, 0));
  g.add(box(width + .15, .09, 1.0, top, 0, .94, 0));
  for (let i = 0; i < 4; i++) g.add(box(width / 4 - .08, .55, .06, cabinet, -width / 2 + width / 8 + i * width / 4, .48, .45));
  const sink = new THREE.Mesh(new THREE.BoxGeometry(.7, .05, .42), new THREE.MeshStandardMaterial({ color: '#6e7772', metalness: .7, roughness: .3 }));
  sink.position.set(-width * .25, .99, 0); g.add(sink);
  return g;
}

function makeBed(pal) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .72 });
  const sheet = new THREE.MeshStandardMaterial({ color: '#d8c9b6', roughness: .94 });
  const blanket = new THREE.MeshStandardMaterial({ color: pal.fabric, roughness: .98 });
  g.add(box(2.1, .26, 3.0, wood, 0, .38, 0));
  g.add(box(1.95, .28, 2.8, sheet, 0, .64, 0));
  g.add(box(1.95, .12, 1.6, blanket, 0, .81, .5));
  for (const s of [-.55, .55]) g.add(box(.72, .18, .45, new THREE.MeshStandardMaterial({ color: '#eee2ce', roughness: .9 }), s, .87, -.93));
  g.add(box(2.1, 1.1, .12, wood, 0, .8, -1.5));
  return g;
}

function makeNightstand(pal) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .75 });
  g.add(box(.65, .6, .55, wood, 0, .32, 0));
  g.add(box(.7, .05, .6, wood, 0, .63, 0));
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.12, .2, .4, 8), new THREE.MeshStandardMaterial({ color: '#d7b784', emissive: '#ffb566', emissiveIntensity: .3 }));
  lamp.position.set(0, .9, 0); g.add(lamp);
  return g;
}

function makeBathtub(pal) {
  const g = new THREE.Group();
  const porcelain = new THREE.MeshStandardMaterial({ color: '#e7e0d0', roughness: .35, metalness: .05 });
  g.add(box(2.1, .65, 1.0, porcelain, 0, .4, 0));
  g.add(box(1.75, .08, .65, new THREE.MeshStandardMaterial({ color: '#4b0d18', roughness: .15, metalness: .4 }), 0, .69, 0));
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .4, 6), new THREE.MeshStandardMaterial({ color: '#aa9255', metalness: .8 }));
  tap.position.set(-.8, .9, -.25); g.add(tap);
  return g;
}

function makeDesk(pal) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .68 });
  g.add(box(2.4, .12, 1.0, wood, 0, .78, 0));
  for (const sx of [-1.0, 1.0]) for (const sz of [-.36, .36]) g.add(box(.1, .75, .1, wood, sx, .38, sz));
  const paper = box(.65, .02, .8, new THREE.MeshStandardMaterial({ color: '#dfd4b8' }), .35, .86, 0); paper.rotation.y = .2; g.add(paper);
  const lampBase = box(.16, .04, .16, new THREE.MeshStandardMaterial({ color: '#2b2429' }), -.65, .86, -.15); g.add(lampBase);
  g.add(box(.04, .45, .04, new THREE.MeshStandardMaterial({ color: '#2b2429' }), -.65, 1.06, -.15));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.25, .3, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#6d5a44', side: THREE.DoubleSide }));
  shade.position.set(-.65, 1.28, -.15); shade.rotation.x = Math.PI; g.add(shade);
  const chair = new THREE.Group(); chair.position.set(0, 0, .95);
  chair.add(box(.62, .1, .52, new THREE.MeshStandardMaterial({ color: '#33212a' }), 0, .5, 0));
  chair.add(box(.62, .65, .08, new THREE.MeshStandardMaterial({ color: '#33212a' }), 0, .8, .25));
  g.add(chair);
  return g;
}

function makeBookshelf(pal, width = 2.4) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: pal.wood, roughness: .78 });
  g.add(box(width, 2.3, .42, wood, 0, 1.15, 0));
  g.add(box(width - .2, 2.1, .34, new THREE.MeshStandardMaterial({ color: '#1a1015' }), 0, 1.18, .05));
  const bookColors = [pal.fabric, '#7a2b3a', '#3f5e50', '#b28b5f', '#4e3e72'];
  for (let shelf = 0; shelf < 4; shelf++) {
    g.add(box(width - .2, .07, .38, wood, 0, .3 + shelf * .52, .04));
    for (let i = 0; i < 9; i++) {
      const h = rand(.24, .42);
      const b = box(.09, h, .25, new THREE.MeshStandardMaterial({ color: pick(bookColors), roughness: .9 }), -width / 2 + .25 + i * (width - .5) / 9, .34 + shelf * .52 + h / 2, .02);
      g.add(b);
    }
  }
  return g;
}

function makePiano(pal) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#261a22', roughness: .35, metalness: .1 });
  g.add(box(2.2, .65, .8, wood, 0, .95, 0));
  g.add(box(2.1, .13, .55, new THREE.MeshStandardMaterial({ color: '#e1d8c1', roughness: .35 }), 0, 1.17, .25));
  for (let i = 0; i < 16; i++) g.add(box(.055, .05, .26, new THREE.MeshStandardMaterial({ color: '#171216' }), -1.0 + i * .068, 1.235, .16));
  for (const sx of [-.8, .8]) for (const sz of [-.3, .3]) g.add(box(.12, .65, .12, wood, sx, .33, sz));
  g.add(box(.7, .08, .35, wood, 0, .48, .38));
  return g;
}

function makeAltar(pal) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#5c4f50', roughness: .9 });
  g.add(box(2.7, .95, 1.0, stone, 0, .48, 0));
  g.add(box(2.9, .12, 1.2, new THREE.MeshStandardMaterial({ color: '#37222c', roughness: .8 }), 0, 1.0, 0));
  const cloth = box(1.4, .03, .8, new THREE.MeshStandardMaterial({ color: '#7e1428', roughness: .9 }), 0, 1.06, 0); g.add(cloth);
  for (const s of [-1, 1]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .5, 7), new THREE.MeshStandardMaterial({ color: '#ead5a8', emissive: '#ffaa55', emissiveIntensity: 1.2 }));
    candle.position.set(s * 1.05, 1.28, -.1); g.add(candle);
    const flame = glowSprite('255,170,70', .7, .8); flame.position.set(s * 1.05, 1.62, -.1); g.add(flame);
  }
  const skull = makeBoneSkull();
  skull.scale.setScalar(.8); skull.position.set(0, 1.18, 0); g.add(skull);
  return g;
}

function makeBoneSkull() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#d8cbb0', roughness: .8 });
  const s = new THREE.Mesh(new THREE.SphereGeometry(.22, 9, 7), mat); s.scale.set(.9, 1, .8); g.add(s);
  g.add(box(.24, .13, .18, mat, 0, -.17, .04));
  for (const s2 of [-1, 1]) g.add(new THREE.Mesh(new THREE.SphereGeometry(.05, 5, 4), new THREE.MeshBasicMaterial({ color: '#140b10' })).translateX(s2 * .08).translateY(.03).translateZ(.17));
  return g;
}

function makePedestal(pal) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#9b8f86', roughness: .85 });
  g.add(box(.75, 1.0, .75, stone, 0, .5, 0));
  g.add(box(.9, .1, .9, stone, 0, 1.02, 0));
  const flesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 0), new THREE.MeshStandardMaterial({ color: '#77152a', roughness: .78 }));
  flesh.position.y = 1.35; flesh.scale.y = 1.3; g.add(flesh);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.05, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffcf72' }));
  eye.position.set(0, 1.45, .28); g.add(eye);
  return g;
}

function makeIndoorFountain(pal) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#a99988', roughness: .82 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, .55, 24), stone);
  basin.position.y = .28; g.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.0, 24), new THREE.MeshStandardMaterial({ color: '#73112e', emissive: '#9e1734', emissiveIntensity: .3, roughness: .2, metalness: .2 }));
  water.rotation.x = -Math.PI / 2; water.position.y = .57; g.add(water);
  g.add(box(.7, .9, .7, stone, 0, .9, 0));
  const statue = new THREE.Mesh(new THREE.ConeGeometry(.42, 1.5, 6), new THREE.MeshStandardMaterial({ color: '#5a4352', roughness: .9 }));
  statue.position.y = 2.0; g.add(statue);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 6), statue.material); head.position.y = 2.85; g.add(head);
  const glow = glowSprite('255,60,80', 4, .3); glow.position.y = 2.3; g.add(glow);
  return g;
}
