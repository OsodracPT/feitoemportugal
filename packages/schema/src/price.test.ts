import { describe, expect, it } from 'vitest';
import { median, setBrandPrice } from './price.ts';
import { priceLevel } from './taxonomy.ts';

const bands = { item: { pt: 'uma t-shirt', en: 'a T-shirt' }, max: [20, 45, 90] as [number, number, number] };

describe('priceLevel', () => {
  it('puts a price in the first band it fits, bounds included', () => {
    expect(priceLevel(bands, 12)).toBe(1);
    expect(priceLevel(bands, 20)).toBe(1);
    expect(priceLevel(bands, 20.5)).toBe(2);
    expect(priceLevel(bands, 90)).toBe(3);
    expect(priceLevel(bands, 140)).toBe(4);
  });
});

describe('median', () => {
  it('takes the middle value, or the mean of the two middle ones', () => {
    expect(median([35, 29, 120])).toBe(35);
    expect(median([30, 40, 35, 45])).toBe(37.5);
  });
});

describe('setBrandPrice', () => {
  const price = { level: 2, product: 't-shirts', eur: 35, checked: '2026-10-09' };

  it('inserts the fields before where_to_buy', () => {
    const text = 'slug: x\nproduction:\n  scope: total\nwhere_to_buy:\n  online_store: https://x.pt\nmeta:\n  added: 2026-01-01\n';
    expect(setBrandPrice(text, price)).toBe(
      'slug: x\nproduction:\n  scope: total\nprice_range: 2\ntypical_price:\n  product: t-shirts\n  eur: 35\n  checked: 2026-10-09\nwhere_to_buy:\n  online_store: https://x.pt\nmeta:\n  added: 2026-01-01\n',
    );
  });

  it('replaces fields already there', () => {
    const text =
      'slug: x\nprice_range: 4\ntypical_price:\n  product: t-shirts\n  eur: 99\n  checked: 2025-01-01\nmeta:\n  added: 2026-01-01\n';
    expect(setBrandPrice(text, price)).toBe(
      'slug: x\nprice_range: 2\ntypical_price:\n  product: t-shirts\n  eur: 35\n  checked: 2026-10-09\nmeta:\n  added: 2026-01-01\n',
    );
  });
});
