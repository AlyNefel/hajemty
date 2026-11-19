/**
 * Search text matching. It has no imports so it can be unit-tested with `node --test`.
 * - accent/case-insensitive ("Épilation" = "epilation"), Arabic text is kept as-is
 * - prefix matching ("coif" → "coiffure"), and stems are compared on the first 5 letters so
 *   "coiffeur" matches "coiffure" and "barbier" matches "barbiers"
 * - one-typo tolerance for words of 5+ letters ("hamam" → "hammam", "brushng" → "brushing")
 * - every query word must match somewhere (AND semantics), and the result is a relevance score
 */
export const fold = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[''`’]/g, " ");

const STOP = new Set(["a", "au", "aux", "de", "des", "du", "en", "et", "la", "le", "les", "l", "d", "pour", "sur", "un", "une", "chez", "pres", "moi"]);

export const tokenize = (s: string) =>
  fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !STOP.has(w));

/** Levenshtein distance capped at `max` (early exit), which keeps it cheap. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well one query token matches one word: 1 exact, .8 prefix/stem, .6 typo, 0 none. */
export function tokenScore(token: string, word: string): number {
  if (word === token) return 1;
  if (token.length >= 2 && word.startsWith(token)) return 0.8;
  if (token.length >= 5 && word.length >= 5 && token.slice(0, 5) === word.slice(0, 5)) return 0.75;
  if (token.length >= 5 && editDistance(token, word, 1) <= 1) return 0.6;
  if (token.length >= 8 && editDistance(token, word, 2) <= 2) return 0.5;
  return 0;
}

export type Field = { text: string; weight: number };

/**
 * Score a document (several weighted fields) against a query. Returns 0 when any query token is
 * unmatched, otherwise the sum of the best weighted match for each token.
 */
export function scoreDocument(query: string, fields: Field[]): number {
  const tokens = tokenize(query);
  if (!tokens.length) return 1;
  const indexed = fields.map((f) => ({ words: tokenize(f.text), weight: f.weight }));
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const f of indexed) for (const w of f.words) best = Math.max(best, tokenScore(t, w) * f.weight);
    if (best === 0) return 0;
    total += best;
  }
  return total;
}
