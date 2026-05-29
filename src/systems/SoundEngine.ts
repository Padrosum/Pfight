type SoundId = 'punch' | 'heavyPunch' | 'kick' | 'heavyKick' | 'hit' | 'jump' | 'block' | 'ko';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private playTone(
    type: OscillatorType,
    freq: number,
    duration: number,
    gain: number,
    freqEnd?: number
  ) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    }
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(duration: number, gain: number, lowpass: number) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    src.start();
  }

  play(id: SoundId) {
    switch (id) {
      case 'punch':
        this.playNoise(0.06, 0.4, 1200);
        this.playTone('square', 180, 0.06, 0.2, 80);
        break;
      case 'heavyPunch':
        this.playNoise(0.1, 0.6, 800);
        this.playTone('square', 120, 0.1, 0.35, 40);
        break;
      case 'kick':
        this.playNoise(0.07, 0.35, 2000);
        this.playTone('sawtooth', 200, 0.07, 0.15, 60);
        break;
      case 'heavyKick':
        this.playNoise(0.12, 0.7, 600);
        this.playTone('sawtooth', 100, 0.12, 0.4, 30);
        break;
      case 'hit':
        this.playNoise(0.08, 0.5, 900);
        this.playTone('square', 300, 0.05, 0.3, 100);
        break;
      case 'block':
        this.playTone('square', 400, 0.04, 0.2, 200);
        break;
      case 'jump':
        this.playTone('sine', 220, 0.15, 0.15, 440);
        break;
      case 'ko':
        this.playTone('square', 80, 0.5, 0.5, 20);
        this.playNoise(0.5, 0.3, 400);
        break;
    }
  }

  toggleMute() { this.muted = !this.muted; }
}
