/**
 * Trip -> ICS (iCalendar) serialization for calendar export.
 *
 * Written by hand rather than pulling in the `ics` package: the subset of RFC 5545
 * needed here is small (VEVENT, escaping, line folding), and the app already ships a
 * hand-rolled parser in icsParser.ts for the import direction.
 *
 * Times are emitted as RFC 5545 *floating* local times (no `Z`, no TZID), matching
 * how the rest of Roamly treats activity times: 09:00 means 09:00 where you are
 * standing, not 09:00 in the browser's timezone. Calendar apps interpret floating
 * times in the viewer's local zone, which is the behavior travelers expect.
 */

import type { Trip } from '@/types'
import { ACTIVITY_META } from './activityIcons'

/** Product identifier advertised in the generated calendar */
const PRODID = '-//Roamly//Trip Itinerary//EN'

/** Default activity length, in minutes, when no end time was entered */
const DEFAULT_DURATION_MIN = 60

/**
 * Escapes a text value per RFC 5545 section 3.3.11.
 *
 * Backslash must be escaped first, otherwise the backslashes introduced by the
 * later replacements would themselves be escaped.
 *
 * @param value - Raw user text (title, notes, destination)
 * @returns Text safe to place after a property name
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Folds a content line to the 75-octet limit of RFC 5545 section 3.1.
 *
 * Continuation lines start with a single space, which the parser strips when
 * unfolding. Folding is done on UTF-8 octets, not characters, so a line of accented
 * text does not silently exceed the limit.
 *
 * @param line - A complete unfolded content line
 * @returns The line, split across as many physical lines as needed
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const parts: string[] = []
  let current = ''
  let currentBytes = 0
  // Continuation lines carry a leading space, leaving 74 octets of payload
  let limit = 75

  // Iterate by code point so surrogate pairs are never split mid-character
  for (const char of line) {
    const charBytes = encoder.encode(char).length
    if (currentBytes + charBytes > limit) {
      parts.push(current)
      current = ''
      currentBytes = 0
      limit = 74
    }
    current += char
    currentBytes += charBytes
  }
  parts.push(current)

  return parts.join('\r\n ')
}

/**
 * Formats a YYYY-MM-DD calendar date as an ICS DATE value (YYYYMMDD).
 *
 * @param isoDate - Date in YYYY-MM-DD format
 */
function toICSDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

/**
 * Combines a calendar date and an HH:mm clock time into an ICS floating DATE-TIME.
 *
 * @param isoDate - Date in YYYY-MM-DD format
 * @param time - Time in HH:mm format
 * @returns Value in YYYYMMDDTHHMMSS form
 */
function toICSDateTime(isoDate: string, time: string): string {
  const [hours = '00', minutes = '00'] = time.split(':')
  return `${toICSDate(isoDate)}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`
}

/**
 * Advances a YYYY-MM-DD date by a whole number of days.
 *
 * Anchored at UTC midnight (Date.UTC + setUTCDate) so the result is the calendar day
 * the user picked regardless of their timezone, and so a DST transition inside the
 * range cannot shift the date.
 *
 * @param isoDate - Date in YYYY-MM-DD format
 * @param days - Number of days to add (may be negative)
 * @returns The shifted date in YYYY-MM-DD format
 */
function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Adds minutes to an HH:mm clock time, clamping at 23:59 rather than rolling over
 * into the next day — an activity's implicit end time should never land it on the
 * wrong DayPlan.
 *
 * @param time - Start time in HH:mm format
 * @param minutes - Minutes to add
 * @returns End time in HH:mm format
 */
function addMinutes(time: string, minutes: number): string {
  const [h = '0', m = '0'] = time.split(':')
  const total = Number(h) * 60 + Number(m) + minutes
  if (!Number.isFinite(total)) return time
  const clamped = Math.min(total, 23 * 60 + 59)
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/**
 * Builds the DTSTAMP value: the moment the calendar file was generated, in UTC.
 *
 * Unlike activity times, DTSTAMP is an absolute instant and RFC 5545 requires it in
 * UTC, so the trailing `Z` here is correct.
 */
function nowUTCStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Serializes a whole trip into the text of an .ics file.
 *
 * Two kinds of event are emitted:
 *   - One all-day event spanning the trip, so the trip shows as a band across the
 *     calendar month view. Its DTEND is exclusive per RFC 5545, hence endDate + 1.
 *   - One timed event per activity, ordered chronologically within each day.
 *
 * Activities with no meaningful start time (missing, or the "00:00" placeholder the
 * add form defaults to) become all-day events on their day instead of midnight
 * events, which is how calendar apps display an untimed plan.
 *
 * @param trip - The trip to serialize
 * @returns Full .ics file content with CRLF line endings
 */
export function generateTripICS(trip: Trip): string {
  const stamp = nowUTCStamp()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(trip.destination)}`,
  ]

  /** Appends one VEVENT, given its already-formatted date/time properties. */
  const pushEvent = (uid: string, dateProps: string[], summary: string, description?: string, location?: string) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      ...dateProps,
      `SUMMARY:${escapeText(summary)}`,
    )
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
    if (location) lines.push(`LOCATION:${escapeText(location)}`)
    lines.push('END:VEVENT')
  }

  // Trip-spanning all-day event
  pushEvent(
    `trip-${trip.id}@roamly`,
    [
      `DTSTART;VALUE=DATE:${toICSDate(trip.startDate)}`,
      // DTEND is exclusive for DATE values, so add a day to include the last day
      `DTEND;VALUE=DATE:${toICSDate(addDays(trip.endDate, 1))}`,
    ],
    `Trip: ${trip.destination}`,
    `Itinerary exported from Roamly.`,
    trip.destination,
  )

  trip.days.forEach((day, dayIndex) => {
    // Lexicographic order on HH:mm matches chronological order
    const sorted = [...day.activities].sort((a, b) => a.startTime.localeCompare(b.startTime))

    sorted.forEach((activity) => {
      const label = ACTIVITY_META[activity.type].label
      const notes = [`Day ${dayIndex + 1} · ${label}`, activity.notes].filter(Boolean).join('\n')
      const hasTime = Boolean(activity.startTime) && activity.startTime !== '00:00'

      const dateProps = hasTime
        ? [
            `DTSTART:${toICSDateTime(day.date, activity.startTime)}`,
            `DTEND:${toICSDateTime(day.date, activity.endTime || addMinutes(activity.startTime, DEFAULT_DURATION_MIN))}`,
          ]
        : [
            `DTSTART;VALUE=DATE:${toICSDate(day.date)}`,
            `DTEND;VALUE=DATE:${toICSDate(addDays(day.date, 1))}`,
          ]

      pushEvent(
        `activity-${activity.id}@roamly`,
        dateProps,
        activity.title,
        notes || undefined,
        activity.address ?? undefined,
      )
    })
  })

  lines.push('END:VCALENDAR')

  // RFC 5545 requires CRLF line endings, and every line folded to 75 octets
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/**
 * Builds a filesystem-friendly .ics filename from the destination.
 *
 * @param trip - Trip being exported
 * @returns Filename such as "kyoto-japan-2024-10-12.ics"
 */
export function icsFilename(trip: Trip): string {
  const slug = trip.destination
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'trip'}-${trip.startDate}.ics`
}

/**
 * Generates the .ics file for a trip and triggers a browser download.
 *
 * The object URL is revoked on the next tick rather than immediately: Safari reads
 * the blob asynchronously after the synthetic click, and revoking too early aborts
 * the download.
 *
 * @param trip - The trip to export
 */
export function downloadTripICS(trip: Trip): void {
  const blob = new Blob([generateTripICS(trip)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = icsFilename(trip)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 0)
}
