# Contribuir / Contributing

[Português](#português) · [English](#english)

## Português

O Feito em Portugal é uma base de dados aberta de marcas que fabricam em Portugal.
Qualquer pessoa pode sugerir uma marca, corrigir uma ficha ou melhorar o código.

### O critério

Uma marca entra quando o **próprio site** diz que os produtos são feitos em Portugal.
"Marca portuguesa" ou "desenhado em Portugal" não chega. Uma marca estrangeira entra
quando a maior parte do que vende é feita cá. Se só uma parte for feita em Portugal, a
ficha diz qual.

### Sugerir uma marca

Abre uma issue com o formulário
[Sugerir uma marca](../../issues/new?template=nova-marca.yml). Pedimos:

- o site da marca e a página onde ela diz que fabrica em Portugal, com a frase;
- duas ou três frases **tuas** sobre o que a marca faz. Não copies o texto da marca:
  os dados são publicados sob CC BY 4.0 e têm de ser nossos para os licenciar;
- o distrito e o concelho onde fabrica, só se a marca o disser. A morada do
  escritório ou da loja não conta.

Um responsável pelo projeto confirma a frase no site da marca e põe a etiqueta
`aprovado`. A partir daí um robô cria a ficha como rascunho e abre um pull request;
a marca aparece no site quando esse pull request for revisto e publicado.

Se trabalhas na marca ou és dono, diz-o no formulário. Podes sugerir a tua própria
marca; só pedimos que o digas.

### Corrigir uma ficha

Cada ficha tem um link "Sugerir correção" no fim, que abre o formulário
[Corrigir uma marca](../../issues/new?template=correcao.yml) já preenchido. Junta uma
fonte sempre que puderes, de preferência do site da marca.

### Pedir o selo de verificação

O selo quer dizer que alguém do projeto confirmou a produção por um meio
independente do site da marca: uma visita, um certificado, o contacto com o
fabricante. Não se paga. As marcas podem pedi-lo com o formulário
[Pedir verificação](../../issues/new?template=pedido-verificacao.yml). Um
responsável pelo projeto analisa cada pedido e, se confirmar a produção, preenche
o bloco `verification` da marca. A página
[/selo](https://feitoemportugal.org/selo) explica o processo.

### Editar os ficheiros diretamente

Se preferires um pull request, cada marca é um ficheiro YAML em `data/brands/`. O
[README](README.md#adding-or-editing-a-brand) explica o formato e
[`docs/collecting-brand-data.md`](docs/collecting-brand-data.md) explica como
investigar uma marca. Põe a frase que prova a produção na descrição do pull request
ou em `docs/leads/`, nunca no YAML, e deixa `status: draft` e o bloco
`verification` como estão.

Antes de abrir o pull request, corre:

```bash
pnpm validate && pnpm typecheck && pnpm test && pnpm build
```

### Código e textos do site

Os textos da interface estão em `site/src/i18n/pt.json` e `en.json`, sempre nas duas
línguas. Português de Portugal. Commits no formato
[Conventional Commits](https://www.conventionalcommits.org/).

## English

Feito em Portugal is an open database of brands that make their products in
Portugal. Anyone can suggest a brand, fix a brand page or improve the code.

### The rule

A brand is listed when **its own website** says its products are made in Portugal.
"Portuguese brand" or "designed in Portugal" is not enough. A foreign brand
qualifies when most of what it sells is made here. When only part is made in
Portugal, the brand page says which part.

### Suggest a brand

Open an issue with the
[Suggest a brand](../../issues/new?template=nova-marca.yml) form. It asks for:

- the brand's website and the page where it says it makes its products in
  Portugal, with the sentence;
- two or three sentences **of your own** about what the brand makes. Do not copy
  the brand's text: the data is published under CC BY 4.0 and has to be ours to
  license;
- the district and municipality where it makes things, only if the brand says so.
  An office or shop address does not count.

A maintainer checks the sentence on the brand's site and adds the `aprovado`
label. A bot then writes the brand file as a draft and opens a pull request; the
brand goes live once that pull request is reviewed and published.

If you work for or own the brand, say so in the form. You can suggest your own
brand; we only ask that you say it is yours.

### Fix a brand page

Every brand page ends with a "Suggest a correction" link that opens the
[Correct a brand](../../issues/new?template=correcao.yml) form, filled in. Add a
source when you can, ideally on the brand's own site.

### Ask for the verified badge

The badge means someone on the project confirmed production independently of the
brand's website: a visit, a certificate, contact with the manufacturer. It is
free. Brands can ask for it with the
[Request verification](../../issues/new?template=pedido-verificacao.yml) form. A
project maintainer reviews each request and, once production is confirmed, fills
in the brand's `verification` block. The
[/en/badge](https://feitoemportugal.org/en/badge) page explains the process.

### Edit the files directly

If you prefer a pull request, each brand is one YAML file in `data/brands/`. The
[README](README.md#adding-or-editing-a-brand) covers the format and
[`docs/collecting-brand-data.md`](docs/collecting-brand-data.md) covers how to
research a brand. Put the sentence that proves production in the pull request
description or in `docs/leads/`, never in the YAML, and leave `status: draft` and
the `verification` block as they are.

Before opening the pull request, run:

```bash
pnpm validate && pnpm typecheck && pnpm test && pnpm build
```

### Code and site copy

Interface text lives in `site/src/i18n/pt.json` and `en.json`, always in both
languages. Portuguese means European Portuguese. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## For maintainers

The issue forms use four labels. Create them once:

```bash
gh label create nova-marca  --color 11624A --description "Sugestão de marca"
gh label create correcao    --color FBCA04 --description "Correção a uma ficha"
gh label create verificacao --color 0E8A16 --description "Pedido de verificação"
gh label create aprovado    --color 5319E7 --description "Converte a sugestão num pull request"
```

`aprovado` on a `nova-marca` issue runs `.github/workflows/issue-to-pr.yml`, which
calls `scripts/issue-to-pr.ts`. The conversion itself is
`submissionFromIssue()` in `packages/schema/src/submission.ts`, which refuses a
brand already listed (same slug or same website), checks every field against the
schema and the taxonomy, and notes anything a maintainer should look at, such as a
description that repeats the brand's own words. The workflow header lists the
repository settings it needs.

Before merging such a pull request: open the evidence page and find the sentence,
add subcategory, tags and products, and set `status: published` when it is ready.
