import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Plane, Map, X } from 'lucide-react'
import MapBackground from './MapBackground'
import { useTrips } from '@/hooks/useTrips'
import { useMapContext } from '@/context/MapContext'
import { cn } from '@/lib/utils'

/**
 * Props accepted by the AppShell layout component.
 */
interface AppShellProps {
  /** Page-level content to render inside the content layer above the map. */
  children: ReactNode
}

/**
 * macOS-style top menu bar with Roamly branding and a global map toggle button.
 *
 * The traffic lights are purely decorative and do not implement window management.
 * The map toggle is mirrored in TripDetail's content panel for discoverability.
 */
function MacOSMenuBar() {
  const { mapExpanded, setMapExpanded } = useMapContext()

  return (
    <div className="macos-bar h-12 flex items-center px-4 sm:px-6 gap-4 fixed top-0 left-0 right-0 z-50">
      {/* Traffic lights (decorative) */}
      <div className="hidden sm:flex items-center gap-1.5 mr-1">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
      </div>

      {/* Logo */}
      <Link
        to="/"
        onClick={() => setMapExpanded(false)}
        className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
      >
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
          <Plane className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight">Roamly</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Map toggle button — always visible */}
      <button
        onClick={() => setMapExpanded(!mapExpanded)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200',
          mapExpanded
            ? 'bg-accent/20 border-accent/50 text-accent-DEFAULT'
            : 'border-white/12 text-white/50 hover:text-white hover:border-white/25 hover:bg-white/5',
        )}
      >
        {mapExpanded
          ? <><X className="w-3.5 h-3.5" /><span className="hidden sm:inline">Close Map</span></>
          : <><Map className="w-3.5 h-3.5" /><span className="hidden sm:inline">Map</span></>
        }
      </button>
    </div>
  )
}

/**
 * Runs a one-time effect on app mount to center the Leaflet map on the first
 * trip's saved coordinates. This ensures the map is not stuck on the default
 * world-center view when the user has existing trips.
 *
 * The empty dependency array intentionally omits flyTo and trips to prevent
 * re-triggering every time the trips list or flyTo reference changes; this
 * is the desired "run once on mount" behavior.
 */
function MapCenterOnLoad() {
  const { trips } = useTrips()
  const { flyTo } = useMapContext()

  useEffect(() => {
    const first = trips[0]
    if (first?.lat && first?.lon) {
      flyTo(first.lat, first.lon, 10)
    }
  // Only run once on mount -- intentional empty-array exhaustive-deps bypass
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

/**
 * Root layout shell that composes the full-screen map background, the menu bar,
 * and the main content area into a single stacking context.
 *
 * @param children - Page-level content (Dashboard or TripDetail)
 */
export default function AppShell({ children }: AppShellProps) {
  return (
    <MapBackground>
      <MapCenterOnLoad />
      <MacOSMenuBar />
      {/* Content area begins 48px below the menu bar (h-12 = 3rem = 48px) */}
      <div className="absolute inset-0 top-12 overflow-hidden">
        {children}
      </div>
    </MapBackground>
  )
}
