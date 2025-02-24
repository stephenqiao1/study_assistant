import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

// Dynamically import the Editor to disable SSR
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default),
  { ssr: false }
)

// Dynamically import Markdown Preview
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
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
  const [content, setContent] = useState(initialContent)
  
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  // Apply a global className for styling when the component mounts
  useEffect(() => {
    // Add a class to the body to style the markdown editor globally
    document.documentElement.classList.add('custom-md-editor')
    
    return () => {
      // Clean up when the component unmounts
      document.documentElement.classList.remove('custom-md-editor')
    }
  }, [])

  const handleEditorChange = (value?: string) => {
    if (value !== undefined) {
      setContent(value)
      if (onChange && !readOnly) {
        onChange(value)
      }
    }
  }

  // If read-only, just render the markdown preview
  if (readOnly) {
    return (
      <div className="min-h-[400px] markdown-preview-wrapper">
        <MDPreview 
          source={content} 
          className="bg-transparent border-none" 
          style={{
            backgroundColor: 'transparent',
            color: 'inherit'
          }}
        />
      </div>
    )
  }

  // Otherwise render the editor
  return (
    <div className="min-h-[400px] md-editor-wrapper">
      <MDEditor
        value={content}
        onChange={handleEditorChange}
        height={400}
        preview="edit"
        className="bg-background-card border-border high-contrast-editor"
        previewOptions={{
          className: "bg-background-card",
          style: {
            backgroundColor: 'transparent',
            borderColor: 'var(--border)'
          }
        }}
        textareaProps={{
          style: {
            color: 'var(--text)',
            caretColor: 'var(--primary)'
          }
        }}
      />

      {/* Add custom styling for the editor to match your theme */}
      <style jsx global>{`
        :root.custom-md-editor {
          --color-canvas-default: var(--background-card) !important;
          --color-canvas-subtle: var(--background) !important;
          --color-border-default: var(--border) !important;
        }
        
        /* Override editor backgrounds */
        .w-md-editor {
          background-color: var(--background-card) !important;
          border-color: var(--border) !important;
        }
        
        /* Override preview backgrounds */
        .w-md-editor-preview {
          background-color: var(--background-card) !important;
        }
        
        /* Ensure text contrasts with background in edit mode */
        .w-md-editor-text-pre > code,
        .w-md-editor-text-input,
        .w-md-editor-text {
          color: var(--text) !important;
        }
        
        /* Make textarea text visible */
        .w-md-editor-text-input {
          color: var(--text) !important;
          caret-color: var(--text) !important;
        }
        
        /* Ensure text is visible when selected */
        .w-md-editor-text-pre > code span {
          color: var(--text) !important;
        }
        
        /* Ensure line numbers are visible */
        .w-md-editor-text .CodeMirror-line {
          color: var(--text) !important;
        }
        
        /* Override toolbar backgrounds */
        .w-md-editor-toolbar {
          background-color: var(--background) !important;
          border-color: var(--border) !important;
        }
        
        /* Fix toolbar button colors */
        .w-md-editor-toolbar button {
          color: var(--text) !important;
        }
        
        .w-md-editor-toolbar button:hover {
          color: var(--primary) !important;
        }
        
        /* Fix markdown code blocks */
        .wmde-markdown-color code, .wmde-markdown code {
          background-color: var(--background) !important;
          border-color: var(--border) !important;
        }
        
        /* Fix text color */
        .w-md-editor, .wmde-markdown {
          color: var(--text) !important;
        }
      `}</style>
    </div>
  )
} 