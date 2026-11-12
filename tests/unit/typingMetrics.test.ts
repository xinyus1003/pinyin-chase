import { describe, expect, it } from 'vitest';
import { accuracyPercent, TypingMetrics } from '../../src/core/typingMetrics';

describe('TypingMetrics', () => {
  it('computes rolling CPM from correct letters', () => {
    const metrics = new TypingMetrics();
    for (let i = 0; i < 10; i += 1) {
      metrics.recordCorrect(i * 500);
    }

    expect(metrics.snapshot(5000).cpm).toBe(120);
    expect(metrics.snapshot(11000).cpm).toBe(0);
  });

  it('tracks accuracy from correct and wrong attempts', () => {
    const metrics = new TypingMetrics();
    metrics.recordCorrect(0);
    metrics.recordCorrect(500);
    metrics.recordWrong(1000);

    expect(accuracyPercent(2, 3)).toBeCloseTo(66.7);
    expect(metrics.snapshot(1000).accuracy).toBeCloseTo(66.7);
  });

  it('does not count pause time toward CPM eligibility', () => {
    const metrics = new TypingMetrics();
    metrics.recordCorrect(0);
    metrics.recordCorrect(500);
    metrics.pause(1000);
    metrics.resume(6000);
    metrics.recordCorrect(6500);

    expect(metrics.activeElapsedMs(6500)).toBe(1500);
    expect(metrics.canRecordBest(6500)).toBe(false);
    metrics.recordCorrect(7000);
    expect(metrics.activeElapsedMs(7000)).toBe(2000);
    expect(metrics.canRecordBest(7000)).toBe(true);
  });

  it('resets all run metrics', () => {
    const metrics = new TypingMetrics();
    metrics.recordCorrect(0);
    metrics.recordWrong(100);
    metrics.reset();
    expect(metrics.snapshot(5000)).toMatchObject({ cpm: 0, accuracy: 100, totalAttempts: 0 });
  });
});
