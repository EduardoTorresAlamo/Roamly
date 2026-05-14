import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TripProvider } from '@/context/TripContext'
import { MapProvider } from '@/context/MapContext'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TripProvider>
        <MapProvider>
          <App />
        </MapProvider>
      </TripProvider>
    </BrowserRouter>
  </StrictMode>,
)
