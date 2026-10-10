# Collecting the data for a brand

Brief for an agent (or a person) tasked with researching one brand and producing
`data/brands/<slug>.yaml`.

**Definition of done:** one YAML file that `pnpm validate` accepts with zero
errors, every field traceable to a source you can name, and a short report
listing those sources and anything you could not confirm.

---

## 1. Rules that override everything else

1. **Never guess.** A field you cannot confirm is left out, not filled with a
   plausible value. Every optional field is genuinely optional; an absent field
   costs nothing, a wrong one damages the database.
2. **Write the description yourself.** Never copy text from the brand's website,
   an online shop, or another directory. Read, understand, then write two or
   three original sentences. This is a licensing requirement (the data ships
   under CC BY 4.0), not a style preference.
3. **Respect each source's terms.** Do not scrape sites that forbid it, and do
   not lift structured data from directories that assert database rights. Public
   pages read by hand, press coverage and the brand's own statements are fine.
4. **Collect facts, not marketing.** "Handmade in Guimarães since 1994" is a
   fact. "The finest shoes in Europe" is not; it never enters the file.
5. **Never touch the `verification` block.** Only maintainers set it. You always
   write `verified: false` with no date.
6. **Default to `status: draft`.** A maintainer flips it to `published` after
   review. Only set `published` yourself if you were explicitly told to.
7. **Publish no personal data.** Many small producers work from home. Record the
   district, and the municipality only when the brand itself states it publicly.
   Never exact addresses, coordinates, personal phone numbers or personal emails.
8. **"Made in Portugal" is the entry criterion.** If you cannot establish that
   the brand manufactures in Portugal, fully or partly, the brand does not
   belong in the database. Say so and stop; do not produce a file.
9. **A foreign brand qualifies when most of what it sells is made in Portugal.**
   Origin does not matter; production does. A brand from abroad that makes one
   line here and the rest elsewhere (only its boots, say) does not qualify. Use
   `parcial` and say what is made elsewhere when the brand is not all-Portugal.

---

## 2. Before you start: check it is not already there

```bash
ls data/brands/                                  # existing slugs
grep -ril "<brand name>" data/brands/            # name match
grep -ri "<domain.pt>" data/brands/              # website match (the stronger signal)
```

A brand already present means you report the existing file instead of writing a
new one. If the existing entry is wrong or incomplete, propose a correction to
that file.

---

## 3. What to collect

Required fields are the ones the schema refuses to build without. "Recommended"
fields produce a warning, not an error. Collect them anyway when you can.

The same rules are published as a JSON Schema at `/api/v1/schema.json`. Put this
line at the top of a brand file and an editor with the YAML language server will
flag a wrong field as you type:

```yaml
# yaml-language-server: $schema=https://feitoemportugal.org/api/v1/schema.json
```

It covers the shape of each field, not the rules that cross fields ("partial
production needs notes", "verified needs a date and a method"). Those still come
from `pnpm validate`.

### 3.1 Identity

| Field | Required | What to collect | Format and rules |
|---|---|---|---|
| `slug` | yes | Short id derived from the brand name | kebab-case, ASCII only, equal to the file name. Strip accents (`ç`→`c`, `ê`→`e`) and legal suffixes (`Lda`, `S.A.`, `Unipessoal`). "Burel Factory" → `burel-factory` |
| `name` | yes | The name the brand uses on its own site | Keep its real casing and accents: `Benamôr`, not `BENAMOR` |
| `website` | yes | Official site | Must be HTTPS and must resolve. Prefer the apex or `www` home page, not a deep link. If the brand has no site, it needs an active, official shop or profile. Note this in your report, since a brand with no web presence is usually not ready to list |
| `status` | yes | none | `draft` unless told otherwise |

### 3.2 Description

| Field | Required | What to collect |
|---|---|---|
| `description.pt` | yes | 1–3 original sentences in European Portuguese |
| `description.en` | recommended | The same content in English: a translation of your own text, not a second research pass |

What the description should answer, in this order: **what they make**, **where
in Portugal they make it**, and **what is distinctive** (material, technique,
history, scale). Aim for 120–220 characters; the listing cards truncate at ~110
and the meta description at 155.

Do not open with the brand name (it is already the heading), do not use
superlatives, and do not promise things you have not verified.

### 3.3 Classification

| Field | Required | Source of valid values |
|---|---|---|
| `category` | yes | `data/taxonomy/categories.yaml`, one id |
| `subcategory` | recommended | the `subcategories` of that same category |
| `tags` | recommended | `data/taxonomy/tags.yaml`, 2 to 5 ids |
| `products` | recommended | `data/taxonomy/products.yaml`: every kind of product the brand makes, from any category |
| `founded` | no | The year the brand (or the workshop it continues) was founded, as the brand states it |

```bash
grep -n "^- id:" data/taxonomy/categories.yaml          # categories
grep -n "^    - id:" data/taxonomy/categories.yaml      # subcategories, in file order
grep -n "^- id:" data/taxonomy/tags.yaml                # tags
grep -n "^- id:" data/taxonomy/products.yaml            # product types
```

Rules:

- **One category only.** Pick the one covering most of what the brand sells. A
  footwear brand that also sells belts is `calcado`, not `acessorios`.
- **The subcategory must belong to the chosen category.** The validator enforces
  this; `chapeus` under `calcado` is an error.
- **Tags come from the controlled vocabulary.** Never invent one. If the brand's
  defining trait has no tag, leave it out and propose the new tag separately;
  new tags are added by a reviewed PR.
- **Products are what is on sale, not what the brand is.** A soap works that also
  sells candles gets `[sabonetes, velas]`, even though its category is
  `cosmetica-e-higiene`. Products are what people type ("azeite", "meias"), so
  they matter more for search than tags do. A missing type is proposed in its own
  PR, like a tag.
- Prefer tags that someone would actually search: material (`pele`, `cortica`,
  `la`), technique (`feito-a-mao`, `tecido-em-tear`), and at most one or two
  about style or values.

### 3.4 Production: the core claim

| Field | Required | Rules |
|---|---|---|
| `production.scope` | yes | `total` or `parcial` |
| `production.notes.pt` | required when `parcial` | What specifically is made in Portugal |
| `production.notes.en` | recommended | Same, in English |

How to decide:

- **`total`**: the finished product is manufactured in Portugal. Imported raw
  materials (leather, cotton, essential oils) do not break this: what matters is
  where the product is made.
- **`parcial`**: part of the process happens elsewhere: assembly here and
  components abroad, some lines made in Portugal and others not, or a brand that
  is clear that only a specific collection is national.
- **Cannot tell?** Then you do not have the entry criterion. Ask the brand, or
  report it as unresolved. Do not default to `total`.

Evidence that counts, strongest first: the brand's own statement of where its
factory or workshop is; a factory or workshop address; origin certification
(for example "Portugal Sou Eu"); press coverage naming the production site;
images of the workshop with a location. "Designed in Portugal" is **not**
evidence of manufacturing. It is a common way of saying the opposite.

### 3.5 Location (optional, but collect it when public)

| Field | Required | Rules |
|---|---|---|
| `location.district` | no | A district id from `data/taxonomy/regions.yaml` |
| `location.municipality` | no | A municipality id **belonging to that district** |

```bash
grep -n "^- id:" data/taxonomy/regions.yaml             # 18 districts + 2 autonomous regions
grep -n "id: .*name: Guimarães" data/taxonomy/regions.yaml
```

This is the production location, not the office or the shop. If a brand is
headquartered in Lisbon but its factory is in Felgueiras, record Porto /
`felgueiras`. If only the district is public, give the district alone. Never add
coordinates. The map uses the municipality centroid on purpose, so that
people working from home are not pinpointed.

### 3.6 Price and where to buy

| Field | Required | Rules |
|---|---|---|
| `price_range` | no | Integer 1–4, from the brand's typical price against its main product's `price_bands` |
| `typical_price` | no | `product`, `eur`, `checked`: median regular price of the main product, written by `scripts/price-suggest.ts` |
| `where_to_buy.online_store` | no | HTTPS URL of the brand's own shop |
| `where_to_buy.marketplaces` | no | Other sites that sell it officially |
| `where_to_buy.physical_stores` | no | `name`, `city`, optional `address` and `url`: the brand's own stores or named stockists |

Price is relative to the product, not absolute: €60 is cheap for a coat and dear
for a T-shirt. Every product type in `data/taxonomy/products.yaml` has
`price_bands`: what a reference item (a T-shirt, a pair of leather shoes, a 750 ml
bottle of olive oil) costs at each level, set against the wider market rather than
this catalogue, so €€ is a high-street price and €€€€ a luxury one.

1. Sample three to five **regular** prices of the brand's main product type (the
   first entry in `products`) on its own shop — no sale prices, no gift sets, not
   the cheapest keyring or the limited edition. Add them to
   `docs/leads/prices.csv` (`slug,product,eur,item,url,checked`).
2. `pnpm price-suggest` takes the median of the latest check and reads the level
   off the bands.
3. A maintainer approves: `node scripts/price-suggest.ts --apply <slug> …` writes
   `price_range` and `typical_price`, and the brand page shows "€€ · a T-shirt
   costs around €35".

If prices are not public, leave both fields out. The category's `price_levels`
remain only as the label for brands rated before the bands existed.

`address` (street and number, postcode if shown) turns into a "view on map" link and
a `Store` in the page's structured data. Fill it only for a **shop open to the
public that the brand itself lists** — a store, a showroom with opening hours, a
named stockist. Never a workshop, a factory or a registered office: many producers
work from home, and the location rule in §3.5 stops at the municipality for them.
Store the address, not a Google Maps link; the site builds the link, and a shop
row with an address opens the map.

The research agent looks for shops on every pass. The brand's own shops and
showrooms with opening hours, in Portugal and with a street address on its own site,
are added to `physical_stores` without waiting for a maintainer, and the source URL
goes in that day's `docs/leads/research-<date>.md`. Stockists, a shop at the factory,
showrooms by appointment and shops abroad wait for a maintainer's call.

### 3.7 Social handles

`social.instagram`, `facebook`, `tiktok`, `linkedin`, `pinterest`, `youtube`:
all optional.

Record the **handle only**: `burelfactory`, never `@burelfactory` and never a
full URL (the schema rejects both). The site builds the links. Only record
accounts you actually opened and confirmed belong to this brand. A wrong handle
becomes a public link to a stranger's profile. An unverified handle is worse
than no handle.

### 3.8 Media

| Field | Required | Rules |
|---|---|---|
| `media.logo` | no | File name inside `assets/brands/<slug>/`, e.g. `logo.svg` |
| `media.photos` | no | Up to 4 file names, same folder |

Images are not part of the CC BY dataset: they belong to the brands, are shown
only to identify them, and are removed on request. The API leaves them out.
Every image is downloaded once and served from our own site; never hotlink (the
production CSP blocks it anyway, and it would tell the brand's server who reads
our pages).

What may be used:

- **Logo:** the logo the brand shows on its own website.
- **Photos:** only images the brand published for press use (a press or media-kit
  page that offers them for download) or sent us with permission, for example
  through the image field of the issue forms. Never product shots taken from a
  shop page.

How to add them, always through the scripts, so each file gets a row in
`docs/leads/media-sources.csv` (slug, file, kind, source URL, date):

```bash
node scripts/fetch-logos.ts famo vibae     # or no slugs: every published brand without a logo
# open .cache/media/review.html, pick one candidate per brand
node scripts/apply-media.ts logo famo=cand-2.svg vibae=cand-1.png
node scripts/apply-media.ts photo famo https://famo.pt/press/fabrica.jpg \
  --source https://famo.pt/press --kind press-kit   # or --kind brand-supplied
```

`apply-media.ts` copies the file to `assets/brands/<slug>/` (`logo.<ext>`,
`foto-N.<ext>`), writes the `media` block, bumps `meta.updated` and logs the
source. It refuses SVGs that contain scripts, event handlers or external links,
and photos over 2 MB. Format rules: logo as SVG, or PNG/WebP at 256px or wider;
photos under 2 MB each, at most 4. `pnpm validate` fails when `media` names a file
that is not there. Leaving both out is fine; the card falls back to the brand
initials and `pnpm validate` emits a warning, not an error.

### 3.9 Sustainability (optional, and careful with claims)

| Field | Rules |
|---|---|
| `sustainability.practices` | Ids from `data/taxonomy/sustainability.yaml`, only when the brand states the practice |
| `sustainability.certifications` | `id` from the same file, plus a `proof_url` whenever one exists |
| `sustainability.notes` | Short, factual clarification |

Treat this as the most abuse-prone section of the file. A practice is the
brand's own claim and is presented as such; a certification is checkable, so
record the certifying body's page or the brand's certificate, not a blog post.
If a claim is vague ("we care about the planet"), it maps to nothing. Leave the
block out entirely.

### 3.10 Blocks you fill mechanically

```yaml
verification:
  verified: false       # maintainers only, never set true

meta:
  added: <today, YYYY-MM-DD>
  updated: <today, YYYY-MM-DD>
  source: maintainer    # github | web-form | maintainer | import | outreach
```

Pick `source` by how the brand reached the project: `github` (issue or PR),
`web-form` (site form), `outreach` (we invited them), `import` (bulk list),
`maintainer` (someone added it directly). It is provenance, not a quality mark.

---

## 4. Output template

Copy this, delete every block you could not fill, keep the key order.

```yaml
slug: exemplo-marca
status: draft
name: Exemplo Marca
description:
  pt: >-
    O que fazem, onde produzem em Portugal e o que os distingue.
  en: >-
    What they make, where in Portugal they make it, and what sets them apart.
website: https://exemplo.pt
category: calcado
subcategory: sapatos-homem
tags: [pele, feito-a-mao, classico]
products: [sapatos, botas]
founded: 1994

production:
  scope: total
  # notes is required when scope is "parcial":
  # notes:
  #   pt: A costura e a montagem são feitas em São João da Madeira.
  #   en: Stitching and assembly happen in São João da Madeira.

location:
  district: aveiro
  municipality: sao-joao-da-madeira

price_range: 3

where_to_buy:
  online_store: https://exemplo.pt/loja
  marketplaces: []
  physical_stores:
    - name: Loja Porto
      city: Porto
      url: https://exemplo.pt/lojas/porto

social:
  instagram: exemplomarca

media:
  logo: logo.svg
  photos: [foto-1.jpg]

sustainability:
  practices: [circuito-curto]
  certifications:
    - id: oeko-tex
      proof_url: https://exemplo.pt/certificados

verification:
  verified: false

meta:
  added: 2026-10-04
  updated: 2026-10-04
  source: maintainer
```

---

## 5. Check your own work

```bash
pnpm validate
```

- **Errors must be zero.** They name the file and the field.
- **Warnings are expected** for a missing English description or logo; fix them
  if you can, leave them if you cannot.
- Re-read `description.pt` against the source pages and confirm no sentence
  survived verbatim.
- Confirm every id you used exists: a typo in a tag is an error, a wrong-but-real
  tag silently misfiles the brand.

---

## 6. Report back

The YAML file has no field for evidence, and that is deliberate: sources belong
in the issue or pull request, not in the published data. Alongside the file,
hand over:

1. **Sources per claim**, specifically for the manufacturing claim, the
   location, and any certification. URL plus one line on what it establishes.
2. **Production scope reasoning**: one or two sentences on why `total` or
   `parcial`.
3. **What you could not confirm**: the fields you deliberately left empty and
   what would be needed to fill them.
4. **Anything a maintainer should double-check** before flipping the brand to
   `published`, for example a claim resting only on the brand's own wording.

A short, honest report with three confirmed fields is worth more to this project
than a complete file with two invented ones.
