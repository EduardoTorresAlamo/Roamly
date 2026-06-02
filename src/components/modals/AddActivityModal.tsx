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
  /** Trip destination passed to geocodeActivity to improve coordinate accuracy */
  tripDestination?: string
}

/**
 * Labelled form field wrapper with consistent glass-morphism styling.
 *
 * @param label - Field label text rendered in uppercase small caps
 * @param children - The input element(s) to render inside the field
 */
function GlassField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</label>
      {children}
    </div>
  )
}

// Type-specific sub-forms
// Each form is self-contained with its own local state. When submitted, it calls
// onSubmit with the raw activity data; the parent AddActivityModal then handles
// the async geocoding step before persisting the activity.

/**
 * Form for adding a flight activity.
 * Geocoding is skipped for flights because airport coordinates are less useful
 * for map pinning than the actual activity location.
 */
/**
 * Form for adding a flight activity.
 * Geocoding is skipped for flights because an airline name/number does not
 * geocode to a useful point-of-interest on the destination map.
 *
 * @param onSubmit - Called with assembled activity data on valid submission
 * @param isGeocoding - When true, the submit button shows a loading spinner
 */
function FlightForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [airline, setAirline] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [departure, setDeparture] = useState('')
  const [arrival, setArrival] = useState('')

  /** Validates required fields then calls onSubmit with the flight data. */
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

/**
 * Form for adding a lodging activity (hotel, hostel, Airbnb, etc.).
 *
 * @param onSubmit - Called with assembled activity data on valid submission
 * @param isGeocoding - When true, the submit button shows a loading spinner
 */
function LodgingForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [hotel, setHotel] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  /** Validates that a hotel name is present then calls onSubmit. */
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

/**
 * Form for adding a restaurant or dining reservation.
 *
 * @param onSubmit - Called with assembled activity data on valid submission
 * @param isGeocoding - When true, the submit button shows a loading spinner
 */
function DiningForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [restaurant, setRestaurant] = useState('')
  const [time, setTime] = useState('')

  /** Validates that a restaurant name is present then calls onSubmit. */
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

/**
 * Form for adding a generic activity (sightseeing, tours, experiences, etc.).
 *
 * @param onSubmit - Called with assembled activity data on valid submission
 * @param isGeocoding - When true, the submit button shows a loading spinner
 */
function ActivityForm({ onSubmit, isGeocoding }: { onSubmit: (data: Omit<Activity, 'id'>) => void; isGeocoding: boolean }) {
  const [name, setName] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  /** Validates that an activity name is present then calls onSubmit. */
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

/**
 * Two-step modal for adding a new activity to a trip day.
 *
 * Step 1: Type picker (flight, lodging, dining, activity)
 * Step 2: Type-specific form with geocoding on submit
 *
 * After the user submits the form, the modal attempts to geocode the activity title
 * via Nominatim. If geocoding resolves within 3 seconds, the coordinates are
 * attached before the activity is saved so it appears as a pin on the map.
 * If geocoding times out or fails, the activity is saved without coordinates.
 *
 * @param open - Whether the dialog is visible
 * @param onClose - Callback to close the dialog
 * @param onAdd - Callback invoked with the completed activity (minus id)
 * @param tripDestination - Trip destination used to improve geocoding accuracy
 */
export default function AddActivityModal({ open, onClose, onAdd, tripDestination }: AddActivityModalProps) {
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  /**
   * Dismisses the modal and resets type selection.
   * Blocked while geocoding is in flight to prevent data loss.
   */
  function handleClose() {
    // Block dismissal while geocoding to prevent the activity being lost mid-request
    if (isGeocoding) return
    setSelectedType(null)
    onClose()
  }

  /**
   * Geocodes the activity (when applicable) then calls onAdd and closes the modal.
   *
   * @param data - Activity data submitted from one of the type-specific sub-forms
   */
  async function handleAdd(data: Omit<Activity, 'id'>) {
    // Flights are excluded from geocoding because an airline name/number does not
    // geocode to a useful point-of-interest on the destination map
    const canGeocode = data.type !== 'flight' && tripDestination

    if (canGeocode) {
      setIsGeocoding(true)
      try {
        // Race geocoding against a 3 s timeout so a slow Nominatim response does not
        // block the user from saving their activity
        const geo = await Promise.race([
          geocodeActivity(data.title, tripDestination),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ])
        if (geo) {
          // Attach coordinates and full display name to the activity before saving
          data = { ...data, lat: geo.lat, lon: geo.lon, address: geo.displayName }
        }
      } catch {
        // Geocoding failure is non-fatal; the activity is saved without coordinates
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
