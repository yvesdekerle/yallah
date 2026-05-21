import { YB } from '../utils/theme.ts'
import { Undo } from '../icons/index.tsx'

interface UndoButtonProps {
  enabled: boolean
  onClick: () => void
}

/**
 * Top-left floating undo button. Disabled when there's nothing to undo.
 */
export function UndoButton({ enabled, onClick }: UndoButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-label="annuler le dernier swipe"
      title="Annuler le dernier swipe"
      className="phone-undo absolute z-[9] flex items-center justify-center border-0 p-0 transition-opacity"
      style={{
        top: 46,
        left: 18,
        width: 36,
        height: 36,
        borderRadius: 99,
        background: enabled ? '#fff' : 'rgba(255,255,255,0.5)',
        color: enabled ? YB.ink : YB.muted,
        boxShadow: enabled
          ? '0 2px 8px -2px rgba(20,30,50,0.18)'
          : 'none',
        cursor: enabled ? 'pointer' : 'default',
        opacity: enabled ? 1 : 0.5,
      }}
    >
      <Undo color={enabled ? YB.ink : YB.muted} size={17} />
    </button>
  )
}
