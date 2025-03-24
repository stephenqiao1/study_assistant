'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ThumbsUp, Brain, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMathPlugin from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Pluggable } from 'unified'
import 'katex/dist/katex.min.css'

// Properly type the import to fix the error
const remarkMath = remarkMathPlugin as Pluggable

interface FlashcardProps {
  question: string
  answer: string
  onRecallRating?: (rating: 'easy' | 'good' | 'hard' | 'forgot') => void
  currentIndex: number
  totalCards: number
  dueDate?: string | null
}

export default function Flashcard({
  question,
  answer,
  onRecallRating,
  currentIndex,
  totalCards,
  dueDate
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  // Reset to question side when card changes
  useEffect(() => {
    setIsFlipped(false)
  }, [currentIndex])

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleRecallRating = (rating: 'easy' | 'good' | 'hard' | 'forgot') => {
    if (onRecallRating) {
      onRecallRating(rating)
    }
  }

  // Function to render text with LaTeX
  const renderWithLatex = (content: string) => {
    try {
      // Check if content is empty or undefined
      if (!content) return <span>No content</span>;
      
      // Make sure we're working with a string
      const safeContent = String(content);
      
      return (
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          className="prose prose-black dark:prose-invert max-w-none !text-black"
          components={{
            // Override any elements to ensure they use black text
            p: ({node: _node, ...props}) => <p className="!text-black" {...props} />,
            span: ({node: _node, ...props}) => <span className="!text-black" {...props} />,
            li: ({node: _node, ...props}) => <li className="!text-black" {...props} />,
            a: ({node: _node, ...props}) => <a className="!text-black underline" {...props} />,
            h1: ({node: _node, ...props}) => <h1 className="!text-black" {...props} />,
            h2: ({node: _node, ...props}) => <h2 className="!text-black" {...props} />,
            h3: ({node: _node, ...props}) => <h3 className="!text-black" {...props} />,
            h4: ({node: _node, ...props}) => <h4 className="!text-black" {...props} />,
            h5: ({node: _node, ...props}) => <h5 className="!text-black" {...props} />,
            h6: ({node: _node, ...props}) => <h6 className="!text-black" {...props} />,
            strong: ({node: _node, ...props}) => <strong className="!text-black" {...props} />,
            em: ({node: _node, ...props}) => <em className="!text-black" {...props} />,
            code: ({node: _node, ...props}) => <code className="!text-black bg-gray-100 px-1 rounded" {...props} />,
            pre: ({node: _node, ...props}) => <pre className="!text-black bg-gray-100 p-2 rounded" {...props} />
          }}
        >
          {safeContent}
        </ReactMarkdown>
      );
    } catch (error) {
      console.error('Error rendering LaTeX:', error);
      // Fallback to plain text if LaTeX rendering fails
      return <span className="text-black">{content}</span>;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="text-center mb-4 text-black py-2 px-3 rounded-md bg-background border">
        <div>Card {currentIndex + 1} of {totalCards}</div>
        {dueDate && (
          <div className="text-sm mt-1 text-black">
            Next review: {new Date(dueDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Flashcard */}
      <div
        className="relative perspective-1000 w-full aspect-[5/2] cursor-pointer mb-4"
        onClick={handleFlip}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isFlipped ? 'back' : 'front'}
            initial={{ rotateY: isFlipped ? 180 : 0, opacity: 0 }}
            animate={{ rotateY: isFlipped ? 0 : 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? -180 : 180, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <Card className="w-full h-full flex items-center justify-center p-6 bg-white overflow-auto text-black [&_*]:text-black">
              <div className="text-center w-full">
                <div className="text-sm text-black mb-2">
                  {isFlipped ? 'Answer' : 'Question'}
                </div>
                <div className="text-xl !text-black">
                  {renderWithLatex(isFlipped ? answer : question)}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      {isFlipped && onRecallRating && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="text-sm text-black mb-1">
            How well did you remember this?
          </div>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              className="gap-2 border-red-500 hover:bg-red-50"
              onClick={() => handleRecallRating('forgot')}
            >
              <X className="h-4 w-4 text-red-500" />
              Forgot
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-yellow-500 hover:bg-yellow-50"
              onClick={() => handleRecallRating('hard')}
            >
              <Brain className="h-4 w-4 text-yellow-500" />
              Hard
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-blue-500 hover:bg-blue-50"
              onClick={() => handleRecallRating('good')}
            >
              <ThumbsUp className="h-4 w-4 text-blue-500" />
              Good
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-green-500 hover:bg-green-50"
              onClick={() => handleRecallRating('easy')}
            >
              <Zap className="h-4 w-4 text-green-500" />
              Easy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 