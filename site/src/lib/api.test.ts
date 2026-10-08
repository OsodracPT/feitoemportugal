import { describe, expect, it } from 'vitest';
import { loadBrands } from '@fep/schema';
import {
  API_VERSION,
  apiBrand,
  apiCategory,
  apiPath,
  apiProduct,
  apiRegion,
  apiTag,
  envelope,
} from './api.ts';
import { brands, categories, products, regions, tags } from './data.ts';

describe('envelope', () => {
  it('states the version, the build and the licence', () => {
    const body = envelope([1, 2, 3], 3);
    expect(body.version).toBe(API_VERSION);
    expect(body.license.id).toBe('CC-BY-4.0');
    expect(body.count).toBe(3);
    expect(body.data).toEqual([1, 2, 3]);
    expect(Number.isNaN(Date.parse(body.generated_at))).toBe(false);
  });

  it('omits the count for a single resource', () => {
    expect(envelope({ slug: 'x' })).not.toHaveProperty('count');
  });
});

describe('payloads', () => {
  it('adds both page URLs to a brand without touching the stored fields', () => {
    const brand = brands[0]!;
    const payload = apiBrand(brand);
    expect(payload.urls.pt).toBe(`https://feitoemportugal.org/marcas/${brand.slug}`);
    expect(payload.urls.en).toBe(`https://feitoemportugal.org/en/brands/${brand.slug}`);
    expect(payload.name).toBe(brand.name);
  });

  it('only exposes published brands', () => {
    expect(brands.every((brand) => brand.status === 'published')).toBe(true);
  });

  it('counts brands per category, tag and region', () => {
    const total = categories.reduce((sum, category) => sum + apiCategory(category).brands, 0);
    expect(total).toBe(brands.length);

    const tagged = tags.filter((tag) => apiTag(tag).brands > 0).length;
    expect(tagged).toBeGreaterThan(0);

    // Every product type is made by at least one brand in data/, drafts included:
    // a type can arrive with a draft, before any brand using it is published.
    const all = loadBrands(import.meta.env.DATA_DIR).map((entry) => entry.data);
    const unused = products.filter((p) => !all.some((brand) => brand.products.includes(p.id)));
    expect(unused.map((p) => p.id)).toEqual([]);
    expect(products.some((product) => apiProduct(product).brands > 0)).toBe(true);

    const located = regions.reduce((sum, region) => sum + apiRegion(region).brands, 0);
    expect(located).toBe(brands.filter((brand) => brand.location).length);
  });
});

describe('apiPath', () => {
  it('is versioned', () => {
    expect(apiPath('brands.json')).toBe('/api/v1/brands.json');
    expect(apiPath('brands', 'naz.json')).toBe('/api/v1/brands/naz.json');
  });
});
