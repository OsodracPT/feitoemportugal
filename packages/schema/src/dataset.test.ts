import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandSchema } from './brand.ts';
import {
  checkBrandReferences,
  validateDataset,
  validateTaxonomy,
  type LoadedBrand,
} from './dataset.ts';
import { validateDistrictShapes } from './geo.ts';
import { loadBrands, loadDistrictShapes, loadTaxonomy } from './load.ts';
import type { Taxonomy } from './taxonomy.ts';

const dataDir = join(fileURLToPath(new URL('../../../', import.meta.url)), 'data');
const taxonomy: Taxonomy = loadTaxonomy(dataDir);

const brand = (overrides: Record<string, unknown> = {}) =>
  brandSchema.parse({
    slug: 'marca-teste',
    status: 'published',
    name: 'Marca Teste',
    description: { pt: 'Descrição.', en: 'Description.' },
    website: 'https://marca-teste.pt',
    category: 'calcado',
    production: { scope: 'total' },
    media: { logo: 'logo.svg' },
    meta: { added: '2026-10-04', updated: '2026-10-04', source: 'maintainer' },
    ...overrides,
  });

const loaded = (
  data: ReturnType<typeof brand>,
  file = 'data/brands/marca-teste.yaml',
): LoadedBrand => ({
  file,
  fileSlug: file.split('/').pop()!.replace('.yaml', ''),
  data,
});

const errors = (issues: { level: string; message: string }[]) =>
  issues.filter((i) => i.level === 'error').map((i) => i.message);

describe('checkBrandReferences', () => {
  it('passes for a brand pointing only at real taxonomy ids', () => {
    const issues = checkBrandReferences(
      brand({ subcategory: 'sapatos-homem', tags: ['pele'] }),
      taxonomy,
      'f.yaml',
    );
    expect(errors(issues)).toEqual([]);
  });

  it('rejects unknown categories, subcategories and tags', () => {
    expect(errors(checkBrandReferences(brand({ category: 'naves' }), taxonomy, 'f.yaml'))).toEqual([
      'unknown category "naves"',
    ]);
    expect(
      errors(checkBrandReferences(brand({ subcategory: 'chapeus' }), taxonomy, 'f.yaml')),
    ).toEqual(['unknown subcategory "chapeus" for category "calcado"']);
    expect(
      errors(checkBrandReferences(brand({ tags: ['pele', 'neon'] }), taxonomy, 'f.yaml')),
    ).toEqual(['unknown tag "neon"']);
  });

  it('rejects unknown product types', () => {
    expect(errors(checkBrandReferences(brand({ products: ['sapatos'] }), taxonomy, 'f.yaml'))).toEqual(
      [],
    );
    expect(
      errors(checkBrandReferences(brand({ products: ['sapatos', 'foguetoes'] }), taxonomy, 'f.yaml')),
    ).toEqual(['unknown product type "foguetoes"']);
  });

  it('rejects unknown practices and certifications', () => {
    const issues = checkBrandReferences(
      brand({
        sustainability: { practices: ['teletransporte'], certifications: [{ id: 'inventado' }] },
      }),
      taxonomy,
      'f.yaml',
    );
    expect(errors(issues)).toEqual([
      'unknown practice "teletransporte"',
      'unknown certification "inventado"',
    ]);
  });

  it('requires a municipality to belong to its district', () => {
    expect(
      errors(
        checkBrandReferences(
          brand({ location: { district: 'aveiro', municipality: 'guimaraes' } }),
          taxonomy,
          'f.yaml',
        ),
      ),
    ).toEqual(['municipality "guimaraes" does not belong to "aveiro"']);

    expect(
      errors(
        checkBrandReferences(
          brand({ location: { district: 'braga', municipality: 'guimaraes' } }),
          taxonomy,
          'f.yaml',
        ),
      ),
    ).toEqual([]);
  });

  it('warns about a missing English description and logo', () => {
    const issues = checkBrandReferences(
      brand({ description: { pt: 'Só português.' }, media: { photos: [] } }),
      taxonomy,
      'f.yaml',
    );
    expect(issues.filter((i) => i.level === 'warning').map((i) => i.path)).toEqual([
      'description.en',
      'media.logo',
    ]);
  });
});

describe('validateDataset', () => {
  it('requires the slug to match the file name', () => {
    const issues = validateDataset(
      [loaded(brand({ slug: 'outra-marca' }), 'data/brands/marca-teste.yaml')],
      taxonomy,
    );
    expect(errors(issues)).toEqual(['slug "outra-marca" must match the file name "marca-teste"']);
  });

  it('reports duplicate slugs and warns on a shared website host', () => {
    const issues = validateDataset(
      [
        loaded(brand(), 'data/brands/marca-teste.yaml'),
        loaded(brand(), 'data/brands/marca-teste.yaml'),
      ],
      taxonomy,
    );
    expect(errors(issues)).toContain('duplicate slug, already used by data/brands/marca-teste.yaml');
    expect(issues.filter((i) => i.level === 'warning').map((i) => i.message)).toContain(
      'same website host as data/brands/marca-teste.yaml',
    );
  });

  it('finds no errors in the repository data', () => {
    expect(errors(validateDataset(loadBrands(dataDir), taxonomy))).toEqual([]);
  });
});

describe('validateDistrictShapes', () => {
  const shapes = loadDistrictShapes(dataDir);

  it('has exactly one shape per district in the repository data', () => {
    expect(errors(validateDistrictShapes(shapes, taxonomy))).toEqual([]);
  });

  it('reports a missing and an unknown district', () => {
    const [first, ...rest] = shapes.features;
    const issues = validateDistrictShapes(
      { ...shapes, features: [...rest, { ...first!, properties: { district: 'atlantida' } }] },
      taxonomy,
    );
    expect(errors(issues)).toEqual([
      'unknown district "atlantida"',
      `district "${first!.properties.district}" has 0 shapes, expected 1`,
    ]);
  });

  it('places every municipality centroid inside the country', () => {
    const missing = taxonomy.regions.flatMap((region) =>
      region.municipalities.filter((m) => !m.centroid).map((m) => m.id),
    );
    expect(missing).toEqual([]);
  });
});

describe('validateTaxonomy', () => {
  it('requires every product type to point at a real category, with unique slugs', () => {
    const [first, second] = taxonomy.products;
    const issues = validateTaxonomy({
      ...taxonomy,
      products: [
        { ...first!, category: 'naves' },
        { ...second!, slug: first!.slug },
      ],
    });
    expect(errors(issues)).toEqual([
      `duplicate product pt slug "${first!.slug.pt}"`,
      `duplicate product en slug "${first!.slug.en}"`,
      `unknown category "naves"`,
    ]);
  });
});
