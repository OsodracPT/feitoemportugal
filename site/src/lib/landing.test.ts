import { describe, expect, it } from 'vitest';
import { MIN_BRANDS_FOR_LANDING } from './config.ts';
import {
  brandsInDistrict,
  brandsWithProduct,
  brandsWithTag,
  landingProducts,
  landingRegions,
  landingTags,
  products,
  regions,
  tags,
} from './data.ts';
import { mapShade } from './filters.ts';
import { MAP_HEIGHT, MAP_WIDTH, mapDistricts, projectPoint } from './map.ts';
import { searchDocs } from './search.ts';

describe('landing pages', () => {
  it('only exist above the brand threshold, for products, tags and regions alike', () => {
    const cases = [
      { all: products, landing: landingProducts(), count: (id: string) => brandsWithProduct(id).length },
      { all: tags, landing: landingTags(), count: (id: string) => brandsWithTag(id).length },
      { all: regions, landing: landingRegions(), count: (id: string) => brandsInDistrict(id).length },
    ];
    for (const { all, landing, count } of cases) {
      const ids = new Set(landing.map((entry) => entry.id));
      for (const entry of all) {
        expect(ids.has(entry.id)).toBe(count(entry.id) >= MIN_BRANDS_FOR_LANDING);
      }
    }
  });
});

describe('search', () => {
  it('indexes product types and their synonyms', () => {
    const cutipol = searchDocs().find((doc) => doc.id === 'cutipol');
    expect(cutipol?.tags).toContain('Talheres');
    expect(cutipol?.tags).toContain('flatware');
  });
});

describe('district map', () => {
  it('draws every district once, inside the viewBox', () => {
    expect(mapDistricts.map((d) => d.id).sort()).toEqual(regions.map((r) => r.id).sort());
    for (const district of mapDistricts) {
      // A collapsed projection draws a dot: "M207 194.6z".
      expect(district.d.length).toBeGreaterThan(100);
    }
  });

  it('puts municipality centroids inside the drawing', () => {
    for (const region of regions) {
      for (const municipality of region.municipalities) {
        const [x, y] = projectPoint(region.id, municipality.centroid!);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(MAP_WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(MAP_HEIGHT);
      }
    }
  });

  it('shades by fixed steps', () => {
    expect([0, 1, 2, 3, 5, 6, 10, 11, 40].map(mapShade)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
