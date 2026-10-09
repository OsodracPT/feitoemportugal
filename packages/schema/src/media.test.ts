import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brandSchema } from './brand.ts';
import { brokenSvg, imageSize, MAX_PHOTO_BYTES, setBrandMedia, unsafeSvg, validateMedia } from './media.ts';

const png = (width: number, height: number) => {
  const buffer = new Uint8Array(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(buffer.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return buffer;
};

const jpeg = (width: number, height: number) => {
  // SOI, an APP0 segment to skip, then SOF0 with the size.
  const bytes = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08];
  bytes.push(height >> 8, height & 0xff, width >> 8, width & 0xff, 0, 0, 0, 0, 0);
  return new Uint8Array(bytes);
};

describe('imageSize', () => {
  it('reads PNG and JPEG headers', () => {
    expect(imageSize(png(512, 128))).toEqual({ width: 512, height: 128 });
    expect(imageSize(jpeg(300, 200))).toEqual({ width: 300, height: 200 });
  });

  it('gives up on SVG', () => {
    expect(imageSize(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeUndefined();
  });
});

describe('unsafeSvg', () => {
  it('passes a plain drawing and refuses anything that can run or fetch', () => {
    expect(unsafeSvg('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>')).toBeUndefined();
    expect(unsafeSvg('<svg><script>alert(1)</script></svg>')).toMatch('script');
    expect(unsafeSvg('<svg onload="x()"></svg>')).toMatch('event handler');
    expect(unsafeSvg('<svg><image href="https://example.org/a.png"/></svg>')).toMatch('external');
  });
});

describe('brokenSvg', () => {
  it('passes a sized drawing and catches what Astro cannot size or render', () => {
    expect(brokenSvg('<svg viewBox="0 0 10 10"><path d="M0 0h1v1z"/></svg>')).toBeUndefined();
    expect(brokenSvg('<svg width="10" height="10"><symbol id="a"><path d="M0 0"/></symbol><use href="#a"/></svg>')).toBeUndefined();
    expect(brokenSvg('<svg class="logo"><use xlink:href="#logo"></use></svg>')).toMatch('viewBox');
    expect(brokenSvg('<svg viewBox="0 0 1 1"><use xlink:href="#logo"></use></svg>')).toMatch('#logo');
    expect(brokenSvg('<svg viewBox="0 0 1 1"><g/></svg>')).toMatch('draws nothing');
  });
});

describe('validateMedia', () => {
  const assetsDir = mkdtempSync(join(tmpdir(), 'fep-media-'));
  const folder = join(assetsDir, 'brands', 'marca-teste');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'logo.png'), png(120, 40));
  writeFileSync(join(folder, 'foto-1.jpg'), new Uint8Array(MAX_PHOTO_BYTES + 1));

  const loaded = (media: unknown) => [
    {
      file: 'data/brands/marca-teste.yaml',
      fileSlug: 'marca-teste',
      data: brandSchema.parse({
        slug: 'marca-teste',
        name: 'Marca Teste',
        description: { pt: 'Descrição.' },
        website: 'https://marca-teste.pt',
        category: 'calcado',
        production: { scope: 'total' },
        media,
        meta: { added: '2026-10-04', updated: '2026-10-04', source: 'maintainer' },
      }),
    },
  ];

  it('fails on a missing file or a path', () => {
    const issues = validateMedia(loaded({ logo: 'nope.svg', photos: ['../x.jpg'] }), assetsDir);
    expect(issues.map((i) => [i.level, i.path])).toEqual([
      ['error', 'media.logo'],
      ['error', 'media.photos.0'],
    ]);
  });

  it('warns on a small logo and a heavy photo', () => {
    const issues = validateMedia(loaded({ logo: 'logo.png', photos: ['foto-1.jpg'] }), assetsDir);
    expect(issues.map((i) => [i.level, i.path])).toEqual([
      ['warning', 'media.logo'],
      ['warning', 'media.photos.0'],
    ]);
  });
});

describe('setBrandMedia', () => {
  const text = [
    'slug: marca-teste',
    'description:',
    '  pt: >-',
    '    Texto dobrado',
    '    em duas linhas.',
    'verification:',
    '  verified: false',
    'meta:',
    '  added: 2026-10-04',
    '',
  ].join('\n');

  it('inserts the block before verification and leaves the rest alone', () => {
    const result = setBrandMedia(text, { logo: 'logo.svg', photos: [] });
    expect(result).toBe(text.replace('verification:', 'media:\n  logo: logo.svg\nverification:'));
  });

  it('replaces an existing block', () => {
    const once = setBrandMedia(text, { logo: 'logo.svg', photos: [] });
    const twice = setBrandMedia(once, { logo: 'logo.png', photos: ['foto-1.jpg', 'foto-2.jpg'] });
    expect(twice).toBe(
      text.replace('verification:', 'media:\n  logo: logo.png\n  photos: [foto-1.jpg, foto-2.jpg]\nverification:'),
    );
  });
});
