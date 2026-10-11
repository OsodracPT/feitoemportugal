<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="design/assets/logo/banner-dark.svg">
    <img src="design/assets/logo/banner-light.svg" alt="Feito em Portugal" width="440">
  </picture>
</p>

<p align="center">
  <em>An open, community-run database of brands that make their products in Portugal.</em>
</p>

<p align="center">
  <a href="https://feitoemportugal.org"><img alt="Live site" src="https://img.shields.io/badge/live-feitoemportugal.org-1A4C9C"></a>
  <a href="https://feitoemportugal.org/marcas"><img alt="Brands" src="https://img.shields.io/badge/brands-200%2B-1A4C9C"></a>
  <a href="DATA_LICENSE"><img alt="Data: CC BY 4.0" src="https://img.shields.io/badge/data-CC%20BY%204.0-1A4C9C"></a>
  <a href="LICENSE"><img alt="Code: MIT" src="https://img.shields.io/badge/code-MIT-1A4C9C"></a>
</p>

---

**Feito em Portugal** is a bilingual website and a public JSON API that answer one
question: *which brands actually make their products in Portugal?* Not "designed
here", not "Portuguese-owned" — made here, with evidence. Everyone can use it,
anyone can add to it, and the whole dataset is open.

👉 **Visit [feitoemportugal.org](https://feitoemportugal.org)** — or
[feitoemportugal.org/en](https://feitoemportugal.org/en) in English.

## 🔎 What you'll find

- **Brands you can trust.** Each one is listed only because its own website says it
  manufactures in Portugal — and we keep the quote on file.
- **Search and filters that just work.** Search shrugs off accents and typos;
  eleven filters (category, region, product, price, tags…) combine, and the whole
  state lives in the URL, so any view is a link you can share.
- **A map of the country.** See where things are made, district by district.
- **Open data.** The dataset is published under CC BY 4.0 and served as JSON at
  `/api/v1/` — take it and build something.

No accounts, no tracking, no ads.

## 🙌 Help out — no account needed

The list stays good because people add to it. The easiest way is right on the site,
with a plain web form (no GitHub, no login):

- **Know a brand that should be here?** →
  [Suggest it](https://feitoemportugal.org/submeter)
- **Something wrong on a brand's page?** → Use the *"suggest a correction"* link on
  that page.
- **You run a brand and want the verified badge?** → Ask from the same form.

Prefer GitHub? Every form has an *"on GitHub"* link to the matching issue template,
and you can always open a pull request.

**The one rule for a new brand:** its *own* site has to say it makes its products in
Portugal, and you paste the sentence that proves it. "Portuguese brand" or "designed
in Portugal" is not enough; a foreign brand qualifies when most of its range is made
here. That is what keeps the list honest — and the data ours to license.

## 💻 Run it locally

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

### Commands

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

### Configuration

Two optional environment variables are read at build time:

| Variable | Default | Used for |
|---|---|---|
| `SITE_URL` | `https://feitoemportugal.org` | Canonical links, `hreflang`, sitemap, `robots.txt` |
| `GITHUB_REPO_URL` | this repository | Links to issue templates and the repo |

```bash
SITE_URL=http://localhost:4321 pnpm build
```

## 🗂️ How it's built

No database and no server code: every brand is **one YAML file** in `data/`,
validated by a shared [Zod](https://zod.dev) schema, and the site is a static
[Astro](https://astro.build) build any web server can host. Search and filters run
entirely in the browser.

```
data/brands/<slug>.yaml     one brand per file, the source of truth
data/taxonomy/              categories, tags, product types, regions, sustainability practices
data/geo/                   district outlines for the map (generated, see below)
assets/brands/<slug>/       brand logos and photos (not under CC BY, see Licence)
packages/schema/            shared Zod schema, YAML loaders, cross-file checks
site/                       the Astro site (Portuguese at /, English at /en)
site/src/pages/api/v1/      the public JSON API, generated at build time
submit-api/                 the small service behind the site's contribution forms
scripts/                    command-line tools (pnpm validate, the CAOP import, brand media)
deploy/                     reference web server config and deploy tooling
docs/                       contributor guides, design notes, research evidence
.github/workflows/          CI (validate.yml) and the optional deploy (deploy.yml)
```

## ✏️ Adding or editing a brand (with the files)

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

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the suggest / correct / verify flows,
and [`docs/collecting-brand-data.md`](docs/collecting-brand-data.md) for how to
research and fill in one brand.

## 📦 Using the data

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

### Map data

The municipality centroids in `data/taxonomy/regions.yaml` and the district outlines
in `data/geo/districts.geojson` are derived from the
[Carta Administrativa Oficial de Portugal (CAOP 2025)](https://dados.gov.pt/datasets/carta-administrativa-oficial-de-portugal-caop2025-continente)
by the Direção-Geral do Território, published under CC BY 4.0. They are generated,
not edited by hand: when a new CAOP is released, run `node scripts/import-caop.ts`
(it needs the network and runs mapshaper through `pnpm dlx`) and commit the result.

## 🚀 Deploying your own copy

`pnpm build` produces plain files; serve `site/dist/` from any static host or web
server. A few server rules matter: clean URLs, the 404 page for each language,
CORS on the API, caching and security headers.
[`deploy/README.md`](deploy/README.md) lists them, and has a reference nginx setup,
the optional contribution service (`submit-api/`), and automatic deploys from
GitHub Actions.

## 📚 Further reading

- [`docs/design-notes.md`](docs/design-notes.md): why things are built this way,
  and the decisions still open
- [`CLAUDE.md`](CLAUDE.md): working notes for AI coding assistants, with useful
  architecture traps for humans too

## 📄 Licence

The data in `data/` is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see
[`DATA_LICENSE`](DATA_LICENSE)). The administrative boundaries come from CAOP 2025,
© Direção-Geral do Território, CC BY 4.0. The code is licensed under
[MIT](LICENSE). Apart from the CAOP boundaries, data and code are © Feito em
Portugal contributors.

When you reuse the data, credit it like this:

> Data from Feito em Portugal (https://feitoemportugal.org), CC BY 4.0.

Brand logos and photos in `assets/` are **not** under CC BY 4.0: they belong to
the brands, are shown only to identify them, and are removed on request. The API
leaves them out.

Contributions are accepted under the same terms: code under MIT, data and brand
descriptions under CC BY 4.0.
