import howItWorks from '../../../HOW_IT_WORKS.md?raw'
import { MarkdownDocPage } from '@/pages/MarkdownDocPage'

export function HowItWorks() {
  return (
    <MarkdownDocPage
      title="How ShadowAssist works"
      lede="Full product guide — same content as the repository, rendered here."
      crumb="How it works"
      markdown={howItWorks}
    />
  )
}
