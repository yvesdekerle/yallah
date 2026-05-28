import { useEffect, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import type { Coords } from '../utils/coords.ts'
import { YB } from '../utils/theme.ts'

export interface MapPin {
  activity: Activity
  coords: Coords
  verdict: Verdict
}

interface FullscreenMapProps {
  pins: MapPin[]
  initialCenter?: Coords
  onClose: () => void
  onSelectActivity: (a: Activity) => void
}

// Centre on Maurice when there are no pins and no initialCenter.
const MAURITIUS_CENTER: [number, number] = [-20.25, 57.55]

function verdictPinIcon(verdict: Verdict): L.DivIcon {
  const isTop = verdict === 'top'
  const color = isTop ? YB.top : YB.oui
  const inner = isTop
    ? `<path d="M12 2 l2.6 6.5 6.9.6 -5.2 4.6 1.6 6.8 L12 16.7 6.1 20.5 7.7 13.7 2.5 9.1 9.4 8.5z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
    : `<path d="M12 21s-7-4.6-7-10a7 7 0 0 1 14 0c0 5.4-7 10-7 10z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`
  const html = `
    <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      ${inner}
    </svg>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function BoundsFitter({
  pins,
  initialCenter,
}: {
  pins: MapPin[]
  initialCenter?: Coords
}) {
  const map = useMap()
  useEffect(() => {
    if (initialCenter) {
      map.setView([initialCenter.lat, initialCenter.lng], 13)
      return
    }
    if (pins.length === 0) {
      map.setView(MAURITIUS_CENTER, 10)
      return
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.coords.lat, p.coords.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, pins, initialCenter])
  return null
}

export function FullscreenMap({
  pins,
  initialCenter,
  onClose,
  onSelectActivity,
}: FullscreenMapProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // When this overlay is opened by a touch tap (e.g. the DetailModal
  // mini-map), mobile browsers synthesize a "ghost" mouse click ~300ms
  // later at the original tap coordinates — which now land on this
  // freshly-mounted overlay and can hit the close button, dismissing the
  // map instantly. Block all interaction for a short window after mount so
  // that trailing click is swallowed.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Carte des activités"
      className="absolute inset-0 z-[40]"
    >
      <MapContainer
        center={MAURITIUS_CENTER}
        zoom={10}
        zoomControl
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <BoundsFitter pins={pins} initialCenter={initialCenter} />
        {pins.map((p) => (
          <Marker
            key={p.activity.id}
            position={[p.coords.lat, p.coords.lng]}
            icon={verdictPinIcon(p.verdict)}
          >
            <Popup>
              <div className="font-sans" style={{ minWidth: 160 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: YB.muted,
                    fontWeight: 600,
                  }}
                >
                  N°{p.activity.number}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: YB.ink,
                    margin: '2px 0 8px',
                    lineHeight: 1.3,
                  }}
                >
                  {p.activity.title}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectActivity(p.activity)}
                  className="font-sans cursor-pointer border-0"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 99,
                    background: YB.coral,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  Voir le détail
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button
        type="button"
        onClick={onClose}
        aria-label="fermer la carte"
        className="absolute font-sans cursor-pointer border-0"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: 12,
          width: 40,
          height: 40,
          borderRadius: 99,
          background: '#fff',
          color: YB.ink,
          fontSize: 20,
          fontWeight: 700,
          boxShadow: '0 4px 12px -2px rgba(20,30,50,0.25)',
          zIndex: 1000,
        }}
      >
        ✕
      </button>

      {!armed && (
        <div
          aria-hidden
          data-testid="map-click-shield"
          className="absolute inset-0"
          style={{ zIndex: 1100 }}
        />
      )}
    </div>
  )
}
