'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ThumbsUp, Brain, Zap, ArrowLeftRight } from 'lucide-react'
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
      if (!content) return <span>No content</span>;
      const safeContent = String(content);
      
      return (
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          className="prose dark:prose-invert max-w-none"
          components={{
            p: ({node: _node, ...props}) => <p className="text-foreground" {...props} />,
            span: ({node: _node, ...props}) => <span className="text-foreground" {...props} />,
            li: ({node: _node, ...props}) => <li className="text-foreground" {...props} />,
            a: ({node: _node, ...props}) => <a className="text-primary underline" {...props} />,
            h1: ({node: _node, ...props}) => <h1 className="text-foreground" {...props} />,
            h2: ({node: _node, ...props}) => <h2 className="text-foreground" {...props} />,
            h3: ({node: _node, ...props}) => <h3 className="text-foreground" {...props} />,
            h4: ({node: _node, ...props}) => <h4 className="text-foreground" {...props} />,
            h5: ({node: _node, ...props}) => <h5 className="text-foreground" {...props} />,
            h6: ({node: _node, ...props}) => <h6 className="text-foreground" {...props} />,
            strong: ({node: _node, ...props}) => <strong className="text-foreground" {...props} />,
            em: ({node: _node, ...props}) => <em className="text-foreground" {...props} />,
            code: ({node: _node, ...props}) => <code className="bg-muted px-1 rounded" {...props} />,
            pre: ({node: _node, ...props}) => <pre className="bg-muted p-2 rounded" {...props} />
          }}
        >
          {safeContent}
        </ReactMarkdown>
      );
    } catch (error) {
      console.error('Error rendering LaTeX:', error);
      return <span className="text-foreground">{content}</span>;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border shadow-sm">
          <span className="text-sm font-medium">Card {currentIndex + 1} of {totalCards}</span>
          {dueDate && (
            <span className="text-xs text-muted-foreground">
              Next review: {new Date(dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="relative perspective-1000 w-full aspect-[3/2] cursor-pointer mb-6 group"
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
            <Card className="w-full h-full flex flex-col items-center justify-center p-8 bg-card hover:bg-accent/5 transition-colors overflow-auto border-2 group-hover:border-accent">
              <div className="text-center w-full space-y-4">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  <span>{isFlipped ? 'Answer' : 'Question'}</span>
                  <ArrowLeftRight className="h-3 w-3" />
                </div>
                <div className="text-xl font-medium">
                  {renderWithLatex(isFlipped ? answer : question)}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      {isFlipped && onRecallRating && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-medium text-muted-foreground">
            How well did you remember this?
          </div>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => handleRecallRating('forgot')}
            >
              <X className="h-4 w-4" />
              Forgot
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors"
              onClick={() => handleRecallRating('hard')}
            >
              <Brain className="h-4 w-4" />
              Hard
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
              onClick={() => handleRecallRating('good')}
            >
              <ThumbsUp className="h-4 w-4" />
              Good
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-green-500/50 hover:bg-green-500/10 hover:text-green-500 transition-colors"
              onClick={() => handleRecallRating('easy')}
            >
              <Zap className="h-4 w-4" />
              Easy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 