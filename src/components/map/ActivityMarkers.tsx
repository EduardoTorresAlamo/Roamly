import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapContext } from '@/hooks/useMapContext'
import type { ActivityType } from '@/types'

// CSS hex colors keyed by activity type; used inside inline SVGs where Tailwind classes cannot be applied
const TYPE_COLOR: Record<ActivityType, string> = {
  flight:   '#38bdf8', // sky-400
  lodging:  '#a78bfa', // violet-400
  dining:   '#fb923c', // orange-400
  activity: '#4ade80', // green-400
}

// Heroicons SVG path data embedded as strings so they can be composed into a
// data-URI for Leaflet's L.divIcon without importing an additional SVG bundle
const TYPE_SVG: Record<ActivityType, string> = {
  flight:   '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>',
  lodging:  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
  dining:   '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>',
  activity: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>',
}

/**
 * Builds a Leaflet DivIcon containing an inline SVG marker for the given activity type.
 *
 * L.divIcon is used instead of L.icon because it allows full control over the marker
 * appearance via inline HTML/SVG without needing to host external image files. The
 * focused marker is rendered larger with an inverted (filled) color scheme to make
 * it visually distinct from surrounding markers.
 *
 * @param type - The activity category, determines color and icon path
 * @param focused - Whether this marker is the currently selected one
 * @returns A Leaflet DivIcon ready to pass to L.marker
 */
function makeIcon(type: ActivityType, focused: boolean) {
  const color = TYPE_COLOR[type]
  // Focused markers get a colored ring; unfocused ones get a subtle white border
  const ring = focused ? `stroke="${color}" stroke-width="3"` : 'stroke="rgba(255,255,255,0.4)" stroke-width="1.5"'
  // Focused markers are larger so they stand out clearly against the tile layer
  const size = focused ? 36 : 28
  const iconSize = focused ? 14 : 11
  const offset = size / 2

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${offset}" cy="${offset}" r="${offset - 2}" fill="${focused ? color : 'rgba(10,10,22,0.9)'}" ${ring}/>
  <svg x="${(size - iconSize) / 2}" y="${(size - iconSize) / 2}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${focused ? '#fff' : color}">
    ${TYPE_SVG[type]}
  </svg>
</svg>`

  return L.divIcon({
    html: svg,
    className: '',   // empty string prevents Leaflet's default white box background
    iconSize: [size, size],
    iconAnchor: [offset, offset],  // center the icon over the coordinate point
  })
}

/**
 * Renders activity pins on the Leaflet map and handles flyTo animations.
 *
 * This component must be rendered inside a react-leaflet MapContainer so that
 * useMap() can obtain the map instance. It follows the MapController pattern:
 * it renders nothing to the DOM (returns null) but drives the Leaflet map
 * imperatively via effects.
 *
 * Markers are managed imperatively rather than via react-leaflet's Marker
 * component to avoid re-mount flicker when the focused marker changes -- Leaflet
 * handles the update internally through the effect cleanup/re-run cycle.
 */
export default function ActivityMarkers() {
  const map = useMap()
  const { markers, focusedMarkerId, flyToTarget, focusMarker } = useMapContext()

  // Respond to flyToTarget changes set by MapContext.focusMarker and MapContext.flyTo
  useEffect(() => {
    if (flyToTarget) {
      // duration: 1.5 s -- slow enough to feel deliberate, fast enough not to frustrate
      map.flyTo([flyToTarget.lat, flyToTarget.lon], flyToTarget.zoom, { duration: 1.5 })
    }
  }, [flyToTarget, map])

  // Re-render all markers whenever the list or the focused marker id changes.
  // The cleanup function removes all existing Leaflet markers before the next
  // render cycle adds fresh ones, preventing duplicate pins on the map.
  useEffect(() => {
    const leafletMarkers: L.Marker[] = []

    for (const m of markers) {
      const isFocused = m.id === focusedMarkerId
      const icon = makeIcon(m.type, isFocused)
      const marker = L.marker([m.lat, m.lon], {
        icon,
        // Raise focused marker above all others so it is never obscured
        zIndexOffset: isFocused ? 1000 : 0,
      })

      // Clicking a marker focuses it and triggers a Nearby POI fetch via MapContext
      marker.on('click', () => focusMarker(m.id, m.lat, m.lon))

      // Tooltip shown on hover; offset pushes it above the marker circle
      marker.bindTooltip(m.title, {
        permanent: false,
        direction: 'top',
        offset: [0, -14],
        className: 'roamly-tooltip',
      })

      marker.addTo(map)
      leafletMarkers.push(marker)
    }

    // Cleanup: remove all markers before the effect re-runs to avoid duplicates
    return () => {
      leafletMarkers.forEach((m) => m.remove())
    }
  }, [markers, focusedMarkerId, map, focusMarker])

  // This component only drives Leaflet imperatively; it renders nothing to the React tree
  return null
}
