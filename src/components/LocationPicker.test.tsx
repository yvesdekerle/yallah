import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('does not commit when a coordinate is missing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LocationPicker value={null} onChange={onChange} />)
    await user.type(screen.getByLabelText('latitude'), '-20.4')
    await user.tab()
    expect(onChange).not.toHaveBeenCalled()
  })
})

const mockFetchJson = (payload: unknown) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue({ json: async () => payload } as unknown as Response)

describe('LocationPicker — address search', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searches an address and commits the parsed coords', async () => {
    const user = userEvent.setup()
    mockFetchJson([{ lat: '-20.35', lon: '57.55' }])
    const onChange = vi.fn()
    render(<LocationPicker value={null} onChange={onChange} />)
    await user.type(screen.getByLabelText('rechercher une adresse'), 'Tamarin')
    await user.click(screen.getByLabelText('lancer la recherche'))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ lat: -20.35, lng: 57.55 }),
    )
  })

  it('shows "Aucun résultat" when the search returns nothing', async () => {
    const user = userEvent.setup()
    mockFetchJson([])
    const onChange = vi.fn()
    render(<LocationPicker value={null} onChange={onChange} />)
    await user.type(screen.getByLabelText('rechercher une adresse'), 'nowhere')
    await user.click(screen.getByLabelText('lancer la recherche'))
    expect(await screen.findByText('Aucun résultat trouvé.')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('rejects a result outside the Mauritius bounding box', async () => {
    const user = userEvent.setup()
    mockFetchJson([{ lat: '48.85', lon: '2.35' }]) // Paris
    const onChange = vi.fn()
    render(<LocationPicker value={null} onChange={onChange} />)
    await user.type(screen.getByLabelText('rechercher une adresse'), 'Paris')
    await user.click(screen.getByLabelText('lancer la recherche'))
    expect(await screen.findByText('Aucun résultat trouvé.')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows a network error when the fetch rejects', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    render(<LocationPicker value={null} onChange={vi.fn()} />)
    await user.type(screen.getByLabelText('rechercher une adresse'), 'Tamarin')
    await user.click(screen.getByLabelText('lancer la recherche'))
    expect(
      await screen.findByText('Recherche indisponible (réseau).'),
    ).toBeInTheDocument()
  })

  it('clears the position when "Effacer" is tapped', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <LocationPicker value={{ lat: -20.3, lng: 57.5 }} onChange={onChange} />,
    )
    await user.click(screen.getByLabelText('effacer la position'))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
