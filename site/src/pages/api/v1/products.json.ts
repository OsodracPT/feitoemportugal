import type { APIRoute } from 'astro';
import { products } from '~/lib/data.ts';
import { apiProduct, envelope, jsonResponse } from '~/lib/api.ts';

export const GET: APIRoute = () =>
  jsonResponse(envelope(products.map(apiProduct), products.length));
