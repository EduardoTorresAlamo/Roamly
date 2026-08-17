import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Trip, Activity } from '@/types'
import { TripDispatchContext, TripStateContext } from '@/hooks/useTrips'
import { useTripRepository, TRIPS_STORAGE_KEY } from '@/repository/TripRepository'
import type { TripRepository } from '@/repository/TripRepository'
import { generateId } from '@/utils/id'
import { generateDayPlans } from '@/utils/dates'

/**
 * Shape of the payload accepted by addTrip.
 *
 * Separated from the full Trip type so the modal only needs to provide user-entered
 * fields; the context fills in the id and generates the DayPlan array automatically.
 */
interface AddTripPayload {
  destination: string
  startDate: string
  endDate: string
  coverImage?: string
  coverImageThumb?: string
  coverImageAttribution?: string
  lat?: number
  lon?: number
}

/**
 * Persists the single trip that a mutation touched.
 *
 * Called from inside functional state updaters after the next `trips` array is
 * computed; `repo.save` is an idempotent upsert, so StrictMode's double-invocation
 * of the updater cannot corrupt storage.
 *
 * @param repo - The active repository
 * @param nextTrips - The freshly computed trips array
 * @param tripId - Id of the trip that changed
 */
function persistTrip(repo: TripRepository, nextTrips: Trip[], tripId: string): void {
  const updated = nextTrips.find((t) => t.id === tripId)
  if (updated) repo.save(updated)
}

/**
 * The mutation half of the trip context, exposed via `TripDispatchContext`.
 *
 * Read access lives in `TripStateContext` instead (see `useTripState` /
 * `useTripById`). Every function here depends only on the repository, never on
 * the current trips array, which is what lets the whole object stay
 * referentially stable across mutations.
 *
 * All mutations persist through the repository, so no separate persistence step
 * is needed after calling any of these functions.
 */
export interface TripDispatchValue {
  /**
   * Creates a new trip from minimal user input and generates its day structure.
   * @returns The new trip's id (for immediate navigation)
   */
  addTrip: (payload: AddTripPayload) => string
  /**
   * Adds a fully constructed trip (e.g. from calendar import) without regenerating days.
   * @returns The new trip's id
   */
  addTripFull: (trip: Omit<Trip, 'id'>) => string
  /** Removes the trip with the given id from storage */
  deleteTrip: (tripId: string) => void
  /** Appends a new activity (with a generated id) to the specified day */
  addActivity: (tripId: string, dayId: string, activity: Omit<Activity, 'id'>) => void
  /** Removes a single activity from the specified day */
  deleteActivity: (tripId: string, dayId: string, activityId: string) => void
  /**
   * Reorders an activity within a day by moving it from one array index to another.
   * Used by the timeline's native drag-and-drop reordering.
   */
  moveActivity: (tripId: string, dayId: string, fromIndex: number, toIndex: number) => void
}

/**
 * Provides trip CRUD operations and persistence to the component tree.
 *
 * Persistence is delegated to a {@link TripRepository} rather than touching
 * `localStorage` directly, so the storage backend can be swapped without changing
 * this component or its consumers. By default the repository is the shared
 * localStorage-backed one (source of truth for the whole app); pass `repository`
 * to inject a different implementation (e.g. an in-memory fake in tests).
 *
 * React state mirrors the repository: it is seeded from `repository.getAll()` on
 * mount, and every mutation updates both state (for re-render) and the repository
 * (for durability). The repository writes below live inside the functional state
 * updater and are intentionally idempotent (upsert / filtered-delete), so React
 * 18/19 StrictMode's double-invocation of updaters cannot corrupt storage.
 *
 * @param repository - Optional persistence backend; defaults to the context/localStorage repo
 * @param children - React subtree that will have access to the context
 */
export function TripProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository?: TripRepository
}) {
  const contextRepository = useTripRepository()
  const repo = repository ?? contextRepository
  // Seed React state from the repository once, on mount.
  const [trips, setTrips] = useState<Trip[]>(() => repo.getAll())

  // Multi-tab sync: when another tab writes the trip dataset, the browser fires a
  // `storage` event *in this tab only* (never in the tab that made the change).
  // Re-seed React state from the repository so tab B reflects tab A's edits
  // instead of holding a stale list that a later save would write back verbatim,
  // clobbering A's changes. Each mutation persists via a read-modify-write upsert
  // on the latest localStorage, so keeping in-memory state fresh here is what
  // closes the last-writer-wins gap.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      // `key === null` fires on storage.clear(); otherwise only react to our key.
      if (e.key !== null && e.key !== TRIPS_STORAGE_KEY) return
      setTrips(repo.getAll())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [repo])

  const addTrip = useCallback(
    (payload: AddTripPayload): string => {
      const id = generateId()
      const newTrip: Trip = {
        id,
        destination: payload.destination,
        startDate: payload.startDate,
        endDate: payload.endDate,
        // Auto-generate one empty DayPlan per calendar day in the range
        days: generateDayPlans(payload.startDate, payload.endDate),
        coverImage: payload.coverImage,
        coverImageThumb: payload.coverImageThumb,
        coverImageAttribution: payload.coverImageAttribution,
        lat: payload.lat,
        lon: payload.lon,
      }
      // Functional update avoids losing trips when multiple mutations land
      // before React re-renders (e.g. rapid adds or async geocoding callbacks)
      setTrips((prev) => {
        repo.save(newTrip)
        return [...prev, newTrip]
      })
      return id
    },
    [repo],
  )

  // Used by calendar import where the day structure is built from ICS events
  const addTripFull = useCallback(
    (trip: Omit<Trip, 'id'>): string => {
      const id = generateId()
      const newTrip: Trip = { ...trip, id }
      setTrips((prev) => {
        repo.save(newTrip)
        return [...prev, newTrip]
      })
      return id
    },
    [repo],
  )

  const deleteTrip = useCallback(
    (tripId: string) => {
      setTrips((prev) => {
        repo.delete(tripId)
        return prev.filter((t) => t.id !== tripId)
      })
    },
    [repo],
  )

  const addActivity = useCallback(
    (tripId: string, dayId: string, activity: Omit<Activity, 'id'>) => {
      const newActivity: Activity = { ...activity, id: generateId() }
      // Immutable update: map over trips -> days -> activities; only the target day changes
      setTrips((prev) => {
        const next = prev.map((trip) =>
          trip.id !== tripId
            ? trip
            : {
                ...trip,
                days: trip.days.map((day) =>
                  day.id !== dayId
                    ? day
                    : { ...day, activities: [...day.activities, newActivity] },
                ),
              },
        )
        persistTrip(repo, next, tripId)
        return next
      })
    },
    [repo],
  )

  const deleteActivity = useCallback(
    (tripId: string, dayId: string, activityId: string) => {
      // Same immutable traversal pattern as addActivity; only the target activity is removed
      setTrips((prev) => {
        const next = prev.map((trip) =>
          trip.id !== tripId
            ? trip
            : {
                ...trip,
                days: trip.days.map((day) =>
                  day.id !== dayId
                    ? day
                    : { ...day, activities: day.activities.filter((a) => a.id !== activityId) },
                ),
              },
        )
        persistTrip(repo, next, tripId)
        return next
      })
    },
    [repo],
  )

  const moveActivity = useCallback(
    (tripId: string, dayId: string, fromIndex: number, toIndex: number) => {
      setTrips((prev) => {
        const next = prev.map((trip) =>
          trip.id !== tripId
            ? trip
            : {
                ...trip,
                days: trip.days.map((day) => {
                  if (day.id !== dayId) return day
                  const activities = [...day.activities]
                  // Guard against stale/out-of-range indices and no-op moves
                  if (
                    fromIndex < 0 ||
                    fromIndex >= activities.length ||
                    toIndex < 0 ||
                    toIndex >= activities.length ||
                    fromIndex === toIndex
                  ) {
                    return day
                  }
                  // Remove the dragged activity, then re-insert it at the drop index
                  const [moved] = activities.splice(fromIndex, 1)
                  activities.splice(toIndex, 0, moved)
                  return { ...day, activities }
                }),
              },
        )
        persistTrip(repo, next, tripId)
        return next
      })
    },
    [repo],
  )

  // Every callback below depends only on `repo`, so this object keeps the same
  // identity for the provider's lifetime. Components that consume dispatch
  // without consuming state therefore never re-render on a trip mutation.
  const dispatch = useMemo<TripDispatchValue>(
    () => ({ addTrip, addTripFull, deleteTrip, addActivity, deleteActivity, moveActivity }),
    [addTrip, addTripFull, deleteTrip, addActivity, deleteActivity, moveActivity],
  )

  // Dispatch sits outside state so a state update never remounts the dispatch
  // provider's subtree boundary
  return (
    <TripDispatchContext.Provider value={dispatch}>
      <TripStateContext.Provider value={trips}>
        {children}
      </TripStateContext.Provider>
    </TripDispatchContext.Provider>
  )
}
