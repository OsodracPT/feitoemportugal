# Feito em Portugal

Open, community-run database of brands that manufacture in Portugal.
Code and data live in this repository; the site is a static Astro build.

**Status: phases 1 and 2 complete** — monorepo, shared Zod schema, taxonomy, 90
brands, visual identity, bilingual Astro site with translated URLs, brand and
category pages, technical SEO, client-side search, combinable filters with sort
order and shareable URLs, and the public JSON API at `/api/v1/`.

## Requirements

- Node 22+ (type stripping is used to run `.ts` scripts directly)
- pnpm 10+ (`curl -fsSL https://get.pnpm.io/install.sh | sh -`)

## Run it locally

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

Other commands:

```bash
pnpm build        # static build into site/dist
pnpm preview      # serve the build
pnpm validate     # validate data/ (schema + cross-references)
pnpm test         # schema and data tests (vitest)
pnpm typecheck    # tsc + astro check
```

`SITE_URL` overrides the canonical origin for a build
(`SITE_URL=http://localhost:4321 pnpm build`), and `GITHUB_REPO_URL` sets the
repository used in "suggest a correction" links.

## Repository layout

```
data/brands/<slug>.yaml     one brand per file (the source of truth)
data/taxonomy/              categories, tags, regions, sustainability
packages/schema/            shared Zod schema + loaders + dataset checks
site/                       Astro site (pt at /, en at /en)
site/src/pages/api/v1/      the public JSON API, generated at build time
.github/workflows/validate.yml  data, types, tests and build on every PR
.github/workflows/deploy.yml    same gates, then ships main to the server
deploy/                     nginx origin, compose file, deploy gate (see deploy/README.md)
scripts/validate-data.ts    runs in CI and via `pnpm validate`
docs/collecting-brand-data.md  brief for researching and filling one brand
docs/leads/                 community leads and the evidence behind each import
assets/brands/<slug>/       brand logos and photos (empty for now)
```

## Deploy

Every push to `main` is built and published to https://feitoemportugal.org by
`.github/workflows/deploy.yml`. The site is served by nginx behind the Pangolin reverse
proxy on the project VPS; topology, rollback and the traps are in
[`deploy/README.md`](deploy/README.md).

## Adding or editing a brand

1. Copy an existing file in `data/brands/` and edit it. The file name must equal
   `slug`.
2. `status: draft` keeps a brand out of the site, the API and the sitemap;
   `published` makes it visible.
3. Every `category`, `subcategory`, `tag`, `practice`, `certification`,
   `district` and `municipality` must exist in `data/taxonomy/`.
4. Run `pnpm validate`. Errors fail the build; warnings (missing English
   description, missing logo) are advisory.

The Zod schema in `packages/schema` is the single source of truth, shared by the
site, CI and (from phase 5) the submission API.

## Notes and open points carried into the next phases

- **No brand is `verified` yet.** 90 brands are published. The first 11 were entered
  by hand; 72 came from the community leads in `docs/leads/`, each checked against the
  brand's own website, and 7 were added from maintainer-confirmed production locations, with the quote that establishes production in
  Portugal recorded in `docs/leads/evidence-2026-10.md`. The `verified` badge still
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
- **Municipality centroids are partial.** `data/taxonomy/regions.yaml` has all
  308 municipalities; coordinates are filled for districts and district capitals
  only, pending an import of the official CAOP dataset (needed for the future map).
- **Logo is provisional.** Three variants in `site/public/brand/`. Once one is
  chosen, outline the text to paths so it no longer depends on a font.
- **Accent colour** (`--accent`, a deep green) and the **code licence** (MIT or AGPL)
  are still open decisions. No `LICENSE` file ships until the second one is settled.
- **Search and filters are live.** MiniSearch runs in the browser over
  an index built at `/search-index.json`; the chunk is fetched on first focus, so
  nothing loads for visitors who never search. It is accent- and case-insensitive,
  matches on prefixes as you type, tolerates a small typo, uses the tag synonyms, and
  searches Portuguese and English at once. The listing combines the query with filters
  for category, subcategory, region, tag, price, production scope, sustainability
  practice, verification and where to buy, and with a sort order; the whole state lives
  in the URL (`/marcas?q=sapatos&dist=braga&sort=recent`), so any view is shareable.
  The home box shows the top matches as a dropdown.
- **Filters need no second download.** Each card carries its own facets in
  `data-facets`, so filtering, the option counts and the sort are instant and work
  before (and without) the search index. The counts next to each option are faceted:
  they reflect the search and every *other* group, so an option tells you how many
  brands it would leave. A group with no brand behind it is not rendered at all —
  which is why "verified" does not appear yet.
- **"Newest" currently equals A–Z.** All 90 brands were added on the same day, so
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
  needs comes from the web server (`deploy/nginx.conf`), since a static build cannot
  send headers.
- `/search-index.json` is deliberately **not** part of the API: it is an internal
  detail of the search and can change shape at any time.
- Brands are loaded and validated by `packages/schema` rather than through Astro
  content collections, so one Zod schema covers the site, the CLI and CI. Blog
  content (phase 3) will use content collections.
