import { describe, expect, it } from 'vitest';
import { LetterStream, NativeKeyboard } from '../../src/input/keyboardInput';

describe('LetterStream', () => {
  it('emits only newly added letters during IME composition', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('n')).toEqual(['n']);
    expect(stream.ingestPreview('ni')).toEqual(['i']);
    expect(stream.ingestPreview('nih')).toEqual(['h']);
  });

  it('emits nothing when composition shrinks (mid-composition backspace)', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('nih')).toEqual(['n', 'i', 'h']);
    expect(stream.ingestPreview('ni')).toEqual([]);
    expect(stream.ingestPreview('n')).toEqual([]);
  });

  it('emits only the appended suffix when composition extends', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('ni')).toEqual(['n', 'i']);
    expect(stream.ingestPreview('nih')).toEqual(['h']);
    expect(stream.ingestPreview('niha')).toEqual(['a']);
  });

  it('emits only the changed suffix when composition replaces text', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('nih')).toEqual(['n', 'i', 'h']);
    expect(stream.ingestPreview('nix')).toEqual(['x']);
  });

  it('does not duplicate composition text on end', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('ni')).toEqual(['n', 'i']);
    // compositionend repeats the already-seen data as its final payload.
    expect(stream.ingestPreview('ni')).toEqual([]);
    stream.endComposition();
    expect(stream.ingestPreview('')).toEqual([]);
  });

  it('resets after committed input', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('hao')).toEqual(['h', 'a', 'o']);
    stream.reset();
    expect(stream.ingestPreview('hao')).toEqual(['h', 'a', 'o']);
  });

  it('ignores non-letter preview content', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('你好')).toEqual([]);
    expect(stream.ingestPreview('lǜ')).toEqual(['l', 'v']);
  });
});

class FakeInput extends EventTarget {
  value = '';
  focusCount = 0;
  blurCount = 0;

  focus(_options?: FocusOptions): void {
    this.focusCount += 1;
  }

  blur(): void {
    this.blurCount += 1;
  }
}

function asInput(fake: FakeInput): HTMLInputElement {
  return fake as unknown as HTMLInputElement;
}

function fire(target: EventTarget, type: string, props: Record<string, unknown> = {}): Event {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, props);
  target.dispatchEvent(event);
  return event;
}

function setup(callbacks?: { onFocusLost?(): void }) {
  const input = new FakeInput();
  const letters: string[] = [];
  const keyboard = new NativeKeyboard(asInput(input), {
    onLetters: (next) => letters.push(...next),
    onFocusLost: callbacks?.onFocusLost,
  });
  return { input, letters, keyboard };
}

describe('NativeKeyboard', () => {
  it('emits composition letters once and does not duplicate the final data', () => {
    const { input, letters, keyboard } = setup();

    fire(input, 'compositionstart');
    fire(input, 'compositionupdate', { data: 'n' });
    fire(input, 'compositionupdate', { data: 'ni' });
    fire(input, 'compositionupdate', { data: 'nih' });
    fire(input, 'compositionend', { data: 'nih' });

    expect(letters).toEqual(['n', 'i', 'h']);
    keyboard.destroy();
  });

  it('emits normalized letters and prevents default for insertText', () => {
    const { input, letters, keyboard } = setup();
    input.value = 'stale';

    const event = fire(input, 'beforeinput', { inputType: 'insertText', data: 'Ní' });

    expect(letters).toEqual(['n', 'i']);
    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('');
    keyboard.destroy();
  });

  it('prevents default and emits nothing for non-letter insertText', () => {
    const { input, letters, keyboard } = setup();

    for (const data of [' ', '\n', '7', '!', '你好']) {
      const event = fire(input, 'beforeinput', { inputType: 'insertText', data });
      expect(event.defaultPrevented).toBe(true);
      expect(input.value).toBe('');
    }

    expect(letters).toEqual([]);
    keyboard.destroy();
  });

  it('normalizes pasted text and prevents the default paste', () => {
    const { input, letters, keyboard } = setup();

    const event = fire(input, 'paste', {
      clipboardData: { getData: () => 'Nǐ Hǎo!' },
    });

    expect(letters).toEqual(['n', 'i', 'h', 'a', 'o']);
    expect(event.defaultPrevented).toBe(true);
    keyboard.destroy();
  });

  it('calls onFocusLost when the input blurs', () => {
    let blurs = 0;
    const { input, keyboard } = setup({ onFocusLost: () => { blurs += 1; } });

    fire(input, 'blur');

    expect(blurs).toBe(1);
    keyboard.destroy();
  });

  it('focus and blur delegate to the wrapped input', () => {
    const { input, keyboard } = setup();

    keyboard.focus();
    keyboard.blur();

    expect(input.focusCount).toBe(1);
    expect(input.blurCount).toBe(1);
    keyboard.destroy();
  });

  it('removes all listeners on destroy', () => {
    let blurs = 0;
    const { input, letters, keyboard } = setup({ onFocusLost: () => { blurs += 1; } });
    keyboard.destroy();

    fire(input, 'compositionstart');
    fire(input, 'compositionupdate', { data: 'ni' });
    fire(input, 'beforeinput', { inputType: 'insertText', data: 'hao' });
    fire(input, 'paste', { clipboardData: { getData: () => 'hao' } });
    fire(input, 'blur');

    expect(letters).toEqual([]);
    expect(blurs).toBe(0);
  });
});
