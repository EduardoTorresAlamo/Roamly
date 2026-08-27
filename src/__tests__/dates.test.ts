import { describe, it, expect } from 'vitest'
import {
  generateDayPlans,
  getTodayISO,
  formatDate,
  formatDateRange,
  getDayLabel,
  getTripDurationDays,
  MAX_TRIP_DAYS,
} from '@/utils/dates'

describe('generateDayPlans', () => {
  it('creates one DayPlan per calendar day, inclusive of both endpoints', () => {
    const days = generateDayPlans('2024-10-12', '2024-10-15')
    expect(days.map((d) => d.date)).toEqual([
      '2024-10-12',
      '2024-10-13',
      '2024-10-14',
      '2024-10-15',
    ])
  })

  it('clamps an absurd range at MAX_TRIP_DAYS instead of hanging the tab', () => {
    // A typo'd or hand-edited far-future end date would otherwise allocate
    // millions of DayPlans synchronously.
    const days = generateDayPlans('2024-10-12', '9999-12-31')
    expect(days).toHaveLength(MAX_TRIP_DAYS)
    expect(days[0].date).toBe('2024-10-12')
  })

  it('returns a single day when start equals end', () => {
    const days = generateDayPlans('2024-10-12', '2024-10-12')
    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('2024-10-12')
  })

  it('gives every generated day a unique id and empty activities array', () => {
    const days = generateDayPlans('2024-10-12', '2024-10-14')
    const ids = new Set(days.map((d) => d.id))
    expect(ids.size).toBe(days.length)
    expect(days.every((d) => Array.isArray(d.activities) && d.activities.length === 0)).toBe(true)
  })

  it('crosses month boundaries without skipping or duplicating days', () => {
    const days = generateDayPlans('2024-01-30', '2024-02-02')
    expect(days.map((d) => d.date)).toEqual([
      '2024-01-30',
      '2024-01-31',
      '2024-02-01',
      '2024-02-02',
    ])
  })

  it('handles a leap-day range', () => {
    const days = generateDayPlans('2024-02-28', '2024-03-01')
    expect(days.map((d) => d.date)).toEqual(['2024-02-28', '2024-02-29', '2024-03-01'])
  })

  it('returns an empty array when end precedes start', () => {
    expect(generateDayPlans('2024-10-15', '2024-10-12')).toEqual([])
  })

  it('returns an empty array for unparseable input', () => {
    expect(generateDayPlans('not-a-date', 'also-bad')).toEqual([])
  })
})

describe('getTodayISO', () => {
  it('returns a well-formed YYYY-MM-DD string matching the local date', () => {
    const iso = getTodayISO()
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
    expect(iso).toBe(expected)
  })
})

describe('formatDate', () => {
  it('formats an ISO date as a short month/day label in UTC', () => {
    expect(formatDate('2024-10-12')).toBe('Oct 12')
  })

  it('does not shift the day regardless of the surrounding timezone', () => {
    // A UTC-anchored parse keeps Jan 1 as "Jan 1" rather than slipping to Dec 31.
    expect(formatDate('2024-01-01')).toBe('Jan 1')
  })

  it('returns an empty string for an empty input instead of throwing', () => {
    expect(formatDate('')).toBe('')
  })

  it('echoes an unparseable date rather than throwing RangeError', () => {
    // Intl.DateTimeFormat.format() throws on an Invalid Date; corrupted
    // localStorage must degrade to raw text, not crash the render tree.
    expect(formatDate('not-a-date')).toBe('not-a-date')
    // Truncated entry: no day component, so parseISODate yields Invalid Date.
    expect(formatDate('2024-10')).toBe('2024-10')
  })
})

describe('formatDateRange', () => {
  it('joins the start and end labels with a dash', () => {
    expect(formatDateRange('2024-10-12', '2024-10-18')).toBe('Oct 12 - Oct 18')
  })
})

describe('getDayLabel', () => {
  it('is 1-indexed', () => {
    expect(getDayLabel(0)).toBe('Day 1')
    expect(getDayLabel(4)).toBe('Day 5')
  })
})

describe('getTripDurationDays', () => {
  it('counts both endpoints (a one-night stay is 1 day)', () => {
    expect(getTripDurationDays('2024-10-12', '2024-10-12')).toBe(1)
  })

  it('returns the inclusive number of days for a multi-day range', () => {
    expect(getTripDurationDays('2024-10-12', '2024-10-18')).toBe(7)
  })

  it('is unaffected by a DST transition inside the range', () => {
    // US DST began 2024-03-10; a naive local-time diff would drop an hour and
    // round down. UTC anchoring keeps the count exact.
    expect(getTripDurationDays('2024-03-09', '2024-03-11')).toBe(3)
  })

  it('crosses a month boundary correctly', () => {
    expect(getTripDurationDays('2024-01-30', '2024-02-02')).toBe(4)
  })
})
