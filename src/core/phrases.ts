import { PHRASE_BANK } from '../data/phraseBank';
import type { Difficulty, Phrase, RandomSource } from '../types';
import { phraseCountFor, phraseTierFor } from './difficulty';

export { PHRASE_BANK };

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
  return takeWithReshuffle(pool, phraseCountFor(difficulty, level), rng);
}
