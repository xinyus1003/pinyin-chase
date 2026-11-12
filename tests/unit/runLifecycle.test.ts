import { describe, expect, it } from 'vitest';
import { stopCurrentRun } from '../../src/core/runLifecycle';

function makeRun() {
  const calls: string[] = [];
  return {
    calls,
    run: {
      loop: { stop: () => { calls.push('loop.stop'); } },
      keyboard: { destroy: () => { calls.push('keyboard.destroy'); } },
      session: { id: 'old' } as { id: string } | null,
    },
  };
}

describe('stopCurrentRun', () => {
  it('stops the active loop, destroys the keyboard and clears the session', () => {
    const { calls, run } = makeRun();

    stopCurrentRun(run);

    expect(calls).toEqual(['loop.stop', 'keyboard.destroy']);
    expect(run.loop).toBeNull();
    expect(run.keyboard).toBeNull();
    expect(run.session).toBeNull();
  });

  it('can be called repeatedly without throwing (idempotent cleanup)', () => {
    const { run } = makeRun();
    stopCurrentRun(run);

    expect(() => stopCurrentRun(run)).not.toThrow();
    expect(run.loop).toBeNull();
    expect(run.keyboard).toBeNull();
    expect(run.session).toBeNull();
  });
});
