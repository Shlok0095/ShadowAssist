import { MarkdownDocPage } from '@/pages/MarkdownDocPage'
import shipping from '../../../docs/LAUNCH_END_TO_END.md?raw'

export function DocsShipping() {
  return (
    <MarkdownDocPage
      title="Shipping & releases"
      lede="Build Windows artifacts, tags, GitHub Actions, and this landing site — for maintainers and curious users."
      crumb="Shipping & releases"
      markdown={shipping}
    />
  )
}
