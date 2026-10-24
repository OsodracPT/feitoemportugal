import type { Brand } from '@fep/schema';
import type { SearchDoc } from './search-config.ts';
import { localized, paths } from './i18n.ts';
import {
  brands,
  getCategory,
  getMunicipality,
  getRegion,
  getSubcategory,
  getCertification,
  getPractice,
  getProduct,
  getTag,
} from './data.ts';

const SUSTAINABILITY_WORDS = ['sustentável', 'sustentabilidade', 'ecológico', 'sustainable', 'sustainability', 'eco'];

const join = (parts: (string | undefined | null)[]): string =>
  parts.filter(Boolean).join(' ');

function docFor(brand: Brand): SearchDoc {
  const category = getCategory(brand.category);
  const subcategory = brand.subcategory
    ? getSubcategory(brand.category, brand.subcategory)
    : undefined;
  const region = brand.location ? getRegion(brand.location.district) : undefined;
  const municipality =
    brand.location?.municipality && region
      ? getMunicipality(region.id, brand.location.municipality)
      : undefined;

  // Tag synonyms are what make "sapatos" find a brand tagged `calcado`.
  const tags = brand.tags.flatMap((id) => {
    const tag = getTag(id);
    if (!tag) return [];
    return [tag.label.pt, tag.label.en, ...tag.synonyms.pt, ...tag.synonyms.en];
  });
  // Product types weigh like tags: "azeite" or "talheres" is what people type.
  const productTerms = brand.products.flatMap((id) => {
    const product = getProduct(id);
    if (!product) return [];
    return [
      product.label.pt,
      product.label.en,
      ...product.synonyms.pt,
      ...product.synonyms.en,
    ];
  });

  // Practices and certifications are what "sustentável" or "reciclado" mean
  // here; any of them makes the brand answer the general word too.
  const practices = brand.sustainability?.practices ?? [];
  const certifications = brand.sustainability?.certifications ?? [];
  const sustainabilityTerms = [
    ...practices.flatMap((id) => {
      const practice = getPractice(id);
      return practice ? [practice.label.pt, practice.label.en] : [];
    }),
    ...certifications.flatMap(({ id }) => {
      const certification = getCertification(id);
      return certification ? [certification.label.pt, certification.label.en] : [];
    }),
  ];
  if (sustainabilityTerms.length > 0) sustainabilityTerms.push(...SUSTAINABILITY_WORDS);

  return {
    id: brand.slug,
    name: join([brand.name, brand.slug.replace(/-/g, ' '), ...(brand.alt_names ?? [])]),
    tags: join([...tags, ...productTerms, ...sustainabilityTerms]),
    // Category synonyms let a query mix a product word with an audience:
    // "sapato de criança" finds a brand filed under Calçado de criança.
    category: join([
      category?.label.pt,
      category?.label.en,
      ...(category?.synonyms.pt ?? []),
      ...(category?.synonyms.en ?? []),
      subcategory?.label.pt,
      subcategory?.label.en,
      ...(subcategory?.synonyms.pt ?? []),
      ...(subcategory?.synonyms.en ?? []),
    ]),
    region: join([region?.label.pt, region?.label.en, municipality?.name]),
    description: join([brand.description.pt, brand.description.en]),
    display: {
      name: brand.name,
      pt: {
        label: join([
          localized((subcategory ?? category)?.label, 'pt'),
          region ? `· ${localized(region.label, 'pt')}` : '',
        ]),
        url: paths.brand('pt', brand.slug),
      },
      en: {
        label: join([
          localized((subcategory ?? category)?.label, 'en'),
          region ? `· ${localized(region.label, 'en')}` : '',
        ]),
        url: paths.brand('en', brand.slug),
      },
    },
  };
}

/**
 * One document per published brand. Search has to cover both languages at
 * once, so each document carries the Portuguese and the English text together
 * and a single index serves both.
 */
export const searchDocs = (): SearchDoc[] => brands.map(docFor);

export type { SearchDoc } from './search-config.ts';

