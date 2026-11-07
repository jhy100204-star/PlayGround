// Procedural combat audio. No external samples are required.
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.started = false;
    this.noiseBuffer = null;
  }

  start() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.65;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
    this.noiseBuffer = this.makeNoise(2.0);
    this.started = true;
    this.ambient();
  }

  makeNoise(seconds = 1) {
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, rate * seconds, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  ambient() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const pad = ctx.createGain();
    pad.gain.setValueAtTime(0.0001, now);
    pad.gain.exponentialRampToValueAtTime(0.055, now + 3.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 1.2;
    pad.connect(filter).connect(this.musicGain);
    [55, 82.41, 110, 164.81].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.28 : 0.12;
      osc.connect(g).connect(pad);
      osc.start(now);
    });
    // Wind bed.
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 280;
    nf.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.value = 0.055;
    noise.connect(nf).connect(ng).connect(this.master);
    noise.start(now);
    // Slow heartbeat pulse.
    const pulse = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(54, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      osc.connect(g).connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.4);
      this.pulseTimer = setTimeout(pulse, 1350);
    };
    pulse();
  }

  tone(freq, dur, type = 'sine', vol = 0.12, slide = null, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noise(dur, filterFreq, vol = 0.1, type = 'bandpass', q = 0.8, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * 0.35), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  play(name) {
    if (!this.started || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    switch (name) {
      case 'swing':
        this.noise(0.18, 2300, 0.09, 'bandpass', 1.1);
        this.tone(420, 0.1, 'triangle', 0.025, 180);
        break;
      case 'swing3':
        this.noise(0.3, 1700, 0.15, 'bandpass', 0.8);
        this.tone(190, 0.22, 'sawtooth', 0.055, 70);
        break;
      case 'hit':
        this.tone(95, 0.11, 'sine', 0.19, 45);
        this.noise(0.09, 1500, 0.14, 'lowpass', 0.4);
        break;
      case 'crit':
        this.tone(110, 0.18, 'sine', 0.25, 40);
        this.tone(950, 0.16, 'triangle', 0.07, 300);
        this.noise(0.15, 3400, 0.15, 'highpass', 0.5);
        break;
      case 'hurt':
        this.tone(70, 0.3, 'sawtooth', 0.14, 32);
        this.noise(0.25, 700, 0.14, 'lowpass', 0.3);
        break;
      case 'dash':
        this.noise(0.35, 3200, 0.16, 'bandpass', 1.3);
        this.tone(720, 0.32, 'sine', 0.07, 140);
        break;
      case 'flame':
        this.noise(0.75, 900, 0.22, 'lowpass', 0.7);
        this.tone(180, 0.6, 'sawtooth', 0.08, 60);
        this.tone(640, 0.3, 'triangle', 0.04, 240);
        break;
      case 'arise':
        this.tone(55, 1.2, 'sawtooth', 0.1, 110);
        this.tone(220, 1.0, 'triangle', 0.08, 440);
        this.tone(660, 1.1, 'sine', 0.05, 990);
        this.noise(1.1, 420, 0.12, 'lowpass', 0.6);
        break;
      case 'domain':
        this.tone(48, 1.8, 'sawtooth', 0.2, 28);
        this.tone(220, 1.4, 'sine', 0.1, 880);
        this.tone(440, 1.4, 'triangle', 0.06, 1320);
        this.noise(1.4, 1800, 0.16, 'lowpass', 0.8);
        break;
      case 'level':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.7, 'sine', 0.07, null, i * 0.08));
        break;
      case 'kill':
        this.tone(180, 0.18, 'sine', 0.09, 70);
        this.noise(0.2, 2400, 0.07, 'highpass', 0.4);
        break;
      case 'clear':
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, 1.1, 'triangle', 0.07, null, i * 0.12));
        break;
      case 'ui':
        this.tone(880, 0.08, 'sine', 0.045);
        break;
      case 'deny':
        this.tone(130, 0.12, 'square', 0.03, 90);
        break;
      case 'death':
        this.tone(110, 1.6, 'sawtooth', 0.12, 30);
        this.noise(1.2, 500, 0.1, 'lowpass', 0.3);
        break;
      case 'boss':
        this.tone(42, 2.2, 'sawtooth', 0.2, 30);
        this.tone(84, 1.8, 'triangle', 0.09, 55);
        this.noise(1.8, 300, 0.13, 'lowpass', 0.4);
        break;
    }
  }
}
