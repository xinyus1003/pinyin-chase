import { describe, expect, it } from 'vitest';
import {
  bendCountFor,
  enemySpeedFor,
  phraseCountFor,
  phraseTierFor,
} from '../../src/core/difficulty';
import { createRng } from '../../src/core/random';

describe('difficulty curve', () => {
  it('applies base speed and per-level increments', () => {
    expect(enemySpeedFor('easy', 1)).toBeCloseTo(1.4);
    expect(enemySpeedFor('easy', 3)).toBeCloseTo(1.56);
    expect(enemySpeedFor('normal', 4)).toBeCloseTo(2.56);
    expect(enemySpeedFor('hard', 6)).toBeCloseTo(3.8);
    expect(enemySpeedFor('extreme', 1)).toBeCloseTo(4.2);
    expect(enemySpeedFor('extreme', 3)).toBeCloseTo(4.64);
  });

  it('keeps sentence counts fixed by difficulty and caps phrase tier at five', () => {
    expect(phraseCountFor('easy', 1)).toBe(3);
    expect(phraseCountFor('easy', 20)).toBe(3);
    expect(phraseCountFor('normal', 20)).toBe(4);
    expect(phraseCountFor('hard', 1)).toBe(5);
    expect(phraseCountFor('hard', 20)).toBe(5);
    expect(phraseTierFor('easy', 1)).toBe(1);
    expect(phraseTierFor('hard', 1)).toBe(4);
    expect(phraseTierFor('easy', 17)).toBe(5);
    expect(phraseTierFor('hard', 99)).toBe(5);
    expect(phraseCountFor('extreme', 1)).toBe(6);
    expect(phraseTierFor('extreme', 1)).toBe(5);
  });

  it('increases bends for twelve levels with no further geometry growth', () => {
    expect(bendCountFor('easy', 1)).toBe(5);
    expect(bendCountFor('easy', 13)).toBe(17);
    expect(bendCountFor('easy', 30)).toBe(17);
    expect(bendCountFor('extreme', 1)).toBe(13);
  });
});

describe('deterministic random source', () => {
  it('replays the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const left = [a.next(), a.next(), a.next()];
    const right = [b.next(), b.next(), b.next()];
    expect(left).toEqual(right);
  });

  it('picks values inside the requested range', () => {
    const rng = createRng(7);
    for (let i = 0; i < 20; i += 1) {
      const value = rng.integer(3, 8);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThan(8);
    }
  });
});
