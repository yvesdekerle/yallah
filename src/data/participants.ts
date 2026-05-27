export interface Participant {
  id: string
  name: string
  /** Display initial — usually the first letter of the name. */
  initial: string
  /** Background colour for the avatar circle. */
  color: string
  /**
   * Pre-baked swipe count, used in the Groupe tab while we don't have a real
   * backend. Omitted for the local user (`yves`) — their progress comes from
   * the localStorage history.
   */
  fakeProgress?: number
}

/**
 * Group for the Mauritius trip. Ordered alphabetically (case- and
 * accent-insensitive). Fake progress numbers below are picked once so the
 * Groupe screen looks lived-in; they stay stable across reloads.
 */
export const PARTICIPANTS: Participant[] = [
  { id: 'ade', name: 'Adé', initial: 'A', color: '#FFCB45', fakeProgress: 87 },
  { id: 'alex', name: 'Alex', initial: 'A', color: '#FF6B47', fakeProgress: 142 },
  { id: 'amely', name: 'Amély', initial: 'A', color: '#5BC0B8', fakeProgress: 56 },
  { id: 'audrey', name: 'Audrey', initial: 'A', color: '#C5B3DB', fakeProgress: 201 },
  { id: 'chloe', name: 'Chloé', initial: 'C', color: '#CDDE7E', fakeProgress: 23 },
  { id: 'july', name: 'July', initial: 'J', color: '#FF4D8D', fakeProgress: 178 },
  { id: 'mathieu', name: 'Mathieu', initial: 'M', color: '#4D8BF5', fakeProgress: 12 },
  { id: 'quentin', name: 'Quentin', initial: 'Q', color: '#EFBF04', fakeProgress: 134 },
  { id: 'yves', name: 'Yves', initial: 'Y', color: '#FF8A00' },
]
