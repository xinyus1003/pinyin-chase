import { describe, expect, it } from 'vitest';
import { Camera } from '../../src/render/camera';

describe('Camera', () => {
  it('snaps to the target on first follow', () => {
    const camera = new Camera();
    camera.follow(100, 50, 0.1);
    expect(camera.x).toBe(100);
    expect(camera.y).toBe(50);
  });

  it('moves toward a target without teleporting after initialization', () => {
    const camera = new Camera();
    camera.follow(0, 0, 1 / 60);
    camera.follow(100, 50, 0.1);
    expect(camera.x).toBeGreaterThan(0);
    expect(camera.x).toBeLessThan(100);
    expect(camera.y).toBeGreaterThan(0);
    expect(camera.y).toBeLessThan(50);
  });
});
