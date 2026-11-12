import { describe, expect, it } from 'vitest';
import { normalizePinyin } from '../../src/core/pinyin';
import { PHRASE_BANK, selectPhrases } from '../../src/core/phrases';
import { createRng } from '../../src/core/random';

describe('normalizePinyin', () => {
  it('normalizes case, spaces, tones and ü variants', () => {
    expect(normalizePinyin(' Nǐ hǎo, lǜ sè! 123 ')).toBe('nihaolvse');
    expect(normalizePinyin('nu:')).toBe('nv');
    expect(normalizePinyin('LV')).toBe('lv');
  });

  it('ignores punctuation and control characters', () => {
    expect(normalizePinyin('ni-hao_世界')).toBe('nihao');
  });
});

describe('phrase bank', () => {
  it('contains 120 unique items across five tiers', () => {
    expect(PHRASE_BANK).toHaveLength(120);
    expect(new Set(PHRASE_BANK.map((phrase) => phrase.zh)).size).toBe(120);
    for (const tier of [1, 2, 3, 4, 5] as const) {
      expect(PHRASE_BANK.filter((phrase) => phrase.tier === tier)).toHaveLength(24);
    }
  });

  it('provides normalized pinyin for full-sentence prompts', () => {
    for (const phrase of PHRASE_BANK) {
      expect(normalizePinyin(phrase.pinyin).length).toBeGreaterThan(0);
      expect(phrase.zh.length).toBeGreaterThanOrEqual(10);
      expect(phrase.zh).toMatch(/[，。！？；]/);
    }
  });

  it('gets longer on average in each tier', () => {
    const average = (tier: 1 | 2 | 3 | 4 | 5) => {
      const items = PHRASE_BANK.filter((phrase) => phrase.tier === tier);
      return items.reduce((sum, phrase) => sum + phrase.zh.length, 0) / items.length;
    };
    expect(average(1)).toBeLessThan(average(2));
    expect(average(2)).toBeLessThan(average(3));
    expect(average(3)).toBeLessThan(average(4));
    expect(average(4)).toBeLessThan(average(5));
  });
});

describe('selectPhrases', () => {
  it('is deterministic for the same seed and respects counts', () => {
    const first = selectPhrases('hard', 1, createRng(123));
    const second = selectPhrases('hard', 1, createRng(123));
    expect(first.map((phrase) => phrase.zh)).toEqual(second.map((phrase) => phrase.zh));
    expect(first).toHaveLength(5);
    expect(first.every((phrase) => phrase.tier === 4)).toBe(true);
  });

  it('selects longer sentences at higher levels', () => {
    const early = selectPhrases('easy', 1, createRng(5));
    const late = selectPhrases('easy', 13, createRng(5));
    const earlyAverage = early.reduce((sum, p) => sum + normalizePinyin(p.pinyin).length, 0) / early.length;
    const lateAverage = late.reduce((sum, p) => sum + normalizePinyin(p.pinyin).length, 0) / late.length;
    expect(lateAverage).toBeGreaterThan(earlyAverage);
  });
});

describe('hint uses v for ü', () => {
  it('uses lv and never lü in sentence hints containing 绿', () => {
    const greenSentence = PHRASE_BANK.find((phrase) => phrase.zh.includes('绿'));
    expect(greenSentence).toBeDefined();
    expect(greenSentence!.pinyin).toContain('lv');
    expect(greenSentence!.pinyin).not.toContain('lü');
  });
});
