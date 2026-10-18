/** Up to two initials, the fallback when a brand has no logo. Safe for the client. */
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
