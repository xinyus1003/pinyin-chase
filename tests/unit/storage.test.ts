import { describe, expect, it } from 'vitest';
import { loadProgress, saveProgress, type StorageLike } from '../../src/core/storage';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe('progress storage', () => {
  it('round-trips progress', () => {
    const storage = new MemoryStorage();
    saveProgress({
      bestLevel: 7,
      bestDistance: 88,
      lastDifficulty: 'extreme',
      muted: true,
      stats: {
        easy: { bestCpm: 120, totalLetters: 400, correctLetters: 380 },
        normal: { bestCpm: 150, totalLetters: 300, correctLetters: 260 },
        hard: { bestCpm: 180, totalLetters: 200, correctLetters: 170 },
        extreme: { bestCpm: 210, totalLetters: 100, correctLetters: 80 },
      },
      ghosts: {
        easy: { totalLetters: 42, levels: [{ level: 1, timesMs: [100, 260] }] },
        normal: null,
        hard: { totalLetters: 75, levels: [{ level: 1, timesMs: [90, 180, 300] }] },
        extreme: null,
      },
    }, storage);
    expect(loadProgress(storage)).toEqual({
      bestLevel: 7,
      bestDistance: 88,
      lastDifficulty: 'extreme',
      muted: true,
      stats: {
        easy: { bestCpm: 120, totalLetters: 400, correctLetters: 380 },
        normal: { bestCpm: 150, totalLetters: 300, correctLetters: 260 },
        hard: { bestCpm: 180, totalLetters: 200, correctLetters: 170 },
        extreme: { bestCpm: 210, totalLetters: 100, correctLetters: 80 },
      },
      ghosts: {
        easy: { totalLetters: 42, levels: [{ level: 1, timesMs: [100, 260] }] },
        normal: null,
        hard: { totalLetters: 75, levels: [{ level: 1, timesMs: [90, 180, 300] }] },
        extreme: null,
      },
    });
  });

  it('falls back to defaults on malformed data', () => {
    const storage = new MemoryStorage();
    storage.setItem('pinyin-chase:progress', '{bad json');
    expect(loadProgress(storage)).toMatchObject({ bestLevel: 1, bestDistance: 0, lastDifficulty: 'easy', muted: false });
  });

  it('sanitizes malformed ghost timelines without breaking existing progress', () => {
    const storage = new MemoryStorage();
    storage.setItem('pinyin-chase:progress', JSON.stringify({
      bestLevel: 4,
      ghosts: {
        easy: { totalLetters: 9, levels: [{ level: 1, timesMs: [100, -5, Number.NaN, 240] }] },
        hard: { totalLetters: 'bad', levels: 'bad' },
      },
      stats: {},
    }));

    const progress = loadProgress(storage);
    expect(progress.ghosts.easy).toEqual({ totalLetters: 9, levels: [{ level: 1, timesMs: [100, 240] }] });
    expect(progress.ghosts.hard).toBeNull();
  });

  it('works when storage is unavailable', () => {
    expect(loadProgress(undefined)).toMatchObject({ bestLevel: 1, bestDistance: 0, lastDifficulty: 'easy', muted: false });
  });
});
