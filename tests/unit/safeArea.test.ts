import { describe, expect, it } from 'vitest';
import { focusYForSafeArea } from '../../src/render/safeArea';

describe('safe play area', () => {
  it('centers the camera between the HUD and the prompt card', () => {
    expect(focusYForSafeArea(300, { top: 48, bottom: 110 })).toBe(119);
  });

  it('stays inside the canvas when the available area is very small', () => {
    expect(focusYForSafeArea(240, { top: 220, bottom: 220 })).toBe(220);
  });
});
