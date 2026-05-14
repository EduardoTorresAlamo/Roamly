import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  tripCount: number
  onAddTrip: () => void
}

export default function HeroSection({ tripCount, onAddTrip }: HeroSectionProps) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-blue-600 p-6 sm:p-8 mb-6 text-white overflow-hidden relative">
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -right-4 top-16 w-24 h-24 rounded-full bg-white/10" />

      <div className="relative">
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Welcome back</p>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
          Your Upcoming<br />Adventures
        </h1>
        <p className="text-white/80 text-sm mb-5">
          {tripCount === 0
            ? 'No trips planned yet — let\'s change that!'
            : `You have ${tripCount} ${tripCount === 1 ? 'trip' : 'trips'} planned.`}
        </p>
        <Button
          onClick={onAddTrip}
          className="bg-white text-brand-700 hover:bg-white/90 shadow-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Trip
        </Button>
      </div>
    </div>
  )
}
