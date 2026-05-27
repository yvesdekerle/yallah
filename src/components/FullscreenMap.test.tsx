import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('FullscreenMap', () => {
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

  it('calls onClose when the close button is tapped', () => {
    const onClose = vi.fn()
    render(
      <FullscreenMap
        pins={[]}
        onClose={onClose}
        onSelectActivity={() => {}}
      />,
    )
    fireEvent.click(screen.getByLabelText('fermer la carte'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSelectActivity when a popup detail button is tapped', () => {
    const onSelect = vi.fn()
    const a = fakeActivity('a001', 'Blue Bay', 1)
    render(
      <FullscreenMap
        pins={[{ activity: a, coords: { lat: -20.4, lng: 57.7 }, verdict: 'oui' }]}
        onClose={() => {}}
        onSelectActivity={onSelect}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /voir le détail/i }))
    expect(onSelect).toHaveBeenCalledWith(a)
  })
})
