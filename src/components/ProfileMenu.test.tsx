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
      screen.getByRole('menuitem', { name: 'Se déconnecter' }),
    ).toBeInTheDocument()
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
