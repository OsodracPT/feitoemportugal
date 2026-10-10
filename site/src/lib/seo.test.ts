import { describe, expect, it } from 'vitest';
import { brands } from './data.ts';
import { brandJsonLd, storeMapUrl } from './seo.ts';

const shop = { name: 'Loja Porto', city: 'Porto', address: 'Rua de Júlio Dinis 807' };

describe('storeMapUrl', () => {
  it('searches the name, address and city', () => {
    const url = new URL(storeMapUrl(shop)!);
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query')).toBe('Loja Porto, Rua de Júlio Dinis 807, Porto, Portugal');
  });

  it('gives no link without an address', () => {
    expect(storeMapUrl({ name: 'Loja Porto', city: 'Porto' })).toBeUndefined();
  });
});

describe('brandJsonLd', () => {
  const brand = brands[0]!;

  it('lists shops with an address as locations', () => {
    const withShops = {
      ...brand,
      where_to_buy: { marketplaces: [], physical_stores: [shop, { name: 'Stockist', city: 'Braga' }] },
    };
    const node = brandJsonLd(withShops, 'pt', {}) as { location?: { name: string; address: object }[] };
    expect(node.location).toHaveLength(1);
    expect(node.location![0]).toMatchObject({
      name: 'Loja Porto',
      address: { streetAddress: 'Rua de Júlio Dinis 807', addressLocality: 'Porto', addressCountry: 'PT' },
    });
  });

  it('has no location without one', () => {
    const node = brandJsonLd({ ...brand, where_to_buy: undefined }, 'pt', {});
    expect(node).not.toHaveProperty('location');
  });
});
