import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProfileMenu } from './ProfileMenu.tsx'

const base = { uid: '1', name: 'Yves', email: 'yves@example.com' }

describe('ProfileMenu', () => {
  it('toggles the menu and shows the email', () => {
    render(<ProfileMenu user={{ ...base }} onLogout={() => {}} />)
    fireEvent.click(screen.getByLabelText('Compte de Yves'))
    expect(screen.getByText('yves@example.com')).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Se déconnecter' }),
    ).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(<ProfileMenu user={{ ...base }} onLogout={() => {}} />)
    fireEvent.click(screen.getByLabelText('Compte de Yves'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Se déconnecter')).not.toBeInTheDocument()
  })

  it('falls back to the initial when the picture fails to load', () => {
    render(
      <ProfileMenu
        user={{ ...base, picture: 'https://broken/x.jpg' }}
        onLogout={() => {}}
      />,
    )
    const img = document.querySelector('img') as HTMLImageElement
    expect(img).toBeInTheDocument()
    fireEvent.error(img)
    // After the error the <img> is replaced by the initial pill.
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('Y')).toBeInTheDocument()
  })

  it('fires onLogout from the menu item', () => {
    const onLogout = vi.fn()
    render(<ProfileMenu user={{ ...base }} onLogout={onLogout} />)
    fireEvent.click(screen.getByLabelText('Compte de Yves'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
