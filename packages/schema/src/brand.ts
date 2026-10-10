import { z } from 'zod';
import {
  handleSchema,
  httpsUrlSchema,
  idSchema,
  isoDateSchema,
  localizedOptionalSchema,
  localizedRequiredPtSchema,
  optionalHttpsUrlSchema,
  optionalTextSchema,
} from './common.ts';

export const PRODUCTION_SCOPES = ['total', 'parcial'] as const;
export const BRAND_STATUSES = ['draft', 'published'] as const;
export const BRAND_SOURCES = ['github', 'web-form', 'maintainer', 'import', 'outreach'] as const;

export const MAX_PHOTOS = 4;

/** Evaluated when the module loads; a build in a new year accepts that year. */
const CURRENT_YEAR = new Date().getFullYear();

const productionSchema = z
  .object({
    scope: z.enum(PRODUCTION_SCOPES),
    notes: localizedOptionalSchema.optional(),
  })
  .refine((p) => p.scope !== 'parcial' || Boolean(p.notes?.pt), {
    message: 'production.notes.pt is required when production.scope is "parcial"',
    path: ['notes', 'pt'],
  });

const locationSchema = z.object({
  district: idSchema,
  municipality: idSchema.optional(),
});

// `address` is for a shop open to the public that the brand lists itself — never a
// workshop or production address, which may be someone's home.
const physicalStoreSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  address: z.string().min(1).max(200).optional(),
  url: optionalHttpsUrlSchema,
});

const whereToBuySchema = z.object({
  online_store: optionalHttpsUrlSchema,
  marketplaces: z.array(httpsUrlSchema).max(10).default([]),
  physical_stores: z.array(physicalStoreSchema).max(50).default([]),
});

const socialSchema = z.object({
  instagram: handleSchema,
  facebook: handleSchema,
  tiktok: handleSchema,
  linkedin: handleSchema,
  pinterest: handleSchema,
  youtube: handleSchema,
});

const mediaSchema = z.object({
  logo: optionalTextSchema,
  photos: z.array(z.string().min(1)).max(MAX_PHOTOS).default([]),
});

const certificationSchema = z.object({
  id: idSchema,
  proof_url: optionalHttpsUrlSchema,
});

const sustainabilitySchema = z.object({
  practices: z.array(idSchema).max(20).default([]),
  certifications: z.array(certificationSchema).max(20).default([]),
  notes: localizedOptionalSchema.optional(),
});

/** Maintainer-only block (enforced by CODEOWNERS + a CI warning). */
const verificationSchema = z
  .object({
    verified: z.boolean().default(false),
    date: isoDateSchema.nullish(),
    method: optionalTextSchema.nullable(),
    evidence_notes: optionalTextSchema.nullable(),
  })
  .refine((v) => !v.verified || Boolean(v.date), {
    message: 'verification.date is required when verified is true',
    path: ['date'],
  })
  .refine((v) => !v.verified || Boolean(v.method), {
    message: 'verification.method is required when verified is true',
    path: ['method'],
  });

/**
 * The median regular price of the brand's main product type, from its own shop,
 * on the date it was checked. It is what `price_range` is judged on, and the
 * brand page shows it next to the € symbols. The prices behind it are logged in
 * docs/leads/prices.csv by scripts/price-suggest.ts.
 */
const typicalPriceSchema = z.object({
  product: idSchema,
  eur: z.number().positive().max(100_000),
  checked: isoDateSchema,
});

const metaSchema = z.object({
  added: isoDateSchema,
  updated: isoDateSchema,
  source: z.enum(BRAND_SOURCES),
});

export const brandSchema = z.object({
  slug: idSchema,
  status: z.enum(BRAND_STATUSES).default('draft'),
  name: z.string().min(2).max(120),
  description: localizedRequiredPtSchema,
  website: httpsUrlSchema,
  category: idSchema,
  subcategory: idSchema.optional(),
  tags: z.array(idSchema).max(20).default([]),
  products: z.array(idSchema).max(30).default([]),
  founded: z.int().min(1000).max(CURRENT_YEAR).optional(),
  production: productionSchema,
  location: locationSchema.optional(),
  price_range: z.int().min(1).max(4).optional(),
  typical_price: typicalPriceSchema.optional(),
  where_to_buy: whereToBuySchema.optional(),
  social: socialSchema.optional(),
  media: mediaSchema.optional(),
  sustainability: sustainabilitySchema.optional(),
  verification: verificationSchema.optional(),
  meta: metaSchema,
});

export type Brand = z.infer<typeof brandSchema>;
export type BrandInput = z.input<typeof brandSchema>;
export type ProductionScope = (typeof PRODUCTION_SCOPES)[number];
export type BrandStatus = (typeof BRAND_STATUSES)[number];
