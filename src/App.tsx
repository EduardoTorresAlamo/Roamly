import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import TripDetail from '@/pages/TripDetail'

/**
 * Root application component.
 *
 * Defines the two top-level routes:
 *   /             -- Dashboard (trip list + calendar + photo gallery)
 *   /trip/:tripId -- TripDetail (day tabs + activity timeline + map)
 *
 * AppShell wraps both routes with the persistent map background and menu bar.
 */
export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trip/:tripId" element={<TripDetail />} />
      </Routes>
    </AppShell>
  )
}
