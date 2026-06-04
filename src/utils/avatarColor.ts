/**
 * Deterministic avatar disc colour for a Google member, picked from the yallah
 * palette by hashing their uid. Stable across renders/sessions so a given
 * person always shows the same colour (the demo participants carry their own
 * colours; this is only for real signed-in users).
 */
const PALETTE = [
  '#FF8A00',
  '#5BC0B8',
  '#C5B3DB',
  '#CDDE7E',
  '#FF6B47',
  '#4D8BF5',
  '#EFBF04',
  '#FF4D8D',
] as const

export function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return PALETTE[h % PALETTE.length]!
}
