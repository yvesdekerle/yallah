export interface Participant {
  id: string
  name: string
  /** Display initial — usually the first letter of the name. */
  initial: string
  /** Background colour for the avatar circle. */
  color: string
}

/**
 * Group for the Mauritius trip. Hard-coded for now — Google auth + per-user
 * voting will move this to a backend later. Ordered alphabetically
 * (case- and accent-insensitive).
 */
export const PARTICIPANTS: Participant[] = [
  { id: 'ade', name: 'Adé', initial: 'A', color: '#FFCB45' },
  { id: 'alex', name: 'Alex', initial: 'A', color: '#FF6B47' },
  { id: 'amely', name: 'Amély', initial: 'A', color: '#5BC0B8' },
  { id: 'audrey', name: 'Audrey', initial: 'A', color: '#C5B3DB' },
  { id: 'chloe', name: 'Chloé', initial: 'C', color: '#CDDE7E' },
  { id: 'july', name: 'July', initial: 'J', color: '#FF4D8D' },
  { id: 'mathieu', name: 'Mathieu', initial: 'M', color: '#4D8BF5' },
  { id: 'quentin', name: 'Quentin', initial: 'Q', color: '#EFBF04' },
  { id: 'yves', name: 'Yves', initial: 'Y', color: '#FF8A00' },
]
