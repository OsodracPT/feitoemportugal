import type { APIRoute } from 'astro';
import { categories } from '~/lib/data.ts';
import { apiCategory, envelope, jsonResponse } from '~/lib/api.ts';

export const GET: APIRoute = () =>
  jsonResponse(envelope(categories.map(apiCategory), categories.length));
