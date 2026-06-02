/**
 * Union of all supported activity categories.
 * Drives icon selection, color theming, and form rendering throughout the app.
 */
export type ActivityType = 'flight' | 'lodging' | 'dining' | 'activity'

/**
 * Ordered list of all activity types used to render type-picker grids
 * and iterate over category metadata without hardcoding the union manually.
 */
export const ACTIVITY_TYPES: ActivityType[] = ['flight', 'lodging', 'dining', 'activity']

/**
 * A single activity on a day's itinerary.
 *
 * Coordinates (lat/lon) are populated asynchronously via Nominatim geocoding
 * after the user saves the activity; they are optional so the app functions
 * even when geocoding fails or is unavailable.
 */
export interface Activity {
  id: string
  type: ActivityType
  title: string
  /** HH:mm format, required for timeline sorting */
  startTime: string
  /** HH:mm format, optional end time */
  endTime?: string
  notes?: string
  // Flight-specific extras stored in notes-like fields
  airline?: string
  flightNumber?: string
  // Geocoded coordinates (Nominatim) -- populated after adding activity
  lat?: number
  lon?: number
  /** Full display name returned by Nominatim, e.g. "Fushimi Inari, Fushimi, Kyoto" */
  address?: string
}

/**
 * All activities planned for a single calendar date within a trip.
 */
export interface DayPlan {
  id: string
  /** ISO date string in YYYY-MM-DD format */
  date: string
  activities: Activity[]
}

/**
 * Top-level trip record persisted to localStorage.
 *
 * Cover image fields are sourced from Unsplash (or curated fallbacks).
 * Coordinates are used to center the Leaflet map when the user opens the trip.
 */
export interface Trip {
  id: string
  destination: string
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD */
  endDate: string
  days: DayPlan[]
  /** Full-resolution Unsplash photo URL used as the trip hero */
  coverImage?: string
  /** Smaller thumbnail URL used in TripCard to avoid loading heavy images in the list */
  coverImageThumb?: string
  /** Photographer name displayed for Unsplash attribution */
  coverImageAttribution?: string
  /** Destination latitude used to center the Leaflet map */
  lat?: number
  /** Destination longitude used to center the Leaflet map */
  lon?: number
}
