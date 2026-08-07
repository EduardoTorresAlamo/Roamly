import { createContext, useContext } from 'react'
import type { Trip } from '@/types'

/**
 * Storage-agnostic persistence boundary for trips.
 *
 * Everything above this interface (TripProvider, the pages, the map) deals only
 * in `Trip` objects and never touches `localStorage`, `fetch`, or a database
 * directly. Swapping persistence (e.g. to a Supabase-backed repo) then means
 * writing one new implementation of this interface and passing it to
 * `TripRepositoryProvider` — no changes to the context or components.
 */
export interface TripRepository {
  /** All persisted trips in insertion order. */
  getAll(): Trip[]
  /** The trip with the given id, or undefined if none exists. */
  getById(id: string): Trip | undefined
  /** Insert a new trip or replace an existing one with the same id (upsert). */
  save(trip: Trip): void
  /** Remove the trip with the given id; a no-op if it does not exist. */
  delete(id: string): void
}

/** localStorage key holding the entire trip dataset (unchanged for back-compat). */
export const TRIPS_STORAGE_KEY = 'wanderplan-trips'

/**
 * `TripRepository` backed by the browser's `localStorage`.
 *
 * The whole dataset lives under a single key as a JSON array — the exact format
 * the app used before this abstraction existed, so pre-existing user data loads
 * without migration. Reads and writes go through `read`/`write`, which fail soft
 * (log + fall back) rather than throwing, matching the previous `useLocalStorage`
 * behavior in private-browsing / quota-exceeded situations.
 */
export class LocalStorageTripRepository implements TripRepository {
  // Explicit fields rather than TS parameter properties, which `erasableSyntaxOnly`
  // (see tsconfig) disallows.
  private readonly key: string
  private readonly storage: Storage

  constructor(key: string = TRIPS_STORAGE_KEY, storage: Storage = window.localStorage) {
    this.key = key
    this.storage = storage
  }

  private read(): Trip[] {
    try {
      const raw = this.storage.getItem(this.key)
      return raw ? (JSON.parse(raw) as Trip[]) : []
    } catch (err) {
      // Corrupted JSON or an unavailable store degrades to "no trips" rather than
      // crashing the app on load.
      console.error(`LocalStorageTripRepository: failed to read "${this.key}"`, err)
      return []
    }
  }

  private write(trips: Trip[]): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(trips))
    } catch (err) {
      console.error(`LocalStorageTripRepository: failed to persist "${this.key}"`, err)
    }
  }

  getAll(): Trip[] {
    return this.read()
  }

  getById(id: string): Trip | undefined {
    return this.read().find((t) => t.id === id)
  }

  save(trip: Trip): void {
    const trips = this.read()
    const idx = trips.findIndex((t) => t.id === trip.id)
    if (idx === -1) {
      trips.push(trip)
    } else {
      // Replace in place so insertion order is preserved on update.
      trips[idx] = trip
    }
    this.write(trips)
  }

  delete(id: string): void {
    this.write(this.read().filter((t) => t.id !== id))
  }
}

// Lazily-created process-wide default so consumers work even without an explicit
// provider (and so tests can run against real localStorage without wiring one up).
// Created lazily because `new LocalStorageTripRepository()` reads `window`, which
// must exist by the time it is first used.
let defaultRepository: TripRepository | null = null
export function getDefaultTripRepository(): TripRepository {
  if (!defaultRepository) defaultRepository = new LocalStorageTripRepository()
  return defaultRepository
}

/**
 * Context carrying the active `TripRepository`. `null` default means "no provider
 * mounted", in which case `useTripRepository` falls back to the shared default.
 */
export const TripRepositoryContext = createContext<TripRepository | null>(null)

/**
 * Returns the `TripRepository` provided by the nearest `TripRepositoryProvider`,
 * or the shared localStorage-backed default when no provider is present.
 */
export function useTripRepository(): TripRepository {
  return useContext(TripRepositoryContext) ?? getDefaultTripRepository()
}
