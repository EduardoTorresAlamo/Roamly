/**
 * Convenience re-export of useTripContext under the shorter name useTrips.
 *
 * Components should import from this hook rather than reaching into the
 * context module directly, making the import path stable if the context
 * implementation changes.
 */
export { useTripContext as useTrips } from '@/hooks/useTripContext'
