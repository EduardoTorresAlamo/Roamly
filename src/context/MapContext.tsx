import { useState, useCallback, useRef, type ReactNode } from 'react'
import type { ActivityType } from '@/types'
import { fetchNearbyPOIs, type POI } from '@/utils/overpass'
import { MapContext } from '@/hooks/useMapContext'

/**
 * A single activity pin to display on the Leaflet map.
 * Mirrors the subset of Activity fields needed by the map layer.
 */
export interface MapMarker {
  /** Matches the Activity id so the map can notify the context which activity is focused */
  id: string
  lat: number
  lon: number
  type: ActivityType
  title: string
}

/**
 * Coordinates and zoom level passed to Leaflet's flyTo animation.
 *
 * Stored in context so the ActivityMarkers component (which lives inside
 * MapContainer and has access to the Leaflet map instance) can consume it
 * via a useEffect rather than requiring the map instance to bubble out of Leaflet.
 */
export interface FlyToTarget {
  lat: number
  lon: number
  zoom: number
}

/**
 * Public API surface of MapContext.
 *
 * MapContext bridges the Leaflet map layer and the React UI: it holds marker
 * positions derived from trip data and orchestrates flyTo animations and
 * Overpass POI fetching when a marker is focused.
 */
export interface MapContextValue {
  /** Current set of activity pins derived from the selected day's activities */
  markers: MapMarker[]
  /** Id of the marker that is currently highlighted, or null */
  focusedMarkerId: string | null
  /** Nearby POIs fetched from Overpass when a marker is focused */
  recommendations: POI[]
  /** True while the Overpass fetch is in flight */
  isLoadingRecs: boolean
  /** Target for the next Leaflet flyTo animation; consumed by ActivityMarkers */
  flyToTarget: FlyToTarget | null
  /** Whether the map is in full-view mode (content panel collapsed to bottom sheet) */
  mapExpanded: boolean
  setMapExpanded: (v: boolean) => void
  /** Replace all markers; called when the selected day tab changes */
  setMarkers: (markers: MapMarker[]) => void
  /** Focus a marker, animate the map to it, and trigger a nearby POI fetch */
  focusMarker: (id: string, lat: number, lon: number) => void
  /** Clear focused marker state and dismiss the NearbyPanel */
  clearFocus: () => void
  /** Animate the map to arbitrary coordinates, e.g. the trip destination on page load */
  flyTo: (lat: number, lon: number, zoom?: number) => void
}

/**
 * Provides map state and actions to the component tree.
 *
 * Separating map state from trip state means the Leaflet layer and the content
 * panels can both read/write map state without creating a circular dependency.
 *
 * @param children - React subtree that will have access to map state
 */
export function MapProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkersState] = useState<MapMarker[]>([])
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<POI[]>([])
  const [isLoadingRecs, setIsLoadingRecs] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null)
  const [mapExpanded, setMapExpanded] = useState(false)

  // Monotonic id for POI fetches. Focusing marker B while marker A's fetch is
  // still in flight must not let A's late response overwrite B's results.
  const poiRequestIdRef = useRef(0)

  // Wrapped in useCallback to keep the reference stable and avoid re-rendering
  // ActivityMarkers every time unrelated context state changes
  const setMarkers = useCallback((m: MapMarker[]) => {
    setMarkersState(m)
  }, [])

  const focusMarker = useCallback((id: string, lat: number, lon: number) => {
    setFocusedMarkerId(id)
    // Zoom in to street level (16) so nearby POIs are visible on the tile layer
    setFlyToTarget({ lat, lon, zoom: 16 })
    // Always reveal the full map when focusing a place so the user can see context
    setMapExpanded(true)
    setIsLoadingRecs(true)
    setRecommendations([])
    // Fetch POIs from Overpass API; update state when the promise resolves.
    // Ignore the response if another focus/clear happened in the meantime.
    const requestId = ++poiRequestIdRef.current
    fetchNearbyPOIs(lat, lon).then((pois) => {
      if (poiRequestIdRef.current !== requestId) return
      setRecommendations(pois)
      setIsLoadingRecs(false)
    })
  }, [])

  const clearFocus = useCallback(() => {
    // Invalidate any in-flight POI fetch so it cannot repopulate the panel
    poiRequestIdRef.current++
    setFocusedMarkerId(null)
    setRecommendations([])
    setIsLoadingRecs(false)
  }, [])

  const flyTo = useCallback((lat: number, lon: number, zoom = 12) => {
    setFlyToTarget({ lat, lon, zoom })
  }, [])

  return (
    <MapContext.Provider
      value={{
        markers,
        focusedMarkerId,
        recommendations,
        isLoadingRecs,
        flyToTarget,
        mapExpanded,
        setMapExpanded,
        setMarkers,
        focusMarker,
        clearFocus,
        flyTo,
      }}
    >
      {children}
    </MapContext.Provider>
  )
}
