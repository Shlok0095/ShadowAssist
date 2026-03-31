import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = { markdown: string }

export function MarkdownBody({ markdown }: Props) {
  return (
    <article className="prose-doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  )
}
