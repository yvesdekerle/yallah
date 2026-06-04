import type { Activity } from '../types/activity.ts'
import type { Verdict, VoteEntry } from '../types/verdict.ts'
import type { MapView } from '../types/map.ts'
import type { DetailState } from '../hooks/useModalOverlays.ts'
import { DetailModal } from './DetailModal.tsx'
import { AppConfirmModals } from './AppConfirmModals.tsx'
import { IdentityPicker } from './IdentityPicker.tsx'
import { MapOverlay } from './MapOverlay.tsx'
import { SettingsModal } from './SettingsModal.tsx'
import { TagFilterSheet } from './TagFilterSheet.tsx'

/** A confirm dialog's visibility + its (self-closing) confirm and cancel. */
interface ConfirmDialog {
  open: boolean
  onConfirm: () => void
  onClose: () => void
}

export interface DetailOverlay {
  state: DetailState
  onClose: () => void
  onVerdict: (verdict: Verdict) => void
  /** DetailModal mini-map → open the fullscreen map above the sheet. */
  onOpenMap: (view: MapView) => void
}

export interface MapOverlayState {
  view: MapView | null
  aboveDetail: boolean
  onClose: () => void
  onSelectActivity: (activity: Activity) => void
}

export interface ConfirmOverlays {
  reset: ConfirmDialog
  randomFill: ConfirmDialog
  deleteActivity: ConfirmDialog
}

export interface PickerOverlay {
  show: boolean
  /** When false the picker is blocking (onboarding). */
  changingIdentity: boolean
  onPick: (id: string) => void
  onExit: () => void
}

export interface SettingsOverlay {
  open: boolean
  version: string
  onClose: () => void
}

export interface FilterOverlay {
  open: boolean
  availableTags: string[]
  tagCounts: Record<string, number>
  selected: string[]
  onApply: (tags: string[]) => void
  onClose: () => void
}

interface AppOverlaysProps {
  // Shared data the overlays read.
  history: VoteEntry[]
  /** Curated + user activities — drives meDone, the random-fill count, the map pins. */
  activities: Activity[]
  userId: string | null
  superRemaining: number
  // Each overlay's state + callbacks, grouped to keep the wiring legible.
  detail: DetailOverlay
  map: MapOverlayState
  confirms: ConfirmOverlays
  picker: PickerOverlay
  settings: SettingsOverlay
  filter: FilterOverlay
}

/**
 * The floating overlay layer above the four tab screens: the detail sheet, the
 * confirm dialogs, the identity picker, the fullscreen map, the settings sheet
 * and the tag-filter sheet.
 *
 * Props are grouped by overlay (`detail`, `map`, `confirms`, …) rather than ~40
 * flat props, so adding/changing an overlay touches one cohesive object. All
 * state still lives in App; the only derivations done here are pure view lookups
 * (meDone, myVerdict).
 *
 * Rendered at App level — NOT inside a scrollable screen — so each overlay's
 * `position: absolute; inset: 0` anchors to the Phone frame (see the
 * ConfirmModal gotcha in CLAUDE.md).
 */
export function AppOverlays({
  history,
  activities,
  userId,
  superRemaining,
  detail,
  map,
  confirms,
  picker,
  settings,
  filter,
}: AppOverlaysProps) {
  const meDone = history.length >= activities.length
  const detailState = detail.state
  const myVerdict = detailState
    ? (history.find((h) => h.id === detailState.activity.id)?.verdict ?? null)
    : null

  return (
    <>
      {detailState && (
        <DetailModal
          activity={detailState.activity}
          onClose={detail.onClose}
          superRemaining={superRemaining}
          onVerdict={detail.onVerdict}
          onOpenMap={detail.onOpenMap}
          meDone={meDone}
          userId={userId}
          myVerdict={myVerdict}
        />
      )}

      <AppConfirmModals
        confirmingReset={confirms.reset.open}
        onConfirmReset={confirms.reset.onConfirm}
        onCancelReset={confirms.reset.onClose}
        confirmingRandomFill={confirms.randomFill.open}
        randomFillCount={activities.length - history.length}
        onConfirmRandomFill={confirms.randomFill.onConfirm}
        onCancelRandomFill={confirms.randomFill.onClose}
        confirmingDeleteActivity={confirms.deleteActivity.open}
        onConfirmDeleteActivity={confirms.deleteActivity.onConfirm}
        onCancelDeleteActivity={confirms.deleteActivity.onClose}
      />

      {picker.show && (
        <IdentityPicker
          currentUserId={userId}
          onPick={picker.onPick}
          onClose={picker.changingIdentity ? picker.onExit : undefined}
        />
      )}

      {map.view && (
        <MapOverlay
          view={map.view}
          history={history}
          activities={activities}
          aboveDetail={map.aboveDetail}
          onClose={map.onClose}
          onSelectActivity={map.onSelectActivity}
        />
      )}

      {settings.open && (
        <SettingsModal version={settings.version} onClose={settings.onClose} />
      )}

      {filter.open && (
        <TagFilterSheet
          tags={filter.availableTags}
          tagCounts={filter.tagCounts}
          selected={filter.selected}
          onApply={filter.onApply}
          onClose={filter.onClose}
        />
      )}
    </>
  )
}
