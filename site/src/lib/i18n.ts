import pt from '../i18n/pt.json';
import en from '../i18n/en.json';

export const LANGUAGES = ['pt', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];
export const DEFAULT_LANG: Lang = 'pt';

/** BCP 47 tags used in <html lang> and hreflang. */
export const HTML_LANG: Record<Lang, string> = { pt: 'pt-PT', en: 'en' };

/** Open Graph wants an underscored locale with a region. */
export const OG_LOCALE: Record<Lang, string> = { pt: 'pt_PT', en: 'en_GB' };

const dictionaries: Record<Lang, unknown> = { pt, en };

/**
 * Looks up a dotted key in the language dictionary and fills `{placeholders}`.
 * Falls back to Portuguese, then to the key itself, so a missing string is
 * visible but never breaks the build.
 */
export function t(
  lang: Lang,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  const value = lookup(dictionaries[lang], key) ?? lookup(dictionaries[DEFAULT_LANG], key);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

function lookup(dictionary: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dictionary);
}

/** Translated URL segments. The single place where route names live. */
export const SEGMENTS = {
  brands: { pt: 'marcas', en: 'brands' },
  categories: { pt: 'categorias', en: 'categories' },
  regions: { pt: 'regioes', en: 'regions' },
  products: { pt: 'produtos', en: 'products' },
  tags: { pt: 'etiquetas', en: 'tags' },
  blog: { pt: 'blog', en: 'blog' },
  submit: { pt: 'submeter', en: 'submit' },
  about: { pt: 'sobre', en: 'about' },
  badge: { pt: 'selo', en: 'badge' },
  press: { pt: 'imprensa', en: 'press' },
  api: { pt: 'api', en: 'api' },
} as const satisfies Record<string, Record<Lang, string>>;

/** Builds an absolute path, prefixing `/en` for English. */
export function href(lang: Lang, ...segments: string[]): string {
  const parts = [...(lang === DEFAULT_LANG ? [] : [lang]), ...segments].filter(Boolean);
  return `/${parts.join('/')}`;
}

export const paths = {
  home: (lang: Lang) => href(lang),
  brands: (lang: Lang) => href(lang, SEGMENTS.brands[lang]),
  brand: (lang: Lang, slug: string) => href(lang, SEGMENTS.brands[lang], slug),
  categories: (lang: Lang) => href(lang, SEGMENTS.categories[lang]),
  category: (lang: Lang, categorySlug: string) =>
    href(lang, SEGMENTS.categories[lang], categorySlug),
  subcategory: (lang: Lang, categorySlug: string, subcategorySlug: string) =>
    href(lang, SEGMENTS.categories[lang], categorySlug, subcategorySlug),
  regions: (lang: Lang) => href(lang, SEGMENTS.regions[lang]),
  region: (lang: Lang, regionSlug: string) => href(lang, SEGMENTS.regions[lang], regionSlug),
  regionCategory: (lang: Lang, regionSlug: string, categorySlug: string) =>
    href(lang, SEGMENTS.regions[lang], regionSlug, categorySlug),
  products: (lang: Lang) => href(lang, SEGMENTS.products[lang]),
  product: (lang: Lang, productSlug: string) => href(lang, SEGMENTS.products[lang], productSlug),
  tags: (lang: Lang) => href(lang, SEGMENTS.tags[lang]),
  tag: (lang: Lang, tagId: string) => href(lang, SEGMENTS.tags[lang], tagId),
  blog: (lang: Lang) => href(lang, SEGMENTS.blog[lang]),
  submit: (lang: Lang) => href(lang, SEGMENTS.submit[lang]),
  about: (lang: Lang) => href(lang, SEGMENTS.about[lang]),
  badge: (lang: Lang) => href(lang, SEGMENTS.badge[lang]),
  press: (lang: Lang) => href(lang, SEGMENTS.press[lang]),
  api: (lang: Lang) => href(lang, SEGMENTS.api[lang]),
} as const;

/** The same page in both languages — feeds hreflang and the language picker. */
export type Alternates = Record<Lang, string>;

export const otherLang = (lang: Lang): Lang => (lang === 'pt' ? 'en' : 'pt');

/** Picks the Portuguese text, falling back to the other language when empty. */
export function localized(
  value: { pt?: string | undefined; en?: string | undefined } | undefined,
  lang: Lang,
): string {
  if (!value) return '';
  if (lang === 'en') return value.en?.trim() || value.pt || '';
  return value.pt?.trim() || value.en || '';
}

const DATE_LOCALE: Record<Lang, string> = { pt: 'pt-PT', en: 'en-GB' };

/** "35 €" / "€35", whole euros unless the price has cents. */
export function formatPrice(eur: number, lang: Lang): string {
  return new Intl.NumberFormat(DATE_LOCALE[lang], {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: Number.isInteger(eur) ? 0 : 2,
  }).format(eur);
}

export function formatDate(date: string, lang: Lang): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * Taxonomy labels are capitalised; inside a sentence the Portuguese ones read
 * better in lower case ("Marcas de calçado…"). English keeps the capital.
 */
/**
 * "em Aveiro", "no Porto", "na Maia", "nas Caldas da Rainha": Portuguese
 * contracts the preposition with the article some place names take, so the
 * exceptions are listed in `place.in` by id — district, autonomous region or
 * municipality (a name shared by both, like Porto, takes the same form).
 * Looked up in the page's own dictionary only, so English never borrows a
 * Portuguese form.
 */
export function inRegion(lang: Lang, placeId: string, placeName: string): string {
  const form = lookup(dictionaries[lang], `place.in.${placeId}`);
  if (typeof form === 'string') return form;
  return t(lang, 'place.in.default', { region: placeName });
}

/**
 * The same phrase split in two, for markup that sets the name apart
 * ("no <strong>Porto</strong>"). A form that does not end in the name is
 * returned whole as the name.
 */
export function inPlaceParts(lang: Lang, placeId: string, placeName: string): { prep: string; name: string } {
  const form = inRegion(lang, placeId, placeName);
  return form.endsWith(placeName)
    ? { prep: form.slice(0, -placeName.length).trimEnd(), name: placeName }
    : { prep: '', name: form };
}

export function labelInSentence(label: string, lang: Lang): string {
  if (lang !== 'pt') return label;
  return label.charAt(0).toLocaleLowerCase('pt-PT') + label.slice(1);
}
