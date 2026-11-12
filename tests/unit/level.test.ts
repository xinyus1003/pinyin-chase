import { describe, expect, it } from 'vitest';
import { createLevel } from '../../src/core/level';
import { normalizePinyin } from '../../src/core/pinyin';

describe('createLevel', () => {
  it('combines phrases, maze and difficulty settings', () => {
    const level = createLevel('normal', 3, 1234);
    const letters = normalizePinyin(level.phrases.map((phrase) => phrase.pinyin).join(''));
    expect(level.difficulty).toBe('normal');
    expect(level.number).toBe(3);
    expect(level.letters).toBe(letters);
    expect(level.phrases.length).toBeGreaterThan(0);
    expect(level.maze.length).toBeCloseTo((letters.length + level.initialGap) * 28, 4);
    expect(level.enemySpeed).toBeGreaterThan(2.2);
  });

  it('replays the same level for the same seed', () => {
    const first = createLevel('hard', 7, 999);
    const second = createLevel('hard', 7, 999);
    expect(first.phrases.map((phrase) => phrase.zh)).toEqual(second.phrases.map((phrase) => phrase.zh));
    expect(first.maze.samples).toEqual(second.maze.samples);
  });
});
