import type { Trip } from '@/types'
import TripCard from './TripCard'

interface TripGridProps {
  trips: Trip[]
  onDeleteTrip: (tripId: string) => void
}

export default function TripGrid({ trips, onDeleteTrip }: TripGridProps) {
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-white/30 text-sm">No trips yet. Tap + to add one.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onDelete={() => onDeleteTrip(trip.id)}
        />
      ))}
    </div>
  )
}
