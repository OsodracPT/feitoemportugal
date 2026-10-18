import type { Brand } from './brand.ts';
import { priceLevel, type Taxonomy } from './taxonomy.ts';

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  level: IssueLevel;
  /** Repository-relative file the issue belongs to. */
  file: string;
  /** Dotted path inside the file, when applicable. */
  path?: string;
  message: string;
}

const error = (file: string, path: string, message: string): Issue => ({
  level: 'error',
  file,
  path,
  message,
});

const warning = (file: string, path: string, message: string): Issue => ({
  level: 'warning',
  file,
  path,
  message,
});

/**
 * Cross-file checks that a per-entry schema cannot express: every id a brand
 * points at has to exist in the taxonomy, and a municipality has to belong to
 * the district it is listed under.
 */
export function checkBrandReferences(brand: Brand, taxonomy: Taxonomy, file: string): Issue[] {
  const issues: Issue[] = [];

  const category = taxonomy.categories.find((c) => c.id === brand.category);
  if (!category) {
    issues.push(error(file, 'category', `unknown category "${brand.category}"`));
  } else if (brand.subcategory) {
    const sub = category.subcategories.find((s) => s.id === brand.subcategory);
    if (!sub) {
      issues.push(
        error(
          file,
          'subcategory',
          `unknown subcategory "${brand.subcategory}" for category "${category.id}"`,
        ),
      );
    }
  }

  for (const [index, tag] of brand.tags.entries()) {
    if (!taxonomy.tags.some((t) => t.id === tag)) {
      issues.push(error(file, `tags[${index}]`, `unknown tag "${tag}"`));
    }
  }

  for (const [index, product] of brand.products.entries()) {
    if (!taxonomy.products.some((p) => p.id === product)) {
      issues.push(error(file, `products[${index}]`, `unknown product type "${product}"`));
    }
  }

  for (const [index, practice] of brand.sustainability?.practices.entries() ?? []) {
    if (!taxonomy.sustainability.practices.some((p) => p.id === practice)) {
      issues.push(
        error(file, `sustainability.practices[${index}]`, `unknown practice "${practice}"`),
      );
    }
  }

  for (const [index, cert] of brand.sustainability?.certifications.entries() ?? []) {
    if (!taxonomy.sustainability.certifications.some((c) => c.id === cert.id)) {
      issues.push(
        error(
          file,
          `sustainability.certifications[${index}].id`,
          `unknown certification "${cert.id}"`,
        ),
      );
    }
  }

  if (brand.location) {
    const region = taxonomy.regions.find((r) => r.id === brand.location?.district);
    if (!region) {
      issues.push(error(file, 'location.district', `unknown district "${brand.location.district}"`));
    } else if (brand.location.municipality) {
      const municipality = region.municipalities.find(
        (m) => m.id === brand.location?.municipality,
      );
      if (!municipality) {
        issues.push(
          error(
            file,
            'location.municipality',
            `municipality "${brand.location.municipality}" does not belong to "${region.id}"`,
          ),
        );
      }
    }
  }

  if (brand.price_range && category) {
    const level = category.price_levels.find((l) => l.level === brand.price_range);
    if (!level) {
      issues.push(
        error(file, 'price_range', `category "${category.id}" has no price level ${brand.price_range}`),
      );
    }
  }

  if (brand.typical_price) {
    const { product: id, eur } = brand.typical_price;
    const product = taxonomy.products.find((p) => p.id === id);
    if (!brand.products.includes(id)) {
      issues.push(error(file, 'typical_price.product', `"${id}" is not one of the brand's products`));
    } else if (product?.price_bands && brand.price_range && priceLevel(product.price_bands, eur) !== brand.price_range) {
      issues.push(
        warning(
          file,
          'price_range',
          `${eur} € puts "${id}" at level ${priceLevel(product.price_bands, eur)}, not ${brand.price_range}`,
        ),
      );
    }
  }

  if (!brand.description.en) {
    issues.push(warning(file, 'description.en', 'English description is recommended'));
  }

  if (!brand.media?.logo) {
    issues.push(warning(file, 'media.logo', 'no logo set — the brand card falls back to initials'));
  }

  return issues;
}

export interface LoadedBrand {
  /** Repository-relative path, e.g. `data/brands/burel-factory.yaml`. */
  file: string;
  /** Slug taken from the file name. */
  fileSlug: string;
  data: Brand;
}

/** Whole-dataset checks: unique slugs, slug/file agreement, duplicate websites. */
export function validateDataset(brands: LoadedBrand[], taxonomy: Taxonomy): Issue[] {
  const issues: Issue[] = [];
  const seenSlugs = new Map<string, string>();
  const seenHosts = new Map<string, string>();

  for (const brand of brands) {
    if (brand.data.slug !== brand.fileSlug) {
      issues.push(
        error(
          brand.file,
          'slug',
          `slug "${brand.data.slug}" must match the file name "${brand.fileSlug}"`,
        ),
      );
    }

    const duplicate = seenSlugs.get(brand.data.slug);
    if (duplicate) {
      issues.push(error(brand.file, 'slug', `duplicate slug, already used by ${duplicate}`));
    } else {
      seenSlugs.set(brand.data.slug, brand.file);
    }

    const host = safeHost(brand.data.website);
    if (host) {
      const other = seenHosts.get(host);
      if (other) {
        issues.push(warning(brand.file, 'website', `same website host as ${other}`));
      } else {
        seenHosts.set(host, brand.file);
      }
    }

    issues.push(...checkBrandReferences(brand.data, taxonomy, brand.file));
  }

  issues.push(...validateTaxonomy(taxonomy));

  return issues;
}

/** Taxonomy self-consistency: unique ids and unique public slugs per language. */
export function validateTaxonomy(taxonomy: Taxonomy): Issue[] {
  const issues: Issue[] = [];

  const checkUnique = (
    file: string,
    path: string,
    values: { key: string; label: string }[],
  ): void => {
    const seen = new Set<string>();
    for (const { key, label } of values) {
      if (seen.has(key)) {
        issues.push(error(file, path, `duplicate ${label} "${key}"`));
      }
      seen.add(key);
    }
  };

  checkUnique(
    'data/taxonomy/categories.yaml',
    'id',
    taxonomy.categories.map((c) => ({ key: c.id, label: 'category id' })),
  );
  for (const lang of ['pt', 'en'] as const) {
    checkUnique(
      'data/taxonomy/categories.yaml',
      `slug.${lang}`,
      taxonomy.categories.map((c) => ({ key: c.slug[lang], label: `category ${lang} slug` })),
    );
  }
  for (const category of taxonomy.categories) {
    checkUnique(
      'data/taxonomy/categories.yaml',
      `${category.id}.subcategories`,
      category.subcategories.map((s) => ({ key: s.id, label: 'subcategory id' })),
    );
    for (const lang of ['pt', 'en'] as const) {
      checkUnique(
        'data/taxonomy/categories.yaml',
        `${category.id}.subcategories.slug.${lang}`,
        category.subcategories.map((s) => ({
          key: s.slug[lang],
          label: `subcategory ${lang} slug`,
        })),
      );
    }
    const levels = category.price_levels.map((l) => l.level).sort((a, b) => a - b);
    if (levels.join(',') !== '1,2,3,4') {
      issues.push(
        error(
          'data/taxonomy/categories.yaml',
          `${category.id}.price_levels`,
          'price levels must be exactly 1, 2, 3 and 4',
        ),
      );
    }
  }

  checkUnique(
    'data/taxonomy/tags.yaml',
    'id',
    taxonomy.tags.map((t) => ({ key: t.id, label: 'tag id' })),
  );
  checkUnique(
    'data/taxonomy/products.yaml',
    'id',
    taxonomy.products.map((p) => ({ key: p.id, label: 'product id' })),
  );
  for (const lang of ['pt', 'en'] as const) {
    checkUnique(
      'data/taxonomy/products.yaml',
      `slug.${lang}`,
      taxonomy.products.map((p) => ({ key: p.slug[lang], label: `product ${lang} slug` })),
    );
  }
  for (const product of taxonomy.products) {
    if (!taxonomy.categories.some((c) => c.id === product.category)) {
      issues.push(
        error(
          'data/taxonomy/products.yaml',
          `${product.id}.category`,
          `unknown category "${product.category}"`,
        ),
      );
    }
  }
  checkUnique(
    'data/taxonomy/regions.yaml',
    'id',
    taxonomy.regions.map((r) => ({ key: r.id, label: 'region id' })),
  );
  for (const region of taxonomy.regions) {
    checkUnique(
      'data/taxonomy/regions.yaml',
      `${region.id}.municipalities`,
      region.municipalities.map((m) => ({ key: m.id, label: 'municipality id' })),
    );
  }
  checkUnique(
    'data/taxonomy/sustainability.yaml',
    'practices',
    taxonomy.sustainability.practices.map((p) => ({ key: p.id, label: 'practice id' })),
  );
  checkUnique(
    'data/taxonomy/sustainability.yaml',
    'certifications',
    taxonomy.sustainability.certifications.map((c) => ({ key: c.id, label: 'certification id' })),
  );

  return issues;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}
