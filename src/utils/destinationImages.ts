/**
 * Destination image fetching via a server-side Unsplash proxy.
 *
 * The Unsplash access key must never reach the browser: anything read from
 * `import.meta.env.VITE_*` is inlined verbatim into the minified bundle and is
 * trivially extractable from `dist/assets/*.js`. Instead the key lives only in the
 * server environment (`UNSPLASH_ACCESS_KEY`), and the client calls the proxy
 * endpoint shipped in `api/unsplash.ts`.
 *
 * Set `VITE_UNSPLASH_PROXY_URL` to enable live search (defaults to disabled so a
 * purely static deployment makes no doomed requests). See `.env.example`.
 *
 * Coordinates are sourced from:
 *  1. Unsplash photo metadata returned by the proxy (when available)
 *  2. Curated map (hardcoded for 20+ popular destinations)
 *  3. Nominatim geocoding (free, no API key) — runs as fallback for unknown destinations
 */

import { geocodePlace } from './geocoding'
import curatedDestinations from '@/data/curatedDestinations.json'

// Path/URL of the server-side proxy, e.g. "/api/unsplash". Empty means "no proxy
// configured" -- the app then serves curated images only, with no network call.
const PROXY_URL = (import.meta.env.VITE_UNSPLASH_PROXY_URL as string | undefined)?.trim() ?? ''

/**
 * A resolved destination image with optional coordinates.
 *
 * Coordinates are sourced from Unsplash photo location metadata when available,
 * falling back to Nominatim geocoding. They are used to center the map on the
 * destination when the trip is opened.
 */
interface UnsplashResult {
  /** Full-resolution image URL (1920px wide) for the trip hero */
  url: string
  /** Thumbnail URL (600px wide) for use in TripCard to reduce bandwidth */
  thumb: string
  /** Photographer name for the Unsplash attribution requirement */
  attribution: string
  lat?: number
  lon?: number
}

// Curated fallback images for popular destinations (no API key needed).
// The data lives in src/data/curatedDestinations.json so the entries can be edited
// without touching the fetch logic; the cast supplies the type the JSON can't carry.
const CURATED = curatedDestinations as Record<string, UnsplashResult>

// Default travel image when no match is found
const DEFAULT: UnsplashResult = {
  url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80&fit=crop',
  thumb: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop',
  attribution: 'Dariusz Sankowski',
}

/**
 * Looks up a destination in the curated image map using case-insensitive matching.
 *
 * Exact match is tried first; then substring matching handles inputs like
 * "Walt Disney World" matching the "disney" and "walt disney" keys.
 *
 * @param destination - User-supplied destination string
 * @returns A curated UnsplashResult if a match is found, otherwise null
 */
function findCurated(destination: string): UnsplashResult | null {
  const lower = destination.toLowerCase()
  // Fast path: exact lowercase match
  if (CURATED[lower]) return CURATED[lower]
  // Slow path: partial substring match to handle aliases like "Walt Disney World"
  for (const [key, val] of Object.entries(CURATED)) {
    if (lower.includes(key) || key.includes(lower)) return val
  }
  return null
}

/**
 * Fetch a destination photo + coordinates.
 *
 * Priority chain:
 *  1. Unsplash via the server-side proxy (if VITE_UNSPLASH_PROXY_URL is set)
 *  2. Curated map (hardcoded for 20+ popular destinations)
 *  3. Nominatim geocoding to get coordinates for the default image
 */
export async function fetchDestinationImage(destination: string): Promise<UnsplashResult> {
  if (PROXY_URL) {
    try {
      const res = await fetch(`${PROXY_URL}?destination=${encodeURIComponent(destination)}`)
      if (res.ok) {
        // The proxy returns an already-normalized UnsplashResult so the client never
        // has to know Unsplash's response shape (or hold its credentials).
        const result = await res.json() as UnsplashResult
        if (result?.url && result?.thumb) {
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
      }
    } catch {
      // Proxy unreachable or returned non-JSON — fall through to curated
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
