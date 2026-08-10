import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNearbyPOIs, type POI } from '@/utils/overpass'

/**
 * Delay applied before a POI query actually hits Overpass.
 *
 * Focusing markers is cheap to trigger (a tap, or arrow-keying down a timeline),
 * but each fetch is a full Overpass QL query against a free, shared, rate-limit-
 * sensitive endpoint. 300 ms is long enough to swallow a burst of marker changes
 * while staying below the threshold where the panel feels unresponsive.
 */
export const POI_DEBOUNCE_MS = 300

/**
 * Public surface of the POI service hook.
 */
export interface POIService {
  /** POIs from the most recent settled query; empty while a query is pending */
  results: POI[]
  /** True from the moment a search is requested until its response settles */
  isLoading: boolean
  /** Debounced nearby-POI query around a coordinate; supersedes any pending one */
  search: (lat: number, lon: number) => void
  /** Abandon any pending/in-flight query and reset back to the empty state */
  cancel: () => void
}

/**
 * Encapsulates nearby-POI lookups: loading state, results, debouncing, and
 * cancellation of superseded requests.
 *
 * Two independent staleness problems are handled here:
 *
 *   - **Debounce** (`timerRef`): rapid `search` calls collapse into one network
 *     request, so dragging across markers does not fire a query per marker.
 *   - **Cancellation** (`requestIdRef`): a monotonic id is captured per search.
 *     Overpass responses can arrive out of order, so a resolved promise whose id
 *     no longer matches the current one is discarded rather than allowed to
 *     overwrite newer results.
 *
 * `isLoading` flips to true immediately on `search` — before the debounce
 * elapses — so the UI shows a spinner for the whole perceived wait, not just the
 * network portion.
 *
 * @param debounceMs - Override for the debounce window, mainly for tests
 */
export function usePOIService(debounceMs: number = POI_DEBOUNCE_MS): POIService {
  const [results, setResults] = useState<POI[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Monotonic id for POI fetches. Searching near B while A's fetch is still in
  // flight must not let A's late response overwrite B's results.
  const requestIdRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  /**
   * Drops the pending debounce timer and bumps the request id so any response
   * still in flight is discarded on arrival. Leaves `results`/`isLoading` alone
   * so it is safe to call during unmount cleanup.
   */
  const abandonPending = useCallback(() => {
    requestIdRef.current++
    clearPendingTimer()
  }, [clearPendingTimer])

  const cancel = useCallback(() => {
    abandonPending()
    setResults([])
    setIsLoading(false)
  }, [abandonPending])

  const search = useCallback(
    (lat: number, lon: number) => {
      // Claim a new id up front so a request that is about to be debounced away
      // is also invalidated as a response
      const requestId = ++requestIdRef.current
      clearPendingTimer()
      setIsLoading(true)
      setResults([])

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        fetchNearbyPOIs(lat, lon).then((pois) => {
          if (requestIdRef.current !== requestId) return
          setResults(pois)
          setIsLoading(false)
        })
      }, debounceMs)
    },
    [clearPendingTimer, debounceMs],
  )

  // On unmount, drop the pending timer and invalidate in-flight responses so no
  // state update lands on an unmounted provider. abandonPending is stable, so
  // this only ever runs at unmount.
  useEffect(() => abandonPending, [abandonPending])

  return { results, isLoading, search, cancel }
}
