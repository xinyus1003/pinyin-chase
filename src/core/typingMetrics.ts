export const CPM_WINDOW_MS = 5000;
export const MIN_CPM_RECORD_MS = 2000;

export type TypingSnapshot = {
  cpm: number;
  accuracy: number;
  totalAttempts: number;
  correctAttempts: number;
};

export function accuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((correct / total) * 1000) / 10;
}

export class TypingMetrics {
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private pausedTotal = 0;
  private correctTimes: number[] = [];
  private correctAttempts = 0;
  private wrongAttempts = 0;

  recordCorrect(now: number): void {
    this.ensureStarted(now);
    this.correctTimes.push(this.activeTime(now));
    this.correctAttempts += 1;
    this.prune(now);
  }

  recordWrong(now: number): void {
    this.ensureStarted(now);
    this.wrongAttempts += 1;
  }

  snapshot(now: number): TypingSnapshot {
    this.prune(now);
    const totalAttempts = this.correctAttempts + this.wrongAttempts;
    return {
      cpm: Math.round((this.correctTimes.length * 60000) / CPM_WINDOW_MS),
      accuracy: accuracyPercent(this.correctAttempts, totalAttempts),
      totalAttempts,
      correctAttempts: this.correctAttempts,
    };
  }

  activeElapsedMs(now: number): number {
    if (this.startedAt === null) return 0;
    const activeNow = this.pausedAt ?? now;
    return Math.max(0, activeNow - this.startedAt - this.pausedTotal);
  }

  canRecordBest(now: number): boolean {
    return this.activeElapsedMs(now) >= MIN_CPM_RECORD_MS && this.correctAttempts > 0;
  }

  pause(now: number): void {
    if (this.startedAt !== null && this.pausedAt === null) this.pausedAt = now;
  }

  resume(now: number): void {
    if (this.pausedAt === null) return;
    this.pausedTotal += Math.max(0, now - this.pausedAt);
    this.pausedAt = null;
  }

  reset(): void {
    this.startedAt = null;
    this.pausedAt = null;
    this.pausedTotal = 0;
    this.correctTimes = [];
    this.correctAttempts = 0;
    this.wrongAttempts = 0;
  }

  private ensureStarted(now: number): void {
    if (this.startedAt === null) this.startedAt = now;
  }

  private activeTime(now: number): number {
    return now - this.pausedTotal;
  }

  private prune(now: number): void {
    if (this.startedAt === null) return;
    const activeNow = (this.pausedAt ?? now) - this.pausedTotal;
    this.correctTimes = this.correctTimes.filter((time) => time >= activeNow - CPM_WINDOW_MS);
  }
}
