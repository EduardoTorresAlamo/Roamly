import { useMemo, type ReactNode } from 'react'
import {
  LocalStorageTripRepository,
  TripRepositoryContext,
  type TripRepository,
} from '@/repository/TripRepository'

/**
 * Makes a `TripRepository` available to the component tree.
 *
 * Pass an explicit `repository` to override the default (e.g. an in-memory fake
 * in tests, or a future remote-backed implementation). When omitted, a
 * localStorage-backed repository is created once and reused.
 *
 * Lives in its own file (separate from the repository classes/hook) so Vite Fast
 * Refresh sees a component-only module — the same split the app uses for
 * TripContext / useTripContext.
 *
 * @param repository - Optional repository implementation to inject
 * @param children - React subtree that will have access to the repository
 */
export function TripRepositoryProvider({
  repository,
  children,
}: {
  repository?: TripRepository
  children: ReactNode
}) {
  const repo = useMemo(() => repository ?? new LocalStorageTripRepository(), [repository])
  return <TripRepositoryContext.Provider value={repo}>{children}</TripRepositoryContext.Provider>
}
