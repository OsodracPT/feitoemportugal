import {
  loadBrands,
  loadTaxonomy,
  validateDataset,
  type Brand,
  type Category,
  type Municipality,
  type Product,
  type Region,
  type Subcategory,
  type Tag,
} from '@fep/schema';
import { MIN_BRANDS_FOR_LANDING } from './config.ts';
import type { Lang } from './i18n.ts';

/** Injected by astro.config.mjs so the path survives bundling. */
const dataDir = import.meta.env.DATA_DIR;

export const taxonomy = loadTaxonomy(dataDir);

const loaded = loadBrands(dataDir);
const issues = validateDataset(loaded, taxonomy);
const errors = issues.filter((issue) => issue.level === 'error');
if (errors.length > 0) {
  const details = errors
    .map((issue) => `  ${issue.file}${issue.path ? ` → ${issue.path}` : ''}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid data in data/ (run \`pnpm validate\`):\n${details}`);
}

/** Only published brands reach the site, the API and the sitemap. */
export const brands: Brand[] = loaded
  .filter((entry) => entry.data.status === 'published')
  .map((entry) => entry.data)
  .sort((a, b) => a.name.localeCompare(b.name, 'pt'));

export const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));

export const categories = taxonomy.categories;
export const regions = taxonomy.regions;
export const tags = taxonomy.tags;
export const products = taxonomy.products;

const categoryById = new Map(categories.map((category) => [category.id, category]));
const tagById = new Map(tags.map((tag) => [tag.id, tag]));
const productById = new Map(products.map((product) => [product.id, product]));
const regionById = new Map(regions.map((region) => [region.id, region]));
const practiceById = new Map(taxonomy.sustainability.practices.map((p) => [p.id, p]));
const certificationById = new Map(taxonomy.sustainability.certifications.map((c) => [c.id, c]));

export const getCategory = (id: string): Category | undefined => categoryById.get(id);
export const getTag = (id: string): Tag | undefined => tagById.get(id);
export const getProduct = (id: string): Product | undefined => productById.get(id);
export const getRegion = (id: string): Region | undefined => regionById.get(id);
export const getPractice = (id: string) => practiceById.get(id);
export const getCertification = (id: string) => certificationById.get(id);

export function getSubcategory(categoryId: string, subcategoryId: string): Subcategory | undefined {
  return categoryById.get(categoryId)?.subcategories.find((sub) => sub.id === subcategoryId);
}

export function getMunicipality(
  districtId: string,
  municipalityId: string,
): Municipality | undefined {
  return regionById.get(districtId)?.municipalities.find((m) => m.id === municipalityId);
}

/** Resolves a public, per-language category slug back to its category. */
export function categoryBySlug(slug: string, lang: Lang): Category | undefined {
  return categories.find((category) => category.slug[lang] === slug);
}

export function subcategoryBySlug(
  category: Category,
  slug: string,
  lang: Lang,
): Subcategory | undefined {
  return category.subcategories.find((sub) => sub.slug[lang] === slug);
}

export const brandsInCategory = (categoryId: string): Brand[] =>
  brands.filter((brand) => brand.category === categoryId);

export const brandsInSubcategory = (categoryId: string, subcategoryId: string): Brand[] =>
  brands.filter((brand) => brand.category === categoryId && brand.subcategory === subcategoryId);

export const brandsInDistrict = (districtId: string): Brand[] =>
  brands.filter((brand) => brand.location?.district === districtId);

export const brandsWithProduct = (productId: string): Brand[] =>
  brands.filter((brand) => brand.products.includes(productId));

export const brandsWithTag = (tagId: string): Brand[] =>
  brands.filter((brand) => brand.tags.includes(tagId));

/** Districts and autonomous regions with enough brands for their own landing page. */
export const landingRegions = (): Region[] =>
  regions.filter((region) => brandsInDistrict(region.id).length >= MIN_BRANDS_FOR_LANDING);

export const hasRegionPage = (regionId: string): boolean =>
  brandsInDistrict(regionId).length >= MIN_BRANDS_FOR_LANDING;

/** Resolves a public, per-language region slug back to its region. */
export const regionBySlug = (slug: string, lang: Lang): Region | undefined =>
  regions.find((region) => region.slug[lang] === slug);

/** Product types with enough brands for their own landing page. */
export const landingProducts = (): Product[] =>
  products.filter((product) => brandsWithProduct(product.id).length >= MIN_BRANDS_FOR_LANDING);

export const hasProductPage = (productId: string): boolean =>
  brandsWithProduct(productId).length >= MIN_BRANDS_FOR_LANDING;

/** Tags with enough brands for their own landing page. */
export const landingTags = (): Tag[] =>
  tags.filter((tag) => brandsWithTag(tag.id).length >= MIN_BRANDS_FOR_LANDING);

export const hasTagPage = (tagId: string): boolean =>
  brandsWithTag(tagId).length >= MIN_BRANDS_FOR_LANDING;

/** Categories that have enough brands for their own landing page. */
export const landingCategories = (): Category[] =>
  categories.filter((category) => brandsInCategory(category.id).length >= MIN_BRANDS_FOR_LANDING);

export const hasLandingPage = (category: Category): boolean =>
  brandsInCategory(category.id).length >= MIN_BRANDS_FOR_LANDING;

export const landingSubcategories = (category: Category): Subcategory[] =>
  category.subcategories.filter(
    (sub) => brandsInSubcategory(category.id, sub.id).length >= MIN_BRANDS_FOR_LANDING,
  );

/** Most recently added brands first. */
export const recentBrands = (limit = 6): Brand[] =>
  [...brands]
    .sort((a, b) => b.meta.added.localeCompare(a.meta.added) || a.name.localeCompare(b.name, 'pt'))
    .slice(0, limit);

/**
 * Internal linking: brands that share a subcategory, category, district or tags,
 * scored so the closest matches come first.
 */
export function relatedBrands(brand: Brand, limit = 4): Brand[] {
  const scored = brands
    .filter((other) => other.slug !== brand.slug)
    .map((other) => {
      let score = 0;
      if (other.category === brand.category) score += 3;
      if (brand.subcategory && other.subcategory === brand.subcategory) score += 2;
      if (brand.location && other.location?.district === brand.location.district) score += 2;
      score += other.tags.filter((tag) => brand.tags.includes(tag)).length;
      return { other, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.other.name.localeCompare(b.other.name, 'pt'));

  return scored.slice(0, limit).map((entry) => entry.other);
}

export const stats = {
  brands: brands.length,
  categories: categories.filter((category) => brandsInCategory(category.id).length > 0).length,
  regions: regions.filter((region) => brandsInDistrict(region.id).length > 0).length,
};

/** Latest `meta.updated` across published brands — used for sitemap lastmod. */
export const lastDataUpdate = brands.reduce(
  (latest, brand) => (brand.meta.updated > latest ? brand.meta.updated : latest),
  '1970-01-01',
);
