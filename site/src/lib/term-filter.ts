/**
 * Live filter for the product-type and tag indexes. Client-side.
 *
 * Kept apart from `search-client.ts` on purpose: importing its `fold` would pull
 * MiniSearch into this page's bundle for the sake of one function.
 */

/** "Peúgas" → "peugas": accent- and case-insensitive matching. */
export const foldTerm = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** True when every word of the query starts some word of the haystack. */
export function matchesTerms(haystack: string, query: string): boolean {
  const words = foldTerm(haystack).split(/[^a-z0-9]+/).filter(Boolean);
  return foldTerm(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => words.some((word) => word.startsWith(part)));
}

export function initTermFilter(): void {
  const root = document.querySelector<HTMLElement>('[data-term-filter]');
  if (!root) return;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const status = root.querySelector<HTMLElement>('[data-term-status]')!;
  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-term-group]'));
  root.hidden = false;

  const apply = () => {
    const query = input.value;
    let visible = 0;
    for (const group of groups) {
      let shown = 0;
      for (const item of group.querySelectorAll<HTMLElement>('[data-terms]')) {
        const match = matchesTerms(item.dataset.terms ?? '', query);
        item.hidden = !match;
        if (match) shown += 1;
      }
      group.hidden = shown === 0;
      visible += shown;
    }
    status.hidden = visible > 0;
  };

  input.addEventListener('input', apply);
}
