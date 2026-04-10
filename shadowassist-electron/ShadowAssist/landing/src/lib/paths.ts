/** Hash link to a section on the home page (works from any route on GitHub Pages). */
export function homeSection(anchor: string): string {
  const b = import.meta.env.BASE_URL
  if (b === '/') return `/#${anchor}`
  const prefix = b.replace(/\/$/, '')
  return `${prefix}/#${anchor}`
}
