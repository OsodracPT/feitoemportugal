# Feito em Portugal — working notes

Open, community-run database of brands that manufacture in Portugal. Static Astro
site, bilingual (PT at `/`, EN at `/en`), no database: the data is YAML files in
`data/`, validated by a shared Zod schema.

## Rules that are not negotiable

These come from what the project is, not from taste. Breaking one is a bug even
when everything builds.

- **Descriptions are original text.** Never copy a brand's own copy, a Reddit
  comment or a press article into `description`. The dataset ships under CC BY 4.0
  and has to be ours to license. Read the sources, then write two or three fresh
  sentences.
- **"Made in Portugal" is the entry criterion, and it needs evidence.** The claim
  has to come from the brand's own site (or a maintainer who knows). "Portuguese
  brand" and "designed in Portugal" are *not* the same thing and do not qualify. If
  production cannot be established, the brand is not listed — a lead, not an entry.
  Record the quote in `docs/leads/`, never in the YAML.
- **Only maintainers set `verification`.** An agent or a contributor never flips
  `verified: true`. No brand is verified yet.
- **No personal data, no exact coordinates.** Location stops at the municipality;
  maps use the municipality centroid. Many producers work from home.
- **`status` defaults to `draft`.** Publishing is a deliberate act.
- **UI strings live in `site/src/i18n/{pt,en}.json`**, never inline in a component.
  Both languages, always.

## Commands

```bash
pnpm dev          # http://localhost:4321
pnpm build        # static build into site/dist
pnpm preview      # serve the build
pnpm validate     # data: schema + cross-file references (fails on error)
pnpm test         # vitest, schema + site
pnpm typecheck    # tsc + astro check
```

Run `validate`, `typecheck`, `test` and `build` before calling a change done; CI
runs exactly those four. If `pnpm` is not on `PATH`, it is installed standalone at
`~/.local/share/pnpm/bin`.

## Layout

```
data/brands/<slug>.yaml   one brand per file, file name == slug
data/taxonomy/            categories, tags, regions, sustainability
packages/schema/          Zod schema, YAML loaders, cross-file checks
site/src/lib/             data layer, i18n, SEO, search, filters, API helpers
site/src/pages/api/v1/    the public JSON API, generated at build time
docs/collecting-brand-data.md   brief for researching and filling one brand
docs/leads/               leads and the evidence behind every import
deploy/                   nginx origin, compose file, CI deploy gate — see deploy/README.md
```

## Architecture, and why

- **Brands are loaded by `packages/schema`, not by Astro content collections.** A
  collection cannot use the shared Zod schema and Astro's `image()` helper at once,
  and the cross-file checks (taxonomy references, duplicate slugs, municipality
  inside its district) need the whole set at once. The blog will use collections.
- **`site/src/lib/data.ts` is server-only** and reads `import.meta.env.DATA_DIR`,
  an absolute path injected by `astro.config.mjs` so it survives bundling.
- **The client/server boundary is real.** `filters.ts`, `search-config.ts`,
  `search-client.ts`, `search-loader.ts` and `listing-controller.ts` ship to the
  browser and must never import `data.ts` (or anything that reaches `node:fs` or
  `yaml`). Importing one constant across that line once dragged the whole data
  layer into the page bundle — 18 KB became 210 KB. Type-only imports are fine.
- **Search is lazy.** MiniSearch and `/search-index.json` are fetched on first
  focus, through `search-loader.ts`. Keep the imports of `search-client.ts` dynamic;
  a static one pulls MiniSearch into the initial bundle.
- **Filters need no fetch.** Every card carries its facets in `data-facets`, so
  filtering, the option counts and the sort work before the search index arrives.
- **The whole listing state is in the URL**: `?q=&cat=&sub=&dist=&tag=&price=
  &scope=&sust=&verified=&shop=&sort=`. `parseListingState` / `serializeListingState`
  in `filters.ts` own that format; keep them inverse.
- **Translated URL segments live in one place**: `SEGMENTS` in `site/src/lib/i18n.ts`.
  Add a route there, not by hand in two languages.
- **Every API response carries the same envelope** (`version`, `generated_at`,
  `license`) except `schema.json`, which has to stay a valid JSON Schema.
  `/search-index.json` is *not* part of the API and can change shape freely.

## Traps worth remembering

- **Node type stripping only erases types.** No parameter properties
  (`constructor(private x)`), no enums — the scripts run `.ts` directly.
- **TypeScript is pinned to 6 in `site/`**; `astro check` rejects 7.
- **The dev server reads `data/` once, at module init.** After editing a brand or
  the taxonomy, restart it — HMR will not pick it up.
- **Astro's scoped CSS does not reach nodes created by JavaScript.** Suggestions and
  filter chips are built in the script, so their rules need `:global()`.
- **`[hidden]` is forced in `base.css`** because `.brand-card { display: flex }`
  outranks the UA rule. Hide things with `el.hidden`, not `style.display`.
- **MiniSearch is in `optimizeDeps.include`.** It is only reached through a lazy
  import, so Vite would otherwise discover it late, re-optimise, and 504 the URL the
  page already holds. Symptom: search works, then breaks until reload.
- **Production is nginx behind Pangolin, not Caddy.** Traefik on the VPS owns TLS and
  ports 80/443; `deploy/nginx.conf` is a plain-HTTP origin. Its CSP is `script-src
  'self'` with no inline allowance — client code that needs an inline script will be
  blocked in production but not in `pnpm dev`.
- **A headless screenshot fires at `load`**, before the async index resolves. A
  screenshot is not proof the search works — read the browser console instead.

## Conventions

Code, file names and comments in English; content and UI in PT and EN. Strict
TypeScript. Conventional Commits. pnpm workspaces. Comments explain *why*, not what.

## State

Phases 1 and 2 are done: schema and taxonomy, 90 published brands, the bilingual
site with translated URLs, technical SEO, search, the ten combinable filters with
sort order, and the public JSON API.

The static site is deployed: every push to `main` goes live at feitoemportugal.org
through `deploy.yml` (nginx behind the Pangolin proxy on the project VPS).

Next: the bilingual blog and the landing pages (region, category × region), then
contributions (issue forms, `CONTRIBUTING.md`, issue-to-PR), then the submission
API (and Umami), then verification and polish.

Open decisions a maintainer still owns: the code licence (MIT or AGPL — there is no
`LICENSE` file until it is settled, though the footer already says MIT), the final
accent colour and logo, whether a foreign brand producing in Portugal qualifies
(`fly-london` is listed), and who verifies a brand for the badge.
