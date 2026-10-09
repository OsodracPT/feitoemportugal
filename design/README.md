# Feito em Portugal: Azulejo redesign (build handoff)

This folder is the source of truth for the redesign of feitoemportugal.org. It contains the design decisions, tokens, production-ready SVG assets and the reference mockups. Read this whole file before writing code.

## 1. What's in here

| Path | What it is | Use in the build |
|---|---|---|
| `tokens.css` | Colour (light + dark), type, space, radius, focus, reduced-motion | Map onto the site's existing custom properties (§6). Don't add a second token system. |
| `assets/calcada/` | Calçada "mar largo" tile, light and dark (168×60, ≈3 KB gzipped each) | CSS `background` on bands only (§4) |
| `assets/tiles/` | 6 azulejo category tiles × light/dark (≈0.5 KB each) | Brand placeholders and the category panel |
| `assets/logo/` | Hand-stitched shield (cobalt / light-blue / white) + solid favicon | Header, footer, favicon (solid version below 32px) |
| `assets/trust/` | Shield stitched ⅓, ⅔ and fully, light/dark | The trust level on cards and brand pages |
| `assets/map/districts.json` | 18 mainland districts as SVG paths (viewBox `-3 -3 106 209.6`), label points, and an outline offset for the stitched border | District map (§5). If the site's current map data is better, keep it and restyle it instead. |
| `mockups/*.dc.html` | Reference mockups (see §2) | Visual reference only. Never copy their markup or inline styles. |
| `scripts/` | Python that generated the SVGs (`gen.py`: tiles, shield, trust; `calcada2.py`: calçada; `map.py`: map) | Only if an asset needs regenerating |

## 2. Reading the mockups

The `.dc.html` files come from a design tool. Each one is HTML, plus a small template class at the bottom:
- `{{t.xxx}}` is a theme token: `t.bg` → `--fep-bg`, `t.surface2` → `--fep-surface-2`, `t.head` → `--fep-heading`, `t.blue` → `--fep-accent`, `t.onBlue` → `--fep-on-accent`, `t.plate` → `--fep-plate`, `t.dim` → `--fep-ink-dim`.
- `<sc-for>` / `<sc-if>` are loops and conditionals. The sample data is in `renderVals()`.
- Mobile boards (`M-*`) show 360px in light **and** dark. Desktop boards (`D-*`) are 1440px, with a `dark` prop.
- Brand names, descriptions and evidence in the mockups are **fictional placeholders**. Use real data from the site's content collection.

Screens: `M-Home` / `D-Home`, `M-Listing` (list, filters sheet light + dark) / `D-Listing` (sidebar filters, tile grid), `M-Brand` / `D-Brand`, and `Logo` (logo, calçada and tile reference).

## 3. Non-negotiables (from the brief)

- **Mobile first.** Everything works at 360px: no horizontal page scroll, side gutter 16px, touch targets ≥ 44px.
- **Static Astro, almost no JS.** Search, the sentence search and every filter are plain GET forms and links, so they work without JS. JS may only enhance things (e.g. open the filter sheet; the sheet must also work as a `<details>` or a separate `/marcas/filtros` view).
- **Strict CSP: no inline scripts**, no third-party embeds, maps or widgets. Everything is self-hosted.
- **One web font:** Gloock (OFL), one weight, **self-hosted woff2**, subset to Latin + Portuguese (ã õ ç á é í ó ú â ê ô à and €, –, ’, “ ”). Use `font-display: swap` and keep the Georgia fallback. Body text is the system font.
- **Light and dark** follow `prefers-color-scheme`. Both are in `tokens.css`.
- **WCAG AA everywhere.** Text never sits directly on calçada or tile patterns: it's always on a solid surface (plate, medallion, card). Focus is always visible. Respect `prefers-reduced-motion`.
- **No accounts, cookies or tracking.**

## 4. Visual system

- **Palette:** cobalt on limestone, basalt text, with a blue-grey basalt in the calçada. One accent only (cobalt). Never use colour alone for state: selected also shows as fill plus `aria-pressed`/`aria-current`.
- **Type:** Gloock for display (h1–h3, brand names, plates, district labels). The system font for everything else. Caps labels are 12px/700/.12em.
- **Calçada** is an accent, never a page background:
  - hero band (44px mobile / 64px desktop)
  - a thin divider under the listing toolbar (22–24px)
  - footer (72px mobile / 90–110px desktop)
- **Enamel street plate:** the page title on listing and landing pages, and the labels on the category panel. It's a `--fep-plate` fill with white Gloock text and an inset white rule (`outline: 1.5px solid #fff; outline-offset: -5px`).
- **Stitches:** dashed `--fep-stitch` borders mark trust content ("Como sabemos" blocks, island links). The country outline on the map is stitched too (uneven dasharray, see the mockups).

## 5. Components

1. **Header:** shield + "feito em portugal" wordmark (Gloock), nav (Marcas, Regiões, Como sabemos, Dados abertos) and a PT/EN switch (`lang="en"` on the EN link; PT at `/`, EN at `/en`). On mobile: wordmark, EN and a menu button.
2. **Sentence search** (home): "Procuro [input] feito em [district select] [Procurar]". The words are the `<label>`s. It submits to `/marcas?q=…&distrito=…`.
3. **Category panel ("O painel"):** a 2-column (mobile) / 3-column (desktop) grid of category tiles with a 3–4px grout gap (`--fep-line`). Each is a link with a plate label.
4. **District map:** an inline SVG built from `districts.json`.
   - Districts are filled `--fep-map-fill` with a stroke in `--fep-bg` (0.8 user units). Selected districts are `--fep-accent` with `--fep-on-accent` labels.
   - The stitched outline is drawn on top with `pointer-events: none`.
   - On home and region pages, each district is an `<a>` with `aria-label`. In filters it's a toggle (`aria-pressed`, `role="button"` on the `<a>`, plus a hidden checkbox or a link to the filtered URL so it works without JS).
   - Small districts can't meet 44px, so **always pair the map with a district `<select>`/list**, which also holds Açores and Madeira.
5. **Brand card** (list and tile variants):
   - A category tile at `background-size: 38–50px`, with an initials medallion (`--fep-surface` fill, 2px accent border, Gloock).
   - Name, category · district, a 2-line description, and price as `€€` + dim `€€` with `aria-label="Preço 2 de 4"`.
   - Trust icon + label, and a "Produção parcial" pill with a dashed border.
   - "Verificada" is trust level 3, not a separate badge.
   - The whole card is one link.
6. **Trust level:** 1 Declarado / 2 Com fontes / 3 Verificada, using `assets/trust/trust-N-{light,dark}.svg`. Swap light/dark with `<picture><source media="(prefers-color-scheme: dark)">`.
7. **Listing toolbar:** a plate h1 + result count, search, "Filtros · N" button, a sort `<select>`, the view switch Lista / Painel / Mapa (segmented, `aria-pressed`), and removable chips for active filters.
8. **Filters:**
   - Mobile: a bottom sheet (`role="dialog"`) with a sticky "Limpar / Ver N marcas" footer.
   - Desktop: an always-visible sidebar.
   - The filters, as `<fieldset>`s with legends: categoria, subcategoria (shown once a category is chosen), distrito (map + select), tipo de produto, preço 1–4 (segmented), produção total/parcial, só verificadas, sustentabilidade, onde comprar, etiquetas.
9. **Brand page:**
   - A category tile band with a large overlapping medallion, breadcrumb, h1, meta and badges, "Visitar site ↗" plus "Onde comprar", description, "O que faz" chips.
   - **Ficha de origem / Como sabemos**: shield level, a 3-step ladder, "Feito cá / Feito fora", and an evidence list. Each item shows its type, what it shows, a source link and the date checked. Missing evidence is shown dashed, with a link to send proof. The block ends with a "Sugerir correção" link.
   - Then "Onde é feito" (a small static map with only the brand's district filled), "Onde comprar" rows, links (site, Instagram, JSON), and "Também de [distrito]".
10. **Footer:** a calçada band, then `--fep-surface-2` with links to open data (CC BY 4.0), the API, "Sugerir uma marca" and "Sobre", and "Sem contas, sem cookies, sem rastreio."

Not mocked yet, so build them in the same system: category, product-type, tag and region landing pages (plate title + intro + listing; region pages lead with the map), and the empty / no-results states. For no results, keep the active chips, suggest removing the last filter, and link to "Sugerir uma marca".

## 6. Mapping tokens

Search the codebase for the existing custom properties (start with the global stylesheet and the current accent `#11624a`). Map each one to a `--fep-*` token, either by redefining the existing property or by aliasing it, so that components keep working. Put the mapping table in the PR description. Remove the old green accent.

## 7. Suggested build order (one PR each)

1. Tokens + font self-hosting + favicon/logo + header/footer (calçada bands).
2. Brand card (list + tile) with the tile placeholders and trust icons.
3. Listing: toolbar, filters (sidebar + mobile sheet), district map component + select fallback.
4. Brand page incl. "Como sabemos". The evidence data model may need new fields: list them and ask before changing the content schema.
5. Home (sentence search, panel, map, latest brands, trust explainer).
6. Landing pages, empty and no-results states.

After each step:
- Check 360px and 1440px in light and dark.
- Check there's no horizontal scroll at 360px.
- Do a keyboard-only pass.
- Run an automated contrast/a11y check (e.g. axe or pa11y).
- Confirm no inline scripts were added (CSP).
