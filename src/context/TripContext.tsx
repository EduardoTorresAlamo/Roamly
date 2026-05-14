import { createContext, useContext, useCallback, type ReactNode } from 'react'
import type { Trip, Activity } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { generateId } from '@/utils/id'
import { generateDayPlans } from '@/utils/dates'

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

interface TripContextValue {
  trips: Trip[]
  addTrip: (payload: AddTripPayload) => string
  addTripFull: (trip: Omit<Trip, 'id'>) => string
  deleteTrip: (tripId: string) => void
  addActivity: (tripId: string, dayId: string, activity: Omit<Activity, 'id'>) => void
  deleteActivity: (tripId: string, dayId: string, activityId: string) => void
  getTripById: (tripId: string) => Trip | undefined
}

const TripContext = createContext<TripContextValue | null>(null)

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useLocalStorage<Trip[]>('wanderplan-trips', [])

  const addTrip = useCallback(
    (payload: AddTripPayload): string => {
      const id = generateId()
      const newTrip: Trip = {
        id,
        destination: payload.destination,
        startDate: payload.startDate,
        endDate: payload.endDate,
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

  // For calendar import where we have the full trip structure already
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

export function useTripContext(): TripContextValue {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used within TripProvider')
  return ctx
}
