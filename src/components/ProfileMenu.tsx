import { useEffect, useRef, useState } from 'react'
import type { GoogleUser } from '../types/user.ts'
import { YB } from '../utils/theme.ts'
import { AvatarPill } from './AvatarPill.tsx'

interface ProfileMenuProps {
  user: GoogleUser
  onLogout: () => void
}

const AVATAR = 34

/**
 * Round profile avatar (top-right of the TopBar) for a Google-signed-in user.
 * Tapping it opens a small popover with "Se déconnecter". Closes on outside
 * click or Escape. Shown only in Google mode (the demo flow has no avatar).
 */
export function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const initial = (user.name[0] ?? '?').toUpperCase()
  const showImg = user.picture && !imgError

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Compte de ${user.name}`}
        className="cursor-pointer"
        style={{
          width: AVATAR,
          height: AVATAR,
          borderRadius: 99,
          padding: 0,
          border: `2px solid ${YB.surface}`,
          background: 'transparent',
          boxShadow: `0 1px 4px ${YB.shadow.md}`,
          display: 'block',
          overflow: 'hidden',
        }}
      >
        {showImg ? (
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <AvatarPill
            initial={initial}
            color={YB.coral}
            size={AVATAR - 4}
            fontSize={13}
          />
        )}
      </button>

      {open && (
        <>
          {/* Outside-click catcher. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0"
            style={{ background: 'transparent', border: 'none', zIndex: 1 }}
          />
          <div
            role="menu"
            aria-label="Menu du compte"
            className="absolute font-sans yallah-card"
            style={{
              top: AVATAR + 8,
              right: 0,
              zIndex: 2,
              minWidth: 180,
              padding: 6,
            }}
          >
            <div
              className="font-sans"
              style={{
                padding: '6px 10px 8px',
                fontSize: 12,
                color: YB.muted,
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              {user.email}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="font-sans w-full text-left cursor-pointer"
              style={{
                padding: '9px 10px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: YB.ink,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  )
}
