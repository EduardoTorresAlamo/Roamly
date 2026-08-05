import type { DayPlan } from '@/types'
import { generateId } from './id'

/**
 * Parses a YYYY-MM-DD string into a Date anchored at UTC midnight.
 *
 * All trip dates are calendar dates with no time component, so they are handled
 * entirely in UTC. Constructing them with the local-time `new Date()` parser and
 * then reading them back with `toISOString()` shifts the date by one day for every
 * user in a positive UTC offset (Europe, Asia, Africa, Oceania).
 *
 * @param isoDate - Date in YYYY-MM-DD format
 * @returns A Date at 00:00:00 UTC on that calendar day (Invalid Date if unparseable)
 */
function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Serializes a UTC-anchored Date back to a YYYY-MM-DD calendar date string.
 *
 * @param date - Date created by parseISODate (or any UTC-midnight date)
 * @returns Date in YYYY-MM-DD format
 */
function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Generates one DayPlan entry for every calendar day from startDate to endDate, inclusive.
 *
 * Dates are constructed and incremented purely in UTC (Date.UTC + setUTCDate) so the
 * generated day list matches the dates the user picked regardless of their timezone.
 *
 * @param startDate - Trip start in YYYY-MM-DD format
 * @param endDate - Trip end in YYYY-MM-DD format
 * @returns An array of empty DayPlan objects, one per day
 */
export function generateDayPlans(startDate: string, endDate: string): DayPlan[] {
  const days: DayPlan[] = []
  const current = parseISODate(startDate)
  const end = parseISODate(endDate)

  // Invalid input yields NaN timestamps; the comparison below is false, so we return []
  while (current <= end) {
    days.push({
      id: generateId(),
      date: toISODate(current),
      activities: [],
    })
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}

/**
 * Returns today's calendar date in the user's local timezone as YYYY-MM-DD.
 *
 * `new Date().toISOString().slice(0, 10)` is wrong for this: it returns the UTC
 * day, which is off by one for part of every day outside UTC.
 *
 * @returns Today's local date in YYYY-MM-DD format
 */
export function getTodayISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
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
  return dateFormatter.format(parseISODate(isoDate))
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
  // UTC-anchored so a DST transition inside the range cannot add/remove an hour
  const start = parseISODate(startDate)
  const end = parseISODate(endDate)
  // Divide ms difference by ms-per-day, then add 1 for inclusive endpoint
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
