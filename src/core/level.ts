import type { Difficulty, LevelSpec } from '../types';
import { bendCountFor, enemySpeedFor, DIFFICULTIES } from './difficulty';
import { generateMaze } from './maze';
import { normalizePinyin } from './pinyin';
import { selectPhrases } from './phrases';
import { createRng } from './random';

export function createLevel(difficulty: Difficulty, level: number, seed: number): LevelSpec {
  const rng = createRng(seed);
  const phrases = selectPhrases(difficulty, level, rng);
  const letters = normalizePinyin(phrases.map((phrase) => phrase.pinyin).join(''));
  const initialGap = DIFFICULTIES[difficulty].initialGap;
  const maze = generateMaze({
    seed,
    letters: letters.length,
    initialGap,
    bends: bendCountFor(difficulty, level),
  });
  return {
    number: level,
    difficulty,
    phrases,
    letters,
    maze,
    enemySpeed: enemySpeedFor(difficulty, level),
    initialGap,
  };
}
