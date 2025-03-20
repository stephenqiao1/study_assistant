import dynamic from 'next/dynamic'
import { useState, useEffect, useRef, useCallback } from 'react'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import 'katex/dist/katex.min.css'
import { SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { Loader2 } from 'lucide-react'
import rehypeSanitize from 'rehype-sanitize'

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
  onImageUpload?: (imageData: { url: string; name: string; size: number; type: string }) => void
  supabase?: SupabaseClient
}

export default function DraftEditor({ 
  initialContent = '', 
  readOnly = false, 
  onChange,
  onImageUpload,
  supabase
}: DraftEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isUploading, setIsUploading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  
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

  // Handle image paste
  useEffect(() => {
    if (readOnly || !editorRef.current || !supabase) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          e.preventDefault()
          const blob = items[i].getAsFile()
          if (blob) {
            await uploadImage(blob)
          }
          break
        }
      }
    }

    // Add paste event listener to the editor
    const editorElement = editorRef.current
    editorElement.addEventListener('paste', handlePaste)

    return () => {
      editorElement.removeEventListener('paste', handlePaste)
    }
  }, [readOnly, editorRef.current, supabase])

  // Handle image upload
  const uploadImage = async (file: File) => {
    if (!file || !supabase) return
    
    setIsUploading(true)
    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('note_images')
        .upload(filePath, file)

      if (error) {
        throw error
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('note_images')
        .getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL')
      }

      // Insert the image markdown into the editor
      const imageMarkdown = `![${file.name}](${urlData.publicUrl})`
      
      // Insert at cursor position or append to the end
      let newContent = content;
      const textarea = editorRef.current?.querySelector('textarea');
      if (textarea) {
        const { selectionStart, selectionEnd } = textarea;
        newContent = content.substring(0, selectionStart) + 
                    imageMarkdown + 
                    content.substring(selectionEnd);
      } else {
        newContent = content ? `${content}\n${imageMarkdown}` : imageMarkdown;
      }
      
      setContent(newContent)
      
      if (onChange) {
        onChange(newContent)
      }

      // Notify parent component about the uploaded image
      if (onImageUpload) {
        onImageUpload({
          url: urlData.publicUrl,
          name: file.name,
          size: file.size,
          type: file.type
        })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle file input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadImage(file)
      // Reset the input value so the same file can be selected again
      e.target.value = ''
    }
  }

  // Handle drag and drop
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    
    if (readOnly || !supabase) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        await uploadImage(file)
      }
    }
  }, [readOnly, supabase, uploadImage])

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
    <div 
      className="min-h-[400px] md-editor-wrapper relative"
      ref={editorRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-2 p-4 bg-background-card rounded-md shadow-md">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Uploading image...</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-2">
        <label 
          htmlFor="image-upload" 
          className="px-3 py-1 text-sm bg-background-card hover:bg-muted border border-border rounded-md cursor-pointer flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Add Image
        </label>
        <input 
          id="image-upload" 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileInputChange}
        />
        <p className="text-xs text-muted-foreground">
          Tip: You can also paste images directly or drag & drop them here
        </p>
      </div>
      
      <MDEditor
        value={content}
        onChange={handleEditorChange}
        height={400}
        preview="live"
        className="bg-background-card border-border high-contrast-editor"
        previewOptions={{
          className: "bg-background-card",
          style: {
            backgroundColor: 'transparent',
            borderColor: 'var(--border)'
          },
          rehypePlugins: [[rehypeSanitize, {
            attributes: {
              '*': ['className', 'style'],
              'img': ['src', 'alt', 'title', 'width', 'height']
            }
          }]]
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
        
        /* Image styling in preview */
        .wmde-markdown img, 
        .markdown-preview-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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