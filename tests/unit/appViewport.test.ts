import { describe, expect, it } from 'vitest';
import { appViewportMetrics } from '../../src/ui/appViewport';

describe('app viewport metrics', () => {
  it('uses the visual viewport height and its offset when the keyboard is open', () => {
    expect(appViewportMetrics({ height: 412.4, offsetTop: 64.2 }, 844)).toEqual({
      height: 412,
      top: 64,
    });
  });

  it('falls back to the window height when VisualViewport is unavailable', () => {
    expect(appViewportMetrics(null, 700)).toEqual({ height: 700, top: 0 });
  });
});
