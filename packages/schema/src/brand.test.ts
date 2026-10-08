import { describe, expect, it } from 'vitest';
import { brandSchema, type BrandInput } from './brand.ts';

const base: BrandInput = {
  slug: 'exemplo-calcado',
  status: 'published',
  name: 'Exemplo Calçado',
  description: { pt: 'Sapatos de pele feitos à mão.', en: 'Handmade leather shoes.' },
  website: 'https://exemplo.pt',
  category: 'calcado',
  subcategory: 'sapatos-homem',
  tags: ['pele'],
  production: { scope: 'total' },
  meta: { added: '2026-10-04', updated: '2026-10-04', source: 'maintainer' },
};

const parse = (overrides: Partial<BrandInput> = {}) => brandSchema.safeParse({ ...base, ...overrides });
const firstPath = (result: ReturnType<typeof parse>) =>
  result.success ? null : result.error.issues[0]?.path.join('.');

describe('brandSchema', () => {
  it('accepts a minimal valid brand and applies defaults', () => {
    const result = brandSchema.safeParse({ ...base, tags: undefined, status: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      // Nothing is published by accident.
      expect(result.data.status).toBe('draft');
    }
  });

  it('rejects slugs that are not kebab-case', () => {
    expect(firstPath(parse({ slug: 'Exemplo_Calcado' }))).toBe('slug');
  });

  it('requires a Portuguese description', () => {
    expect(firstPath(parse({ description: { pt: '', en: 'Shoes' } }))).toBe('description.pt');
  });

  it('accepts a missing English description (warning lives in the dataset checks)', () => {
    expect(parse({ description: { pt: 'Sapatos.' } }).success).toBe(true);
  });

  it('requires HTTPS websites', () => {
    expect(firstPath(parse({ website: 'http://exemplo.pt' }))).toBe('website');
    expect(firstPath(parse({ website: 'exemplo.pt' }))).toBe('website');
  });

  it('requires production notes when the scope is partial', () => {
    expect(firstPath(parse({ production: { scope: 'parcial' } }))).toBe('production.notes.pt');
    expect(
      parse({ production: { scope: 'parcial', notes: { pt: 'Costura em Portugal.' } } }).success,
    ).toBe(true);
  });

  it('rejects social handles written as @ or as a URL', () => {
    expect(firstPath(parse({ social: { instagram: '@marca' } }))).toBe('social.instagram');
    expect(firstPath(parse({ social: { instagram: 'https://instagram.com/marca' } }))).toBe(
      'social.instagram',
    );
    expect(parse({ social: { instagram: 'marca', facebook: '' } }).success).toBe(true);
  });

  it('caps photos at four', () => {
    expect(firstPath(parse({ media: { photos: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'] } }))).toBe(
      'media.photos',
    );
  });

  it('defaults products to an empty list', () => {
    const result = parse();
    expect(result.success && result.data.products).toEqual([]);
  });

  it('keeps founded between the year 1000 and this year', () => {
    expect(parse({ founded: 1884 }).success).toBe(true);
    expect(firstPath(parse({ founded: 999 }))).toBe('founded');
    expect(firstPath(parse({ founded: new Date().getFullYear() + 1 }))).toBe('founded');
    expect(firstPath(parse({ founded: 1999.5 }))).toBe('founded');
  });

  it('keeps price_range within 1-4', () => {
    expect(firstPath(parse({ price_range: 5 }))).toBe('price_range');
    expect(firstPath(parse({ price_range: 2.5 }))).toBe('price_range');
  });

  it('requires a date and a method once a brand is verified', () => {
    expect(firstPath(parse({ verification: { verified: true } }))).toBe('verification.date');
    expect(
      parse({ verification: { verified: true, date: '2026-10-04', method: 'documentação' } })
        .success,
    ).toBe(true);
  });

  it('rejects an unknown meta.source', () => {
    expect(
      firstPath(
        parse({
          meta: { added: '2026-10-04', updated: '2026-10-04', source: 'twitter' } as unknown as BrandInput['meta'],
        }),
      ),
    ).toBe('meta.source');
  });
});
