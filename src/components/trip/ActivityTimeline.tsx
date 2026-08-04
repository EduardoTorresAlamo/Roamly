import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { DayPlan } from '@/types'
import ActivityItem from './ActivityItem'
import { useMapContext } from '@/context/MapContext'

interface ActivityTimelineProps {
  day: DayPlan
  onDeleteActivity: (activityId: string) => void
  /** Reorders an activity within this day from one index to another (drag-and-drop) */
  onMoveActivity: (fromIndex: number, toIndex: number) => void
}

/**
 * Renders all activities for a single day as a vertical, drag-reorderable timeline.
 *
 * Activities render in their stored array order so manual drag-and-drop reordering is
 * reflected immediately. Native HTML5 drag events track the dragged and hovered rows;
 * on drop, onMoveActivity is invoked to persist the new order in TripContext. The
 * visual timeline line is an absolutely positioned 1px vertical bar aligned to the
 * left icon column.
 *
 * @param day - The DayPlan whose activities should be displayed
 * @param onDeleteActivity - Callback invoked with an activity id when its delete button is pressed
 * @param onMoveActivity - Callback invoked with (fromIndex, toIndex) when a row is dropped
 */
export default function ActivityTimeline({ day, onDeleteActivity, onMoveActivity }: ActivityTimelineProps) {
  const { focusMarker } = useMapContext()
  // Index of the row currently being dragged, or null when no drag is in progress
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Index of the row currently hovered as a drop target (drives the drop indicator)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  /** Resets drag state once a drag gesture completes or is cancelled */
  function resetDrag() {
    setDragIndex(null)
    setOverIndex(null)
  }

  /** Persists the reorder when a row is dropped onto another */
  function handleDrop(toIndex: number) {
    if (dragIndex !== null && dragIndex !== toIndex) {
      onMoveActivity(dragIndex, toIndex)
    }
    resetDrag()
  }

  if (day.activities.length === 0) {
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
        {day.activities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            index={index}
            onDelete={() => onDeleteActivity(activity.id)}
            onDragStart={setDragIndex}
            onDragEnter={setOverIndex}
            onDrop={handleDrop}
            onDragEnd={resetDrag}
            isDragging={dragIndex === index}
            isDragOver={overIndex === index}
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
