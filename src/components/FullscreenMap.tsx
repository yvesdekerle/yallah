import { useEffect, useRef, useState } from 'react'
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
import { heroPhotoUrl } from '../utils/photos.ts'
import { photoPinIcon } from '../utils/mapMarkers.ts'
import { useModalA11y } from '../hooks/useModalA11y.ts'

export interface MapPin {
  activity: Activity
  coords: Coords
  verdict: Verdict
}

interface FullscreenMapProps {
  pins: MapPin[]
  initialCenter?: Coords | undefined
  onClose: () => void
  onSelectActivity: (a: Activity) => void
  /** Stacking order. 40 by default; bumped to 60 when the map needs to
      sit on top of a still-open DetailModal (z 50). */
  zIndex?: number
}

// Centre on Maurice when there are no pins and no initialCenter.
const MAURITIUS_CENTER: [number, number] = [-20.25, 57.55]

// Ring the hero-photo marker in the verdict colour (gold for a super-like,
// pink for a like) with a matching glyph so the verdict reads at a glance.
function verdictPinIcon(activity: Activity, verdict: Verdict): L.DivIcon {
  return photoPinIcon({
    photo: heroPhotoUrl(activity),
    ring: verdict === 'top' ? YB.top : YB.oui,
    badge: verdict === 'top' ? '★' : '♥',
  })
}

function BoundsFitter({
  pins,
  initialCenter,
}: {
  pins: MapPin[]
  initialCenter?: Coords | undefined
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
  zIndex = 40,
}: FullscreenMapProps) {
  // Esc-to-close, focus trap + restoration (scoped to this overlay so it
  // dismisses ahead of a detail sheet underneath it).
  const ref = useRef<HTMLDivElement>(null)
  useModalA11y(ref, { onClose })

  // When this overlay is opened by a touch tap (e.g. the DetailModal
  // mini-map), mobile browsers synthesize a "ghost" mouse click ~300ms
  // later at the original tap coordinates — which land on this
  // freshly-mounted overlay and can fire the close button, dismissing the
  // map instantly. Ignore close/select actions until a short window has
  // elapsed after open, regardless of which element received the event.
  // (A handler-level guard is immune to the z-index/hit-testing quirks an
  // overlay "shield" div is subject to on mobile Safari.)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Carte des activités"
      className="absolute inset-0 outline-none"
      style={{ zIndex }}
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
            icon={verdictPinIcon(p.activity, p.verdict)}
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
                  onClick={() => {
                    if (!armed) return
                    onSelectActivity(p.activity)
                  }}
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
        onClick={() => {
          if (!armed) return
          onClose()
        }}
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
    </div>
  )
}
