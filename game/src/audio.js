// audio.js — all of Gobble Run's sound is synthesised with WebAudio:
// gobbles, wing flaps, corn crunches, alarm clangs and a bouncy little
// banjo-ish loop. The AudioContext is created lazily on the first user
// gesture and every call is guarded, so a blocked context never crashes
// the game — it just runs silent.

export class SoundBoard {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.context.destination);
    } catch (err) {
      this.context = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
  }

  _tone(freqFrom, freqTo, seconds, type, volume, when = 0) {
    if (!this.context || this.muted) return;
    try {
      const t0 = this.context.currentTime + when;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqFrom, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + seconds);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
      osc.connect(gain).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.02);
    } catch (err) { /* audio is decoration; never throw */ }
  }

  _noise(seconds, volume, when = 0) {
    if (!this.context || this.muted) return;
    try {
      const t0 = this.context.currentTime + when;
      const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = this.context.createBufferSource();
      src.buffer = buffer;
      const gain = this.context.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(this.master);
      src.start(t0);
    } catch (err) { /* guarded */ }
  }

  jump() { this._tone(320, 660, 0.14, 'square', 0.12); this._noise(0.08, 0.05); }
  land() { this._noise(0.06, 0.08); }
  gobble() {
    // A wobbly triple-squawk: the turkey's signature sound.
    for (let i = 0; i < 3; i++) {
      this._tone(700 + i * 60, 340, 0.09, 'sawtooth', 0.10, i * 0.085);
    }
  }
  crunch() { this._noise(0.09, 0.16); this._tone(180, 90, 0.08, 'triangle', 0.10); }
  pieChime() { this._tone(660, 660, 0.1, 'sine', 0.14); this._tone(880, 880, 0.16, 'sine', 0.14, 0.09); }
  nearMiss() { this._tone(1150, 1500, 0.09, 'sine', 0.08); }
  hurt() { this._tone(420, 120, 0.28, 'sawtooth', 0.18); this._noise(0.2, 0.14); }
  alarm() { this._tone(980, 980, 0.09, 'square', 0.10); this._tone(980, 980, 0.09, 'square', 0.10, 0.13); }
  caughtJingle() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this._tone(f, f, 0.22, 'triangle', 0.16, i * 0.18));
  }
  escapedFanfare() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((f, i) => this._tone(f, f, 0.16, 'triangle', 0.15, i * 0.11));
  }

  // A simple two-bar plucked loop, advanced by the game loop's clock.
  updateMusic(dt, playing) {
    if (!this.context || this.muted || !playing) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    const bass = [131, 131, 175, 196, 131, 131, 220, 196];
    const pluck = [262, 330, 392, 330, 349, 392, 440, 392];
    const step = this.musicStep % 8;
    this._tone(bass[step], bass[step], 0.16, 'triangle', 0.07);
    if (step % 2 === 0) this._tone(pluck[step], pluck[step], 0.1, 'square', 0.03);
    this.musicStep += 1;
    this.musicTimer = 0.21;
  }
}
