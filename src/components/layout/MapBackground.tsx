import { type ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import ActivityMarkers from '@/components/map/ActivityMarkers'
import NearbyPanel from '@/components/map/NearbyPanel'
import { useMapContext } from '@/context/MapContext'

interface MapBackgroundProps {
  children: ReactNode
}

export default function MapBackground({ children }: MapBackgroundProps) {
  const { mapExpanded } = useMapContext()

  return (
    <div className="fixed inset-0 w-screen h-screen">
      {/* Full-screen Leaflet map */}
      <MapContainer
        center={[20, 0]}
        zoom={3}
        zoomControl={false}
        attributionControl={true}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        {/* CartoDB Dark Matter — no API key required */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        {/* Handles flyTo (from MapContext) and activity markers */}
        <ActivityMarkers />
      </MapContainer>

      {/* Darkening overlay — fades away in map mode so the map is clearly visible */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
        style={{ background: 'rgba(10,10,20,1)', opacity: mapExpanded ? 0.08 : 0.42 }}
      />

      {/* Nearby Places panel — floats above the map, visible in map mode */}
      <NearbyPanel />

      {/* App content floats above map */}
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        <div className="pointer-events-auto w-full h-full">
          {children}
        </div>
      </div>
    </div>
  )
}
