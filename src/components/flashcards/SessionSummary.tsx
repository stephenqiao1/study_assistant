'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Brain, CheckCircle, Clock, Plus, RefreshCw, Star, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'

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
  onAddMoreFlashcards: () => void
}

export default function SessionSummary({
  isOpen,
  onClose,
  stats,
  onReviewCategory,
  onAddMoreFlashcards
}: SessionSummaryProps) {
  // Trigger confetti when dialog opens
  React.useEffect(() => {
    if (isOpen && stats.knownCards > 0) {
      const duration = 2000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }
      
      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }
      
      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now()
        
        if (timeLeft <= 0) {
          return clearInterval(interval)
        }
        
        const particleCount = 50 * (timeLeft / duration)
        
        // since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)
      
      return () => clearInterval(interval)
    }
  }, [isOpen, stats.knownCards])
  
  // Calculate percentages for progress bars
  const knownPercentage = Math.round((stats.knownCards / stats.totalCards) * 100) || 0
  const learningPercentage = Math.round((stats.learningCards / stats.totalCards) * 100) || 0
  const newPercentage = Math.round((stats.newCards / stats.totalCards) * 100) || 0
  
  // Determine message based on performance
  const getMessage = () => {
    if (knownPercentage >= 80) {
      return {
        title: "Excellent work! 🎉",
        description: "You've mastered most of these flashcards. Keep up the fantastic progress!"
      }
    } else if (knownPercentage >= 50) {
      return {
        title: "Great progress! 👏",
        description: "You're on your way to mastering these concepts. A bit more practice will help solidify your knowledge."
      }
    } else {
      return {
        title: "Good start! 💪",
        description: "Learning takes time. Continue reviewing to improve your retention and understanding."
      }
    }
  }
  
  const message = getMessage()
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg !bg-background-card dark:!bg-gray-900 !opacity-100 !border-2 !border-border !shadow-xl !rounded-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Star className="h-5 w-5 text-yellow-500" />
            {message.title}
          </DialogTitle>
          <DialogDescription>
            {message.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Overall progress card */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary">Session Results</h3>
              <Badge variant="outline" className="bg-background/50">
                {stats.totalCards} Cards Total
              </Badge>
            </div>
            
            <div className="space-y-4">
              {/* Known cards */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Mastered</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stats.knownCards} ({knownPercentage}%)
                  </span>
                </div>
                <Progress value={knownPercentage} className="h-2 bg-background" indicatorClassName="bg-green-500" />
              </div>
              
              {/* Learning cards */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Learning</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stats.learningCards} ({learningPercentage}%)
                  </span>
                </div>
                <Progress value={learningPercentage} className="h-2 bg-background" indicatorClassName="bg-blue-500" />
              </div>
              
              {/* New cards */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Need Review</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stats.newCards} ({newPercentage}%)
                  </span>
                </div>
                <Progress value={newPercentage} className="h-2 bg-background" indicatorClassName="bg-amber-500" />
              </div>
            </div>
          </div>
          
          {/* Review options */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">What would you like to do next?</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => {
                  onReviewCategory('new')
                  onClose()
                }}
                variant="outline" 
                className="justify-start border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:bg-amber-900/50"
                disabled={stats.newCards === 0}
              >
                <Zap className="h-4 w-4 mr-2 text-amber-500" />
                Review New Cards
                {stats.newCards > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {stats.newCards}
                  </Badge>
                )}
              </Button>
              
              <Button 
                onClick={() => {
                  onReviewCategory('learning')
                  onClose()
                }}
                variant="outline" 
                className="justify-start border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:bg-blue-900/50"
                disabled={stats.learningCards === 0}
              >
                <Brain className="h-4 w-4 mr-2 text-blue-500" />
                Review Learning
                {stats.learningCards > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {stats.learningCards}
                  </Badge>
                )}
              </Button>
              
              <Button 
                onClick={() => {
                  onReviewCategory('due')
                  onClose()
                }}
                variant="outline" 
                className="justify-start"
              >
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                Review Due Cards
              </Button>
              
              <Button 
                onClick={() => {
                  onReviewCategory('all')
                  onClose()
                }}
                variant="outline" 
                className="justify-start"
              >
                <RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" />
                Review All Cards
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            Close Summary
          </Button>
          <Button
            onClick={onAddMoreFlashcards}
            variant="default"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add More Flashcards
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 