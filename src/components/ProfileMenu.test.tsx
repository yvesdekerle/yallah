import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProfileMenu } from './ProfileMenu.tsx'
import { YB } from '../utils/theme.ts'

const base = { name: 'Mathieu', color: YB.coral }

function open() {
  fireEvent.click(screen.getByLabelText('Compte de Mathieu'))
}

describe('ProfileMenu', () => {
  it('shows the name (not an email) and the two menu items', () => {
    render(
      <ProfileMenu {...base} onLogout={() => {}} onOpenSettings={() => {}} />,
    )
    open()
    expect(
      screen.getByRole('menu', { name: 'Menu du compte' }),
    ).toHaveTextContent('Mathieu')
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Paramètres' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Partager' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Se déconnecter' }),
    ).toBeInTheDocument()
  })

  it('shares via the native sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share })
    render(
      <ProfileMenu {...base} onLogout={() => {}} onOpenSettings={() => {}} />,
    )
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Partager' }))
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: window.location.href }),
    )
    vi.unstubAllGlobals()
  })

  it('copies the link and toasts when the native sheet is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    })
    const onShared = vi.fn()
    render(
      <ProfileMenu
        {...base}
        onLogout={() => {}}
        onOpenSettings={() => {}}
        onShared={onShared}
      />,
    )
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Partager' }))
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(window.location.href)
      expect(onShared).toHaveBeenCalledWith('Lien copié')
    })
    vi.unstubAllGlobals()
  })

  it('closes on Escape', () => {
    render(
      <ProfileMenu {...base} onLogout={() => {}} onOpenSettings={() => {}} />,
    )
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Se déconnecter')).not.toBeInTheDocument()
  })

  it('renders the coloured initial when there is no picture (demo mode)', () => {
    render(
      <ProfileMenu {...base} onLogout={() => {}} onOpenSettings={() => {}} />,
    )
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('falls back to the initial when the picture fails to load', () => {
    render(
      <ProfileMenu
        {...base}
        picture="https://broken/x.jpg"
        onLogout={() => {}}
        onOpenSettings={() => {}}
      />,
    )
    const img = document.querySelector('img') as HTMLImageElement
    expect(img).toBeInTheDocument()
    fireEvent.error(img)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('fires onOpenSettings and onLogout from the menu items', () => {
    const onLogout = vi.fn()
    const onOpenSettings = vi.fn()
    render(
      <ProfileMenu
        {...base}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
      />,
    )
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Paramètres' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)

    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
