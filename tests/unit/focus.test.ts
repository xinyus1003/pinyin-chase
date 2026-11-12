import { describe, expect, it, vi } from 'vitest';
import { preventFocusTransfer } from '../../src/ui/focus';

describe('preventFocusTransfer', () => {
  it('cancels the pointer event default action that would move focus', () => {
    const event = { preventDefault: vi.fn() };

    preventFocusTransfer(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });
});
