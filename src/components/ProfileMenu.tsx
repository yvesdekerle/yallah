import { useEffect, useRef, useState } from 'react'
import { YB } from '../utils/theme.ts'
import { AvatarPill } from './AvatarPill.tsx'

export interface ProfileMenuProps {
  /** Display name (shown in the popover header — never the email). */
  name: string
  /** Avatar URL. Omitted in demo mode ⇒ the coloured initial disc stands in. */
  picture?: string
  /** Avatar disc colour used for the initial fallback. */
  color: string
  onLogout: () => void
  /** Open the Réglages page (same target as the 5-taps-on-wordmark gesture). */
  onOpenSettings: () => void
  /** Surface a toast after the link is copied (clipboard fallback path). */
  onShared?: (message: string) => void
}

const AVATAR = 34

/**
 * Round profile avatar (top-right of the TopBar) with a popover menu:
 * "Paramètres" + "Se déconnecter". Used in BOTH modes — a Google-signed-in user
 * (real `picture`) and a demo participant (no picture ⇒ a coloured initial disc
 * as the stand-in "photo"). Closes on outside click or Escape.
 */
export function ProfileMenu({
  name,
  picture,
  color,
  onLogout,
  onOpenSettings,
  onShared,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  /** Share the current site URL: native share sheet on mobile, clipboard
      copy (with toast) as the fallback elsewhere. */
  const handleShare = async () => {
    setOpen(false)
    const url = window.location.href
    // `navigator.share` is typed as always present, but is absent on most
    // desktops — narrow to an optional shape so the runtime guard is honest.
    const share = (navigator as { share?: (data: ShareData) => Promise<void> })
      .share
    if (share) {
      try {
        await share.call(navigator, { title: 'Yallah', url })
      } catch {
        // User dismissed the native sheet — nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      onShared?.('Lien copié')
    } catch {
      onShared?.(url)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const initial = (name[0] ?? '?').toUpperCase()
  const showImg = picture && !imgError

  const itemStyle = {
    padding: '9px 10px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: YB.ink,
    fontSize: 14,
    fontWeight: 600,
  } as const

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Compte de ${name}`}
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
            src={picture}
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
          <AvatarPill initial={initial} color={color} size={AVATAR - 4} fontSize={13} />
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
            style={{ top: AVATAR + 8, right: 0, zIndex: 2, minWidth: 180, padding: 6 }}
          >
            <div
              className="font-sans"
              style={{
                padding: '6px 10px 8px',
                fontSize: 14,
                fontWeight: 700,
                color: YB.ink,
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {name}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onOpenSettings()
              }}
              className="font-sans w-full text-left cursor-pointer"
              style={itemStyle}
            >
              Paramètres
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleShare()
              }}
              className="font-sans w-full text-left cursor-pointer"
              style={itemStyle}
            >
              Partager
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="font-sans w-full text-left cursor-pointer"
              style={itemStyle}
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  )
}
