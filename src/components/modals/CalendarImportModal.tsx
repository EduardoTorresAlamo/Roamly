import { useState, useRef } from 'react'
import { Upload, Calendar, Plane, Building2, X, Check, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTrips } from '@/hooks/useTrips'
import { parseICS, groupEventsIntoTrip, type ICSEvent } from '@/utils/icsParser'
import { generateDayPlans } from '@/utils/dates'
import { generateId } from '@/utils/id'
import { fetchDestinationImage } from '@/utils/destinationImages'
import { useNavigate } from 'react-router-dom'
import type { Activity } from '@/types'

interface CalendarImportModalProps {
  open: boolean
  onClose: () => void
}

type Step = 'upload' | 'preview' | 'importing' | 'done'

function eventToActivity(event: ICSEvent): Omit<Activity, 'id'> {
  // Extract HH:mm from ISO datetime
  const timeFrom = (iso?: string) => iso ? iso.slice(11, 16) : '00:00'

  if (event.type === 'flight') {
    return {
      type: 'flight',
      title: event.flightNumber
        ? `${event.airline ?? ''} ${event.flightNumber}`.trim()
        : event.summary,
      startTime: timeFrom(event.dtStart),
      endTime: timeFrom(event.dtEnd) || undefined,
      notes: event.description,
    }
  }
  if (event.type === 'hotel') {
    return {
      type: 'lodging',
      title: event.summary,
      startTime: timeFrom(event.dtStart),
      endTime: timeFrom(event.dtEnd) || undefined,
      notes: event.location ?? event.description,
    }
  }
  return {
    type: 'activity',
    title: event.summary,
    startTime: timeFrom(event.dtStart),
    endTime: timeFrom(event.dtEnd) || undefined,
    notes: [event.location, event.description].filter(Boolean).join(' — ') || undefined,
  }
}

export default function CalendarImportModal({ open, onClose }: CalendarImportModalProps) {
  const { addTripFull } = useTrips()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [events, setEvents] = useState<ICSEvent[]>([])
  const [tripMeta, setTripMeta] = useState<{ startDate: string; endDate: string; destination: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [importedTripId, setImportedTripId] = useState('')

  function reset() {
    setStep('upload')
    setEvents([])
    setTripMeta(null)
    setSelected(new Set())
    setError('')
    setImportedTripId('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setError('')
    try {
      const text = await file.text()
      const { events: parsed } = parseICS(text)
      if (parsed.length === 0) {
        setError('No events found in this file. Make sure it is a valid .ics calendar file.')
        return
      }
      const grouped = groupEventsIntoTrip(parsed)
      if (!grouped) {
        setError('Could not determine trip dates from this file.')
        return
      }
      setEvents(parsed)
      setTripMeta({ startDate: grouped.startDate, endDate: grouped.endDate, destination: grouped.destination })
      setSelected(new Set(parsed.map((e) => e.uid)))
      setStep('preview')
    } catch {
      setError('Failed to read the file. Please try again.')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function toggleEvent(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  async function handleImport() {
    if (!tripMeta || !events.length) return
    setStep('importing')

    const imageData = await fetchDestinationImage(tripMeta.destination)
    const days = generateDayPlans(tripMeta.startDate, tripMeta.endDate)

    // Place each selected event on the right day
    const selectedEvents = events.filter((e) => selected.has(e.uid))
    for (const event of selectedEvents) {
      const eventDate = event.dtStart?.slice(0, 10)
      if (!eventDate) continue
      const day = days.find((d) => d.date === eventDate)
      if (!day) continue
      day.activities.push({ ...eventToActivity(event), id: generateId() })
    }

    const id = addTripFull({
      destination: tripMeta.destination,
      startDate: tripMeta.startDate,
      endDate: tripMeta.endDate,
      days,
      coverImage: imageData.url,
      coverImageThumb: imageData.thumb,
      coverImageAttribution: imageData.attribution,
      lat: imageData.lat,
      lon: imageData.lon,
    })

    setImportedTripId(id)
    setStep('done')
  }

  function getEventIcon(type: ICSEvent['type']) {
    if (type === 'flight') return <Plane className="w-4 h-4 text-blue-400" />
    if (type === 'hotel') return <Building2 className="w-4 h-4 text-purple-400" />
    return <Calendar className="w-4 h-4 text-green-400" />
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-night-800 border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-brand-400" />
            </div>
            <DialogTitle className="text-white">Import from Calendar</DialogTitle>
          </div>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div className="px-6 pb-6 space-y-4">
            <p className="text-white/50 text-sm">
              Upload an <strong className="text-white/70">.ics</strong> file from Apple Calendar, Google Calendar,
              or from a flight/hotel booking confirmation email.
            </p>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-brand-500/50 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-brand-600/15 flex items-center justify-center transition-colors">
                <Upload className="w-7 h-7 text-white/30 group-hover:text-brand-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-white/70 font-medium text-sm">Drop .ics file here</p>
                <p className="text-white/30 text-xs mt-0.5">or click to browse</p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <p className="text-white/25 text-xs text-center">
              Tip: In Apple Calendar, File → Export → Export... to get an .ics file
            </p>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && tripMeta && (
          <div className="px-6 pb-6 space-y-4">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Detected Trip</p>
              <p className="text-white font-semibold">{tripMeta.destination}</p>
              <p className="text-white/50 text-xs mt-0.5">
                {tripMeta.startDate} – {tripMeta.endDate}
              </p>
            </div>

            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
                Select events to import ({selected.size}/{events.length})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                {events.map((event) => (
                  <button
                    key={event.uid}
                    onClick={() => toggleEvent(event.uid)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selected.has(event.uid)
                        ? 'bg-brand-600/15 border-brand-500/30 text-white'
                        : 'bg-white/3 border-white/8 text-white/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      event.type === 'flight' ? 'bg-blue-500/15' :
                      event.type === 'hotel' ? 'bg-purple-500/15' : 'bg-green-500/15'
                    }`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.summary}</p>
                      {event.dtStart && (
                        <p className="text-xs opacity-50 mt-0.5">{event.dtStart.slice(0, 10)}</p>
                      )}
                    </div>
                    {selected.has(event.uid) && (
                      <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1 border-white/15 text-white/70 bg-transparent hover:bg-white/5">
                Back
              </Button>
              <Button onClick={handleImport} disabled={selected.size === 0} className="flex-1">
                Import {selected.size} event{selected.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Importing ── */}
        {step === 'importing' && (
          <div className="px-6 pb-6 flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className="text-white/50 text-sm">Fetching destination photo & creating trip…</p>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className="px-6 pb-6 flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Trip imported!</p>
              <p className="text-white/40 text-sm mt-1">Your itinerary is ready to view.</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-white/15 text-white/70 bg-transparent hover:bg-white/5">
                <X className="w-4 h-4" />
                Close
              </Button>
              <Button
                onClick={() => { handleClose(); navigate(`/trip/${importedTripId}`) }}
                className="flex-1"
              >
                View Trip
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
