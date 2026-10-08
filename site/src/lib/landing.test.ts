import { describe, expect, it } from 'vitest';
import { MIN_BRANDS_FOR_LANDING } from './config.ts';
import {
  brandsInDistrict,
  brandsInDistrictCategory,
  categories,
  landingRegionCategories,
  brandsWithProduct,
  brandsWithTag,
  landingProducts,
  landingRegions,
  landingTags,
  products,
  regions,
  tags,
} from './data.ts';
import { inRegion, paths } from './i18n.ts';
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

describe('category x region pages', () => {
  it('exist for every combination at the threshold, and only those', () => {
    const pages = new Set(landingRegionCategories().map(({ region, category }) => `${region.id}/${category.id}`));
    for (const region of regions) {
      for (const category of categories) {
        const count = brandsInDistrictCategory(region.id, category.id).length;
        expect(pages.has(`${region.id}/${category.id}`)).toBe(count >= MIN_BRANDS_FOR_LANDING);
      }
    }
  });

  it('only sit under a region that has a page of its own', () => {
    const regionPages = new Set(landingRegions().map((region) => region.id));
    for (const { region } of landingRegionCategories()) expect(regionPages.has(region.id)).toBe(true);
  });

  it('never share a URL with each other', () => {
    for (const lang of ['pt', 'en'] as const) {
      const urls = landingRegionCategories().map(({ region, category }) =>
        paths.regionCategory(lang, region.slug[lang], category.slug[lang]),
      );
      expect(new Set(urls).size).toBe(urls.length);
    }
  });

  it('contracts the Portuguese preposition and leaves English alone', () => {
    expect(inRegion('pt', 'aveiro', 'Aveiro')).toBe('em Aveiro');
    expect(inRegion('pt', 'porto', 'Porto')).toBe('no Porto');
    expect(inRegion('en', 'porto', 'Porto')).toBe('in Porto');
    expect(inRegion('en', 'acores', 'Azores')).toBe('in the Azores');
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
