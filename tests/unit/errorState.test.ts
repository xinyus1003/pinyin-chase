import { describe, expect, it } from 'vitest';
import { isPromptError, wrongIndicator } from '../../src/ui/errorState';

describe('wrongIndicator', () => {
  it('is hidden and unlabeled before any wrong input', () => {
    expect(wrongIndicator(0)).toEqual({ visible: false, label: '' });
  });

  it('becomes visible with the error count after wrong input', () => {
    const indicator = wrongIndicator(1);
    expect(indicator.visible).toBe(true);
    expect(indicator.label).toContain('错误');
    expect(wrongIndicator(3).label).toBe('错误 3');
  });
});

describe('isPromptError', () => {
  it('flashes only while the stun window is active', () => {
    expect(isPromptError(0)).toBe(false);
    expect(isPromptError(0.25)).toBe(true);
  });
});
