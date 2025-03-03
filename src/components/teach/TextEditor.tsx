'use client'

import { FC, useState } from 'react'
import { Editor, EditorState, ContentState } from 'draft-js'
import { Button } from "@/components/ui/button"
import { Eye, Edit2 } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import 'draft-js/dist/Draft.css'
import { Pluggable } from 'unified'

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const TextEditor: FC<TextEditorProps> = ({ value, onChange, disabled }) => {
  const [isPreview, setIsPreview] = useState(false)
  const [editorState, setEditorState] = useState(() => {
    const contentState = ContentState.createFromText(value || '')
    return EditorState.createWithContent(contentState)
  })

  // Update parent component when editor state changes
  const handleEditorChange = (newState: EditorState) => {
    setEditorState(newState)
    const content = newState.getCurrentContent()
    const text = content.getPlainText()
    if (text !== value) {
      onChange(text)
    }
  }

  return (
    <div className="min-h-[400px] border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
      <div className="border-b p-2 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPreview(!isPreview)}
          className="gap-2"
        >
          {isPreview ? (
            <>
              <Edit2 className="h-4 w-4" />
              Edit
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Preview
            </>
          )}
        </Button>
      </div>
      
      {isPreview ? (
        <div className="p-4 min-h-[400px] prose prose-lg max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkMath as Pluggable]}
            rehypePlugins={[rehypeKatex]}
            className="leading-relaxed"
          >
            {value}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="p-4 min-h-[400px] font-mono">
          <Editor
            editorState={editorState}
            onChange={handleEditorChange}
            placeholder="Enter your content using Markdown..."
            readOnly={disabled}
          />
        </div>
      )}
    </div>
  )
}

export default TextEditor