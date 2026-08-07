import { useCallback, useState } from 'react'
import { z } from 'zod'

/**
 * Syncs a React state value to localStorage so it survives page reloads.
 *
 * There is no backend for Roamly -- all trip data lives in the browser via
 * localStorage. This hook is the single integration point between React state
 * and persistent storage, keeping the rest of the codebase storage-agnostic.
 *
 * The setter accepts either a plain value or a functional updater
 * (like React's own setState), so callers can safely derive the next value
 * from the previous one without closing over stale state.
 *
 * @param key - The localStorage key to read from and write to
 * @param initialValue - Fallback value used when the key does not exist yet
 * @returns A stateful value and a setter that writes to both state and localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  schema?: z.ZodType<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Lazy initializer reads from storage once on mount; avoids a render cycle
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      // Return parsed JSON if present, otherwise use the supplied default
      if (!item) return initialValue
      const parsed = JSON.parse(item) as T
      if (schema) {
        const result = schema.safeParse(parsed)
        if (!result.success) {
          console.warn(`useLocalStorage: schema validation failed for "${key}"`, result.error.issues)
          return initialValue
        }
        return result.data
      }
      return parsed
    } catch (err) {
      // JSON.parse can throw for corrupted values; fall back to the initial value
      console.error(`useLocalStorage: failed to read "${key}", using initial value`, err)
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        // Resolve functional updaters against the latest state, not a stale closure
        const next = value instanceof Function ? value(prev) : value
        try {
          // Keep React state and localStorage in lockstep
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch (err) {
          // Storage can fail (private browsing, quota). State still updates so the
          // UI stays responsive, but the failure is logged rather than swallowed.
          console.error(`useLocalStorage: failed to persist "${key}"`, err)
        }
        return next
      })
    },
    [key],
  )

  return [storedValue, setValue]
}
