import type { APIRoute } from 'astro';
import { brands } from '~/lib/data.ts';
import { apiBrand, envelope, jsonResponse } from '~/lib/api.ts';

export const GET: APIRoute = () =>
  jsonResponse(envelope(brands.map(apiBrand), brands.length));
