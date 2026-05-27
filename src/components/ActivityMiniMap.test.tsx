import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...rest }: { children: ReactNode }) => (
    <div data-testid="leaflet-map" {...rest}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="leaflet-marker">{children}</div>
  ),
}))

import { ActivityMiniMap } from './ActivityMiniMap.tsx'

describe('ActivityMiniMap', () => {
  it('renders a placeholder when coords is null and does not load the map', () => {
    render(<ActivityMiniMap coords={null} pinColor="#FF6B47" />)
    expect(
      screen.getByText(/pas de localisation précise/i),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('leaflet-map')).toBeNull()
  })

  it('renders the map with a marker when coords are provided', () => {
    render(
      <ActivityMiniMap
        coords={{ lat: -20.443, lng: 57.715 }}
        pinColor="#FF6B47"
      />,
    )
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument()
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument()
    expect(screen.getByTestId('leaflet-marker')).toBeInTheDocument()
  })

  it('calls onExpand when the map is tapped (only when coords present)', () => {
    const onExpand = vi.fn()
    render(
      <ActivityMiniMap
        coords={{ lat: -20.443, lng: 57.715 }}
        pinColor="#FF6B47"
        onExpand={onExpand}
      />,
    )
    fireEvent.click(screen.getByTestId('mini-map-tap-target'))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('placeholder is not tappable', () => {
    const onExpand = vi.fn()
    render(
      <ActivityMiniMap
        coords={null}
        pinColor="#FF6B47"
        onExpand={onExpand}
      />,
    )
    expect(screen.queryByTestId('mini-map-tap-target')).toBeNull()
    expect(onExpand).not.toHaveBeenCalled()
  })
})
