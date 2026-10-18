import { describe, expect, it } from 'vitest';
import { wrapIndex } from './lightbox.ts';

describe('wrapIndex', () => {
  it('leaves an in-range index untouched', () => {
    expect(wrapIndex(0, 3)).toBe(0);
    expect(wrapIndex(2, 3)).toBe(2);
  });

  it('wraps past the end back to the start', () => {
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(4, 3)).toBe(1);
  });

  it('wraps before the start round to the end', () => {
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(-3, 3)).toBe(0);
  });

  it('is safe for an empty gallery', () => {
    expect(wrapIndex(0, 0)).toBe(0);
    expect(wrapIndex(-1, 0)).toBe(0);
  });
});
