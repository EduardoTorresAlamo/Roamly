import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Plane, Map, X } from 'lucide-react'
import MapBackground from './MapBackground'
import { useTrips } from '@/hooks/useTrips'
import { useMapContext } from '@/context/MapContext'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

/** macOS-style top menu bar with Roamly branding and map toggle */
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

/** Centers the map on the first trip's coordinates on first load */
function MapCenterOnLoad() {
  const { trips } = useTrips()
  const { flyTo } = useMapContext()

  useEffect(() => {
    const first = trips[0]
    if (first?.lat && first?.lon) {
      flyTo(first.lat, first.lon, 10)
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <MapBackground>
      <MapCenterOnLoad />
      <MacOSMenuBar />
      {/* Main content area below the menu bar */}
      <div className="absolute inset-0 top-12 overflow-hidden">
        {children}
      </div>
    </MapBackground>
  )
}
