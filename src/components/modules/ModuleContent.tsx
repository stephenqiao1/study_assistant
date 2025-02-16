import { FC } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface ModuleContentProps {
  module: {
    details: {
      content: string
      title: string
    }
  }
}

const ModuleContent: FC<ModuleContentProps> = ({ module }) => {
  const { title, content } = module.details

  return (
    <article className="prose prose-lg max-w-none prose-headings:text-black prose-p:text-black prose-strong:text-black prose-ul:text-black prose-ol:text-black dark:prose-headings:text-white dark:prose-p:text-white dark:prose-strong:text-white dark:prose-ul:text-white dark:prose-ol:text-white">
      <h1 className="mb-8 text-4xl font-bold">{title}</h1>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        className="leading-relaxed"
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}

export default ModuleContent 