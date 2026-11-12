export type LoopHandle = {
  stop(): void;
};

export type KeyboardHandle = {
  destroy(): void;
};

export type RunResources<
  TSession = unknown,
  TLoop extends LoopHandle = LoopHandle,
  TKeyboard extends KeyboardHandle = KeyboardHandle,
> = {
  loop: TLoop | null;
  keyboard: TKeyboard | null;
  session: TSession | null;
};

/**
 * Unconditionally tears down the previous run before a new one is created.
 * This is intentionally idempotent: restart and menu transitions may call it
 * when no run is active, and repeated clicks must never leave a stale loop
 * ticking against a replaced session.
 */
export function stopCurrentRun<
  TSession,
  TLoop extends LoopHandle,
  TKeyboard extends KeyboardHandle,
>(run: RunResources<TSession, TLoop, TKeyboard>): void {
  run.loop?.stop();
  run.keyboard?.destroy();
  run.loop = null;
  run.keyboard = null;
  run.session = null;
}
