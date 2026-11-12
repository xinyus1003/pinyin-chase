import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBestDistanceTracker,
  createLevelClearTimer,
  nextLevelNumber,
  visibilityAction,
} from '../../src/core/runFlow';

describe('level clear timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('schedules once, fires the callback and leaves pending=false', () => {
    const callback = vi.fn();
    const timer = createLevelClearTimer(900);

    expect(timer.isPending()).toBe(false);
    expect(timer.schedule(callback)).toBe(true);
    expect(timer.isPending()).toBe(true);

    // A second schedule while pending must be ignored.
    expect(timer.schedule(callback)).toBe(false);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(899);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timer.isPending()).toBe(false);

    // The timer can be scheduled again after it fired.
    expect(timer.schedule(callback)).toBe(true);
  });

  it('can be cleared without firing', () => {
    const callback = vi.fn();
    const timer = createLevelClearTimer(900);

    timer.schedule(callback);
    timer.clear();

    expect(timer.isPending()).toBe(false);
    vi.advanceTimersByTime(900);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('best distance tracker', () => {
  it('is monotonic and requests a save exactly every 10 newly recorded letters', () => {
    const tracker = createBestDistanceTracker(0);

    for (let letters = 1; letters <= 9; letters += 1) {
      const result = tracker.record(letters);
      expect(result.bestDistance).toBe(letters);
      expect(result.shouldSave).toBe(false);
    }
    expect(tracker.record(10)).toEqual({ bestDistance: 10, recorded: 1, shouldSave: true });

    for (let letters = 11; letters <= 19; letters += 1) {
      expect(tracker.record(letters).shouldSave).toBe(false);
    }
    expect(tracker.record(20).shouldSave).toBe(true);

    // Lower values must not lower the best distance or count as new letters.
    expect(tracker.record(5)).toEqual({ bestDistance: 20, recorded: 0, shouldSave: false });
    expect(tracker.bestDistance).toBe(20);
  });

  it('restarts the save cadence after a forced flush', () => {
    const tracker = createBestDistanceTracker(0);

    for (let letters = 1; letters <= 9; letters += 1) {
      expect(tracker.record(letters).shouldSave).toBe(false);
    }
    tracker.flush();

    for (let letters = 10; letters <= 18; letters += 1) {
      expect(tracker.record(letters).shouldSave).toBe(false);
    }
    expect(tracker.record(19).shouldSave).toBe(true);
  });

  it('counts a jump as newly recorded letters from the current best', () => {
    const tracker = createBestDistanceTracker(7);

    expect(tracker.record(6)).toEqual({ bestDistance: 7, recorded: 0, shouldSave: false });
    expect(tracker.record(10)).toEqual({ bestDistance: 10, recorded: 3, shouldSave: false });
    expect(tracker.record(17)).toEqual({ bestDistance: 17, recorded: 7, shouldSave: true });
  });
});

describe('visibility action', () => {
  it('pauses a playing run when hidden', () => {
    expect(visibilityAction(true, 'playing')).toBe('pause');
  });

  it('shows resume for a paused run when visible', () => {
    expect(visibilityAction(false, 'paused')).toBe('show-resume');
  });

  it('returns none for every other combination', () => {
    expect(visibilityAction(false, 'playing')).toBe('none');
    expect(visibilityAction(true, 'paused')).toBe('none');
    expect(visibilityAction(true, 'levelClear')).toBe('none');
    expect(visibilityAction(false, 'gameOver')).toBe('none');
    expect(visibilityAction(true, 'menu')).toBe('none');
    expect(visibilityAction(false, 'menu')).toBe('none');
  });
});

describe('next level number', () => {
  it('increments only when the phase is levelClear', () => {
    expect(nextLevelNumber('levelClear', 3)).toBe(4);
    expect(nextLevelNumber('playing', 3)).toBeNull();
    expect(nextLevelNumber('paused', 3)).toBeNull();
    expect(nextLevelNumber('gameOver', 3)).toBeNull();
    expect(nextLevelNumber('menu', 3)).toBeNull();
  });
});
