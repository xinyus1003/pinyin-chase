import type { Maze, PathSample } from '../types';

export const LETTER_WORLD_STEP = 28;
const SAMPLE_STEP = 2;

export type MazeOptions = {
  seed: number;
  letters: number;
  initialGap: number;
  bends: number;
};

export function generateMaze({ seed, letters, initialGap, bends }: MazeOptions): Maze {
  const targetLength = (letters + initialGap) * LETTER_WORLD_STEP;
  const phase = ((seed % 360) / 180) * Math.PI;
  const amplitude = Math.min(150, Math.max(46, targetLength / (bends * 3.4)));
  const raw: PathSample[] = [];
  let previousX = 0;
  let previousY = amplitude * Math.sin(phase);

  for (let x = 0; x <= targetLength; x += SAMPLE_STEP) {
    const y = amplitude * Math.sin((x / targetLength) * bends * Math.PI * 2 + phase);
    const distance = raw.length === 0
      ? 0
      : raw[raw.length - 1]!.distance + Math.hypot(x - previousX, y - previousY);
    const angle = Math.atan2(y - previousY, x - previousX);
    raw.push({ x, y, angle, distance });
    previousX = x;
    previousY = y;
  }

  const rawLength = raw.at(-1)!.distance;
  const scale = targetLength / rawLength;
  const samples = raw.map((point) => ({
    x: point.x * scale,
    y: point.y * scale,
    angle: point.angle,
    distance: point.distance * scale,
  }));

  return {
    samples,
    length: samples.at(-1)!.distance,
    heroStartDistance: initialGap * LETTER_WORLD_STEP,
    corridorWidth: 86,
    seed,
  };
}

export function sampleMaze(maze: Maze, distance: number): PathSample {
  const clamped = Math.max(0, Math.min(maze.length, distance));
  const samples = maze.samples;
  let low = 0;
  let high = samples.length - 1;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (samples[mid]!.distance <= clamped) low = mid;
    else high = mid;
  }
  const a = samples[low]!;
  const b = samples[high]!;
  const span = b.distance - a.distance;
  const t = span === 0 ? 0 : (clamped - a.distance) / span;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: a.angle + (b.angle - a.angle) * t,
    distance: clamped,
  };
}
