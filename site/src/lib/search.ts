import type { Brand } from '@fep/schema';
import type { SearchDoc } from './search-config.ts';
import { localized, paths } from './i18n.ts';
import {
  brands,
  getCategory,
  getMunicipality,
  getRegion,
  getSubcategory,
  getProduct,
  getTag,
} from './data.ts';

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

  return {
    id: brand.slug,
    name: join([brand.name, brand.slug.replace(/-/g, ' ')]),
    tags: join([...tags, ...productTerms]),
    category: join([
      category?.label.pt,
      category?.label.en,
      subcategory?.label.pt,
      subcategory?.label.en,
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

