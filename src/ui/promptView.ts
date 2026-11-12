import type { Phrase } from '../types';
import { normalizePinyin } from '../core/pinyin';

export function promptCacheKey(phrase: Phrase, normalizedLetterIndex: number): string {
  return `${phrase.id}\u0000${phrase.pinyin}\u0000${normalizedLetterIndex}`;
}

export function updatePrompt(root: HTMLElement, phrase: Phrase, letterIndex: number): void {
  const normalized = normalizePinyin(phrase.pinyin);
  let normalizedIndex = 0;
  const letters = [...phrase.pinyin].map((char) => {
    const normalizedChar = normalizePinyin(char);
    if (!normalizedChar) return `<span>${char}</span>`;
    const current = normalizedIndex;
    normalizedIndex += 1;
    const state = current < letterIndex ? 'done' : current === letterIndex ? 'current' : '';
    return `<span class="pinyin-letter ${state}">${char}</span>`;
  }).join('');
  root.innerHTML = `<div class="zh">${phrase.zh}</div><div class="pinyin">${letters}</div>`;
  root.dataset.pinyin = phrase.pinyin;
  root.dataset.expected = normalized[letterIndex] ?? '';
}
