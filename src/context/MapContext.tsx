import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ActivityType } from '@/types'
import { fetchNearbyPOIs, type POI } from '@/utils/overpass'

export interface MapMarker {
  id: string          // activity id
  lat: number
  lon: number
  type: ActivityType
  title: string
}

export interface FlyToTarget {
  lat: number
  lon: number
  zoom: number
}

interface MapContextValue {
  markers: MapMarker[]
  focusedMarkerId: string | null
  recommendations: POI[]
  isLoadingRecs: boolean
  flyToTarget: FlyToTarget | null
  /** Whether the map is in full-view mode (content panel collapsed to bottom sheet) */
  mapExpanded: boolean
  setMapExpanded: (v: boolean) => void
  /** Replace all markers (call when selected day changes) */
  setMarkers: (markers: MapMarker[]) => void
  /** Fly to a marker and load nearby POIs — also expands the map */
  focusMarker: (id: string, lat: number, lon: number) => void
  /** Clear focused state and recommendations */
  clearFocus: () => void
  /** Fly map to arbitrary coordinates (e.g. trip destination) */
  flyTo: (lat: number, lon: number, zoom?: number) => void
}

const MapContext = createContext<MapContextValue | null>(null)

export function MapProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkersState] = useState<MapMarker[]>([])
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<POI[]>([])
  const [isLoadingRecs, setIsLoadingRecs] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null)
  const [mapExpanded, setMapExpanded] = useState(false)

  const setMarkers = useCallback((m: MapMarker[]) => {
    setMarkersState(m)
  }, [])

  const focusMarker = useCallback((id: string, lat: number, lon: number) => {
    setFocusedMarkerId(id)
    setFlyToTarget({ lat, lon, zoom: 16 })
    setMapExpanded(true)   // always reveal map when focusing a place
    setIsLoadingRecs(true)
    setRecommendations([])
    fetchNearbyPOIs(lat, lon).then((pois) => {
      setRecommendations(pois)
      setIsLoadingRecs(false)
    })
  }, [])

  const clearFocus = useCallback(() => {
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

export function useMapContext() {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error('useMapContext must be used inside MapProvider')
  return ctx
}
