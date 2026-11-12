export type WrongIndicator = {
  visible: boolean;
  label: string;
};

/**
 * Visible error status for the HUD. It stays hidden until the first wrong
 * letter and then reports the running count (e.g. "错误 2").
 */
export function wrongIndicator(wrongCount: number): WrongIndicator {
  const count = Math.max(0, Math.floor(wrongCount));
  if (count === 0) return { visible: false, label: '' };
  return { visible: true, label: `错误 ${count}` };
}

/**
 * The prompt card flashes the `has-error` class while the session is stunned
 * after a wrong letter (snapshot.stunRemaining > 0).
 */
export function isPromptError(stunRemaining: number): boolean {
  return stunRemaining > 0;
}
