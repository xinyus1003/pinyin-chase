import { describe, expect, it } from 'vitest';
import { GhostRecorder, ghostLettersAt, shouldReplaceGhost } from '../../src/core/ghost';

describe('ghost playback', () => {
  it('returns the number of letters reached at a given active time', () => {
    const times = [100, 300, 700];
    expect(ghostLettersAt(times, 99)).toBe(0);
    expect(ghostLettersAt(times, 100)).toBe(1);
    expect(ghostLettersAt(times, 450)).toBe(2);
    expect(ghostLettersAt(times, 900)).toBe(3);
  });
});

describe('GhostRecorder', () => {
  it('records level-relative timelines and total run progress', () => {
    const recorder = new GhostRecorder();
    recorder.beginLevel(1, 0);
    recorder.recordCorrect(120);
    recorder.recordCorrect(360);

    recorder.beginLevel(2, 500);
    recorder.recordCorrect(650);

    expect(recorder.totalLetters).toBe(3);
    expect(recorder.snapshot()).toEqual({
      totalLetters: 3,
      levels: [
        { level: 1, timesMs: [120, 360] },
        { level: 2, timesMs: [150] },
      ],
    });
  });

  it('starts a fresh run after reset', () => {
    const recorder = new GhostRecorder();
    recorder.beginLevel(1, 0);
    recorder.recordCorrect(100);
    recorder.reset();

    expect(recorder.totalLetters).toBe(0);
    expect(recorder.snapshot()).toEqual({ totalLetters: 0, levels: [] });
  });
});

describe('ghost record selection', () => {
  it('replaces a ghost only when the run reaches more letters', () => {
    expect(shouldReplaceGhost({ totalLetters: 5, levels: [] }, null)).toBe(true);
    expect(shouldReplaceGhost({ totalLetters: 5, levels: [] }, { totalLetters: 4, levels: [] })).toBe(true);
    expect(shouldReplaceGhost({ totalLetters: 5, levels: [] }, { totalLetters: 5, levels: [] })).toBe(false);
  });
});
