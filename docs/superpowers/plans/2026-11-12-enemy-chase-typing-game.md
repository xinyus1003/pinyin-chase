# 拼音追逃 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款手机浏览器可直接游玩的拼音打字追逐游戏，支持原生键盘、逐字母移动、无尽关卡、三档难度、弯曲迷宫、动画音效和本地最高进度。

**Architecture:** 使用 Vite、TypeScript 和 Canvas 2D 构建纯静态单页应用。纯逻辑模块处理拼音、难度、迷宫和游戏状态，DOM 层管理原生输入框与界面，Canvas 层只读取状态快照进行绘制。

**Tech Stack:** Vite, TypeScript, Canvas 2D, Web Audio, Vitest, Playwright, pinyin-pro.

**Spec:** `docs/superpowers/specs/2026-11-12-enemy-chase-typing-game-design.md`

## Global Constraints

- 目标平台：手机浏览器，竖屏优先，兼容横屏；支持 iOS Safari 与 Android Chrome。
- 不登录、不排行榜、不内购、不剧情、不后端、不运行时网络请求。
- 不使用自制键盘；必须聚焦真实 `<input>` 唤起用户原生键盘。
- 逐字母判定：正确前进一个字母步；错误不移动游标，触发停顿、敌人扑近、泛红、音效和可用时的震动。
- 简单 / 普通 / 困难三档同时影响敌人速度、题目长度与生僻程度、迷宫弯道数量。
- 关卡无终点：通过终点门后进入下一关，难度持续上升。
- 题目显示中文和无声调拼音，`ü` 在提示中使用 `v`。
- 至少 120 条本地题库，分为 5 个难度层级。
- 本机存储键统一使用 `pinyin-chase:*` 前缀。
- 任何输入法、存储、音频、震动或迷宫生成异常都不得阻塞核心游戏。
- 中端手机目标接近 60 FPS；高 DPR 渲染倍率最高限制为 `2`。
- 每个任务完成后运行对应测试；提交失败时记录原因并继续，不覆盖用户文件。

---

## File Structure

```text
index.html
package.json
playwright.config.ts
tsconfig.json
vite.config.ts
src/
  main.ts
  app.ts
  styles.css
  types.ts
  core/
    difficulty.ts
    game.ts
    level.ts
    loop.ts
    maze.ts
    phrases.ts
    pinyin.ts
    random.ts
    storage.ts
  data/
    phraseTexts.ts
  input/
    keyboardInput.ts
  render/
    camera.ts
    canvasRenderer.ts
    characters.ts
  audio/
    feedback.ts
tests/
  unit/
    difficulty.test.ts
    game.test.ts
    keyboardInput.test.ts
    level.test.ts
    maze.test.ts
    phrases.test.ts
    storage.test.ts
  e2e/
    game.spec.ts
```

职责边界：
- `core/*` 不依赖 DOM、Canvas 或浏览器 API。
- `input/keyboardInput.ts` 只负责将原生输入事件转换为字母流。
- `render/*` 不改变游戏判定状态。
- `audio/feedback.ts` 对不支持的浏览器静默降级。
- `app.ts` 只做编排，不包含拼音和难度算法。

---

### Task 1: 搭建静态应用与测试工具

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `.gitignore`
- Test: `npm run build`

**Interfaces:**
- Consumes: 无。
- Produces: `npm run dev`、`npm run build`、`npm test`、`npm run test:e2e`。

- [ ] **Step 1: 创建 Vite 和 TypeScript 基础文件**

`package.json`:

```json
{
  "name": "pinyin-chase",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#071426" />
    <title>拼音追逃</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:

```ts
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app');
app.textContent = '拼音追逃';
```

`src/styles.css`:

```css
:root {
  color-scheme: dark;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #071426;
  color: #fff6d8;
}

* { box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; margin: 0; }
body { overflow: hidden; touch-action: manipulation; }
```

`.gitignore`:

```gitignore
node_modules/
dist/
test-results/
playwright-report/
.DS_Store
```

- [ ] **Step 2: 安装依赖**

Run:

```bash
npm install pinyin-pro
npm install -D vite typescript vitest @playwright/test
```

Expected: `package.json` 和 `package-lock.json` 生成，命令退出码为 0。

- [ ] **Step 3: 验证生产构建**

Run:

```bash
npm run build
```

Expected: TypeScript 检查通过，Vite 输出 `dist/`。

- [ ] **Step 4: 提交脚手架**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/styles.css .gitignore
git commit -m "chore: scaffold pinyin chase game"
```

---

### Task 2: 难度曲线与确定性随机数

**Files:**
- Create: `src/types.ts`
- Create: `src/core/difficulty.ts`
- Create: `src/core/random.ts`
- Test: `tests/unit/difficulty.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces:
  - `Difficulty = 'easy' | 'normal' | 'hard'`
  - `DIFFICULTIES: Record<Difficulty, DifficultyConfig>`
  - `enemySpeedFor(difficulty, level): number`
  - `phraseCountFor(difficulty, level): number`
  - `phraseTierFor(difficulty, level): 1 | 2 | 3 | 4 | 5`
  - `bendCountFor(difficulty, level): number`
  - `composeCountFor(level): number`
  - `createRng(seed): RandomSource`

- [ ] **Step 1: 写失败测试**

`tests/unit/difficulty.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  bendCountFor,
  composeCountFor,
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
  });

  it('increases sentence count and caps phrase tier at five', () => {
    expect(phraseCountFor('easy', 1)).toBe(3);
    expect(phraseCountFor('hard', 1)).toBe(5);
    expect(phraseTierFor('easy', 1)).toBe(1);
    expect(phraseTierFor('easy', 17)).toBe(5);
    expect(phraseTierFor('hard', 99)).toBe(5);
  });

  it('increases bends for twelve levels with no further geometry growth', () => {
    expect(bendCountFor('easy', 1)).toBe(5);
    expect(bendCountFor('easy', 13)).toBe(17);
    expect(bendCountFor('easy', 30)).toBe(17);
  });

  it('combines base phrases into longer sentences over time', () => {
    expect(composeCountFor(1)).toBe(1);
    expect(composeCountFor(7)).toBe(2);
    expect(composeCountFor(13)).toBe(3);
    expect(composeCountFor(99)).toBe(3);
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/unit/difficulty.test.ts
```

Expected: FAIL，提示无法解析 `difficulty.ts` 或 `random.ts`。

- [ ] **Step 3: 实现类型、难度和随机数**

`src/types.ts`:

```ts
export type Difficulty = 'easy' | 'normal' | 'hard';

export type DifficultyConfig = {
  label: string;
  enemySpeed: number;
  speedPerLevel: number;
  initialGap: number;
  startTier: 1 | 2 | 3;
  phraseOffset: number;
  baseBends: number;
};

export interface RandomSource {
  next(): number;
  integer(minInclusive: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

export interface Phrase {
  id: string;
  zh: string;
  pinyin: string;
  tier: 1 | 2 | 3 | 4 | 5;
}

export interface PathSample {
  x: number;
  y: number;
  angle: number;
  distance: number;
}

export interface Maze {
  samples: PathSample[];
  length: number;
  heroStartDistance: number;
  corridorWidth: number;
  seed: number;
}

export interface LevelSpec {
  number: number;
  difficulty: Difficulty;
  phrases: Phrase[];
  letters: string;
  maze: Maze;
  enemySpeed: number;
  initialGap: number;
}

export type GamePhase = 'menu' | 'playing' | 'paused' | 'levelClear' | 'gameOver';

export interface GameSnapshot {
  phase: GamePhase;
  level: LevelSpec;
  phraseIndex: number;
  letterIndex: number;
  heroLetters: number;
  totalLetters: number;
  gap: number;
  stunRemaining: number;
  catchElapsed: number;
  runLetters: number;
}

export type LetterOutcome =
  | { kind: 'correct'; expected: string }
  | { kind: 'wrong'; expected: string }
  | { kind: 'ignored' };
```

`src/core/difficulty.ts`:

```ts
import type { Difficulty, DifficultyConfig } from '../types';

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: '简单',
    enemySpeed: 1.4,
    speedPerLevel: 0.08,
    initialGap: 14,
    startTier: 1,
    phraseOffset: 0,
    baseBends: 5,
  },
  normal: {
    label: '普通',
    enemySpeed: 2.2,
    speedPerLevel: 0.12,
    initialGap: 11,
    startTier: 2,
    phraseOffset: 1,
    baseBends: 7,
  },
  hard: {
    label: '困难',
    enemySpeed: 3,
    speedPerLevel: 0.16,
    initialGap: 8,
    startTier: 3,
    phraseOffset: 2,
    baseBends: 9,
  },
};

export function enemySpeedFor(difficulty: Difficulty, level: number): number {
  const config = DIFFICULTIES[difficulty];
  return config.enemySpeed + Math.max(0, level - 1) * config.speedPerLevel;
}

export function phraseCountFor(difficulty: Difficulty, level: number): number {
  const config = DIFFICULTIES[difficulty];
  return 3 + config.phraseOffset + Math.floor(Math.max(0, level - 1) / 2);
}

export function phraseTierFor(difficulty: Difficulty, level: number): 1 | 2 | 3 | 4 | 5 {
  const config = DIFFICULTIES[difficulty];
  const tier = config.startTier + Math.floor(Math.max(0, level - 1) / 4);
  return Math.min(5, tier) as 1 | 2 | 3 | 4 | 5;
}

export function bendCountFor(difficulty: Difficulty, level: number): number {
  return DIFFICULTIES[difficulty].baseBends + Math.min(Math.max(0, level - 1), 12);
}

export function composeCountFor(level: number): number {
  return 1 + Math.min(2, Math.floor(Math.max(0, level - 1) / 6));
}
```

`src/core/random.ts`:

```ts
import type { RandomSource } from '../types';

export function createRng(seed: number): RandomSource {
  let state = seed >>> 0;
  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    integer(minInclusive, maxExclusive) {
      return Math.floor(next() * (maxExclusive - minInclusive)) + minInclusive;
    },
    pick(items) {
      if (items.length === 0) throw new Error('Cannot pick from an empty array');
      return items[Math.floor(next() * items.length)]!;
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
npm test -- tests/unit/difficulty.test.ts
```

Expected: PASS，全部测试通过。

- [ ] **Step 5: 提交**

```bash
git add src/types.ts src/core/difficulty.ts src/core/random.ts tests/unit/difficulty.test.ts
git commit -m "feat: add difficulty curve and deterministic random source"
```

---

### Task 3: 拼音归一化、题库与逐字母游标

**Files:**
- Create: `src/core/pinyin.ts`
- Create: `src/data/phraseTexts.ts`
- Create: `src/core/phrases.ts`
- Test: `tests/unit/phrases.test.ts`

**Interfaces:**
- Consumes: `Phrase`, `Difficulty`, `RandomSource`, `phraseCountFor`, `phraseTierFor`, `composeCountFor`。
- Produces:
  - `normalizePinyin(text: string): string`
  - `PHRASE_BANK: Phrase[]`
  - `selectPhrases(difficulty: Difficulty, level: number, rng: RandomSource): Phrase[]`

- [ ] **Step 1: 写失败测试**

`tests/unit/phrases.test.ts`:

```ts
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

  it('provides normalized pinyin for every phrase', () => {
    for (const phrase of PHRASE_BANK) {
      expect(normalizePinyin(phrase.pinyin).length).toBeGreaterThan(0);
      expect(phrase.zh.length).toBeGreaterThan(0);
    }
  });
});

describe('selectPhrases', () => {
  it('is deterministic for the same seed and respects counts', () => {
    const first = selectPhrases('hard', 1, createRng(123));
    const second = selectPhrases('hard', 1, createRng(123));
    expect(first.map((phrase) => phrase.zh)).toEqual(second.map((phrase) => phrase.zh));
    expect(first).toHaveLength(5);
    expect(first.every((phrase) => phrase.tier === 3)).toBe(true);
  });

  it('composes longer phrases at higher levels', () => {
    const early = selectPhrases('easy', 1, createRng(5));
    const late = selectPhrases('easy', 13, createRng(5));
    const earlyAverage = early.reduce((sum, p) => sum + normalizePinyin(p.pinyin).length, 0) / early.length;
    const lateAverage = late.reduce((sum, p) => sum + normalizePinyin(p.pinyin).length, 0) / late.length;
    expect(lateAverage).toBeGreaterThan(earlyAverage);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/unit/phrases.test.ts
```

Expected: FAIL，提示缺少 `pinyin.ts` 或 `phrases.ts`。

- [ ] **Step 3: 实现拼音归一化**

`src/core/pinyin.ts`:

```ts
export function normalizePinyin(text: string): string {
  return text
    .toLowerCase()
    .replace(/u:|ü/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}
```

- [ ] **Step 4: 创建 120 条分级题库**

`src/data/phraseTexts.ts`:

```ts
export const PHRASE_TEXTS = {
  1: [
    '你好', '谢谢', '早上好', '再见', '朋友', '学校', '加油', '小猫',
    '太阳', '月亮', '苹果', '天气', '回家', '开心', '跑快', '红灯',
    '绿灯', '小心', '出发', '勇敢', '终点', '安全', '继续', '胜利',
  ],
  2: [
    '今天真热', '一起加油', '不要回头', '快点逃跑', '前方有门', '小心脚下',
    '穿过迷宫', '保持冷静', '听见脚步', '呼吸急促', '勇敢向前', '敌人来了',
    '跑到终点', '天色已晚', '穿过长廊', '抓住机会', '继续前进', '不要放弃',
    '安全第一', '紧跟路线', '左弯右绕', '速度很快', '心跳加速', '冲出重围',
  ],
  3: [
    '迷雾笼罩', '危机四伏', '屏住呼吸', '仓皇奔逃', '紧追不舍', '惊心动魄',
    '曲折回环', '步步紧逼', '千钧一发', '奋力冲刺', '险象环生', '东躲西藏',
    '气喘吁吁', '刻不容缓', '争分夺秒', '生死时速', '绝处逢生', '黑暗深处',
    '灯光闪烁', '脚步回响', '道路狭窄', '眼前一黑', '后有追兵', '万无一失',
  ],
  4: [
    '翘首以盼', '踌躇满志', '蹑手蹑脚', '面面相觑', '惴惴不安', '仓促应战',
    '迂回曲折', '纵横交错', '蜿蜒盘旋', '猝不及防', '东倒西歪', '气喘如牛',
    '狼狈不堪', '惊慌失措', '镇定自若', '铤而走险', '势如破竹', '固若金汤',
    '一触即发', '转瞬即逝', '瞬息万变', '险峻崎岖', '黑影幢幢', '逃之夭夭',
  ],
  5: [
    '龇牙咧嘴', '魑魅魍魉', '踉踉跄跄', '踽踽独行', '茕茕孑立', '岌岌可危',
    '觥筹交错', '饕餮盛宴', '蹒跚前行', '缥缈无踪', '逶迤蜿蜒', '旖旎风光',
    '氤氲缭绕', '蓊蓊郁郁', '斑驳陆离', '鳞次栉比', '熙熙攘攘', '咄咄逼人',
    '鬼鬼祟祟', '噤若寒蝉', '鹬蚌相争', '睚眦必报', '罄竹难书', '孑然一身',
  ],
} as const;
```

- [ ] **Step 5: 生成题库并实现选题**

`src/core/phrases.ts`:

```ts
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
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
npm test -- tests/unit/phrases.test.ts
```

Expected: PASS。若 `pinyin-pro` 对某个多音字给出非预期读音，调整该条题库文本，不放宽测试。

- [ ] **Step 7: 提交**

```bash
git add src/core/pinyin.ts src/core/phrases.ts src/data/phraseTexts.ts tests/unit/phrases.test.ts package.json package-lock.json
git commit -m "feat: add pinyin normalization and graded phrase bank"
```

---

### Task 4: 弯曲迷宫与关卡工厂

**Files:**
- Create: `src/core/maze.ts`
- Create: `src/core/level.ts`
- Test: `tests/unit/maze.test.ts`
- Test: `tests/unit/level.test.ts`

**Interfaces:**
- Consumes: `createRng`, `bendCountFor`, `enemySpeedFor`, `selectPhrases`, `normalizePinyin`。
- Produces:
  - `LETTER_WORLD_STEP = 28`
  - `generateMaze(options): Maze`
  - `sampleMaze(maze, distance): PathSample`
  - `createLevel(difficulty, level, seed): LevelSpec`

- [ ] **Step 1: 写失败测试**

`tests/unit/maze.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateMaze, LETTER_WORLD_STEP, sampleMaze } from '../../src/core/maze';

describe('generateMaze', () => {
  it('creates a deterministic path with the expected distance', () => {
    const options = { seed: 42, letters: 30, initialGap: 8, bends: 6 };
    const first = generateMaze(options);
    const second = generateMaze(options);
    expect(first.length).toBeCloseTo((30 + 8) * LETTER_WORLD_STEP, 4);
    expect(first.heroStartDistance).toBeCloseTo(8 * LETTER_WORLD_STEP, 4);
    expect(first.samples[0]?.x).toBeCloseTo(0);
    expect(first.samples.at(-1)?.x).toBeGreaterThan(0);
    expect(first.samples.map((point) => point.y)).toEqual(second.samples.map((point) => point.y));
  });

  it('samples continuous positions and clamps at both ends', () => {
    const maze = generateMaze({ seed: 9, letters: 20, initialGap: 6, bends: 5 });
    expect(sampleMaze(maze, -100).distance).toBe(0);
    expect(sampleMaze(maze, maze.length + 100).distance).toBeCloseTo(maze.length);
    const middle = sampleMaze(maze, maze.length / 2);
    expect(middle.distance).toBeCloseTo(maze.length / 2, 0);
    expect(Number.isFinite(middle.x)).toBe(true);
    expect(Number.isFinite(middle.y)).toBe(true);
  });
});
```

`tests/unit/level.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createLevel } from '../../src/core/level';
import { normalizePinyin } from '../../src/core/pinyin';

describe('createLevel', () => {
  it('combines phrases, maze and difficulty settings', () => {
    const level = createLevel('normal', 3, 1234);
    const letters = normalizePinyin(level.phrases.map((phrase) => phrase.pinyin).join(''));
    expect(level.difficulty).toBe('normal');
    expect(level.number).toBe(3);
    expect(level.letters).toBe(letters);
    expect(level.phrases.length).toBeGreaterThan(0);
    expect(level.maze.length).toBeCloseTo((letters.length + level.initialGap) * 28, 4);
    expect(level.enemySpeed).toBeGreaterThan(2.2);
  });

  it('replays the same level for the same seed', () => {
    const first = createLevel('hard', 7, 999);
    const second = createLevel('hard', 7, 999);
    expect(first.phrases.map((phrase) => phrase.zh)).toEqual(second.phrases.map((phrase) => phrase.zh));
    expect(first.maze.samples).toEqual(second.maze.samples);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/unit/maze.test.ts tests/unit/level.test.ts
```

Expected: FAIL，缺少 `maze.ts` 和 `level.ts`。

- [ ] **Step 3: 实现迷宫生成与采样**

`src/core/maze.ts`:

```ts
import type { Maze, PathSample } from '../types';

export const LETTER_WORLD_STEP = 28;
const SAMPLE_STEP = 2;

export type MazeOptions = {
  seed: number;
  letters: number;
  initialGap: number;
  bends: number;
};

export function generateMaze({ seed, letters, initialGap, bends }: MazeOptions): Maze {
  const targetLength = (letters + initialGap) * LETTER_WORLD_STEP;
  const phase = ((seed % 360) / 180) * Math.PI;
  const amplitude = Math.min(150, Math.max(46, targetLength / (bends * 3.4)));
  const raw: PathSample[] = [];
  let previousX = 0;
  let previousY = amplitude * Math.sin(phase);

  for (let x = 0; x <= targetLength; x += SAMPLE_STEP) {
    const y = amplitude * Math.sin((x / targetLength) * bends * Math.PI * 2 + phase);
    const distance = raw.length === 0
      ? 0
      : raw[raw.length - 1]!.distance + Math.hypot(x - previousX, y - previousY);
    const angle = Math.atan2(y - previousY, x - previousX);
    raw.push({ x, y, angle, distance });
    previousX = x;
    previousY = y;
  }

  const rawLength = raw.at(-1)!.distance;
  const scale = targetLength / rawLength;
  const samples = raw.map((point) => ({
    x: point.x * scale,
    y: point.y * scale,
    angle: point.angle,
    distance: point.distance * scale,
  }));

  return {
    samples,
    length: samples.at(-1)!.distance,
    heroStartDistance: initialGap * LETTER_WORLD_STEP,
    corridorWidth: 86,
    seed,
  };
}

export function sampleMaze(maze: Maze, distance: number): PathSample {
  const clamped = Math.max(0, Math.min(maze.length, distance));
  const samples = maze.samples;
  let low = 0;
  let high = samples.length - 1;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (samples[mid]!.distance <= clamped) low = mid;
    else high = mid;
  }
  const a = samples[low]!;
  const b = samples[high]!;
  const span = b.distance - a.distance;
  const t = span === 0 ? 0 : (clamped - a.distance) / span;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: a.angle + (b.angle - a.angle) * t,
    distance: clamped,
  };
}
```

- [ ] **Step 4: 实现关卡工厂**

`src/core/level.ts`:

```ts
import type { Difficulty, LevelSpec } from '../types';
import { bendCountFor, enemySpeedFor, DIFFICULTIES } from './difficulty';
import { generateMaze } from './maze';
import { normalizePinyin } from './pinyin';
import { selectPhrases } from './phrases';
import { createRng } from './random';

export function createLevel(difficulty: Difficulty, level: number, seed: number): LevelSpec {
  const rng = createRng(seed);
  const phrases = selectPhrases(difficulty, level, rng);
  const letters = normalizePinyin(phrases.map((phrase) => phrase.pinyin).join(''));
  const initialGap = DIFFICULTIES[difficulty].initialGap;
  const maze = generateMaze({
    seed,
    letters: letters.length,
    initialGap,
    bends: bendCountFor(difficulty, level),
  });
  return {
    number: level,
    difficulty,
    phrases,
    letters,
    maze,
    enemySpeed: enemySpeedFor(difficulty, level),
    initialGap,
  };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
npm test -- tests/unit/maze.test.ts tests/unit/level.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/core/maze.ts src/core/level.ts tests/unit/maze.test.ts tests/unit/level.test.ts
git commit -m "feat: generate winding mazes and endless levels"
```

---

### Task 5: 游戏状态机与追逐判定

**Files:**
- Create: `src/core/game.ts`
- Test: `tests/unit/game.test.ts`

**Interfaces:**
- Consumes: `LevelSpec`, `GameSnapshot`, `LetterOutcome`。
- Produces:
  - `WRONG_LUNGE = 1.25`
  - `STUN_SECONDS = 0.25`
  - `CATCH_SECONDS = 0.5`
  - `MAX_EXTRA_GAP = 6`
  - `GameSession`
  - `GameSession.typeLetter(letter: string): LetterOutcome`
  - `GameSession.tick(dt: number): 'caught' | null`
  - `GameSession.pause(): void`
  - `GameSession.resume(): void`
  - `GameSession.restartLevel(): void`
  - `GameSession.getSnapshot(): Readonly<GameSnapshot>`

- [ ] **Step 1: 写失败测试**

`tests/unit/game.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GameSession, WRONG_LUNGE } from '../../src/core/game';
import { normalizePinyin } from '../../src/core/pinyin';
import type { LevelSpec, Phrase } from '../../src/types';

function phrase(zh: string, pinyin: string): Phrase {
  return { id: zh, zh, pinyin, tier: 1 };
}

function level(phrases: Phrase[], initialGap = 6, enemySpeed = 0.1): LevelSpec {
  const letters = normalizePinyin(phrases.map((item) => item.pinyin).join(''));
  return {
    number: 1,
    difficulty: 'easy',
    phrases,
    letters,
    maze: {
      samples: [
        { x: 0, y: 0, angle: 0, distance: 0 },
        { x: 1000, y: 0, angle: 0, distance: 1000 },
      ],
      length: 1000,
      heroStartDistance: initialGap * 28,
      corridorWidth: 86,
      seed: 1,
    },
    enemySpeed,
    initialGap,
  };
}

describe('GameSession', () => {
  it('advances one letter on correct input and clears the level', () => {
    const session = new GameSession(level([phrase('你好', 'ni hao')]));
    expect(session.typeLetter('n').kind).toBe('correct');
    expect(session.getSnapshot().phraseIndex).toBe(0);
    expect(session.getSnapshot().letterIndex).toBe(1);
    for (const letter of ['i', 'h', 'a', 'o']) expect(session.typeLetter(letter).kind).toBe('correct');
    expect(session.getSnapshot().phase).toBe('levelClear');
    expect(session.getSnapshot().heroLetters).toBe(5);
  });

  it('does not move the cursor on a wrong letter and stuns the hero', () => {
    const session = new GameSession(level([phrase('你好', 'ni hao')]));
    const before = session.getSnapshot();
    const outcome = session.typeLetter('x');
    const after = session.getSnapshot();
    expect(outcome.kind).toBe('wrong');
    expect(after.letterIndex).toBe(before.letterIndex);
    expect(after.heroLetters).toBe(before.heroLetters);
    expect(after.gap).toBeCloseTo(before.gap - WRONG_LUNGE);
    expect(after.stunRemaining).toBeGreaterThan(0);
  });

  it('ignores correct input during the post-error stun', () => {
    const session = new GameSession(level([phrase('你好', 'ni hao')]));
    session.typeLetter('x');
    expect(session.typeLetter('n').kind).toBe('ignored');
    expect(session.getSnapshot().letterIndex).toBe(0);
  });

  it('decreases the gap over time and ends the game after a sustained catch', () => {
    const session = new GameSession(level([phrase('你好', 'ni hao')], 0, 1));
    for (let i = 0; i < 4; i += 1) expect(session.tick(0.1)).toBeNull();
    expect(session.tick(0.1)).toBe('caught');
    expect(session.getSnapshot().phase).toBe('gameOver');
  });

  it('increases the gap when typing correctly but keeps the enemy visible', () => {
    const session = new GameSession(level([phrase('你好', 'ni hao')], 3, 0));
    session.tick(0.2);
    const before = session.getSnapshot().gap;
    session.typeLetter('n');
    expect(session.getSnapshot().gap).toBeGreaterThan(before);
    expect(session.getSnapshot().gap).toBeLessThanOrEqual(3 + 6);
  });

  it('supports pause and resume', () => {
    const session = new GameSession(level([phrase('你好', 'ni hao')]));
    session.pause();
    expect(session.getSnapshot().phase).toBe('paused');
    session.resume();
    expect(session.getSnapshot().phase).toBe('playing');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/unit/game.test.ts
```

Expected: FAIL，缺少 `GameSession`。

- [ ] **Step 3: 实现游戏状态机**

`src/core/game.ts`:

```ts
import { normalizePinyin } from './pinyin';
import type { GameSnapshot, LetterOutcome, LevelSpec } from '../types';

export const WRONG_LUNGE = 1.25;
export const STUN_SECONDS = 0.25;
export const CATCH_SECONDS = 0.5;
export const MAX_EXTRA_GAP = 6;

export class GameSession {
  private readonly level: LevelSpec;
  private phraseIndex = 0;
  private letterIndex = 0;
  private heroLetters = 0;
  private gap: number;
  private stunRemaining = 0;
  private catchElapsed = 0;
  private runLetters = 0;
  private phase: GameSnapshot['phase'] = 'playing';
  private previousPhase: GameSnapshot['phase'] = 'playing';

  constructor(level: LevelSpec) {
    this.level = level;
    this.gap = level.initialGap;
  }

  getSnapshot(): Readonly<GameSnapshot> {
    return {
      phase: this.phase,
      level: this.level,
      phraseIndex: this.phraseIndex,
      letterIndex: this.letterIndex,
      heroLetters: this.heroLetters,
      totalLetters: this.level.letters.length,
      gap: this.gap,
      stunRemaining: this.stunRemaining,
      catchElapsed: this.catchElapsed,
      runLetters: this.runLetters,
    };
  }

  typeLetter(letter: string): LetterOutcome {
    if (this.phase !== 'playing' || this.stunRemaining > 0) return { kind: 'ignored' };
    const normalized = normalizePinyin(letter);
    if (!normalized) return { kind: 'ignored' };
    const expected = this.level.letters[this.letterIndex];
    if (!expected) return { kind: 'ignored' };
    if (normalized[0] !== expected) {
      this.gap = Math.max(-2, this.gap - WRONG_LUNGE);
      this.stunRemaining = STUN_SECONDS;
      this.catchElapsed = 0;
      return { kind: 'wrong', expected };
    }

    this.letterIndex += 1;
    this.heroLetters += 1;
    this.runLetters += 1;
    this.gap = Math.min(this.level.initialGap + MAX_EXTRA_GAP, this.gap + 1);
    this.catchElapsed = 0;

    if (this.letterIndex >= normalizePinyin(this.level.phrases[this.phraseIndex]?.pinyin ?? '').length) {
      this.phraseIndex += 1;
      this.letterIndex = 0;
    }

    if (this.heroLetters >= this.level.letters.length) this.phase = 'levelClear';
    return { kind: 'correct', expected };
  }

  tick(dt: number): 'caught' | null {
    if (this.phase !== 'playing') return null;
    const step = Math.max(0, Math.min(dt, 0.1));
    this.stunRemaining = Math.max(0, this.stunRemaining - step);
    this.gap -= this.level.enemySpeed * step;
    if (this.gap <= 0) this.catchElapsed += step;
    else this.catchElapsed = 0;
    if (this.catchElapsed >= CATCH_SECONDS) {
      this.phase = 'gameOver';
      return 'caught';
    }
    return null;
  }

  pause(): void {
    if (this.phase !== 'playing') return;
    this.previousPhase = this.phase;
    this.phase = 'paused';
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = this.previousPhase === 'paused' ? 'playing' : this.previousPhase;
  }

  restartLevel(): void {
    this.phraseIndex = 0;
    this.letterIndex = 0;
    this.heroLetters = 0;
    this.gap = this.level.initialGap;
    this.stunRemaining = 0;
    this.catchElapsed = 0;
    this.phase = 'playing';
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
npm test -- tests/unit/game.test.ts
```

Expected: PASS。若测试时钟导致边界不稳定，只调整测试输入的 `dt`，不得放宽 `CATCH_SECONDS` 行为。

- [ ] **Step 5: 提交**

```bash
git add src/core/game.ts tests/unit/game.test.ts
git commit -m "feat: add chase gameplay state machine"
```

---

### Task 6: 原生键盘输入适配器

**Files:**
- Create: `src/input/keyboardInput.ts`
- Test: `tests/unit/keyboardInput.test.ts`

**Interfaces:**
- Consumes: `normalizePinyin`。
- Produces:
  - `LetterStream.ingestPreview(text: string): string[]`
  - `LetterStream.endComposition(): void`
  - `LetterStream.reset(): void`
  - `NativeKeyboard` with `focus()`、`blur()`、`destroy()`。

- [ ] **Step 1: 写失败测试**

`tests/unit/keyboardInput.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LetterStream } from '../../src/input/keyboardInput';

describe('LetterStream', () => {
  it('emits only newly added letters during IME composition', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('n')).toEqual(['n']);
    expect(stream.ingestPreview('ni')).toEqual(['i']);
    expect(stream.ingestPreview('nih')).toEqual(['h']);
  });

  it('does not duplicate composition text on end', () => {
    const stream = new LetterStream();
    stream.ingestPreview('ni');
    stream.endComposition();
    expect(stream.ingestPreview('')).toEqual([]);
  });

  it('resets after committed input', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('hao')).toEqual(['h', 'a', 'o']);
    stream.reset();
    expect(stream.ingestPreview('hao')).toEqual(['h', 'a', 'o']);
  });

  it('ignores non-letter preview content', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('你好')).toEqual([]);
    expect(stream.ingestPreview('lǜ')).toEqual(['l', 'v']);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/unit/keyboardInput.test.ts
```

Expected: FAIL，缺少 `LetterStream`。

- [ ] **Step 3: 实现字母流和原生输入绑定**

`src/input/keyboardInput.ts`:

```ts
import { normalizePinyin } from '../core/pinyin';

export class LetterStream {
  private lastNormalized = '';

  ingestPreview(text: string): string[] {
    const normalized = normalizePinyin(text);
    if (!normalized.startsWith(this.lastNormalized)) {
      this.lastNormalized = '';
    }
    const added = normalized.slice(this.lastNormalized.length);
    this.lastNormalized = normalized;
    return [...added];
  }

  endComposition(): void {
    queueMicrotask(() => this.reset());
  }

  reset(): void {
    this.lastNormalized = '';
  }
}

export type NativeKeyboardCallbacks = {
  onLetters(letters: string[]): void;
  onFocusLost?(): void;
};

export class NativeKeyboard {
  private readonly stream = new LetterStream();
  private composing = false;
  private readonly cleanup: Array<() => void> = [];

  constructor(
    private readonly input: HTMLInputElement,
    private readonly callbacks: NativeKeyboardCallbacks,
  ) {
    this.listen('compositionstart', () => {
      this.composing = true;
      this.stream.reset();
    });
    this.listen('compositionupdate', (event) => {
      const data = (event as CompositionEvent).data ?? '';
      this.callbacks.onLetters(this.stream.ingestPreview(data));
    });
    this.listen('compositionend', (event) => {
      this.composing = false;
      const data = (event as CompositionEvent).data ?? '';
      const added = this.stream.ingestPreview(data);
      this.callbacks.onLetters(added);
      this.stream.endComposition();
      queueMicrotask(() => { this.input.value = ''; });
    });
    this.listen('beforeinput', (event) => {
      if (this.composing) return;
      const inputEvent = event as InputEvent;
      if (inputEvent.inputType === 'insertText' && inputEvent.data) {
        const letters = normalizePinyin(inputEvent.data);
        if (letters) {
          event.preventDefault();
          this.callbacks.onLetters([...letters]);
          this.input.value = '';
        }
      }
    });
    this.listen('paste', (event) => {
      event.preventDefault();
      const text = (event as ClipboardEvent).clipboardData?.getData('text') ?? '';
      const letters = normalizePinyin(text);
      this.callbacks.onLetters([...letters]);
      this.input.value = '';
    });
    this.listen('blur', () => this.callbacks.onFocusLost?.());
  }

  focus(): void {
    this.input.focus({ preventScroll: true });
  }

  blur(): void {
    this.input.blur();
  }

  destroy(): void {
    for (const remove of this.cleanup) remove();
    this.cleanup.length = 0;
  }

  private listen(type: string, handler: (event: Event) => void): void {
    this.input.addEventListener(type, handler);
    this.cleanup.push(() => this.input.removeEventListener(type, handler));
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
npm test -- tests/unit/keyboardInput.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/input/keyboardInput.ts tests/unit/keyboardInput.test.ts
git commit -m "feat: adapt native keyboard and IME composition input"
```

---

### Task 7: 可玩的 DOM 界面与固定步游戏循环

**Files:**
- Create: `src/app.ts`
- Create: `src/core/loop.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Create: `src/ui/menuView.ts`
- Create: `src/ui/gameView.ts`
- Create: `src/ui/promptView.ts`
- Create: `playwright.config.ts`
- Test: `tests/e2e/game.spec.ts`

**Interfaces:**
- Consumes: `createLevel`, `GameSession`, `NativeKeyboard`, `GameSnapshot`。
- Produces:
  - `bootstrap(root: HTMLElement): void`
  - `GameLoop.start()`、`GameLoop.stop()`
  - 稳定 DOM 测试标识：`native-input`、`prompt`、`progress`、`wrong-count`、`game-canvas`。

- [ ] **Step 1: 写失败 E2E 测试**

`tests/e2e/game.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('starts a run, focuses the native input and advances on a correct letter', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '拼音追逃' })).toBeVisible();
  await page.getByRole('button', { name: '简单' }).click();
  await page.getByRole('button', { name: '开始逃跑' }).click();

  const input = page.getByTestId('native-input');
  await expect(input).toBeFocused();
  await expect(page.getByTestId('prompt')).toContainText(/[\u4e00-\u9fff]/);

  const pinyin = await page.getByTestId('prompt').getAttribute('data-pinyin');
  const firstLetter = (pinyin ?? '').toLowerCase().match(/[a-z]/)?.[0];
  expect(firstLetter).toBeTruthy();
  await page.keyboard.press(firstLetter!);
  await expect(page.getByTestId('progress')).toHaveAttribute('data-progress', '1');
});

test('wrong input stalls progress and records an error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();
  const pinyin = await page.getByTestId('prompt').getAttribute('data-pinyin');
  const expected = (pinyin ?? '').toLowerCase().replace(/[^a-z]/g, '')[0];
  const wrong = expected === 'z' ? 'x' : 'z';
  await page.keyboard.press(wrong);
  await expect(page.getByTestId('progress')).toHaveAttribute('data-progress', '0');
  await expect(page.getByTestId('wrong-count')).toHaveAttribute('data-count', '1');
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 2: 安装浏览器并运行测试确认失败**

Run:

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: FAIL，因为页面尚未渲染标题和游戏界面。

- [ ] **Step 3: 实现固定步游戏循环**

`src/core/loop.ts`:

```ts
export class GameLoop {
  private raf = 0;
  private previous = 0;
  private accumulator = 0;
  private readonly step = 1 / 60;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (time: number) => void,
  ) {}

  start(): void {
    if (this.raf) return;
    this.previous = performance.now();
    const frame = (now: number) => {
      const elapsed = Math.min(0.1, (now - this.previous) / 1000);
      this.previous = now;
      this.accumulator += elapsed;
      while (this.accumulator >= this.step) {
        this.update(this.step);
        this.accumulator -= this.step;
      }
      this.render(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
```

- [ ] **Step 4: 实现界面骨架**

`src/ui/menuView.ts`:

```ts
import type { Difficulty } from '../types';
import { DIFFICULTIES } from '../core/difficulty';

export function renderMenu(
  root: HTMLElement,
  bestLevel: number,
  selected: Difficulty,
  onSelect: (difficulty: Difficulty) => void,
  onStart: () => void,
): void {
  root.innerHTML = `
    <main class="screen menu-screen">
      <p class="eyebrow">输入越快，逃得越远</p>
      <h1>拼音追逃</h1>
      <p class="lede">照着拼音敲字母。答对前进，答错就会被身后的怪物追上。</p>
      <div class="difficulty-list" role="group" aria-label="选择难度">
        ${(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => `
          <button class="difficulty ${key === selected ? 'selected' : ''}" data-difficulty="${key}">
            <strong>${DIFFICULTIES[key].label}</strong>
            <span>${key === 'easy' ? '适合第一次逃跑' : key === 'normal' ? '速度与弯道升级' : '生僻词和追兵都更快'}</span>
          </button>
        `).join('')}
      </div>
      <p class="best">本机最高：第 ${Math.max(1, bestLevel)} 关</p>
      <button class="primary" data-action="start">开始逃跑</button>
    </main>
  `;
  root.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => onSelect(button.dataset.difficulty as Difficulty));
  });
  root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', onStart);
}
```

`src/ui/promptView.ts`:

```ts
import type { Phrase } from '../types';
import { normalizePinyin } from '../core/pinyin';

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
```

`src/ui/gameView.ts`:

```ts
export type GameViewCallbacks = {
  onRestart(): void;
  onChangeDifficulty(): void;
};

export function renderGameShell(root: HTMLElement): void {
  root.innerHTML = `
    <main class="screen game-screen" data-testid="game-screen">
      <header class="hud">
        <span>第 <strong data-testid="level">1</strong> 关</span>
        <span data-testid="difficulty-label">简单</span>
        <span>距离 <strong data-testid="gap">0</strong></span>
        <button type="button" data-testid="mute">静音</button>
      </header>
      <canvas data-testid="game-canvas"></canvas>
      <section class="prompt-card">
        <div data-testid="prompt" class="prompt"></div>
        <div class="input-row">
          <input data-testid="native-input" type="text" inputmode="text" autocomplete="off"
            autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="输入拼音" />
          <span data-testid="progress" data-progress="0">0 字母</span>
          <span data-testid="wrong-count" data-count="0" hidden></span>
        </div>
      </section>
      <div class="game-over" data-testid="game-over" hidden>
        <h2>被追上了</h2>
        <p>你到达了第 <strong data-testid="reached-level">1</strong> 关</p>
        <button data-action="restart">再来一次</button>
        <button data-action="change-difficulty">更换难度</button>
      </div>
    </main>
  `;
}

export function bindGameOverButtons(root: HTMLElement, callbacks: GameViewCallbacks): void {
  root.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener('click', callbacks.onRestart);
  root.querySelector<HTMLButtonElement>('[data-action="change-difficulty"]')?.addEventListener('click', callbacks.onChangeDifficulty);
}
```

- [ ] **Step 5: 编排应用、输入和状态更新**

`src/app.ts`:

```ts
import { createLevel } from './core/level';
import { GameSession } from './core/game';
import { GameLoop } from './core/loop';
import { NativeKeyboard } from './input/keyboardInput';
import { updatePrompt } from './ui/promptView';
import { renderMenu } from './ui/menuView';
import { bindGameOverButtons, renderGameShell } from './ui/gameView';
import type { Difficulty } from './types';

export function bootstrap(root: HTMLElement): void {
  let selected: Difficulty = 'easy';
  let session: GameSession | null = null;
  let levelNumber = 1;
  let wrongCount = 0;
  let loop: GameLoop | null = null;
  let keyboard: NativeKeyboard | null = null;

  const showMenu = () => {
    loop?.stop();
    keyboard?.destroy();
    keyboard = null;
    session = null;
    renderMenu(root, 1, selected, (difficulty) => {
      selected = difficulty;
      showMenu();
    }, startRun);
  };

  const syncView = () => {
    if (!session) return;
    const snapshot = session.getSnapshot();
    root.querySelector<HTMLElement>('[data-testid="level"]')!.textContent = String(snapshot.level.number);
    root.querySelector<HTMLElement>('[data-testid="gap"]')!.textContent = Math.max(0, snapshot.gap).toFixed(1);
    root.querySelector<HTMLElement>('[data-testid="progress"]')!.dataset.progress = String(snapshot.heroLetters);
    root.querySelector<HTMLElement>('[data-testid="progress"]')!.textContent = `${snapshot.heroLetters} 字母`;
    const phrase = snapshot.level.phrases[snapshot.phraseIndex] ?? snapshot.level.phrases.at(-1)!;
    const prompt = root.querySelector<HTMLElement>('[data-testid="prompt"]')!;
    updatePrompt(prompt, phrase, snapshot.letterIndex);
    const over = root.querySelector<HTMLElement>('[data-testid="game-over"]')!;
    over.hidden = snapshot.phase !== 'gameOver';
    const wrong = root.querySelector<HTMLElement>('[data-testid="wrong-count"]')!;
    wrong.dataset.count = String(wrongCount);
  };

  const startRun = () => {
    renderGameShell(root);
    levelNumber = 1;
    wrongCount = 0;
    session = new GameSession(createLevel(selected, levelNumber, Date.now()));
    const input = root.querySelector<HTMLInputElement>('[data-testid="native-input"]')!;
    keyboard = new NativeKeyboard(input, {
      onLetters: (letters) => {
        for (const letter of letters) {
          if (!session) return;
          const outcome = session.typeLetter(letter);
          if (outcome.kind === 'wrong') wrongCount += 1;
          syncView();
        }
      },
    });
    bindGameOverButtons(root, {
      onRestart: startRun,
      onChangeDifficulty: showMenu,
    });
    keyboard.focus();
    syncView();
    loop = new GameLoop(
      (dt) => { session?.tick(dt); syncView(); },
      () => {},
    );
    loop.start();
  };

  showMenu();
}
```

`src/main.ts`:

```ts
import './styles.css';
import { bootstrap } from './app';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app');
bootstrap(app);
```

- [ ] **Step 6: 添加基础移动端样式**

在 `src/styles.css` 追加：

```css
.screen { min-height: 100%; padding: max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom)); }
.menu-screen { display: flex; flex-direction: column; justify-content: center; gap: 18px; max-width: 560px; margin: 0 auto; }
h1 { margin: 0; font-size: clamp(3rem, 15vw, 5.5rem); line-height: .9; color: #ddf247; letter-spacing: -.06em; }
.eyebrow, .lede, .best { margin: 0; color: #fff6d8cc; }
.difficulty-list { display: grid; gap: 10px; }
.difficulty, .primary, .game-over button { border: 2px solid #fff6d833; border-radius: 18px; background: #102542; color: #fff6d8; padding: 16px; font: inherit; text-align: left; }
.difficulty { display: grid; gap: 4px; }
.difficulty span { color: #fff6d899; font-size: .85rem; }
.difficulty.selected { border-color: #ddf247; background: #183c36; }
.primary { background: #ddf247; color: #071426; font-weight: 800; text-align: center; }
.game-screen { display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 10px; }
.hud { display: flex; align-items: center; justify-content: space-between; font-size: .85rem; }
.hud button { border: 0; background: transparent; color: #fff6d8; }
canvas { width: 100%; flex: 1; min-height: 180px; border-radius: 20px; background: #071426; }
.prompt-card { background: #102542; border: 1px solid #fff6d822; border-radius: 20px; padding: 14px; }
.zh { font-size: clamp(1.3rem, 6vw, 2rem); font-weight: 800; }
.pinyin { margin-top: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; color: #fff6d899; }
.pinyin-letter.done { color: #ddf247; }
.pinyin-letter.current { color: #32e6d4; text-decoration: underline; }
.input-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
#app input { flex: 1; min-width: 0; height: 42px; border-radius: 12px; border: 1px solid #fff6d833; background: #071426; color: transparent; caret-color: transparent; padding: 0 12px; font-size: 16px; }
.game-over { position: fixed; inset: 0; display: grid; place-content: center; gap: 12px; padding: 24px; background: #071426ee; text-align: center; }
.game-over[hidden] { display: none; }
```

- [ ] **Step 7: 运行 E2E 确认通过**

Run:

```bash
npm run test:e2e -- tests/e2e/game.spec.ts
```

Expected: PASS。原生输入框获得焦点，正确字母使 `data-progress` 从 `0` 变为 `1`，错误字母使错误计数变为 `1`。

- [ ] **Step 8: 提交**

```bash
git add src/app.ts src/core/loop.ts src/input/keyboardInput.ts src/ui src/main.ts src/styles.css vite.config.ts playwright.config.ts tests/e2e/game.spec.ts
git commit -m "feat: add playable native-keyboard game shell"
```

---

### Task 8: Canvas 迷宫、镜头与角色动画

**Files:**
- Create: `src/render/camera.ts`
- Create: `src/render/characters.ts`
- Create: `src/render/canvasRenderer.ts`
- Modify: `src/app.ts`
- Modify: `src/styles.css`
- Test: `tests/unit/camera.test.ts`
- Test: `tests/e2e/game.spec.ts`

**Interfaces:**
- Consumes: `GameSnapshot`, `Maze`, `sampleMaze`。
- Produces:
  - `Camera.follow(targetX, targetY, dt): void`
  - `Camera.apply(ctx): void`
  - `CanvasRenderer.resize(): void`
  - `CanvasRenderer.render(snapshot, time): void`
  - `CanvasRenderer.emitCorrect()`、`emitWrong()`、`emitLevelClear()`、`emitCaught()`

- [ ] **Step 1: 写失败测试**

`tests/unit/camera.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Camera } from '../../src/render/camera';

describe('Camera', () => {
  it('moves toward a target without teleporting', () => {
    const camera = new Camera();
    camera.follow(100, 50, 0.1);
    expect(camera.x).toBeGreaterThan(0);
    expect(camera.x).toBeLessThan(100);
    expect(camera.y).toBeGreaterThan(0);
    expect(camera.y).toBeLessThan(50);
  });

  it('snaps when initialized', () => {
    const camera = new Camera();
    camera.follow(100, 50, 1);
    expect(camera.x).toBeCloseTo(100, 1);
    expect(camera.y).toBeCloseTo(50, 1);
  });
});
```

在 `tests/e2e/game.spec.ts` 追加：

```ts
test('renders a non-empty canvas maze', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();
  await page.waitForTimeout(200);
  const hasPixels = await page.getByTestId('game-canvas').evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const context = element.getContext('2d');
    if (!context) return false;
    const data = context.getImageData(0, 0, element.width, element.height).data;
    for (let i = 3; i < data.length; i += 400) if (data[i] !== 0) return true;
    return false;
  });
  expect(hasPixels).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/unit/camera.test.ts
npm run test:e2e -- tests/e2e/game.spec.ts
```

Expected: 单元测试缺少 `Camera`；Canvas 测试失败或画布为空。

- [ ] **Step 3: 实现平滑镜头**

`src/render/camera.ts`:

```ts
export class Camera {
  x = 0;
  y = 0;
  initialized = false;

  follow(targetX: number, targetY: number, dt: number): void {
    if (!this.initialized) {
      this.x = targetX;
      this.y = targetY;
      this.initialized = true;
      return;
    }
    const smoothing = 1 - Math.exp(-dt * 8);
    this.x += (targetX - this.x) * smoothing;
    this.y += (targetY - this.y) * smoothing;
  }

  apply(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.translate(width / 2 - this.x, height / 2 - this.y);
  }
}
```

- [ ] **Step 4: 绘制角色**

`src/render/characters.ts`:

```ts
export function drawHero(ctx: CanvasRenderingContext2D, time: number, stunned: boolean): void {
  const bounce = stunned ? 0 : Math.sin(time / 70) * 2;
  ctx.save();
  ctx.translate(0, bounce);
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(0, -9, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#32e6d4';
  ctx.beginPath();
  ctx.roundRect(-9, -1, 18, 18, 7);
  ctx.fill();
  ctx.fillStyle = '#071426';
  ctx.fillRect(-4, -11, 2, 3);
  ctx.fillRect(4, -11, 2, 3);
  ctx.strokeStyle = '#ff8b3d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.quadraticCurveTo(-22, 8 + Math.sin(time / 90) * 4, -27, -3);
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, time: number, danger: number): void {
  const pulse = 1 + Math.sin(time / 100) * 0.04 + danger * 0.08;
  ctx.save();
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const radius = i % 2 === 0 ? 28 : 22;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ddf247';
  ctx.beginPath();
  ctx.arc(-8, -5, 4, 0, Math.PI * 2);
  ctx.arc(8, -5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

- [ ] **Step 5: 实现 Canvas 渲染器**

`src/render/canvasRenderer.ts`:

```ts
import type { GameSnapshot } from '../types';
import { sampleMaze } from '../core/maze';
import { Camera } from './camera';
import { drawEnemy, drawHero } from './characters';

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera();
  private particles: Particle[] = [];
  private heroPosition = { x: 0, y: 0 };
  private lastFrame = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    this.ctx = context;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  emitCorrect(): void {
    this.emit({ color: '#ddf247', count: 8, speed: 50 });
  }

  emitWrong(): void {
    this.emit({ color: '#ff4d4d', count: 14, speed: 90 });
  }

  emitLevelClear(): void {
    this.emit({ color: '#32e6d4', count: 28, speed: 140 });
  }

  emitCaught(): void {
    this.emit({ color: '#ff4d4d', count: 36, speed: 180 });
  }

  render(snapshot: GameSnapshot, time: number): void {
    const dt = this.lastFrame === 0 ? 1 / 60 : Math.min(0.1, (time - this.lastFrame) / 1000);
    this.lastFrame = time;
    const { ctx } = this;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    const heroDistance = snapshot.level.maze.heroStartDistance + snapshot.heroLetters * 28;
    const hero = sampleMaze(snapshot.level.maze, heroDistance);
    this.heroPosition = { x: hero.x, y: hero.y };
    this.camera.follow(hero.x, hero.y, dt);
    this.camera.apply(ctx, width, height);

    this.drawMaze(snapshot);
    this.drawGate(snapshot);

    const enemy = sampleMaze(snapshot.level.maze, hero.distance - snapshot.gap * 28);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    drawEnemy(ctx, time, 1 - Math.min(1, snapshot.gap / snapshot.level.initialGap));
    ctx.restore();

    ctx.save();
    ctx.translate(hero.x, hero.y);
    ctx.rotate(hero.angle);
    drawHero(ctx, time, snapshot.stunRemaining > 0);
    ctx.restore();

    this.updateParticles(dt);
    this.drawParticles();
    ctx.restore();

    if (snapshot.stunRemaining > 0) {
      ctx.fillStyle = 'rgba(255, 77, 77, .12)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawMaze(snapshot: GameSnapshot): void {
    const { ctx } = this;
    const samples = snapshot.level.maze.samples;
    const trace = () => {
      ctx.beginPath();
      samples.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    trace();
    ctx.strokeStyle = '#183c5a';
    ctx.lineWidth = snapshot.level.maze.corridorWidth + 18;
    ctx.stroke();
    trace();
    ctx.strokeStyle = '#0d2038';
    ctx.lineWidth = snapshot.level.maze.corridorWidth;
    ctx.stroke();
    trace();
    ctx.strokeStyle = '#ddf24722';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawGate(snapshot: GameSnapshot): void {
    const end = snapshot.level.maze.samples.at(-1);
    if (!end) return;
    const { ctx } = this;
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.fillStyle = '#32e6d4';
    ctx.shadowColor = '#32e6d4';
    ctx.shadowBlur = 24;
    ctx.fillRect(-7, -30, 14, 60);
    ctx.restore();
  }

  private emit(options: { color: string; count: number; speed: number }): void {
    const sourceX = this.heroPosition.x;
    const sourceY = this.heroPosition.y;
    for (let i = 0; i < options.count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = options.speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x: sourceX,
        y: sourceY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: options.color,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      particle.life -= dt * 1.8;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private drawParticles(): void {
    const { ctx } = this;
    for (const particle of this.particles) {
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
```

- [ ] **Step 6: 接入渲染器和反馈触发**

在 `src/app.ts` 中：
- 创建 `let renderer: CanvasRenderer | null = null;`
- 在 `startRun()` 中 `renderer = new CanvasRenderer(canvas)`。
- 在 `syncView()` 后调用 `renderer?.render(snapshot, performance.now())`。
- 在 `GameLoop` 的 render 回调中调用 `renderer?.render(session.getSnapshot(), time)`。
- 正确输入调用 `renderer?.emitCorrect()`，错误调用 `renderer?.emitWrong()`。
- `snapshot.phase === 'levelClear'` 首次出现时调用 `emitLevelClear()`；`gameOver` 首次出现时调用 `emitCaught()`。
- 添加 `visualViewport` 和 `ResizeObserver` 监听以调用 `renderer.resize()`。

- [ ] **Step 7: 运行测试确认通过**

Run:

```bash
npm test -- tests/unit/camera.test.ts
npm run test:e2e -- tests/e2e/game.spec.ts
```

Expected: PASS，Canvas 中能检测到非透明像素，迷宫和角色可见。

- [ ] **Step 8: 提交**

```bash
git add src/render src/app.ts src/styles.css tests/unit/camera.test.ts tests/e2e/game.spec.ts
git commit -m "feat: render winding maze and animated characters"
```

---

### Task 9: 无尽续关、暂停、存档与结束流程

**Files:**
- Create: `src/core/storage.ts`
- Modify: `src/core/game.ts`
- Modify: `src/app.ts`
- Modify: `src/ui/gameView.ts`
- Test: `tests/unit/storage.test.ts`
- Test: `tests/unit/game.test.ts`
- Test: `tests/e2e/game.spec.ts`

**Interfaces:**
- Consumes: `GameSnapshot`、`localStorage`。
- Produces:
  - `PersistedProgress`
  - `loadProgress(storage?: StorageLike): PersistedProgress`
  - `saveProgress(progress: PersistedProgress, storage?: StorageLike): void`
  - `GameSession.completeLevel(): void`

- [ ] **Step 1: 写失败测试**

`tests/unit/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadProgress, saveProgress, type StorageLike } from '../../src/core/storage';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe('progress storage', () => {
  it('round-trips progress', () => {
    const storage = new MemoryStorage();
    saveProgress({ bestLevel: 7, bestDistance: 88, lastDifficulty: 'hard', muted: true }, storage);
    expect(loadProgress(storage)).toEqual({ bestLevel: 7, bestDistance: 88, lastDifficulty: 'hard', muted: true });
  });

  it('falls back to defaults on malformed data', () => {
    const storage = new MemoryStorage();
    storage.setItem('pinyin-chase:progress', '{bad json');
    expect(loadProgress(storage)).toEqual({ bestLevel: 1, bestDistance: 0, lastDifficulty: 'easy', muted: false });
  });

  it('works when storage is unavailable', () => {
    expect(loadProgress(undefined)).toEqual({ bestLevel: 1, bestDistance: 0, lastDifficulty: 'easy', muted: false });
  });
});
```

在 `tests/unit/game.test.ts` 追加：

```ts
it('advances to a fresh playing phase when a cleared level is completed', () => {
  const session = new GameSession(level([phrase('你好', 'ni hao')]));
  for (const letter of ['n', 'i', 'h', 'a', 'o']) session.typeLetter(letter);
  expect(session.getSnapshot().phase).toBe('levelClear');
  session.completeLevel();
  expect(session.getSnapshot().phase).toBe('playing');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/unit/storage.test.ts tests/unit/game.test.ts
```

Expected: FAIL，缺少 `storage.ts` 和 `completeLevel()`。

- [ ] **Step 3: 实现本地存储**

`src/core/storage.ts`:

```ts
import type { Difficulty } from '../types';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type PersistedProgress = {
  bestLevel: number;
  bestDistance: number;
  lastDifficulty: Difficulty;
  muted: boolean;
};

const KEY = 'pinyin-chase:progress';
const DEFAULTS: PersistedProgress = {
  bestLevel: 1,
  bestDistance: 0,
  lastDifficulty: 'easy',
  muted: false,
};

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadProgress(storage?: StorageLike): PersistedProgress {
  try {
    const raw = resolveStorage(storage)?.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const value = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      bestLevel: Number.isFinite(value.bestLevel) ? Math.max(1, Number(value.bestLevel)) : 1,
      bestDistance: Number.isFinite(value.bestDistance) ? Math.max(0, Number(value.bestDistance)) : 0,
      lastDifficulty: value.lastDifficulty === 'normal' || value.lastDifficulty === 'hard' ? value.lastDifficulty : 'easy',
      muted: value.muted === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveProgress(progress: PersistedProgress, storage?: StorageLike): void {
  try {
    resolveStorage(storage)?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage is optional; gameplay must continue without it.
  }
}
```

- [ ] **Step 4: 实现关卡完成状态**

在 `src/core/game.ts` 添加：

```ts
completeLevel(): void {
  if (this.phase === 'levelClear') this.phase = 'playing';
}
```

实际应用不会复用旧关卡，而是 `app.ts` 在检测到 `levelClear` 后生成新关卡并创建新 `GameSession`；`completeLevel()` 只用于状态机单元测试和兜底。

- [ ] **Step 5: 接入续关、暂停和存档**

在 `src/app.ts`：
- `let progress = loadProgress();`
- 菜单读取 `progress.lastDifficulty` 作为初始难度。
- 进入任意关卡后执行 `progress = { ...progress, bestLevel: Math.max(progress.bestLevel, levelNumber) }; saveProgress(progress);`
- 每次正确输入后更新 `bestDistance = Math.max(bestDistance, snapshot.runLetters)`，至少每 10 个字母保存一次。
- 到达 `levelClear` 后等待 `900ms`，`levelNumber += 1`，生成 `createLevel(selected, levelNumber, Date.now())`，新建 `GameSession`，重置 `wrongCount`，重新聚焦输入框。
- `document.visibilitychange` 隐藏时 `session.pause()`；恢复后显示“点击继续”，点击输入框或画布时 `session.resume()` 并重新聚焦。
- 游戏结束后显示 `reached-level`，同时保存 `bestLevel` 和 `bestDistance`。
- 点击“再来一次”从同一难度第 1 关开始；点击“更换难度”回到菜单。

- [ ] **Step 6: 写 E2E 覆盖结束和本地进度**

在 `tests/e2e/game.spec.ts` 追加：

```ts
test('reads persisted best level on the menu', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pinyin-chase:progress', JSON.stringify({
      bestLevel: 9,
      bestDistance: 200,
      lastDifficulty: 'normal',
      muted: false,
    }));
  });
  await page.goto('/');
  await expect(page.getByText('本机最高：第 9 关')).toBeVisible();
});

test('hard mode without input reaches game over', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '困难' }).click();
  await page.getByRole('button', { name: '开始逃跑' }).click();
  await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('button', { name: '再来一次' })).toBeVisible();
});
```

- [ ] **Step 7: 运行测试确认通过**

Run:

```bash
npm test -- tests/unit/storage.test.ts tests/unit/game.test.ts
npm run test:e2e -- tests/e2e/game.spec.ts
```

Expected: PASS，存档可读取，困难模式无输入会结束游戏。

- [ ] **Step 8: 提交**

```bash
git add src/core/storage.ts src/core/game.ts src/app.ts src/ui/gameView.ts tests/unit/storage.test.ts tests/unit/game.test.ts tests/e2e/game.spec.ts
git commit -m "feat: persist progress and complete endless level flow"
```

---

### Task 10: 音效、震动、移动端视口与最终视觉反馈

**Files:**
- Create: `src/audio/feedback.ts`
- Modify: `src/app.ts`
- Modify: `src/styles.css`
- Test: `tests/e2e/game.spec.ts`

**Interfaces:**
- Consumes: 无。
- Produces:
  - `FeedbackController.unlock(): void`
  - `FeedbackController.correct(): void`
  - `FeedbackController.wrong(): void`
  - `FeedbackController.levelClear(): void`
  - `FeedbackController.caught(): void`
  - `FeedbackController.setTension(value: number): void`
  - `FeedbackController.setMuted(muted: boolean): void`
  - `FeedbackController.toggleMuted(): boolean`
  - `FeedbackController.destroy(): void`

- [ ] **Step 1: 写失败 E2E 测试**

在 `tests/e2e/game.spec.ts` 追加：

```ts
test('supports a phone viewport and a mute toggle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '开始逃跑' }).click();
  await expect(page.getByTestId('native-input')).toBeFocused();
  const mute = page.getByTestId('mute');
  await expect(mute).toBeVisible();
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test:e2e -- tests/e2e/game.spec.ts
```

Expected: FAIL，静音按钮尚无 `aria-pressed` 状态。

- [ ] **Step 3: 实现 Web Audio 与震动降级**

`src/audio/feedback.ts`:

```ts
export class FeedbackController {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private tension = 0;
  private pulseTimer: number | null = null;

  destroy(): void {
    if (this.pulseTimer !== null) window.clearTimeout(this.pulseTimer);
    this.pulseTimer = null;
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  unlock(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.22;
      this.master.connect(this.context.destination);
    }
    void this.context.resume();
  }

  correct(): void {
    this.tone(660, 0.06, 'sine', 0.18);
    this.vibrate(8);
  }

  wrong(): void {
    this.tone(130, 0.14, 'sawtooth', 0.22);
    this.vibrate(28);
  }

  levelClear(): void {
    this.tone(660, 0.08, 'sine', 0.2, 0);
    this.tone(880, 0.12, 'sine', 0.2, 0.09);
    this.vibrate([16, 30, 24]);
  }

  caught(): void {
    this.tone(90, 0.35, 'sawtooth', 0.3);
    this.vibrate([40, 40, 80]);
  }

  setTension(value: number): void {
    this.tension = Math.max(0, Math.min(1, value));
    if (this.pulseTimer !== null) return;
    const pulse = () => {
      if (!this.muted && this.tension > 0.25) this.tone(180 + this.tension * 120, 0.025, 'triangle', 0.04);
      const delay = 700 - this.tension * 480;
      this.pulseTimer = window.setTimeout(pulse, delay);
    };
    this.pulseTimer = window.setTimeout(pulse, 700);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22;
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0): void {
    if (!this.context || !this.master || this.muted) return;
    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration);
  }

  private vibrate(pattern: number | number[]): void {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Haptics are optional.
    }
  }
}
```

- [ ] **Step 4: 接入反馈与移动端布局**

在 `src/app.ts`：
- 创建 `const feedback = new FeedbackController(); feedback.setMuted(progress.muted);`
- 开始按钮点击时调用 `feedback.unlock()`。
- 正确输入调用 `feedback.correct()`、`renderer?.emitCorrect()`。
- 错误输入调用 `feedback.wrong()`、`renderer?.emitWrong()`。
- 关卡通过调用 `feedback.levelClear()`。
- 游戏结束调用 `feedback.caught()`。
- 每帧或距离变化时调用 `feedback.setTension(1 - snapshot.gap / snapshot.level.initialGap)`。
- 静音按钮点击调用 `feedback.toggleMuted()`，更新 `aria-pressed`、按钮文案和 `progress.muted`，立即保存。
- `document.documentElement.style.setProperty('--app-height', `${visualViewport?.height ?? window.innerHeight}px`)`，CSS 使用 `height: var(--app-height, 100dvh)`。
- 监听 `visualViewport.resize`、`window.resize`、`orientationchange`，调用 `renderer.resize()`。

修改 `src/styles.css`：

```css
.game-screen {
  height: var(--app-height, 100dvh);
  min-height: 0;
  padding: max(8px, env(safe-area-inset-top)) 10px max(8px, env(safe-area-inset-bottom));
}

.hud [data-testid="mute"][aria-pressed="true"] {
  color: #ff8b3d;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: 运行 E2E 并检查控制台错误**

Run:

```bash
npm run test:e2e -- tests/e2e/game.spec.ts
```

Expected: PASS，无未处理异常；手机视口无横向溢出；静音按钮可切换。

- [ ] **Step 6: 提交**

```bash
git add src/audio/feedback.ts src/app.ts src/styles.css tests/e2e/game.spec.ts
git commit -m "feat: add audio haptics and mobile viewport polish"
```

---

### Task 11: 全量验证与交付

**Files:**
- Modify: `README.md`（若尚未存在则创建）
- Test: `npm test`
- Test: `npm run build`
- Test: `npm run test:e2e`

**Interfaces:**
- Consumes: 前面所有任务。
- Produces: 可部署的 `dist/` 和运行说明。

- [ ] **Step 1: 创建运行说明**

`README.md`:

```md
# 拼音追逃

手机浏览器拼音打字追逐游戏。玩家照着拼音提示使用原生键盘输入，答对前进，答错会被敌人追近。关卡无尽，难度持续上升。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## 部署

将 `npm run build` 生成的 `dist/` 目录部署到任意静态网站托管服务。
```

- [ ] **Step 2: 运行完整单元测试**

Run:

```bash
npm test
```

Expected: 所有单元测试通过，无跳过。

- [ ] **Step 3: 运行生产构建**

Run:

```bash
npm run build
```

Expected: TypeScript 与 Vite 构建成功，生成 `dist/`。

- [ ] **Step 4: 运行完整 E2E**

Run:

```bash
npm run test:e2e
```

Expected: 所有 E2E 通过。

- [ ] **Step 5: 保存移动端截图并人工检查**

先在一个终端运行开发服务器：

```bash
npm run dev -- --port 4173
```

再在另一个终端保存截图：

```bash
npx playwright screenshot --device="iPhone 13" http://127.0.0.1:4173 work/mobile-menu.png
```

人工检查：
- 标题、难度按钮、开始按钮均在首屏内。
- 输入拼音后题目、进度和画布无遮挡。
- 敌人与主角轮廓清晰，高对比色可辨。
- 竖屏无横向滚动，安全区未被遮挡。

- [ ] **Step 6: 真机验收清单**

在 iOS Safari 与 Android Chrome 分别检查：
- 点击开始后原生键盘弹出。
- 中文输入法组合拼音时不会重复推进。
- 拉丁键盘直接输入拼音正常。
- 错误输入触发画面、音效和可用时的震动。
- 页面切后台再返回不会继续被追。
- 到达终点门后自动进入下一关。
- 刷新页面后本机最高关卡仍存在。
- 无登录、排行榜、内购或剧情入口。

- [ ] **Step 7: 提交最终版本**

```bash
git add README.md src tests package.json package-lock.json
git commit -m "chore: finalize mobile pinyin chase game"
```

## Coverage Check

- 原生键盘与逐字母判定：Task 3、5、6、7。
- 三档难度、题目长度与生僻度：Task 2、3、4。
- 弯曲迷宫与连续镜头：Task 4、8。
- 敌人追击、错误停顿、被捕结束：Task 5、9。
- 无尽续关、终点门与本地进度：Task 4、8、9。
- 角色、动画、高对比视觉：Task 8、10。
- 音效、震动、静音：Task 10。
- 手机视口、安全区和后台暂停：Task 9、10、11。
- 测试、构建与真机验收：Task 11。
