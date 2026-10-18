import type { APIRoute } from 'astro';
import { taxonomy } from '~/lib/data.ts';
import { envelope, jsonResponse } from '~/lib/api.ts';

export const GET: APIRoute = () => jsonResponse(envelope(taxonomy.sustainability));
