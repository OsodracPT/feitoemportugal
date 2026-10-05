import { describe, expect, it } from 'vitest';
import { brandJsonSchema } from './json-schema.ts';

const schema = brandJsonSchema('https://feitoemportugal.org/api/v1/schema.json') as {
  $id: string;
  $schema: string;
  type: string;
  required: string[];
  properties: Record<string, { type?: string; pattern?: string; enum?: string[] }>;
};

describe('brandJsonSchema', () => {
  it('is a draft 2020-12 object schema with the given $id', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.$id).toBe('https://feitoemportugal.org/api/v1/schema.json');
    expect(schema.type).toBe('object');
  });

  it('keeps the fields an author has to write', () => {
    expect(schema.required).toEqual(
      expect.arrayContaining(['slug', 'name', 'description', 'website', 'category', 'production', 'meta']),
    );
  });

  it('leaves fields that have a default optional, since the author may omit them', () => {
    expect(schema.required).not.toContain('status');
    expect(schema.required).not.toContain('tags');
  });

  it('carries the constraints an editor can act on', () => {
    expect(schema.properties.slug?.pattern).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$');
    expect(schema.properties.status?.enum).toEqual(['draft', 'published']);
  });

  it('works without an $id, for local use', () => {
    expect(brandJsonSchema()).not.toHaveProperty('$id');
  });
});
