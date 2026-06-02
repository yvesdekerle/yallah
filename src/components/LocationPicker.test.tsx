import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile" />,
  Marker: () => <div data-testid="marker" />,
  useMap: () => ({ setView: () => {} }),
  useMapEvents: () => null,
}))
vi.mock('leaflet', () => ({ default: { divIcon: () => ({}) } }))

import { LocationPicker } from './LocationPicker.tsx'

describe('LocationPicker — manual lat/lng entry', () => {
  it('commits typed latitude + longitude to onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LocationPicker value={null} onChange={onChange} />)
    await user.type(screen.getByLabelText('latitude'), '-20.3')
    await user.type(screen.getByLabelText('longitude'), '57.4')
    await user.tab() // blur commits
    expect(onChange).toHaveBeenLastCalledWith({ lat: -20.3, lng: 57.4 })
  })

  it('pre-fills the fields from an existing value', () => {
    render(
      <LocationPicker value={{ lat: -20.1, lng: 57.5 }} onChange={() => {}} />,
    )
    expect(screen.getByLabelText('latitude')).toHaveValue(-20.1)
    expect(screen.getByLabelText('longitude')).toHaveValue(57.5)
  })
})
