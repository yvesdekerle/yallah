/**
 * Reverse-geocode a coordinate to a Mauritian place name (city / town /
 * village). Used by the add-activity form so the "Lieu" is derived from the
 * picked Position instead of a separate free-text field.
 *
 * Mirrors `LocationPicker`'s forward search: Nominatim, biased to Mauritius
 * (`zoom=10` ≈ city level). Any failure — network down, non-OK status, or a
 * payload we can't parse — resolves to `null` so the caller simply keeps the
 * previous value rather than blowing up the form.
 */
export async function reverseGeocodeCity(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
      `&format=json&zoom=10&addressdetails=1`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    })
    if (!res.ok) return null
    return cityFromReverse(await res.json())
  } catch {
    return null
  }
}

/**
 * Pull the best "city" label out of a Nominatim reverse payload, trying the
 * address parts from most to least specific. Exported for unit testing the
 * parsing in isolation from the network call.
 */
export function cityFromReverse(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const address = (raw as Record<string, unknown>).address
  if (!address || typeof address !== 'object') return null
  const a = address as Record<string, unknown>
  const candidates = [
    a.city,
    a.town,
    a.village,
    a.municipality,
    a.suburb,
    a.county,
    a.state,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim()
  }
  return null
}
