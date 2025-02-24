'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Brain, RotateCcw, CheckCircle2 } from 'lucide-react'

interface SessionSummaryProps {
  isOpen: boolean
  onClose: () => void
  stats: {
    totalCards: number
    knownCards: number
    learningCards: number
    newCards: number
  }
  onReviewCategory: (category: 'new' | 'learning' | 'all' | 'due') => void
}

export default function SessionSummary({ isOpen, onClose, stats, onReviewCategory }: SessionSummaryProps) {
  const hasCardsToReview = stats.newCards > 0 || stats.learningCards > 0
  const allMastered = stats.knownCards === stats.totalCards

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Session Summary</DialogTitle>
          <DialogDescription className="text-center">
            {allMastered 
              ? "Congratulations! You've mastered all the flashcards!" 
              : "Great progress! Here's how you did:"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-50">
            <Trophy className="h-6 w-6 text-green-500" />
            <div className="text-2xl font-bold text-green-700">{stats.knownCards}</div>
            <div className="text-sm text-green-600 text-center">Mastered</div>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50">
            <Brain className="h-6 w-6 text-blue-500" />
            <div className="text-2xl font-bold text-blue-700">{stats.learningCards}</div>
            <div className="text-sm text-blue-600 text-center">Learning</div>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-yellow-50">
            <RotateCcw className="h-6 w-6 text-yellow-500" />
            <div className="text-2xl font-bold text-yellow-700">{stats.newCards}</div>
            <div className="text-sm text-yellow-600 text-center">Need Review</div>
          </div>
        </div>
        <div className="text-center text-sm text-text-light">
          Total Cards Reviewed: {stats.totalCards}
        </div>
        
        <DialogFooter className="flex-col gap-2 sm:gap-2 mt-4">
          {allMastered ? (
            <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
              <CheckCircle2 className="h-5 w-5" />
              <span>All flashcards mastered!</span>
            </div>
          ) : hasCardsToReview ? (
            <div className="flex flex-col w-full gap-2">
              <div className="text-sm text-text-light text-center mb-2">
                Would you like to continue reviewing?
              </div>
              <Button 
                variant="outline"
                className="w-full border-purple-500 hover:bg-purple-50"
                onClick={() => onReviewCategory('due')}
              >
                Review Due Cards
              </Button>
              {stats.newCards > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full border-yellow-500 hover:bg-yellow-50"
                  onClick={() => onReviewCategory('new')}
                >
                  Review Cards That Need Work ({stats.newCards})
                </Button>
              )}
              {stats.learningCards > 0 && (
                <Button 
                  variant="outline"
                  className="w-full border-blue-500 hover:bg-blue-50"
                  onClick={() => onReviewCategory('learning')}
                >
                  Review Cards In Progress ({stats.learningCards})
                </Button>
              )}
              {(stats.newCards > 0 || stats.learningCards > 0) && (
                <Button 
                  className="w-full"
                  onClick={() => onReviewCategory('all')}
                >
                  Review All Non-Mastered Cards ({stats.newCards + stats.learningCards})
                </Button>
              )}
            </div>
          ) : null}
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            {allMastered ? 'Close' : 'Finish Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 