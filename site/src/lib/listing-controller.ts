/**
 * Client-side controller for the brand listing: search, the combinable
 * filters, the sort order and the `?q=&cat=…` state in the URL.
 *
 * Runs in the browser, so it stays clear of the data layer — the facets travel
 * on the cards and the search index is fetched on first use.
 */
import {
  activeFilterCount,
  facetCounts,
  orderedSlugs,
  parseFacets,
  parseListingState,
  serializeListingState,
  subParent,
  FILTER_KEYS,
  SORTS,
  type FilterKey,
  type Sort,
} from './filters.ts';
import { isReady, loadIndex, searchBrands } from './search-loader.ts';

/**
 * Wires the listing toolbar, the filter panel and the brand grid together.
 * Called once per page by `BrandBrowser.astro`; does nothing if either the
 * toolbar or the grid is missing.
 */
export function initListing(): void {
  const root = document.querySelector<HTMLElement>('[data-browser]');
  const grid = document.querySelector<HTMLElement>('[data-brand-grid]');
  if (!root || !grid) return;

  const { strings } = JSON.parse(root.dataset.config ?? '{}');

  const form = root.querySelector<HTMLFormElement>('form')!;
  const input = root.querySelector<HTMLInputElement>('[data-search-input]')!;
  const clearSearch = root.querySelector<HTMLButtonElement>('[data-search-clear]')!;
  const sortSelect = root.querySelector<HTMLSelectElement>('[data-sort]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-filters-toggle]')!;
  const toggleBadge = root.querySelector<HTMLElement>('[data-filters-total]')!;
  const chipBox = root.querySelector<HTMLElement>('[data-chips]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;

  const panel = document.querySelector<HTMLElement>('[data-filters-panel]');
  const clearAll = panel?.querySelector<HTMLButtonElement>('[data-filters-clear]') ?? null;
  const groupEls = panel ? Array.from(panel.querySelectorAll<HTMLElement>('[data-group]')) : [];
  const totalLabel = document.querySelector<HTMLElement>('[data-brand-total]');

  const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-slug]'));
  // The cards arrive in the server's order (alphabetical), which is what the
  // "name" sort restores and what "relevance" means without a query.
  const facets = cards.map((card) =>
    parseFacets(card.dataset.slug ?? '', card.dataset.added ?? '', card.dataset.facets ?? ''),
  );
  const total = cards.length;

  const state = parseListingState(window.location.search);
  // A value no option offers can match no brand either — a stale link, or a
  // typo. Dropping it leaves a useful listing instead of an empty one.
  if (panel) {
    for (const key of FILTER_KEYS) {
      state.filters[key] = state.filters[key].filter((value) =>
        panel.querySelector(`[data-group="${key}"] [data-value="${CSS.escape(value)}"]`),
      );
    }
  }
  // A hand-made or trimmed URL can carry a subcategory without its category.
  // Adding the parent back keeps the panel showing what is actually filtered.
  for (const sub of state.filters.sub) {
    const parent = subParent(sub);
    if (parent && !state.filters.cat.includes(parent)) state.filters.cat.push(parent);
  }
  /** Search positions, or null when there is no active query. */
  let rank: Map<string, number> | null = null;

  root.hidden = false;
  if (panel) panel.hidden = false;

  // --- rendering -------------------------------------------------------

  function fill(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
  }

  function updateStatus(count: number) {
    const active = activeFilterCount(state.filters);
    if (totalLabel) totalLabel.hidden = Boolean(state.q) || active > 0;

    if (!state.q && active === 0) {
      status.textContent = '';
      return;
    }
    if (count === 0) {
      status.textContent = state.q
        ? `${fill(strings.searchEmpty, { query: state.q })} ${strings.searchEmptyHint}`
        : `${strings.filtersEmpty} ${strings.filtersEmptyHint}`;
      return;
    }
    if (state.q) {
      status.textContent = count === 1 ? strings.resultsOne : fill(strings.results, { count });
    } else {
      status.textContent =
        count === 1
          ? fill(strings.filteredOne, { total })
          : fill(strings.filtered, { count, total });
    }
  }

  function updateCounts() {
    // Counts reflect the search and every *other* group, so an option shows
    // how many brands it would still leave — the usual faceted count.
    const matched = rank ? new Set(rank.keys()) : null;

    for (const groupEl of groupEls) {
      const key = groupEl.dataset.group as FilterKey;
      const counts = facetCounts(facets, state.filters, key, matched);
      const selected = state.filters[key].length;
      let shown = 0;

      for (const option of groupEl.querySelectorAll<HTMLElement>('.facet__option')) {
        const value = option.dataset.value ?? '';
        const box = option.querySelector<HTMLInputElement>('input')!;
        const count = counts.get(value) ?? 0;
        const parent = option.dataset.parent;
        // The subcategory group is the one that hides options: it only offers
        // the subcategories of the categories that are currently chosen.
        const show = !parent || state.filters.cat.includes(parent);

        option.hidden = !show;
        if (show) shown += 1;
        option.querySelector<HTMLElement>('[data-option-count]')!.textContent = String(count);
        // An option that leads nowhere is dimmed and disabled rather than
        // removed: a panel that empties itself leaves nothing to adjust.
        option.toggleAttribute('data-empty', count === 0);
        box.disabled = count === 0 && !box.checked;
      }

      groupEl.hidden = shown === 0;
      const badge = groupEl.querySelector<HTMLElement>('[data-group-count]')!;
      badge.textContent = String(selected);
      badge.hidden = selected === 0;
    }

    const active = activeFilterCount(state.filters);
    toggleBadge.textContent = String(active);
    toggleBadge.hidden = active === 0;
    if (clearAll) clearAll.hidden = active === 0;
  }

  function updateChips() {
    chipBox.replaceChildren();
    const active = activeFilterCount(state.filters);
    chipBox.hidden = active === 0;
    if (active === 0) return;

    for (const key of FILTER_KEYS) {
      for (const value of state.filters[key]) {
        const option = panel?.querySelector<HTMLElement>(
          `[data-group="${key}"] .facet__option[data-value="${CSS.escape(value)}"]`,
        );
        const label = option?.querySelector('.facet__label')?.textContent?.trim() ?? value;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.title = fill(strings.clearOne, { label });
        chip.append(document.createTextNode(label));
        const cross = document.createElement('span');
        cross.className = 'chip__x';
        cross.setAttribute('aria-hidden', 'true');
        cross.textContent = '×';
        chip.append(cross);
        chip.addEventListener('click', () => {
          setFilter(key, value, false);
          render();
        });
        chipBox.append(chip);
      }
    }
  }

  function render() {
    const visible = orderedSlugs(facets, state, rank);
    const position = new Map(visible.map((slug, index) => [slug, index + 1]));

    for (const card of cards) {
      const place = position.get(card.dataset.slug ?? '');
      card.hidden = place === undefined;
      if (place === undefined) card.style.removeProperty('order');
      else card.style.order = String(place);
    }

    updateStatus(visible.length);
    updateCounts();
    updateChips();
    syncUrl();
  }

  function syncUrl() {
    const query = serializeListingState(state);
    window.history.replaceState(null, '', `${window.location.pathname}${query}`);
  }

  // --- state changes ---------------------------------------------------

  function setFilter(key: FilterKey, value: string, on: boolean) {
    const values = new Set(state.filters[key]);
    if (on) values.add(value);
    else values.delete(value);
    state.filters[key] = [...values];
    // Dropping a category drops the subcategories that belonged to it.
    if (key === 'cat' && !on) {
      state.filters.sub = state.filters.sub.filter((sub) => subParent(sub) !== value);
    }
    syncBoxes();
  }

  function syncBoxes() {
    for (const groupEl of groupEls) {
      const key = groupEl.dataset.group as FilterKey;
      for (const box of groupEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
        box.checked = state.filters[key].includes(box.value);
      }
    }
  }

  let timer: number | undefined;

  async function runSearch(query: string) {
    state.q = query;
    clearSearch.hidden = query.length === 0;

    if (!query) {
      rank = null;
      render();
      return;
    }
    if (!isReady()) status.textContent = strings.loading;
    try {
      const hits = await searchBrands(query);
      // A later keystroke already took over.
      if (state.q !== query) return;
      rank = new Map(hits.map((hit, index) => [hit.id, index]));
    } catch (error) {
      console.error('[search] index failed to load', error);
      status.textContent = strings.error;
      return;
    }
    render();
  }

  // --- wiring ----------------------------------------------------------

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void runSearch(input.value.trim()), 120);
  });

  // Warm the index on first focus so the first keystroke feels instant.
  input.addEventListener('focus', () => void loadIndex().catch(() => {}), { once: true });

  clearSearch.addEventListener('click', () => {
    input.value = '';
    void runSearch('');
    input.focus();
  });

  form.addEventListener('submit', (event) => {
    // Results are already live on this page.
    event.preventDefault();
    window.clearTimeout(timer);
    void runSearch(input.value.trim());
  });

  sortSelect.addEventListener('change', () => {
    const value = sortSelect.value;
    state.sort = (SORTS as readonly string[]).includes(value) ? (value as Sort) : 'relevance';
    render();
  });

  panel?.addEventListener('change', (event) => {
    const box = event.target;
    if (!(box instanceof HTMLInputElement) || box.type !== 'checkbox') return;
    const key = box.closest<HTMLElement>('[data-group]')?.dataset.group as FilterKey | undefined;
    if (!key) return;
    setFilter(key, box.value, box.checked);
    render();
  });

  clearAll?.addEventListener('click', () => {
    for (const key of FILTER_KEYS) state.filters[key] = [];
    syncBoxes();
    render();
  });

  toggle.addEventListener('click', () => {
    if (!panel) return;
    const open = panel.dataset.open !== 'true';
    panel.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  // --- first paint, from the URL ---------------------------------------

  sortSelect.value = state.sort;
  syncBoxes();
  // Open the groups that arrive with something selected.
  for (const groupEl of groupEls) {
    const key = groupEl.dataset.group as FilterKey;
    if (state.filters[key].length > 0 && groupEl instanceof HTMLDetailsElement) {
      groupEl.open = true;
    }
  }
  if (state.q) {
    input.value = state.q;
    clearSearch.hidden = false;
  }
  // Paint the filters straight away. When there is also a query, the search
  // narrows the result once the index arrives, instead of holding the whole
  // grid hostage while it downloads.
  render();
  if (state.q) void runSearch(state.q);
}
