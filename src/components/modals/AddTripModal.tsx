import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTrips } from '@/hooks/useTrips'
import { fetchDestinationImage } from '@/utils/destinationImages'

interface AddTripModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Modal dialog for creating a new trip.
 *
 * As the user types a destination, a debounced fetch retrieves a cover image
 * from Unsplash (or the curated fallback map). The image and its associated
 * coordinates are stored with the trip so the map can center on it and the
 * card shows an attractive preview.
 *
 * The modal navigates directly to the new TripDetail page after creation
 * so the user can start adding activities immediately.
 *
 * @param open - Whether the dialog is visible
 * @param onClose - Callback to close the dialog without saving
 */
export default function AddTripModal({ open, onClose }: AddTripModalProps) {
  const { addTrip } = useTrips()
  const navigate = useNavigate()

  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  // Separate state fields for the image result avoid deeply nested object updates
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageThumb, setImageThumb] = useState<string | null>(null)
  const [imageAttrib, setImageAttrib] = useState<string | null>(null)
  const [imageLat, setImageLat] = useState<number | undefined>()
  const [imageLon, setImageLon] = useState<number | undefined>()
  const [imageFetching, setImageFetching] = useState(false)

  // Ref used to cancel in-flight debounce timers on each keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Monotonic id so a slow, superseded fetch cannot overwrite a newer preview
  const fetchIdRef = useRef(0)

  // Debounce the image fetch so we do not call Unsplash/Nominatim on every keystroke.
  // 600 ms provides a good balance between responsiveness and API request volume.
  // The effect cleanup cancels any pending timer when the destination changes again.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Don't fetch for very short inputs -- they rarely produce good results
    if (destination.trim().length < 2) {
      setPreviewImage(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      const fetchId = ++fetchIdRef.current
      setImageFetching(true)
      try {
        const result = await fetchDestinationImage(destination.trim())
        // Ignore stale responses: only the latest request may update the preview
        if (fetchIdRef.current !== fetchId) return
        setPreviewImage(result.url)
        setImageThumb(result.thumb)
        setImageAttrib(result.attribution)
        setImageLat(result.lat)
        setImageLon(result.lon)
      } catch (err) {
        // A failed preview fetch is non-fatal -- the trip can be created without
        // a cover image -- but it should not surface as an unhandled rejection
        console.error('Destination image fetch failed', err)
      } finally {
        if (fetchIdRef.current === fetchId) setImageFetching(false)
      }
    }, 600)

    // Cancel pending timer if the user types again before the delay expires
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [destination])

  /** Clears all form fields and image preview state so the modal is clean on next open. */
  function reset() {
    setDestination('')
    setStartDate('')
    setEndDate('')
    setError('')
    setPreviewImage(null)
    setImageThumb(null)
    setImageAttrib(null)
    setImageLat(undefined)
    setImageLon(undefined)
  }

  /** Resets form state and calls the parent close callback. */
  function handleClose() {
    reset()
    onClose()
  }

  /**
   * Validates the form, creates the trip via TripContext, and navigates to the new trip.
   *
   * @param e - Synthetic form submit or button click event
   */
  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!destination.trim() || !startDate || !endDate) {
      setError('All fields are required.')
      return
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.')
      return
    }

    const tripId = addTrip({
      destination: destination.trim(),
      startDate,
      endDate,
      coverImage: previewImage ?? undefined,
      coverImageThumb: imageThumb ?? undefined,
      coverImageAttribution: imageAttrib ?? undefined,
      lat: imageLat,
      lon: imageLon,
    })

    reset()
    onClose()
    navigate(`/trip/${tripId}`)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-night-800 border-white/10 text-white overflow-hidden p-0">
        {/* Destination image hero */}
        <div className="relative h-44 bg-night-700 overflow-hidden flex-shrink-0">
          {previewImage ? (
            <>
              <img
                src={previewImage}
                alt={destination}
                className="w-full h-full object-cover transition-opacity duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-night-800/90 via-night-800/20 to-transparent" />
              {imageAttrib && (
                <p className="absolute bottom-2 right-3 text-[9px] text-white/30">
                  Photo: {imageAttrib} / Unsplash
                </p>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              {imageFetching ? (
                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
              ) : (
                <>
                  <MapPin className="w-10 h-10 text-white/10" />
                  <p className="text-white/20 text-xs">Type a destination to see a photo</p>
                </>
              )}
            </div>
          )}

          {/* Fetching overlay */}
          {imageFetching && previewImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
            </div>
          )}
        </div>

        <DialogHeader className="px-6 pt-5 pb-2">
          <DialogTitle className="text-white text-lg">Plan a New Trip</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-2 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-widest">Destination</Label>
            <input
              className="glass-input"
              placeholder="e.g. Kyoto, Japan"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-widest">Start Date</Label>
              <input
                className="glass-input"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (endDate && e.target.value > endDate) setEndDate(e.target.value)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-widest">End Date</Label>
              <input
                className="glass-input"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!destination.trim() || !startDate || !endDate}
          >
            Create Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
