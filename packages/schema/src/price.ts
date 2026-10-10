/**
 * Helpers for the € rating: the median of a brand's sampled prices, and writing
 * `price_range` / `typical_price` into a brand file without disturbing the rest.
 */

/** Median of the sampled prices; a single sale or flagship item moves it little. */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median of no values');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return Math.round(value * 100) / 100;
}

// Top-level keys that follow the price fields in a brand file, in schema order.
const KEYS_AFTER_PRICE = ['where_to_buy', 'social', 'media', 'sustainability', 'verification', 'meta'];

/** Replaces (or inserts) `price_range` and `typical_price` as text, keeping comments. */
export function setBrandPrice(
  yamlText: string,
  price: { level: number; product: string; eur: number; checked: string },
): string {
  const lines = yamlText.replace(/\n*$/, '\n').split('\n');
  lines.pop();
  const isTopLevel = (line: string) => /^[a-z_]+:/.test(line);

  for (const key of ['price_range', 'typical_price']) {
    const start = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (start === -1) continue;
    let end = start + 1;
    while (end < lines.length && !isTopLevel(lines[end]!)) end++;
    lines.splice(start, end - start);
  }

  const block = [
    `price_range: ${price.level}`,
    'typical_price:',
    `  product: ${price.product}`,
    `  eur: ${price.eur}`,
    `  checked: ${price.checked}`,
  ];
  const before = lines.findIndex((line) => KEYS_AFTER_PRICE.some((key) => line.startsWith(`${key}:`)));
  lines.splice(before === -1 ? lines.length : before, 0, ...block);
  return `${lines.join('\n')}\n`;
}
