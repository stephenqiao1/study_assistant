'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ArrowRight } from 'lucide-react'
import stringSimilarity from 'string-similarity'
import ReactMarkdown from 'react-markdown'
// Use specific versions to avoid compatibility issues
import { Pluggable } from 'unified'
import rehypeKatex from 'rehype-katex'
// Import the default export from remark-math to avoid compatibility issues
import remarkMathPlugin from 'remark-math'
import 'katex/dist/katex.min.css'

// Properly type the import to fix the error
const remarkMath = remarkMathPlugin as Pluggable

interface WriteModeProps {
  question: string
  answer: string
  onResult: (rating: 'easy' | 'good' | 'hard' | 'forgot') => void
  currentIndex: number
  totalCards: number
  dueDate?: string | null
}

interface ScoringResult {
  overallSimilarity: number
  keywordScore: number
  missingKeywords: string[]
  finalScore: number
}

function extractKeywords(text: string): string[] {
  // Convert to lowercase and remove punctuation
  const cleanText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
  
  // Split into words
  const words = cleanText.split(/\s+/)
  
  // Filter out common words and short words
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
  return words.filter(word => 
    word.length > 3 && !commonWords.has(word)
  )
}

function calculateScore(userAnswer: string, correctAnswer: string): ScoringResult {
  // Get overall similarity
  const overallSimilarity = stringSimilarity.compareTwoStrings(
    userAnswer.toLowerCase().trim(),
    correctAnswer.toLowerCase().trim()
  )

  // Extract and compare keywords
  const correctKeywords = extractKeywords(correctAnswer)
  const userKeywords = extractKeywords(userAnswer)
  
  // Find matching keywords
  const matchingKeywords = correctKeywords.filter(keyword => 
    userKeywords.some(userWord => 
      stringSimilarity.compareTwoStrings(userWord, keyword) > 0.8
    )
  )

  // Calculate keyword score
  const keywordScore = matchingKeywords.length / correctKeywords.length

  // Find missing important keywords
  const missingKeywords = correctKeywords.filter(keyword =>
    !userKeywords.some(userWord => 
      stringSimilarity.compareTwoStrings(userWord, keyword) > 0.8
    )
  )

  // Calculate final score (60% keywords, 40% overall similarity)
  const finalScore = (keywordScore * 0.6) + (overallSimilarity * 0.4)

  return {
    overallSimilarity,
    keywordScore,
    missingKeywords,
    finalScore
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
        remarkPlugins={[remarkMath as Pluggable]}
        rehypePlugins={[rehypeKatex]}
        className="prose dark:prose-invert max-w-none"
      >
        {safeContent}
      </ReactMarkdown>
    );
  } catch (error) {
    console.error('Error rendering LaTeX:', error);
    // Fallback to plain text if LaTeX rendering fails
    return <span>{content}</span>;
  }
};

export default function WriteMode({
  question,
  answer,
  onResult,
  currentIndex,
  totalCards,
  dueDate
}: WriteModeProps) {
  const [userAnswer, setUserAnswer] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null)

  const handleSubmit = () => {
    const result = calculateScore(userAnswer, answer)
    setScoringResult(result)
    setHasSubmitted(true)
  }

  const handleNext = () => {
    if (!scoringResult) return

    // Convert final score to rating
    let rating: 'easy' | 'good' | 'hard' | 'forgot'
    if (scoringResult.finalScore >= 0.9) {
      rating = 'easy'
    } else if (scoringResult.finalScore >= 0.7) {
      rating = 'good'
    } else if (scoringResult.finalScore >= 0.5) {
      rating = 'hard'
    } else {
      rating = 'forgot'
    }

    onResult(rating)
    setUserAnswer('')
    setHasSubmitted(false)
    setScoringResult(null)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="text-center mb-4 text-text-light dark:text-gray-300">
        <div>Card {currentIndex + 1} of {totalCards}</div>
        {dueDate && (
          <div className="text-sm mt-1">
            Next review: {new Date(dueDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Question Card */}
      <Card className="w-full p-8 bg-white mb-6">
        <div className="text-center">
          <div className="text-sm text-text-light dark:text-gray-300 mb-4">Question</div>
          <div className="text-xl text-text mb-8">
            {renderWithLatex(question)}
          </div>
          
          <Textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="mb-4 text-white bg-background placeholder:text-gray-400"
            disabled={hasSubmitted}
          />

          <AnimatePresence mode="wait">
            {!hasSubmitted ? (
              <Button
                key="submit"
                onClick={handleSubmit}
                disabled={!userAnswer.trim()}
                className="w-full"
              >
                Submit Answer
              </Button>
            ) : scoringResult && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="border rounded-lg p-6 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {scoringResult.finalScore >= 0.9 ? (
                      <div className="text-green-600 flex items-center gap-2">
                        <Check className="h-5 w-5" />
                        <span>Perfect!</span>
                      </div>
                    ) : scoringResult.finalScore >= 0.7 ? (
                      <div className="text-blue-600 flex items-center gap-2">
                        <Check className="h-5 w-5" />
                        <span>Almost there!</span>
                      </div>
                    ) : scoringResult.finalScore >= 0.5 ? (
                      <div className="text-yellow-600 flex items-center gap-2">
                        <ArrowRight className="h-5 w-5" />
                        <span>On the right track</span>
                      </div>
                    ) : (
                      <div className="text-red-600 flex items-center gap-2">
                        <X className="h-5 w-5" />
                        <span>Keep studying</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium mb-1">Your Answer:</div>
                    <div className="text-text-light dark:text-gray-300">{userAnswer}</div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium mb-1">Correct Answer:</div>
                    <div className="text-text">
                      {renderWithLatex(answer)}
                    </div>
                  </div>

                  {scoringResult.missingKeywords.length > 0 && (
                    <div className="mt-4 text-sm">
                      <div className="font-medium text-yellow-600 mb-1">Key concepts to include:</div>
                      <div className="text-text-light dark:text-gray-300">
                        {scoringResult.missingKeywords.join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleNext} className="w-full">
                  Next Card
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  )
} 