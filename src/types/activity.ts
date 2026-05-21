export interface Difficulty {
  dot: string
  label: string
  detail?: string
}

export interface Activity {
  /** Stable id derived from the source number, padded — e.g. "a001". */
  id: string
  /** Source number (1..201). */
  number: number
  title: string
  tags: string[]
  category: string
  location: string
  transit: string
  description: string
  duration?: string
  difficulty?: Difficulty
  price: string
  /** Rating /5 (integer). */
  rating: number
  /** True when tagged 💎 in the source. */
  pepite: boolean
  /** True when tagged 🗝️ in the source. */
  secret: boolean
  /** Optional "Insolite" note (present mostly on 🗝️ entries). */
  insolite?: string
}
