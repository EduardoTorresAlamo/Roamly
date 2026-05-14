import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapContext } from '@/context/MapContext'
import type { ActivityType } from '@/types'

// Color per activity type (CSS hex — used inside SVG)
const TYPE_COLOR: Record<ActivityType, string> = {
  flight:   '#38bdf8', // sky-400
  lodging:  '#a78bfa', // violet-400
  dining:   '#fb923c', // orange-400
  activity: '#4ade80', // green-400
}

const TYPE_SVG: Record<ActivityType, string> = {
  flight:   '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>',
  lodging:  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
  dining:   '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>',
  activity: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>',
}

function makeIcon(type: ActivityType, focused: boolean) {
  const color = TYPE_COLOR[type]
  const ring = focused ? `stroke="${color}" stroke-width="3"` : 'stroke="rgba(255,255,255,0.4)" stroke-width="1.5"'
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
    className: '',
    iconSize: [size, size],
    iconAnchor: [offset, offset],
  })
}

/**
 * Renders activity markers inside the MapContainer.
 * Also handles flyTo via MapController pattern.
 */
export default function ActivityMarkers() {
  const map = useMap()
  const { markers, focusedMarkerId, flyToTarget, focusMarker } = useMapContext()

  // Handle flyTo
  useEffect(() => {
    if (flyToTarget) {
      map.flyTo([flyToTarget.lat, flyToTarget.lon], flyToTarget.zoom, { duration: 1.5 })
    }
  }, [flyToTarget, map])

  // Render markers imperatively with Leaflet (avoids react-leaflet Marker re-mount issues)
  useEffect(() => {
    const leafletMarkers: L.Marker[] = []

    for (const m of markers) {
      const isFocused = m.id === focusedMarkerId
      const icon = makeIcon(m.type, isFocused)
      const marker = L.marker([m.lat, m.lon], { icon, zIndexOffset: isFocused ? 1000 : 0 })
      marker.on('click', () => focusMarker(m.id, m.lat, m.lon))

      // Tooltip with activity title
      marker.bindTooltip(m.title, {
        permanent: false,
        direction: 'top',
        offset: [0, -14],
        className: 'roamly-tooltip',
      })

      marker.addTo(map)
      leafletMarkers.push(marker)
    }

    return () => {
      leafletMarkers.forEach((m) => m.remove())
    }
  }, [markers, focusedMarkerId, map, focusMarker])

  return null
}
