// Nominatim is OpenStreetMap's free geocoding API -- no API key required.
// Their usage policy requires a descriptive User-Agent header so they can
// contact abusive callers; anonymous requests may be rate-limited or blocked.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const HEADERS = { 'User-Agent': 'Roamly/1.0 (travel planning app)' }

// Nominatim's usage policy caps non-commercial clients at 1 request per second.
// Anything faster risks HTTP 429 responses or a permanent IP ban.
const MIN_REQUEST_INTERVAL_MS = 1000

export interface GeoResult {
  lat: number
  lon: number
  displayName: string
}

// Query -> result cache, including negative results (null) so a place that does not
// resolve is never asked for twice. Bounded to keep long sessions from growing without
// limit; entries are evicted oldest-first (Map preserves insertion order).
const MAX_CACHE_ENTRIES = 500
const cache = new Map<string, GeoResult | null>()

/**
 * Stores a geocoding result, evicting the oldest entry when the cache is full.
 *
 * @param key - Normalized query string
 * @param value - Result to cache, or null for "no match / failed"
 */
function cacheSet(key: string, value: GeoResult | null): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

// Serializes every outbound Nominatim call across the whole app. Components geocode
// independently (activity add, calendar import, destination lookup), so throttling
// inside a single call site is not enough -- the limiter has to be module-global.
let requestChain: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

/**
 * Queues a network task so that consecutive Nominatim requests are at least
 * MIN_REQUEST_INTERVAL_MS apart, no matter which component initiated them.
 *
 * @param task - The fetch operation to run once its slot comes up
 * @returns The task's resolved value
 */
function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = requestChain.then(async () => {
    const elapsed = Date.now() - lastRequestAt
    const wait = MIN_REQUEST_INTERVAL_MS - elapsed
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      return await task()
    } finally {
      // Timestamp on completion so slow responses don't stack up behind each other
      lastRequestAt = Date.now()
    }
  })
  // Keep the chain alive even if this task rejects, otherwise every later
  // request inherits the rejection and never runs.
  requestChain = run.catch(() => undefined)
  return run
}

/**
 * Geocodes a free-text place name using the Nominatim OpenStreetMap API.
 *
 * Nominatim is chosen over Google Maps because it is free, requires no API key,
 * and returns sufficient accuracy for travel destination pinning. The tradeoff is
 * a stricter rate limit (1 request/second) which is enforced here by a global
 * request queue, with an in-memory cache so repeated lookups cost nothing.
 *
 * @param query - Human-readable place name, e.g. "Senso-ji Temple, Tokyo"
 * @returns Coordinates and display name, or null if the query fails or returns no results
 */
export async function geocodePlace(query: string): Promise<GeoResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const key = trimmed.toLowerCase()
  // Cache hit skips both the network call and its 1s throttle slot
  if (cache.has(key)) return cache.get(key) ?? null

  return schedule(async () => {
    // Re-check: an identical query may have resolved while this one sat in the queue
    if (cache.has(key)) return cache.get(key) ?? null

    try {
      // limit=1 returns only the best match; accept-language=en ensures English display names
      const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(trimmed)}&format=json&limit=1&accept-language=en`
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) {
        // Do not cache 429/5xx -- those are transient and should be retried later
        return null
      }
      // Nominatim returns lat/lon as strings; they must be parsed before use
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (!data.length) {
        cacheSet(key, null)
        return null
      }
      const result: GeoResult = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      }
      cacheSet(key, result)
      return result
    } catch {
      // Network errors or JSON parse failures degrade gracefully to null (uncached)
      return null
    }
  })
}

/**
 * Geocodes an activity title enriched with the trip's destination city for context.
 *
 * Appending the destination improves result accuracy: "Shibuya Crossing" alone
 * could match several places, but "Shibuya Crossing, Tokyo" will resolve correctly.
 *
 * Throttling is handled inside geocodePlace, so bulk callers (calendar import) can
 * fire these off in sequence without adding their own delays.
 *
 * @param title - Activity name as entered by the user
 * @param tripDestination - The trip's destination city used to disambiguate the query
 * @returns Coordinates and display name, or null on failure
 */
export async function geocodeActivity(
  title: string,
  tripDestination: string,
): Promise<GeoResult | null> {
  // Append destination city to reduce ambiguous geocoding results
  const query = tripDestination ? `${title}, ${tripDestination}` : title
  return geocodePlace(query)
}
