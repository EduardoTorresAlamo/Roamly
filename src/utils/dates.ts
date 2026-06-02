import type { DayPlan } from '@/types'
import { generateId } from './id'

/**
 * Generates one DayPlan entry for every calendar day from startDate to endDate, inclusive.
 *
 * The 'T00:00:00' suffix is appended before constructing Date objects to force
 * local-timezone interpretation. Without it, "2024-10-12" is parsed as UTC midnight,
 * which can shift the displayed date by one day in negative-offset timezones.
 *
 * @param startDate - Trip start in YYYY-MM-DD format
 * @param endDate - Trip end in YYYY-MM-DD format
 * @returns An array of empty DayPlan objects, one per day
 */
export function generateDayPlans(startDate: string, endDate: string): DayPlan[] {
  const days: DayPlan[] = []
  const current = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  while (current <= end) {
    days.push({
      id: generateId(),
      date: current.toISOString().slice(0, 10),
      activities: [],
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}

// Shared formatter instance -- creating Intl objects is expensive; reuse one globally.
// timeZone: 'UTC' keeps date strings like "2024-10-12" from shifting when the
// browser is in a negative UTC offset (e.g. America/New_York).
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/**
 * Formats an ISO date string as a short human-readable date.
 *
 * @param isoDate - Date in YYYY-MM-DD format
 * @returns Formatted string, e.g. "Oct 12"
 */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

/**
 * Formats a date range as a compact label for display in trip cards and headers.
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Formatted range, e.g. "Oct 12 - Oct 18"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

/**
 * Returns a 1-indexed day label for use in tab headers.
 *
 * @param index - Zero-based day index within the trip
 * @returns Label string, e.g. "Day 1"
 */
export function getDayLabel(index: number): string {
  return `Day ${index + 1}`
}

/**
 * Returns a combined day label with date for verbose tab display.
 *
 * @param index - Zero-based day index within the trip
 * @param date - Date in YYYY-MM-DD format
 * @returns Label string, e.g. "Day 1 - Oct 12"
 */
export function getDayTabLabel(index: number, date: string): string {
  return `Day ${index + 1} - ${formatDate(date)}`
}

/**
 * Calculates the total number of days in a trip, including both endpoints.
 *
 * The +1 makes a one-night stay count as 1 day (start == end = 1, not 0).
 *
 * @param startDate - Trip start in YYYY-MM-DD format
 * @param endDate - Trip end in YYYY-MM-DD format
 * @returns Number of days as a positive integer
 */
export function getTripDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  // Divide ms difference by ms-per-day, then add 1 for inclusive endpoint
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
