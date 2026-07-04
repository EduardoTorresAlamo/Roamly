/**
 * Lightweight ICS (iCalendar) parser for the browser.
 * Handles VEVENT blocks to extract travel-relevant info.
 * Supports DTSTART/DTEND, SUMMARY, DESCRIPTION, LOCATION,
 * and Apple/Google flight-specific custom properties.
 */

/**
 * A single VEVENT block parsed from an ICS file.
 *
 * The type field is inferred by scanning summary/description text for keywords
 * rather than relying on the CATEGORIES property, which most calendar apps
 * do not populate for travel bookings.
 */
export interface ICSEvent {
  /** UID property value, used as a stable React key and deduplication handle */
  uid: string
  summary: string
  description?: string
  location?: string
  /** ISO datetime string derived from DTSTART */
  dtStart?: string
  /** ISO datetime string derived from DTEND */
  dtEnd?: string
  /** Inferred event category based on keyword analysis */
  type: 'flight' | 'hotel' | 'other'
  // Extracted flight fields
  airline?: string
  flightNumber?: string
}

/**
 * Top-level result of parsing a full ICS file.
 */
export interface ParsedICS {
  events: ICSEvent[]
  /** Calendar display name from the X-WR-CALNAME property, if present */
  calendarName?: string
}

/**
 * Parses a raw ICS text string into a structured collection of calendar events.
 *
 * The parser implements a simple line-by-line state machine rather than a
 * full RFC 5545 parser, which keeps the bundle size small. Unsupported
 * component types (VTIMEZONE, VTODO, etc.) are silently skipped.
 *
 * @param raw - Raw text content of an .ics file
 * @returns Parsed events and optional calendar name
 */
export function parseICS(raw: string): ParsedICS {
  const lines = unfoldLines(raw)
  const events: ICSEvent[] = []
  let calendarName: string | undefined

  // State machine: track whether we are inside a VEVENT block
  let inEvent = false
  let current: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VCALENDAR') continue
    if (line === 'END:VCALENDAR') continue

    // X-WR-CALNAME is a non-standard Apple/Google extension for the calendar display name
    if (line.startsWith('X-WR-CALNAME:')) {
      calendarName = line.replace('X-WR-CALNAME:', '').trim()
      continue
    }

    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
      continue
    }

    if (line === 'END:VEVENT') {
      inEvent = false
      const event = buildEvent(current)
      if (event) events.push(event)
      continue
    }

    if (!inEvent) continue

    // Split on first colon (or semicolon for params like DTSTART;TZID=...)
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const rawKey = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1).trim()
    // Normalize: strip property parameters (e.g. DTSTART;TZID=America/New_York becomes DTSTART)
    const key = rawKey.split(';')[0].toUpperCase()
    current[key] = value
  }

  return { events, calendarName }
}

/**
 * Unfolds RFC 5545 line folding: a logical line may be split across multiple
 * physical lines, with each continuation line starting with a space or tab.
 * This function rejoins them before property parsing begins.
 *
 * @param raw - Raw ICS file text with potential CRLF, LF, or CR line endings
 * @returns Array of logical (unfolded) lines
 */
function unfoldLines(raw: string): string[] {
  // Normalize all line ending styles to LF before splitting
  const foldedLines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const unfolded: string[] = []

  for (const line of foldedLines) {
    // A leading whitespace character marks a continuation of the previous line
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      // Append to previous line, stripping the leading whitespace character
      unfolded[unfolded.length - 1] += line.slice(1)
    } else {
      unfolded.push(line)
    }
  }
  return unfolded
}

/**
 * Converts an ICS DTSTART/DTEND value to a standard ISO 8601 string.
 *
 * ICS datetime values come in three forms:
 *   "20241012"          -- date-only (all-day events)
 *   "20241012T083000"   -- local datetime
 *   "20241012T083000Z"  -- UTC datetime (trailing Z)
 *
 * The Z suffix is stripped because Roamly treats all times as local to the
 * destination; timezone conversion is not in scope for the initial release.
 *
 * @param icsDate - Raw DTSTART or DTEND value from the ICS property
 * @returns ISO string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS), or undefined if empty
 */
function icsDateToISO(icsDate: string): string | undefined {
  if (!icsDate) return undefined
  // Strip the UTC indicator; timezone handling is deferred
  const clean = icsDate.replace('Z', '').trim()
  if (clean.length === 8) {
    // Date-only: YYYYMMDD -> YYYY-MM-DD
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  if (clean.length >= 15) {
    // DateTime: YYYYMMDDTHHMMSS -> YYYY-MM-DDTHH:MM:SS
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}`
  }
  // Passthrough for any other format the parser does not recognize
  return clean
}

/**
 * Infers whether a VEVENT represents a flight, hotel stay, or other event.
 *
 * Calendar apps rarely use the CATEGORIES property for travel bookings, so
 * keyword analysis of SUMMARY and DESCRIPTION is more reliable. The keyword
 * list covers common English and Spanish terms to handle international calendars.
 *
 * @param props - Raw key-value map of ICS properties for the current VEVENT
 * @returns The best-matching event type
 */
function detectEventType(props: Record<string, string>): 'flight' | 'hotel' | 'other' {
  const summary = (props['SUMMARY'] ?? '').toLowerCase()
  const desc = (props['DESCRIPTION'] ?? '').toLowerCase()
  const cat = (props['CATEGORIES'] ?? '').toLowerCase()

  // Spanish "vuelo" included for travelers using non-English calendar apps
  const flightKeywords = ['flight', 'vuelo', 'departs', 'arrives', 'boarding', 'airline', ' air ', 'airways']
  const hotelKeywords = ['hotel', 'check-in', 'check in', 'lodging', 'hostel', 'airbnb', 'resort']

  // Flight check runs first because some hotel summaries mention "flights included"
  if (flightKeywords.some((k) => summary.includes(k) || desc.includes(k) || cat.includes(k))) return 'flight'
  if (hotelKeywords.some((k) => summary.includes(k) || desc.includes(k) || cat.includes(k))) return 'hotel'
  return 'other'
}

/**
 * Attempts to extract an IATA airline code and flight number from a summary string.
 *
 * Common formats produced by booking systems: "UA 123", "AA456", "Flight AA456".
 * The regex requires 2-3 uppercase letters (IATA code) followed by 2-5 digits.
 *
 * @param summary - The SUMMARY property value of a flight VEVENT
 * @returns Extracted airline and flight number, or an empty object if not found
 */
function extractFlightInfo(summary: string): { airline?: string; flightNumber?: string } {
  // Pattern: 2-3 capital letters + optional space + 2-5 digits
  const match = summary.match(/\b([A-Z]{2,3})\s*(\d{2,5})\b/)
  if (match) {
    return { airline: match[1], flightNumber: `${match[1]} ${match[2]}` }
  }
  return {}
}

/**
 * Constructs a typed ICSEvent from the raw property map of a single VEVENT block.
 *
 * ICS text values use backslash escapes (\n for newline, \, for comma) that must
 * be decoded before display in the UI.
 *
 * @param props - Key-value map of normalized ICS property names to their values
 * @returns A typed ICSEvent, or null if the event lacks a SUMMARY (invalid)
 */
function buildEvent(props: Record<string, string>): ICSEvent | null {
  const summary = props['SUMMARY']
  // Events without a summary are invalid and cannot be displayed meaningfully
  if (!summary) return null

  const uid = props['UID'] ?? `${Date.now()}-${Math.random()}`
  const dtStart = icsDateToISO(props['DTSTART'] ?? '')
  const dtEnd = icsDateToISO(props['DTEND'] ?? '')
  const type = detectEventType(props)
  const location = props['LOCATION']
  const description = props['DESCRIPTION']

  // Only attempt flight number extraction for events already classified as flights
  const flightInfo = type === 'flight' ? extractFlightInfo(summary) : {}

  return {
    uid,
    summary,
    // Decode ICS text escapes before storing in the event object
    description: description ? description.replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined,
    location,
    dtStart,
    dtEnd,
    type,
    ...flightInfo,
  }
}

/**
 * Derives a Trip-compatible date range and destination from a list of ICS events.
 *
 * The start and end dates span the full range of all event start and end times,
 * so the resulting trip covers every imported event. The destination is guessed
 * from the first event with a populated LOCATION field; this heuristic works well
 * for single-destination trips exported from Apple/Google Calendar.
 *
 * @param events - Parsed ICSEvent array from a single calendar file
 * @returns Trip metadata with all events attached, or null if the event list is empty
 */
export function groupEventsIntoTrip(events: ICSEvent[]): {
  startDate: string
  endDate: string
  destination: string
  events: ICSEvent[]
} | null {
  if (events.length === 0) return null

  // Collect all start and end dates, then sort to find the overall span
  const dates = events
    .flatMap((e) => [e.dtStart, e.dtEnd])
    .filter((d): d is string => !!d)
    // Slice to date-only portion (YYYY-MM-DD) before sorting
    .map((d) => d.slice(0, 10))
    .sort()

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  // Prefer the LOCATION field for destination; fall back to the first summary as a last resort
  const locations = events
    .map((e) => e.location ?? '')
    .filter(Boolean)
  const destination = locations[0] ?? events[0]?.summary ?? 'Imported Trip'

  return { startDate, endDate, destination, events }
}
