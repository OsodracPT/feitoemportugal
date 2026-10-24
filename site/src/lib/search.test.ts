import { describe, expect, it } from 'vitest';
import { createIndex, fold, searchBrands } from './search-client.ts';
import { searchDocs } from './search.ts';
import golden from './search-golden.json' with { type: 'json' };

interface GoldenQuery {
  q: string;
  expect?: string[];
  absent?: string[];
}

const index = createIndex(searchDocs());
const hits = (query: string, limit = 10): string[] =>
  searchBrands(index, query)
    .hits.slice(0, limit)
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
    expect(hits('leather', 100)).toContain('singular-leather');
    expect(hits('pele', 100)).toContain('singular-leather');
  });

  it('finds brands by category and by region', () => {
    expect(hits('cutelaria', 20)).toContain('herdmar');
    expect(hits('cutlery', 20)).toContain('herdmar');
    expect(hits('guimaraes', 20)).toContain('zouri');
    expect(hits('manteigas', 20)).toContain('ecola');
  });

  it('combines a product word with an audience', () => {
    // zas-tras is filed under Calçado de criança and sanjo is tagged
    // `crianca`; neither says "sapato" in its own words.
    for (const query of ['sapato de criança', 'sapatos infantis', 'kids shoes']) {
      expect(hits(query, 20)).toContain('zas-tras');
      expect(hits(query, 20)).toContain('sanjo');
    }
  });

  it('does not let a typo turn one word into another', () => {
    // linho, pinho, care: one letter away, and wrong.
    expect(hits('vinho', 50)).not.toContain('vibae');
    expect(hits('gin', 50)).not.toContain('baby-gi');
    expect(hits('café', 50)).not.toContain('bamandboo');
  });

  it('ignores joining words', () => {
    expect(hits('sapatos de criança')).toEqual(hits('sapatos criança'));
    expect(hits('socks for men')).toEqual(hits('socks men'));
  });

  it('falls back to brands with some of the words, and says so', () => {
    const outcome = searchBrands(index, 'meias zzzzqqq');
    expect(outcome.partial).toBe(true);
    expect(outcome.hits.map((hit) => hit.id)).toContain('chule');
    expect(searchBrands(index, 'meias').partial).toBe(false);
    expect(searchBrands(index, 'zzzzqqq')).toEqual({ hits: [], partial: false });
  });

  it('combines words with AND', () => {
    const results = hits('meias portugal', 20);
    expect(results.length).toBeGreaterThan(0);
    // No brand is both: the fallback shows brands with either word, marked partial.
    expect(searchBrands(index, 'citadin manteigas').partial).toBe(true);
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

/**
 * Queries people actually typed (site analytics) and what they must find.
 * Add one whenever a real search disappoints; `absent` guards against noise.
 */
describe('real searches', () => {
  for (const { q, expect: wanted = [], absent = [] } of golden as GoldenQuery[]) {
    it(q, () => {
      const found = hits(q, 30);
      for (const slug of wanted) expect(found, `${q} → ${slug}`).toContain(slug);
      for (const slug of absent) expect(found, `${q} ↛ ${slug}`).not.toContain(slug);
    });
  }
});
