import { X, Utensils, Coffee, Beer, Landmark, BedDouble, TreePine, Star, MapPin, Loader2 } from 'lucide-react'
import { useMapContext } from '@/context/MapContext'
import type { POI } from '@/utils/overpass'

/**
 * Maps a POI category to its corresponding Lucide icon component.
 *
 * @param category - POI category from the Overpass API result
 * @returns The appropriate Lucide icon element
 */
function categoryIcon(category: POI['category']) {
  switch (category) {
    case 'restaurant': return <Utensils className="w-3.5 h-3.5" />
    case 'cafe':       return <Coffee   className="w-3.5 h-3.5" />
    case 'bar':        return <Beer     className="w-3.5 h-3.5" />
    case 'museum':     return <Landmark className="w-3.5 h-3.5" />
    case 'hotel':      return <BedDouble className="w-3.5 h-3.5" />
    case 'park':       return <TreePine  className="w-3.5 h-3.5" />
    case 'attraction': return <Star      className="w-3.5 h-3.5" />
    default:           return <MapPin    className="w-3.5 h-3.5" />
  }
}

/**
 * Capitalizes the first letter of a POI category for display in the panel.
 *
 * @param c - Lowercase category string
 * @returns Human-readable category label, e.g. "Restaurant"
 */
function categoryLabel(c: POI['category']) {
  return c.charAt(0).toUpperCase() + c.slice(1)
}

/**
 * Formats a distance in metres to a compact human-readable label.
 * Switches to kilometres with one decimal place once the value exceeds 1 000 m.
 *
 * @param m - Distance in metres
 * @returns Formatted string, e.g. "350m" or "1.2km"
 */
function distanceLabel(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`
}

/**
 * Floating panel that lists nearby points of interest fetched from Overpass API
 * when the user taps an activity marker on the map.
 *
 * The panel is only visible when a marker is focused and there are POIs to display
 * or a fetch is in progress. It dismisses via the X button or when clearFocus is called.
 */
export default function NearbyPanel() {
  const { focusedMarkerId, markers, recommendations, isLoadingRecs, clearFocus } = useMapContext()

  if (!focusedMarkerId) return null

  const focused = markers.find((m) => m.id === focusedMarkerId)
  const visible = isLoadingRecs || recommendations.length > 0

  if (!visible) return null

  return (
    <div className="fixed right-4 top-16 z-40 w-72 glass-panel rounded-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-white/8">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Nearby</p>
          <p className="text-sm font-semibold text-white leading-tight truncate">
            {focused?.title ?? 'Selected location'}
          </p>
        </div>
        <button
          onClick={clearFocus}
          className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {isLoadingRecs && (
          <div className="flex items-center justify-center gap-2 py-8 text-white/40">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Finding nearby places…</span>
          </div>
        )}

        {!isLoadingRecs && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-white/30">
            <MapPin className="w-5 h-5 mb-2" />
            <span className="text-xs">No places found nearby</span>
          </div>
        )}

        {!isLoadingRecs && recommendations.map((poi) => (
          <div
            key={poi.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/4 last:border-0"
          >
            {/* Category icon */}
            <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-white/60 flex-shrink-0">
              {categoryIcon(poi.category)}
            </div>

            {/* Name + type */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white leading-tight truncate">{poi.name}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{categoryLabel(poi.category)}</p>
            </div>

            {/* Distance */}
            <span className="text-[10px] text-white/30 flex-shrink-0 font-mono">
              {distanceLabel(poi.distance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
