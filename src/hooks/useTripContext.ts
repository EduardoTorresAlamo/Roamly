import { createContext, useContext } from 'react'
import type { TripContextValue } from '@/context/TripContext'

/**
 * The trip context object itself.
 *
 * It lives here rather than next to TripProvider so that `TripContext.tsx` only
 * exports React components — keeping Vite's Fast Refresh working for the
 * provider file. The `TripContextValue` import above is type-only and therefore
 * erased at build time, so there is no runtime import cycle between the two files.
 */
export const TripContext = createContext<TripContextValue | null>(null)

/**
 * Consumes TripContext and returns all trip operations.
 *
 * @throws If called outside of a TripProvider component tree
 */
export function useTripContext(): TripContextValue {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used within TripProvider')
  return ctx
}
