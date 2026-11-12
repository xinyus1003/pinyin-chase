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
    saveProgress({ bestLevel: 7, bestDistance: 88, lastDifficulty: 'hard', muted: true }, storage);
    expect(loadProgress(storage)).toEqual({ bestLevel: 7, bestDistance: 88, lastDifficulty: 'hard', muted: true });
  });

  it('falls back to defaults on malformed data', () => {
    const storage = new MemoryStorage();
    storage.setItem('pinyin-chase:progress', '{bad json');
    expect(loadProgress(storage)).toEqual({ bestLevel: 1, bestDistance: 0, lastDifficulty: 'easy', muted: false });
  });

  it('works when storage is unavailable', () => {
    expect(loadProgress(undefined)).toEqual({ bestLevel: 1, bestDistance: 0, lastDifficulty: 'easy', muted: false });
  });
});
