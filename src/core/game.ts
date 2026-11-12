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
    const phraseLetters = normalizePinyin(this.level.phrases[this.phraseIndex]?.pinyin ?? '');
    const expected = phraseLetters[this.letterIndex];
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

    if (this.letterIndex >= phraseLetters.length) {
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

  completeLevel(): void {
    if (this.phase === 'levelClear') this.phase = 'playing';
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
