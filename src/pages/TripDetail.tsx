import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, ChevronLeft, CalendarDays, Map, ChevronUp } from 'lucide-react'
import { useTrips } from '@/hooks/useTrips'
import { formatDateRange, getTripDurationDays } from '@/utils/dates'
import { useMapContext } from '@/context/MapContext'
import DayTabs from '@/components/trip/DayTabs'
import ActivityTimeline from '@/components/trip/ActivityTimeline'
import AddActivityModal from '@/components/modals/AddActivityModal'
import type { Activity } from '@/types'
import { cn } from '@/lib/utils'

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>()
  const { getTripById, addActivity, deleteActivity } = useTrips()
  const { setMarkers, flyTo, clearFocus, mapExpanded, setMapExpanded } = useMapContext()
  const trip = getTripById(tripId ?? '')

  const [selectedDayId, setSelectedDayId] = useState<string>(() => trip?.days[0]?.id ?? '')
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Center map on trip destination when page loads
  useEffect(() => {
    if (trip?.lat && trip?.lon) {
      flyTo(trip.lat, trip.lon, 12)
    }
    clearFocus()
    setMapExpanded(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  // Update map markers whenever the selected day changes
  const selectedDay = trip?.days.find((d) => d.id === selectedDayId) ?? trip?.days[0]

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

  function handleAddActivity(activity: Omit<Activity, 'id'>) {
    if (!selectedDay) return
    addActivity(trip!.id, selectedDay.id, activity)
  }

  function handleDeleteActivity(activityId: string) {
    if (!selectedDay) return
    deleteActivity(trip!.id, selectedDay.id, activityId)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Hero / map reveal area ──
          Normal mode : compact image strip (32% height)
          Map mode    : expands to full height, no cover image (map shows through)
      */}
      <div
        className="relative flex-shrink-0 transition-[height,min-height,max-height] duration-400 ease-out"
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
            <Map className="w-3.5 h-3.5 text-accent-DEFAULT" />
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

          {/* Map toggle button */}
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
              mapExpanded
                ? 'bg-accent/20 border-accent/40 text-accent-DEFAULT'
                : 'border-white/12 text-white/40 hover:text-white hover:border-white/25',
            )}
          >
            {mapExpanded
              ? <><ChevronUp className="w-3.5 h-3.5" /><span>Collapse</span></>
              : <><Map className="w-3.5 h-3.5" /><span>Map</span></>
            }
          </button>
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
              onDeleteActivity={handleDeleteActivity}
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

      <AddActivityModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddActivity}
        tripDestination={trip.destination}
      />
    </div>
  )
}
