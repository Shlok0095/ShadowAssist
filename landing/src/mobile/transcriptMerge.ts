/**
 * Android/iOS Web Speech API often emits cumulative finals:
 * "hey" → "hey are" → "hey are you". Appending each chunk causes rolling duplicates.
 */
export function mergeCumulativeFinal(previous: string, incoming: string): string {
  const inc = String(incoming || '').trim()
  if (!inc) return String(previous || '').trim()
  const prev = String(previous || '').trim()
  if (!prev) return inc
  if (inc === prev) return prev
  if (inc.startsWith(prev)) return inc
  if (prev.startsWith(inc)) return prev
  return `${prev} ${inc}`.trim()
}
