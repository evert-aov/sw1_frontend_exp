import { DjPlaylistId } from '../../../core/models/live-telemetry.model';

interface PlaylistSynthSpec {
  bpm: number;
  chords: number[][];
  bass: number[];
  waveform: OscillatorType;
  cutoff: number;
  kickPunch: number;
}

const PLAYLIST_SPECS: Record<DjPlaylistId, PlaylistSynthSpec> = {
  chill_jazz: {
    bpm: 92,
    chords: [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
    ],
    bass: [130.81, 110.0, 146.83, 98.0],
    waveform: 'sine',
    cutoff: 900,
    kickPunch: 0.22,
  },
  groove_funk: {
    bpm: 112,
    chords: [
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [329.63, 392.0, 493.88, 587.33], // Em7
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [220.0, 277.18, 329.63, 392.0], // A7
    ],
    bass: [146.83, 164.81, 174.61, 110.0],
    waveform: 'triangle',
    cutoff: 1350,
    kickPunch: 0.34,
  },
  melodic_house: {
    bpm: 122,
    chords: [
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
      [261.63, 329.63, 392.0, 523.25], // C
      [196.0, 246.94, 293.66, 392.0], // G
    ],
    bass: [110.0, 87.31, 130.81, 98.0],
    waveform: 'triangle',
    cutoff: 1600,
    kickPunch: 0.42,
  },
  upbeat_party: {
    bpm: 128,
    chords: [
      [261.63, 329.63, 392.0, 523.25], // C
      [196.0, 246.94, 293.66, 392.0], // G
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
    ],
    bass: [130.81, 98.0, 110.0, 87.31],
    waveform: 'sawtooth',
    cutoff: 1900,
    kickPunch: 0.48,
  },
};

/**
 * Motor ligero de grooves musicales con Web Audio API (sin dependencias externas)
 * con soporte para cambio de playlist/BPM en caliente y ducking automático al hablar el DJ.
 */
export class DjGrooveEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private volume = 0.55;
  private ducked = false;
  private playlist: DjPlaylistId = 'chill_jazz';
  private playing = false;

  start(playlist: DjPlaylistId): void {
    this.playlist = playlist;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.effectiveGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.playing = true;
    this.restartLoop();
  }

  setPlaylist(playlist: DjPlaylistId): void {
    this.playlist = playlist;
    if (this.playing) {
      this.restartLoop();
    }
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.applyGain();
  }

  setDucked(isDucked: boolean): void {
    this.ducked = isDucked;
    this.applyGain();
  }

  stop(): void {
    this.playing = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }

  private effectiveGain(): number {
    const base = this.volume * 0.35;
    return this.ducked ? base * 0.22 : base;
  }

  private applyGain(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.effectiveGain(), now, 0.15);
  }

  private restartLoop(): void {
    if (this.timer) clearInterval(this.timer);
    const spec = PLAYLIST_SPECS[this.playlist];
    const eighthNoteMs = (60 / spec.bpm / 2) * 1000;
    this.playStep();
    this.timer = setInterval(() => this.playStep(), eighthNoteMs);
  }

  private playStep(): void {
    if (!this.ctx || !this.masterGain || !this.playing) return;
    const spec = PLAYLIST_SPECS[this.playlist];
    const now = this.ctx.currentTime;
    const barIndex = Math.floor(this.step / 8) % spec.chords.length;
    const beatInBar = this.step % 8;

    // Kick en tiempos fuertes
    if (beatInBar === 0 || beatInBar === 4 || (this.playlist === 'upbeat_party' && beatInBar === 6)) {
      this.triggerKick(now, spec.kickPunch);
    }

    // Hi-hat suave en contratiempos
    if (beatInBar % 2 === 1) {
      this.triggerHat(now, 0.06);
    }

    // Acorde cálido al inicio del compás
    if (beatInBar === 0) {
      const chord = spec.chords[barIndex];
      const dur = (60 / spec.bpm) * 3.6;
      for (const freq of chord) {
        this.triggerPadNote(now, freq, dur, spec.waveform, spec.cutoff);
      }
    }

    // Bajo rítmico
    if (beatInBar === 0 || beatInBar === 3 || beatInBar === 6) {
      const bassFreq = spec.bass[barIndex];
      this.triggerBass(now, bassFreq, 0.35);
    }

    this.step = (this.step + 1) % 32;
  }

  private triggerKick(now: number, punch: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    gain.gain.setValueAtTime(punch, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  private triggerHat(now: number, level: number): void {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  private triggerPadNote(
    now: number,
    freq: number,
    duration: number,
    waveform: OscillatorType,
    cutoff: number,
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = waveform;
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private triggerBass(now: number, freq: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }
}
