import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'

type Props = { markdown: string }

function MdLink({
  href,
  children,
  node: _n,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode; node?: unknown }) {
  if (href?.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link to={href} {...rest}>
        {children}
      </Link>
    )
  }
  const external = href?.startsWith('http') ?? false
  return (
    <a href={href} {...rest} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {children}
    </a>
  )
}

export function MarkdownBody({ markdown }: Props) {
  return (
    <article className="prose-doc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]}
        components={{ a: MdLink }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}
