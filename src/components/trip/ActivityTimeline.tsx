import { Sparkles } from 'lucide-react'
import type { DayPlan } from '@/types'
import ActivityItem from './ActivityItem'
import { useMapContext } from '@/context/MapContext'

interface ActivityTimelineProps {
  day: DayPlan
  onDeleteActivity: (activityId: string) => void
}

/**
 * Renders all activities for a single day as a vertical timeline.
 *
 * Activities are sorted by startTime (HH:mm string comparison works correctly for
 * ISO-format time strings) so they appear in chronological order regardless of the
 * order they were added. The visual timeline line is an absolutely positioned
 * 1px vertical bar aligned to the left icon column.
 *
 * @param day - The DayPlan whose activities should be displayed
 * @param onDeleteActivity - Callback invoked with an activity id when its delete button is pressed
 */
export default function ActivityTimeline({ day, onDeleteActivity }: ActivityTimelineProps) {
  const { focusMarker } = useMapContext()
  // Sort by startTime string -- HH:mm lexicographic order matches chronological order
  const sorted = [...day.activities].sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/[0.08] flex items-center justify-center mb-3">
          <Sparkles className="w-7 h-7 text-white/20" />
        </div>
        <p className="text-white/30 font-medium text-sm">Nothing planned yet</p>
        <p className="text-white/20 text-xs mt-1">Tap + to add an activity</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Decorative vertical line connecting activity items in the timeline */}
      <div className="absolute left-5 top-5 bottom-5 w-px bg-white/[0.08] z-0" />
      <div className="relative z-10 space-y-3">
        {sorted.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onDelete={() => onDeleteActivity(activity.id)}
            // Only pass onFocus when the activity has been geocoded;
            // omitting it hides the map-pin button for un-geocoded entries
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
