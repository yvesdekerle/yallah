import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import type { Coords } from '../utils/coords.ts'
import { YB } from '../utils/theme.ts'
import { photoPinIcon } from '../utils/mapMarkers.ts'

interface ActivityMiniMapProps {
  coords: Coords | null
  pinColor: string
  /** Hero photo for the circular marker. Falls back to a plain dot when absent. */
  photo?: string
  onExpand?: () => void
}

function makeDotIcon(color: string): L.DivIcon {
  const html = `
    <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="${color}" stroke="#fff" stroke-width="2.5" />
    </svg>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export function ActivityMiniMap({
  coords,
  pinColor,
  photo,
  onExpand,
}: ActivityMiniMapProps) {
  if (coords === null) {
    return (
      <div
        className="font-sans"
        style={{
          height: 180,
          background: YB.bgSoft,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: YB.muted,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        📍 Pas de localisation précise
      </div>
    )
  }

  return (
    <div
      data-testid="mini-map-tap-target"
      onClick={onExpand}
      style={{
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: onExpand ? 'pointer' : 'default',
        position: 'relative',
        // Sandbox Leaflet's internal pane z-indexes (200–700) so they can't
        // leak above sibling overlays like the photo lightbox.
        isolation: 'isolate',
      }}
    >
      <MapContainer
        center={[coords.lat, coords.lng]}
        zoom={14}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        touchZoom={false}
        keyboard={false}
        style={{ height: '100%', width: '100%', pointerEvents: 'none' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <Marker
          position={[coords.lat, coords.lng]}
          icon={
            photo
              ? photoPinIcon({ photo, ring: pinColor, size: 40 })
              : makeDotIcon(pinColor)
          }
        />
      </MapContainer>
    </div>
  )
}
