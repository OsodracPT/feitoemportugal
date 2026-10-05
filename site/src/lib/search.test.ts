import { describe, expect, it } from 'vitest';
import { createIndex, fold, searchBrands } from './search-client.ts';
import { searchDocs } from './search.ts';

const index = createIndex(searchDocs());
const hits = (query: string, limit = 10): string[] =>
  searchBrands(index, query)
    .slice(0, limit)
    .map((result) => result.id as string);

describe('fold', () => {
  it('strips accents and case', () => {
    expect(fold('Açores')).toBe('acores');
    expect(fold('Calçado')).toBe('calcado');
    expect(fold('Näz')).toBe('naz');
  });
});

describe('brand search', () => {
  it('finds a brand by its exact name', () => {
    expect(hits('citadin')[0]).toBe('citadin');
  });

  it('matches on a prefix, so results appear while typing', () => {
    for (const partial of ['c', 'ci', 'cit', 'cita']) {
      expect(hits(partial, 90)).toContain('citadin');
    }
  });

  it('ignores accents in both directions', () => {
    expect(hits('ecola')).toContain('ecola');
    expect(hits('Ecolã')).toContain('ecola');
    expect(hits('naz')).toContain('naz');
  });

  it('tolerates a small typo', () => {
    expect(hits('josefinas')).toContain('josefinas');
    expect(hits('josefinhas')).toContain('josefinas');
    expect(hits('bordalo pinheiro')).toContain('bordallo-pinheiro');
  });

  it('uses tag synonyms', () => {
    // "sapatos" is a synonym of the `calcado` tag family, not a word in the name.
    const shoes = hits('sapatos', 20);
    expect(shoes).toContain('citadin');
    expect(shoes.length).toBeGreaterThan(1);
  });

  it('searches Portuguese and English at the same time', () => {
    expect(hits('socks', 20)).toContain('chule');
    expect(hits('meias', 20)).toContain('chule');
    expect(hits('leather', 20)).toContain('singular-leather');
    expect(hits('pele', 20)).toContain('singular-leather');
  });

  it('finds brands by category and by region', () => {
    expect(hits('cutelaria', 20)).toContain('herdmar');
    expect(hits('cutlery', 20)).toContain('herdmar');
    expect(hits('guimaraes', 20)).toContain('zouri');
    expect(hits('manteigas', 20)).toContain('ecola');
  });

  it('combines words with AND', () => {
    const results = hits('meias portugal', 20);
    expect(results.length).toBeGreaterThan(0);
    expect(hits('citadin manteigas')).toHaveLength(0);
  });

  it('returns nothing for an empty or unmatched query', () => {
    expect(hits('')).toHaveLength(0);
    expect(hits('   ')).toHaveLength(0);
    expect(hits('zzzzqqq')).toHaveLength(0);
  });

  it('ranks the name above a description mention', () => {
    // "porto" appears in many descriptions; the brand named Claus Porto should win.
    expect(hits('claus porto')[0]).toBe('claus-porto');
  });
});
