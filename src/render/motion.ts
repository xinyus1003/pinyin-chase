export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export type MotionPolicy = {
  snapPosition: boolean;
  animateCharacters: boolean;
  showParticles: boolean;
};

export function motionPolicy(reducedMotion: boolean): MotionPolicy {
  return {
    snapPosition: reducedMotion,
    animateCharacters: !reducedMotion,
    showParticles: !reducedMotion,
  };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
