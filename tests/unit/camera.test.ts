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

  it('resets its position and initialization state', () => {
    const camera = new Camera();
    camera.follow(100, 50, 0.1);

    camera.reset();

    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
    expect(camera.initialized).toBe(false);
  });

  it('can snap directly to a target for reduced motion', () => {
    const camera = new Camera();
    camera.snapTo(120, 45);

    expect(camera.x).toBe(120);
    expect(camera.y).toBe(45);
    expect(camera.initialized).toBe(true);
  });
});
