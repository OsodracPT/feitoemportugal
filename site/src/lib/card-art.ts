/**
 * The azulejo dress of a brand card: which category tile backs it and which
 * trust shield it shows. The tiles and shields are tokens in `tokens.css`, so
 * they follow the theme toggle as well as the system.
 */
import type { Brand } from '@fep/schema';

export const TILES = ['alimentacao', 'calcado', 'casa', 'ceramica', 'cosmetica', 'vestuario'] as const;
export type Tile = (typeof TILES)[number];

/**
 * Six tiles for sixteen categories: each category borrows the nearest one.
 * A presentation choice, so it lives here and not in the CC BY taxonomy.
 */
export const CATEGORY_TILES: Record<string, Tile> = {
  'moda-e-vestuario': 'vestuario',
  calcado: 'calcado',
  acessorios: 'vestuario',
  joalharia: 'ceramica',
  'casa-e-decoracao': 'casa',
  'texteis-lar': 'casa',
  mobiliario: 'casa',
  'ceramica-e-vidro': 'ceramica',
  alimentacao: 'alimentacao',
  bebidas: 'alimentacao',
  'cosmetica-e-higiene': 'cosmetica',
  'bebe-e-crianca': 'vestuario',
  'desporto-e-outdoor': 'calcado',
  'papelaria-e-livros': 'ceramica',
  tecnologia: 'ceramica',
  animais: 'casa',
};

export const categoryTile = (category: string): Tile => CATEGORY_TILES[category] ?? 'ceramica';

/** 1 Declarado, 2 Com fontes, 3 Verificada (design/README.md §5.6). */
export type TrustLevel = 1 | 2 | 3;

/**
 * Every published brand states on its own site that it makes in Portugal, so
 * level 1 is the floor. Level 2 needs independent sources on the brand, which
 * the schema does not record yet (build step 4); level 3 is a maintainer's.
 */
export const trustLevel = (brand: Brand): TrustLevel => (brand.verification?.verified ? 3 : 1);
