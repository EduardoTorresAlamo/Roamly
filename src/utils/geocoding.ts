// Nominatim is OpenStreetMap's free geocoding API -- no API key required.
// Their usage policy requires a descriptive User-Agent header so they can
// contact abusive callers; anonymous requests may be rate-limited or blocked.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const HEADERS = { 'User-Agent': 'Roamly/1.0 (travel planning app)' }

export interface GeoResult {
  lat: number
  lon: number
  displayName: string
}

/**
 * Geocodes a free-text place name using the Nominatim OpenStreetMap API.
 *
 * Nominatim is chosen over Google Maps because it is free, requires no API key,
 * and returns sufficient accuracy for travel destination pinning. The tradeoff is
 * a stricter rate limit (1 request/second) that callers must respect.
 *
 * @param query - Human-readable place name, e.g. "Senso-ji Temple, Tokyo"
 * @returns Coordinates and display name, or null if the query fails or returns no results
 */
export async function geocodePlace(query: string): Promise<GeoResult | null> {
  if (!query.trim()) return null
  try {
    // limit=1 returns only the best match; accept-language=en ensures English display names
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return null
    // Nominatim returns lat/lon as strings; they must be parsed before use
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
    if (!data.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    }
  } catch {
    // Network errors or JSON parse failures degrade gracefully to null
    return null
  }
}

/**
 * Geocodes an activity title enriched with the trip's destination city for context.
 *
 * Appending the destination improves result accuracy: "Shibuya Crossing" alone
 * could match several places, but "Shibuya Crossing, Tokyo" will resolve correctly.
 *
 * A 200 ms delay is inserted before each request to stay within Nominatim's
 * documented 1 request/second rate limit when multiple activities are geocoded
 * in sequence during calendar import or bulk add operations.
 *
 * @param title - Activity name as entered by the user
 * @param tripDestination - The trip's destination city used to disambiguate the query
 * @returns Coordinates and display name, or null on failure
 */
export async function geocodeActivity(
  title: string,
  tripDestination: string,
): Promise<GeoResult | null> {
  // Throttle to 1 req/sec -- Nominatim's stated policy for non-commercial clients
  await new Promise((r) => setTimeout(r, 200))
  // Append destination city to reduce ambiguous geocoding results
  const query = tripDestination ? `${title}, ${tripDestination}` : title
  return geocodePlace(query)
}
