/**
 * Shared ordering helpers for conversation lists.
 *
 * Both the plaintiff message dropdown and the full Messages page must agree on
 * "newest conversation first". Rooms that have never received a message carry a
 * null timestamp and must sort last rather than first (CP-306).
 */

type RoomLike = {
  lastMessageAt?: string | null
  createdAt?: string | null
  lastMessage?: { createdAt?: string | null } | null
}

function recencyOf(room: RoomLike): number {
  const candidates = [room.lastMessage?.createdAt, room.lastMessageAt, room.createdAt]
  for (const value of candidates) {
    if (!value) continue
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return Number.NEGATIVE_INFINITY
}

export function sortRoomsByRecency<T extends RoomLike>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => recencyOf(b) - recencyOf(a))
}
