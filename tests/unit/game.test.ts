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
