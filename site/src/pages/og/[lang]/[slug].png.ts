import type { APIRoute, GetStaticPaths } from 'astro';
import { brands } from '~/lib/data.ts';
import { LANGUAGES } from '~/lib/i18n.ts';
import { brandOgImage } from '~/lib/og.ts';

/** One share image per brand and language: `/og/pt/<slug>.png`, `/og/en/<slug>.png`. */
export const getStaticPaths: GetStaticPaths = () =>
  LANGUAGES.flatMap((lang) => brands.map((brand) => ({ params: { lang, slug: brand.slug }, props: { brand } })));

export const GET: APIRoute = async ({ params, props }) =>
  new Response(new Uint8Array(await brandOgImage(props.brand, params.lang as (typeof LANGUAGES)[number])), {
    headers: { 'Content-Type': 'image/png' },
  });
