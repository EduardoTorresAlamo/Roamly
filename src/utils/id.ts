/**
 * Generates a lightweight unique ID suitable for client-side entity keys.
 *
 * This is intentionally simpler than a full UUID: the millisecond timestamp
 * ensures rough chronological ordering and near-zero collision risk within a
 * single session, while the random suffix guards against the rare case where
 * two IDs are generated in the same millisecond.
 *
 * @returns A string like "1716400000000-a3f9z12" that is unique within the browser session
 */
export function generateId(): string {
  // Combine timestamp with a 7-char base-36 random suffix
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
