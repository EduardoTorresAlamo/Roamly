import { useNavigate } from 'react-router-dom'
import { Trash2, CalendarDays, ChevronRight } from 'lucide-react'
import type { Trip } from '@/types'
import { formatDateRange, getTripDurationDays } from '@/utils/dates'
import { cn } from '@/lib/utils'

const GRADIENT_FALLBACKS = [
  'from-violet-700 via-purple-800 to-indigo-900',
  'from-sky-700 via-blue-800 to-indigo-900',
  'from-emerald-700 via-teal-800 to-cyan-900',
  'from-orange-700 via-red-800 to-rose-900',
  'from-pink-700 via-rose-800 to-red-900',
  'from-amber-700 via-orange-800 to-red-900',
]

function hashDestination(str: string): number {
  return str.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

interface TripCardProps {
  trip: Trip
  onDelete: () => void
}

export default function TripCard({ trip, onDelete }: TripCardProps) {
  const navigate = useNavigate()
  const gradient = GRADIENT_FALLBACKS[hashDestination(trip.destination) % GRADIENT_FALLBACKS.length]
  const duration = getTripDurationDays(trip.startDate, trip.endDate)
  const hasCover = !!trip.coverImageThumb

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      onClick={() => navigate(`/trip/${trip.id}`)}
      className="trip-card-glass rounded-3xl overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
    >
      {/* Image / Gradient Header */}
      <div className="relative h-40 overflow-hidden">
        {hasCover ? (
          <>
            <img
              src={trip.coverImageThumb}
              alt={trip.destination}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Dark gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div className={cn('w-full h-full bg-gradient-to-br', gradient)} />
        )}

        {/* Duration badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
          <span className="text-[11px] text-white/80 font-medium">
            {duration} {duration === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-red-500/80 backdrop-blur-sm flex items-center justify-center transition-colors border border-white/10"
          aria-label="Delete trip"
        >
          <Trash2 className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
        </button>

        {/* Destination title on image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <h3 className="text-lg font-bold text-white leading-tight tracking-tight drop-shadow">
            {trip.destination}
          </h3>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white/50">
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{formatDateRange(trip.startDate, trip.endDate)}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors" />
      </div>

      {/* Attribution */}
      {trip.coverImageAttribution && (
        <div className="px-4 pb-2">
          <span className="text-[9px] text-white/20">Photo: {trip.coverImageAttribution} / Unsplash</span>
        </div>
      )}
    </div>
  )
}
