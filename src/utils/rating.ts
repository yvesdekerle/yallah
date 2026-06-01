const COMMENTS: Record<number, string> = {
  5: 'Incontournable — un des temps forts du voyage.',
  4: 'Très chouette, vraiment recommandé.',
  3: 'Sympa, à faire si on a le temps.',
  2: 'Mitigé — à voir selon les envies.',
  1: 'Pas ouf — à zapper.',
}

/**
 * Short human comment matching a /5 rating. Returns `null` for unknown
 * integer values. The same text is reused for every activity sharing the
 * rating — there is no per-activity override yet.
 */
export function ratingComment(rating: number): string | null {
  return COMMENTS[Math.round(rating)] ?? null
}
