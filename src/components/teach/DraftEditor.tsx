import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import 'katex/dist/katex.min.css'

// Dynamically import the Editor to disable SSR
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default),
  { ssr: false }
)

// For read-only mode with LaTeX support
const MathPreview = dynamic(() => 
  import('@/components/formulas/MathPreview').then(mod => mod.default),
  { ssr: false }
);

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

  // If read-only, render markdown with LaTeX support
  if (readOnly) {
    return (
      <div className="min-h-[400px] p-4 markdown-preview-wrapper">
        <MathPreview content={content} />
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
            caretColor: 'var(--primary)',
            backgroundColor: 'transparent'
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
          caret-color: var(--primary) !important;
          opacity: 1 !important;
        }
        
        /* Ensure text is visible when selected */
        .w-md-editor-text-pre > code span {
          color: var(--text) !important;
        }
        
        /* Improve contrast for all editor text */
        .w-md-editor-text-pre > code,
        .w-md-editor-text-input,
        .w-md-editor-text,
        .wmde-markdown {
          color: var(--text) !important;
          background-color: transparent !important;
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
        
        /* Dark mode specific overrides for text visibility */
        html.dark .w-md-editor-text-input {
          color: white !important;
          background-color: transparent !important;
        }
        
        html.dark .w-md-editor-text-pre > code,
        html.dark .w-md-editor-text pre,
        html.dark .wmde-markdown,
        html.dark .w-md-editor-text {
          color: white !important;
          background-color: transparent !important;
        }
        
        /* Force text visibility regardless of mode */
        .w-md-editor-text-input {
          -webkit-text-fill-color: var(--text) !important; 
          opacity: 1 !important;
        }
        
        /* Ensure editor core components have visible text */
        .w-md-editor-content,
        .w-md-editor-area textarea,
        .w-md-editor-text-pre {
          color: var(--text) !important;
          background-color: transparent !important;
        }
        
        /* Fix code mirror specific styling */
        .CodeMirror-line, 
        .CodeMirror-code * {
          color: var(--text) !important;
        }
        
        /* KaTeX styles to ensure proper display */
        .katex-display {
          margin: 1em 0;
          overflow-x: auto;
          overflow-y: hidden;
        }
        
        .katex {
          font-size: 1.1em;
        }
        
        /* Math blocks should stand out slightly */
        .math-inline {
          background-color: var(--background) !important;
          padding: 0 3px;
          border-radius: 3px;
        }
        
        .math-display {
          background-color: var(--background) !important;
          padding: 8px;
          margin: 8px 0;
          border-radius: 5px;
          overflow-x: auto;
        }
        
        /* Add a hint in the toolbar about using LaTeX */
        .w-md-editor-toolbar::after {
          content: "Use $...$ for inline math or $$...$$ for block equations";
          font-size: 0.75rem;
          opacity: 0.7;
          padding: 0 1rem;
          display: inline-flex;
          align-items: center;
        }
      `}</style>
      
      {/* Add a simple LaTeX guide below the editor */}
      <div className="mt-4 p-3 bg-background-card border border-border rounded text-sm">
        <h4 className="font-semibold mb-1">LaTeX Math Guide:</h4>
        <ul className="space-y-1 text-text-light">
          <li>• Use <code>$...$</code> for inline equations (example: <code>$E=mc^2$</code>)</li>
          <li>• Use <code>$$...$$</code> for block equations (example: <code>$$F = ma$$</code>)</li>
          <li>• Common examples:
            <ul className="ml-4 mt-1">
              <li>- Fractions: <code>\frac{"{num}"}{"{denom}"}</code></li>
              <li>- Subscripts: <code>x_i</code> or superscripts: <code>x^2</code></li>
              <li>- Square roots: <code>\sqrt{"{expr}"}</code></li>
              <li>- Greek letters: <code>\alpha, \beta, \gamma, \pi</code></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  )
} 