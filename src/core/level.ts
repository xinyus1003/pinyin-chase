import type { Difficulty, LevelSpec, Maze } from '../types';
import { bendCountFor, enemySpeedFor, DIFFICULTIES } from './difficulty';
import { generateMaze, LETTER_WORLD_STEP, type MazeOptions } from './maze';
import { normalizePinyin } from './pinyin';
import { selectPhrases } from './phrases';
import { createRng } from './random';

export type MazeGenerator = (options: MazeOptions) => Maze;

function safeInteger(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.floor(value));
}

export function createFallbackMaze({ seed, letters, initialGap }: MazeOptions): Maze {
  const safeLetters = safeInteger(letters, 1, 1);
  const safeGap = safeInteger(initialGap, 1, 1);
  const length = (safeLetters + safeGap) * LETTER_WORLD_STEP;
  return {
    samples: [
      { x: 0, y: 0, angle: 0, distance: 0 },
      { x: length, y: 0, angle: 0, distance: length },
    ],
    length,
    heroStartDistance: safeGap * LETTER_WORLD_STEP,
    corridorWidth: 86,
    seed: Number.isFinite(seed) ? seed : 0,
  };
}

function isUsableMaze(maze: Maze): boolean {
  const first = maze.samples[0];
  const last = maze.samples.at(-1);
  return Boolean(
    first
      && last
      && maze.samples.length >= 2
      && Number.isFinite(maze.length)
      && maze.length > 0
      && Number.isFinite(maze.heroStartDistance)
      && Number.isFinite(first.distance)
      && Number.isFinite(last.distance)
      && last.distance > first.distance,
  );
}

export function createLevel(
  difficulty: Difficulty,
  level: number,
  seed: number,
  mazeGenerator: MazeGenerator = generateMaze,
): LevelSpec {
  const safeDifficulty: Difficulty = Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'easy';
  const safeLevel = safeInteger(level, 1, 1);
  const safeSeed = Number.isFinite(seed) ? seed : 0;
  const rng = createRng(safeSeed);
  const phrases = selectPhrases(safeDifficulty, safeLevel, rng);
  const letters = normalizePinyin(phrases.map((phrase) => phrase.pinyin).join(''));
  const initialGap = DIFFICULTIES[safeDifficulty].initialGap;
  const options: MazeOptions = {
    seed: safeSeed,
    letters: letters.length,
    initialGap,
    bends: bendCountFor(safeDifficulty, safeLevel),
  };
  let maze: Maze;
  try {
    const generated = mazeGenerator(options);
    maze = isUsableMaze(generated) ? generated : createFallbackMaze(options);
  } catch {
    maze = createFallbackMaze(options);
  }
  return {
    number: safeLevel,
    difficulty: safeDifficulty,
    phrases,
    letters,
    maze,
    enemySpeed: enemySpeedFor(safeDifficulty, safeLevel),
    initialGap,
  };
}
