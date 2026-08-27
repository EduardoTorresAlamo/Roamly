/**
 * Generates a unique id for a trip, day, or activity.
 *
 * Prefers `crypto.randomUUID()`, whose 122 bits of entropy make a collision
 * effectively impossible. The previous `Date.now()` + 7 base-36 characters
 * scheme had only ~36 bits of randomness within a millisecond, which a bulk
 * calendar import — hundreds of activities created in the same tick — can
 * realistically collide on, silently merging two activities that share an id.
 *
 * `crypto.randomUUID` requires a secure context, so it is absent over plain
 * http:// on a LAN address; the timestamp scheme remains as a fallback there.
 * Ids are opaque identity only — nothing sorts or parses them — so the two
 * formats coexist freely, including across data written by an older build.
 *
 * @returns An id unique within this app's storage
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
