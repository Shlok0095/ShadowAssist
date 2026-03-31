import gettingStarted from '@/content/getting-started.md?raw'
import { MarkdownDocPage } from '@/pages/MarkdownDocPage'

export function DocsGettingStarted() {
  return (
    <MarkdownDocPage
      title="Getting started"
      lede="Download, install, first launch, and where to read next — all on this site."
      crumb="Getting started"
      markdown={gettingStarted}
    />
  )
}
