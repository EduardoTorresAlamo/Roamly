import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LocalStorageTripRepository,
  SCHEMA_VERSION,
  TRIPS_STORAGE_KEY,
  TripRepositoryReadError,
} from '@/repository/TripRepository'
import type { Trip } from '@/types'

const sampleTrip: Trip = {
  id: 'trip-1',
  destination: 'Tokyo, Japan',
  startDate: '2024-10-12',
  endDate: '2024-10-18',
  days: [],
}

const sampleTrip2: Trip = {
  id: 'trip-2',
  destination: 'Paris, France',
  startDate: '2024-11-01',
  endDate: '2024-11-05',
  days: [],
}

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

describe('LocalStorageTripRepository', () => {
  let memoryStorage: MemoryStorage

  beforeEach(() => {
    memoryStorage = new MemoryStorage()
    vi.restoreAllMocks()
  })

  it('returns an empty array when storage is empty', () => {
    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    expect(repo.getAll()).toEqual([])
  })

  it('saves and retrieves a new trip', () => {
    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    repo.save(sampleTrip)

    expect(repo.getAll()).toEqual([sampleTrip])
    expect(repo.getById('trip-1')).toEqual(sampleTrip)
    expect(repo.getById('non-existent')).toBeUndefined()
  })

  it('updates an existing trip in place preserving insertion order', () => {
    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    repo.save(sampleTrip)
    repo.save(sampleTrip2)

    const updatedTrip1: Trip = { ...sampleTrip, destination: 'Tokyo (Updated)' }
    repo.save(updatedTrip1)

    const all = repo.getAll()
    expect(all).toHaveLength(2)
    expect(all[0]).toEqual(updatedTrip1)
    expect(all[1]).toEqual(sampleTrip2)
  })

  it('deletes a trip by id', () => {
    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    repo.save(sampleTrip)
    repo.save(sampleTrip2)

    repo.delete('trip-1')
    expect(repo.getAll()).toEqual([sampleTrip2])
    expect(repo.getById('trip-1')).toBeUndefined()
  })

  it('handles corrupted JSON in storage gracefully without throwing', () => {
    memoryStorage.setItem(TRIPS_STORAGE_KEY, 'invalid-json-{')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    expect(repo.getAll()).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.any(TripRepositoryReadError)
    )
  })

  it('rejects a trip whose day is missing required fields', () => {
    // Passes the old shallow guard (days is an array) but crashes DayTabs, which
    // dereferences day.date and day.activities unconditionally.
    memoryStorage.setItem(
      TRIPS_STORAGE_KEY,
      JSON.stringify([{ ...sampleTrip, days: [{ id: 'day-1' }] }]),
    )
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    expect(repo.getAll()).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(TripRepositoryReadError))
  })

  it('rejects a trip whose activity is missing required fields', () => {
    memoryStorage.setItem(
      TRIPS_STORAGE_KEY,
      JSON.stringify([
        {
          ...sampleTrip,
          days: [{ id: 'day-1', date: '2024-10-12', activities: [{ id: 'a-1' }] }],
        },
      ]),
    )
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    expect(repo.getAll()).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(TripRepositoryReadError))
  })

  it('accepts a fully-populated trip with days and activities', () => {
    const populated: Trip = {
      ...sampleTrip,
      days: [
        {
          id: 'day-1',
          date: '2024-10-12',
          activities: [{ id: 'a-1', type: 'dining', title: 'Ramen' }],
        },
      ],
    }
    memoryStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify([populated]))

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    expect(repo.getAll()).toEqual([populated])
  })

  it('reads a legacy bare-array payload written before schema versioning', () => {
    memoryStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify([sampleTrip]))

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    expect(repo.getAll()).toEqual([sampleTrip])
  })

  it('upgrades a legacy payload to the versioned envelope on the next write', () => {
    memoryStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify([sampleTrip]))

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    repo.save(sampleTrip2)

    const raw = JSON.parse(memoryStorage.getItem(TRIPS_STORAGE_KEY) as string)
    expect(raw).toEqual({ schemaVersion: SCHEMA_VERSION, trips: [sampleTrip, sampleTrip2] })
  })

  it('writes the versioned envelope', () => {
    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    repo.save(sampleTrip)

    const raw = JSON.parse(memoryStorage.getItem(TRIPS_STORAGE_KEY) as string)
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION)
    expect(raw.trips).toEqual([sampleTrip])
  })

  it('refuses a payload from a newer schema version rather than mangling it', () => {
    memoryStorage.setItem(
      TRIPS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, trips: [sampleTrip] }),
    )
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, memoryStorage)
    expect(repo.getAll()).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(TripRepositoryReadError))
  })

  it('handles storage write errors gracefully', () => {
    const failingStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const repo = new LocalStorageTripRepository(TRIPS_STORAGE_KEY, failingStorage)
    expect(() => repo.save(sampleTrip)).not.toThrow()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to persist'),
      expect.any(Error),
    )
  })
})
