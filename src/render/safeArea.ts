export type SafeArea = {
  top: number;
  bottom: number;
};

export function focusYForSafeArea(height: number, safeArea: SafeArea): number {
  const top = Math.max(0, Math.min(height, safeArea.top));
  const bottom = Math.max(0, Math.min(height - top, safeArea.bottom));
  return (top + (height - bottom)) / 2;
}
