# Community submissions: evidence

One row per brand suggested through the "Sugerir uma marca" issue form. The quote is
the sentence the submitter copied from the brand's own site; a maintainer checks it
against the page before merging. Quotes live here, never in the brand file.

| Slug | Issue | Page | Quote from the brand's own site | Submitted by |
|---|---|---|---|---|
| `vibae` | [#1](https://github.com/OsodracPT/feitoemportugal/issues/1) | https://vibae.com/en-be | "VIBAe shoes are designed in Finland and hand crafted with love in Portugal." | a member of the public |
| `elite` | web form | https://eliteshoes.pt/pages/a-marca | "A marca Elite foi criada em França em 1990. Em 1991 começou a ser fabricada em Portugal e, no ano 2000, houve uma reestruturação na administração e a empresa que ficou com a marca foi aquela que inicialmente a começou a produzir, quando foi criada." | a member of the public |

### Notes from the maintainer review

- `vibae`: the same sentence is in the footer of every page, so it covers the
  whole range. Our Story (https://vibae.com/en-be/pages/our-story): founders from
  Finland and the US, first shoes in summer 2020, "We partnered with a family-run
  factory" in Portugal. We care (https://vibae.com/en-be/pages/we-care): "VIBAe
  shoes are made just outside Porto". Finnish brand, whole range made in Portugal,
  so it qualifies under the foreign-brand rule. District `porto` from that page;
  the submitter named Felgueiras, but the brand's site does not, so the
  municipality is left out. Orders ship from Finland.

- `elite`: submitted as "Benedita, Portugal." with Benedita as the municipality;
  the brand on the site is Elite, made by Trofal - Fábrica de Calçado in Benedita
  (Alcobaça). The quote gives the history; production today is in Tecnologia
  (https://eliteshoes.pt/pages/tecnologia): models developed in the in-house
  technical office and Goodyear-welted by "os nossos artesãos", and in Cuidados e
  reparação: "produzimos de forma manual" and repair the pairs they made. The site
  lists an open day in Benedita. Corroboration: APICCAPS, "Elite: three decades of
  quality" (portugueseshoes.pt, 2024-07-24) names Trofal as maker and production in
  Portugal since 1991; the Trofal registry entry (NIPC 500834890, Ribafria, 2475-011
  Benedita, Alcobaça; racius.com) has the same phone as Elite's contact page,
  262 925 300. Both set as `verification.sources` by the maintainer (level 2).
  `founded` left out: the 1990 French launch appears only in
  brand-sourced text. Earlier held in `sources-2026-10.csv` for lack of a place.
