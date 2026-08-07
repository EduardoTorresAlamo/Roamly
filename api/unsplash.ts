/**
 * Server-side Unsplash proxy.
 *
 * Keeps the Unsplash access key out of the client bundle: the browser calls this
 * endpoint, and only this code — running on the server — ever sees the credential.
 * Set `UNSPLASH_ACCESS_KEY` (note: NO `VITE_` prefix, or Vite would inline it into
 * the client bundle) in the hosting provider's environment, and point the frontend
 * at this route with `VITE_UNSPLASH_PROXY_URL=/api/unsplash`.
 *
 * Written against the Web Fetch API so it runs unmodified on Vercel Edge Functions,
 * Netlify Edge Functions, and Cloudflare Workers.
 */

// Vercel: run on the edge runtime rather than as a Node serverless function
export const config = { runtime: 'edge' }

/** Normalized response shape consumed by src/utils/destinationImages.ts */
interface DestinationImage {
  url: string
  thumb: string
  attribution: string
  lat?: number
  lon?: number
}

// Simple in-memory result cache. Edge instances are short-lived and not shared, so
// this is a best-effort optimization, not a guarantee — it mainly absorbs bursts
// from a user creating several trips in a row.
const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { at: number; value: DestinationImage }>()

/**
 * Extra origins allowed to call this proxy, as a comma-separated list of absolute
 * URLs (e.g. `https://roamly.app,https://staging.roamly.app`). The deployment's own
 * origin is always allowed, so this is only needed for custom domains or a separate
 * frontend host. Optional — leave unset for a single-domain deployment.
 */
const ALLOWED_ORIGINS_ENV = 'ALLOWED_ORIGINS'

/**
 * Reduces a URL or origin string to a normalized origin (`scheme://host[:port]`).
 *
 * @param value - Absolute URL or origin; anything unparseable yields null
 * @returns Lowercased origin, or null when the input is not a valid absolute URL
 */
function toOrigin(value: string): string | null {
  try {
    return new URL(value.trim()).origin.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Builds the set of origins permitted to use the proxy.
 *
 * Always contains the origin this request was served on — the proxy is deployed
 * alongside the app it serves — plus anything listed in `ALLOWED_ORIGINS`.
 *
 * @param request - Incoming request, used to derive the deployment's own origin
 */
function allowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>()

  const self = toOrigin(request.url)
  if (self) origins.add(self)

  for (const entry of (process.env[ALLOWED_ORIGINS_ENV] ?? '').split(',')) {
    if (!entry.trim()) continue
    const origin = toOrigin(entry)
    if (origin) origins.add(origin)
  }

  return origins
}

/**
 * Determines which site a request was issued from.
 *
 * Browsers omit `Origin` on same-origin GETs, so `Referer` is the fallback: with the
 * default `strict-origin-when-cross-origin` referrer policy it is present on both
 * same-origin and cross-origin fetches.
 *
 * @param request - Incoming request
 * @returns The calling origin, or null when neither header is usable
 */
function callerOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  // "null" is what an opaque origin (sandboxed iframe, file://) sends
  if (origin && origin !== 'null') return toOrigin(origin)

  const referer = request.headers.get('referer')
  if (referer) return toOrigin(referer)

  return null
}

/**
 * Builds a JSON Response with caching headers appropriate for image metadata.
 *
 * @param body - Payload to serialize
 * @param status - HTTP status code
 * @param origin - Caller origin to echo back in CORS headers, when it is allowed
 */
function json(body: unknown, status = 200, origin?: string): Response {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    // Let the CDN absorb repeat lookups for the same destination
    'cache-control': status === 200 ? 'public, max-age=3600, s-maxage=86400' : 'no-store',
    // Responses differ by caller origin, so shared caches must key on it
    vary: 'Origin',
  }
  if (origin) {
    headers['access-control-allow-origin'] = origin
  }
  return new Response(JSON.stringify(body), { status, headers })
}

/**
 * Handles GET /api/unsplash?destination=<name>.
 *
 * Requests are gated on the calling origin so the proxy — and with it the Unsplash
 * rate limit tied to our access key — cannot be embedded by an unrelated site. This
 * stops browser-based abuse, which is the realistic threat: `Origin`/`Referer` are
 * set by the browser and cannot be forged by page JavaScript. A direct server-side
 * caller can still spoof either header, so treat this as abuse control, not authn.
 *
 * @param request - Incoming request; `destination` is read from the query string
 * @returns A normalized DestinationImage as JSON, or an error status
 */
export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const allowed = allowedOrigins(request)
  const caller = callerOrigin(request)
  // A request with no Origin and no Referer did not come from a page on our site
  const isAllowed = caller !== null && allowed.has(caller)
  // Only echo CORS headers for a genuinely cross-origin allowed caller
  const corsOrigin = isAllowed && request.headers.get('origin') ? caller : undefined

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: isAllowed ? 204 : 403,
      headers: {
        vary: 'Origin',
        ...(corsOrigin
          ? {
              'access-control-allow-origin': corsOrigin,
              'access-control-allow-methods': 'GET, OPTIONS',
              'access-control-max-age': '86400',
            }
          : {}),
      },
    })
  }

  if (!isAllowed) {
    // Deliberately vague: do not confirm which origins are configured
    return json({ error: 'Forbidden' }, 403)
  }

  const destination = (url.searchParams.get('destination') ?? '').trim()

  if (!destination) {
    return json({ error: 'Missing "destination" query parameter' }, 400, corsOrigin)
  }
  // Cap the length so the upstream query cannot be used to smuggle a large payload
  if (destination.length > 120) {
    return json({ error: 'Destination is too long' }, 400, corsOrigin)
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    // Not configured — tell the client so it falls back to its curated image set
    return json({ error: 'Unsplash is not configured' }, 503, corsOrigin)
  }

  const cacheKey = destination.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.value, 200, corsOrigin)
  }

  try {
    // "cityscape city" biases toward actual city photos vs generic travel stock
    const query = encodeURIComponent(`${destination} cityscape city`)
    const upstream = await fetch(
      `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape`,
      {
        headers: {
          // Header auth keeps the key out of the URL (and out of upstream access logs)
          Authorization: `Client-ID ${accessKey}`,
          'Accept-Version': 'v1',
        },
      },
    )

    if (!upstream.ok) {
      return json({ error: 'Upstream request failed' }, 502, corsOrigin)
    }

    const data = await upstream.json() as {
      urls: { regular: string; thumb: string }
      user: { name: string }
      location?: { position?: { latitude?: number; longitude?: number } }
    }

    const result: DestinationImage = {
      url: data.urls.regular + '&w=1920&q=85',
      thumb: data.urls.thumb,
      attribution: data.user.name,
      lat: data.location?.position?.latitude ?? undefined,
      lon: data.location?.position?.longitude ?? undefined,
    }

    cache.set(cacheKey, { at: Date.now(), value: result })
    return json(result, 200, corsOrigin)
  } catch {
    // Never surface upstream error details to the client
    return json({ error: 'Unsplash lookup failed' }, 502, corsOrigin)
  }
}
