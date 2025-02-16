'use client'

import { FC } from 'react'
import { Editor } from '@tinymce/tinymce-react'

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
}

const TextEditor: FC<TextEditorProps> = ({ value, onChange }) => {
  return (
    <div className="min-h-[400px] border rounded-lg bg-white">
      <Editor
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        value={value}
        onEditorChange={onChange}
        init={{
          height: 400,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
        }}
      />
    </div>
  )
}

export default TextEditor 