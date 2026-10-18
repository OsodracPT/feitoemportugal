import { z } from 'zod';
import { brandSchema } from './brand.ts';

/**
 * JSON Schema for a brand file, generated from the Zod schema so the two can
 * never drift. Served at `/api/v1/schema.json` and usable from an editor with
 * `# yaml-language-server: $schema=…` at the top of a brand file.
 *
 * `io: 'input'` describes what an author writes: fields with defaults stay
 * optional. `unrepresentable: 'any'` drops the cross-field refinements (for
 * example "notes.pt is required when scope is parcial"), which JSON Schema
 * cannot express — those are still enforced by `pnpm validate`.
 */
export function brandJsonSchema(schemaUrl?: string): Record<string, unknown> {
  const generated = z.toJSONSchema(brandSchema, { io: 'input', unrepresentable: 'any' });
  return {
    ...(schemaUrl ? { $id: schemaUrl } : {}),
    title: 'Feito em Portugal brand',
    description:
      'A single brand file from data/brands/<slug>.yaml. Cross-field rules that JSON Schema cannot express are checked by the project validator.',
    ...generated,
  };
}
