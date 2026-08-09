/** Hash links that work from any marketing route (React Router SPA). */
export function marketingAnchor(sectionId: string) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#${sectionId}`
}

export function scrollToMarketingSection(sectionId: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(sectionId)
  if (!el) return false
  el.querySelectorAll('.reveal').forEach((node) => node.classList.add('visible'))
  el.scrollIntoView({ behavior, block: 'start' })
  return true
}
