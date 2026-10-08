import { z } from 'zod';
import { idSchema } from './common.ts';
import type { Taxonomy } from './taxonomy.ts';
import type { Issue } from './dataset.ts';

/** [longitude, latitude], GeoJSON order — the opposite of `centroid`. */
const positionSchema = z.tuple([z.number().min(-32.5).max(-6), z.number().min(29).max(43)]);
const ringSchema = z.array(positionSchema).min(4);

const geometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: z.array(ringSchema).min(1) }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(ringSchema).min(1)).min(1) }),
]);

/** data/geo/districts.geojson, written by scripts/import-caop.ts. */
export const districtShapesSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: z.object({ district: idSchema }),
      geometry: geometrySchema,
    }),
  ),
});

export type DistrictShapes = z.infer<typeof districtShapesSchema>;
export type DistrictGeometry = z.infer<typeof geometrySchema>;

/** Every district has exactly one shape, and every shape is a known district. */
export function validateDistrictShapes(shapes: DistrictShapes, taxonomy: Taxonomy): Issue[] {
  const file = 'data/geo/districts.geojson';
  const issues: Issue[] = [];
  const seen = new Map<string, number>();
  for (const feature of shapes.features) {
    const id = feature.properties.district;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if (!taxonomy.regions.some((region) => region.id === id)) {
      issues.push({ level: 'error', file, path: 'features', message: `unknown district "${id}"` });
    }
  }
  for (const region of taxonomy.regions) {
    const count = seen.get(region.id) ?? 0;
    if (count !== 1) {
      issues.push({
        level: 'error',
        file,
        path: 'features',
        message: `district "${region.id}" has ${count} shapes, expected 1`,
      });
    }
  }
  return issues;
}
