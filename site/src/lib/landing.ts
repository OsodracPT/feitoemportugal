import type { Brand } from '@fep/schema';
import { getMunicipality } from './data.ts';
import { HTML_LANG, t, type Lang } from './i18n.ts';

const MAX_PLACES = 3;
const MAX_NAMES = 4;

const list = (items: string[], lang: Lang): string =>
  new Intl.ListFormat(HTML_LANG[lang], { type: 'conjunction' }).format(items);

/**
 * A sentence or two that only this set of brands can produce — where they
 * make things and who they are — so every landing page has its own text and
 * meta description, not just a count.
 */
export function brandsSummary(brands: Brand[], lang: Lang): string {
  const towns = new Map<string, number>();
  for (const brand of brands) {
    if (!brand.location?.municipality) continue;
    const name = getMunicipality(brand.location.district, brand.location.municipality)?.name;
    if (name) towns.set(name, (towns.get(name) ?? 0) + 1);
  }
  const places = [...towns]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'))
    .slice(0, MAX_PLACES)
    .map(([name]) => name);
  // Brands with photos first: they are the ones a reader can judge at a glance.
  const names = [...brands]
    .sort((a, b) => Number(Boolean(b.media?.photos?.length)) - Number(Boolean(a.media?.photos?.length)))
    .slice(0, MAX_NAMES)
    .map((brand) => brand.name);

  const sentences: string[] = [];
  if (places.length >= 2) sentences.push(t(lang, 'landing.madeIn', { places: list(places, lang) }));
  if (names.length >= 2) sentences.push(t(lang, 'landing.including', { names: list(names, lang) }));
  return sentences.join(' ');
}
