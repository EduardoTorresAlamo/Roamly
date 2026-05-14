const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const HEADERS = { 'User-Agent': 'Roamly/1.0 (travel planning app)' }

export interface GeoResult {
  lat: number
  lon: number
  displayName: string
}

/**
 * Geocode a place name using Nominatim (OpenStreetMap) — free, no API key.
 * Returns null on failure so callers can degrade gracefully.
 */
export async function geocodePlace(query: string): Promise<GeoResult | null> {
  if (!query.trim()) return null
  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
    if (!data.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    }
  } catch {
    return null
  }
}

/**
 * Geocode an activity (e.g. "Senso-ji Temple") with trip destination as context.
 * Uses a 200 ms pre-delay to respect Nominatim's 1 req/sec policy when called
 * in rapid succession. Returns null on failure.
 */
export async function geocodeActivity(
  title: string,
  tripDestination: string,
): Promise<GeoResult | null> {
  await new Promise((r) => setTimeout(r, 200))
  const query = tripDestination ? `${title}, ${tripDestination}` : title
  return geocodePlace(query)
}
