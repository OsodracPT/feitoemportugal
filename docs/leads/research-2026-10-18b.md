# Research pass 2026-10-18 (second batch, 40 brands)

The last 40 from `scripts/research-due.ts` (mariano … vista-alegre); the due list is now
empty. Full pass on the brand's own site (about, FAQ, stores, contact pages). Prices are in
`prices.csv` (checked 2026-10-18). Applied without a maintainer, per the brand-researcher
rules: own shops with a street address on the brand's site (list below). Everything else
waits on the decisions dashboard.

## Shops applied (own shops, street address on the brand's site)
- mariano: Mariano Store Castilho, Rua Castilho 67B, 1250-068 Lisboa — marianoshoes.com/pages/our-stores
- mesh: Calçada do Sacramento 29, Lisboa; Largo de São Domingos 102, Porto — meshlabel.com/pages/lojas
- wayz: Rua do Breiner 323, Porto — wayzforlife.com/pages/ns-our-stores
- torres-novas: Campo de Ourique and Restelo, Lisboa — torresnovas.com/pages/stores
- sapataria-do-carmo: Largo do Carmo 26 and Rua do Carmo 89, Lisboa — sapatariadocarmo.com/pages/lojas-lisboa
- benamor: 9 shops (Lisboa ×7, Oeiras, Porto) — benamor1925.com/pages/our-stores (airport shop left out)
- ecola: Embaixada, Príncipe Real 26, Lisboa; Mouzinho da Silveira 270A, Porto — ecolaportugal.com/pages/contactos
- ferrache: Barcelos, Viana do Castelo, Guimarães, Leiria, Caldas da Rainha, Vila do Conde outlet — ferrache.com/pt/ferrache/as-nossas-lojas_319.html
- luis-onofre: Av. da Liberdade 247, Lisboa — luisonofre.com/pages/contact-us
- science4you: Parque das Nações (Expo Marina) — science4you.pt/conteudo/lojas-e-retalhistas/37
- oitava-colina: 8ª Graça, Rua Damasceno Monteiro 8A, Lisboa — oitavacolina.pt/contactos
- bordallo-pinheiro: Av. Guerra Junqueiro 28-D, Lisboa — eu.bordallopinheiro.com/en/stores
- cutipol: postcodes added to the two existing shops (from the FAQ).

## Findings
- **toino-abel** — contradicts location: "Atelier TOINO ABEL … 2460-395 Coz - Alcobaça",
  "Every piece is handmade in our atelier" (toinoabel.com). YAML has montemor-o-velho.
- **urbrand** — "porque a UR é uma loja, não temos só as peças que produzimos mas procuramos ter
  peças que, apesar de não serem produzidas por nós como os óculos de sol, os acessórios e algumas
  roupas…" (urbrandonline.com/pages/ur-brand-swimwear-a-marca-sobre-nos). 196 of 250 shop items
  are sunglasses. Case for `parcial`.
- **siz** — no `products`; dresses, shirts, trousers sewn in the Sesimbra atelier (siz-online.com/about).
- **sapataria-do-carmo** — "Trabalhamos com fábricas e fornecedores de longa data" (lojas-lisboa):
  own designs made by partner factories; fine for `total`.
- **torres-novas** — "fabricados em Portugal, em parceiros com dezenas de anos de parceria" (FAQ).
- **tatuaggi** — factory in São João da Madeira; half the capacity is private label. No online shop.
- **tensai** — OEM/private-label maker of refrigeration equipment, Estarreja. No online shop.
- **luis-onofre** — factory R. da Indústria 77, Oliveira de Azeméis; also produces for other brands.
- **ach-brito** — Lavanda bottles made by Vista Alegre Atlantis (partner), soaps in Fajozes.
- **vista-alegre** — 20 own stores in PT on the group locator; only factory-free ones proposed.
- **bordallo-pinheiro** — stores in Azores/Madeira on the locator are authorised resellers, not own.
- **valle-das-corujas** — long stockist list only ("lojas onde comprar"), not added.
- confianca, cutipol, ecola, burel-factory, benamor, claus-porto, carlos-santos, zouri (factory in
  Guimarães), urban-shepherd (workshop in Benedita), inedit, ispari, icel, feitoria-do-cacao,
  vandoma, old-mulla, rodilha, the-captain-socks, temahome, moshion, semogue: production claims as
  logged, location matches YAML.

## Prices
Suggested by `price-suggest`: urbrand €, old-mulla €€, rodilha €€, valle-das-corujas €€, zouri €€,
mariano €€€, maui €€€, mesh €€€, sapataria-do-carmo €€€, shoevenir €€€ (regular 109 €),
the-captain-socks €€€, torres-novas €€€, vandoma €€€, wayz €€€; siz €€€ once products are set.
No prices: moshion, tatuaggi, tensai (no shop); temahome, oitava-colina, urban-shepherd, semogue
(shop renders in JS or shows no prices); science4you (only 2 clean samples).

## Applied decisions (2026-10-18, maintainer answers)

- Prices: price_range set from prices.csv for urbrand (1), old-mulla, rodilha, valle-das-corujas, zouri (2), mariano, maui, mesh, sapataria-do-carmo, shoevenir, the-captain-socks, torres-novas, vandoma, wayz, hali-studio, siz (3), benedita-formosinho (4).
- toino-abel: location moved to leiria/alcobaca (atelier in Coz, Alcobaça); description updated.
- urbrand: production scope parcial; own swimwear/clothing made in the Porto atelier, sunglasses, accessories and some clothing resold.
- siz: products [vestidos, camisas, calcas].
- Factory shops added: ach-brito (Fajozes), ecola (Manteigas), cutipol (Caldas das Taipas), science4you (MARL Loures), oitava-colina (brewery taproom), bordallo-pinheiro (Caldas da Rainha, Ílhavo).
- Shared/studio shops added: wayz The Conscious Corner (Lisboa), ferrache Lisboa studio.
- vista-alegre: only the Ílhavo factory store added (maintainer note: "just that one"); the 18 group stores and Bordallo corners at El Corte Inglés not added.

## Media pass (2026-10-18)

- Logos applied: dois-corvos, fora, gandaia, poente (poente 241 px wide, warning).
- Brand-site photos applied (1 each, first pick): 73 brands. Sources in media-sources.csv.
- Not applied: lazuli (shop on shoelutions.store, not lazuli.pt), marqqa and pinknounou (picked shot under 800 px short side), musa-natural-cosmetics (download failed; file named "ChatGPT-Image…", likely AI-generated).

## Media pass, second round (2026-10-18)

- 134 more brand-site photos applied (picks 2–3); 143 brands now have 3 photos.
- portuguese-flannel: first pick unticked by maintainer; foto-1 removed.
- Not applied (under 800 px short side): jewellery-bymz (2), koati (1), marqqa (2), shirakawa (1). lazuli (2): shop on shoelutions.store. musa-natural-cosmetics (2): download fails.
- stro: website and online_store moved from pt.by-stro.com to www.by-stro.com (maintainer request); prices.csv and media-sources.csv URLs updated.
