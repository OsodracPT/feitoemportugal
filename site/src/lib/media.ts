/**
 * Brand logos and photos, from `assets/brands/<slug>/` at the repository root.
 * Server-only: the glob pulls every image into the build, which is what lets
 * Astro optimise them, and must never reach a client bundle.
 */
import type { ImageMetadata } from 'astro';
import type { Brand } from '@fep/schema';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../../../assets/brands/*/*.{svg,png,jpg,jpeg,webp}',
  { eager: true },
);

const images = new Map(
  Object.entries(modules).map(([path, module]) => {
    const [, slug, file] = /assets\/brands\/([^/]+)\/([^/]+)$/.exec(path)!;
    return [`${slug}/${file}`, module.default];
  }),
);

export const brandLogo = (brand: Brand): ImageMetadata | undefined =>
  brand.media?.logo ? images.get(`${brand.slug}/${brand.media.logo}`) : undefined;

export const brandPhotos = (brand: Brand): ImageMetadata[] =>
  (brand.media?.photos ?? [])
    .map((file) => images.get(`${brand.slug}/${file}`))
    .filter((image): image is ImageMetadata => image !== undefined);
