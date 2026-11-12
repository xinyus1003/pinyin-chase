import type { Difficulty } from '../types';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type PersistedProgress = {
  bestLevel: number;
  bestDistance: number;
  lastDifficulty: Difficulty;
  muted: boolean;
};

const KEY = 'pinyin-chase:progress';
const DEFAULTS: PersistedProgress = {
  bestLevel: 1,
  bestDistance: 0,
  lastDifficulty: 'easy',
  muted: false,
};

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadProgress(storage?: StorageLike): PersistedProgress {
  try {
    const raw = resolveStorage(storage)?.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const value = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      bestLevel: Number.isFinite(value.bestLevel) ? Math.max(1, Number(value.bestLevel)) : 1,
      bestDistance: Number.isFinite(value.bestDistance) ? Math.max(0, Number(value.bestDistance)) : 0,
      lastDifficulty: value.lastDifficulty === 'normal' || value.lastDifficulty === 'hard' ? value.lastDifficulty : 'easy',
      muted: value.muted === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveProgress(progress: PersistedProgress, storage?: StorageLike): void {
  try {
    resolveStorage(storage)?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage is optional; gameplay must continue without it.
  }
}
