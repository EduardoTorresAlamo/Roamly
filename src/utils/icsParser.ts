/**
 * Lightweight ICS (iCalendar) parser for the browser.
 * Handles VEVENT blocks to extract travel-relevant info.
 * Supports DTSTART/DTEND, SUMMARY, DESCRIPTION, LOCATION,
 * and Apple/Google flight-specific custom properties.
 */

export interface ICSEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  dtStart?: string   // ISO string
  dtEnd?: string     // ISO string
  type: 'flight' | 'hotel' | 'other'
  // Extracted flight fields
  airline?: string
  flightNumber?: string
  departureAirport?: string
  arrivalAirport?: string
}

export interface ParsedICS {
  events: ICSEvent[]
  calendarName?: string
}

/** Parse a raw ICS text string into structured events */
export function parseICS(raw: string): ParsedICS {
  const lines = unfoldLines(raw)
  const events: ICSEvent[] = []
  let calendarName: string | undefined

  let inEvent = false
  let current: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VCALENDAR') continue
    if (line === 'END:VCALENDAR') continue

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
    // Normalize: strip params (e.g. DTSTART;TZID=America/New_York → DTSTART)
    const key = rawKey.split(';')[0].toUpperCase()
    current[key] = value
  }

  return { events, calendarName }
}

/** ICS line unfolding: lines that start with space/tab are continuations */
function unfoldLines(raw: string): string[] {
  const foldedLines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const unfolded: string[] = []

  for (const line of foldedLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1)
    } else {
      unfolded.push(line)
    }
  }
  return unfolded
}

/** Convert ICS datetime string to ISO */
function icsDateToISO(icsDate: string): string | undefined {
  if (!icsDate) return undefined
  // Format: 20241012T083000Z or 20241012T083000 or 20241012
  const clean = icsDate.replace('Z', '').trim()
  if (clean.length === 8) {
    // Date only: YYYYMMDD
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  if (clean.length >= 15) {
    // DateTime: YYYYMMDDTHHMMSS
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}`
  }
  return clean
}

/** Try to detect if a VEVENT is flight-related */
function detectEventType(props: Record<string, string>): 'flight' | 'hotel' | 'other' {
  const summary = (props['SUMMARY'] ?? '').toLowerCase()
  const desc = (props['DESCRIPTION'] ?? '').toLowerCase()
  const cat = (props['CATEGORIES'] ?? '').toLowerCase()

  const flightKeywords = ['flight', 'vuelo', 'departs', 'arrives', 'boarding', 'airline', ' air ', 'airways']
  const hotelKeywords = ['hotel', 'check-in', 'check in', 'lodging', 'hostel', 'airbnb', 'resort']

  if (flightKeywords.some((k) => summary.includes(k) || desc.includes(k) || cat.includes(k))) return 'flight'
  if (hotelKeywords.some((k) => summary.includes(k) || desc.includes(k) || cat.includes(k))) return 'hotel'
  return 'other'
}

/** Try to extract flight number and airline from summary like "UA 123" or "Flight AA456" */
function extractFlightInfo(summary: string): { airline?: string; flightNumber?: string } {
  // Pattern: 2-3 letters + space? + 2-5 digits (e.g. "UA 123", "AA456", "United 123")
  const match = summary.match(/\b([A-Z]{2,3})\s*(\d{2,5})\b/)
  if (match) {
    return { airline: match[1], flightNumber: `${match[1]} ${match[2]}` }
  }
  return {}
}

/** Build a typed ICSEvent from raw key-value pairs */
function buildEvent(props: Record<string, string>): ICSEvent | null {
  const summary = props['SUMMARY']
  if (!summary) return null

  const uid = props['UID'] ?? `${Date.now()}-${Math.random()}`
  const dtStart = icsDateToISO(props['DTSTART'] ?? '')
  const dtEnd = icsDateToISO(props['DTEND'] ?? '')
  const type = detectEventType(props)
  const location = props['LOCATION']
  const description = props['DESCRIPTION']

  const flightInfo = type === 'flight' ? extractFlightInfo(summary) : {}

  return {
    uid,
    summary,
    description: description ? description.replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined,
    location,
    dtStart,
    dtEnd,
    type,
    ...flightInfo,
  }
}

/**
 * Group ICS events by date range into Trip-compatible data.
 * Returns the detected date range (earliest start → latest end) and all events.
 */
export function groupEventsIntoTrip(events: ICSEvent[]): {
  startDate: string
  endDate: string
  destination: string
  events: ICSEvent[]
} | null {
  if (events.length === 0) return null

  const dates = events
    .flatMap((e) => [e.dtStart, e.dtEnd])
    .filter((d): d is string => !!d)
    .map((d) => d.slice(0, 10))
    .sort()

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  // Guess destination from location fields or flight arrivals
  const locations = events
    .map((e) => e.location ?? '')
    .filter(Boolean)
  const destination = locations[0] ?? events[0]?.summary ?? 'Imported Trip'

  return { startDate, endDate, destination, events }
}
