import { useRef, useEffect } from 'react'
import type { DayPlan } from '@/types'
import { getDayLabel, formatDate } from '@/utils/dates'
import { cn } from '@/lib/utils'

interface DayTabsProps {
  days: DayPlan[]
  selectedDayId: string
  onSelect: (id: string) => void
}

export default function DayTabs({ days, selectedDayId, onSelect }: DayTabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)

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
