import { Sparkles } from 'lucide-react'
import type { DayPlan } from '@/types'
import ActivityItem from './ActivityItem'
import { useMapContext } from '@/context/MapContext'

interface ActivityTimelineProps {
  day: DayPlan
  onDeleteActivity: (activityId: string) => void
}

export default function ActivityTimeline({ day, onDeleteActivity }: ActivityTimelineProps) {
  const { focusMarker } = useMapContext()
  const sorted = [...day.activities].sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/8 flex items-center justify-center mb-3">
          <Sparkles className="w-7 h-7 text-white/20" />
        </div>
        <p className="text-white/30 font-medium text-sm">Nothing planned yet</p>
        <p className="text-white/20 text-xs mt-1">Tap + to add an activity</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-5 bottom-5 w-px bg-white/8 z-0" />
      <div className="relative z-10 space-y-3">
        {sorted.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onDelete={() => onDeleteActivity(activity.id)}
            onFocus={
              activity.lat != null && activity.lon != null
                ? () => focusMarker(activity.id, activity.lat!, activity.lon!)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
