import type { APIRoute } from 'astro';
import { brandJsonSchema } from '@fep/schema';
import { apiPath, jsonResponse } from '~/lib/api.ts';
import { absolute } from '~/lib/seo.ts';

/**
 * Not wrapped in the envelope: a JSON Schema document has to stay a valid
 * schema so editors and validators can point straight at this URL.
 */
export const GET: APIRoute = () =>
  jsonResponse(brandJsonSchema(absolute(apiPath('schema.json'))));
