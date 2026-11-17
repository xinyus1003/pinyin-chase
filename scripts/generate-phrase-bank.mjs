import fs from 'node:fs';
import { pinyin } from 'pinyin-pro';

const source = fs.readFileSync('src/data/phraseTexts.ts', 'utf8')
  .replace('export const PHRASE_TEXTS =', 'globalThis.PHRASE_TEXTS =')
  .replace(/ as const;\s*$/, ';');
new Function(source)();
const texts = globalThis.PHRASE_TEXTS;
const literary = JSON.parse(fs.readFileSync('src/data/literaryPhrases.json', 'utf8'));
const items = [];
for (const tier of [1, 2, 3, 4, 5]) {
  for (const zh of texts[tier]) {
    items.push({
      id: `${tier}:${zh}`,
      zh,
      pinyin: pinyin(zh, { toneType: 'none', type: 'array', v: true }).join(' '),
      tier,
    });
  }
  for (const entry of literary.filter((item) => item.tier === tier)) {
    items.push({
      id: `${tier}:${entry.zh}`,
      zh: entry.zh,
      pinyin: pinyin(entry.zh, { toneType: 'none', type: 'array', v: true }).join(' '),
      tier,
      title: entry.title,
      author: entry.author,
    });
  }
}
const output = `import type { Phrase } from '../types';\n\nexport const PHRASE_BANK: Phrase[] = ${JSON.stringify(items, null, 2)};\n`;
fs.writeFileSync('src/data/phraseBank.ts', output);
console.log(`generated ${items.length} phrases`);
