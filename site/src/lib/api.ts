/**
 * Public JSON API, generated at build time.
 *
 * Only published brands are exposed. Every response carries the same envelope,
 * so a consumer can tell which version and which build it is reading, and
 * under what licence.
 */
import type { Brand, Category, Product, Region, Tag } from '@fep/schema';
import { brandsInCategory, brandsInDistrict, brandsWithProduct, brands } from './data.ts';
import { SITE } from './config.ts';
import { absolute } from './seo.ts';
import { LANGUAGES, paths } from './i18n.ts';

export const API_VERSION = 'v1';

export const apiPath = (...segments: string[]): string =>
  `/api/${API_VERSION}/${segments.join('/')}`;

export interface Envelope<T> {
  version: string;
  generated_at: string;
  license: { id: string; url: string; attribution: string };
  count?: number;
  data: T;
}

/** One timestamp per build, so every endpoint of a build agrees. */
const generatedAt = new Date().toISOString();

export function envelope<T>(data: T, count?: number): Envelope<T> {
  return {
    version: API_VERSION,
    generated_at: generatedAt,
    license: {
      id: SITE.dataLicense.id,
      url: SITE.dataLicense.url,
      attribution: `Feito em Portugal (${SITE.origin})`,
    },
    ...(count === undefined ? {} : { count }),
    data,
  };
}

/**
 * Pretty-printed: this is an open-data API people read in a browser.
 *
 * No CORS header here on purpose. The build writes plain files, so response
 * headers are dropped; the open CORS header this API promises has to come from
 * the web server instead.
 */
export const jsonResponse = (body: unknown): Response =>
  new Response(`${JSON.stringify(body, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const pageUrls = (slug: string): Record<string, string> =>
  Object.fromEntries(LANGUAGES.map((lang) => [lang, absolute(paths.brand(lang, slug))]));

/** The stored brand, plus where it lives on the site. */
export const apiBrand = (brand: Brand) => ({ ...brand, urls: pageUrls(brand.slug) });

export const apiCategory = (category: Category) => ({
  ...category,
  brands: brandsInCategory(category.id).length,
  subcategories: category.subcategories.map((sub) => ({
    ...sub,
    brands: brands.filter((b) => b.category === category.id && b.subcategory === sub.id).length,
  })),
});

export const apiTag = (tag: Tag) => ({
  ...tag,
  brands: brands.filter((brand) => brand.tags.includes(tag.id)).length,
});

export const apiProduct = (product: Product) => ({
  ...product,
  brands: brandsWithProduct(product.id).length,
});

export const apiRegion = (region: Region) => ({
  ...region,
  brands: brandsInDistrict(region.id).length,
});
