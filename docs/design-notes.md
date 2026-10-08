# Design notes and open points

Background for contributors: why things are built the way they are, and what is
still undecided. For running the code, see the [README](../README.md).

- **No brand is `verified` yet.** 183 brands are published. The first 11 were entered
  by hand; 72 came from the community leads in `docs/leads/`, each checked against the
  brand's own website, and 7 were added from maintainer-confirmed production locations, with the quote that establishes production in
  Portugal recorded in `docs/leads/evidence-2026-10.md`. Another 93 came from the second lead pass
  (see below). The `verified` badge still
  requires a maintainer, and municipalities and price ranges are often absent on
  purpose rather than guessed.
- **83 leads produced no origin claim.** `docs/leads/reddit-2026-10.csv` tracks all 182
  leads with a status (`added`, `no-claim-found`, `no-website`, `rejected`). Those sites
  were searched three ways — visible text, embedded script payloads, and every
  about/production page reachable from the site or its sitemap — and simply never say
  where the product is made. They are leads for outreach, not rejections.
- **Open scope decision:** `fly-london` is produced in Portugal but was created in the
  UK. The project defines itself by production, not origin, which would also admit
  foreign brands manufacturing here (Ecco, Filippa K, Asket). None were added pending
  a maintainer's call.
- **The map is drawn at build time, from official boundaries.** `scripts/import-caop.ts`
  reads CAOP 2025 (DGT, CC BY 4.0) from DGT's public ArcGIS service, writes a centroid
  for each of the 308 municipalities into `regions.yaml`, and dissolves and simplifies
  the municipalities into `data/geo/districts.geojson` with mapshaper, on a shared
  topology so neighbouring districts still meet. The site turns that into plain SVG
  (`site/src/lib/map.ts`): no tile server, no map library in the browser, nothing
  that would contradict "no cookies, no tracking" or the CSP. On the listing the map
  is the `dist` filter drawn as a picture, with the same faceted counts as the
  checkboxes; on a region page it links to the other regions and puts a dot on each
  municipality centroid that has brands, never on an address.
- **The map covers 74 of 183 brands.** `location` is the *production* site, not the
  office or the shop, and most brand sites never say where they manufacture. The
  backfill on 2026-10-08 found six more (see `docs/leads/evidence-2026-10.md`); the
  rest stay empty rather than guessed. More will come from outreach and from leads
  that state it.
- **Product types are a second vocabulary next to tags.** A brand has one category
  but makes many things, and people search for things ("azeite", "meias"), not for
  categories. `products.yaml` only holds types that a published brand makes; 20
  brands have no `products` yet because their descriptions and sites name no
  specific range.
- **Tags have no translated slug.** `/en/tags/pele` uses the Portuguese id. Adding
  `slug: { pt, en }` to `tags.yaml`, as categories and products have, would fix it.
- **Open: link the evidence from the brand page.** The "how we know" block says
  where the claim came from but cannot link the exact page, because evidence stays
  out of the YAML. An optional, link-only `production.source_url` (no quote) would
  let it do so; a maintainer has to agree that this does not break the evidence rule.
- **Open: photos and logos versus CC BY.** Brand photos are not ours to license.
  Before `media` is filled, decide whether media is excluded from the dataset
  licence and collected only with the brand's permission.
- **30 drafts wait for review.** The lead pass of 2026-10-08 (a brand directory, the
  footwear association list, press round-ups, Reddit threads) checked 583 candidates
  and found a production claim for 123. The 93 whose site says in a sentence where or
  how they make things were published; the 30 left rest on a bare "Made in Portugal"
  label, a partial claim or an open point. Each quote is in
  `docs/leads/evidence-sources-2026-10.md`, with the split at the end.
- **Logo is provisional.** Three variants in `site/public/brand/`. Once one is
  chosen, outline the text to paths so it no longer depends on a font.
- **Accent colour** (`--accent`, a deep green) and the **code licence** (MIT or AGPL)
  are still open decisions. No `LICENSE` file ships until the second one is settled.
- **Search and filters are live.** MiniSearch runs in the browser over
  an index built at `/search-index.json`; the chunk is fetched on first focus, so
  nothing loads for visitors who never search. It is accent- and case-insensitive,
  matches on prefixes as you type, tolerates a small typo, uses the tag synonyms, and
  searches Portuguese and English at once. The listing combines the query with filters
  for category, subcategory, region, tag, product type, price, production scope, sustainability
  practice, verification and where to buy, and with a sort order; the whole state lives
  in the URL (`/marcas?q=sapatos&dist=braga&sort=recent`), so any view is shareable.
  The home box shows the top matches as a dropdown.
- **Filters need no second download.** Each card carries its own facets in
  `data-facets`, so filtering, the option counts and the sort are instant and work
  before (and without) the search index. The counts next to each option are faceted:
  they reflect the search and every *other* group, so an option tells you how many
  brands it would leave. A group with no brand behind it is not rendered at all —
  which is why "verified" does not appear yet.
- **"Newest" barely sorts yet.** Every brand was added on one of two days, so
  `meta.added` cannot order them apart yet; the sort becomes meaningful as brands
  arrive over time.
- **One search index, not one per language.** Search covers both languages at the same
  time, so each document already carries its Portuguese and English text; splitting the
  index per language would ship the same strings twice.
- **The API is static and versioned.** Every file under `/api/v1/` is generated at
  build time from the published brands, wrapped in an envelope with `version`,
  `generated_at` and the CC BY 4.0 licence. `/api/v1/schema.json` is the brand JSON
  Schema generated from the Zod schema, so documentation cannot drift from validation;
  the cross-field rules Zod enforces (such as "partial production needs notes") have no
  JSON Schema equivalent and stay with `pnpm validate`. The open CORS header the API
  needs comes from the web server (see `deploy/README.md`), since a static build
  cannot send headers.
- `/search-index.json` is deliberately **not** part of the API: it is an internal
  detail of the search and can change shape at any time.
- Brands are loaded and validated by `packages/schema` rather than through Astro
  content collections, so one Zod schema covers the site, the CLI and CI. Blog
  content (phase 3) will use content collections.
