import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, ChevronLeft, CalendarDays, Map, ChevronUp, Download, Check } from 'lucide-react'
import { useTrips } from '@/hooks/useTrips'
import { formatDate, formatDateRange, getTripDurationDays } from '@/utils/dates'
import { ACTIVITY_META } from '@/utils/activityIcons'
import { useMapContext } from '@/hooks/useMapContext'
import DayTabs from '@/components/trip/DayTabs'
import ActivityTimeline from '@/components/trip/ActivityTimeline'
import AddActivityModal from '@/components/modals/AddActivityModal'
import ConfirmDialog from '@/components/modals/ConfirmDialog'
import type { Activity, Trip } from '@/types'
import { cn } from '@/lib/utils'

/**
 * Serializes an entire trip into a human-readable markdown itinerary.
 *
 * Produces a top-level heading with the destination, a summary line with the
 * date range and duration, then a section per day listing each activity with its
 * time, title, type, and notes. Activities are ordered chronologically by start time.
 *
 * @param trip - The trip to serialize
 * @returns A markdown string representing the full itinerary
 */
function generateItineraryMarkdown(trip: Trip): string {
  const duration = getTripDurationDays(trip.startDate, trip.endDate)
  const lines: string[] = [
    `# ${trip.destination}`,
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

    // Chronological order by HH:mm start time (lexicographic matches chronological)
    const sorted = [...day.activities].sort((a, b) => a.startTime.localeCompare(b.startTime))
    sorted.forEach((activity) => {
      const label = ACTIVITY_META[activity.type].label
      const time =
        activity.startTime && activity.startTime !== '00:00' ? `${activity.startTime} · ` : ''
      lines.push(`- **${time}${activity.title}** _(${label})_`)
      if (activity.notes) lines.push(`  ${activity.notes}`)
    })
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Trip detail page displaying the day-by-day itinerary and the interactive map.
 *
 * The page has two visual modes toggled by the Map button:
 *   Normal mode: hero image strip (32% height) + scrollable content panel below
 *   Map mode: content panel collapses to a 48vh bottom sheet; the Leaflet map
 *             fills the rest of the screen so activity markers are clearly visible
 *
 * Map synchronization:
 *   - On page load, the map flies to the trip destination coordinates
 *   - Each time the selected day tab changes, the marker layer is replaced with
 *     only the geocoded activities for that day
 *   - Tapping a marker focuses it, expands the map, and fetches nearby POIs
 */
export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>()
  const { getTripById, addActivity, deleteActivity, moveActivity } = useTrips()
  const { setMarkers, flyTo, clearFocus, mapExpanded, setMapExpanded } = useMapContext()
  const trip = getTripById(tripId ?? '')

  // Default to day 1 on initial render; lazy initializer avoids an extra render cycle
  const [selectedDayId, setSelectedDayId] = useState<string>(() => trip?.days[0]?.id ?? '')
  const [addModalOpen, setAddModalOpen] = useState(false)
  // Brief confirmation shown after the itinerary is copied to the clipboard
  const [copied, setCopied] = useState(false)
  // Id of the activity awaiting delete confirmation, or null when no prompt is open
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Auto-dismiss the "Itinerary copied!" toast after 2 seconds
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  // Center the map on this trip's destination whenever the tripId route param changes.
  // clearFocus() dismisses any NearbyPanel left over from a previously viewed trip.
  // The empty-ish dep array (only tripId) intentionally avoids re-running when flyTo
  // or clearFocus references change -- this effect is "run when navigation changes".
  useEffect(() => {
    if (trip?.lat && trip?.lon) {
      flyTo(trip.lat, trip.lon, 12)
    }
    clearFocus()
    setMapExpanded(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  // Resolve the selected day object; fall back to day 0 if selectedDayId is stale
  const selectedDay = trip?.days.find((d) => d.id === selectedDayId) ?? trip?.days[0]

  // Sync map markers to the currently selected day's geocoded activities.
  // Only activities with coordinates become map pins -- un-geocoded entries are excluded.
  useEffect(() => {
    if (!selectedDay) return
    const geoActivities = selectedDay.activities.filter((a) => a.lat != null && a.lon != null)
    setMarkers(
      geoActivities.map((a) => ({
        id: a.id,
        lat: a.lat!,
        lon: a.lon!,
        type: a.type,
        title: a.title,
      }))
    )
  }, [selectedDay, setMarkers])

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-white/30 text-lg font-medium mb-4">Trip not found</p>
        <Link to="/" className="text-brand-400 text-sm font-semibold hover:text-brand-300 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Back to Trips
        </Link>
      </div>
    )
  }

  const duration = getTripDurationDays(trip.startDate, trip.endDate)
  // Activity targeted by the confirmation dialog; drives its title/description text
  const pendingActivity = selectedDay?.activities.find((a) => a.id === pendingDeleteId) ?? null

  /**
   * Adds a new activity to the currently selected day.
   * The activity arrives from AddActivityModal already geocoded when possible.
   */
  function handleAddActivity(activity: Omit<Activity, 'id'>) {
    if (!selectedDay) return
    addActivity(trip!.id, selectedDay.id, activity)
  }

  /**
   * Removes the confirmed activity from the currently selected day.
   * Called only after the user accepts the confirmation dialog -- deletion is
   * permanent, since activities live only in localStorage with no undo history.
   */
  function handleConfirmDeleteActivity() {
    if (selectedDay && pendingDeleteId) {
      deleteActivity(trip!.id, selectedDay.id, pendingDeleteId)
    }
    setPendingDeleteId(null)
  }

  /**
   * Reorders an activity within the currently selected day via drag-and-drop.
   */
  function handleMoveActivity(fromIndex: number, toIndex: number) {
    if (!selectedDay) return
    moveActivity(trip!.id, selectedDay.id, fromIndex, toIndex)
  }

  /**
   * Serializes the trip to markdown, copies it to the clipboard, and shows a
   * brief confirmation toast.
   */
  async function handleExport() {
    try {
      await navigator.clipboard.writeText(generateItineraryMarkdown(trip!))
      setCopied(true)
    } catch {
      // Clipboard access can fail (e.g. denied permission or insecure context);
      // fail silently rather than crashing the page.
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Hero / map reveal area ──
          Normal mode : compact image strip (32% height)
          Map mode    : expands to full height, no cover image (map shows through)
      */}
      <div
        className="relative flex-shrink-0 transition-[height,min-height,max-height] duration-[400ms] ease-out"
        style={
          mapExpanded
            ? { height: '100%', minHeight: 0, maxHeight: 'none' }
            : { height: '32%', minHeight: 160, maxHeight: 260 }
        }
      >
        {/* Cover image — hidden in map mode so the background map shows through */}
        {trip.coverImage && !mapExpanded && (
          <>
            <img
              src={trip.coverImage}
              alt={trip.destination}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-night-900/60" />
          </>
        )}

        {/* Back button */}
        <Link
          to="/"
          className="absolute top-4 left-4 flex items-center gap-1.5 glass-panel rounded-full px-3 py-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors z-10"
        >
          <ChevronLeft className="w-4 h-4" />
          Trips
        </Link>

        {/* Photo attribution (normal mode only) */}
        {trip.coverImageAttribution && !mapExpanded && (
          <span className="absolute bottom-2 right-3 text-[9px] text-white/25">
            Photo: {trip.coverImageAttribution} / Unsplash
          </span>
        )}

        {/* Map mode: show activity count pill so user knows markers are on the map */}
        {mapExpanded && (
          <div className="absolute bottom-[calc(48vh+12px)] left-1/2 -translate-x-1/2 flex items-center gap-2 glass-panel rounded-full px-3 py-1.5 pointer-events-none">
            <Map className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-white/70 font-medium">
              {selectedDay?.activities.filter(a => a.lat).length ?? 0} locations on map
            </span>
          </div>
        )}
      </div>

      {/* ── Content panel ──
          Normal mode : flex-1, overlaps the hero by 24px (-mt-6)
          Map mode    : fixed bottom sheet, 48vh tall, z-30
      */}
      <div
        className={cn(
          'glass-panel rounded-t-3xl flex flex-col overflow-hidden transition-all duration-300',
          mapExpanded
            ? 'fixed bottom-0 left-0 right-0 z-30'
            : 'flex-1 -mt-6 relative z-10',
        )}
        style={{ height: mapExpanded ? '48vh' : undefined }}
      >
        {/* Trip title row */}
        <div className="px-5 pt-4 pb-1 flex-shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight truncate">{trip.destination}</h1>
            <div className="flex items-center gap-2 mt-1">
              <CalendarDays className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              <span className="text-white/50 text-xs">
                {formatDateRange(trip.startDate, trip.endDate)} · {duration} {duration === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {/* Export itinerary as markdown */}
            <button
              onClick={handleExport}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                copied
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'border-white/[0.12] text-white/40 hover:text-white hover:border-white/25',
              )}
            >
              {copied
                ? <><Check className="w-3.5 h-3.5" /><span>Copied</span></>
                : <><Download className="w-3.5 h-3.5" /><span>Export</span></>
              }
            </button>

            {/* Map toggle button */}
            <button
              onClick={() => setMapExpanded(!mapExpanded)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                mapExpanded
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'border-white/[0.12] text-white/40 hover:text-white hover:border-white/25',
              )}
            >
              {mapExpanded
                ? <><ChevronUp className="w-3.5 h-3.5" /><span>Collapse</span></>
                : <><Map className="w-3.5 h-3.5" /><span>Map</span></>
              }
            </button>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex-shrink-0 px-4 pt-3 pb-3">
          <DayTabs
            days={trip.days}
            selectedDayId={selectedDay?.id ?? ''}
            onSelect={setSelectedDayId}
          />
        </div>

        {/* Activity timeline */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-28 min-h-0">
          {selectedDay && (
            <ActivityTimeline
              day={selectedDay}
              onDeleteActivity={setPendingDeleteId}
              onMoveActivity={handleMoveActivity}
            />
          )}
        </div>
      </div>

      {/* ── Floating orange FAB ── */}
      <button
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-7 right-7 w-16 h-16 rounded-full fab-orange flex items-center justify-center text-white z-50 active:scale-90 transition-transform"
        aria-label="Add activity"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* ── "Itinerary copied!" toast ── */}
      <div
        className={cn(
          'fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 glass-panel rounded-full px-4 py-2 text-sm font-medium text-white transition-all duration-300',
          copied ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
        )}
        role="status"
        aria-live="polite"
      >
        <Check className="w-4 h-4 text-accent" />
        Itinerary copied!
      </div>

      <AddActivityModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddActivity}
        tripDestination={trip.destination}
      />

      <ConfirmDialog
        open={pendingActivity !== null}
        title="Delete this activity?"
        description={
          pendingActivity
            ? `"${pendingActivity.title}" will be permanently removed from this day. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete activity"
        onConfirm={handleConfirmDeleteActivity}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
