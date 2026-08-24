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
 *
 * Note: the localStorage-backed implementation stores trips as plaintext JSON.
 * Anything with access to the browser profile (shared machine, malicious
 * extension, XSS) can read it. Trip itineraries are low-sensitivity, so this is
 * an accepted trade-off; a future encrypted implementation (Web Crypto + a
 * user-derived key) could satisfy this same interface without touching consumers.
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
 * Structural runtime guard for a single persisted `Trip`.
 *
 * `JSON.parse` is typed `any`, so a `as Trip[]` cast is a lie the compiler can't
 * check: hand-edited, truncated, or version-skewed localStorage would flow through
 * as a `Trip` and blow up deep in a component. This validates the fields the app
 * actually dereferences, so corruption is caught at the storage boundary and the
 * read paths can degrade to an empty view (see `read()`).
 */
function isTrip(value: unknown): value is Trip {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.destination === 'string' &&
    typeof t.startDate === 'string' &&
    typeof t.endDate === 'string' &&
    Array.isArray(t.days)
  )
}

/** Runtime guard: the parsed value is an array of structurally-valid trips. */
function isTripArray(value: unknown): value is Trip[] {
  return Array.isArray(value) && value.every(isTrip)
}

/**
 * Thrown by the private `read()` when stored data exists but cannot be parsed.
 *
 * Distinguishes a genuinely empty store (missing key → `[]`) from corrupted
 * data. Mutations (`save`/`delete`) let this propagate so they refuse to write,
 * which prevents a read-modify-write from silently overwriting — and destroying
 * — recoverable data. Read-only accessors (`getAll`/`getById`) catch it and
 * degrade to an empty view.
 */
export class TripRepositoryReadError extends Error {
  constructor(key: string, cause: unknown) {
    super(`LocalStorageTripRepository: failed to parse "${key}"`)
    this.name = 'TripRepositoryReadError'
    this.cause = cause
  }
}

/**
 * `TripRepository` backed by the browser's `localStorage`.
 *
 * The whole dataset lives under a single key as a JSON array — the exact format
 * the app used before this abstraction existed, so pre-existing user data loads
 * without migration. Writes fail soft (log + fall back) in private-browsing /
 * quota-exceeded situations. Read-only accessors (`getAll`/`getById`) also
 * degrade to an empty view on corruption, but the mutating `save`/`delete` let
 * a parse error propagate so a read-modify-write can't overwrite data it failed
 * to read (see `TripRepositoryReadError`).
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
    let raw: string | null
    try {
      raw = this.storage.getItem(this.key)
    } catch (err) {
      // Store unavailable (e.g. private browsing): behave as empty, matching
      // write()'s soft-fail. Not a parse error — no data is at risk here.
      console.error(`LocalStorageTripRepository: failed to access "${this.key}"`, err)
      return []
    }
    // Missing key is a legitimately empty store, not corruption.
    if (raw === null) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      // Data is present but unparseable. Throw instead of returning [] so a
      // subsequent save()/delete() does not overwrite (and destroy) it.
      throw new TripRepositoryReadError(this.key, err)
    }
    // Syntactically valid JSON can still be the wrong shape (hand-edited, or from
    // an incompatible app version). Validate before trusting the `Trip[]` type so
    // corruption is caught here rather than surfacing as a crash in a component.
    if (!isTripArray(parsed)) {
      throw new TripRepositoryReadError(this.key, new Error('stored value is not a Trip[]'))
    }
    return parsed
  }

  private write(trips: Trip[]): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(trips))
    } catch (err) {
      console.error(`LocalStorageTripRepository: failed to persist "${this.key}"`, err)
    }
  }

  getAll(): Trip[] {
    // Read-only path: degrade a corrupted store to an empty view rather than
    // crashing on load. The underlying data is left untouched (see read()).
    try {
      return this.read()
    } catch (err) {
      console.error(err)
      return []
    }
  }

  getById(id: string): Trip | undefined {
    // Reuse getAll()'s corruption-tolerant read.
    return this.getAll().find((t) => t.id === id)
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
