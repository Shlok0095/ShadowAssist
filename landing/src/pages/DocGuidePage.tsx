import { Navigate, useParams } from 'react-router-dom'
import { getDocPage } from '@/config/docsNav'
import { MarkdownDocPage } from '@/pages/MarkdownDocPage'

export function DocGuidePage() {
  const { slug } = useParams<{ slug: string }>()
  const page = slug ? getDocPage(slug) : undefined

  if (!page) return <Navigate to="/docs" replace />

  return (
    <MarkdownDocPage
      title={page.title}
      lede={page.lede}
      crumb={page.title}
      markdown={page.markdown}
    />
  )
}
