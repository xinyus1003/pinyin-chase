import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackController } from '../../src/audio/feedback';

type VFn = ReturnType<typeof vi.fn>;

interface FakeGainNode {
  gain: { value: number; setValueAtTime: VFn; exponentialRampToValueAtTime: VFn };
  connect: VFn;
}

interface FakeOscillatorNode {
  type: OscillatorType;
  frequency: { setValueAtTime: VFn };
  connect: VFn;
  start: VFn;
  stop: VFn;
}

function makeGain(): FakeGainNode {
  return {
    gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
}

function makeOscillator(): FakeOscillatorNode {
  return {
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function makeContext() {
  const gains: FakeGainNode[] = [];
  const oscillators: FakeOscillatorNode[] = [];
  const context = {
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(() => {
      const gain = makeGain();
      gains.push(gain);
      return gain;
    }),
    createOscillator: vi.fn(() => {
      const oscillator = makeOscillator();
      oscillators.push(oscillator);
      return oscillator;
    }),
  };
  return { context, gains, oscillators };
}

function asAudioContext(context: ReturnType<typeof makeContext>['context']): AudioContext {
  return context as unknown as AudioContext;
}

describe('FeedbackController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('creates and resumes an audio context on unlock', () => {
    const { context, gains } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));

    controller.unlock();

    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.createGain).toHaveBeenCalledTimes(1);
    expect(gains[0]!.gain.value).toBe(0.22);
    controller.destroy();
  });

  it('toggles mute and mirrors the state onto the master gain', () => {
    const { context, gains } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));

    expect(controller.toggleMuted()).toBe(true);
    expect(controller.toggleMuted()).toBe(false);

    controller.unlock();
    const master = gains[0]!;
    controller.setMuted(true);
    expect(master.gain.value).toBe(0);
    controller.setMuted(false);
    expect(master.gain.value).toBe(0.22);
    controller.destroy();
  });

  it('pulses a rising triangle tone only above the tension threshold', () => {
    const { context, oscillators } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));
    controller.unlock();

    controller.setTension(0.5);
    vi.advanceTimersByTime(700);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]!.type).toBe('triangle');
    // 180 + 0.5 * 120
    expect(oscillators[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(240, 0);

    controller.setTension(0.25);
    vi.advanceTimersByTime(2000);
    expect(oscillators).toHaveLength(1);
    controller.destroy();
  });

  it('stays silent while muted', () => {
    const { context, oscillators } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));
    controller.unlock();
    controller.setMuted(true);

    controller.setTension(0.9);
    vi.advanceTimersByTime(2000);

    expect(oscillators).toHaveLength(0);
    controller.destroy();
  });

  it('clamps out-of-range tension values', () => {
    const { context, oscillators } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));
    controller.unlock();

    controller.setTension(1.5);
    vi.advanceTimersByTime(700);
    expect(oscillators[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(300, 0);
    controller.destroy();
  });

  it('vibrates on wrong input and tolerates an unsupported vibrate API', () => {
    const { context } = makeContext();
    const vibrate = vi.fn();
    const controller = new FeedbackController(() => asAudioContext(context), vibrate);
    controller.unlock();

    controller.wrong();
    expect(vibrate).toHaveBeenCalledWith(28);

    const throwing = new FeedbackController(
      () => asAudioContext(context),
      () => {
        throw new Error('haptics unavailable');
      },
    );
    throwing.unlock();
    expect(() => throwing.wrong()).not.toThrow();
    controller.destroy();
    throwing.destroy();
  });

  it('plays the two-note level clear arpeggio', () => {
    const { context, oscillators } = makeContext();
    const vibrate = vi.fn();
    const controller = new FeedbackController(() => asAudioContext(context), vibrate);
    controller.unlock();

    controller.levelClear();

    expect(vibrate).toHaveBeenCalledWith([16, 30, 24]);
    expect(oscillators).toHaveLength(2);
    expect(oscillators[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(660, 0);
    expect(oscillators[1]!.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0.09);
    controller.destroy();
  });

  it('unlock falls back silently when the Web Audio API is unavailable', () => {
    const controller = new FeedbackController(() => {
      throw new Error('AudioContext unavailable');
    });

    expect(() => controller.unlock()).not.toThrow();

    // Feedback calls after a failed unlock must remain no-ops.
    expect(() => controller.correct()).not.toThrow();
    expect(() => controller.wrong()).not.toThrow();
    controller.destroy();
  });

  it('zeroing tension cancels the pending heartbeat, and restarting schedules again', () => {
    const { context, oscillators } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));
    controller.unlock();

    controller.setTension(0.8);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(700);
    expect(oscillators).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);

    // A pulse is already pending at this point; zeroing must cancel it.
    controller.setTension(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(oscillators).toHaveLength(1);

    // Rising tension again must start a fresh heartbeat.
    controller.setTension(0.8);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(700);
    expect(oscillators).toHaveLength(2);
    controller.destroy();
  });

  it('keeps heartbeat silent and timer-free when zero tension is set first', () => {
    const { context, oscillators } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));
    controller.unlock();

    controller.setTension(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(oscillators).toHaveLength(0);
    controller.destroy();
  });

  it('destroy clears the pulse timer and closes the context', () => {
    const { context, oscillators } = makeContext();
    const controller = new FeedbackController(() => asAudioContext(context));
    controller.unlock();
    controller.setTension(0.9);

    controller.destroy();

    expect(context.close).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(oscillators).toHaveLength(0);
  });
});
