import { Plane, Building2, UtensilsCrossed, MapPin, type LucideIcon } from 'lucide-react'
import type { ActivityType } from '@/types'

/**
 * Visual and label metadata for a single activity type.
 * Centralizing these here ensures icon, color, and label stay
 * in sync across the type-picker, timeline items, and map markers.
 */
export interface ActivityMeta {
  /** Lucide icon component rendered in activity cards and type-picker buttons */
  icon: LucideIcon
  /** Tailwind background class applied to the icon circle (e.g. 'bg-blue-100') */
  bg: string
  /** Tailwind text class applied to the icon itself (e.g. 'text-blue-600') */
  color: string
  /** Human-readable category label */
  label: string
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
  },
  lodging: {
    icon: Building2,
    bg: 'bg-purple-100',
    color: 'text-purple-600',
    label: 'Lodging',
  },
  dining: {
    icon: UtensilsCrossed,
    bg: 'bg-orange-100',
    color: 'text-orange-600',
    label: 'Dining',
  },
  activity: {
    icon: MapPin,
    bg: 'bg-green-100',
    color: 'text-green-600',
    label: 'Activity',
  },
}

/**
 * Resolves an activity's display metadata, falling back to the generic
 * 'activity' entry for any unrecognized type.
 *
 * `Activity.type` is typed as `ActivityType`, but that guarantee only holds for
 * values the compiler saw: trips are rehydrated from localStorage via JSON.parse
 * and can carry a stale or hand-edited type (e.g. 'hotel', 'other'). Indexing
 * ACTIVITY_META directly then yields `undefined`, and reading `.icon` or `.label`
 * off it throws a TypeError deep inside a render or an export. Routing every
 * lookup through here degrades an unknown category to a neutral pin instead.
 *
 * @param type - Activity category, trusted or otherwise
 * @returns Display metadata; never undefined
 */
export function getActivityMeta(type: string): ActivityMeta {
  return ACTIVITY_META[type as ActivityType] ?? ACTIVITY_META.activity
}
