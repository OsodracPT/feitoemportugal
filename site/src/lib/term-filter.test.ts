import { describe, expect, it } from 'vitest';
import { foldTerm, matchesTerms } from './term-filter.ts';

describe('term filter', () => {
  it('folds accents and case', () => {
    expect(foldTerm('  Peúgas ')).toBe('peugas');
  });

  it('matches word prefixes, all query words required', () => {
    expect(matchesTerms('Meias Socks peúgas', 'peug')).toBe(true);
    expect(matchesTerms('Loiça de mesa Tableware', 'loica mesa')).toBe(true);
    expect(matchesTerms('Loiça de mesa Tableware', 'mesa vidro')).toBe(false);
    expect(matchesTerms('Talheres', 'heres')).toBe(false);
    expect(matchesTerms('Talheres', '')).toBe(true);
  });
});
