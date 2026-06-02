import type { ReactNode } from 'react'
import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import {
  X,
  Heart,
  Star,
  Eye,
  EyeOff,
  WhyNotChevron,
} from '../icons/index.tsx'

interface ActionRowProps {
  onAct: (verdict: Verdict) => void
  /** Remaining super-like quota (clamped 0..SUPER_MAX). */
  superRemaining: number
  /** Called when the eye-toggle is clicked. */
  onToggleDetail: () => void
  /** True when the detail view is currently open (renders the eye-off icon). */
  detailOpen: boolean
  /** Whether the row is absolutely-positioned over the deck. */
  absolute?: boolean
}

interface ActionButtonProps {
  color: string
  verdict: Verdict
  onAct: (verdict: Verdict) => void
  icon: ReactNode
  badge?: number
  disabled?: boolean
  ariaLabel: string
}

function ActionButton({
  color,
  verdict,
  onAct,
  icon,
  badge,
  disabled,
  ariaLabel,
}: ActionButtonProps) {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          if (disabled) return
          onAct(verdict)
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        className="flex items-center justify-center border-0 p-0 transition-transform"
        style={{
          width: 52,
          height: 52,
          borderRadius: 99,
          background: disabled ? 'rgba(255,255,255,0.55)' : '#fff',
          color,
          boxShadow: disabled
            ? 'none'
            : '0 8px 18px -6px rgba(20,30,50,0.22), 0 1px 0 rgba(20,30,50,0.04)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {icon}
      </button>
      {badge != null && (
        <span
          data-testid="super-badge"
          className="absolute inline-flex items-center justify-center font-sans"
          style={{
            top: -3,
            right: -3,
            minWidth: 19,
            height: 19,
            padding: '0 5px',
            borderRadius: 99,
            background: badge > 0 ? color : '#9A93A6',
            color: '#fff',
            fontWeight: 800,
            fontSize: 11,
            border: '2px solid #fff',
            lineHeight: 1,
            boxShadow: '0 2px 4px -1px rgba(20,30,50,0.15)',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

/**
 * Floating row of action buttons: ✕ NON · ↓ WHY NOT · ★ SUPER LIKE
 * (with quota badge) · ♥ OUI · 👁 detail toggle.
 *
 * Designed to be reused between the swipe screen (`absolute=true`, floating
 * over the card) and the detail modal (`absolute=false`, sticky bottom bar).
 */
export function ActionRow({
  onAct,
  superRemaining,
  onToggleDetail,
  detailOpen,
  absolute = true,
}: ActionRowProps) {
  const noSuper = superRemaining <= 0
  const positionStyle = absolute
    ? {
        position: 'absolute' as const,
        bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
      }
    : { position: 'relative' as const }

  return (
    <div
      className="z-[7] flex items-center justify-center"
      style={{ ...positionStyle, gap: 8 }}
    >
      <ActionButton
        color={YB.non}
        verdict="non"
        onAct={onAct}
        icon={<X color={YB.non} size={22} />}
        ariaLabel="non"
      />
      <ActionButton
        color={YB.neutre}
        verdict="whynot"
        onAct={onAct}
        icon={<WhyNotChevron color={YB.neutre} size={22} />}
        ariaLabel="why not"
      />
      <ActionButton
        color={YB.top}
        verdict="top"
        onAct={onAct}
        icon={
          <Star
            color={noSuper ? '#9A93A6' : YB.top}
            fill={noSuper ? '#9A93A6' : YB.top}
            size={22}
          />
        }
        badge={superRemaining}
        disabled={noSuper}
        ariaLabel="super like"
      />
      <ActionButton
        color={YB.oui}
        verdict="oui"
        onAct={onAct}
        icon={<Heart color={YB.oui} fill={YB.oui} size={22} />}
        ariaLabel="like"
      />
      <button
        type="button"
        onClick={onToggleDetail}
        aria-label={detailOpen ? 'fermer le détail' : 'voir le détail'}
        className="flex items-center justify-center border-0 p-0 transition-all"
        style={{
          width: 52,
          height: 52,
          borderRadius: 99,
          background: detailOpen ? YB.ink : '#fff',
          color: detailOpen ? '#fff' : YB.ink,
          boxShadow:
            '0 8px 18px -6px rgba(20,30,50,0.22), 0 1px 0 rgba(20,30,50,0.04)',
          cursor: 'pointer',
        }}
      >
        {detailOpen ? (
          <EyeOff color="#fff" size={22} />
        ) : (
          <Eye color={YB.ink} size={22} />
        )}
      </button>
    </div>
  )
}
