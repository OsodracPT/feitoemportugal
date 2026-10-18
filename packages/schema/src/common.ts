import { z } from 'zod';

/** kebab-case identifier used for slugs and taxonomy ids */
export const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case (a-z, 0-9 and single hyphens)');

export const httpsUrlSchema = z
  .url({ protocol: /^https$/, hostname: z.regexes.domain })
  .max(2000);

/** Optional field that YAML authors often leave as an empty string. */
const emptyToUndefined = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

export const optionalHttpsUrlSchema = emptyToUndefined(httpsUrlSchema);
export const optionalTextSchema = emptyToUndefined(z.string().max(2000));

/** Text that must exist in Portuguese; English is recommended (warning, not error). */
export const localizedRequiredPtSchema = z.object({
  pt: z.string().min(1, 'description.pt is required').max(2000),
  en: optionalTextSchema,
});

/** Both languages optional — used for notes. */
export const localizedOptionalSchema = z.object({
  pt: optionalTextSchema,
  en: optionalTextSchema,
});

/** Text that must exist in both languages — used across the taxonomy. */
export const localizedSchema = z.object({
  pt: z.string().min(1),
  en: z.string().min(1),
});

export const isoDateSchema = z.iso.date();

/** Social handle: no '@', no URL, no slashes. */
export const handleSchema = emptyToUndefined(
  z
    .string()
    .min(1)
    .max(60)
    .refine((v) => !v.startsWith('@'), 'drop the leading "@"')
    .refine((v) => !/^https?:\/\//i.test(v) && !v.includes('/'), 'use the handle only, not a URL'),
);
