export type GhostLevelRecord = {
  level: number;
  timesMs: number[];
};

export type GhostRunRecord = {
  totalLetters: number;
  levels: GhostLevelRecord[];
};

export function ghostLettersAt(timesMs: readonly number[], activeMs: number): number {
  if (!Number.isFinite(activeMs) || activeMs < 0 || timesMs.length === 0) return 0;
  let low = 0;
  let high = timesMs.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (timesMs[middle]! <= activeMs) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function shouldReplaceGhost(
  candidate: GhostRunRecord,
  current: GhostRunRecord | null | undefined,
): boolean {
  return !current || candidate.totalLetters > current.totalLetters;
}

export class GhostRecorder {
  private levels: GhostLevelRecord[] = [];
  private currentLevel: GhostLevelRecord | null = null;
  private levelStartActiveMs = 0;
  private total = 0;

  get totalLetters(): number {
    return this.total;
  }

  reset(): void {
    this.levels = [];
    this.currentLevel = null;
    this.levelStartActiveMs = 0;
    this.total = 0;
  }

  beginLevel(level: number, activeMs: number): void {
    const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
    const safeActive = Math.max(0, Number.isFinite(activeMs) ? activeMs : 0);
    this.levelStartActiveMs = safeActive;
    this.currentLevel = { level: safeLevel, timesMs: [] };
    this.levels.push(this.currentLevel);
  }

  recordCorrect(activeMs: number): void {
    if (!this.currentLevel) return;
    const elapsed = Math.max(0, activeMs - this.levelStartActiveMs);
    this.currentLevel.timesMs.push(Math.round(Number.isFinite(elapsed) ? elapsed : 0));
    this.total += 1;
  }

  snapshot(): GhostRunRecord {
    return {
      totalLetters: this.total,
      levels: this.levels.map((level) => ({ level: level.level, timesMs: [...level.timesMs] })),
    };
  }
}
