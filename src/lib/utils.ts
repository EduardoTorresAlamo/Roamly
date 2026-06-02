import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class names safely, resolving conflicts in the correct order.
 *
 * clsx handles conditional and array inputs; twMerge resolves Tailwind conflicts
 * (e.g. "p-2 p-4" becomes "p-4") so callers can safely compose class strings
 * without specificity surprises.
 *
 * @param inputs - Any combination of class strings, arrays, or conditionals
 * @returns A single deduplicated class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
