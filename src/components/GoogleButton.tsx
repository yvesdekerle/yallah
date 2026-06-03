import { YB } from '../utils/theme.ts'
import { GoogleGIcon } from './GoogleGIcon.tsx'

interface GoogleButtonProps {
  onClick?: () => void
  /** Disabled when no Client ID is configured. */
  disabled?: boolean
}

/**
 * Presentational "Se connecter avec Google" button (white card, G mark). Holds
 * no auth logic — the actual sign-in lives in {@link GoogleSignInButton}, which
 * renders this. When `disabled`, it shows an explanatory sublabel instead.
 */
export function GoogleButton({ onClick, disabled = false }: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center font-sans w-full"
      style={{
        gap: 10,
        padding: '13px 0',
        borderRadius: 99,
        background: YB.surface,
        color: YB.ink,
        fontWeight: 700,
        fontSize: 15,
        border: `1px solid ${YB.surfaceLine}`,
        boxShadow: `0 2px 10px -3px ${YB.shadow.md}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <GoogleGIcon size={18} />
      <span>
        {disabled ? 'Connexion Google indisponible' : 'Se connecter avec Google'}
      </span>
    </button>
  )
}
