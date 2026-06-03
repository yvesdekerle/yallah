import { YB } from '../utils/theme.ts'
import { ModalShell } from './ModalShell.tsx'

interface ConfirmModalProps {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Visual emphasis on the confirm button (danger = red). */
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Centred confirm dialog with title, optional message, and cancel / confirm
 * buttons. Backdrop tap, Escape and the focus trap come from {@link ModalShell}.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmBg = variant === 'danger' ? '#FF4757' : YB.ink

  return (
    <ModalShell
      ariaLabel={title}
      onClose={onCancel}
      align="center"
      panelClassName="w-full"
      panelStyle={{
        maxWidth: 320,
        background: '#fff',
        borderRadius: 20,
        padding: 22,
        boxShadow: '0 30px 60px -15px rgba(20,30,50,0.45)',
        textAlign: 'center',
      }}
    >
      <h2
        className="m-0 font-sans"
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: -0.3,
          color: YB.ink,
        }}
      >
        {title}
      </h2>
      {message && (
        <p
          className="font-sans"
          style={{
            margin: '10px 0 0',
            fontSize: 14,
            lineHeight: 1.45,
            color: YB.ink2,
          }}
        >
          {message}
        </p>
      )}
      <div className="flex" style={{ gap: 10, marginTop: 22 }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 font-sans cursor-pointer border-0"
          style={{
            padding: '12px 0',
            borderRadius: 99,
            background: YB.bgSoft,
            color: YB.ink,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 font-sans cursor-pointer border-0"
          style={{
            padding: '12px 0',
            borderRadius: 99,
            background: confirmBg,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
