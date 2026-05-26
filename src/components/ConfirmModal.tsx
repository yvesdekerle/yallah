import { useEffect } from 'react'
import { YB } from '../utils/theme.ts'

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
 * Centred modal with title, optional message, and cancel / confirm buttons.
 * Tap on the backdrop or press Escape to dismiss.
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const confirmBg = variant === 'danger' ? '#FF4757' : YB.ink

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      className="absolute inset-0 z-[40] flex items-center justify-center font-sans"
      style={{
        background: 'rgba(20,25,40,0.55)',
        padding: '0 24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full"
        style={{
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
      </div>
    </div>
  )
}
