export type VisualViewportLike = {
  height: number;
  offsetTop: number;
};

export function appViewportMetrics(
  visualViewport: VisualViewportLike | null | undefined,
  windowHeight: number,
): { height: number; top: number } {
  return {
    height: Math.max(1, Math.round(visualViewport?.height ?? windowHeight)),
    top: Math.max(0, Math.round(visualViewport?.offsetTop ?? 0)),
  };
}
