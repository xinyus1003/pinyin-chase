import { pinyin } from 'pinyin-pro';
import { PHRASE_TEXTS } from '../data/phraseTexts';
import type { Difficulty, Phrase, RandomSource } from '../types';
import { composeCountFor, phraseCountFor, phraseTierFor } from './difficulty';

function makePhrase(zh: string, tier: 1 | 2 | 3 | 4 | 5): Phrase {
  const pinyinText = pinyin(zh, { toneType: 'none', type: 'array' }).join(' ');
  return { id: `${tier}:${zh}`, zh, pinyin: pinyinText, tier };
}

export const PHRASE_BANK: Phrase[] = (
  [1, 2, 3, 4, 5] as const
).flatMap((tier) => PHRASE_TEXTS[tier].map((zh) => makePhrase(zh, tier)));

function shuffled<T>(items: readonly T[], rng: RandomSource): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rng.integer(0, i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function takeWithReshuffle(pool: readonly Phrase[], count: number, rng: RandomSource): Phrase[] {
  const picked: Phrase[] = [];
  let bag: Phrase[] = [];
  while (picked.length < count) {
    if (bag.length === 0) bag = shuffled(pool, rng);
    const next = bag.shift();
    if (next) picked.push(next);
  }
  return picked;
}

export function selectPhrases(difficulty: Difficulty, level: number, rng: RandomSource): Phrase[] {
  const tier = phraseTierFor(difficulty, level);
  const pool = PHRASE_BANK.filter((phrase) => phrase.tier === tier);
  const phraseCount = phraseCountFor(difficulty, level);
  const composeCount = composeCountFor(level);
  const baseItems = takeWithReshuffle(pool, phraseCount * composeCount, rng);
  const result: Phrase[] = [];
  for (let i = 0; i < phraseCount; i += 1) {
    const group = baseItems.slice(i * composeCount, (i + 1) * composeCount);
    const zh = group.map((phrase) => phrase.zh).join('，');
    result.push(makePhrase(zh, tier));
  }
  return result;
}
