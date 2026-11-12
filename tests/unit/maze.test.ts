import { describe, expect, it } from 'vitest';
import { generateMaze, LETTER_WORLD_STEP, sampleMaze } from '../../src/core/maze';

describe('generateMaze', () => {
  it('creates a deterministic path with the expected distance', () => {
    const options = { seed: 42, letters: 30, initialGap: 8, bends: 6 };
    const first = generateMaze(options);
    const second = generateMaze(options);
    expect(first.length).toBeCloseTo((30 + 8) * LETTER_WORLD_STEP, 4);
    expect(first.heroStartDistance).toBeCloseTo(8 * LETTER_WORLD_STEP, 4);
    expect(first.samples[0]?.x).toBeCloseTo(0);
    expect(first.samples.at(-1)?.x).toBeGreaterThan(0);
    expect(first.samples.map((point) => point.y)).toEqual(second.samples.map((point) => point.y));
  });

  it('winds above and below its starting point', () => {
    const maze = generateMaze({ seed: 42, letters: 30, initialGap: 8, bends: 6 });
    const startY = maze.samples[0]!.y;
    const ys = maze.samples.map((point) => point.y);
    expect(Math.max(...ys)).toBeGreaterThan(startY);
    expect(Math.min(...ys)).toBeLessThan(startY);
  });

  it('samples continuous positions and clamps at both ends', () => {
    const maze = generateMaze({ seed: 9, letters: 20, initialGap: 6, bends: 5 });
    expect(sampleMaze(maze, -100).distance).toBe(0);
    expect(sampleMaze(maze, maze.length + 100).distance).toBeCloseTo(maze.length);
    const middle = sampleMaze(maze, maze.length / 2);
    expect(middle.distance).toBeCloseTo(maze.length / 2, 0);
    expect(Number.isFinite(middle.x)).toBe(true);
    expect(Number.isFinite(middle.y)).toBe(true);
  });
});
