import type { DayPlan } from '@/types'
import { generateId } from './id'

/**
 * Generate a DayPlan for every calendar day from startDate to endDate inclusive.
 * Uses 'T00:00:00' suffix to avoid UTC timezone offset bugs.
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

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** "Oct 12" */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

/** "Oct 12 – Oct 18" */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

/** "Day 1" */
export function getDayLabel(index: number): string {
  return `Day ${index + 1}`
}

/** "Day 1 · Oct 12" */
export function getDayTabLabel(index: number, date: string): string {
  return `Day ${index + 1} · ${formatDate(date)}`
}

export function getTripDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
