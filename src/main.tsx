import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TripProvider } from '@/context/TripContext'
import { TripRepositoryProvider } from '@/repository/TripRepositoryProvider'
import { MapProvider } from '@/context/MapContext'
// Leaflet CSS must be imported globally before any MapContainer is rendered
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

/**
 * Application entry point.
 *
 * Provider order matters:
 *   BrowserRouter         -- must be outermost for React Router hooks to work
 *   TripRepositoryProvider -- supplies the persistence backend to TripProvider
 *   TripProvider          -- trip state backed by the repository; consumed by map and pages
 *   MapProvider           -- map marker/focus state; consumed by AppShell and pages
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TripRepositoryProvider>
        <TripProvider>
          <MapProvider>
            <App />
          </MapProvider>
        </TripProvider>
      </TripRepositoryProvider>
    </BrowserRouter>
  </StrictMode>,
)
