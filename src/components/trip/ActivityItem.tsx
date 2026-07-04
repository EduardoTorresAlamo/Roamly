import { Trash2, MapPin } from 'lucide-react'
import type { Activity } from '@/types'
import { ACTIVITY_META } from '@/utils/activityIcons'
import { cn } from '@/lib/utils'

interface ActivityItemProps {
  activity: Activity
  onDelete: () => void
  /** Called when the user taps the map pin button; only passed if the activity has coordinates */
  onFocus?: () => void
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
 * @param onDelete - Callback to remove this activity from the day
 * @param onFocus - Optional callback to focus the activity marker on the map
 */
export default function ActivityItem({ activity, onDelete, onFocus }: ActivityItemProps) {
  const meta = ACTIVITY_META[activity.type]
  const Icon = meta.icon

  const startFormatted = formatTime(activity.startTime)
  const endFormatted = activity.endTime ? formatTime(activity.endTime) : ''
  const hasCoords = activity.lat != null && activity.lon != null

  return (
    <div className="group flex gap-3 items-start">
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
