import { createContext, useContext } from 'react'
import type { MapStateValue, MapDispatchValue, MapPOIValue } from '@/context/MapContext'

/**
 * MapContext is split into three orthogonal contexts so a component subscribes
 * only to the slice it reads and is not re-rendered by unrelated changes:
 *
 *   - MapStateContext    -- frequently-changing state (markers, focus, flyTo, expanded)
 *   - MapDispatchContext -- stable action callbacks (never change identity)
 *   - MapPOIContext      -- Overpass results, which change independently of map state
 *
 * A dispatch-only consumer (e.g. ActivityTimeline) therefore never re-renders when
 * markers or POIs change, and a state-only consumer (e.g. Dashboard) never re-renders
 * when the POI list arrives. They live here rather than next to MapProvider so that
 * `MapContext.tsx` only exports React components -- keeping Vite's Fast Refresh working.
 * The type imports above are erased at build time, so there is no runtime import cycle.
 */
export const MapStateContext = createContext<MapStateValue | null>(null)
export const MapDispatchContext = createContext<MapDispatchValue | null>(null)
export const MapPOIContext = createContext<MapPOIValue | null>(null)

/**
 * Consumes the map state slice (markers, focusedMarkerId, flyToTarget, mapExpanded).
 *
 * @throws If called outside of a MapProvider component tree
 */
export function useMapState(): MapStateValue {
  const ctx = useContext(MapStateContext)
  if (!ctx) throw new Error('useMapState must be used inside MapProvider')
  return ctx
}

/**
 * Consumes the map action callbacks (setMapExpanded, setMarkers, focusMarker,
 * clearFocus, flyTo). These are reference-stable, so depending on them never
 * triggers a re-render.
 *
 * @throws If called outside of a MapProvider component tree
 */
export function useMapDispatch(): MapDispatchValue {
  const ctx = useContext(MapDispatchContext)
  if (!ctx) throw new Error('useMapDispatch must be used inside MapProvider')
  return ctx
}

/**
 * Consumes the nearby-POI slice (recommendations, isLoadingRecs).
 *
 * @throws If called outside of a MapProvider component tree
 */
export function useMapPOI(): MapPOIValue {
  const ctx = useContext(MapPOIContext)
  if (!ctx) throw new Error('useMapPOI must be used inside MapProvider')
  return ctx
}
