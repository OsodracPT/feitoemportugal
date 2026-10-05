import type { APIRoute } from 'astro';
import { absolute } from '~/lib/seo.ts';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /404
Disallow: /en/404

Sitemap: ${absolute('/sitemap.xml')}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
