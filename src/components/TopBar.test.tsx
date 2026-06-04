import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopBar } from './TopBar.tsx'

describe('TopBar — hidden settings gesture', () => {
  it('opens settings after 5 consecutive taps on the wordmark', () => {
    const onSecretOpen = vi.fn()
    render(<TopBar onSecretOpen={onSecretOpen} />)
    const mark = screen.getByText('yallah')
    for (let i = 0; i < 5; i++) fireEvent.click(mark)
    expect(onSecretOpen).toHaveBeenCalledTimes(1)
  })

  it('does not open before the 5th tap', () => {
    const onSecretOpen = vi.fn()
    render(<TopBar onSecretOpen={onSecretOpen} />)
    const mark = screen.getByText('yallah')
    for (let i = 0; i < 4; i++) fireEvent.click(mark)
    expect(onSecretOpen).not.toHaveBeenCalled()
  })

  it('is inert when no handler is provided', () => {
    render(<TopBar />)
    const mark = screen.getByText('yallah')
    for (let i = 0; i < 5; i++) fireEvent.click(mark)
    // No throw, nothing to assert beyond surviving the taps.
    expect(mark).toBeInTheDocument()
  })
})

describe('TopBar — profile avatar', () => {
  const profile = {
    name: 'Yves',
    color: '#FF8A00',
    picture: 'https://lh3.googleusercontent.com/a/abc',
  }

  it('shows no avatar when there is no profile', () => {
    render(<TopBar />)
    expect(screen.queryByLabelText(/Compte de/)).not.toBeInTheDocument()
  })

  it('shows the avatar + logout/settings menu when a profile is set', () => {
    const onLogout = vi.fn()
    const onOpenSettings = vi.fn()
    render(
      <TopBar
        profile={profile}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
      />,
    )
    const avatar = screen.getByLabelText('Compte de Yves')
    expect(avatar).toBeInTheDocument()
    // Menu hidden until opened.
    expect(screen.queryByText('Se déconnecter')).not.toBeInTheDocument()
    fireEvent.click(avatar)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('shows the avatar in demo mode too (no picture → coloured initial)', () => {
    render(
      <TopBar
        profile={{ name: 'Chloé', color: '#5BC0B8' }}
        onLogout={() => {}}
        onOpenSettings={() => {}}
      />,
    )
    expect(screen.getByLabelText('Compte de Chloé')).toBeInTheDocument()
  })
})
