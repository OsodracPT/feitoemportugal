import type { APIRoute } from 'astro';
import {
  brands,
  landingCategories,
  landingSubcategories,
  brandsInCategory,
  brandsInSubcategory,
  lastDataUpdate,
} from '~/lib/data.ts';
import { LANGUAGES, paths, type Lang } from '~/lib/i18n.ts';
import { absolute } from '~/lib/seo.ts';

interface SitemapEntry {
  /** Same page in both languages, so each URL can list its alternates. */
  urls: Record<Lang, string>;
  lastmod: string;
}

const latestUpdate = (list: { meta: { updated: string } }[]): string =>
  list.reduce((latest, item) => (item.meta.updated > latest ? item.meta.updated : latest), lastDataUpdate);

function entries(): SitemapEntry[] {
  const result: SitemapEntry[] = [
    { urls: { pt: paths.home('pt'), en: paths.home('en') }, lastmod: lastDataUpdate },
    { urls: { pt: paths.brands('pt'), en: paths.brands('en') }, lastmod: lastDataUpdate },
    { urls: { pt: paths.categories('pt'), en: paths.categories('en') }, lastmod: lastDataUpdate },
    { urls: { pt: paths.api('pt'), en: paths.api('en') }, lastmod: lastDataUpdate },
  ];

  for (const category of landingCategories()) {
    result.push({
      urls: {
        pt: paths.category('pt', category.slug.pt),
        en: paths.category('en', category.slug.en),
      },
      lastmod: latestUpdate(brandsInCategory(category.id)),
    });

    for (const subcategory of landingSubcategories(category)) {
      result.push({
        urls: {
          pt: paths.subcategory('pt', category.slug.pt, subcategory.slug.pt),
          en: paths.subcategory('en', category.slug.en, subcategory.slug.en),
        },
        lastmod: latestUpdate(brandsInSubcategory(category.id, subcategory.id)),
      });
    }
  }

  for (const brand of brands) {
    result.push({
      urls: { pt: paths.brand('pt', brand.slug), en: paths.brand('en', brand.slug) },
      lastmod: brand.meta.updated,
    });
  }

  return result;
}

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = () => {
  const urls = entries().flatMap((entry) =>
    LANGUAGES.map((lang) => {
      const alternates = [
        ...LANGUAGES.map(
          (other) =>
            `    <xhtml:link rel="alternate" hreflang="${other === 'pt' ? 'pt-PT' : other}" href="${escape(
              absolute(entry.urls[other]),
            )}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escape(absolute(entry.urls.pt))}"/>`,
      ].join('\n');

      return [
        '  <url>',
        `    <loc>${escape(absolute(entry.urls[lang]))}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        alternates,
        '  </url>',
      ].join('\n');
    }),
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
