export type ActivityType = 'flight' | 'lodging' | 'dining' | 'activity'

export const ACTIVITY_TYPES: ActivityType[] = ['flight', 'lodging', 'dining', 'activity']

export interface Activity {
  id: string
  type: ActivityType
  title: string
  startTime: string
  endTime?: string
  notes?: string
  // Flight-specific extras stored in notes-like fields
  airline?: string
  flightNumber?: string
  // Geocoded coordinates (Nominatim) — populated after adding activity
  lat?: number
  lon?: number
  address?: string
}

export interface DayPlan {
  id: string
  date: string // YYYY-MM-DD
  activities: Activity[]
}

export interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  days: DayPlan[]
  coverImage?: string  // Unsplash photo URL
  coverImageThumb?: string  // Smaller thumbnail for cards
  coverImageAttribution?: string  // Photographer name for Unsplash attribution
  lat?: number  // Destination coordinates for map centering
  lon?: number
}
