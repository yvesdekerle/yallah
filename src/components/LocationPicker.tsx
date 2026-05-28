import { useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { YB } from '../utils/theme.ts'

interface LatLng {
  lat: number
  lng: number
}

interface LocationPickerProps {
  value: LatLng | null
  onChange: (next: LatLng | null) => void
}

const MAURITIUS_CENTER: [number, number] = [-20.25, 57.55]

function pinIcon(): L.DivIcon {
  const html = `
    <svg viewBox="0 0 24 24" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" fill="${YB.coral}" stroke="#fff" stroke-width="1.6"/>
      <circle cx="12" cy="10" r="2.6" fill="#fff"/>
    </svg>`
  return L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 28] })
}

/** Sets the pin where the user taps. */
function ClickCapture({ onPick }: { onPick: (c: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

/** Recenters the map imperatively when `center` changes. */
function Recenter({ center }: { center: LatLng | null }) {
  const map = useMap()
  if (center) map.setView([center.lat, center.lng], 14)
  return null
}

/**
 * Mini Leaflet picker for a user-added activity's location. Tap the map to
 * place/move the pin, or search an address (Nominatim, biased to Mauritius)
 * to recenter. Search is button/Enter triggered to respect Nominatim's
 * 1 req/s policy.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState<LatLng | null>(null)

  const runSearch = async () => {
    const q = query.trim()
    if (!q || searching) return
    setSearching(true)
    setError(null)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q,
      )}&format=json&limit=1&countrycodes=mu`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = (await res.json()) as Array<{ lat: string; lon: string }>
      if (data.length === 0) {
        setError('Aucun résultat trouvé.')
        return
      }
      const next = { lat: parseFloat(data[0]!.lat), lng: parseFloat(data[0]!.lon) }
      onChange(next)
      setSearched(next)
    } catch {
      setError('Recherche indisponible (réseau).')
    } finally {
      setSearching(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: 60,
    borderRadius: 14,
    border: `1px solid ${YB.bgSoft}`,
    background: '#fff',
    padding: '0 16px',
    fontSize: 16,
    color: YB.ink,
  }

  return (
    <div>
      <div className="flex" style={{ gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void runSearch()
            }
          }}
          placeholder="Rechercher une adresse à Maurice"
          aria-label="rechercher une adresse"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={searching || query.trim() === ''}
          className="font-sans cursor-pointer border-0"
          style={{
            height: 60,
            padding: '0 18px',
            borderRadius: 14,
            background: YB.ink,
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            opacity: searching || query.trim() === '' ? 0.5 : 1,
          }}
          aria-label="lancer la recherche"
        >
          {searching ? '…' : 'Chercher'}
        </button>
      </div>
      {error && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: YB.coralDeep }}>{error}</p>
      )}

      <div
        style={{
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          isolation: 'isolate',
        }}
      >
        <MapContainer
          center={value ? [value.lat, value.lng] : MAURITIUS_CENTER}
          zoom={value ? 14 : 10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ClickCapture onPick={onChange} />
          <Recenter center={searched} />
          {value && <Marker position={[value.lat, value.lng]} icon={pinIcon()} />}
        </MapContainer>
      </div>

      <div
        className="flex items-center"
        style={{ justifyContent: 'space-between', marginTop: 8 }}
      >
        <span style={{ fontSize: 12, color: YB.muted }}>
          {value
            ? `📍 ${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`
            : 'Tape sur la carte pour poser un repère.'}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-sans cursor-pointer border-0"
            style={{
              background: 'transparent',
              color: YB.coralDeep,
              fontSize: 12,
              fontWeight: 700,
              padding: 4,
            }}
            aria-label="effacer la position"
          >
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}
