# Import evidence — October 2026

Source: five r/portugal threads (including "Marcas Buy it For Life Portuguesas")
plus a community spreadsheet ("Marcas e Produtos PT — Made in Portugal"), captured as
HTML and extracted into [`reddit-2026-10.csv`](./reddit-2026-10.csv) — 182 leads.

Reddit and the spreadsheet were used **only as leads**. Every brand below was then
checked against its own website on **2026-10-04**, and the quote that establishes
manufacturing in Portugal is recorded here. Evidence does not belong in the published
YAML (see [collecting-brand-data.md](../collecting-brand-data.md)), so it lives here.

## Added (`meta.source: import`)

| Slug | Evidence quoted from the brand's own site |
|---|---|
| `adico` | "a mais antiga fábrica de mobiliário metálico de Portugal e uma das mais antigas da Europa"; address "3860-076 Avanca, Portugal"; founded 1920 |
| `ana-sousa` | "O design e produção nacional é um dos elementos diferenciadores da marca" |
| `armazem-das-malhas` | "Malhas, Meias e Roupa Made in Portugal"; "Cada peça que criamos é orgulhosamente feita em Portugal" |
| `asportuguesas` | "Our footwear is developed and manufactured in Portugal in collaboration with experienced partners"; address in Penselo, Guimarães |
| `atelier-estorninho` | "Manufactured in Portugal with a durable neckrib and 100% luxurious midweight cotton fabric" |
| `beeq` | "a Portuguese brand of electric bicycles (e-bikes) manufactured in Portugal by RTE" |
| `camport` | "Camport é uma marca de calçado 100% Portuguesa"; "O calçado é inteiramente feito à mão" |
| `castelbel` | "Feito em Portugal. A forma portuguesa de fazer as coisas, para o mundo." |
| `confianca` | "mantemos a produção em Braga, Portugal"; "Confiança — Fábrica de Sabão e Sabonetes", founded 1894 |
| `coup-the-label` | "Todas as nossas peças são fabricadas a menos de 60 km do Porto" |
| `desculpa-babe` | "Toda a produção das nossas peças é 100% made in Portugal" |
| `ecola` | "Desde 1925 (terceira geração familiar) e localizada em Manteigas, Serra da Estrela, acompanha todo o ciclo da lã da ovelha Bordaleira" |
| `favorite-people` | "ethically made · made in portugal" |
| `ferrache` | "Localizada na bonita cidade de Barcelos, a nossa confeção emprega cerca de 40 pessoas"; "MADE IN PORTUGAL" on product pages |
| `fluyt` | "Fluyt. Produzido em Portugal." |
| `guaja` | "HANDMADE IN PORTUGAL"; "producing each piece exclusively with Portuguese manufacturers" |
| `hali-studio` | "All of our parts are manufactured in Portugal. Our new collections are produced at Suri Atelier, a modeling and sewing workshop in Cascais" |
| `heeltread` | "MADE IN PORTUGAL" (site-wide banner) |
| `hirundo` | "Sustainable sneakers handmade in Porto with minimalist design" |
| `inusitado` | "Our production is 100% Portuguese and has the character of artisans"; "Handmade, start to finish" |
| `ispari` | "A Ispari é uma marca 100% portuguesa"; "desde a seleção de materiais, maioritariamente dead stock, até ao processo de confecção local" |
| `isto` | "Fabricado de forma transparente em Portugal"; publishes its factory list and per-component costs |
| `its-okay` | "DESIGNED IN LISBON, MADE IN PORTUGAL" |
| `koati` | "Tudo começou em 1983, quando a Costafil, Lda, uma fábrica de vestuário localizada em Portugal, iniciou a sua atividade" |
| `lobo-apparel` | "Made in Portugal, they showcase the very best of Portuguese craftsmanship" |
| `mukishoes` | "sustainable barefoot shoes made in Portugal"; "HANDCRAFTED IN PORTUGAL"; "We produce our shoes with small local manufacturers" |
| `nae-vegan` | "MADE IN PORTUGAL · 100% VEGAN DESDE 2008" |
| `naz` | "Proudly Made in Portugal"; "Everything is made in Portugal by trustworthy companies" |
| `olivia-jeans` | "Fabricado em Portugal. Cada peça olivia é produzida em Portugal em pequenas quantidades" |
| `plus351` | "Our products are made in Portugal with 100% organic cotton"; "Designed in Lisbon and manufactured in the north of Portugal" |
| `portuguese-flannel` | "Our shirts are manufactured by master craftsmen in the old towns of northern Portugal" |
| `projeto-serra` | "As nossas malhas polares são produzidas em Portugal" |
| `sapataria-do-carmo` | "Trabalhamos com as melhores peles e mãos experientes, com carimbo Made in Portugal, no setor do calçado artesanal"; "HANDMADE SHOES LISBOA, DESDE 1904" |
| `seapath` | "Designed and Sustainably Made in Portugal"; "Local & ethical production in Northern Portugal" |
| `siz` | "you can find us at our atelier in Sesimbra" |
| `sock-affairs` | "FEITO EM PORTUGAL" (site-wide banner) |
| `stro` | "Nossas mantas e cobertores carregam orgulhosamente o Made in Portugal... uma produção local sustentável e ecológica em pequena escala" |
| `thomsonclub` | "desenhado no Porto e fabricado em Portugal" |
| `viarco` | "Fábrica Portuguesa de Lápis", Rua Jaime Afreixo, S. João da Madeira |
| `zilian` | "MADE IN PORTUGAL com materiais certificados"; "Proudly created in Portugal" |
| `zouri` | "100% MADE IN PORTUGAL. Our factory in Guimarães guarantees that every pair of sneakers has the same detail and perfection" |

### Listed as `scope: parcial`

| Slug | Why |
|---|---|
| `wolf-and-rita` | "Our clothes are manufactured through a carefully selected network of suppliers, **most of them** located in our hometown Guimarães" — "most" is not "all", so the scope is partial and the notes say so. |

## Added — second pass

A deeper probe reads the JSON payloads inside `<script>` tags and follows each site's
`sitemap.xml`, which reaches shops whose copy never appears in the served HTML.

| Slug | Evidence quoted from the brand's own site |
|---|---|
| `artame` | "A Artame é uma empresa portuguesa com mais de 45 anos de atividade, especializada no fabrico de artigos de cozinha, em aço inoxidável" |
| `benedita-formosinho` | "Todas as peças são eticamente fabricadas em Portugal em quantidades limitadas"; atelier in Setúbal since 2018 |
| `chule` | "As meias chulé são fabricadas em Portugal e com Algodão Orgânico" (GOTS certified) |
| `collady` | "Pensar, Desenvolver, Criar e Produzir todos os nossos produtos em Portugal" |
| `costa-nova` | Product origin field: "Origem: Fabricado em Portugal" |
| `cubanas` | "Cubanas Shoes — Premium shoes and bags, made in Portugal" |
| `cutipol` | "Luxury silverware crafted in Portugal" |
| `dalper` | "Premium Cutlery — Made in Portugal"; "MADE IN PORTUGAL, UNDENIABLE ON YOUR TABLE" |
| `diverge` | "DiVERGE sneakers are handcrafted to order in Portugal from LWG Gold-rated leathers" |
| `fly-london` | "FLY London was created in the United Kingdom in 1994 and it is owned by Fortunato O. Frederico & Ca Lda, with a head office and production in Portugal" |
| `herdmar` | "Talheres made in Portugal com design intemporal" |
| `ivo-cutelarias` | "A IVO Cutelarias produz facas de cozinha e facas profissionais em Portugal... desde 1954" |
| `kukka` | "They are created and made by hand in Portugal by Joana Encarnação" |
| `labrador` | "Camisas e Fatos de Homem | Made in Portugal"; product pages: "Proudly Made in Portugal" |
| `mazejo` | "Designed and crafted in Portugal, our pieces are predominantly made in-house" |
| `mdc` | "Upcycled from leftover industrial textiles · Proudly produced in Portugal · Hand made" |
| `mishmash` | "All mishmash products are made in Portugal. We work closely with the best bookbinders in town, with more than one hundred years of expertise" |
| `newve` | "Designed, created and produced in Portugal"; "Designed, developed, and manufactured in Portugal" |
| `old-mulla` | "The boots are produced by the George family business. Located in the city of Leiria, Portugal" |
| `olaio` | "FEITO À MÃO EM PORTUGAL. Produzido localmente em Portugal, por artesãos altamente qualificados no trabalho da madeira" |
| `sanjo` | "a marca de ténis mais antiga de Portugal que se orgulha de ter uma produção totalmente Made in Portugal" |
| `silampos` | "A Silampos fabrica em Portugal louça para cozinhar em aço inox de elevada qualidade" |
| `singular-leather` | "As nossas carteiras minimalistas em couro são feitas à mão em Portugal" |
| `sirtile` | "Original Portuguese pattern socks. Inspired by azulejos. Made in Portugal." |
| `tatara-razors` | "Fully designed, built, and assembled in Portugal" |
| `tema-creations` | "Criamos coleções de raiz, desenhadas e produzidas em Portugal" |
| `travelling-socks` | "Designed and produced in Portugal" |
| `watc-studio` | "Organic Luxury Blanks crafted in our own ateliers in Portugal" |
| `westmister` | "100% PORTUGUÊS"; "produzidas em Portugal"; "fabricadas em Portugal" |

### Second-pass `scope: parcial`

| Slug | Why |
|---|---|
| `thclothes` | The catalogue has a dedicated "Fabricada em Portugal" range and "uma coleção cápsula totalmente produzida em Portugal" — which means the rest of the catalogue is not. |

### Second-pass rejections

| Brand | Reason |
|---|---|
| DCK | "Production moved to Indonesia, where our factory still operates today." |
| Monte Campo | Domain no longer resolves; a commenter also reports the brand changed hands and moved production. |

### A case worth noting

`fly-london` is a brand *created* in the UK but owned by a Portuguese company and
produced in Portugal. The project defines itself as a database of brands that
manufacture in Portugal, so it qualifies on production rather than on origin. The same reasoning
would admit foreign brands manufacturing here (Ecco in Santa Maria da Feira, Filippa K,
Morjas, Asket were all named in the threads) — **that is a scope decision still open
for a maintainer**, and none of them were added.

## Why the remaining 90 leads were not added

Each was fetched and searched three ways: visible text, embedded script payloads, and
every about/story/production page reachable from the site or its sitemap. They fall into
three groups:

1. **No origin claim anywhere** — the majority. A `.pt` domain, Portuguese copy and a
   Portuguese company name are not evidence of where a garment was sewn.
2. **"Portuguese brand" but not "made in Portugal"** — Mahrla, Lemon Jelly, Indagatio,
   Ameias, Alital, Suits Inc., Duffy. The threads make exactly this distinction, and so
   does this database.
3. **"Designed in Portugal"** — The Captain Socks. Designed is not made; the threads
   flag this phrasing as the usual way of saying production is elsewhere.

Borderline cases that were kept out and have since been resolved: Icel, Costa Verde,
Famo, Torres Novas, Tensai and Semogue — see "Added — maintainer-confirmed locations"
above. The pattern is worth remembering: an old factory's website often says less about
where it manufactures than a two-year-old label's does.

## Added — maintainer-confirmed locations

These six were in the "no claim found" group: long-established Portuguese factories whose
websites only describe their history in the past tense. The project maintainer confirmed
where each one actually produces, which is the evidence their sites were missing, so they
are recorded with `meta.source: maintainer`.

| Slug | Location (maintainer) | Notes |
|---|---|---|
| `icel` | Benedita → Alcobaça, Leiria | Site confirms the trade and the 1940s family workshop in Ribafria, near Benedita |
| `citadin` | São João da Madeira, Aveiro | Produced in São João da Madeira with Portuguese leathers, soles and buckles; own shop in Lisbon (Rua Duques de Bragança) — site moved to `citadinshoes.com`, the lead's `citadin.pt` no longer resolves |
| `costa-verde` | Vagos, Aveiro | Porcelain factory; site has a "Fábrica Costa Verde" section but names no city |
| `famo` | Lousada, Porto | "FAMO – Fábrica de Móveis Metálicos", founded 1947 |
| `torres-novas` | Torres Novas, Santarém | "uma das primeiras linhas de produção de turcos em Portugal"; site now resolves to `torresnovas.com` |
| `tensai` | Estarreja, Aveiro | Site says "SOMOS FABRICANTES" and shows the factory, without naming a place |
| `semogue` | Granja → Vila Nova de Gaia, Porto | Granja is a locality in São Félix da Marinha, Vila Nova de Gaia; the factory has run in the same building since 1955 ([source](https://producaonacionalfazbem.blogs.sapo.pt/52363.html)) |

Benedita and Granja are parishes, not municipalities, so they are recorded under the
municipalities that contain them — `alcobaca` and `vila-nova-de-gaia` — as `regions.yaml`
only goes down to municipality level.

## Rejected (first pass)

| Brand | Reason |
|---|---|
| 8000Kicks | A commenter reports recent orders arriving marked "made in China"; the site's sustainability page talks about manufacturing without naming a country. Needs direct confirmation from the brand. |
| Sacoor Brothers | The source spreadsheet itself says "consultar a etiqueta para ver origem" — origin varies per item. |
| Something Else | Site claims "100% Portuguese **distribution**. Our warehouses are located in Leiria" — distribution is not production. |
| Salsa, Tiffosi, Parfois, Lion of Porches, Decénio, Mr. Blue, Giovanni Galli, Quebramar | Portuguese companies, but the threads describe production largely outside Portugal, and no site claim was found. |
| Lanidor | Only the "Black Label" range is reported as Portuguese-made; would need `scope: parcial` plus a precise note. |

## Held — no production claim found, worth a second pass

Sites that are JavaScript-rendered, were unreachable, or simply do not state where they
manufacture: Sanjo, Lemon Jelly, NoBrand, Jak, Rokynori, Citadin, Ambitious, Beppi,
To Work For, La Paz ("local manufacturers", no country), Mazejo ("crafted in our
atelier", no country), Otherwise ("uma pequena fábrica de 8 pessoas", no country),
Chulé (organic cotton stated, origin not), Cubanas, Casa das Peles, Fly London,
Singular Leather, Mishmash, Meireles (historic claims only), Americo Tavar, Newve,
plus every Instagram-only and Etsy-only lead.

The full list with status is in `reddit-2026-10.csv`.

## Production locations — backfill, 2026-10-08

58 published brands had no `location`. Each brand's own site was read again (home,
about, contact and legal pages, rendered in a browser where the site needs
JavaScript), looking for where the product is **made**. A registered office, a shop
or a showroom does not count. Six sites name the place:

| Slug | Location | Quote from the brand's own site |
|---|---|---|
| `artame` | Porto / `gondomar` | "especializada no fabrico de artigos de cozinha, em aço inoxidável … Está localizada em Baguim do Monte, Gondomar" |
| `costa-nova` | Aveiro / `vagos` | "Grestel - Produtos Cerâmicos, fundada em 1998 e sediada em Vagos … dedica-se à produção de artigos de mesa, forno e acessórios de servir em grés fino" |
| `cutipol` | Braga / `guimaraes` | "Located at Cutipol's factory in Guimarães, Portugal"; "Guimarães Store (Factory) … 4805-157 Caldas das Taipas" |
| `ispari` | Leiria / `leiria` | "Morada Atelier: … Leiria 2400-076", with "processo de confecção local" |
| `koati` | Porto / `santo-tirso` | "Costafil, Lda, uma fábrica de vestuário"; "Costafil, Indústria e Comércio de Vestuário, LDA., com sede na … Palmeira – 4780-324 Santo Tirso" |
| `singular-leather` | Viseu / `tondela` | "carteiras minimalistas em couro, feitas à mão no seu atelier em Tondela desde 2016" |

Left empty on purpose (the site states something, but not where production happens):

- **Region only:** `plus351`, `seapath`, `portuguese-flannel` and `zilian` say "north
  of Portugal"; `coup-the-label` says "within 60 km of Porto".
- **Office or shop only:** `labrador`, `tema-creations`, `stro`, `chule`, `nae-vegan`,
  `lobo-apparel`, `travelling-socks`, `mishmash`, `thclothes`.
- **Not production:** `desculpa-babe` develops its collections in Viana do Castelo
  but does not say where they are made. `silampos` only gives its 1951 origin in
  Cesar (recorded as `founded: 1951`), not a current site. `tatara-razors` says
  "based in Porto" about the team.
- **No statement found:** the other 37.

The same pass recorded `founded` where the brand's own history gives the year, and
`products` from the ranges each site sells.
