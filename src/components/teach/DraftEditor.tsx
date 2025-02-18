import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'
import { EditorState, convertToRaw, convertFromRaw, ContentState } from 'draft-js'
import 'draft-js/dist/Draft.css'

// Dynamically import the Editor to disable SSR
const Editor = dynamic(
  () => import('draft-js').then(mod => mod.Editor),
  { ssr: false }
)

interface DraftEditorProps {
  initialContent?: string
  readOnly?: boolean
  onChange?: (content: string) => void
}

export default function DraftEditor({ 
  initialContent = '', 
  readOnly = false, 
  onChange 
}: DraftEditorProps) {
  const initialized = useRef(false)
  const [editorState, setEditorState] = useState(() => {
    initialized.current = true
    return initialContent
      ? EditorState.createWithContent(ContentState.createFromText(initialContent))
      : EditorState.createEmpty()
  })

  useEffect(() => {
    // Only update from initialContent if we haven't initialized yet
    // or if we're switching to a completely different content in read-only mode
    if (!initialized.current || (readOnly && initialContent !== editorState.getCurrentContent().getPlainText())) {
      initialized.current = true
      const contentState = ContentState.createFromText(initialContent)
      setEditorState(EditorState.createWithContent(contentState))
    }
  }, [initialContent, readOnly])

  const handleChange = (state: EditorState) => {
    setEditorState(state)
    if (onChange && !readOnly) {
      const content = state.getCurrentContent()
      const plainText = content.getPlainText()
      onChange(plainText)
    }
  }

  return (
    <div className="min-h-[400px]">
      <Editor
        editorState={editorState}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder="Enter your content..."
      />
    </div>
  )
} 