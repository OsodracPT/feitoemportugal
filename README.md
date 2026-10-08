# Feito em Portugal

An open, community-run database of brands that make their products in Portugal:
a bilingual website (Portuguese and English) and a public JSON API, built from
plain YAML files in this repository.

- **No database, no server code.** Every brand is one YAML file in `data/`,
  validated by a shared Zod schema. The site is a static [Astro](https://astro.build)
  build that any web server can host.
- **Search and filters run in the browser.** Search is accent-insensitive and
  tolerates typos, the filters combine, and the whole state is in the URL.
- **Open data.** The dataset is published under CC BY 4.0 and served as JSON under
  `/api/v1/`.

Live at https://feitoemportugal.org.

## Quick start

You need **Node.js 22.18 or newer** (24 recommended). The repository pins its
pnpm version in `package.json`; Corepack, bundled with Node, installs it for you.

```bash
git clone https://github.com/OsodracPT/feitoemportugal.git
cd feitoemportugal
corepack enable          # once per machine; provides the pinned pnpm
pnpm install
pnpm dev                 # http://localhost:4321
```

If `corepack enable` is not allowed on your system, install pnpm another way
(see [pnpm.io/installation](https://pnpm.io/installation)) and run the same commands.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server at http://localhost:4321 |
| `pnpm build` | Static build into `site/dist/` |
| `pnpm preview` | Serve the build locally |
| `pnpm validate` | Check `data/`: schema, taxonomy references, duplicate slugs |
| `pnpm test` | Unit tests (Vitest): schema, data integrity, search |
| `pnpm typecheck` | TypeScript and `astro check` |

CI runs `validate`, `typecheck`, `test` and `build` on every pull request; run them
before you open one.

The development server reads `data/` once at startup. Restart it after you edit a
brand or the taxonomy.

## Configuration

Two optional environment variables are read at build time:

| Variable | Default | Used for |
|---|---|---|
| `SITE_URL` | `https://feitoemportugal.org` | Canonical links, `hreflang`, sitemap, `robots.txt` |
| `GITHUB_REPO_URL` | this repository | "Suggest a correction" links |

```bash
SITE_URL=http://localhost:4321 pnpm build
```

## Repository layout

```
data/brands/<slug>.yaml     one brand per file, the source of truth
data/taxonomy/              categories, tags, product types, regions, sustainability practices
data/geo/                   district outlines for the map (generated, see below)
packages/schema/            shared Zod schema, YAML loaders, cross-file checks
site/                       the Astro site (Portuguese at /, English at /en)
site/src/pages/api/v1/      the public JSON API, generated at build time
scripts/                    command-line tools (pnpm validate, the CAOP import)
deploy/                     reference web server config and deploy tooling
docs/                       contributor guides, design notes, research evidence
.github/workflows/          CI (validate.yml) and the optional deploy (deploy.yml)
```

## Adding or editing a brand

1. Copy an existing file in `data/brands/` and edit it. The file name must equal
   its `slug`.
2. Every `category`, `subcategory`, `tag`, `products` entry, `practice`,
   `certification`, `district` and `municipality` must exist in `data/taxonomy/`.
3. New brands start as `status: draft`, which keeps them off the site, the API and
   the sitemap. A maintainer sets `published`.
4. Run `pnpm validate`. Errors fail the build; warnings (such as a missing English
   description) are advice.

Rules that keep the dataset honest and licensable:

- **Production in Portugal must be shown.** The claim comes from the brand's own
  site. "Portuguese brand" or "designed in Portugal" does not qualify.
- **Descriptions are your own words.** Never copy a brand's text or an article:
  the data is published under CC BY 4.0 and must be ours to license.
- **No personal data and no exact addresses.** Location stops at the municipality.
- **Leave `verification` alone.** Only maintainers set it.

To suggest a brand without editing files, see [`CONTRIBUTING.md`](CONTRIBUTING.md).
[`docs/collecting-brand-data.md`](docs/collecting-brand-data.md) explains how to
research and fill in one brand.

## Using the data

The site publishes the dataset as static JSON, open to any origin:

| Endpoint | Contents |
|---|---|
| `/api/v1/brands.json` | All published brands |
| `/api/v1/brands/<slug>.json` | One brand |
| `/api/v1/categories.json`, `tags.json`, `products.json`, `regions.json`, `sustainability.json` | The taxonomy |
| `/api/v1/schema.json` | JSON Schema of a brand file, generated from the Zod schema |

Every response except `schema.json` carries `version`, `generated_at` and
`license`. Breaking changes will get a new `/v2/`. The same data is in `data/`
if you would rather clone it.

## Map data

The municipality centroids in `data/taxonomy/regions.yaml` and the district outlines
in `data/geo/districts.geojson` are derived from the
[Carta Administrativa Oficial de Portugal (CAOP 2025)](https://dados.gov.pt/datasets/carta-administrativa-oficial-de-portugal-caop2025-continente)
by the Direção-Geral do Território, published under CC BY 4.0. They are generated,
not edited by hand: when a new CAOP is released, run `node scripts/import-caop.ts`
(it needs the network and runs mapshaper through `pnpm dlx`) and commit the result.

## Deploying your own copy

`pnpm build` produces plain files; serve `site/dist/` from any static host or web
server. A few server rules matter: clean URLs, the 404 page for each language,
CORS on the API, caching and security headers.
[`deploy/README.md`](deploy/README.md) lists them. It also has a reference nginx
setup and optional automatic deploys from GitHub Actions.

## Further reading

- [`docs/design-notes.md`](docs/design-notes.md): why things are built this way,
  and the decisions still open
- [`CLAUDE.md`](CLAUDE.md): working notes for AI coding assistants, with useful
  architecture traps for humans too

## Licence

The data in `data/` is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see
[`DATA_LICENSE`](DATA_LICENSE)). The administrative boundaries come from CAOP 2025,
© Direção-Geral do Território, CC BY 4.0. The licence for the code is still being
decided.
