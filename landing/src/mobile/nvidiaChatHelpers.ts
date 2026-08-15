/** NVIDIA NIM chat helpers — mirrors desktop lib/aiClient.js reasoning controls. */

export function isNvidiaNimBaseUrl(baseURL: string): boolean {
  try {
    return new URL(baseURL.replace(/\/$/, '')).hostname.toLowerCase() === 'integrate.api.nvidia.com'
  } catch {
    return false
  }
}

/** When think=false, disable Nemotron reasoning. When think=true, allow model thinking. */
export function applyNemotronReasoning(
  messages: Array<{ role: string; content: string | unknown }>,
  baseURL: string,
  model: string,
  think: boolean,
): Array<{ role: string; content: string | unknown }> {
  if (!isNvidiaNimBaseUrl(baseURL) || !/nemotron/i.test(model)) return messages
  if (think) return messages

  const next = messages.map((m) => ({ ...m }))
  const systemIndex = next.findIndex((m) => m.role === 'system')
  if (systemIndex >= 0) {
    const content = next[systemIndex].content
    if (typeof content === 'string' && !content.includes('/no_think')) {
      next[systemIndex] = { ...next[systemIndex], content: `/no_think\n${content}` }
    }
  } else {
    next.unshift({ role: 'system', content: '/no_think' })
  }
  return next
}

export function nvidiaChatHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}
