import { Plane, Building2, UtensilsCrossed, MapPin, type LucideIcon } from 'lucide-react'
import type { ActivityType } from '@/types'

interface ActivityMeta {
  icon: LucideIcon
  bg: string
  color: string
  label: string
  emoji: string
}

export const ACTIVITY_META: Record<ActivityType, ActivityMeta> = {
  flight: {
    icon: Plane,
    bg: 'bg-blue-100',
    color: 'text-blue-600',
    label: 'Flight',
    emoji: '✈️',
  },
  lodging: {
    icon: Building2,
    bg: 'bg-purple-100',
    color: 'text-purple-600',
    label: 'Lodging',
    emoji: '🏨',
  },
  dining: {
    icon: UtensilsCrossed,
    bg: 'bg-orange-100',
    color: 'text-orange-600',
    label: 'Dining',
    emoji: '🍽️',
  },
  activity: {
    icon: MapPin,
    bg: 'bg-green-100',
    color: 'text-green-600',
    label: 'Activity',
    emoji: '📸',
  },
}
