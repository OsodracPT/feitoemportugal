import type { APIRoute } from 'astro';
import { tags } from '~/lib/data.ts';
import { apiTag, envelope, jsonResponse } from '~/lib/api.ts';

export const GET: APIRoute = () => jsonResponse(envelope(tags.map(apiTag), tags.length));
