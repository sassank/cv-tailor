/** Remplace l'élément à l'index i. */
export function replaceAt<T>(arr: T[], i: number, item: T): T[] {
  return arr.map((x, j) => (j === i ? item : x));
}

/** Supprime l'élément à l'index i. */
export function removeAt<T>(arr: T[], i: number): T[] {
  return arr.filter((_, j) => j !== i);
}

/** Déplace l'élément i d'un cran vers le haut (-1) ou le bas (1). */
export function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Chaîne vide (ou espaces seuls) → null. */
export function orNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

/** Prochain identifiant libre pour un préfixe : "exp-" → "exp-7", "exp-2-b" → "exp-2-b4". */
export function nextId(existing: string[], prefix: string): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const max = existing.reduce((m, id) => {
    const match = id.match(pattern);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `${prefix}${max + 1}`;
}