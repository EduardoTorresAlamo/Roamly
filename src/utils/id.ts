/**
 * Client-side unique id: millisecond timestamp for rough ordering, plus a
 * random base-36 suffix to break ties within the same millisecond.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
