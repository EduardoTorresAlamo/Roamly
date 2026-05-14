const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export interface POI {
  id: string
  name: string
  category: 'restaurant' | 'cafe' | 'bar' | 'museum' | 'attraction' | 'hotel' | 'park' | 'other'
  lat: number
  lon: number
  distance: number   // metres from the focus point
  tags: Record<string, string>
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000 // metres
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
 * Fetch nearby points of interest from Overpass API (free, no API key).
 * Returns up to 15 named POIs sorted by distance from the focus point.
 */
export async function fetchNearbyPOIs(
  lat: number,
  lon: number,
  radiusM = 600,
): Promise<POI[]> {
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
      .filter((el) => el.tags?.['name'])
      .map((el) => {
        const tags = el.tags ?? {}
        return {
          id: String(el.id),
          name: tags['name'] ?? 'Unknown',
          category: tagToCategory(tags),
          lat: el.lat,
          lon: el.lon,
          distance: Math.round(haversineDistance(lat, lon, el.lat, el.lon)),
          tags,
        }
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15)

    return pois
  } catch {
    return []
  }
}
