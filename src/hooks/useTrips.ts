/**
 * Convenience re-exports of the trip context hooks under shorter names.
 *
 * Components should import from this hook rather than reaching into the
 * context module directly, making the import path stable if the context
 * implementation changes.
 *
 * Pick the narrowest hook the component actually needs:
 *   useTrips()        -- the full trip list; re-renders on any trip change
 *   useTripById(id)   -- one trip; re-renders on any trip change
 *   useTripActions()  -- mutations only; never re-renders on a trip change
 */
export {
  useTripState as useTrips,
  useTripDispatch as useTripActions,
  useTripById,
} from '@/hooks/useTripContext'
