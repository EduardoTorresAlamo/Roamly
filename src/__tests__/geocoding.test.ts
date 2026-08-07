import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// The geocoding module keeps process-global state (an in-memory cache plus the
// request-serialization chain and timestamp). Each test re-imports it fresh via
// vi.resetModules() so cache entries and throttle timing never leak between tests.
async function loadModule() {
  vi.resetModules()
  return import('@/utils/geocoding')
}

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response)
}

const SAMPLE = [{ lat: '35.7148', lon: '139.7967', display_name: 'Senso-ji Temple, Tokyo' }]

describe('geocodePlace', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for an empty/whitespace query without hitting the network', async () => {
    const fetchSpy = mockFetchOnce(SAMPLE)
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodePlace } = await loadModule()

    expect(await geocodePlace('   ')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('parses the first Nominatim result into a GeoResult', async () => {
    const fetchSpy = mockFetchOnce(SAMPLE)
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodePlace } = await loadModule()

    const result = await geocodePlace('Senso-ji Temple, Tokyo')
    expect(result).toEqual({
      lat: 35.7148,
      lon: 139.7967,
      displayName: 'Senso-ji Temple, Tokyo',
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('caches a successful result so an identical query skips the network', async () => {
    const fetchSpy = mockFetchOnce(SAMPLE)
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodePlace } = await loadModule()

    const first = await geocodePlace('Tokyo')
    const second = await geocodePlace('tokyo') // case-insensitive cache key
    expect(second).toEqual(first)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('caches a negative (no-match) result so it is not re-requested', async () => {
    const fetchSpy = mockFetchOnce([])
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodePlace } = await loadModule()

    expect(await geocodePlace('Nowheresville')).toBeNull()
    expect(await geocodePlace('Nowheresville')).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('does NOT cache a transient HTTP failure (429/5xx) and retries next time', async () => {
    const fetchSpy = mockFetchOnce([], false) // ok: false
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodePlace } = await loadModule()

    expect(await geocodePlace('Kyoto')).toBeNull()
    expect(await geocodePlace('Kyoto')).toBeNull()
    // Not cached, so the second call goes back out to the network.
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('degrades to null (uncached) when fetch throws', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodePlace } = await loadModule()

    expect(await geocodePlace('Osaka')).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('geocodeActivity', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('appends the destination to disambiguate the query', async () => {
    const fetchSpy = mockFetchOnce(SAMPLE)
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodeActivity } = await loadModule()

    await geocodeActivity('Shibuya Crossing', 'Tokyo')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain(encodeURIComponent('Shibuya Crossing, Tokyo'))
  })

  it('uses the bare title when no destination is provided', async () => {
    const fetchSpy = mockFetchOnce(SAMPLE)
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodeActivity } = await loadModule()

    await geocodeActivity('Eiffel Tower', '')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain(encodeURIComponent('Eiffel Tower'))
    expect(url).not.toContain(encodeURIComponent('Eiffel Tower, '))
  })
})

describe('request scheduling (throttle)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('serializes distinct queries and spaces them by the min interval', async () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const fetchSpy = mockFetchOnce(SAMPLE)
    vi.stubGlobal('fetch', fetchSpy)
    const { geocodePlace } = await loadModule()

    // Two different queries fired back-to-back: the first runs immediately, the
    // second must wait behind the 1s throttle before its fetch fires.
    const p1 = geocodePlace('Query A')
    const p2 = geocodePlace('Query B')

    // Drain microtasks + any scheduled timers so both queued tasks complete.
    await vi.runAllTimersAsync()
    await Promise.all([p1, p2])

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // The second, queued request scheduled a throttle delay of up to 1000ms.
    const delays = setTimeoutSpy.mock.calls.map((c) => c[1])
    expect(delays.some((d) => typeof d === 'number' && d > 0 && d <= 1000)).toBe(true)
  })
})
