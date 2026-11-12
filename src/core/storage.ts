import type { Difficulty, DifficultyStats } from '../types';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type PersistedProgress = {
  bestLevel: number;
  bestDistance: number;
  lastDifficulty: Difficulty;
  muted: boolean;
  stats: Record<Difficulty, DifficultyStats>;
};

const KEY = 'pinyin-chase:progress';
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'extreme'];

function emptyStats(): Record<Difficulty, DifficultyStats> {
  return {
    easy: { bestCpm: 0, totalLetters: 0, correctLetters: 0 },
    normal: { bestCpm: 0, totalLetters: 0, correctLetters: 0 },
    hard: { bestCpm: 0, totalLetters: 0, correctLetters: 0 },
    extreme: { bestCpm: 0, totalLetters: 0, correctLetters: 0 },
  };
}

function defaultProgress(): PersistedProgress {
  return {
    bestLevel: 1,
    bestDistance: 0,
    lastDifficulty: 'easy',
    muted: false,
    stats: emptyStats(),
  };
}

function finiteNonNegative(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function normalizeStats(value: unknown): Record<Difficulty, DifficultyStats> {
  const result = emptyStats();
  if (!value || typeof value !== 'object') return result;
  for (const difficulty of DIFFICULTIES) {
    const raw = (value as Record<string, unknown>)[difficulty];
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const totalLetters = finiteNonNegative(record.totalLetters);
    const correctLetters = Math.min(totalLetters, finiteNonNegative(record.correctLetters));
    result[difficulty] = {
      bestCpm: finiteNonNegative(record.bestCpm),
      totalLetters,
      correctLetters,
    };
  }
  return result;
}

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
    if (!raw) return defaultProgress();
    const value = JSON.parse(raw) as Partial<PersistedProgress> & Record<string, unknown>;
    const difficulty = value.lastDifficulty;
    return {
      bestLevel: Math.max(1, finiteNonNegative(value.bestLevel, 1)),
      bestDistance: finiteNonNegative(value.bestDistance),
      lastDifficulty: difficulty === 'normal' || difficulty === 'hard' || difficulty === 'extreme' ? difficulty : 'easy',
      muted: value.muted === true,
      stats: normalizeStats(value.stats),
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: PersistedProgress, storage?: StorageLike): void {
  try {
    resolveStorage(storage)?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage is optional; gameplay must continue without it.
  }
}
