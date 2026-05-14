import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import TripDetail from '@/pages/TripDetail'

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
