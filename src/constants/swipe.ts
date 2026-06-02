import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'

export const SWIPE_H = 90
export const SWIPE_V = 90
export const EXIT_DIST = 600
export const EXIT_MS = 300
export const BUTTON_EXIT_MS = 500
export const TOP_EXIT_MS = 750
export const SUPER_MAX = 5
export const TAP_MAX_MS = 250
export const TAP_MAX_DIST = 8

export interface VerdictMeta {
  color: string
  emoji: string
  label: string
}

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  oui: { color: YB.oui, emoji: '♥', label: 'LIKE' },
  non: { color: YB.non, emoji: '✕', label: 'NON' },
  whynot: { color: YB.neutre, emoji: '↓', label: 'WHY NOT' },
  top: { color: YB.top, emoji: '★', label: 'SUPER LIKE' },
}

export const STORAGE_KEYS = {
  history: 'yallah.history.v1',
  userId: 'yallah.userId.v1',
} as const
