import { normalizePinyin } from '../core/pinyin';

export class LetterStream {
  private lastNormalized = '';

  ingestPreview(text: string): string[] {
    const normalized = normalizePinyin(text);
    if (!normalized.startsWith(this.lastNormalized)) {
      this.lastNormalized = '';
    }
    const added = normalized.slice(this.lastNormalized.length);
    this.lastNormalized = normalized;
    return [...added];
  }

  endComposition(): void {
    queueMicrotask(() => this.reset());
  }

  reset(): void {
    this.lastNormalized = '';
  }
}

export type NativeKeyboardCallbacks = {
  onLetters(letters: string[]): void;
  onFocusLost?(): void;
};

export class NativeKeyboard {
  private readonly stream = new LetterStream();
  private composing = false;
  private readonly cleanup: Array<() => void> = [];

  constructor(
    private readonly input: HTMLInputElement,
    private readonly callbacks: NativeKeyboardCallbacks,
  ) {
    this.listen('compositionstart', () => {
      this.composing = true;
      this.stream.reset();
    });
    this.listen('compositionupdate', (event) => {
      const data = (event as CompositionEvent).data ?? '';
      this.callbacks.onLetters(this.stream.ingestPreview(data));
    });
    this.listen('compositionend', (event) => {
      this.composing = false;
      const data = (event as CompositionEvent).data ?? '';
      const added = this.stream.ingestPreview(data);
      this.callbacks.onLetters(added);
      this.stream.endComposition();
      queueMicrotask(() => { this.input.value = ''; });
    });
    this.listen('beforeinput', (event) => {
      if (this.composing) return;
      const inputEvent = event as InputEvent;
      if (inputEvent.inputType === 'insertText' && inputEvent.data) {
        const letters = normalizePinyin(inputEvent.data);
        if (letters) {
          event.preventDefault();
          this.callbacks.onLetters([...letters]);
          this.input.value = '';
        }
      }
    });
    this.listen('paste', (event) => {
      event.preventDefault();
      const text = (event as ClipboardEvent).clipboardData?.getData('text') ?? '';
      const letters = normalizePinyin(text);
      this.callbacks.onLetters([...letters]);
      this.input.value = '';
    });
    this.listen('blur', () => this.callbacks.onFocusLost?.());
  }

  focus(): void {
    this.input.focus({ preventScroll: true });
  }

  blur(): void {
    this.input.blur();
  }

  destroy(): void {
    for (const remove of this.cleanup) remove();
    this.cleanup.length = 0;
  }

  private listen(type: string, handler: (event: Event) => void): void {
    this.input.addEventListener(type, handler);
    this.cleanup.push(() => this.input.removeEventListener(type, handler));
  }
}
