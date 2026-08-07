import { describe, it, expect } from 'vitest'
import { parseICS, groupEventsIntoTrip } from '@/utils/icsParser'

// Builds an ICS file body from raw lines with CRLF endings (the RFC 5545 default).
function ics(lines: string[]): string {
  return lines.join('\r\n')
}

const flightEvent = ics([
  'BEGIN:VCALENDAR',
  'X-WR-CALNAME:My Trip',
  'BEGIN:VEVENT',
  'UID:evt-1',
  'SUMMARY:Flight UA 123 to Tokyo',
  'DTSTART:20241012T083000Z',
  'DTEND:20241012T220000Z',
  'LOCATION:Narita Airport',
  'END:VEVENT',
  'END:VCALENDAR',
])

describe('parseICS', () => {
  it('extracts the calendar name and a single event', () => {
    const { events, calendarName } = parseICS(flightEvent)
    expect(calendarName).toBe('My Trip')
    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('evt-1')
    expect(events[0].summary).toBe('Flight UA 123 to Tokyo')
    expect(events[0].location).toBe('Narita Airport')
  })

  it('converts UTC datetimes to ISO strings, stripping the Z suffix', () => {
    const { events } = parseICS(flightEvent)
    expect(events[0].dtStart).toBe('2024-10-12T08:30:00')
    expect(events[0].dtEnd).toBe('2024-10-12T22:00:00')
  })

  it('converts date-only values to YYYY-MM-DD', () => {
    const { events } = parseICS(
      ics([
        'BEGIN:VEVENT',
        'UID:allday',
        'SUMMARY:Museum day',
        'DTSTART:20241013',
        'END:VEVENT',
      ]),
    )
    expect(events[0].dtStart).toBe('2024-10-13')
  })

  it('strips property parameters like TZID from the key', () => {
    const { events } = parseICS(
      ics([
        'BEGIN:VEVENT',
        'UID:tz',
        'SUMMARY:Local event',
        'DTSTART;TZID=America/New_York:20241012T090000',
        'END:VEVENT',
      ]),
    )
    expect(events[0].dtStart).toBe('2024-10-12T09:00:00')
  })

  it('unfolds RFC 5545 line folding (continuation lines start with a space/tab)', () => {
    const { events } = parseICS(
      ics([
        'BEGIN:VEVENT',
        'UID:folded',
        // The trailing space is real content; the leading space on the next line
        // is the RFC 5545 fold marker and must be removed on unfold.
        'SUMMARY:A very long summary that has been ',
        ' folded across two physical lines',
        'END:VEVENT',
      ]),
    )
    expect(events[0].summary).toBe('A very long summary that has been folded across two physical lines')
  })

  it('handles bare LF line endings as well as CRLF', () => {
    const raw = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:lf',
      'SUMMARY:LF event',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n')
    const { events } = parseICS(raw)
    expect(events).toHaveLength(1)
    expect(events[0].summary).toBe('LF event')
  })

  it('decodes escaped text in DESCRIPTION', () => {
    const { events } = parseICS(
      ics([
        'BEGIN:VEVENT',
        'UID:esc',
        'SUMMARY:Notes',
        'DESCRIPTION:Line one\\nLine two\\, still line two',
        'END:VEVENT',
      ]),
    )
    expect(events[0].description).toBe('Line one\nLine two, still line two')
  })

  it('skips events that lack a SUMMARY', () => {
    const { events } = parseICS(
      ics(['BEGIN:VEVENT', 'UID:nosummary', 'DTSTART:20241012', 'END:VEVENT']),
    )
    expect(events).toHaveLength(0)
  })

  it('detects flight events and extracts airline + flight number', () => {
    const { events } = parseICS(flightEvent)
    expect(events[0].type).toBe('flight')
    expect(events[0].airline).toBe('UA')
    expect(events[0].flightNumber).toBe('UA 123')
  })

  it('detects hotel events via keywords', () => {
    const { events } = parseICS(
      ics([
        'BEGIN:VEVENT',
        'UID:hotel',
        'SUMMARY:Hotel check-in at Park Hyatt',
        'DTSTART:20241012',
        'END:VEVENT',
      ]),
    )
    expect(events[0].type).toBe('hotel')
  })

  it('falls back to "other" for unrecognized events and skips flight extraction', () => {
    const { events } = parseICS(
      ics(['BEGIN:VEVENT', 'UID:misc', 'SUMMARY:Dinner reservation', 'END:VEVENT']),
    )
    expect(events[0].type).toBe('other')
    expect(events[0].airline).toBeUndefined()
    expect(events[0].flightNumber).toBeUndefined()
  })

  it('parses multiple events in one calendar', () => {
    const { events } = parseICS(
      ics([
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:a',
        'SUMMARY:First',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:b',
        'SUMMARY:Second',
        'END:VEVENT',
        'END:VCALENDAR',
      ]),
    )
    expect(events.map((e) => e.uid)).toEqual(['a', 'b'])
  })
})

describe('groupEventsIntoTrip', () => {
  it('returns null for an empty event list', () => {
    expect(groupEventsIntoTrip([])).toBeNull()
  })

  it('spans the full date range and picks the first location as destination', () => {
    const { events } = parseICS(
      ics([
        'BEGIN:VEVENT',
        'UID:1',
        'SUMMARY:Arrive',
        'DTSTART:20241012',
        'DTEND:20241012',
        'LOCATION:Tokyo',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:2',
        'SUMMARY:Depart',
        'DTSTART:20241018',
        'DTEND:20241018',
        'END:VEVENT',
      ]),
    )
    const trip = groupEventsIntoTrip(events)
    expect(trip).not.toBeNull()
    expect(trip!.startDate).toBe('2024-10-12')
    expect(trip!.endDate).toBe('2024-10-18')
    expect(trip!.destination).toBe('Tokyo')
    expect(trip!.events).toHaveLength(2)
  })

  it('falls back to the first summary when no event has a location', () => {
    const events = parseICS(
      ics(['BEGIN:VEVENT', 'UID:1', 'SUMMARY:Mystery Trip', 'DTSTART:20241012', 'END:VEVENT']),
    ).events
    const trip = groupEventsIntoTrip(events)
    expect(trip!.destination).toBe('Mystery Trip')
  })
})
