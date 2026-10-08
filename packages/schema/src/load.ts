import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { brandSchema } from './brand.ts';
import type { LoadedBrand } from './dataset.ts';
import { districtShapesSchema, type DistrictShapes } from './geo.ts';
import {
  categoriesFileSchema,
  productsFileSchema,
  regionsFileSchema,
  sustainabilityFileSchema,
  tagsFileSchema,
  type Taxonomy,
} from './taxonomy.ts';

export class DataError extends Error {
  file: string;

  constructor(message: string, file: string) {
    super(`${file}: ${message}`);
    this.name = 'DataError';
    this.file = file;
  }
}

function readYaml(path: string): unknown {
  try {
    return parse(readFileSync(path, 'utf8'));
  } catch (cause) {
    throw new DataError(`invalid YAML (${(cause as Error).message})`, path);
  }
}

function parseWith<T extends z.ZodType>(schema: T, value: unknown, file: string): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new DataError(`schema validation failed\n${details}`, file);
  }
  return result.data;
}

export function loadTaxonomy(dataDir: string): Taxonomy {
  const dir = join(dataDir, 'taxonomy');
  const file = (name: string) => join(dir, name);
  return {
    categories: parseWith(
      categoriesFileSchema,
      readYaml(file('categories.yaml')),
      'data/taxonomy/categories.yaml',
    ),
    tags: parseWith(tagsFileSchema, readYaml(file('tags.yaml')), 'data/taxonomy/tags.yaml'),
    products: parseWith(
      productsFileSchema,
      readYaml(file('products.yaml')),
      'data/taxonomy/products.yaml',
    ),
    regions: parseWith(
      regionsFileSchema,
      readYaml(file('regions.yaml')),
      'data/taxonomy/regions.yaml',
    ),
    sustainability: parseWith(
      sustainabilityFileSchema,
      readYaml(file('sustainability.yaml')),
      'data/taxonomy/sustainability.yaml',
    ),
  };
}

/** District outlines for the map. JSON is YAML, so the same reader parses it. */
export function loadDistrictShapes(dataDir: string): DistrictShapes {
  return parseWith(
    districtShapesSchema,
    readYaml(join(dataDir, 'geo', 'districts.geojson')),
    'data/geo/districts.geojson',
  );
}

export function loadBrands(dataDir: string): LoadedBrand[] {
  const dir = join(dataDir, 'brands');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort()
    .map((name) => {
      const relative = `data/brands/${name}`;
      return {
        file: relative,
        fileSlug: basename(name).replace(/\.ya?ml$/, ''),
        data: parseWith(brandSchema, readYaml(join(dir, name)), relative),
      };
    });
}
