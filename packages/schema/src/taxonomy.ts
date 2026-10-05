import { z } from 'zod';
import { idSchema, localizedSchema, optionalHttpsUrlSchema } from './common.ts';

/** [latitude, longitude] — mainland Portugal, Madeira and the Azores. */
export const centroidSchema = z.tuple([
  z.number().min(29).max(43),
  z.number().min(-32.5).max(-6),
]);

const faqEntrySchema = z.object({
  question: localizedSchema,
  answer: localizedSchema,
});

const priceLevelSchema = z.object({
  level: z.int().min(1).max(4),
  label: localizedSchema,
});

const subcategorySchema = z.object({
  id: idSchema,
  label: localizedSchema,
  slug: localizedSchema,
  intro: localizedSchema.optional(),
});

export const categorySchema = z.object({
  id: idSchema,
  label: localizedSchema,
  slug: localizedSchema,
  intro: localizedSchema,
  faq: z.array(faqEntrySchema).default([]),
  price_levels: z.array(priceLevelSchema).length(4),
  subcategories: z.array(subcategorySchema).default([]),
});

export const categoriesFileSchema = z.array(categorySchema).min(1);

export const tagSchema = z.object({
  id: idSchema,
  label: localizedSchema,
  synonyms: z
    .object({
      pt: z.array(z.string().min(1)).default([]),
      en: z.array(z.string().min(1)).default([]),
    })
    .default({ pt: [], en: [] }),
});

export const tagsFileSchema = z.array(tagSchema).min(1);

export const REGION_TYPES = ['distrito', 'regiao-autonoma'] as const;

export const municipalitySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  centroid: centroidSchema.optional(),
});

export const regionSchema = z.object({
  id: idSchema,
  type: z.enum(REGION_TYPES),
  label: localizedSchema,
  slug: localizedSchema,
  intro: localizedSchema,
  centroid: centroidSchema,
  municipalities: z.array(municipalitySchema).min(1),
});

export const regionsFileSchema = z.array(regionSchema).min(1);

export const practiceSchema = z.object({
  id: idSchema,
  label: localizedSchema,
  description: localizedSchema.optional(),
});

export const certificationDefSchema = z.object({
  id: idSchema,
  label: localizedSchema,
  url: optionalHttpsUrlSchema,
  description: localizedSchema.optional(),
});

export const sustainabilityFileSchema = z.object({
  practices: z.array(practiceSchema).default([]),
  certifications: z.array(certificationDefSchema).default([]),
});

export type Category = z.infer<typeof categorySchema>;
export type Subcategory = z.infer<typeof subcategorySchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Region = z.infer<typeof regionSchema>;
export type Municipality = z.infer<typeof municipalitySchema>;
export type SustainabilityFile = z.infer<typeof sustainabilityFileSchema>;
export type Practice = z.infer<typeof practiceSchema>;
export type CertificationDef = z.infer<typeof certificationDefSchema>;

export interface Taxonomy {
  categories: Category[];
  tags: Tag[];
  regions: Region[];
  sustainability: SustainabilityFile;
}
