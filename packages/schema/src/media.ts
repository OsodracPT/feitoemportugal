import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { Brand } from './brand.ts';
import type { Issue, LoadedBrand } from './dataset.ts';

/**
 * Brand logos and photos live in `assets/brands/<slug>/`, outside `data/`,
 * because they are not part of the CC BY dataset: they belong to the brands.
 */
export const MEDIA_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.webp'] as const;
/** Raster logos narrower than this look blurry on a brand page. */
export const MIN_LOGO_WIDTH = 256;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Reads the pixel size from the header of a PNG, JPEG, GIF or WebP file, so the
 * scripts and the checks need no image library. Returns undefined for SVG and
 * anything it does not recognise.
 */
export function imageSize(buffer: Uint8Array): ImageSize | undefined {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...buffer.subarray(start, start + length));

  if (buffer.length >= 24 && ascii(1, 3) === 'PNG') {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (buffer.length >= 10 && ascii(0, 3) === 'GIF') {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (buffer.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8X') {
      const read24 = (at: number) => buffer[at]! | (buffer[at + 1]! << 8) | (buffer[at + 2]! << 16);
      return { width: read24(24) + 1, height: read24(27) + 1 };
    }
    if (chunk === 'VP8 ') {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return undefined;
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) return undefined;
      const marker = buffer[offset + 1]!;
      const length = view.getUint16(offset + 2);
      // SOF0–SOF15 carry the frame size; C4, C8 and CC are other tables.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  return undefined;
}

/**
 * An SVG served from our own origin runs with our origin's rights if someone
 * opens it directly, so anything that can execute or pull in other content is
 * refused rather than cleaned up. Returns the reason, or undefined when clean.
 */
export function unsafeSvg(text: string): string | undefined {
  if (/<script\b/i.test(text)) return 'contains <script>';
  if (/<foreignObject\b/i.test(text)) return 'contains <foreignObject>';
  if (/\son[a-z]+\s*=/i.test(text)) return 'contains an event handler attribute';
  if (/javascript:/i.test(text)) return 'contains a javascript: URL';
  if (/(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\//i.test(text)) return 'links to an external resource';
  return undefined;
}

const issue = (level: Issue['level'], file: string, path: string, message: string): Issue => ({
  level,
  file,
  path,
  message,
});

/** Every file a brand's `media` block names, with its YAML path. */
export function mediaFiles(brand: Brand): { path: string; name: string; kind: 'logo' | 'photo' }[] {
  const files: { path: string; name: string; kind: 'logo' | 'photo' }[] = [];
  if (brand.media?.logo) files.push({ path: 'media.logo', name: brand.media.logo, kind: 'logo' });
  brand.media?.photos.forEach((name, index) =>
    files.push({ path: `media.photos.${index}`, name, kind: 'photo' }),
  );
  return files;
}

/**
 * Checks that every file named in `media` exists in `assets/brands/<slug>/`
 * and keeps to the format rules in docs/collecting-brand-data.md §3.8.
 */
export function validateMedia(brands: LoadedBrand[], assetsDir: string): Issue[] {
  const issues: Issue[] = [];
  for (const { file, data: brand } of brands) {
    for (const media of mediaFiles(brand)) {
      if (media.name.includes('/') || media.name.includes('\\') || media.name.startsWith('.')) {
        issues.push(issue('error', file, media.path, `"${media.name}" must be a plain file name`));
        continue;
      }
      const path = join(assetsDir, 'brands', brand.slug, media.name);
      if (!existsSync(path)) {
        issues.push(issue('error', file, media.path, `assets/brands/${brand.slug}/${media.name} does not exist`));
        continue;
      }
      const extension = extname(media.name).toLowerCase();
      if (!(MEDIA_EXTENSIONS as readonly string[]).includes(extension)) {
        issues.push(issue('error', file, media.path, `unsupported format "${extension}"`));
        continue;
      }
      if (extension === '.svg') {
        const reason = unsafeSvg(readFileSync(path, 'utf8'));
        if (reason) issues.push(issue('error', file, media.path, `unsafe SVG: ${reason}`));
      }
      if (media.kind === 'photo' && statSync(path).size > MAX_PHOTO_BYTES) {
        issues.push(issue('warning', file, media.path, 'photo is larger than 2 MB'));
      }
      if (media.kind === 'logo' && extension !== '.svg') {
        const size = imageSize(readFileSync(path));
        if (size && size.width < MIN_LOGO_WIDTH) {
          issues.push(
            issue('warning', file, media.path, `logo is ${size.width}px wide; ${MIN_LOGO_WIDTH}px or more looks sharp`),
          );
        }
      }
    }
  }
  return issues;
}

/** Top-level keys that come after `media` in a brand file, in schema order. */
const KEYS_AFTER_MEDIA = ['sustainability', 'verification', 'meta'];

/**
 * Writes a `media` block into a brand file's text, replacing the one that is
 * there. Works on the text, not a re-serialised document, so the rest of the
 * file (folded descriptions, comments, key order) stays byte for byte.
 */
export function setBrandMedia(yamlText: string, media: { logo?: string; photos: string[] }): string {
  const lines = yamlText.replace(/\n*$/, '\n').split('\n');
  lines.pop();
  const isTopLevel = (line: string) => /^[a-z_]+:/.test(line);

  const block = ['media:'];
  if (media.logo) block.push(`  logo: ${media.logo}`);
  if (media.photos.length > 0) block.push(`  photos: [${media.photos.join(', ')}]`);
  const replacement = block.length > 1 ? block : [];

  const start = lines.findIndex((line) => line.startsWith('media:'));
  if (start !== -1) {
    let end = start + 1;
    while (end < lines.length && !isTopLevel(lines[end]!)) end++;
    lines.splice(start, end - start, ...replacement);
  } else {
    const before = lines.findIndex((line) => KEYS_AFTER_MEDIA.some((key) => line.startsWith(`${key}:`)));
    lines.splice(before === -1 ? lines.length : before, 0, ...replacement);
  }
  return `${lines.join('\n')}\n`;
}
