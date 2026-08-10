import { createContext, useContext } from 'react'
import type { Trip } from '@/types'
import type { TripDispatchValue } from '@/context/TripContext'

/**
 * Trip state (the trips array) and trip actions live in two separate contexts.
 *
 * A single combined context forces every consumer to re-render whenever *any*
 * trip changes, even components that only ever call a mutation. Splitting them
 * means the dispatch value is memoized once and never changes identity, so
 * action-only consumers (AddTripModal, CalendarImportModal) subscribe to a
 * context that never updates and drop out of the re-render path entirely.
 *
 * Both contexts live here rather than next to TripProvider so that
 * `TripContext.tsx` only exports React components — keeping Vite's Fast Refresh
 * working for the provider file. The `TripDispatchValue` import above is
 * type-only and therefore erased at build time, so there is no runtime import
 * cycle between the two files.
 */
export const TripStateContext = createContext<Trip[] | null>(null)

/** Companion to {@link TripStateContext}; holds only the mutation functions. */
export const TripDispatchContext = createContext<TripDispatchValue | null>(null)

/**
 * Subscribes to the trip list. Re-renders on every trip mutation.
 *
 * @throws If called outside of a TripProvider component tree
 */
export function useTripState(): Trip[] {
  const ctx = useContext(TripStateContext)
  if (!ctx) throw new Error('useTripState must be used within TripProvider')
  return ctx
}

/**
 * Returns the trip mutation functions without subscribing to trip state.
 *
 * The returned object is referentially stable for the lifetime of the provider,
 * so components using only this hook never re-render due to trip changes.
 *
 * @throws If called outside of a TripProvider component tree
 */
export function useTripDispatch(): TripDispatchValue {
  const ctx = useContext(TripDispatchContext)
  if (!ctx) throw new Error('useTripDispatch must be used within TripProvider')
  return ctx
}

/**
 * Looks up a single trip by id.
 *
 * Replaces the old `getTripById` context method: a lookup function closed over
 * `trips` had to be recreated on every mutation, which defeated the point of
 * splitting state from dispatch.
 *
 * @param tripId - Id of the trip to find
 * @returns The matching Trip, or undefined if no trip has that id
 */
export function useTripById(tripId: string): Trip | undefined {
  return useTripState().find((t) => t.id === tripId)
}
