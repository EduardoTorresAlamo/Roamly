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
 * Builds a JSON Response with caching headers appropriate for image metadata.
 *
 * @param body - Payload to serialize
 * @param status - HTTP status code
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Let the CDN absorb repeat lookups for the same destination
      'cache-control': status === 200 ? 'public, max-age=3600, s-maxage=86400' : 'no-store',
    },
  })
}

/**
 * Handles GET /api/unsplash?destination=<name>.
 *
 * @param request - Incoming request; `destination` is read from the query string
 * @returns A normalized DestinationImage as JSON, or an error status
 */
export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const destination = (url.searchParams.get('destination') ?? '').trim()

  if (!destination) {
    return json({ error: 'Missing "destination" query parameter' }, 400)
  }
  // Cap the length so the upstream query cannot be used to smuggle a large payload
  if (destination.length > 120) {
    return json({ error: 'Destination is too long' }, 400)
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    // Not configured — tell the client so it falls back to its curated image set
    return json({ error: 'Unsplash is not configured' }, 503)
  }

  const cacheKey = destination.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.value)
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
      return json({ error: 'Upstream request failed' }, 502)
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
    return json(result)
  } catch {
    // Never surface upstream error details to the client
    return json({ error: 'Unsplash lookup failed' }, 502)
  }
}
