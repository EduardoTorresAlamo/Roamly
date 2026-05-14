/**
 * Destination image fetching via Unsplash API.
 * Set VITE_UNSPLASH_ACCESS_KEY in .env.local to enable live search.
 * Without a key, falls back to curated Unsplash photo IDs for popular destinations.
 *
 * Coordinates are sourced from:
 *  1. Unsplash photo metadata (when available)
 *  2. Curated map (hardcoded for 20+ popular destinations)
 *  3. Nominatim geocoding (free, no API key) — runs as fallback for unknown destinations
 */

import { geocodePlace } from './geocoding'

interface UnsplashResult {
  url: string
  thumb: string
  attribution: string
  lat?: number
  lon?: number
}

// Curated fallback images for popular destinations (no API key needed)
const CURATED: Record<string, UnsplashResult> = {
  tokyo: {
    url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80&fit=crop',
    attribution: 'Roméo A.',
    lat: 35.6762, lon: 139.6503,
  },
  japan: {
    url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=80&fit=crop',
    attribution: 'Sorasak',
    lat: 35.6762, lon: 139.6503,
  },
  kyoto: {
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80&fit=crop',
    attribution: 'Sorasak',
    lat: 35.0116, lon: 135.7681,
  },
  paris: {
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80&fit=crop',
    attribution: 'Pedro Lastra',
    lat: 48.8566, lon: 2.3522,
  },
  london: {
    url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80&fit=crop',
    attribution: 'Benjamin Davies',
    lat: 51.5074, lon: -0.1278,
  },
  'new york': {
    url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80&fit=crop',
    attribution: 'Florian Wehde',
    lat: 40.7128, lon: -74.0060,
  },
  barcelona: {
    url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80&fit=crop',
    attribution: 'Henrique Ferreira',
    lat: 41.3851, lon: 2.1734,
  },
  rome: {
    url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80&fit=crop',
    attribution: 'David Köhler',
    lat: 41.9028, lon: 12.4964,
  },
  bali: {
    url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80&fit=crop',
    attribution: 'Artem Bali',
    lat: -8.3405, lon: 115.0920,
  },
  dubai: {
    url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80&fit=crop',
    attribution: 'David Rodrigo',
    lat: 25.2048, lon: 55.2708,
  },
  maldives: {
    url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&q=80&fit=crop',
    attribution: 'Ishan @seefromthesky',
    lat: 3.2028, lon: 73.2207,
  },
  sydney: {
    url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80&fit=crop',
    attribution: 'Dan Freeman',
    lat: -33.8688, lon: 151.2093,
  },
  amsterdam: {
    url: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5702?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5702?w=600&q=80&fit=crop',
    attribution: 'Adrien Olichon',
    lat: 52.3676, lon: 4.9041,
  },
  disney: {
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80&fit=crop',
    attribution: 'Brian McGowan',
    lat: 28.3772, lon: -81.5707,
  },
  'walt disney': {
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80&fit=crop',
    attribution: 'Brian McGowan',
    lat: 28.3772, lon: -81.5707,
  },
  disneyworld: {
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80&fit=crop',
    attribution: 'Brian McGowan',
    lat: 28.3772, lon: -81.5707,
  },
  bangkok: {
    url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&q=80&fit=crop',
    attribution: 'Florian Wehde',
    lat: 13.7563, lon: 100.5018,
  },
  mexico: {
    url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&q=80&fit=crop',
    attribution: 'Fernando Jorge',
    lat: 20.6597, lon: -103.3496,
  },
  cancun: {
    url: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=600&q=80&fit=crop',
    attribution: 'Kevin Schmid',
    lat: 21.1619, lon: -86.8515,
  },
  miami: {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80&fit=crop',
    attribution: 'Kenrick Mills',
    lat: 25.7617, lon: -80.1918,
  },
  florence: {
    url: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=600&q=80&fit=crop',
    attribution: 'Micheile',
    lat: 43.7696, lon: 11.2558,
  },
  greece: {
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&q=80&fit=crop',
    attribution: 'Nick Karvounis',
    lat: 36.3932, lon: 25.4615,
  },
  santorini: {
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1920&q=80&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&q=80&fit=crop',
    attribution: 'Nick Karvounis',
    lat: 36.3932, lon: 25.4615,
  },
}

// Default travel image when no match is found
const DEFAULT: UnsplashResult = {
  url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80&fit=crop',
  thumb: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop',
  attribution: 'Dariusz Sankowski',
}

function findCurated(destination: string): UnsplashResult | null {
  const lower = destination.toLowerCase()
  if (CURATED[lower]) return CURATED[lower]
  for (const [key, val] of Object.entries(CURATED)) {
    if (lower.includes(key) || key.includes(lower)) return val
  }
  return null
}

/**
 * Fetch a destination photo + coordinates.
 *
 * Priority chain:
 *  1. Unsplash API (if VITE_UNSPLASH_ACCESS_KEY is set) — biased toward city/landscape photos
 *  2. Curated map (hardcoded for 20+ popular destinations)
 *  3. Nominatim geocoding to get coordinates for the default image
 */
export async function fetchDestinationImage(destination: string): Promise<UnsplashResult> {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined

  if (accessKey) {
    try {
      // "cityscape" or "aerial" biases toward actual city photos vs generic travel stock
      const query = encodeURIComponent(`${destination} cityscape city`)
      const res = await fetch(
        `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${accessKey}`,
      )
      if (res.ok) {
        const data = await res.json() as {
          urls: { regular: string; thumb: string }
          user: { name: string }
          location?: { position?: { latitude?: number; longitude?: number } }
        }
        const result: UnsplashResult = {
          url: data.urls.regular + '&w=1920&q=85',
          thumb: data.urls.thumb,
          attribution: data.user.name,
          lat: data.location?.position?.latitude ?? undefined,
          lon: data.location?.position?.longitude ?? undefined,
        }
        // If Unsplash didn't supply coordinates, fall back to Nominatim
        if (!result.lat || !result.lon) {
          const geo = await geocodePlace(destination)
          if (geo) {
            result.lat = geo.lat
            result.lon = geo.lon
          }
        }
        return result
      }
    } catch {
      // Fall through to curated
    }
  }

  // Try curated map first
  const curated = findCurated(destination)
  if (curated) return curated

  // Unknown destination — use generic image but geocode for map centering
  const geo = await geocodePlace(destination)
  return {
    ...DEFAULT,
    lat: geo?.lat,
    lon: geo?.lon,
  }
}
