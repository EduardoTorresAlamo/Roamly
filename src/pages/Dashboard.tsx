import { useState } from 'react'
import { Plus, Calendar, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTrips } from '@/hooks/useTrips'
import { useMapContext } from '@/context/MapContext'
import TripGrid from '@/components/dashboard/TripGrid'
import AddTripModal from '@/components/modals/AddTripModal'
import CalendarImportModal from '@/components/modals/CalendarImportModal'
import { formatDate } from '@/utils/dates'

// --- Mini Calendar Widget ---
function CalendarWidget() {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('en-US', { month: 'long' })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [...Array(firstDay).fill(null)]
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  function prev() { setViewDate(new Date(year, month - 1, 1)) }
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

// --- Trip Photos Gallery Widget ---
function PhotoGalleryWidget({ trips }: { trips: { coverImageThumb?: string; destination: string }[] }) {
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

// --- Main Dashboard ---
export default function Dashboard() {
  const { trips, deleteTrip } = useTrips()
  const { mapExpanded } = useMapContext()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const today = new Date()
  const dateStr = formatDate(today.toISOString().slice(0, 10))

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

          {/* Trip list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-5">
            <TripGrid trips={trips} onDeleteTrip={deleteTrip} />
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
    </div>
  )
}
