/**
 * Yallah brand palette. Kept as a flat object so we can reference it from
 * inline styles (drag transforms, animated colors) without going through
 * Tailwind's resolved theme.
 */
export const YB = {
  // Backgrounds (phone body) — 6 ambiances
  bgSun: '#FFCB45',
  bgCoral: '#FF8A6B',
  bgSoft: '#F4EFE5',
  bgLagoon: '#5BC0B8',
  bgLilac: '#C5B3DB',
  bgPistachio: '#CDDE7E',

  // Chrome
  paper: '#FFFCF5',
  ink: '#181B1F',
  ink2: '#3A3D44',
  muted: '#7A7B85',
  // Lighter muted grey for disabled / exhausted states (e.g. the super-like
  // star + badge when the quota is spent) and softer section sub-headings.
  mutedSoft: '#9A93A6',

  // Brand
  primary: '#FFCB45',
  primaryDeep: '#E5A30F',
  coral: '#FF6B47',
  coralDeep: '#E54D2A',

  // Verdict colors (after design iteration)
  oui: '#FF4D8D',
  non: '#6B6F78',
  neutre: '#4D8BF5',
  top: '#EFBF04',
  topLight: '#FFD84D',

  // Misc accents
  green: '#22C268',
} as const

export type YBKey = keyof typeof YB
