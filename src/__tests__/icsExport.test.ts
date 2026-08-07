import { describe, it, expect } from 'vitest'
import { generateTripICS, icsFilename } from '@/utils/icsExport'
import { parseICS } from '@/utils/icsParser'
import type { Trip } from '@/types'

/** Minimal trip fixture: two days, three activities, one of them untimed. */
const trip: Trip = {
  id: 'trip-1',
  destination: 'Kyoto, Japan',
  startDate: '2024-10-12',
  endDate: '2024-10-13',
  days: [
    {
      id: 'day-1',
      date: '2024-10-12',
      activities: [
        {
          id: 'a2',
          type: 'dining',
          title: 'Dinner at Gion',
          startTime: '19:30',
          notes: 'Reservation; table for 2',
        },
        {
          id: 'a1',
          type: 'activity',
          title: 'Fushimi Inari',
          startTime: '09:00',
          endTime: '11:30',
          address: 'Fushimi Inari Taisha, Kyoto',
        },
      ],
    },
    {
      id: 'day-2',
      date: '2024-10-13',
      activities: [
        // "00:00" is the placeholder the add form uses when no time is entered
        { id: 'a3', type: 'lodging', title: 'Check out', startTime: '00:00' },
      ],
    },
  ],
}

describe('generateTripICS', () => {
  const ics = generateTripICS(trip)

  it('wraps events in a valid VCALENDAR envelope with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    // No bare LF: every break must be CRLF
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('emits one trip-spanning event plus one event per activity', () => {
    const count = (ics.match(/BEGIN:VEVENT/g) ?? []).length
    expect(count).toBe(4)
  })

  it('makes the all-day trip event span through the last day (exclusive DTEND)', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20241012')
    expect(ics).toContain('DTEND;VALUE=DATE:20241014')
  })

  it('emits timed activities as floating local date-times', () => {
    expect(ics).toContain('DTSTART:20241012T090000')
    expect(ics).toContain('DTEND:20241012T113000')
    // Floating, not UTC -- no trailing Z on activity times
    expect(ics).not.toMatch(/DTSTART:\d{8}T\d{6}Z/)
  })

  it('defaults a missing end time to one hour after the start', () => {
    expect(ics).toContain('DTSTART:20241012T193000')
    expect(ics).toContain('DTEND:20241012T203000')
  })

  it('emits untimed activities as all-day events on their own day', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20241013')
    expect(ics).toContain('DTEND;VALUE=DATE:20241014')
  })

  it('escapes commas, semicolons, and newlines in text values', () => {
    expect(ics).toContain('SUMMARY:Trip: Kyoto\\, Japan')
    expect(ics).toContain('Reservation\\; table for 2')
  })

  it('folds content lines to 75 octets', () => {
    const longTrip: Trip = {
      ...trip,
      destination: 'A'.repeat(200),
    }
    const lines = generateTripICS(longTrip).split('\r\n')
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('round-trips through the app\'s own ICS parser', () => {
    const parsed = parseICS(ics)
    expect(parsed.calendarName).toBe('Kyoto\\, Japan')
    const summaries = parsed.events.map((e) => e.summary)
    expect(summaries).toContain('Fushimi Inari')
    expect(summaries).toContain('Dinner at Gion')
    expect(parsed.events).toHaveLength(4)
  })
})

describe('icsFilename', () => {
  it('slugifies the destination and appends the start date', () => {
    expect(icsFilename(trip)).toBe('kyoto-japan-2024-10-12.ics')
  })

  it('falls back to "trip" when the destination has no alphanumerics', () => {
    expect(icsFilename({ ...trip, destination: '···' })).toBe('trip-2024-10-12.ics')
  })
})
