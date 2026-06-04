import { ConfirmModal } from './ConfirmModal.tsx'

interface AppConfirmModalsProps {
  confirmingReset: boolean
  onConfirmReset: () => void
  onCancelReset: () => void

  confirmingRandomFill: boolean
  /** Count of not-yet-voted activities, shown in the random-fill message. */
  randomFillCount: number
  onConfirmRandomFill: () => void
  onCancelRandomFill: () => void

  confirmingDeleteActivity: boolean
  onConfirmDeleteActivity: () => void
  onCancelDeleteActivity: () => void
}

/**
 * The three App-level confirm dialogs, grouped so they live next to the
 * `confirming*` state in useModalOverlays. Rendered at App level (not inside a
 * scrollable screen) so `position: absolute; inset: 0` anchors to the Phone
 * frame, not the scrolled content.
 */
export function AppConfirmModals({
  confirmingReset,
  onConfirmReset,
  onCancelReset,
  confirmingRandomFill,
  randomFillCount,
  onConfirmRandomFill,
  onCancelRandomFill,
  confirmingDeleteActivity,
  onConfirmDeleteActivity,
  onCancelDeleteActivity,
}: AppConfirmModalsProps) {
  return (
    <>
      {confirmingReset && (
        <ConfirmModal
          title="Réinitialiser les votes ?"
          message="Tous tes votes seront supprimés. Tu restes connecté(e) et ton profil est conservé. Cette action est irréversible."
          confirmLabel="Réinitialiser les votes"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={onConfirmReset}
          onCancel={onCancelReset}
        />
      )}

      {confirmingRandomFill && (
        <ConfirmModal
          title="Remplir aléatoirement ?"
          message={`${randomFillCount} activités non votées vont recevoir un verdict tiré au sort parmi : oui, non, why not, plus tard. Tu pourras toujours changer chaque vote ensuite.`}
          confirmLabel="Remplir"
          cancelLabel="Annuler"
          variant="primary"
          onConfirm={onConfirmRandomFill}
          onCancel={onCancelRandomFill}
        />
      )}

      {confirmingDeleteActivity && (
        <ConfirmModal
          title="Supprimer cette activité ?"
          message="L’activité, ton vote associé et ses photos seront supprimés. Cette action est irréversible."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={onConfirmDeleteActivity}
          onCancel={onCancelDeleteActivity}
        />
      )}
    </>
  )
}
