import type { Brand, Category, Subcategory } from '@fep/schema';
import { SITE } from './config.ts';
import { HTML_LANG, localized, paths, t, type Alternates, type Lang } from './i18n.ts';

export const absolute = (path: string): string => new URL(path, SITE.origin).href;

export const truncate = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/[\s,;:.]+\S*$/, '')}…`;
};

/** First sentence of a text, useful for title templates. */
export const firstSentence = (text: string): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const end = clean.search(/[.!?](\s|$)/);
  return end === -1 ? clean : clean.slice(0, end);
};

/** "<page> | Feito em Portugal" — the site name is never duplicated. */
export function pageTitle(title: string, lang: Lang): string {
  const name = t(lang, 'site.name');
  return title === name ? name : `${title} | ${name}`;
}

/**
 * "Burel Factory — Mantas e plaids, Guarda | Feito em Portugal":
 * unique per brand, short enough to survive in search results.
 */
export function brandTitle(
  brand: Brand,
  context: { category?: Category | undefined; subcategory?: Subcategory | undefined; regionLabel?: string | undefined },
  lang: Lang,
): string {
  const label = context.subcategory
    ? localized(context.subcategory.label, lang)
    : context.category
      ? localized(context.category.label, lang)
      : '';
  const parts = [label, context.regionLabel].filter(Boolean).join(', ');
  return pageTitle(parts ? `${brand.name} — ${parts}` : brand.name, lang);
}

export function brandDescription(brand: Brand, lang: Lang): string {
  return truncate(localized(brand.description, lang), 155);
}

export interface Crumb {
  name: string;
  /** Absolute path; omitted on the current page. */
  path?: string;
}

export interface JsonLdNode {
  '@context'?: string;
  '@type': string;
  [key: string]: unknown;
}

export function websiteJsonLd(lang: Lang): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t(lang, 'site.name'),
    url: absolute(paths.home(lang)),
    inLanguage: HTML_LANG[lang],
    description: t(lang, 'site.description'),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absolute(paths.brands(lang))}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absolute(crumb.path) } : {}),
    })),
  };
}

export function itemListJsonLd(brands: Brand[], lang: Lang): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: brands.length,
    itemListElement: brands.map((brand, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absolute(paths.brand(lang, brand.slug)),
      name: brand.name,
    })),
  };
}

const SOCIAL_URLS: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  linkedin: (h) => `https://www.linkedin.com/company/${h}`,
  pinterest: (h) => `https://www.pinterest.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
};

export function socialLinks(brand: Brand): { network: string; handle: string; url: string }[] {
  if (!brand.social) return [];
  return Object.entries(brand.social)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([network, handle]) => ({
      network,
      handle,
      url: SOCIAL_URLS[network]?.(handle) ?? `https://${network}.com/${handle}`,
    }));
}

export function brandJsonLd(
  brand: Brand,
  lang: Lang,
  context: { category?: Category; subcategory?: Subcategory; districtLabel?: string },
): JsonLdNode {
  const sameAs = socialLinks(brand).map((link) => link.url);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: brand.website,
    description: brandDescription(brand, lang),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(context.districtLabel
      ? {
          address: {
            '@type': 'PostalAddress',
            addressRegion: context.districtLabel,
            addressCountry: 'PT',
          },
        }
      : {}),
    ...(context.category
      ? { knowsAbout: localized(context.subcategory?.label ?? context.category.label, lang) }
      : {}),
    mainEntityOfPage: absolute(paths.brand(lang, brand.slug)),
  };
}

export function faqJsonLd(
  faq: { question: string; answer: string }[],
): JsonLdNode | null {
  if (faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

/** Both language URLs plus x-default, ready for <link rel="alternate">. */
export function hreflangLinks(alternates: Alternates): { hreflang: string; href: string }[] {
  return [
    { hreflang: 'pt-PT', href: absolute(alternates.pt) },
    { hreflang: 'en', href: absolute(alternates.en) },
    { hreflang: 'x-default', href: absolute(alternates.pt) },
  ];
}
