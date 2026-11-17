import { describe, expect, it } from 'vitest';
import { formatPhraseAttribution, promptCacheKey } from '../../src/ui/promptView';
import type { Phrase } from '../../src/types';

const phrase: Phrase = { id: '1:你好', zh: '你好', pinyin: 'ni hao', tier: 1 };

describe('prompt cache key', () => {
  it('stays stable for the same phrase and normalized letter index', () => {
    expect(promptCacheKey(phrase, 2)).toBe(promptCacheKey(phrase, 2));
  });

  it('changes when the phrase or normalized letter index changes', () => {
    expect(promptCacheKey(phrase, 2)).not.toBe(promptCacheKey(phrase, 3));
    expect(promptCacheKey(phrase, 2)).not.toBe(
      promptCacheKey({ ...phrase, id: '2:你好', zh: '你好呀', pinyin: 'ni hao ya' }, 2),
    );
  });
});

describe('phrase attribution', () => {
  it('formats literary title and author without changing ordinary prompts', () => {
    expect(formatPhraseAttribution({ ...phrase, title: '匆匆', author: '朱自清' }))
      .toBe('《匆匆》 · 朱自清');
    expect(formatPhraseAttribution(phrase)).toBeNull();
  });
});
