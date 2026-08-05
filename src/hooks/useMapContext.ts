import { createContext, useContext } from 'react'
import type { MapContextValue } from '@/context/MapContext'

/**
 * The map context object itself.
 *
 * It lives here rather than next to MapProvider so that `MapContext.tsx` only
 * exports React components — keeping Vite's Fast Refresh working for the
 * provider file. The `MapContextValue` import above is type-only and therefore
 * erased at build time, so there is no runtime import cycle between the two files.
 */
export const MapContext = createContext<MapContextValue | null>(null)

/**
 * Consumes MapContext and returns map state and actions.
 *
 * @throws If called outside of a MapProvider component tree
 */
export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error('useMapContext must be used inside MapProvider')
  return ctx
}
