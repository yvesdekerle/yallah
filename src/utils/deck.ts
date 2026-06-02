import type { Activity } from '../types/activity.ts'
import type { VoteEntry } from '../types/verdict.ts'

export interface DeckSelection {
  /**
   * Activities fed to SwipeDeck, ordered so the voted ones come first and the
   * unvoted matches follow — preserving SwipeDeck's positional model where the
   * top card is `activities[history.length]`.
   */
  deckActivities: Activity[]
  /** True when a filter is active but no unvoted activity matches it. */
  filteredEmpty: boolean
}

/**
 * Builds the forward-swipe deck for the current tag filter.
 *
 * With no tags selected the full list passes through untouched. With a filter,
 * the deck becomes `[…voted, …unvoted-matching]` (OR semantics over tags): the
 * voted prefix has exactly `history.length` entries, so `activities[history.length]`
 * — the card SwipeDeck shows next — is always the first not-yet-voted match.
 */
export function filteredDeck(
  allActivities: Activity[],
  history: VoteEntry[],
  selectedTags: string[],
): DeckSelection {
  if (selectedTags.length === 0) {
    return { deckActivities: allActivities, filteredEmpty: false }
  }
  const votedSet = new Set(history.map((h) => h.id))
  const voted = allActivities.filter((a) => votedSet.has(a.id))
  const unvotedMatching = allActivities.filter(
    (a) => !votedSet.has(a.id) && a.tags.some((t) => selectedTags.includes(t)),
  )
  return {
    deckActivities: [...voted, ...unvotedMatching],
    filteredEmpty: unvotedMatching.length === 0,
  }
}
