import type { APIRoute } from 'astro';
import { searchDocs } from '~/lib/search.ts';

/** Built once, fetched lazily by the client on first use. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(searchDocs()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
