import * as THREE from 'three';
import { AudioEngine } from './audio.js';
import { Neighborhood, HOUSE_DEFS } from './neighborhood.js';
import { HouseLevel } from './level.js';

const $ = id => document.getElementById(id);
const canvas = $('game');

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const audio = new AudioEngine();
const neighborhoodScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(47, window.innerWidth / window.innerHeight, .1, 220);
camera.position.set(0, 11, 24);
const neighborhood = new Neighborhood(neighborhoodScene, audio, renderer);

let level = null;
let activeScene = neighborhoodScene;
let activeCamera = camera;
let state = 'title';
let previousState = null;
let currentHouse = null;
let startedAt = 0;
let exitOpen = false;
let actionKey = '';
let levelDeathTimer = null;

const stats = { kills: 0, deaths: 0 };

const ui = {
  app: $('app'), hud: $('hud'), startScreen: $('startScreen'), pauseScreen: $('pauseScreen'),
  deathScreen: $('deathScreen'), victoryScreen: $('victoryScreen'), fade: $('fade'),
  objective: $('objectiveText'), soulCount: $('soulCount'), housePips: $('housePips'),
  neighborhoodVitals: $('neighborhoodVitals'), levelHud: $('levelHud'), levelStats: $('levelStats'),
  reticle: $('reticle'), fireBtn: $('fireBtn'), actionBtn: $('actionBtn'),
  actionLabel: $('actionLabel'), actionSub: $('actionSub'), actionKey: $('actionKey'),
  houseTitle: $('houseTitle'), waveLabel: $('waveLabel'), healthText: $('healthText'),
  neighborhoodHealth: $('neighborhoodHealth'), levelHealth: $('levelHealth'), levelHealthText: $('levelHealthText'),
  shellPips: $('shellPips'), waveBanner: $('waveBanner'), waveBannerTitle: $('waveBannerTitle'),
  waveBannerSub: $('waveBannerSub'), waveKicker: document.querySelector('#waveBanner .wave-kicker'),
  exitBanner: $('exitBanner'), toast: $('toast'), compass: $('compass'),
  compassArrow: $('compassArrow'), compassText: $('compassText'), damageFlash: $('damageFlash'),
  hitMarker: $('hitMarker'), soundBtn: $('soundBtn'), menuBtn: $('menuBtn'),
  bossBar: $('bossBar'), bossFill: $('bossFill'), levelHudWrap: $('levelHud'),
  joy: $('joystick'), knob: $('joystickKnob'), rotateHint: $('rotateHint'),
};

for (let i = 0; i < 5; i++) {
  const pip = document.createElement('i');
  pip.className = 'house-pip';
  pip.title = HOUSE_DEFS[i].name;
  ui.housePips.appendChild(pip);
}
for (let i = 0; i < 8; i++) {
  const pip = document.createElement('i');
  pip.className = 'shell-pip';
  ui.shellPips.appendChild(pip);
}

const keys = new Set();
const joystick = { x: 0, y: 0, active: false, pointerId: null, cx: 0, cy: 0 };
let lookDrag = null;
let lastLevelTouch = 0;
let bannerTimer = null;
let toastTimer = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startingTime() {
  startedAt = performance.now();
}

// ---------------------------------------------------------------- HUD helpers
function setHudMode(mode) {
  ui.hud.classList.remove('hidden');
  if (mode === 'neighborhood') {
    ui.neighborhoodVitals.classList.remove('hidden');
    ui.levelHud.classList.add('hidden');
    ui.levelStats.classList.add('hidden');
    ui.reticle.classList.add('hidden');
    ui.fireBtn.classList.add('hidden');
    ui.levelHudWrap.classList.add('hidden');
    ui.compass.classList.remove('hidden');
    ui.exitBanner.classList.add('hidden');
    ui.bossBar.classList.add('hidden');
  } else if (mode === 'level') {
    ui.neighborhoodVitals.classList.add('hidden');
    ui.levelHud.classList.remove('hidden');
    ui.levelHudWrap.classList.remove('hidden');
    ui.levelStats.classList.remove('hidden');
    ui.reticle.classList.remove('hidden');
    ui.fireBtn.classList.remove('hidden');
    ui.compass.classList.add('hidden');
    ui.exitBanner.classList.add('hidden');
  }
}

function showAction(label, sub, key = 'E') {
  ui.actionLabel.textContent = label;
  ui.actionSub.textContent = sub;
  ui.actionKey.textContent = key;
  ui.actionBtn.classList.remove('hidden');
  ui.actionBtn.classList.remove('disabled');
}

function hideAction() {
  ui.actionBtn.classList.add('hidden');
  actionKey = '';
}

function updateObjective(text) {
  if (ui.objective.textContent !== text) ui.objective.textContent = text;
}

function updateSouls(n) {
  ui.soulCount.textContent = String(n);
  const pips = ui.housePips.children;
  for (let i = 0; i < pips.length; i++) {
    const cleared = neighborhood.houses[i]?.cleared;
    pips[i].classList.toggle('done', !!cleared);
  }
}

function updateHealth(h, max) {
  const pct = Math.max(0, Math.min(100, h / max * 100));
  ui.neighborhoodHealth.style.width = pct + '%';
  ui.levelHealth.style.width = pct + '%';
  ui.neighborhoodHealth.style.background = pct < 35 ? 'linear-gradient(90deg,#6b1220,#ff344c)' : '';
  ui.levelHealth.style.background = pct < 35 ? 'linear-gradient(90deg,#6b1220,#ff344c)' : '';
  ui.healthText.textContent = Math.ceil(h);
  ui.levelHealthText.textContent = Math.ceil(h);
}

function updateAmmo(a, max) {
  const pips = ui.shellPips.children;
  for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('empty', i >= a);
}

function showBanner(kicker, title, sub, duration = 2600) {
  clearTimeout(bannerTimer);
  ui.waveKicker.textContent = kicker || '';
  ui.waveBannerTitle.textContent = title || '';
  ui.waveBannerSub.textContent = sub || '';
  ui.waveBanner.classList.remove('hidden');
  ui.waveBanner.style.animation = 'none';
  void ui.waveBanner.offsetWidth;
  ui.waveBanner.style.animation = '';
  bannerTimer = setTimeout(() => ui.waveBanner.classList.add('hidden'), duration);
}

function showToast(text, bad = false) {
  clearTimeout(toastTimer);
  ui.toast.textContent = text;
  ui.toast.classList.toggle('bad', bad);
  ui.toast.classList.add('show');
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2800);
}

function flashDamage() {
  ui.damageFlash.classList.add('hit');
  setTimeout(() => ui.damageFlash.classList.remove('hit'), 90);
}

function hitMarker() {
  ui.hitMarker.classList.remove('show');
  void ui.hitMarker.offsetWidth;
  ui.hitMarker.classList.add('show');
}

function updateBoss(hp, max) {
  if (hp <= 0) {
    ui.bossBar.classList.add('hidden');
    return;
  }
  ui.bossBar.classList.remove('hidden');
  ui.bossFill.style.width = Math.max(0, hp / max * 100) + '%';
}

function hideBoss() { ui.bossBar.classList.add('hidden'); }

// ---------------------------------------------------------------- level callbacks
function makeLevelCallbacks() {
  return {
    onHealth: (h, max) => updateHealth(h, max),
    onAmmo: (a, max) => updateAmmo(a, max),
    onWave: (index, total, count) => {
      ui.waveLabel.textContent = index > 0 ? `WAVE ${index} / ${total}` : 'SEARCHING';
      if (index > 0 && !exitOpen) updateObjective(`CLEAR THE HOUSE · ${count} HOSTILES`);
    },
    onEnemies: n => {
      if (state !== 'level' || !level) return;
      if (exitOpen) updateObjective('EXIT PORTAL OPEN');
      else if (level.state === 'combat') updateObjective(n > 0 ? `DEMONS REMAINING · ${n}` : 'CLEARING THE HOUSE');
    },
    onBanner: (kick, title, sub, duration) => showBanner(kick, title, sub, duration),
    onMessage: (text, bad) => showToast(text, bad),
    onHit: () => hitMarker(),
    onKill: (type, total) => {
      stats.kills++;
      ui.exitBanner.classList.add('hidden');
    },
    onDamage: () => flashDamage(),
    onClear: () => {
      exitOpen = true;
      ui.waveLabel.textContent = 'SOUL CLEANSED';
      updateObjective('EXIT PORTAL OPEN');
      ui.exitBanner.classList.remove('hidden');
      hideBoss();
    },
    onExitReady: () => { exitOpen = true; },
    onExitNear: near => {
      if (state !== 'level') return;
      if (near) showAction('EXIT', 'RETURN TO THE NEIGHBORHOOD', 'E');
      else hideAction();
    },
    onExit: () => finishLevel(),
    onDeath: () => handleDeath(),
    onBoss: (hp, max) => updateBoss(hp, max),
    onPickup: () => {
      showToast('+18 HEALTH · THE NEIGHBORS ARE FRIENDLY');
      flashDamage();
    },
    onShoot: () => {},
  };
}

function disposeLevel() {
  if (!level) return;
  level.dispose();
  level = null;
}

function createLevel(house) {
  currentHouse = house;
  exitOpen = false;
  hideBoss();
  hideAction();
  ui.exitBanner.classList.add('hidden');
  ui.houseTitle.textContent = house.def.name;
  ui.waveLabel.textContent = 'SEARCHING';
  updateObjective('CLEAR THE HOUSE');
  level = new HouseLevel(house.def, audio, makeLevelCallbacks());
  level.resize(window.innerWidth / window.innerHeight);
  activeScene = level.scene;
  activeCamera = level.camera;
  setHudMode('level');
  updateHealth(100, 100);
  updateAmmo(level.ammo, level.maxAmmo);
  showBanner('OPEN HOUSE', house.def.name.replace('THE ', ''), house.def.sub, 2500);
}

function transitionToLevel(house) {
  if (state !== 'neighborhood') return;
  state = 'transition';
  hideAction();
  audio.enter();
  audio.setAmbient('level');
  ui.fade.classList.add('active');
  setTimeout(() => {
    createLevel(house);
    state = 'level';
    ui.fade.classList.remove('active');
  }, 620);
}

function finishLevel() {
  if (state !== 'level') return;
  state = 'transition';
  hideAction();
  audio.portal();
  ui.fade.classList.add('active');
  setTimeout(() => {
    const house = currentHouse;
    disposeLevel();
    exitOpen = false;
    activeScene = neighborhoodScene;
    activeCamera = camera;
    ui.fade.classList.remove('active');
    if (house) {
      neighborhood.markCleared(house.def.id);
      updateSouls(neighborhood.countCleared());
      const cleared = neighborhood.countCleared();
      if (cleared >= 4) neighborhood.unlockFinal();
      if (cleared >= 5) {
        showVictory();
        return;
      }
      showToast(`SOLD · ${house.def.name} IS NOW DEMON-FREE`, false);
      updateObjective(cleared >= 4 ? 'ENTER HOLLOWAY MANOR TO CLOSE THE SALE' : `CLEAR ${5 - cleared} MORE POSSESSED HOMES`);
    }
    state = 'neighborhood';
    setHudMode('neighborhood');
    hideBoss();
    ui.exitBanner.classList.add('hidden');
    audio.setAmbient('neighborhood');
    neighborhood.resetPlayer();
  }, 640);
}

function handleDeath() {
  if (levelDeathTimer) clearTimeout(levelDeathTimer);
  audio.setAmbient('neighborhood');
  levelDeathTimer = setTimeout(() => {
    if (state !== 'level') return;
    state = 'dead';
    stats.deaths++;
    ui.deathScreen.classList.remove('hidden');
  }, 1050);
}

function retryLevel() {
  if (state !== 'dead') return;
  ui.deathScreen.classList.add('hidden');
  state = 'transition';
  audio.setAmbient('level');
  ui.fade.classList.add('active');
  setTimeout(() => {
    disposeLevel();
    createLevel(currentHouse);
    state = 'level';
    ui.fade.classList.remove('active');
  }, 620);
}

function leaveAfterDeath() {
  if (state !== 'dead') return;
  ui.deathScreen.classList.add('hidden');
  state = 'transition';
  ui.fade.classList.add('active');
  setTimeout(() => {
    disposeLevel();
    exitOpen = false;
    activeScene = neighborhoodScene;
    activeCamera = camera;
    state = 'neighborhood';
    setHudMode('neighborhood');
    hideBoss();
    ui.fade.classList.remove('active');
    audio.setAmbient('neighborhood');
    neighborhood.resetPlayer();
    updateObjective('BACK ON THE MARKET · TRY AGAIN');
    showToast('THE HOUSE WON THIS ROUND', true);
  }, 620);
}

function showVictory() {
  state = 'victory';
  setHudMode('neighborhood');
  ui.hud.classList.add('hidden');
  ui.actionBtn.classList.add('hidden');
  ui.victoryScreen.classList.remove('hidden');
  $('victoryKills').textContent = String(stats.kills);
  $('victoryTime').textContent = formatTime((performance.now() - startedAt) / 1000);
  $('victoryDeaths').textContent = String(stats.deaths);
  audio.setAmbient('title');
  audio.victory();
  activeScene = neighborhoodScene;
  activeCamera = camera;
}

function startGame() {
  if (state !== 'title') return;
  audio.init();
  audio.setAmbient('neighborhood');
  audio.ui();
  startingTime();
  ui.startScreen.classList.add('fade-out');
  setTimeout(() => ui.startScreen.classList.add('hidden'), 750);
  state = 'neighborhood';
  setHudMode('neighborhood');
  updateSouls(0);
  updateHealth(100, 100);
  updateObjective('TOUR THE NEIGHBORHOOD · FIND AN OPEN HOUSE');
  neighborhood.resetPlayer();
  setTimeout(() => showBanner('NOW SELLING', 'WHISPERING PINES', 'FIVE OPEN HOUSES · ONE HELL OF A DEAL', 3400), 420);
}

function togglePause(force) {
  if (state === 'paused') {
    ui.pauseScreen.classList.add('hidden');
    state = previousState || 'neighborhood';
    if (state === 'level') audio.setAmbient('level');
    return;
  }
  if (state !== 'neighborhood' && state !== 'level') return;
  previousState = state;
  state = 'paused';
  ui.pauseScreen.classList.remove('hidden');
  audio.ui();
  if (document.pointerLockElement) document.exitPointerLock?.();
}

function refreshNeighborhoodAction(near) {
  if (state !== 'neighborhood') return;
  if (!near) {
    if (actionKey !== '') hideAction();
    return;
  }
  let key;
  if (near.cleared) key = near.def.id + ':sold';
  else if (near.locked) key = near.def.id + ':locked';
  else key = near.def.id + ':enter';
  if (key === actionKey) return;
  actionKey = key;
  if (near.cleared) {
    showAction('SOLD', 'THIS SOUL IS ALREADY CLEANSED', '·');
    ui.actionBtn.classList.add('disabled');
  } else if (near.locked) {
    showAction('SEALED', `${Math.max(0, 4 - neighborhood.countCleared())} MORE SOULS REQUIRED`, '✕');
    ui.actionBtn.classList.add('disabled');
  } else {
    showAction('ENTER', near.def.name, 'E');
  }
}

function activateAction() {
  if (state === 'neighborhood') {
    const h = neighborhood.nearHouse;
    if (!h) return;
    if (h.locked) {
      audio.locked();
      showToast(`HOLLOWAY MANOR IS SEALED · CLEAR ${Math.max(0, 4 - neighborhood.countCleared())} HOMES FIRST`, true);
    } else if (h.cleared) {
      audio.locked();
      showToast('THIS HOME IS ALREADY SOLD', false);
    } else {
      transitionToLevel(h);
    }
  } else if (state === 'level') {
    if (!level) return;
    if (level.exitNear) level.requestExit();
  }
}

// ---------------------------------------------------------------- input
function currentMove() {
  let x = joystick.x, y = joystick.y;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { moveX: x, moveY: y, sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') };
}

function onKeyDown(e) {
  const code = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code) && state !== 'title') e.preventDefault();
  keys.add(code);
  if (e.repeat) return;
  if (code === 'Escape' || code === 'KeyP') { togglePause(); return; }
  if (state === 'title' && (code === 'Enter' || code === 'Space')) { startGame(); return; }
  if (code === 'KeyM') { toggleSound(); return; }
  if (code === 'KeyE' || code === 'Enter') { activateAction(); return; }
  if (code === 'Space' && state === 'level' && level) { level.startFiring(); }
}

function onKeyUp(e) {
  keys.delete(e.code);
  if (e.code === 'Space' && level) level.stopFiring();
}

function updateJoystick(e) {
  const max = 42;
  let dx = e.clientX - joystick.cx, dy = e.clientY - joystick.cy;
  const d = Math.hypot(dx, dy);
  if (d > max) { dx = dx / d * max; dy = dy / d * max; }
  ui.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  joystick.x = dx / max;
  joystick.y = -dy / max;
}

function resetJoystick() {
  joystick.active = false; joystick.pointerId = null;
  joystick.x = 0; joystick.y = 0;
  ui.knob.style.transform = 'translate(0px, 0px)';
  ui.joy.classList.remove('active');
}

ui.joy.addEventListener('pointerdown', e => {
  if (state !== 'neighborhood' && state !== 'level') return;
  e.preventDefault(); e.stopPropagation();
  joystick.active = true; joystick.pointerId = e.pointerId;
  const r = ui.joy.getBoundingClientRect();
  joystick.cx = r.left + r.width / 2; joystick.cy = r.top + r.height / 2;
  ui.joy.classList.add('active');
  ui.joy.setPointerCapture?.(e.pointerId);
  updateJoystick(e);
});
ui.joy.addEventListener('pointermove', e => {
  if (!joystick.active || e.pointerId !== joystick.pointerId) return;
  e.preventDefault(); e.stopPropagation();
  updateJoystick(e);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  ui.joy.addEventListener(ev, e => {
    if (e.pointerId !== joystick.pointerId) return;
    e.stopPropagation();
    resetJoystick();
  });
}

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (state === 'title' || state === 'victory' || state === 'paused' || state === 'transition' || state === 'dead') return;
  if (state === 'level') {
    if (e.pointerType === 'mouse') {
      if (document.pointerLockElement === canvas) {
        level?.startFiring();
      } else {
        canvas.requestPointerLock?.();
        lookDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        showToast('DRAG TO AIM · CLICK TO LOCK THE MOUSE');
      }
    } else {
      lookDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    }
  } else if (state === 'neighborhood') {
    lookDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
  }
});

canvas.addEventListener('pointermove', e => {
  if (!lookDrag || e.pointerId !== lookDrag.id) return;
  const dx = e.clientX - lookDrag.x, dy = e.clientY - lookDrag.y;
  lookDrag.x = e.clientX; lookDrag.y = e.clientY;
  if (state === 'level' && level) level.addLook(dx * .0042, dy * .0042);
  else if (state === 'neighborhood') {
    neighborhood.camYaw -= dx * .005;
    neighborhood.camPitch = Math.max(.16, Math.min(1.08, neighborhood.camPitch - dy * .0036));
  }
});

function endPointer(e) {
  if (lookDrag && e.pointerId === lookDrag.id) lookDrag = null;
  if (state === 'level' && level) level.stopFiring();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', e => { if (lookDrag && e.pointerId === lookDrag.id && e.pointerType !== 'mouse') lookDrag = null; });

document.addEventListener('mousemove', e => {
  if (state === 'level' && level && document.pointerLockElement === canvas) {
    level.addLook(e.movementX * .0021, e.movementY * .0021);
  }
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    lookDrag = null;
    showToast('MOUSE LOCKED · CLICK TO FIRE · ESC TO RELEASE');
  }
});

document.addEventListener('pointerlockerror', () => showToast('POINTER LOCK UNAVAILABLE · DRAG TO AIM', true));

ui.fireBtn.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  if (state !== 'level' || !level) return;
  audio.init();
  level.startFiring();
  ui.fireBtn.setPointerCapture?.(e.pointerId);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  ui.fireBtn.addEventListener(ev, e => {
    e.stopPropagation();
    if (level) level.stopFiring();
  });
}

ui.actionBtn.addEventListener('click', e => { e.stopPropagation(); activateAction(); });
ui.menuBtn.addEventListener('click', e => { e.stopPropagation(); togglePause(); });
ui.soundBtn.addEventListener('click', e => { e.stopPropagation(); toggleSound(); });

$('startBtn').addEventListener('click', e => { e.stopPropagation(); startGame(); });
$('resumeBtn').addEventListener('click', () => togglePause());
$('restartBtn').addEventListener('click', () => { window.location.reload(); });
$('retryBtn').addEventListener('click', () => { audio.init(); retryLevel(); });
$('deathExitBtn').addEventListener('click', () => { audio.init(); leaveAfterDeath(); });
$('playAgainBtn').addEventListener('click', () => { window.location.reload(); });

function toggleSound() {
  audio.init();
  audio.setMuted(!audio.muted);
  ui.soundBtn.textContent = audio.muted ? '×' : '♪';
  if (!audio.muted) audio.ui();
}

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', () => { keys.clear(); if (level) level.stopFiring(); });

window.addEventListener('wheel', e => {
  if (state !== 'neighborhood') return;
  neighborhood.camDist = Math.max(6.5, Math.min(14, neighborhood.camDist + e.deltaY * .008));
}, { passive: true });

// ---------------------------------------------------------------- resize / loop
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (level) level.resize(w / h);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));

function updateCompass() {
  if (state !== 'neighborhood') return;
  const c = neighborhood.getCompass(neighborhood.camYaw);
  if (!c) {
    ui.compass.classList.add('hidden');
    return;
  }
  ui.compass.classList.remove('hidden');
  ui.compassArrow.style.transform = `rotate(${c.angle}rad)`;
  ui.compassText.textContent = `${c.house.def.short} · ${Math.round(c.dist)}M`;
}

function updateNeighborhoodState() {
  refreshNeighborhoodAction(neighborhood.nearHouse);
  updateCompass();
  const near = neighborhood.nearHouse;
  const pips = ui.housePips.children;
  for (let i = 0; i < pips.length; i++) {
    pips[i].classList.toggle('current', !!near && neighborhood.houses[i] === near && !near.cleared);
    pips[i].classList.toggle('done', !!neighborhood.houses[i]?.cleared);
  }
  if (!exitOpen) {
    const cleared = neighborhood.countCleared();
    if (cleared < 5) updateObjective(cleared >= 4 ? 'CLOSE THE SALE · ENTER HOLLOWAY MANOR' : `CLEAR ${5 - cleared} POSSESSED HOMES`);
  }
}

const clock = new THREE.Clock();
let lastTime = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05);
  const now = performance.now();

  if (state === 'title' || state === 'victory') {
    activeScene = neighborhoodScene;
    activeCamera = camera;
    neighborhood.updateTitle(dt, camera);
  } else if (state === 'neighborhood') {
    activeScene = neighborhoodScene;
    activeCamera = camera;
    const input = currentMove();
    if (keys.has('ArrowLeft')) neighborhood.camYaw += dt * .9;
    if (keys.has('ArrowRight')) neighborhood.camYaw -= dt * .9;
    if (keys.has('ArrowUp')) neighborhood.camPitch = Math.min(1.08, neighborhood.camPitch + dt * .45);
    if (keys.has('ArrowDown')) neighborhood.camPitch = Math.max(.16, neighborhood.camPitch - dt * .45);
    neighborhood.update(dt, input, camera, true);
    updateNeighborhoodState();
  } else if (state === 'level') {
    if (level) {
      if (keys.has('ArrowLeft')) level.addLook(.022, 0);
      if (keys.has('ArrowRight')) level.addLook(-.022, 0);
      if (keys.has('ArrowUp')) level.addLook(0, .022);
      if (keys.has('ArrowDown')) level.addLook(0, -.022);
      const input = currentMove();
      level.setInput(input.moveX, input.moveY);
      level.update(dt);
      activeScene = level.scene;
      activeCamera = level.camera;
    }
  } else if (state === 'paused' || state === 'dead' || state === 'transition') {
    if (level) { activeScene = level.scene; activeCamera = level.camera; }
    else { activeScene = neighborhoodScene; activeCamera = camera; }
  }

  renderer.render(activeScene, activeCamera);
  lastTime = now;
}

// boot
neighborhood.resetPlayer();
updateSouls(0);
updateHealth(100, 100);
ui.hud.classList.add('hidden');
ui.startScreen.classList.remove('hidden');
resize();
requestAnimationFrame(frame);

// Debug hooks for automated visual checks. Harmless in normal play.
window.__subdivision = {
  get state() { return state; },
  get level() { return level; },
  neighborhood,
  startGame,
  enterHouseById(id) {
    if (state === 'title') startGame();
    const h = neighborhood.houses.find(x => x.def.id === id);
    if (h) {
      if (h.locked) neighborhood.unlockFinal();
      transitionToLevel(h);
    }
  },
  setPlayer(x, z) {
    neighborhood.playerPos.set(x, 0, z);
    if (neighborhood.player) neighborhood.player.position.set(x, 0, z);
  },
  setLevelState(s) { if (level) { level.state = s; if (s === 'combat') level.startWave(); } },
  openExit() { if (level) { level.exitActive = true; level.portal.group.visible = true; } },
  time: () => performance.now(),
};
