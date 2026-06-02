import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Activity } from '../types/activity.ts'
import type { MapPin } from './FullscreenMap.tsx'

const fakeActivity = (id: string): Activity => ({
  id,
  number: 1,
  title: id,
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

const PIN_ALL: MapPin[] = [
  { activity: fakeActivity('a001'), coords: { lat: -20.4, lng: 57.7 }, verdict: 'oui' },
  { activity: fakeActivity('a002'), coords: { lat: -20.3, lng: 57.5 }, verdict: 'top' },
]
const PIN_SINGLE: MapPin = {
  activity: fakeActivity('a009'),
  coords: { lat: -20.1, lng: 57.4 },
  verdict: 'oui',
}

// useMapPins has its own test — stub it so MapOverlay's view→pins/center/zIndex
// wiring is exercised in isolation (and without touching the coords dataset).
vi.mock('../hooks/useMapPins.ts', () => ({
  useMapPins: () => ({
    likedPins: PIN_ALL,
    singleMapPin: (id: string) => (id === 'a009' ? [PIN_SINGLE] : []),
  }),
}))

// Stub the lazily-imported FullscreenMap (Leaflet) — surface the props we care
// about as data-attributes so the assertions stay DOM-level.
vi.mock('./FullscreenMap.tsx', () => ({
  FullscreenMap: (props: {
    pins: MapPin[]
    initialCenter?: { lat: number; lng: number }
    zIndex?: number
  }) => (
    <div
      data-testid="fullscreen-map"
      data-pins={props.pins.length}
      data-zindex={props.zIndex}
      data-center={
        props.initialCenter
          ? `${props.initialCenter.lat},${props.initialCenter.lng}`
          : 'none'
      }
    />
  ),
}))

import { MapOverlay } from './MapOverlay.tsx'

describe('MapOverlay', () => {
  it("mode 'all' renders every liked pin, no center, base z-index", async () => {
    render(
      <MapOverlay
        view={{ mode: 'all' }}
        history={[]}
        activities={[]}
        aboveDetail={false}
        onClose={() => {}}
        onSelectActivity={() => {}}
      />,
    )
    const map = await screen.findByTestId('fullscreen-map')
    expect(map.getAttribute('data-pins')).toBe('2')
    expect(map.getAttribute('data-center')).toBe('none')
    expect(map.getAttribute('data-zindex')).toBe('40')
  })

  it("mode 'single' centres on the activity's pin", async () => {
    render(
      <MapOverlay
        view={{ mode: 'single', activityId: 'a009' }}
        history={[]}
        activities={[]}
        aboveDetail={false}
        onClose={() => {}}
        onSelectActivity={() => {}}
      />,
    )
    const map = await screen.findByTestId('fullscreen-map')
    expect(map.getAttribute('data-pins')).toBe('1')
    expect(map.getAttribute('data-center')).toBe('-20.1,57.4')
  })

  it('bumps z-index to 60 when stacked above the detail sheet', async () => {
    render(
      <MapOverlay
        view={{ mode: 'all' }}
        history={[]}
        activities={[]}
        aboveDetail
        onClose={() => {}}
        onSelectActivity={() => {}}
      />,
    )
    const map = await screen.findByTestId('fullscreen-map')
    expect(map.getAttribute('data-zindex')).toBe('60')
  })
})
