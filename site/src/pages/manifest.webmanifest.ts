import type { APIRoute } from 'astro';
import { HTML_LANG, DEFAULT_LANG, t } from '~/lib/i18n.ts';

/** Install metadata; nginx serves it as application/manifest+json (deploy/nginx.conf). */
export const GET: APIRoute = () => {
  const manifest = {
    name: t(DEFAULT_LANG, 'site.name'),
    short_name: t(DEFAULT_LANG, 'site.name'),
    description: t(DEFAULT_LANG, 'site.description'),
    lang: HTML_LANG[DEFAULT_LANG],
    start_url: '/',
    scope: '/',
    display: 'browser',
    // --fep-bg in the light theme (styles/tokens.css), as in BaseHead's theme-color.
    background_color: '#F6F4EE',
    theme_color: '#F6F4EE',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
};
