import { Routes, Route, useLocation } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import ErrorBoundary from '@/components/ErrorBoundary'
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
  const { pathname } = useLocation()

  return (
    <ErrorBoundary>
      <AppShell>
        {/* Keyed on the path so navigating away from a crashed page clears the
            rescue screen instead of keeping the boundary latched in its error
            state (React preserves class state across same-type re-renders). */}
        <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trip/:tripId" element={<TripDetail />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
    </ErrorBoundary>
  )
}
