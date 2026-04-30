// Tiny replacements for the few lodash helpers we actually use.
// Keeps the bundle slim — we don't need all of lodash for two functions.

export function filter<T>(arr: readonly T[], pred: (item: T) => boolean): T[] {
  const out: T[] = [];
  for (const item of arr) if (pred(item)) out.push(item);
  return out;
}

export function flatten<T>(arr: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  for (const sub of arr) for (const item of sub) out.push(item);
  return out;
}
