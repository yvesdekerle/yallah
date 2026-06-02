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
  Filter,
} from '../icons/index.tsx'

interface ActionRowProps {
  onAct: (verdict: Verdict) => void
  /** Remaining super-like quota (clamped 0..SUPER_MAX). */
  superRemaining: number
  /** Called when the eye-toggle is clicked. */
  onToggleDetail: () => void
  /** True when the detail view is currently open (renders the eye-off icon). */
  detailOpen: boolean
  /** Opens the tag-filter sheet (far-left funnel button). */
  onOpenFilter?: () => void
  /** Number of active tag filters — shown as a badge on the funnel button. */
  activeFilterCount?: number
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
        className="yallah-action-btn transition-transform"
        style={{
          background: disabled ? 'rgba(255,255,255,0.55)' : '#fff',
          color,
          cursor: disabled ? 'not-allowed' : 'pointer',
          // Disabled: drop the shared shadow + dim. Enabled keeps both defaults.
          ...(disabled ? { boxShadow: 'none', opacity: 0.55 } : {}),
        }}
      >
        {icon}
      </button>
      {badge != null && (
        <span
          data-testid="super-badge"
          className="yallah-action-badge"
          style={{ background: badge > 0 ? color : '#9A93A6' }}
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
  onOpenFilter,
  activeFilterCount = 0,
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
      {onOpenFilter && (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={onOpenFilter}
            aria-label="filtrer par catégorie"
            className="yallah-action-btn transition-transform"
            style={{
              background: activeFilterCount > 0 ? YB.coral : '#fff',
              color: activeFilterCount > 0 ? '#fff' : YB.ink,
              cursor: 'pointer',
            }}
          >
            <Filter
              color={activeFilterCount > 0 ? '#fff' : YB.ink}
              size={22}
            />
          </button>
          {activeFilterCount > 0 && (
            <span
              data-testid="filter-badge"
              className="yallah-action-badge"
              style={{ background: YB.ink }}
            >
              {activeFilterCount}
            </span>
          )}
        </div>
      )}
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
        className="yallah-action-btn transition-all"
        style={{
          background: detailOpen ? YB.ink : '#fff',
          color: detailOpen ? '#fff' : YB.ink,
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
