import { describe, expect, it } from 'vitest';
import literaryPhrases from '../../src/data/literaryPhrases.json';
import { normalizePinyin } from '../../src/core/pinyin';
import { PHRASE_BANK } from '../../src/core/phrases';

describe('literary phrase pack', () => {
  it('contains 17 attributed public-domain excerpts across all tiers', () => {
    expect(literaryPhrases).toHaveLength(17);
    expect(new Set(literaryPhrases.map((entry) => entry.zh)).size).toBe(17);
    for (const tier of [1, 2, 3, 4, 5]) {
      expect(literaryPhrases.some((entry) => entry.tier === tier)).toBe(true);
    }
  });

  it('merges every excerpt into the generated phrase bank with attribution', () => {
    for (const excerpt of literaryPhrases) {
      const phrase = PHRASE_BANK.find((item) => item.zh === excerpt.zh);
      expect(phrase).toBeDefined();
      expect(phrase).toMatchObject({
        tier: excerpt.tier,
        title: excerpt.title,
        author: excerpt.author,
      });
    }
  });

  it('keeps each literary excerpt inside the intended pinyin-length band', () => {
    const bands: Record<number, [number, number]> = {
      1: [20, 49],
      2: [56, 78],
      3: [79, 96],
      4: [100, 140],
      5: [140, 190],
    };
    for (const excerpt of literaryPhrases) {
      const phrase = PHRASE_BANK.find((item) => item.zh === excerpt.zh)!;
      const length = normalizePinyin(phrase.pinyin).length;
      const [minimum, maximum] = bands[excerpt.tier]!;
      expect(length).toBeGreaterThanOrEqual(minimum);
      expect(length).toBeLessThanOrEqual(maximum);
    }
  });

  it('preserves pinyin for the hardest literary words', () => {
    const allPinyin = PHRASE_BANK
      .filter((phrase) => phrase.author)
      .map((phrase) => phrase.pinyin)
      .join(' ');
    expect(allPinyin).toContain('pan shan');
    expect(allPinyin).toContain('mi wang');
    expect(allPinyin).toContain('wu jiu');
    expect(allPinyin).toContain('hong liao');
    expect(allPinyin).toContain('bai ping');
  });
});
