import { createContext, useContext } from 'react'
import type { Trip } from '@/types'
import type { TripDispatchValue } from '@/context/TripContext'

// State and dispatch are split into two contexts so action-only consumers
// (AddTripModal, CalendarImportModal) don't re-render when trips change.
// Both live here rather than in TripContext.tsx so that file exports only
// components (keeps Vite Fast Refresh working); the TripDispatchValue import
// is type-only and erased at build time, so there's no runtime cycle.

export const TripStateContext = createContext<Trip[] | null>(null)
export const TripDispatchContext = createContext<TripDispatchValue | null>(null)

/** The full trip list. Re-renders on any trip mutation. */
export function useTrips(): Trip[] {
  const ctx = useContext(TripStateContext)
  if (!ctx) throw new Error('useTrips must be used within TripProvider')
  return ctx
}

/** Mutation functions only; referentially stable, never re-renders on trip changes. */
export function useTripActions(): TripDispatchValue {
  const ctx = useContext(TripDispatchContext)
  if (!ctx) throw new Error('useTripActions must be used within TripProvider')
  return ctx
}

/** One trip by id, or undefined. Re-renders on any trip mutation. */
export function useTripById(tripId: string): Trip | undefined {
  return useTrips().find((t) => t.id === tripId)
}
