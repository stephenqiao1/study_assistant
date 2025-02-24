'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ThumbsUp, Brain, Zap } from 'lucide-react'

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

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="text-center mb-4 text-text-light">
        <div>Card {currentIndex + 1} of {totalCards}</div>
        {dueDate && (
          <div className="text-sm mt-1">
            Next review: {new Date(dueDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Flashcard */}
      <div
        className="relative perspective-1000 w-full aspect-[4/3] cursor-pointer mb-6"
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
            <Card className="w-full h-full flex items-center justify-center p-8 bg-white">
              <div className="text-center">
                <div className="text-sm text-text-light mb-4">
                  {isFlipped ? 'Answer' : 'Question'}
                </div>
                <div className="text-xl text-text">
                  {isFlipped ? answer : question}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      {isFlipped && onRecallRating && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="text-sm text-text-light mb-2">
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