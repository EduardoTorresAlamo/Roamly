import { useState } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import type { ActivityType, Activity } from '@/types'
import { ACTIVITY_TYPES } from '@/types'
import { ACTIVITY_META } from '@/utils/activityIcons'
import { geocodeActivity } from '@/utils/geocoding'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AddActivityModalProps {
  open: boolean
  onClose: () => void
  onAdd: (activity: Omit<Activity, 'id'>) => void
  tripDestination?: string
}

// Shared glass field component
function GlassField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</label>
      {children}
    </div>
  )
}

// --- Type-specific forms ---
// Each form receives onSubmit and a geocoding helper; they call onSubmit with the
// geocode-enriched activity data. The parent handles the async flow.

function FlightForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [airline, setAirline] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [departure, setDeparture] = useState('')
  const [arrival, setArrival] = useState('')

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!airline.trim() || !departure) return
    onSubmit({
      type: 'flight',
      title: [airline.trim(), flightNumber.trim()].filter(Boolean).join(' · '),
      startTime: departure,
      endTime: arrival || undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-6 pb-6">
      <GlassField label="Airline">
        <input className="glass-input" placeholder="e.g. United Airlines" value={airline} onChange={(e) => setAirline(e.target.value)} autoFocus />
      </GlassField>
      <GlassField label="Flight Number (optional)">
        <input className="glass-input" placeholder="e.g. UA 123" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} />
      </GlassField>
      <div className="grid grid-cols-2 gap-3">
        <GlassField label="Departure">
          <input className="glass-input" type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} />
        </GlassField>
        <GlassField label="Arrival (opt.)">
          <input className="glass-input" type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} />
        </GlassField>
      </div>
      <Button type="submit" className="w-full" disabled={!airline.trim() || !departure || isGeocoding}>
        {isGeocoding ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Locating…</> : 'Add Flight'}
      </Button>
    </form>
  )
}

function LodgingForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [hotel, setHotel] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!hotel.trim()) return
    onSubmit({ type: 'lodging', title: hotel.trim(), startTime: checkIn, endTime: checkOut || undefined })
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-6 pb-6">
      <GlassField label="Hotel Name">
        <input className="glass-input" placeholder="e.g. The Ritz-Carlton" value={hotel} onChange={(e) => setHotel(e.target.value)} autoFocus />
      </GlassField>
      <div className="grid grid-cols-2 gap-3">
        <GlassField label="Check-in (opt.)">
          <input className="glass-input" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </GlassField>
        <GlassField label="Check-out (opt.)">
          <input className="glass-input" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </GlassField>
      </div>
      <Button type="submit" className="w-full" disabled={!hotel.trim() || isGeocoding}>
        {isGeocoding ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Locating…</> : 'Add Lodging'}
      </Button>
    </form>
  )
}

function DiningForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [restaurant, setRestaurant] = useState('')
  const [time, setTime] = useState('')

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!restaurant.trim()) return
    onSubmit({ type: 'dining', title: restaurant.trim(), startTime: time })
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-6 pb-6">
      <GlassField label="Restaurant Name">
        <input className="glass-input" placeholder="e.g. Narisawa" value={restaurant} onChange={(e) => setRestaurant(e.target.value)} autoFocus />
      </GlassField>
      <GlassField label="Reservation Time (optional)">
        <input className="glass-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </GlassField>
      <Button type="submit" className="w-full" disabled={!restaurant.trim() || isGeocoding}>
        {isGeocoding ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Locating…</> : 'Add Dining'}
      </Button>
    </form>
  )
}

function ActivityForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [name, setName] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ type: 'activity', title: name.trim(), startTime: time, notes: notes.trim() || undefined })
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-6 pb-6">
      <GlassField label="Activity Name">
        <input className="glass-input" placeholder="e.g. Fushimi Inari Shrine" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </GlassField>
      <GlassField label="Start Time (optional)">
        <input className="glass-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </GlassField>
      <GlassField label="Notes (optional)">
        <textarea
          className="glass-input min-h-[72px] resize-none"
          placeholder="Any tips or reminders…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </GlassField>
      <Button type="submit" className="w-full" disabled={!name.trim() || isGeocoding}>
        {isGeocoding ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Locating…</> : 'Add Activity'}
      </Button>
    </form>
  )
}

// --- Main Modal ---
export default function AddActivityModal({ open, onClose, onAdd, tripDestination }: AddActivityModalProps) {
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  function handleClose() {
    if (isGeocoding) return  // prevent close during geocoding
    setSelectedType(null)
    onClose()
  }

  async function handleAdd(data: Omit<Activity, 'id'>) {
    // Skip geocoding for flights — airport data is less useful for map pins
    const canGeocode = data.type !== 'flight' && tripDestination

    if (canGeocode) {
      setIsGeocoding(true)
      try {
        const geo = await Promise.race([
          geocodeActivity(data.title, tripDestination),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ])
        if (geo) {
          data = { ...data, lat: geo.lat, lon: geo.lon, address: geo.displayName }
        }
      } catch {
        // geocoding failed — continue without coords
      } finally {
        setIsGeocoding(false)
      }
    }

    onAdd(data)
    setSelectedType(null)
    onClose()
  }

  const meta = selectedType ? ACTIVITY_META[selectedType] : null

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-night-800 border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedType && !isGeocoding && (
              <button
                onClick={() => setSelectedType(null)}
                className="w-8 h-8 rounded-full hover:bg-white/8 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {meta && (
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center border border-white/10', meta.bg)}>
                <meta.icon className={cn('w-4 h-4', meta.color)} />
              </div>
            )}
            <DialogTitle className="text-white">
              {selectedType ? `Add ${ACTIVITY_META[selectedType].label}` : 'What are you adding?'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Step 1 — type selector */}
        {!selectedType && (
          <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-2">
            {ACTIVITY_TYPES.map((type) => {
              const m = ACTIVITY_META[type]
              const Icon = m.icon
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2.5 rounded-2xl p-5 min-h-[90px] border border-white/6 transition-all active:scale-[0.95] hover:border-white/15 hover:bg-white/5',
                    m.bg,
                  )}
                >
                  <div className="w-10 h-10 rounded-2xl bg-black/20 flex items-center justify-center">
                    <Icon className={cn('w-5 h-5', m.color)} />
                  </div>
                  <span className={cn('text-sm font-semibold', m.color)}>{m.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {selectedType === 'flight'   && <FlightForm   onSubmit={handleAdd} isGeocoding={isGeocoding} />}
        {selectedType === 'lodging'  && <LodgingForm  onSubmit={handleAdd} isGeocoding={isGeocoding} />}
        {selectedType === 'dining'   && <DiningForm   onSubmit={handleAdd} isGeocoding={isGeocoding} />}
        {selectedType === 'activity' && <ActivityForm onSubmit={handleAdd} isGeocoding={isGeocoding} />}
      </DialogContent>
    </Dialog>
  )
}
