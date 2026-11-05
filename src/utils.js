import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

let _seed = 666;
export function seeded(seed) { _seed = seed; }
export function srand() {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}

export function canvasTexture(width, height, draw, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  if (opts.rotation) tex.rotation = opts.rotation;
  tex.anisotropy = 4;
  return tex;
}

export function noise(ctx, w, h, amount = 0.1, alpha = 1, colored = false) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount;
    if (colored) {
      d[i] = clamp(d[i] + n * (Math.random() - .2), 0, 255);
      d[i + 1] = clamp(d[i + 1] + n * (Math.random() - .4), 0, 255);
      d[i + 2] = clamp(d[i + 2] + n * (Math.random() - .3), 0, 255);
    } else {
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n, 0, 255);
    }
    d[i + 3] *= alpha;
  }
  ctx.putImageData(img, 0, 0);
}

export function makeGrassTexture(base = '#47613d', alt = '#324b31') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = Math.random() > .5 ? alt : 'rgba(122,139,74,.22)';
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillRect(x, y, Math.random() * 2 + .5, Math.random() * 5 + 1);
    }
    ctx.strokeStyle = 'rgba(23,34,23,.18)'; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 2); ctx.stroke(); }
  }, { repeat: [14, 14] });
}

export function makeAsphaltTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3c3a44'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const g = Math.floor(38 + Math.random() * 40);
      ctx.fillStyle = `rgba(${g},${g - 2},${g + 4},${.15 + Math.random() * .4})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2 + .5, Math.random() * 2 + .5);
    }
    ctx.strokeStyle = 'rgba(18,17,23,.42)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); let x = Math.random() * w, y = Math.random() * h; ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += (Math.random() - .5) * 50; y += Math.random() * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }, { repeat: [5, 5] });
}

export function makeConcreteTexture(tint = '#bcae9a') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, .09, 1);
    ctx.strokeStyle = 'rgba(60,52,50,.2)'; ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }, { repeat: [8, 8] });
}

export function makeSidingTexture(base = '#d8a7a0', line = 'rgba(87,43,50,.18)', kind = 'siding') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    if (kind === 'brick') {
      const bh = 16, bw = 42;
      for (let y = 0; y < h; y += bh) {
        const off = (Math.floor(y / bh) % 2) * bw / 2;
        for (let x = -bw; x < w + bw; x += bw) {
          ctx.fillStyle = `rgba(${Math.random() > .6 ? '255,255,255' : '20,10,10'},${.03 + Math.random() * .06})`;
          ctx.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
        }
        ctx.strokeStyle = 'rgba(44,28,28,.28)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (kind === 'stucco') {
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = Math.random() > .5 ? 'rgba(255,255,255,.08)' : 'rgba(45,20,20,.07)';
        ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.8 + .2, 0, TAU); ctx.fill();
      }
    } else if (kind === 'vertical') {
      for (let x = 0; x < w; x += 14) {
        ctx.fillStyle = (x / 14) % 2 ? 'rgba(20,8,8,.09)' : 'rgba(255,255,255,.04)';
        ctx.fillRect(x, 0, 7, h);
        ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
    } else if (kind === 'panel') {
      for (let x = 0; x < w; x += 64) {
        ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 64) {
        ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else {
      for (let y = 0; y < h; y += 13) {
        ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, y, w, 3);
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y + 12); ctx.lineTo(w, y + 12); ctx.stroke();
      }
    }
    noise(ctx, w, h, .045, 1);
  }, { repeat: [2.4, 1.2] });
}

export function makeRoofTexture(base = '#5a3046', kind = 'shingle') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    if (kind === 'tile') {
      for (let y = 0; y < h; y += 20) {
        for (let x = 0; x < w; x += 28) {
          ctx.fillStyle = `rgba(${Math.random() > .5 ? '60,10,10' : '255,140,100'},${.06 + Math.random() * .08})`;
          ctx.fillRect(x + 1, y + 1, 26, 18);
        }
        ctx.strokeStyle = 'rgba(50,16,16,.36)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        for (let x = 0; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 20); ctx.stroke(); }
      }
    } else {
      for (let y = 0; y < h; y += 14) {
        const off = Math.floor(y / 14) % 2 ? 10 : 0;
        for (let x = 0; x < w; x += 22) {
          ctx.fillStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '0,0,0'},${.035 + Math.random() * .045})`;
          ctx.fillRect(x + off, y, 20, 12);
        }
        ctx.strokeStyle = 'rgba(15,8,12,.25)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
    noise(ctx, w, h, .05, 1);
  }, { repeat: [3, 3] });
}

export function makeWallpaperTexture(theme) {
  const cfg = {
    miller: { base: '#d9b3ad', accent: '#8d4555', wain: '#5b3140', pattern: 'floral' },
    vega: { base: '#d59669', accent: '#7c322d', wain: '#4e2629', pattern: 'arch' },
    ashby: { base: '#9d8151', accent: '#533c24', wain: '#3a2a1d', pattern: 'wood' },
    glass: { base: '#d9d7cc', accent: '#5f6261', wain: '#393d3b', pattern: 'grid' },
    hollow: { base: '#7c668a', accent: '#3f2b57', wain: '#2a1b36', pattern: 'damask' },
  }[theme] || { base: '#a88f82', accent: '#573d43', wain: '#37242a', pattern: 'floral' };

  return canvasTexture(512, 512, (ctx, w, h) => {
    const wainH = h * .33;
    ctx.fillStyle = cfg.base; ctx.fillRect(0, 0, w, h * .67);
    ctx.fillStyle = cfg.wain; ctx.fillRect(0, h - wainH, w, wainH);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, h - wainH + 8, w, 3);
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(0, h - wainH - 7, w, 10);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let x = 0; x < w; x += 18) ctx.fillRect(x, h - wainH + 4, 1, wainH);

    ctx.globalAlpha = .32;
    if (cfg.pattern === 'floral') {
      for (let y = 24; y < h * .64; y += 62) {
        for (let x = 20; x < w; x += 72) {
          const ox = (Math.floor(y / 62) % 2) * 32;
          ctx.fillStyle = cfg.accent;
          for (let k = 0; k < 5; k++) {
            const a = k / 5 * TAU;
            ctx.beginPath(); ctx.ellipse(x + ox + Math.cos(a) * 9, y + Math.sin(a) * 9, 5, 9, a, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = 'rgba(255,230,200,.5)';
          ctx.beginPath(); ctx.arc(x + ox, y, 4, 0, TAU); ctx.fill();
          ctx.strokeStyle = cfg.accent; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + ox, y + 12); ctx.lineTo(x + ox - 6, y + 35); ctx.stroke();
        }
      }
    } else if (cfg.pattern === 'damask') {
      for (let y = 30; y < h * .64; y += 80) {
        for (let x = 30; x < w; x += 80) {
          const ox = (Math.floor(y / 80) % 2) * 40;
          ctx.strokeStyle = cfg.accent; ctx.fillStyle = cfg.accent; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(x + ox, y, 12, 23, 0, 0, TAU);
          ctx.ellipse(x + ox - 12, y, 8, 16, -.5, 0, TAU);
          ctx.ellipse(x + ox + 12, y, 8, 16, .5, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(242,221,255,.25)';
          ctx.beginPath(); ctx.arc(x + ox, y - 3, 4, 0, TAU); ctx.fill();
        }
      }
    } else if (cfg.pattern === 'grid') {
      ctx.strokeStyle = cfg.accent; ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 85) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h * .67); ctx.stroke(); }
      for (let y = 0; y < h * .67; y += 85) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    } else if (cfg.pattern === 'wood') {
      ctx.strokeStyle = cfg.accent; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 42) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h * .67); ctx.stroke();
        for (let y = 0; y < h * .67; y += 20) {
          ctx.strokeStyle = `rgba(20,10,5,${.03 + Math.random() * .06})`;
          ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.bezierCurveTo(x + 10, y + 3, x + 22, y + 1, x + 40, y + 2); ctx.stroke();
        }
      }
    } else {
      for (let y = 20; y < h * .64; y += 55) {
        for (let x = 20; x < w; x += 55) {
          ctx.strokeStyle = cfg.accent; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 15, Math.PI, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x - 15, y + 15); ctx.moveTo(x + 15, y); ctx.lineTo(x + 15, y + 15); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    // grime and creeping rot
    for (let i = 0; i < 26; i++) {
      const grd = ctx.createRadialGradient(Math.random() * w, h * .6 + Math.random() * h * .4, 0, Math.random() * w, h * .7, 25 + Math.random() * 80);
      grd.addColorStop(0, 'rgba(20,8,12,.18)'); grd.addColorStop(1, 'rgba(20,8,12,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    }
    noise(ctx, w, h, .05, 1);
  }, { repeat: [2, 1] });
}

export function makeFloorTexture(theme) {
  const cfg = {
    miller: { type: 'checker', a: '#d9cbb8', b: '#3b2b31', grout: '#8b7c6b' },
    vega: { type: 'tile', a: '#a85a42', b: '#884330', grout: '#5e3127' },
    ashby: { type: 'wood', a: '#5f4029', b: '#4a2f1e', grout: '#2e1c14' },
    glass: { type: 'marble', a: '#cfd0c8', b: '#b7bbb3', grout: '#72766e' },
    hollow: { type: 'wood', a: '#3c2734', b: '#30202b', grout: '#1a101d' },
  }[theme] || { type: 'tile', a: '#8d6d5d', b: '#735648', grout: '#46352d' };

  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = cfg.grout; ctx.fillRect(0, 0, w, h);
    if (cfg.type === 'checker') {
      const n = 8, s = w / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? cfg.a : cfg.b;
        ctx.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
        ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(x * s + 1, y * s + 1, s - 2, 4);
      }
    } else if (cfg.type === 'tile') {
      const n = 6, s = w / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        ctx.fillStyle = Math.random() > .5 ? cfg.a : cfg.b;
        ctx.beginPath(); ctx.roundRect(x * s + 3, y * s + 3, s - 6, s - 6, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,210,170,.05)'; ctx.fillRect(x * s + 8, y * s + 8, s - 16, 3);
      }
    } else if (cfg.type === 'wood') {
      const ph = 44;
      for (let y = 0; y < h; y += ph) {
        const off = (Math.floor(y / ph) % 2) * 80;
        for (let x = -100; x < w; x += 160) {
          ctx.fillStyle = Math.random() > .5 ? cfg.a : cfg.b;
          ctx.fillRect(x + off + 1, y + 1, 158, ph - 2);
          ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 1;
          for (let k = 0; k < 4; k++) {
            ctx.beginPath(); ctx.moveTo(x + off + 4, y + 7 + k * 9); ctx.bezierCurveTo(x + off + 50, y + 5 + k * 9, x + off + 110, y + 9 + k * 9, x + off + 156, y + 7 + k * 9); ctx.stroke();
          }
        }
        ctx.strokeStyle = 'rgba(8,4,4,.4)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (cfg.type === 'marble') {
      ctx.fillStyle = cfg.a; ctx.fillRect(0, 0, w, h);
      const n = 4, s = w / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? cfg.a : cfg.b;
        ctx.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
      }
      for (let i = 0; i < 18; i++) {
        ctx.strokeStyle = `rgba(65,60,63,${.06 + Math.random() * .12})`; ctx.lineWidth = Math.random() * 2 + .5;
        ctx.beginPath(); let x = Math.random() * w, y = Math.random() * h; ctx.moveTo(x, y);
        for (let j = 0; j < 3; j++) { x += (Math.random() - .5) * 160; y += Math.random() * 90; ctx.lineTo(x, y); } ctx.stroke();
      }
    }
    // blood and burns
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 15 + Math.random() * 60;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${70 + Math.random() * 40},8,16,${.12 + Math.random() * .2})`);
      grd.addColorStop(1, 'rgba(50,5,10,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    noise(ctx, w, h, .045, 1);
  }, { repeat: [4, 4] });
}

export function makeLabelTexture(title, subtitle, accent = '#ffc857', dark = true) {
  const w = 512, h = 192;
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = dark ? '#181018' : '#f5e8d2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = accent; ctx.fillRect(33, 35, 28, 3);
    ctx.font = '700 43px "DM Sans", Arial, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? '#f8ecd8' : '#1a111a';
    ctx.fillText(title.toUpperCase(), 32, 94);
    ctx.font = '600 20px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(subtitle.toUpperCase(), 34, 145);
    ctx.textAlign = 'right'; ctx.font = '18px "Special Elite", monospace';
    ctx.fillStyle = 'rgba(248,236,216,.32)';
    ctx.fillText('WHISPERING PINES', w - 34, 145);
  }, { clamp: true });
}

export function makeSignTexture(text, sub = '', accent = '#ffc857') {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#efe1c9'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#21141d'; ctx.fillRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(17, 17, w - 34, h - 34);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8ecd8'; ctx.font = '700 42px "DM Sans", Arial, sans-serif';
    ctx.fillText(text.toUpperCase(), w / 2, sub ? 49 : 64);
    if (sub) { ctx.fillStyle = accent; ctx.font = '600 19px "DM Sans", Arial, sans-serif'; ctx.fillText(sub.toUpperCase(), w / 2, 88); }
    ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(40, 112, w - 80, 2);
  }, { clamp: true });
}

export function makeTextSprite(text, opts = {}) {
  const w = opts.width || 512, h = opts.height || 128;
  const tex = canvasTexture(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, w, h); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${opts.weight || 700} ${opts.size || 48}px ${opts.font || '"DM Sans", Arial, sans-serif'}`;
    ctx.fillStyle = opts.color || '#f8ecd8';
    ctx.fillText(text, w / 2, h / 2 + (opts.offsetY || 0));
  }, { clamp: true });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w / h * (opts.scale || 2), opts.scale || 2, 1);
  return sprite;
}

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export function plane(w, h, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export function disposeObject(root) {
  root.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        for (const key of Object.keys(m)) {
          const val = m[key];
          if (val && val.isTexture) val.dispose();
        }
        m.dispose();
      }
    }
  });
  root.clear();
}

export function makeSky() {
  const geo = new THREE.SphereGeometry(180, 40, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#1b153c') },
      midColor: { value: new THREE.Color('#9c4e73') },
      horizonColor: { value: new THREE.Color('#ff9a69') },
      bottomColor: { value: new THREE.Color('#2b1b2c') },
      sunColor: { value: new THREE.Color('#ffd39b') },
      sunDir: { value: new THREE.Vector3(-0.35, 0.28, -0.9).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 topColor, midColor, horizonColor, bottomColor, sunColor, sunDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        float h = vDir.y;
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.32, h));
        col = mix(col, topColor, smoothstep(0.28, 0.85, h));
        col = mix(bottomColor, col, smoothstep(-0.28, 0.0, h));
        float d = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * pow(d, 400.0) * 1.6;
        col += sunColor * pow(d, 14.0) * 0.22;
        // faint stars high in the sky
        if (h > 0.25) {
          vec2 sp = floor(vDir.xz * 220.0 / max(h, 0.2));
          float st = step(0.9965, hash(sp));
          col += vec3(0.9, 0.8, 1.0) * st * smoothstep(0.3, 0.7, h) * 0.9;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  return sky;
}
