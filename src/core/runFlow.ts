import type { GamePhase } from '../types';

export const LEVEL_CLEAR_DELAY_MS = 900;
export const SAVE_EVERY_LETTERS = 10;

export type LevelClearTimer = {
  schedule(callback: () => void): boolean;
  clear(): void;
  isPending(): boolean;
};

/**
 * Single-shot level-clear delay. Scheduling while a callback is pending is a
 * no-op so repeated syncs during the levelClear phase can never stack timers.
 */
export function createLevelClearTimer(delayMs: number = LEVEL_CLEAR_DELAY_MS): LevelClearTimer {
  let handle: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule(callback: () => void): boolean {
      if (handle !== null) return false;
      handle = globalThis.setTimeout(() => {
        handle = null;
        callback();
      }, delayMs);
      return true;
    },
    clear(): void {
      if (handle === null) return;
      globalThis.clearTimeout(handle);
      handle = null;
    },
    isPending(): boolean {
      return handle !== null;
    },
  };
}

export type DistanceRecord = {
  bestDistance: number;
  recorded: number;
  shouldSave: boolean;
};

export type BestDistanceTracker = {
  readonly bestDistance: number;
  record(runLetters: number): DistanceRecord;
  /** Marks every recorded letter as persisted, e.g. after a forced save. */
  flush(): void;
};

/**
 * Monotonic best-distance bookkeeping. Each record() reports how many newly
 * recorded letters were accepted and asks for a save once per `saveEveryLetters`.
 */
export function createBestDistanceTracker(
  initialBestDistance: number,
  saveEveryLetters: number = SAVE_EVERY_LETTERS,
): BestDistanceTracker {
  let bestDistance = Math.max(0, Math.floor(Number.isFinite(initialBestDistance) ? initialBestDistance : 0));
  let unsaved = 0;
  const saveEvery = Math.max(1, Math.floor(saveEveryLetters));
  return {
    get bestDistance(): number {
      return bestDistance;
    },
    record(runLetters: number): DistanceRecord {
      const value = Math.max(0, Math.floor(Number.isFinite(runLetters) ? runLetters : 0));
      const recorded = Math.max(0, value - bestDistance);
      if (recorded === 0) return { bestDistance, recorded: 0, shouldSave: false };
      bestDistance = value;
      unsaved += recorded;
      const shouldSave = unsaved >= saveEvery;
      if (shouldSave) unsaved = 0;
      return { bestDistance, recorded, shouldSave };
    },
    flush(): void {
      unsaved = 0;
    },
  };
}

export type VisibilityAction = 'pause' | 'show-resume' | 'none';

export function visibilityAction(hidden: boolean, phase: GamePhase): VisibilityAction {
  if (hidden && phase === 'playing') return 'pause';
  if (!hidden && phase === 'paused') return 'show-resume';
  return 'none';
}

/**
 * Proximity heartbeat is only meaningful during an active chase. Paused,
 * level-clear, game-over and menu phases all return 0 so the feedback timer
 * stops instead of beeping in the background. The result is clamped to [0, 1].
 */
export function activeTensionForPhase(phase: GamePhase, gap: number, initialGap: number): number {
  if (phase !== 'playing') return 0;
  if (!Number.isFinite(initialGap) || initialGap <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - gap / initialGap));
}

/**
 * Only a cleared level advances the run, so duplicate timers or stale phases
 * can never skip a level.
 */
export function nextLevelNumber(phase: GamePhase, currentLevel: number): number | null {
  if (phase !== 'levelClear') return null;
  return currentLevel + 1;
}
