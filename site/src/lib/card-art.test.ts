import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Brand } from '@fep/schema';
import { CATEGORY_TILES, MIN_SOURCES_FOR_LEVEL2, TILES, categoryTile, trustLevel } from './card-art.ts';
import { brands, categories } from './data.ts';

/** Only `verification` drives the trust level, so the rest can be a stub. */
const withVerification = (verification: Brand['verification']): Brand => ({ verification }) as Brand;

const source = { url: 'https://example.com', publisher: 'Example' };

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));

describe('card art', () => {
  it('maps every category to a tile explicitly', () => {
    // A new category would silently fall back to the ceramics tile.
    for (const category of categories) {
      expect(Object.hasOwn(CATEGORY_TILES, category.id), category.id).toBe(true);
    }
    expect(new Set(categories.map((category) => categoryTile(category.id))).size).toBeGreaterThan(1);
  });

  it('ships every tile and shield in both themes', () => {
    for (const theme of ['light', 'dark']) {
      for (const tile of TILES) expect(existsSync(`${publicDir}assets/tiles/tile-${tile}-${theme}.svg`)).toBe(true);
      for (const level of [1, 2, 3]) expect(existsSync(`${publicDir}assets/trust/trust-${level}-${theme}.svg`)).toBe(true);
    }
  });

  it('gives level 3 only to verified brands', () => {
    for (const brand of brands) {
      expect(trustLevel(brand) === 3).toBe(brand.verification?.verified === true);
    }
  });

  it('lifts a brand to level 2 once it has two independent sources', () => {
    expect(trustLevel(withVerification(undefined))).toBe(1);
    expect(trustLevel(withVerification({ verified: false, sources: [] }))).toBe(1);
    expect(trustLevel(withVerification({ verified: false, sources: [source] }))).toBe(1);
    expect(trustLevel(withVerification({ verified: false, sources: [source, source] }))).toBe(2);
    expect(MIN_SOURCES_FOR_LEVEL2).toBe(2);
  });

  it('keeps a verified brand at level 3 regardless of sources', () => {
    expect(trustLevel(withVerification({ verified: true, date: '2026-10-11', method: 'visit', sources: [] }))).toBe(3);
    expect(
      trustLevel(withVerification({ verified: true, date: '2026-10-11', method: 'visit', sources: [source, source] })),
    ).toBe(3);
  });
});
