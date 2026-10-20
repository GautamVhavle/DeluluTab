/** Swaps item `id` with its neighbour among items sharing the same group; no-op at either end. */
export function moveWithinGroup<T extends { id: string }>(
  items: T[],
  id: string,
  direction: -1 | 1,
  sameGroup: (a: T, b: T) => boolean,
): T[] {
  const index = items.findIndex((x) => x.id === id)
  if (index === -1) return items
  const step = direction
  let j = index + step
  while (j >= 0 && j < items.length && !sameGroup(items[index], items[j])) j += step
  if (j < 0 || j >= items.length) return items
  const next = items.slice()
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

export const newId = () => crypto.randomUUID()

export const MAX_NOTES_LENGTH = 100_000
export const MAX_TODO_LENGTH = 200
