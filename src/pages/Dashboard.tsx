import { useState } from 'react'
import { Plus, Calendar, Upload, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useTrips } from '@/hooks/useTrips'
import { useMapContext } from '@/hooks/useMapContext'
import TripGrid from '@/components/dashboard/TripGrid'
import AddTripModal from '@/components/modals/AddTripModal'
import CalendarImportModal from '@/components/modals/CalendarImportModal'
import ConfirmDialog from '@/components/modals/ConfirmDialog'
import { formatDate, getTodayISO } from '@/utils/dates'

/**
 * Compact interactive calendar widget showing the current month.
 *
 * The user can navigate between months with the chevron buttons. Today's date
 * is highlighted. Individual days are not interactive; this is a display-only
 * widget for temporal context rather than a date picker.
 */
function CalendarWidget() {
  const today = new Date()
  // viewDate tracks which month is shown; initialized to the 1st of the current month
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('en-US', { month: 'long' })

  // First day of month (0=Sunday) determines how many empty leading cells to render
  const firstDay = new Date(year, month, 1).getDay()
  // Day 0 of the next month equals the last day of the current month
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Fill leading null cells so dates align with the correct weekday column
  const cells: (number | null)[] = [...Array(firstDay).fill(null)]
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  /** Navigate to the previous month */
  function prev() { setViewDate(new Date(year, month - 1, 1)) }
  /** Navigate to the next month */
  function next() { setViewDate(new Date(year, month + 1, 1)) }

  return (
    <div className="glass-panel rounded-3xl p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-semibold text-sm">{monthName} {year}</span>
        <div className="flex gap-1">
          <button onClick={prev} className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={next} className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[10px] text-white/30 font-medium py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center text-[11px] rounded-lg transition-colors ${
                !day ? '' :
                isToday
                  ? 'bg-accent text-white font-bold'
                  : 'text-white/60 hover:bg-white/10 hover:text-white cursor-pointer'
              }`}
            >
              {day ?? ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Masonry-style 3x2 thumbnail grid of trip cover photos shown in the left sidebar.
 *
 * Only trips that have a coverImageThumb are included; the widget is hidden entirely
 * when no trips have photos so the sidebar does not show an empty panel.
 *
 * @param trips - Array of trip objects (only coverImageThumb and destination are used)
 */
function PhotoGalleryWidget({ trips }: { trips: { coverImageThumb?: string; destination: string }[] }) {
  // Filter out trips without a cover image and cap at 6 to fill the 3x2 grid
  const photosTrips = trips.filter((t) => t.coverImageThumb).slice(0, 6)
  if (photosTrips.length === 0) return null

  return (
    <div className="glass-panel rounded-3xl p-4 w-full">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Trip Photos</p>
      <div className="grid grid-cols-3 gap-1.5">
        {photosTrips.map((t, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
            <img src={t.coverImageThumb} alt={t.destination} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main dashboard page showing the trip list, a mini calendar, and a photo gallery.
 *
 * The layout has three zones:
 *   - Left sidebar (hidden on mobile): calendar widget + photo gallery
 *   - Main panel: trip list with import and add-trip actions
 *   - FAB: floating orange Add Trip button
 *
 * The sidebar and main panel fade to near-transparent when mapExpanded is true so
 * the Leaflet map base layer shows through without being obscured by panel glass.
 */
export default function Dashboard() {
  const { trips, deleteTrip } = useTrips()
  const { mapExpanded } = useMapContext()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  // Case-insensitive destination search over the trip list
  const [search, setSearch] = useState('')
  // Id of the trip awaiting delete confirmation, or null when no prompt is open
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const query = search.trim().toLowerCase()
  const filteredTrips = query
    ? trips.filter((t) => t.destination.toLowerCase().includes(query))
    : trips

  const pendingDeleteTrip = trips.find((t) => t.id === pendingDeleteId) ?? null

  const dateStr = formatDate(getTodayISO())

  /**
   * Deletes the trip the user confirmed and closes the confirmation dialog.
   * Deletion is permanent -- trips live only in localStorage with no undo history.
   */
  function handleConfirmDelete() {
    if (pendingDeleteId) deleteTrip(pendingDeleteId)
    setPendingDeleteId(null)
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Panels — fade to near-invisible in map mode so the map shows through ── */}
      {/* Left sidebar */}
      <div className={`hidden lg:flex flex-col gap-3 w-72 h-full p-4 overflow-y-auto scrollbar-thin flex-shrink-0 transition-opacity duration-300 ${mapExpanded ? 'opacity-10 pointer-events-none' : 'opacity-100'}`}>
        {/* Welcome Banner */}
        <div className="glass-panel rounded-3xl p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-1">{dateStr}</p>
          <h1 className="text-xl font-bold text-white leading-snug mb-0.5">Welcome Back</h1>
          <p className="text-white/50 text-sm">
            {trips.length === 0
              ? 'Plan your next adventure'
              : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} planned`}
          </p>
        </div>

        {/* Calendar widget */}
        <CalendarWidget />

        {/* Photo gallery */}
        <PhotoGalleryWidget trips={trips} />
      </div>

      {/* Right main panel */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden p-4 lg:pr-4 lg:pl-0 transition-opacity duration-300 ${mapExpanded ? 'opacity-10 pointer-events-none' : 'opacity-100'}`}>
        {/* Mobile welcome banner */}
        <div className="lg:hidden glass-panel rounded-3xl p-4 mb-3 flex-shrink-0">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Welcome Back</p>
          <h1 className="text-xl font-bold text-white">
            {trips.length === 0 ? 'Plan your next adventure' : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} planned`}
          </h1>
        </div>

        {/* Trips panel */}
        <div className="glass-panel rounded-3xl flex-1 overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <div>
              <h2 className="text-white font-semibold text-base">Your Trips</h2>
              <p className="text-white/35 text-xs mt-0.5">Upcoming Adventures</p>
            </div>
            {/* Import from calendar button */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-inner text-white/60 hover:text-white text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
              <Calendar className="w-3.5 h-3.5 sm:hidden" />
            </button>
          </div>

          {/* Search / filter */}
          <div className="px-5 pb-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trips by destination"
                className="w-full glass-inner rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
            </div>
            {query && (
              <p className="text-white/35 text-xs mt-2">
                {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'} found
              </p>
            )}
          </div>

          {/* Trip list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-5">
            <TripGrid trips={filteredTrips} onDeleteTrip={setPendingDeleteId} />
          </div>
        </div>
      </div>

      {/* ── Floating orange FAB ── */}
      <button
        onClick={() => setAddModalOpen(true)}
        className={`fixed bottom-7 right-7 w-16 h-16 rounded-full fab-orange flex items-center justify-center text-white z-50 active:scale-90 transition-all duration-300 ${mapExpanded ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
        aria-label="Add new trip"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      <AddTripModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <CalendarImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />

      <ConfirmDialog
        open={pendingDeleteTrip !== null}
        title="Delete this trip?"
        description={
          pendingDeleteTrip
            ? `"${pendingDeleteTrip.destination}" and all of its days and activities will be permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete trip"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
