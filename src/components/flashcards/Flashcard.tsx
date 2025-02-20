'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, RotateCcw } from 'lucide-react'

interface FlashcardProps {
  question: string
  answer: string
  onUpdateStatus?: (status: 'new' | 'learning' | 'known') => void
  currentIndex: number
  totalCards: number
}

export default function Flashcard({
  question,
  answer,
  onUpdateStatus,
  currentIndex,
  totalCards
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  // Reset to question side when card changes
  useEffect(() => {
    setIsFlipped(false)
  }, [currentIndex])

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleStatusUpdate = (status: 'new' | 'learning' | 'known') => {
    if (onUpdateStatus) {
      onUpdateStatus(status)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="text-center mb-4 text-text-light">
        Card {currentIndex + 1} of {totalCards}
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
      {isFlipped && onUpdateStatus && (
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleStatusUpdate('new')}
          >
            <RotateCcw className="h-4 w-4" />
            Review Again
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-yellow-500 hover:bg-yellow-50"
            onClick={() => handleStatusUpdate('learning')}
          >
            <X className="h-4 w-4 text-yellow-500" />
            Still Learning
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-green-500 hover:bg-green-50"
            onClick={() => handleStatusUpdate('known')}
          >
            <Check className="h-4 w-4 text-green-500" />
            Got It
          </Button>
        </div>
      )}
    </div>
  )
} 