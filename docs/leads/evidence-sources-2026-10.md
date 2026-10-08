# Lead pass — open sources, October 2026

The status of every lead is in [`sources-2026-10.csv`](./sources-2026-10.csv): 152 candidates,
41 added as drafts. This file records which sources were used and why, how each brand
was checked, and the quote that establishes production in Portugal for every draft.
As with [`evidence-2026-10.md`](./evidence-2026-10.md), evidence stays here, out of
the YAML.

## Sources and their terms

Each source's terms were read **before** anything was collected. Only facts were
taken from any of them (brand name and website); no description, photo or ranking.

| Source | Verdict | Used for |
|---|---|---|
| feitoem.pt | **Not used.** Art. 8 of its terms forbids "extração sistemática da base de dados (scraping)". | — |
| Portugal Sou Eu (portugalsoueu.pt) | **Not used as a list.** Its terms forbid reproducing or distributing its content "para nenhum propósito público ou comercial" without written consent. A brand's seal can still be checked there by hand, one brand at a time, as evidence. | — |
| portugueseshoes.pt (APICCAPS, footwear association) | **Used for names and websites.** No terms page, no reuse clause, no robots.txt; only a "© Portuguese Shoes" notice, which covers its own text and images. Pages fetched at one request per second. | 110 brands |
| ATP (textile association) | Terms cover privacy only. Its company list is mostly B2B manufacturers, so it was not used this round. | — |
| Press and blogs: oladaniela.com (2026 lists), portugal.com, Indagare, AICEP showcase (Nov. 2025) | Read by hand; brand names only. | 38 names |
| r/BuyFromEU, "Any local brands worth checking out in Lisbon?" | Read through Reddit's public RSS feed (the page itself blocks automated reading); brand names only, no usernames. | 18 names |

Mustique (portugal.com) was renamed Gandaia in 2025, so it appears once, as Gandaia.

## Method

1. Names were deduplicated against `data/brands/` and `reddit-2026-10.csv` (normalised
   name and website host): 16 were already listed. 19 overlapped with earlier Reddit leads
   that had no claim. The footwear association listing several of them justified a second
   pass, which recovered 7 (`reddit-2026-10.csv` updated to `added`).
2. Each brand's own site was read in a headless browser in three ways, as in the first
   pass: visible text, embedded script payloads, and up to twelve about, production and
   legal pages found in the navigation or the sitemap.
3. Every hit was read by a person before it counted. A claim had to say that the
   product is **made** in Portugal; "Portuguese brand", "designed in Portugal" and a
   registered office did not count. A location was recorded only where the site names
   the place of production. The place-name matcher was double-checked: Cavalinho's
   "São Paio de Oleiros" is a parish of Santa Maria da Feira, not the municipality of
   Oleiros.
4. Descriptions were written from scratch from what the sites state (range, history,
   place). Nothing was copied.

All brands below are `status: draft`, `meta.source: import`, `verified: false`.

## Added as drafts

| Slug | Quote from the brand's own site | Location basis |
|---|---|---|
| `a-industria` | "Crafted by hand and heart. Proudly made in Lisboa." | same quote |
| `a-line` | "Our garments are produced in our own factory in the north of Portugal" | — (region only) |
| `almande` | "Our clothes are mostly made in Portugal" → `scope: parcial` | — |
| `ambitious` | "Cada par Ambitious nasce em Portugal, nas nossas unidades de produção em Guimarães" | same quote |
| `apple-of-eden` | "It is only produced by selected shoe manufacturers in Portugal" | — |
| `broolls` | "The broolls sunglasses are handmade in Portugal and use high quality raw materials from Italy" | — |
| `campobello` | Product data: "MADE IN PORTUGAL"; meta: "handmade leather shoes … crafted in Portugal" | — |
| `casta` | "Handcrafted in Portugal"; "Handmade with love in small family factories" | — |
| `cavalinho` | "a produção nacional exclusiva"; "Na nossa fábrica, em São Paio de Oleiros, os designers e equipa de produção trabalham" | São Paio de Oleiros → Santa Maria da Feira |
| `centenario-1941` | "Calçado fabricado em Portugal com materiais de primeira qualidade" | — |
| `creator` | "its production is '100% Made in Portugal', produced in the north of the country and designed in Santa Maria da Feira" | — (design site only) |
| `dikamar` | "a Portuguese brand based in Pombal … proudly carrying the 'Made in Portugal' label"; "the 'Made in Portugal' production of PU boots became a reality" | Pombal (base and plant) |
| `dois-corvos` | "Our brewery is located in Lisbon … producing a wide variety of styles" | same quote |
| `eject` | "All products are designed and manufactured in Portugal" | — |
| `ferreira-de-sa` | "Desenhamos, desenvolvemos e produzimos integralmente em Portugal, na nossa fábrica em Silvalde" | Silvalde → Espinho |
| `gandaia` | "All of our collections are sourced and made in Portugal"; knitwear in a family factory in Valongo do Vouga, Águeda | — (several factories) |
| `get-the-balance` | "O projeto GET THE BALANCE foi fundado, desenhado, produzido em Portugal" | — |
| `helena-mar` | "High quality materials. Made in Portugal"; "Handcrafted in Portugal" | — |
| `jj-heitor` | "Desenhado e produzido em Portugal"; "Sapatos feitos em Portugal" | — |
| `kankura` | "All Kankura Golf shoes are proudly made in Portugal"; soles "produzidas em Portugal" | — |
| `la-paz` | "Since our goods are all made in Portugal, we are exempt from customs fees" | — |
| `lambda` | "Lambda Golf products are handmade in Portugal" | — |
| `lazuli` | "Todo o fabrico é 100% português" | — |
| `maray` | "Maray is not only produced in Portugal but it is also a portuguese brand" | — |
| `maria-joao-bahia` | "Pieces designed and made in Portugal"; "fine jewellery handcrafted in Lisbon" | Lisbon |
| `mariano` | "Como sempre, feitos à mão por encomenda em Oliveira de Azeméis" | same quote |
| `moshion` | "Handcrafted in Felgueiras"; "Atelier: Zona Industrial de Airães, Felgueiras" | same quote |
| `oitava-colina` | "Montámos a nossa fábrica no bairro da Graça em Lisboa … mudámo-nos para um espaço maior em Cabo Ruivo, onde continuámos a fabricar" | same quote |
| `pedemeia` | "Meias produzidas em Portugal"; family company founded in Braga in 1966 | — (origin, not plant) |
| `portdance` | "Made in Portugal" (site banner and product data) | — |
| `shirakawa` | "Every Shirakawa piece is entirely crafted in Portugal" | — |
| `shoevenir` | "100% Designed and Produced in Portugal" | — |
| `softwaves` | "comfortable, high-quality shoes crafted in Portugal"; founded 1970 | — |
| `tatuaggi` | "a footwear manufacturing company … The factory is based in the city of São João da Madeira" | same quote |
| `temahome` | "we design and produce contemporary furniture in Portugal, from our factory in Tomar" | same quote |
| `the-captain-socks` | "Made in Portugal"; products "start in Porto, where the creative process happens, and follow to Lousã to be brought to life" | Lousã |
| `vaddia` | "Handcrafted in Portugal" | — |
| `victoria-handmade` | "Handmade in Portugal" | — |
| `wayz` | "Fabricadas no Porto"; "Concebido e fabricado de forma ética e transparente no Porto" | same quote |
| `wetheknot` | "Our collections … all exclusively made in Portugal" | — |
| `conscious` | "Crafted in Portugal from 100% organic cotton" | — |

### For the maintainer to look at before publishing

- **`wetheknot`**: the home page says "exclusively made in Portugal", the about page
  "mainly produced in Portugal". Recorded as `total`; `parcial` may be fairer.
- **`apple-of-eden`**: a German-Portuguese brand, co-founded from Hamburg, with its head
  office in the Porto region. Covered by the open foreign-brand scope question.
- **`campobello`**: its only shop is a B2B store for retailers; consumers buy it
  elsewhere.
- **`dikamar`** and **`kankura`**: professional safety boots and golf shoes, fine for
  the criterion but niche for the catalogue.
- **`almande`**: `parcial` because the brand says "mostly"; it does not say what is made
  elsewhere.

## Rejected

| Brand | Why |
|---|---|
| DCK | Its own site: "Production moved to Indonesia, where our factory still operates today" |
| Sarah Maier | Its own site: "Originally handcrafted in Portugal, the brand now partners with master artisans in Italy" |
| Lejan | Based in Madrid, Spain |
| Otherwise | Shirts made in India (Time Out Lisboa); its site did not load |
| Atelier Ortopédico, Belcinto, C.O.M., Glamour Country (Cohibas), Last Studio, RXM, SIX London | Manufacturers, private-label makers or sourcing agents for other brands, with no consumer brand to list |

## Held — worth a second look

Arcopedico, Baremotion, Brist, Elite Shoes, Essências de Portugal, Felmini, J-UNK,
Marta Ponti, Viúva Lamego and Musa: each is a manufacturer or says "we produce", but no
sentence places production in Portugal. Lapierce has a clear claim but its site does
not show what it makes. ColieCo moved its production to Portugal from abroad and waits
for the foreign-brand scope decision. Ementa only describes one season as made in
Portugal. The CSV notes the reason for each.
