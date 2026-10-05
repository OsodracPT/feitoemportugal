import type { APIRoute, GetStaticPaths } from 'astro';
import { brands } from '~/lib/data.ts';
import { apiBrand, envelope, jsonResponse } from '~/lib/api.ts';

export const getStaticPaths: GetStaticPaths = () =>
  brands.map((brand) => ({ params: { slug: brand.slug }, props: { brand } }));

export const GET: APIRoute = ({ props }) => jsonResponse(envelope(apiBrand(props.brand)));
