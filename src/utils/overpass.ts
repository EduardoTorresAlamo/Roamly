// Overpass API is OpenStreetMap's query engine -- free, no API key, worldwide coverage.
// It is used instead of Google Maps Places because it has no rate limits for
// reasonable usage and does not require billing credentials.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

/**
 * A point of interest returned by the Overpass API query.
 *
 * Raw OSM tags are preserved on the object so callers can access any
 * additional metadata (opening hours, website, phone, etc.) beyond what
 * Roamly explicitly maps into the structured fields.
 */
export interface POI {
  /** OSM node ID converted to string for use as a React key */
  id: string
  name: string
  category: 'restaurant' | 'cafe' | 'bar' | 'museum' | 'attraction' | 'hotel' | 'park' | 'other'
  lat: number
  lon: number
  /** Straight-line distance in metres from the activity marker that triggered the query */
  distance: number
  /** Raw OpenStreetMap key-value tags for this node */
  tags: Record<string, string>
}

/**
 * Computes the great-circle distance between two WGS-84 coordinates using the
 * haversine formula, which accounts for Earth's curvature.
 *
 * Results are used to sort POIs by proximity and display distance badges.
 *
 * @param lat1 - Latitude of point A in decimal degrees
 * @param lon1 - Longitude of point A in decimal degrees
 * @param lat2 - Latitude of point B in decimal degrees
 * @param lon2 - Longitude of point B in decimal degrees
 * @returns Distance in metres
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000 // Earth's mean radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Maps raw OSM tag values to one of the app's POI categories.
 *
 * OSM uses the amenity, tourism, and leisure keys to classify places.
 * This function checks the most common values in priority order and falls
 * back to 'other' for anything not explicitly handled.
 *
 * @param tags - Raw OSM key-value tags for a node
 * @returns The best-matching POI category
 */
function tagToCategory(tags: Record<string, string>): POI['category'] {
  const amenity = tags['amenity'] ?? ''
  const tourism = tags['tourism'] ?? ''
  const leisure = tags['leisure'] ?? ''
  if (amenity === 'restaurant') return 'restaurant'
  if (amenity === 'cafe') return 'cafe'
  if (amenity === 'bar' || amenity === 'pub') return 'bar'
  if (amenity === 'museum' || tourism === 'museum') return 'museum'
  if (tourism === 'attraction' || tourism === 'viewpoint') return 'attraction'
  if (tourism === 'hotel' || tourism === 'hostel' || tourism === 'guest_house') return 'hotel'
  if (leisure === 'park' || leisure === 'garden') return 'park'
  return 'other'
}

/**
 * Fetches nearby points of interest from the Overpass API around a given coordinate.
 *
 * The Overpass QL query targets OSM nodes that have amenity, tourism, or leisure
 * tags matching common travel-relevant categories. The [timeout:10] directive
 * tells Overpass to abort and return an empty result rather than holding the
 * connection open if the server is under load.
 *
 * The query is sent as a POST body (application/x-www-form-urlencoded) because
 * Overpass QL strings can exceed GET URL length limits for complex queries.
 *
 * @param lat - Latitude of the focus point (e.g. a selected activity marker)
 * @param lon - Longitude of the focus point
 * @param radiusM - Search radius in metres (default 600)
 * @returns Up to 15 named POIs sorted by ascending distance, or an empty array on error
 */
export async function fetchNearbyPOIs(
  lat: number,
  lon: number,
  radiusM = 600,
): Promise<POI[]> {
  // Overpass QL query explanation:
  //   [out:json]          -- return JSON instead of XML
  //   [timeout:10]        -- abort after 10 s to avoid hanging the UI
  //   node[...](around:r,lat,lon) -- find OSM nodes within radius r of the point
  //   out body 30         -- return up to 30 raw results (we slice to 15 after sorting)
  const query = `
[out:json][timeout:10];
(
  node["amenity"~"restaurant|cafe|bar|pub|museum"](around:${radiusM},${lat},${lon});
  node["tourism"~"attraction|museum|hotel|hostel|guest_house|viewpoint"](around:${radiusM},${lat},${lon});
  node["leisure"~"park|garden"](around:${radiusM},${lat},${lon});
);
out body 30;
`.trim()

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    if (!res.ok) return []
    const json = await res.json() as { elements: Array<{ id: number; lat: number; lon: number; tags?: Record<string, string> }> }

    const pois: POI[] = json.elements
      // Filter out unnamed nodes -- they provide no useful display label
      .filter((el) => el.tags?.['name'])
      .map((el) => {
        const tags = el.tags ?? {}
        return {
          id: String(el.id),
          name: tags['name'] ?? 'Unknown',
          category: tagToCategory(tags),
          lat: el.lat,
          lon: el.lon,
          // Round to whole metres; sub-metre precision is not meaningful here
          distance: Math.round(haversineDistance(lat, lon, el.lat, el.lon)),
          tags,
        }
      })
      // Sort ascending so the closest places appear first in the NearbyPanel
      .sort((a, b) => a.distance - b.distance)
      // Cap at 15 to keep the panel scrollable without overwhelming the user
      .slice(0, 15)

    return pois
  } catch {
    // Network errors or Overpass downtime should not crash the UI
    return []
  }
}
