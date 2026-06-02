import { useRef, useEffect } from 'react'
import type { DayPlan } from '@/types'
import { getDayLabel, formatDate } from '@/utils/dates'
import { cn } from '@/lib/utils'

interface DayTabsProps {
  days: DayPlan[]
  selectedDayId: string
  onSelect: (id: string) => void
}

/**
 * Horizontal scrollable tab strip for switching between days in a trip itinerary.
 *
 * Each tab shows a day label ("Day 1") and its calendar date. The active tab
 * is scrolled into view automatically using a ref, so that navigating via
 * keyboard or programmatic selection on long trips keeps the active day visible.
 *
 * @param days - Ordered array of day plans for the trip
 * @param selectedDayId - Id of the currently active day
 * @param onSelect - Callback invoked with the day id when a tab is clicked
 */
export default function DayTabs({ days, selectedDayId, onSelect }: DayTabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)

  // Scroll the active tab into the horizontal center of the strip whenever selection changes.
  // This ensures the selected day is always visible even on trips with many days.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDayId])

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4"
      style={{ overscrollBehavior: 'contain' }}
    >
      {days.map((day, index) => {
        const isActive = day.id === selectedDayId
        return (
          <button
            key={day.id}
            ref={isActive ? activeRef : null}
            onClick={() => onSelect(day.id)}
            className={cn(
              'flex-none h-11 px-4 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.95] border',
              isActive
                ? 'bg-accent text-white border-accent/50 shadow-md'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border-white/8',
            )}
          >
            <span className="font-semibold">{getDayLabel(index)}</span>
            <span className={cn('ml-1.5 text-xs', isActive ? 'text-white/75' : 'text-white/30')}>
              {formatDate(day.date)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
