import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATEGORY_TILES, TILES, categoryTile, trustLevel } from './card-art.ts';
import { brands, categories } from './data.ts';

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
});
