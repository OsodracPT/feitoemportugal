# Batch research brief (brand-researcher subagents)

Reusable task spec for delegating a batch of published brands to `brand-researcher`
agents: production evidence + location + price samples + photo candidates. Pass each
agent a slug list and this file's path instead of repeating the instructions (fewer
tokens per spawn). Agents are READ-ONLY: they report, the maintainer applies.

## Per-brand output (keep labels; PHOTOS lines are machine-parsed)

```
## <slug>
PRODUCTION: <total|parcial|none> — <quote of made-in-PT evidence> (<url>)
LOCATION: <municipality>, <district> — <url>   OR   UNKNOWN
PRICES: <comma € values> (<product type>) — <url>
REDFLAGS: <none | describe>
PHOTOS:                       # only if media.photos is empty; else "already has photos"
<imageURL> | <own-domain product page> | <WxH or ?>
```

Rules:
- Read `data/brands/<slug>.yaml` first; only fill LOCATION if missing/unverified.
- Corroborate production beyond the homepage (about/FAQ/legal, PT press, Portugal Sou
  Eu). "Portuguese brand" / "designed in Portugal" do NOT qualify. Flag faked-origin
  signs per `.claude/agents/brand-researcher.md`.
- PRICES: 3–6 real product prices for `pnpm price-suggest`.
- Shops: list the brand's own public shops as `ask` (addresses, no hours = maintainer
  decides); never a workshop/office address.

## Photos (docs §3.8)

Brand's OWN domain only — never a marketplace, Instagram, reseller or press. Packshot
preferred, NO identifiable faces, aim for ≥800px short side, spread the range.

Find full-size cheaply:
- **Shopify** (HTML has `cdn/shop` or `Shopify`): GET `<site>/products.json?limit=100`
  → `products[].images[].src` (+`.width`); append `&width=1600`.
- **Squarespace** (HTML mentions `squarespace`): GET `<collection>?format=json-pretty`
  → `items[].assetUrl` (+`originalSize`), page = origin + `items[].fullUrl`; append
  `?format=1500w`.
- **WordPress/Woo**: product pages carry `<img>`; strip any `-<W>x<H>` suffix before
  the extension for the original.

## Apply (maintainer, main session)

`node scripts/apply-media.ts photo <slug> "<img>" --source "<page>" --kind brand-site`
— guards: ≥800px short side, <2MB, `--source` host == brand website host (sameSite),
no forbidden hosts; max 3 brand-site shots/brand. Logged in `media-sources.csv`.
