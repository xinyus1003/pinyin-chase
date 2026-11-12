export type Difficulty = 'easy' | 'normal' | 'hard';

export type DifficultyConfig = {
  label: string;
  enemySpeed: number;
  speedPerLevel: number;
  initialGap: number;
  startTier: 1 | 2 | 3 | 4 | 5;
  phraseOffset: number;
  baseBends: number;
};

export interface RandomSource {
  next(): number;
  integer(minInclusive: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

export interface Phrase {
  id: string;
  zh: string;
  pinyin: string;
  tier: 1 | 2 | 3 | 4 | 5;
}

export interface PathSample {
  x: number;
  y: number;
  angle: number;
  distance: number;
}

export interface Maze {
  samples: PathSample[];
  length: number;
  heroStartDistance: number;
  corridorWidth: number;
  seed: number;
}

export interface LevelSpec {
  number: number;
  difficulty: Difficulty;
  phrases: Phrase[];
  letters: string;
  maze: Maze;
  enemySpeed: number;
  initialGap: number;
}

export type GamePhase = 'menu' | 'playing' | 'paused' | 'levelClear' | 'gameOver';

export interface GameSnapshot {
  phase: GamePhase;
  level: LevelSpec;
  phraseIndex: number;
  letterIndex: number;
  heroLetters: number;
  totalLetters: number;
  gap: number;
  stunRemaining: number;
  catchElapsed: number;
  runLetters: number;
}

export type LetterOutcome =
  | { kind: 'correct'; expected: string }
  | { kind: 'wrong'; expected: string }
  | { kind: 'ignored' };
