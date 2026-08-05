import { Trash2, MapPin, GripVertical } from 'lucide-react'
import type { Activity } from '@/types'
import { ACTIVITY_META } from '@/utils/activityIcons'
import { cn } from '@/lib/utils'

interface ActivityItemProps {
  activity: Activity
  /** Position of this activity within the day's activities array (drag source/target index) */
  index: number
  onDelete: () => void
  /** Called when the user taps the map pin button; only passed if the activity has coordinates */
  onFocus?: () => void
  /** Fired when a drag begins on this row, with its index */
  onDragStart?: (index: number) => void
  /** Fired as another dragged row enters this one, with this row's index */
  onDragEnter?: (index: number) => void
  /** Fired when a dragged row is dropped onto this one, with this row's index */
  onDrop?: (index: number) => void
  /** Fired when the drag gesture ends (dropped anywhere or cancelled) */
  onDragEnd?: () => void
  /** True while this row is the one being dragged (dimmed for feedback) */
  isDragging?: boolean
  /** True while a dragged row is hovering over this one (shows drop indicator) */
  isDragOver?: boolean
}

/**
 * Converts a 24-hour HH:mm time string to a 12-hour AM/PM display string.
 *
 * Returns an empty string for midnight ("00:00") which is used as the default
 * startTime placeholder when the user does not specify a time.
 *
 * @param time - Time string in HH:mm format
 * @returns Formatted time string, e.g. "9:30 AM", or "" for 00:00
 */
function formatTime(time: string): string {
  if (!time || time === '00:00') return ''
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  // Convert 0 to 12 for 12-hour display (0 % 12 === 0, so || 12 handles midnight/noon)
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Renders a single activity row in the day timeline.
 *
 * Displays a colored icon, activity title, time range, optional notes, and
 * action buttons. The map-pin button only appears when the activity has been
 * geocoded (has lat/lon), keeping the UI clean for un-geocoded activities like flights.
 *
 * @param activity - The activity to render
 * @param index - The activity's index within the day, used for drag reordering
 * @param onDelete - Callback to remove this activity from the day
 * @param onFocus - Optional callback to focus the activity marker on the map
 */
export default function ActivityItem({
  activity,
  index,
  onDelete,
  onFocus,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}: ActivityItemProps) {
  const meta = ACTIVITY_META[activity.type]
  const Icon = meta.icon

  const startFormatted = formatTime(activity.startTime)
  const endFormatted = activity.endTime ? formatTime(activity.endTime) : ''
  const hasCoords = activity.lat != null && activity.lon != null

  // ── Touch drag support ──
  // The HTML5 drag-and-drop API (draggable / dragstart / drop) is not implemented
  // by iOS Safari or Android Chrome, so on touch devices reordering is driven by
  // raw touch events on the grip handle instead. Rows are located by hit-testing
  // the touch point against the data-activity-index attribute below.

  /**
   * Resolves the activity row underneath a viewport coordinate.
   *
   * @param x - Client X coordinate of the touch point
   * @param y - Client Y coordinate of the touch point
   * @returns The row's index, or null if the point is not over a row
   */
  function indexFromPoint(x: number, y: number): number | null {
    const row = document.elementFromPoint(x, y)?.closest('[data-activity-index]')
    if (!row) return null
    const parsed = Number(row.getAttribute('data-activity-index'))
    return Number.isNaN(parsed) ? null : parsed
  }

  /** Begins a touch drag from this row's handle */
  function handleTouchStart() {
    onDragStart?.(index)
  }

  /** Tracks which row the finger is currently over so the drop indicator follows it */
  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    const target = indexFromPoint(touch.clientX, touch.clientY)
    if (target !== null) onDragEnter?.(target)
  }

  /** Drops onto whichever row the finger was released over, or cancels the drag */
  function handleTouchEnd(e: React.TouchEvent) {
    const touch = e.changedTouches[0]
    const target = touch ? indexFromPoint(touch.clientX, touch.clientY) : null
    if (target !== null) onDrop?.(target)
    else onDragEnd?.()
  }

  return (
    <div
      className={cn(
        'group relative flex gap-3 items-start transition-opacity',
        isDragging && 'opacity-40',
      )}
      // Hit-test target for touch reordering (see indexFromPoint above)
      data-activity-index={index}
      draggable
      onDragStart={() => onDragStart?.(index)}
      onDragEnter={() => onDragEnter?.(index)}
      // preventDefault on dragover is required for the drop event to fire
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop?.(index)
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      {/* Drop indicator — a bar above the row the dragged item would land on */}
      {isDragOver && !isDragging && (
        <div className="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-accent z-20" />
      )}

      {/* Drag handle — sits in the timeline's left padding.
          Always visible on touch screens (there is no hover to reveal it) and
          revealed on hover from sm: up. `touch-none` suppresses page scrolling
          for gestures that start here, which is what makes the touch drag work. */}
      <div
        className="absolute -left-4 top-2 w-8 h-8 flex items-center justify-center touch-none opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-white/40 hover:text-white/70"
        role="button"
        tabIndex={-1}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => onDragEnd?.()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Icon circle */}
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/[0.08]', meta.bg)}>
        <Icon className={cn('w-5 h-5', meta.color)} />
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 glass-inner rounded-2xl px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={cn('text-[10px] font-bold uppercase tracking-widest', meta.color)}>
              {meta.label}
            </span>
            <p className="font-semibold text-white text-sm mt-0.5 truncate">{activity.title}</p>

            {startFormatted && (
              <p className="text-xs text-white/35 mt-0.5">
                {startFormatted}
                {endFormatted ? ` → ${endFormatted}` : ''}
              </p>
            )}

            {activity.notes && (
              <p className="text-xs text-white/40 mt-1.5 leading-relaxed line-clamp-2">{activity.notes}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Map pin — only if geocoded coordinates exist */}
            {hasCoords && onFocus && (
              <button
                onClick={onFocus}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-accent hover:bg-accent/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Show on map"
                title="Show on map"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete — always visible on mobile, hover on desktop */}
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Delete activity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
