import { describe, expect, it } from 'vitest';
import { Camera } from '../../src/render/camera';

describe('Camera', () => {
  it('moves toward a target without teleporting', () => {
    const camera = new Camera();
    camera.follow(100, 50, 0.1);
    expect(camera.x).toBeGreaterThan(0);
    expect(camera.x).toBeLessThan(100);
    expect(camera.y).toBeGreaterThan(0);
    expect(camera.y).toBeLessThan(50);
  });

  it('snaps when initialized', () => {
    const camera = new Camera();
    camera.follow(100, 50, 1);
    expect(camera.x).toBeCloseTo(100, 1);
    expect(camera.y).toBeCloseTo(50, 1);
  });
});
