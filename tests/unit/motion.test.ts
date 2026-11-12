import { describe, expect, it } from 'vitest';
import { motionPolicy } from '../../src/render/motion';

describe('renderer motion policy', () => {
  it('keeps smooth motion and particles when reduced motion is not requested', () => {
    expect(motionPolicy(false)).toEqual({
      snapPosition: false,
      animateCharacters: true,
      showParticles: true,
    });
  });

  it('snaps positions and suppresses character motion and particles when reduced', () => {
    expect(motionPolicy(true)).toEqual({
      snapPosition: true,
      animateCharacters: false,
      showParticles: false,
    });
  });
});
