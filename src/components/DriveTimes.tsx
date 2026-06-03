import type { Activity } from '../types/activity.ts'
import { YB } from '../utils/theme.ts'
import { coordsFor } from '../utils/coords.ts'
import {
  BASE_TAMARIN,
  BASE_TROU_AUX_BICHES,
  estimateDriveTime,
} from '../utils/distance.ts'

/**
 * Drive-time estimates from the two villa bases, computed from the activity's
 * coordinates. Without coords neither leg can be computed, so the block is
 * hidden rather than shown half-empty.
 */
export function DriveTimes({ activity }: { activity: Activity }) {
  const coords = coordsFor(activity)
  if (!coords) return null
  const tamarinValue = estimateDriveTime(coords, BASE_TAMARIN)
  const troubValue = estimateDriveTime(coords, BASE_TROU_AUX_BICHES)
  return (
    <div
      className="font-sans"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 10,
        rowGap: 6,
        alignItems: 'center',
        marginBottom: 26,
        padding: '12px 14px',
        background: YB.bgSoft,
        borderRadius: 12,
        fontSize: 14,
      }}
      aria-label="Trajets depuis les villas"
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 99,
          background: YB.surface,
          fontSize: 16,
          lineHeight: 1,
        }}
        aria-hidden
      >
        🚗
      </span>
      <div style={{ color: YB.ink }}>
        <span style={{ fontWeight: 700 }}>{BASE_TAMARIN.label}</span>
        {' : '}
        {tamarinValue}
      </div>
      <span aria-hidden />
      <div style={{ color: YB.ink2 }}>
        <span style={{ fontWeight: 700 }}>{BASE_TROU_AUX_BICHES.label}</span>
        {' : '}
        {troubValue}
      </div>
    </div>
  )
}
