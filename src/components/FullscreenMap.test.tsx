import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Activity } from '../types/activity.ts'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="leaflet-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({
    children,
    eventHandlers,
  }: {
    children?: ReactNode
    eventHandlers?: { click?: () => void }
  }) => (
    <div
      data-testid="leaflet-marker"
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children: ReactNode }) => (
    <div data-testid="leaflet-popup">{children}</div>
  ),
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
}))

import { FullscreenMap } from './FullscreenMap.tsx'

const fakeActivity = (id: string, title: string, n: number): Activity => ({
  id,
  number: n,
  title,
  tags: [],
  category: '',
  location: '',
  transit: '',
  description: '',
  price: '',
  rating: 5,
  pepite: false,
  secret: false,
})

// Past the 400ms ghost-click guard so close/select actions are armed.
function arm() {
  act(() => {
    vi.advanceTimersByTime(450)
  })
}

describe('FullscreenMap', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders one marker per pin', () => {
    render(
      <FullscreenMap
        pins={[
          {
            activity: fakeActivity('a001', 'Blue Bay', 1),
            coords: { lat: -20.4, lng: 57.7 },
            verdict: 'oui',
          },
          {
            activity: fakeActivity('a002', 'Tamarin Falls', 2),
            coords: { lat: -20.3, lng: 57.5 },
            verdict: 'top',
          },
        ]}
        onClose={() => {}}
        onSelectActivity={() => {}}
      />,
    )
    expect(screen.getAllByTestId('leaflet-marker')).toHaveLength(2)
  })

  it('calls onClose when the close button is tapped (after the guard window)', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(
      <FullscreenMap
        pins={[]}
        onClose={onClose}
        onSelectActivity={() => {}}
      />,
    )
    arm()
    fireEvent.click(screen.getByLabelText('fermer la carte'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores a close click within the ghost-click guard window', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(
      <FullscreenMap
        pins={[]}
        onClose={onClose}
        onSelectActivity={() => {}}
      />,
    )
    // No timer advance — still inside the 400ms window.
    fireEvent.click(screen.getByLabelText('fermer la carte'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onSelectActivity when a popup detail button is tapped (after the guard window)', () => {
    vi.useFakeTimers()
    const onSelect = vi.fn()
    const a = fakeActivity('a001', 'Blue Bay', 1)
    render(
      <FullscreenMap
        pins={[{ activity: a, coords: { lat: -20.4, lng: 57.7 }, verdict: 'oui' }]}
        onClose={() => {}}
        onSelectActivity={onSelect}
      />,
    )
    arm()
    fireEvent.click(screen.getByRole('button', { name: /voir le détail/i }))
    expect(onSelect).toHaveBeenCalledWith(a)
  })
})
