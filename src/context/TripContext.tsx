import { createContext, useContext, useCallback, type ReactNode } from 'react'
import type { Trip, Activity } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
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
 * The value exposed by TripContext to consuming components.
 *
 * All mutations update localStorage via useLocalStorage, so no separate
 * persistence step is needed after calling any of these functions.
 */
interface TripContextValue {
  /** All persisted trips in insertion order */
  trips: Trip[]
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
  /** Returns the Trip with the given id, or undefined if not found */
  getTripById: (tripId: string) => Trip | undefined
}

const TripContext = createContext<TripContextValue | null>(null)

/**
 * Provides trip CRUD operations and localStorage persistence to the component tree.
 *
 * All trip data lives in localStorage under the key 'wanderplan-trips'. There is
 * no remote backend; localStorage is the source of truth for the entire app.
 *
 * @param children - React subtree that will have access to the context
 */
export function TripProvider({ children }: { children: ReactNode }) {
  // 'wanderplan-trips' is the localStorage key used for the entire trip dataset
  const [trips, setTrips] = useLocalStorage<Trip[]>('wanderplan-trips', [])

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
      setTrips([...trips, newTrip])
      return id
    },
    [trips, setTrips],
  )

  // Used by calendar import where the day structure is built from ICS events
  const addTripFull = useCallback(
    (trip: Omit<Trip, 'id'>): string => {
      const id = generateId()
      setTrips([...trips, { ...trip, id }])
      return id
    },
    [trips, setTrips],
  )

  const deleteTrip = useCallback(
    (tripId: string) => {
      setTrips(trips.filter((t) => t.id !== tripId))
    },
    [trips, setTrips],
  )

  const addActivity = useCallback(
    (tripId: string, dayId: string, activity: Omit<Activity, 'id'>) => {
      const newActivity: Activity = { ...activity, id: generateId() }
      // Immutable update: map over trips -> days -> activities; only the target day changes
      setTrips(
        trips.map((trip) =>
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
        ),
      )
    },
    [trips, setTrips],
  )

  const deleteActivity = useCallback(
    (tripId: string, dayId: string, activityId: string) => {
      // Same immutable traversal pattern as addActivity; only the target activity is removed
      setTrips(
        trips.map((trip) =>
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
        ),
      )
    },
    [trips, setTrips],
  )

  const getTripById = useCallback(
    (tripId: string) => trips.find((t) => t.id === tripId),
    [trips],
  )

  return (
    <TripContext.Provider value={{ trips, addTrip, addTripFull, deleteTrip, addActivity, deleteActivity, getTripById }}>
      {children}
    </TripContext.Provider>
  )
}

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
