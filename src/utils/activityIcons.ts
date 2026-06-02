import { Plane, Building2, UtensilsCrossed, MapPin, type LucideIcon } from 'lucide-react'
import type { ActivityType } from '@/types'

/**
 * Visual and label metadata for a single activity type.
 * Centralizing these here ensures icon, color, label, and emoji stay
 * in sync across the type-picker, timeline items, and map markers.
 */
interface ActivityMeta {
  /** Lucide icon component rendered in activity cards and type-picker buttons */
  icon: LucideIcon
  /** Tailwind background class applied to the icon circle (e.g. 'bg-blue-100') */
  bg: string
  /** Tailwind text class applied to the icon itself (e.g. 'text-blue-600') */
  color: string
  /** Human-readable category label */
  label: string
  /** Emoji shown in certain compact contexts */
  emoji: string
}

/**
 * Lookup table mapping each ActivityType to its display metadata.
 * Import this record anywhere you need to render an activity category consistently.
 */
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
