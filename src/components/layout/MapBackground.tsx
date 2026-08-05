import { type ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import ActivityMarkers from '@/components/map/ActivityMarkers'
import NearbyPanel from '@/components/map/NearbyPanel'
import { useMapContext } from '@/hooks/useMapContext'

/**
 * Props accepted by the MapBackground layout component.
 */
interface MapBackgroundProps {
  /** App UI to render in the stacking layer above the Leaflet map. */
  children: ReactNode
}

/**
 * Renders the full-screen Leaflet map as a fixed background layer, with the app
 * UI floating on top via absolute z-index layers.
 *
 * Layer stack (bottom to top):
 *   z-0  -- Leaflet MapContainer (tile layer + markers)
 *   z-10 -- Darkening overlay (reduces to near-transparent in map mode)
 *   z-20 -- App content panels (sidebar, trip detail, modals)
 *   z-40 -- NearbyPanel (floats above app content in map mode)
 *   z-50 -- MacOS menu bar + FABs
 *
 * The CartoDB Dark Matter tile set is used because it is free, requires no API key,
 * and the dark aesthetic matches the app's night-mode design language.
 *
 * @param children - App content to render above the map
 */
export default function MapBackground({ children }: MapBackgroundProps) {
  const { mapExpanded } = useMapContext()

  return (
    <div className="fixed inset-0 w-screen h-screen">
      {/* Full-screen Leaflet map occupies the base of the stacking context */}
      <MapContainer
        center={[20, 0]}  // World-center default; flyTo overrides this on trip load
        zoom={3}
        zoomControl={false}   // Default zoom control removed; map mode provides its own
        attributionControl={true}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        {/*
          CartoDB Dark Matter tiles -- free, no API key, CARTO-hosted.
          subdomains="abcd" distributes tile requests across four CDN hosts
          to stay within browser per-origin connection limits.
        */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        {/* ActivityMarkers drives flyTo animations and renders imperative L.marker pins */}
        <ActivityMarkers />
      </MapContainer>

      {/* Darkening overlay: opacity 0.42 in normal mode keeps the map subtle;
          drops to 0.08 in map mode so the tile layer is clearly readable */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
        style={{ background: 'rgba(10,10,20,1)', opacity: mapExpanded ? 0.08 : 0.42 }}
      />

      {/* NearbyPanel floats above the map at z-40, visible when a marker is focused */}
      <NearbyPanel />

      {/* pointer-events-none on the wrapper lets map interactions pass through the
          transparent areas; pointer-events-auto on the inner div restores interactivity
          for the actual UI content */}
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        <div className="pointer-events-auto w-full h-full">
          {children}
        </div>
      </div>
    </div>
  )
}
