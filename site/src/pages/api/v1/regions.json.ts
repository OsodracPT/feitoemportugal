import type { APIRoute } from 'astro';
import { regions } from '~/lib/data.ts';
import { apiRegion, envelope, jsonResponse } from '~/lib/api.ts';

export const GET: APIRoute = () => jsonResponse(envelope(regions.map(apiRegion), regions.length));
