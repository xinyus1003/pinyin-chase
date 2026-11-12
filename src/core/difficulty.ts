import type { Difficulty, DifficultyConfig } from '../types';

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: '简单',
    enemySpeed: 1.4,
    speedPerLevel: 0.08,
    initialGap: 14,
    startTier: 1,
    phraseOffset: 0,
    baseBends: 5,
  },
  normal: {
    label: '普通',
    enemySpeed: 2.2,
    speedPerLevel: 0.12,
    initialGap: 11,
    startTier: 2,
    phraseOffset: 1,
    baseBends: 7,
  },
  hard: {
    label: '困难',
    enemySpeed: 3,
    speedPerLevel: 0.16,
    initialGap: 8,
    startTier: 4,
    phraseOffset: 2,
    baseBends: 9,
  },
};

export function enemySpeedFor(difficulty: Difficulty, level: number): number {
  const config = DIFFICULTIES[difficulty];
  return config.enemySpeed + Math.max(0, level - 1) * config.speedPerLevel;
}

export function phraseCountFor(difficulty: Difficulty, _level: number): number {
  return 3 + DIFFICULTIES[difficulty].phraseOffset;
}

export function phraseTierFor(difficulty: Difficulty, level: number): 1 | 2 | 3 | 4 | 5 {
  const config = DIFFICULTIES[difficulty];
  const tier = config.startTier + Math.floor(Math.max(0, level - 1) / 4);
  return Math.min(5, tier) as 1 | 2 | 3 | 4 | 5;
}

export function bendCountFor(difficulty: Difficulty, level: number): number {
  return DIFFICULTIES[difficulty].baseBends + Math.min(Math.max(0, level - 1), 12);
}

