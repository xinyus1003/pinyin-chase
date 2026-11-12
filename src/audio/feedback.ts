export type AudioContextFactory = () => AudioContext;
export type Vibrate = (pattern: number | number[]) => void;

const defaultVibrate: Vibrate = (pattern) => {
  navigator.vibrate?.(pattern);
};

/**
 * Synthesized sound effects and haptics for the chase loop. No external audio
 * assets or runtime network are used; every effect is generated with the Web
 * Audio API and degrades silently when the API or vibration is unavailable.
 */
export class FeedbackController {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private tension = 0;
  private pulseTimer: number | null = null;

  constructor(
    private readonly createContext: AudioContextFactory = () => new AudioContext(),
    private readonly vibrateFn: Vibrate = defaultVibrate,
  ) {}

  destroy(): void {
    if (this.pulseTimer !== null) globalThis.clearTimeout(this.pulseTimer);
    this.pulseTimer = null;
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  unlock(): void {
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.22;
        this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      // Web Audio may be unavailable; the game stays playable without sound.
      this.context = null;
      this.master = null;
    }
  }

  correct(): void {
    this.tone(660, 0.06, 'sine', 0.18);
    this.vibrate(8);
  }

  wrong(): void {
    this.tone(130, 0.14, 'sawtooth', 0.22);
    this.vibrate(28);
  }

  levelClear(): void {
    this.tone(660, 0.08, 'sine', 0.2, 0);
    this.tone(880, 0.12, 'sine', 0.2, 0.09);
    this.vibrate([16, 30, 24]);
  }

  caught(): void {
    this.tone(90, 0.35, 'sawtooth', 0.3);
    this.vibrate([40, 40, 80]);
  }

  setTension(value: number): void {
    this.tension = Math.max(0, Math.min(1, value));
    if (this.pulseTimer !== null) return;
    const pulse = () => {
      if (!this.muted && this.tension > 0.25) {
        this.tone(180 + this.tension * 120, 0.025, 'triangle', 0.04);
      }
      const delay = 700 - this.tension * 480;
      this.pulseTimer = globalThis.setTimeout(pulse, delay);
    };
    this.pulseTimer = globalThis.setTimeout(pulse, 700);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22;
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    if (!this.context || !this.master || this.muted) return;
    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration);
  }

  private vibrate(pattern: number | number[]): void {
    try {
      this.vibrateFn(pattern);
    } catch {
      // Haptics are optional.
    }
  }
}
