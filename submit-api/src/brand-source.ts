/**
 * The two inputs the brand converter needs. Taxonomy changes rarely, so it is
 * loaded once from the bundled data directory and cached. The list of existing
 * brands (for slug/website dedup) is read fresh from the site's own public API,
 * so a brand added since the service last deployed is still seen.
 */
import { loadTaxonomy, type ExistingBrand, type Taxonomy } from '@fep/schema';

let taxonomyCache: Taxonomy | null = null;

export function getTaxonomy(dataDir: string): Taxonomy {
  if (!taxonomyCache) taxonomyCache = loadTaxonomy(dataDir);
  return taxonomyCache;
}

export async function fetchExistingBrands(siteOrigin: string): Promise<ExistingBrand[]> {
  const res = await fetch(`${siteOrigin}/api/v1/brands.json`);
  if (!res.ok) throw new Error(`cannot read existing brands: ${res.status}`);
  const body = (await res.json()) as { data: { slug: string; website: string }[] };
  return body.data.map((brand) => ({ slug: brand.slug, website: brand.website }));
}
