import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { Pluggable } from 'unified';
import Image from 'next/image';

interface MathPreviewProps {
  content: string;
}

/**
 * Component for rendering markdown with LaTeX math support
 */
export default function MathPreview({ content }: MathPreviewProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath as Pluggable]}
        rehypePlugins={[
          rehypeKatex, 
          [rehypeSanitize, {
            attributes: {
              '*': ['className', 'style'],
              'img': ['src', 'alt', 'title', 'width', 'height']
            }
          }]
        ]}
        components={{
          img: ({ src, alt, width, height, ...props }) => {
            if (!src) return null;
            
            // Convert width and height to numbers or use defaults
            const imageWidth = typeof width === 'string' ? parseInt(width, 10) : (width || 500);
            const imageHeight = typeof height === 'string' ? parseInt(height, 10) : (height || 300);
            
            return (
              <Image 
                src={src}
                alt={alt || 'Mathematical formula or diagram'}
                width={imageWidth}
                height={imageHeight}
                className="max-w-full h-auto rounded-md my-2 shadow-sm"
                {...props}
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 