import { formatDate, formatDateRange, getTripDurationDays } from '@/utils/dates'
import { ACTIVITY_META } from '@/utils/activityIcons'
import type { Trip } from '@/types'

// Markdown control characters that must be neutralized in user-supplied text so a
// destination/title/note cannot inject headings, links, blockquotes, or emphasis
// into the exported document. Backslash is first so the escapes it introduces are
// not themselves re-escaped.
const MD_SPECIAL = /[\\`*_[\]()#>]/g

/**
 * Backslash-escapes markdown control characters in user-supplied text.
 *
 * @param text - Raw user text (destination, activity title, notes)
 * @returns Text safe to embed in the generated markdown
 */
function escapeMarkdown(text: string): string {
  return text.replace(MD_SPECIAL, (ch) => `\\${ch}`)
}

/**
 * Serializes an entire trip into a human-readable markdown itinerary:
 * a destination heading, a date-range/duration summary, then one section per
 * day listing each activity (time, title, type, notes) in chronological order.
 */
export function generateItineraryMarkdown(trip: Trip): string {
  const duration = getTripDurationDays(trip.startDate, trip.endDate)
  const lines: string[] = [
    `# ${escapeMarkdown(trip.destination)}`,
    '',
    `${formatDateRange(trip.startDate, trip.endDate)} · ${duration} ${duration === 1 ? 'day' : 'days'}`,
    '',
  ]

  trip.days.forEach((day, i) => {
    lines.push(`## Day ${i + 1} — ${formatDate(day.date)}`, '')

    if (day.activities.length === 0) {
      lines.push('_No activities planned._', '')
      return
    }

    // Chronological order by HH:mm start time (lexicographic matches chronological);
    // untimed activities ('' sentinel) sort first
    const sorted = [...day.activities].sort((a, b) =>
      (a.startTime ?? '').localeCompare(b.startTime ?? ''),
    )
    sorted.forEach((activity) => {
      const label = ACTIVITY_META[activity.type].label
      const time = activity.startTime ? `${activity.startTime} · ` : ''
      lines.push(`- **${time}${escapeMarkdown(activity.title)}** _(${label})_`)
      if (activity.notes) lines.push(`  ${escapeMarkdown(activity.notes)}`)
    })
    lines.push('')
  })

  return lines.join('\n')
}
