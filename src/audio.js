export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambient = null;
    this.noiseBuffer = null;
    this.started = false;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.started = true;
    this.startAmbient();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.08);
  }

  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slide = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }

  noise(dur = 0.2, vol = 0.3, filterFreq = 1200, when = 0, type = 'lowpass') {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filterFreq, t); f.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * .35), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur + 0.02);
  }

  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const t = this.ctx.currentTime;
    const bus = this.ctx.createGain(); bus.gain.value = 0.12; bus.connect(this.master);
    const o1 = this.ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 42;
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 57.3;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150; f.Q.value = 2;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.055;
    const lg = this.ctx.createGain(); lg.gain.value = 34; lfo.connect(lg); lg.connect(f.frequency);
    const og = this.ctx.createGain(); og.gain.value = 0.12;
    o1.connect(f); o2.connect(f); f.connect(og); og.connect(bus);
    o1.start(t); o2.start(t); lfo.start(t);
    this.ambient = { o1, o2, lfo, bus, f };
  }

  setAmbient(mode) {
    if (!this.ambient || !this.ctx) return;
    const t = this.ctx.currentTime;
    const level = mode === 'level' ? 0.2 : mode === 'title' ? 0.08 : 0.12;
    this.ambient.bus.gain.setTargetAtTime(level, t, 1.2);
    this.ambient.f.frequency.setTargetAtTime(mode === 'level' ? 260 : 150, t, 1.5);
    this.ambient.o1.frequency.setTargetAtTime(mode === 'level' ? 38 : 42, t, 1.5);
  }

  click() { this.tone(660, .05, 'triangle', .08); }
  ui() { this.tone(880, .08, 'sine', .07); this.tone(1320, .1, 'sine', .04, .03); }
  step() { this.noise(.06, .045, 420); }
  shotgun() {
    this.noise(.34, .65, 2200);
    this.noise(.18, .35, 700);
    this.tone(110, .3, 'sine', .38, 0, 38);
    this.tone(72, .22, 'square', .11, 0, 35);
  }
  pump() { this.noise(.07, .12, 1100); this.tone(220, .05, 'square', .04); }
  hit() { this.noise(.07, .17, 2000, 0, 'bandpass'); this.tone(160, .07, 'sawtooth', .06, 0, 90); }
  hurt() { this.tone(90, .28, 'sawtooth', .2, 0, 48); this.noise(.18, .2, 500); }
  growl() { this.tone(70 + Math.random() * 40, .5, 'sawtooth', .12, 0, 32); this.noise(.35, .12, 280); }
  impDie() { this.tone(180, .36, 'sawtooth', .15, 0, 40); this.noise(.25, .17, 700); }
  pickup() { this.tone(740, .09, 'sine', .12); this.tone(1100, .12, 'sine', .08, .07); this.tone(1480, .2, 'triangle', .05, .13); }
  enter() { this.tone(220, .5, 'sawtooth', .2, 0, 55); this.noise(.6, .2, 600); this.tone(440, .7, 'sine', .08, .1, 32); }
  portal() { this.tone(320, .6, 'sine', .14, 0, 880); this.tone(160, .8, 'triangle', .1, .1, 640); this.noise(.4, .08, 1200); }
  wave() { this.tone(98, .6, 'sawtooth', .18); this.tone(147, .6, 'sawtooth', .12, .1); this.tone(196, .8, 'triangle', .08, .2); }
  clear() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .8 - i * .08, 'triangle', .1, i * .13)); }
  locked() { this.tone(130, .16, 'square', .1); this.tone(98, .22, 'square', .08, .1); }
  death() { this.tone(140, 1.5, 'sawtooth', .2, 0, 32); this.noise(1.2, .2, 380); }
  victory() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 1.2, 'triangle', .12, i * .16)); }
}
