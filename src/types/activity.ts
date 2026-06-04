export interface Difficulty {
  dot: string
  label: string
  detail?: string
}

/** Who added a user activity. Curated house picks omit this. */
export interface ActivityCreator {
  /** Firebase uid (Google) or demo participant id. */
  uid: string
  /** Display name kept with the activity (nom/prénom). */
  name: string
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
  /** True when the activity is a full-day destination — auto-derived from
      a "Journée complète" duration or an explicit ☀️ tag in the source.
      Optional in fixtures; the parser always emits a boolean. */
  journee?: boolean
  /** Optional "Insolite" note (present mostly on 🗝️ entries). */
  insolite?: string
  /** Runtime-only: true for user-added activities (absent from activities.json). */
  userAdded?: boolean
  /** Runtime-only: resolved photo URLs (object URLs for uploads + pasted URLs). */
  photoUrls?: string[]
  /** Coordinates for user-added activities (curated ones use coords.json). */
  coords?: { lat: number; lng: number }
  /** Who added it. Absent ⇒ curated house pick. */
  createdBy?: ActivityCreator
}
