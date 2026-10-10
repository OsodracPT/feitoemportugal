# Lead pass — open sources, October 2026

The status of every lead is in [`sources-2026-10.csv`](./sources-2026-10.csv): 583 candidates,
123 added as drafts. This file records which sources were used and why, how each brand
was checked, and the quote that establishes production in Portugal for every draft.
As with [`evidence-2026-10.md`](./evidence-2026-10.md), evidence stays here, out of
the YAML.

## Sources and their terms

Each source's terms were read **before** anything was collected. Only facts were
taken from any of them (brand name and website); no description, photo or ranking.

| Source | Verdict | Used for |
|---|---|---|
| Portugal Sou Eu (portugalsoueu.pt) | **Not used as a list.** Its terms forbid reproducing or distributing its content "para nenhum propósito público ou comercial" without written consent. A brand's seal can still be checked there by hand, one brand at a time, as evidence. | — |
| portugueseshoes.pt (APICCAPS, footwear association) | **Used for names and websites.** No terms page, no reuse clause, no robots.txt; only a "© Portuguese Shoes" notice, which covers its own text and images. Pages fetched at one request per second. | 110 brands |
| ATP (textile association) | Terms cover privacy only. Its company list is mostly B2B manufacturers, so it was not used this round. | — |
| Press and blogs: oladaniela.com (2026 lists), portugal.com, Indagare, AICEP showcase (Nov. 2025) | Read by hand; brand names only. | 38 names |
| A Portuguese brand directory | Name, website, district and category of each brand only. Pages fetched at one request per second. | 419 brands |
| r/BuyFromEU, "Any local brands worth checking out in Lisbon?" | Read through Reddit's public RSS feed (the page itself blocks automated reading); brand names only, no usernames. | 18 names |
| r/BuyFromEU, "I'm looking for shoes like this in the EU." and r/portugal, "Best Portuguese men's dress shoes?" | Saved pages supplied by the maintainer; brand names only, no usernames. The pages were deleted after the pass. | 18 names |

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
| `urban-shepherd` | "Urban Shepherd Boots are meticulously handcrafted at a small, family-owned workshop in Benedita, Portugal"; leather "locally sourced … from Alcanena" | Benedita → Alcobaça |
| `conscious` | "Crafted in Portugal from 100% organic cotton" | — |

### For the maintainer to look at before publishing

- **`wetheknot`**: the home page says "exclusively made in Portugal", the about page
  "mainly produced in Portugal". Recorded as `total`; `parcial` may be fairer.
- **`apple-of-eden`**: a German-Portuguese brand, co-founded from Hamburg, with its head
  office in the Porto region. Published on 2026-10-08 once the maintainer ruled that a
  foreign brand qualifies when most of its range is made in Portugal; this one says
  all of it is.
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

## Second Reddit batch (two threads, 2026-10-08)

Of 18 names, 7 were already in `data/brands/`. Of the other 11, one is added:

- **Added:** Urban Shepherd. Its old domain is for sale, but the maintainer pointed to
  the current one, urbanshepherdboots.com, which carries the claim (see the table
  above). Press from 2019 says the business moved its head office to Houston, Texas;
  the site itself names only the Benedita workshop. Check this against the
  foreign-brand question before publishing. Price is left out because the site shows
  none; `producao-por-encomenda` rests on "allow us from 2 to 4 weeks to make your
  order".
- **No working site:** Undandy (made-to-order shoes; press places production in São
  João da Madeira, but its domain does not resolve). Worth a recheck.
- **Foreign brands with a Portugal claim**, held for the foreign-brand scope decision:
  Pied de Biche ("fabrication chaussures en cuir au Portugal"), Asphalte (its boots:
  "Fabriquées au Portugal"), Wills Vegan Shoes ("ethically made in Italy & Portugal",
  so partial at best) and Sneaky Steve (no claim on its own site; retailer listings
  name a Felgueiras manufacturer).
- **No claim on the brand's site:** Bobbies, Floris van Bommel.
- **Rejected:** Sapataria Lord (a retailer), Rockport (a US brand), Solovair (made in
  England).

## Brand directory pass, 2026-10-08

All 419 brand pages of the directory were read at one request per second, keeping only the
name, website, district and category of each brand as hints. 413 were distinct; 74
were already in `data/brands/` or among earlier leads, and 13 have no website of their
own. The other 326 were checked on their own sites exactly as above: 81 state that
they make their products in Portugal and are added as drafts, 24 are held, 1 rejected
and 220 show no claim. The directory lists Portuguese *brands*, which is a wider criterion
than production in Portugal, so the low share is expected.

Location is set only where the brand names the place of production (its atelier,
factory or workshop), never from the directory's district or from a registered office.

| Slug | Quote from the brand's own site | Location |
|---|---|---|
| `jewellery-bymz` | "About Jewellery byMZ - Handmade in Portugal"; "handmade sterling silver jewellery in Portugal" | — |
| `trinca-bio` | "produzido em Portugal na nossa micro empresa" | — |
| `bean-baby-clothes` | "Production locale. Fièrement Made in Portugal"; "fabriqués à 100 % au Portugal" | — |
| `amavela` | "Velas vertidas e acabadas à mão, em pequenas séries, no nosso atelier do Porto" | porto |
| `a-risca` | "Handmade in Portugal"; collection "nasceu na roda de oleiro, de uma olaria centenária" | — |
| `triipi` | "beach & home pillows made in Portugal since 2014"; "Feito à mão em Portugal" | — |
| `miristica` | "Os nossos cosméticos são produzidos em Portugal" | — |
| `ceu-azul` | "Produzimos tudo em Portugal"; "Feito em Portugal · Produção própria" | — |
| `atelier-do-sabao` | "produzimos tudo à mão, em pequenos lotes"; "loja e atelier abertos ao público em Espinho" | espinho |
| `musa-natural-cosmetics` | "Made in Portugal. Fabricado com amor em Portugal" | — |
| `companhia-atlantica` | "Feito em Portugal"; "As peças são realmente 'Made in Portugal'" | — |
| `valle-das-corujas` | "A nossa produção foca-se naquilo que a natureza de Mirandela tem de mais autêntico: o mel puro, o azeite virgem extra … e a amêndoa" | mirandela |
| `antarte` | "We are proud of our Made in Portugal manufacturing" | — |
| `baby-gi` | "A brand 100% made in Portugal" | — |
| `snug` | "All of our pieces are entirely produced in Portugal, within a 50km radius of our headquarters" | — |
| `malu-pet-wear` | "Produtos feitos em Lisboa, Portugal"; atelier "no centro de Lisboa onde atualmente produzimos" | lisboa |
| `great-i-am` | "Our collections are 100% designed, developed and produced in Portugal, within our Group's own manufacturing facility" | — |
| `sharish-gin` | "Lentamente destilado no Alentejo"; "produzido no Alentejo" | — |
| `le-mot` | "Our collections are proudly made in Portugal with high-quality organic cotton" | — |
| `mesh` | "Feitas à mão no Porto"; "Feitas em Portugal, com tempo e intenção" | porto |
| `biovo` | "Cosmética produzida artesanalmente em Alcanena" | alcanena |
| `pinknounou` | "Feito à mão em Portugal"; "handmade in Portugal with love" | — |
| `ambar` | "Inovamos e produzimos"; "Fábrica: Rua Manuel Pinto de Azevedo … Porto" | porto |
| `type-swimwear` | "Criado e fabricado em Portugal" ([product page](https://www.type.pt/products/bikini-harmonia-in-dive); the earlier sentence was gone on 2026-10-10) | — |
| `util` | "Metal storage furniture, made in Portugal"; "Everything is produced in Portugal" | — |
| `cavemen` | "qualidade na produção … e fabrico em Portugal"; "Produção nacional" | — |
| `carolina-curado` | "Peças únicas … feitas à mão no nosso atelier na Avenida de Madrid" | lisboa |
| `kitess` | "Tudo é produzido em Portugal e apenas a 30 minutos do nosso atelier, no centro da cidade do Porto" | — |
| `cante` | "A confeção dos produtos Cantê é 100% Portuguesa" | — |
| `naturapura` | "Proudly made in Portugal since 1999" | — |
| `cantaloupe-studio` | "We are a Portuguese brand that strives to make high-quality shoes … made in Portugal" | — |
| `cluoh` | "Orgulhosamente produzido em Portugal"; "as peças são cuidadosamente feitas à mão pelos nossos artesãos" | — |
| `licor-beirao` | "a capacidade média de produção da nossa fábrica"; "Da Lousã, para o mundo" | lousa |
| `strelitzia` | "Cada par de sapatos é produzido em Portugal por artesãos experientes" | — |
| `zas-tras` | "Fabricado em Portugal. Confecção manual" | — |
| `alameda-turquesa` | "handmade in Portugal by Alameda Turquesa"; "handcrafted to order in Portugal" | — |
| `science4you` | "desenvolvemos, produzimos e comercializamos brinquedos … na nossa incrível Fábrica sediada no MARL, em Loures" | loures |
| `feitoria-do-cacao` | "Fabrico artesanal de chocolate. Visite-nos na Estrada de S. Bernardo … Aveiro" | aveiro |
| `portugal-jewels` | "todas orgulhosamente produzidas em Portugal" | — |
| `bamandboo` | "Made in Portugal" | — |
| `vandoma` | "ties and refined gentlemen's accessories made in Portugal"; "Founded in 1982 in Porto … dedicated to manufact[uring]" | porto |
| `piupiuchick` | "Designed in our studio in Porto and thoughtfully produced with trusted partners, mostly in Portugal" → `parcial` | — |
| `dancers-by-georgia` | "inteiramente produzidas em Portugal"; transformed "no nosso atelier" (Lisboa) | lisboa |
| `rodilha` | "Inspirado, desenhado e produzido em Portugal" | — |
| `imma` | "All our collections are developed and produced in Portugal through close collaboration with specialised ateliers and factories" | — |
| `dam` | "Made in Portugal with care"; "Design and Accessories handcrafted in Portugal" | — |
| `bat-eye` | "Fabricado em Portugal" (product data); "Crafted in Portugal" | — |
| `hands-on-earth` | "Produzido em Portugal" | — |
| `galula` | "all of our products are made in that same region" (Porto) | — |
| `carolina-machado` | "Proudly Made in Portugal"; "We work with three different small ateliers in Porto" | porto |
| `nyos` | "Designed and Made in Portugal" | — |
| `dicci` | "Most of our pieces are crafted by hand in our Porto atelier" | porto |
| `renova` | "two industrial units … in Portugal - Torres Novas, and a third production unit in Saint-Yorre, France" → `parcial` | torres-novas |
| `spalls` | "Fabricada em Portugal com batata-doce proveniente de Aljezur" | — |
| `blue-avenue` | "Made in Portugal. We partnered with a local familly business just next to our hometown in the North of Portugal" | — |
| `marqqa` | "Marqqa products are designed and produced in Portugal" | — |
| `owl-paperlamps` | "Made in Portugal. Designed and made by us in our studio" | — |
| `dr-bayard` | "apenas produzimos os nossos próprios rebuçados"; "a fábrica da Dr. Bayard como a conhecemos hoje, na Amadora" | amadora |
| `life-in-a-bag` | "Estes produtos são feitos em Portugal" | — |
| `azeite-caixeiro` | production "de forma totalmente vertical" at "Santa Maria de Émeres, concelho de Valpaços" | valpacos |
| `marita-moreno` | "Proudly Made in Portugal"; "Made in Portugal" (product data) | — |
| `entrudo` | "Our Entrudo designs are created, made and produced in Portugal" | — |
| `maui` | "Made in Portugal"; "produzimos com as suas medidas"; "Atelier localizado em Vila Nova de Famalicão" | vila-nova-de-famalicao |
| `wewood` | "handcrafted in Portugal since 1964"; "made to order in our factory in Portugal" | — |
| `amalia-home-collection` | "têxteis de casa luxuosos e artísticos, fabricados em Portugal" | — |
| `mia-mo` | "as nossas peças são produzidas em Portugal, manualmente" | — |
| `matta` | "We do all surfboards in our factory (not overseas)"; "Made in Portugal, with love" | — |
| `sugo-cork-rugs` | "Handcrafted in Portugal"; "Craftsmanship Made in Portugal" | — |
| `inedit` | "Todos os produtos são confeccionados à mão num pequeno atelier em Lisboa" | lisboa |
| `casa-cubista` | "handmade modern for the home made in portugal"; "made in the towns and villages of rural Portugal" | — |
| `cinco` | "Designed and made in Portugal"; "Much of our jewelry is produced within approximately 30 km of our Coimbra studio" | — |
| `rutz` | "Proudly Made in Portugal" | — |
| `limontejo` | "É o primeiro limoncello a ser produzido em Portugal" | — |
| `compal` | "Todos os anos transformamos, na nossa fábrica de Almeirim, cerca de 20 mil toneladas" of Portuguese fruit and vegetables | almeirim |
| `bennie` | "Roupa Infantil 100% produzida em Portugal"; "Uma marca 100% criada e produzida em Portugal" | — |
| `cucawik` | "Artigos artesanais produzidos em Portugal" | — |
| `ghome` | "A Ghome ainda não tem fábrica própria, mas fabrica em Portugal" | — |
| `dr-kid` | "Proudly Made In Portugal" | — |
| `lachoix` | "Made in Portugal"; "Portuguese handmade shoes … Produced in limited quantities" | — |
| `boxpt` | "In Boticas, we produce metal structures and storage solutions for professional training facilities" | boticas |

### For the maintainer to look at before publishing

- **`piupiuchick`** and **`renova`** are `parcial`: PiuPiuChick says "mostly in
  Portugal"; Renova runs a third production unit in Saint-Yorre, France.
- **`le-mot`** is a Lisbon brand with a Paris theme; production is in Portugal.
- **`compal`**, **`licor-beirao`** and **`renova`** are large industrial brands, very
  different in scale from most of the catalogue.
- **`boxpt`** sells mainly to gyms and clubs.
- **`dancers-by-georgia`** remakes second-hand garments, so the fabric is not new.
- **`ceu-azul`** prints and binds photo albums; the photographs are the customer's.

## Publishing, 2026-10-08

The maintainer asked to publish the drafts with strong evidence. Strong means the
brand's own site says in a sentence where or how it makes its products (a factory, a
workshop, a town, "we produce in Portugal"). 93 drafts met that and are now
`status: published`, still `verified: false`.

These 30 stayed `draft`. Their evidence is a bare "Made in Portugal" or "Handcrafted in
Portugal" label or slogan, a `parcial` scope, or an open point listed above (the
foreign-brand question for `apple-of-eden`, the contradiction for `wetheknot`, the
B2B-only shop for `campobello`). `apple-of-eden` was published later the same day, once
the foreign-brand question was settled; the other 29 remain:

`almande`, `baby-gi`, `bamandboo`, `bat-eye`, `campobello`, `cavemen`, `dam`, `dr-kid`, `hands-on-earth`, `helena-mar`, `jj-heitor`, `lachoix`, `limontejo`, `marita-moreno`, `musa-natural-cosmetics`, `naturapura`, `nyos`, `pinknounou`, `piupiuchick`, `portdance`, `renova`, `rodilha`, `rutz`, `shoevenir`, `sugo-cork-rugs`, `vaddia`, `victoria-handmade`, `wetheknot`, `zas-tras`.

## Publishing, 2026-10-09

The maintainer reviewed the 29 and published 13, still `verified: false`:

- `parcial`, published as such: `almande`, `piupiuchick`, `renova`, and `wetheknot`,
  moved from `total` to `parcial` because its about page says "mainly produced in
  Portugal" while the home page says "exclusively".
- A sentence that the products are produced or made in Portugal, without a place:
  `baby-gi`, `cavemen`, `hands-on-earth`, `jj-heitor`, `limontejo`, `naturapura`,
  `rodilha`, `shoevenir`, `zas-tras`.

Held: `campobello`, because its only shop sells to retailers and the catalogue lists
brands a reader can buy from. Left for later: the 15 whose evidence is a bare label or
slogan — `bamandboo`, `bat-eye`, `dam`, `dr-kid`, `helena-mar`, `lachoix`,
`marita-moreno`, `musa-natural-cosmetics`, `nyos`, `pinknounou`, `portdance`, `rutz`,
`sugo-cork-rugs`, `vaddia`, `victoria-handmade`.

### Maintainer notes, 2026-10-09

What the maintainer added after publishing, and what it changed:

- **`rodilha`**: produced in Leiria (maintainer). Location set to Leiria / `leiria`.
- **`shoevenir`**: produced in Póvoa de Varzim (maintainer). Location set to Porto /
  `povoa-de-varzim`.
- **`cavemen`**: NiT, "Cavemen: o homem contemporâneo e elegante é a imagem da nova
  loja no Porto" — the brand aims to be "100 por cento feita em Portugal"; "a produção
  concentra-se no norte do País". No municipality named, so no location; a small share
  of the sewing is imported, which stays within `total` for now.
  https://www.nit.pt/compras/lojas-e-marcas/cavemen-o-homem-contemporaneo-e-elegante-e-imagem-da-nova-loja-porto
- **`hands-on-earth`**: the site says "100% Biológico" and that its products are
  certified by an independent body; the EU organic logo is on the product images.
  Already in the description; the taxonomy has no food-organic certification to set.
- **`limontejo`**: made in the Alentejo, from the family's orchard ("Monte"), but no
  municipality or district is public, and the Alentejo spans three districts. No
  location until one is.
- **`zas-tras`**: registered office in Oeiras (maintainer). That is the office, not the
  workshop, so it is not recorded as the production location.

### Second look at the label-only drafts, 2026-10-09

The 15 drafts with a bare label were researched again (`.claude/agents/brand-researcher.md`:
the brand's about, FAQ and legal pages, Portuguese press, registries only to tell an office
from a workshop). The maintainer published 12; quotes are copied as found.

| Slug | Evidence | Source | Location |
|---|---|---|---|
| `sugo-cork-rugs` | "Factory, Office & Showroom Parque Industrial Lusopark … Santa Maria da Feira"; "Os teares mecânicos utilizados no nosso processo produtivo" | https://sugocorkrugs.com/contactos.php, https://sugocorkrugs.com/sugocork.php | santa-maria-da-feira (brand's factory) |
| `victoria-handmade` | "we have our atelier and showroom where you can get a close-up view of the production of our bags"; atelier in Corredoura, Porto de Mós | https://www.victoria-handmade.com/faq | porto-de-mos (brand's atelier) |
| `pinknounou` | "alguns são peças únicas feitas no meu estúdio em Lisboa" | https://www.pinknounou.com/perguntas-frequentes/ | lisboa (brand's studio) |
| `portdance` | "We design and manufacture high-quality ballroom dance shoes … all proudly made in Portugal" | https://portdance.pt/about-us/ | — (Gaia address is the company's, not a workshop) |
| `lachoix` | "All production takes place locally"; "We produce in the north of Portugal." | https://www.lachoix.com/pages/responsibility, https://www.lachoix.com/pages/faqs | — |
| `marita-moreno` | "the use of national raw materials, production in Portugal"; "with a small family factory" | https://maritamoreno.com/pages/about-us | — (Lourosa is the registered office) |
| `dam` | "The production, assembly and packing of our products are carried out in Portugal" | https://damportugal.com/sustainability/ | — (São João da Madeira is office and showroom) |
| `bat-eye` | "Criando tudo internamente, orgulhamo-nos de trabalhar com artesãos portugueses" | https://www.bateye.com/pt/production | — (registry lead: Bat Eye Production, Lda, Vila Nova de Gaia) |
| `dr-kid` | "Integralmente desenhada e produzida em Portugal" | https://www.dr-kid.com/pt/marca | marco-de-canaveses, **inferred**: owned by INARBEL, knitwear producer at Vila Boa de Quires (https://www.inarbel.pt) |
| `helena-mar` | "Our shoes are made in Portugal"; "born within the PC Footwear factory" (World Footwear) | https://helenamar.com/pages/about-us | oliveira-de-azemeis, **inferred**: the brand's address is PC Footwear's factory address |
| `musa-natural-cosmetics` | "Os nossos produtos são produzidos por nós no interior do país"; made "num espaço de fabrico adequado mediante licenciamento industrial" | https://musanaturalcosmetics.com/sobre-nos/ | fundao, **inferred**: after-sales address labelled "LAB" in Fundão (terms page) |
| `bamandboo` | FAQ, "Are your products made in the Azores?": formulation in the Azores, "we also work with a few other local portuguese producers" → `parcial` | https://thebamandboo.com/pages/frequently-asked-questions | — (formulation lab on São Miguel) |

The three inferred locations were accepted by the maintainer; correct them if the brand
says otherwise. Corrections made on the way: `sugo-cork-rugs` is woven on looms, not by
hand; `victoria-handmade` works mainly in reed (junco); `helena-mar` lost `malas`, since
no source gives the bags an origin; `bamandboo` lost "algas", which are not among its
Azorean ingredients.

Still drafts: `rutz` (the only production claim is a 2012 APICCAPS article, "entirely
produced around São João da Madeira", and rutz.pt now also sells other brands),
`vaddia` ("handcrafted in Portugal … small family ateliers", nothing more), `nyos`
("crafted in Portugal", no workshop; the site has not changed since 2023), and
`campobello`.

**`bamandboo`, later the same day:** the maintainer states the products are made in
Lagoa, São Miguel (Açores). Scope back to `total` and location `acores/lagoa-acores`,
on the maintainer's knowledge; the brand's pages do not name the town. Its FAQ's "other
local portuguese producers" are in Portugal too, so they do not make it `parcial`. The
about page also claims "Somos neutros em carbono" (https://thebamandboo.com/pt/pages/about-us);
the sustainability taxonomy has no entry for that, so nothing was set.
