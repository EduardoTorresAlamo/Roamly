import { useState } from 'react'

/**
 * Syncs a React state value to localStorage so it survives page reloads.
 *
 * There is no backend for Roamly -- all trip data lives in the browser via
 * localStorage. This hook is the single integration point between React state
 * and persistent storage, keeping the rest of the codebase storage-agnostic.
 *
 * @param key - The localStorage key to read from and write to
 * @param initialValue - Fallback value used when the key does not exist yet
 * @returns A stateful value and a setter that writes to both state and localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Lazy initializer reads from storage once on mount; avoids a render cycle
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      // Return parsed JSON if present, otherwise use the supplied default
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      // JSON.parse can throw for corrupted values; fall back to the initial value
      return initialValue
    }
  })

  const setValue = (value: T) => {
    try {
      // Keep React state and localStorage in lockstep
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Silently fail on storage errors (e.g. private browsing quota)
    }
  }

  return [storedValue, setValue]
}
