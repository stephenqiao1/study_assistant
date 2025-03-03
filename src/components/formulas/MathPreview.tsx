import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Pluggable } from 'unified'

interface MathPreviewProps {
  content: string
}

/**
 * Component for rendering markdown with LaTeX math support
 */
export default function MathPreview({ content }: MathPreviewProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath as Pluggable]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
} 