/**
 * Per-brand Open Graph images, drawn at build time. Satori lays the card out
 * and embeds the font as paths, so the result does not depend on the fonts
 * installed where the build runs; sharp turns the SVG into a PNG.
 * Server-only: reads files and pulls in sharp.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import type { Brand } from '@fep/schema';
import { getCategory, getMunicipality, getRegion, getSubcategory } from './data.ts';
import { localized, t, type Lang } from './i18n.ts';
import { initials } from './brand-initials.ts';

const repoRoot = join(import.meta.env.DATA_DIR, '..');
// Satori reads woff, not woff2, so the font comes from @fontsource rather than public/fonts.
const fontFile = (weight: number) =>
  readFileSync(
    createRequire(join(repoRoot, 'site/package.json')).resolve(
      `@fontsource/inter/files/inter-latin-${weight}-normal.woff`,
    ),
  );
const fonts = [
  { name: 'Inter', data: fontFile(400), weight: 400 as const, style: 'normal' as const },
  { name: 'Inter', data: fontFile(600), weight: 600 as const, style: 'normal' as const },
];

// The site's light palette (--fep-* in site/src/styles/tokens.css); a shared image has no dark mode.
const COLOR = {
  bg: '#f6f4ee',
  plate: '#ffffff',
  text: '#0e2f66',
  muted: '#3e4456',
  line: '#dcd8cd',
  accent: '#1a4c9c',
  accentSoft: '#e9eef7',
  sunken: '#e9eef7',
};

// The solid shield (site/public/favicon.svg), the logo's form at small sizes.
const SHIELD = `data:image/svg+xml;base64,${readFileSync(join(repoRoot, 'site/public/favicon.svg')).toString('base64')}`;

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

/**
 * The logo as a PNG Satori can draw, whatever format it is stored in. Satori
 * needs the drawn size up front, so it comes back with the image.
 */
async function logoImage(brand: Brand): Promise<{ src: string; width: number; height: number } | undefined> {
  if (!brand.media?.logo) return undefined;
  const { data, info } = await sharp(join(repoRoot, 'assets/brands', brand.slug, brand.media.logo), { density: 300 })
    .resize({ width: 520, height: 150, fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { src: `data:image/png;base64,${data.toString('base64')}`, width: info.width, height: info.height };
}

export async function brandOgImage(brand: Brand, lang: Lang): Promise<Buffer> {
  const category = getCategory(brand.category);
  const subcategory = brand.subcategory ? getSubcategory(brand.category, brand.subcategory) : undefined;
  const region = brand.location ? getRegion(brand.location.district) : undefined;
  const municipality =
    brand.location?.municipality && region ? getMunicipality(region.id, brand.location.municipality) : undefined;
  const label = subcategory ?? category;
  const district = region ? localized(region.label, lang) : undefined;
  // "Porto, Porto" says nothing twice: drop the district when the municipality shares its name.
  const place = [municipality?.name, municipality?.name === district ? undefined : district].filter(Boolean).join(', ');
  const subtitle = [label ? localized(label.label, lang) : null, place || null].filter(Boolean).join(' · ');
  const scope = brand.production.scope === 'parcial' ? t(lang, 'brand.productionPartial') : t(lang, 'brand.productionTotal');
  const logo = await logoImage(brand);

  const mark = logo
    ? el(
        'div',
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          padding: '24px 32px',
          background: COLOR.plate,
          border: `2px solid ${COLOR.line}`,
          borderRadius: 18,
        },
        el('img', { width: logo.width, height: logo.height }, undefined, logo),
      )
    : el(
        'div',
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 150,
          height: 150,
          borderRadius: 24,
          background: COLOR.sunken,
          color: COLOR.muted,
          fontSize: 60,
          fontWeight: 600,
        },
        initials(brand.name),
      );

  const card = el(
    'div',
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 64,
      background: COLOR.bg,
      fontFamily: 'Inter',
      color: COLOR.text,
    },
    [
      el('div', { display: 'flex', flexDirection: 'column', gap: 36 }, [
        mark,
        el('div', { display: 'flex', flexDirection: 'column', gap: 14 }, [
          el('div', { fontSize: brand.name.length > 22 ? 64 : 80, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05 }, brand.name),
          subtitle ? el('div', { fontSize: 32, color: COLOR.muted }, subtitle) : null,
        ].filter(Boolean)),
      ]),
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
        el('div', { display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 600 }, [
          el('img', { width: 36, height: 36 }, undefined, { src: SHIELD, width: 36, height: 36 }),
          t(lang, 'site.name'),
        ]),
        el(
          'div',
          {
            display: 'flex',
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 26,
            color: COLOR.accent,
            background: COLOR.accentSoft,
          },
          scope,
        ),
      ]),
    ],
  );

  const svg = await satori(card as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
