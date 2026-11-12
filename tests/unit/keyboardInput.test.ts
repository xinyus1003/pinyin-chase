import { describe, expect, it } from 'vitest';
import { LetterStream } from '../../src/input/keyboardInput';

describe('LetterStream', () => {
  it('emits only newly added letters during IME composition', () => {
    const stream = new LetterStream();
    expect(stream.ingestPreview('n')).toEqual(['n']);
    expect(stream.ingestPreview('ni')).toEqual(['i']);
    expect(stream.ingestPreview('nih')).toEqual(['h']);
  });

  it('does not duplicate composition text on end', () => {
    const stream = new LetterStream();
    stream.ingestPreview('ni');
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
