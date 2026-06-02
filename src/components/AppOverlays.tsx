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

interface AppOverlaysProps {
  // --- Shared data ---
  history: VoteEntry[]
  /** Curated + user activities — drives meDone, the random-fill count, the map pins. */
  activities: Activity[]
  userId: string | null
  superRemaining: number

  // --- Detail sheet ---
  detail: DetailState
  onDetailClose: () => void
  onDetailVerdict: (verdict: Verdict) => void
  /** DetailModal mini-map → open the fullscreen map above the sheet. */
  onOpenMapAboveDetail: (view: MapView) => void

  // --- Fullscreen map ---
  mapView: MapView | null
  mapAboveDetail: boolean
  onCloseMap: () => void
  onMapSelectActivity: (a: Activity) => void

  // --- Confirm dialogs (reset / random-fill / delete) ---
  confirmingReset: boolean
  onReset: () => void
  onCloseReset: () => void
  confirmingRandomFill: boolean
  onRandomFill: () => void
  onCloseRandomFill: () => void
  confirmingDeleteActivity: boolean
  onConfirmDeleteActivity: () => void
  onCloseDeleteActivity: () => void

  // --- Identity picker ---
  showPicker: boolean
  /** When false the picker is blocking (onboarding) — no close affordance. */
  changingIdentity: boolean
  onPickIdentity: (id: string) => void
  onExitChangeIdentity: () => void

  // --- Settings ---
  settingsOpen: boolean
  appVersion: string
  onCloseSettings: () => void

  // --- Tag filter ---
  filterOpen: boolean
  availableTags: string[]
  tagCounts: Record<string, number>
  selectedTags: string[]
  onApplyTags: (tags: string[]) => void
  onCloseFilter: () => void
}

/**
 * The floating overlay layer that sits above the four tab screens: the detail
 * sheet, the confirm dialogs, the identity picker, the fullscreen map, the
 * settings sheet and the tag-filter sheet.
 *
 * Lifted out of App so the orchestrator's render reads as a high-level
 * composition (chrome + tabs + nav + this layer) rather than ~80 lines of modal
 * wiring. All state lives in App and reaches here as props; the only derivations
 * done locally are pure view lookups (meDone, myVerdict, the random-fill count).
 *
 * Rendered at App level — NOT inside a scrollable screen — so each overlay's
 * `position: absolute; inset: 0` anchors to the Phone frame, not to scrolled
 * content (see the ConfirmModal gotcha in CLAUDE.md).
 */
export function AppOverlays({
  history,
  activities,
  userId,
  superRemaining,
  detail,
  onDetailClose,
  onDetailVerdict,
  onOpenMapAboveDetail,
  mapView,
  mapAboveDetail,
  onCloseMap,
  onMapSelectActivity,
  confirmingReset,
  onReset,
  onCloseReset,
  confirmingRandomFill,
  onRandomFill,
  onCloseRandomFill,
  confirmingDeleteActivity,
  onConfirmDeleteActivity,
  onCloseDeleteActivity,
  showPicker,
  changingIdentity,
  onPickIdentity,
  onExitChangeIdentity,
  settingsOpen,
  appVersion,
  onCloseSettings,
  filterOpen,
  availableTags,
  tagCounts,
  selectedTags,
  onApplyTags,
  onCloseFilter,
}: AppOverlaysProps) {
  const meDone = history.length >= activities.length
  const myVerdict = detail
    ? (history.find((h) => h.id === detail.activity.id)?.verdict ?? null)
    : null

  return (
    <>
      {detail && (
        <DetailModal
          activity={detail.activity}
          onClose={onDetailClose}
          superRemaining={superRemaining}
          onVerdict={onDetailVerdict}
          onOpenMap={onOpenMapAboveDetail}
          meDone={meDone}
          userId={userId}
          myVerdict={myVerdict}
        />
      )}

      <AppConfirmModals
        confirmingReset={confirmingReset}
        onConfirmReset={() => {
          onReset()
          onCloseReset()
        }}
        onCancelReset={onCloseReset}
        confirmingRandomFill={confirmingRandomFill}
        randomFillCount={activities.length - history.length}
        onConfirmRandomFill={() => {
          onRandomFill()
          onCloseRandomFill()
        }}
        onCancelRandomFill={onCloseRandomFill}
        confirmingDeleteActivity={confirmingDeleteActivity}
        onConfirmDeleteActivity={onConfirmDeleteActivity}
        onCancelDeleteActivity={onCloseDeleteActivity}
      />

      {showPicker && (
        <IdentityPicker
          currentUserId={userId}
          onPick={onPickIdentity}
          onClose={changingIdentity ? onExitChangeIdentity : undefined}
        />
      )}

      {mapView && (
        <MapOverlay
          view={mapView}
          history={history}
          activities={activities}
          aboveDetail={mapAboveDetail}
          onClose={onCloseMap}
          onSelectActivity={onMapSelectActivity}
        />
      )}

      {settingsOpen && (
        <SettingsModal version={appVersion} onClose={onCloseSettings} />
      )}

      {filterOpen && (
        <TagFilterSheet
          tags={availableTags}
          tagCounts={tagCounts}
          selected={selectedTags}
          onApply={onApplyTags}
          onClose={onCloseFilter}
        />
      )}
    </>
  )
}
