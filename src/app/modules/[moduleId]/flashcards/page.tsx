'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { ArrowLeft, Plus, Wand2, X, PenLine, FlipHorizontal } from 'lucide-react'
import Flashcard from '@/components/flashcards/Flashcard'
import WriteMode from '@/components/flashcards/WriteMode'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { calculateNextReview, getNextReviewDate, initializeSpacedRepetition } from '@/utils/spaced-repetition'
import SessionSummary from '@/components/flashcards/SessionSummary'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface FlashcardType {
  id: string
  study_session_id: string
  question: string
  answer: string
  status: 'new' | 'learning' | 'known'
  ease_factor?: number
  review_interval?: number
  repetitions?: number
  last_recall_rating?: 'easy' | 'good' | 'hard' | 'forgot'
  last_reviewed_at?: string
  next_review_at?: string
}

export default function FlashcardsPage({ params }: PageProps) {
  const { moduleId } = use(params)
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleContent, setModuleContent] = useState('')
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCard, setNewCard] = useState({ question: '', answer: '' })
  const [showSummary, setShowSummary] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    totalCards: 0,
    knownCards: 0,
    learningCards: 0,
    newCards: 0
  })
  const [isWriteMode, setIsWriteMode] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return

      const supabase = createClient()

      try {
        // Fetch study session and module details
        const { data: studySession, error: sessionError } = await supabase
          .from('study_sessions')
          .select('id, details')
          .eq('module_title', moduleId)
          .eq('user_id', session.user.id)
          .single()

        if (sessionError) throw sessionError

        setStudySessionId(studySession.id)
        setModuleTitle(studySession.details.title)
        setModuleContent(studySession.details.content)

        // Fetch existing flashcards
        const { data: existingCards, error: cardsError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('study_session_id', studySession.id)
          .order('next_review_at', { ascending: true, nullsFirst: true })

        if (cardsError) throw cardsError

        if (existingCards) {
          setFlashcards(existingCards)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [moduleId, session])

  const generateFlashcards = async () => {
    if (!session?.user?.id || !moduleContent || !studySessionId) return

    setIsGenerating(true)

    try {
      // Generate flashcards using OpenAI
      const response = await fetch('/api/openai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: moduleContent,
          prompt: `You are an expert teacher creating flashcards for students. Create 5-10 high-quality flashcards based on the provided content. 
          Each flashcard should test understanding of key concepts, not just memorization of facts.`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate flashcards')
      }

      const flashcardsData = await response.json()

      // Insert flashcards directly using Supabase client
      const supabase = createClient()
      const { data: newCards, error: insertError } = await supabase
        .from('flashcards')
        .insert(
          flashcardsData.flashcards.map((card: { question: string; answer: string }) => ({
            study_session_id: studySessionId,
            question: card.question,
            answer: card.answer,
            status: 'new'
          }))
        )
        .select()

      if (insertError) throw insertError

      if (newCards) {
        setFlashcards(prev => [...prev, ...newCards])
      }
    } catch (error) {
      console.error('Error generating flashcards:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddCard = async () => {
    if (!studySessionId || !newCard.question || !newCard.answer) return

    const supabase = createClient()
    try {
      // Initialize spaced repetition parameters for new card
      const spacedRepParams = initializeSpacedRepetition()

      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          study_session_id: studySessionId,
          question: newCard.question,
          answer: newCard.answer,
          status: 'new',
          ...spacedRepParams
        })
        .select()
        .single()

      if (error) throw error

      setFlashcards(prev => [...prev, data])
      setNewCard({ question: '', answer: '' })
      setShowAddCard(false)
    } catch (error) {
      console.error('Error adding flashcard:', error)
    }
  }

  const handleRecallRating = async (rating: 'easy' | 'good' | 'hard' | 'forgot') => {
    if (!flashcards[currentIndex]) return

    const supabase = createClient()
    const flashcard = flashcards[currentIndex]

    try {
      // Calculate next review parameters using SM-2 algorithm
      const nextReview = calculateNextReview({
        ease_factor: flashcard.ease_factor || 2.5,
        review_interval: flashcard.review_interval || 0,
        repetitions: flashcard.repetitions || 0,
        last_recall_rating: rating
      })

      const nextReviewDate = getNextReviewDate(nextReview.review_interval)

      // Update flashcard with new spaced repetition parameters
      const { error } = await supabase
        .from('flashcards')
        .update({ 
          ease_factor: nextReview.ease_factor,
          review_interval: nextReview.review_interval,
          repetitions: nextReview.repetitions,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReviewDate,
          last_recall_rating: rating,
          // Update status based on recall rating
          status: rating === 'easy' ? 'known' : rating === 'forgot' ? 'new' : 'learning'
        })
        .eq('id', flashcard.id)

      if (error) throw error

      // Update local state
      setFlashcards(prev => prev.map(card => 
        card.id === flashcard.id 
          ? { 
              ...card, 
              ease_factor: nextReview.ease_factor,
              review_interval: nextReview.review_interval,
              repetitions: nextReview.repetitions,
              last_reviewed_at: new Date().toISOString(),
              next_review_at: nextReviewDate,
              last_recall_rating: rating,
              status: rating === 'easy' ? 'known' : rating === 'forgot' ? 'new' : 'learning'
            } 
          : card
      ))

      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Show session summary
        const stats = {
          totalCards: flashcards.length,
          knownCards: flashcards.filter(card => card.status === 'known').length,
          learningCards: flashcards.filter(card => card.status === 'learning').length,
          newCards: flashcards.filter(card => card.status === 'new').length
        }
        setSessionStats(stats)
        setShowSummary(true)
      }
    } catch (error) {
      console.error('Error updating flashcard:', error)
    }
  }

  const handleReviewCategory = (category: 'new' | 'learning' | 'all') => {
    // Filter cards based on category
    let cardsToReview = flashcards
    if (category === 'new') {
      cardsToReview = flashcards.filter(card => card.status === 'new')
    } else if (category === 'learning') {
      cardsToReview = flashcards.filter(card => card.status === 'learning')
    } else if (category === 'all') {
      cardsToReview = flashcards.filter(card => card.status !== 'known')
    }

    // Shuffle the cards for variety
    const shuffledCards = [...cardsToReview].sort(() => Math.random() - 0.5)
    
    // Update flashcards array and reset index
    setFlashcards(shuffledCards)
    setCurrentIndex(0)
    setShowSummary(false)
  }

  // Filter flashcards that are due for review
  const getDueFlashcards = () => {
    const now = new Date()
    return flashcards.filter(card => {
      if (!card.next_review_at) return true // New cards are always due
      return new Date(card.next_review_at) <= now
    })
  }

  if (isLoadingAuth || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Link href={`/modules/${moduleId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Module
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button
                  variant={isWriteMode ? "outline" : "default"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsWriteMode(false)}
                >
                  <FlipHorizontal className="h-4 w-4" /> Flip Mode
                </Button>
                <Button
                  variant={isWriteMode ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsWriteMode(true)}
                >
                  <PenLine className="h-4 w-4" /> Write Mode
                </Button>
                <Button
                  onClick={generateFlashcards}
                  className="gap-2"
                  disabled={isGenerating}
                >
                  <Wand2 className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Auto-Generate'}
                </Button>
              </div>
            </div>
            <h2 className="text-sm font-medium text-text-light mb-2">Flashcards</h2>
            <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
          </div>

          {showAddCard && (
            <Card className="p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add New Flashcard</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddCard(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Question</label>
                  <Textarea
                    value={newCard.question}
                    onChange={(e) => setNewCard(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter your question"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Answer</label>
                  <Textarea
                    value={newCard.answer}
                    onChange={(e) => setNewCard(prev => ({ ...prev, answer: e.target.value }))}
                    placeholder="Enter your answer"
                    className="w-full"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddCard}
                    disabled={!newCard.question || !newCard.answer}
                  >
                    Add Card
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="mt-8">
            {flashcards.length === 0 ? (
              <div className="text-center py-8">
                <h2 className="text-xl font-semibold mb-4">No flashcards yet</h2>
                <p className="text-text-light mb-6">
                  Create flashcards manually or generate them automatically from your module content.
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setShowAddCard(true)}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Manually
                  </Button>
                  <Button
                    onClick={generateFlashcards}
                    disabled={isGenerating}
                    size="lg"
                    className="gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    {isGenerating ? 'Generating...' : 'Auto-Generate'}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {isWriteMode ? (
                  <WriteMode
                    question={flashcards[currentIndex].question}
                    answer={flashcards[currentIndex].answer}
                    onResult={handleRecallRating}
                    currentIndex={currentIndex}
                    totalCards={flashcards.length}
                    dueDate={flashcards[currentIndex].next_review_at}
                  />
                ) : (
                  <Flashcard
                    question={flashcards[currentIndex].question}
                    answer={flashcards[currentIndex].answer}
                    onRecallRating={handleRecallRating}
                    currentIndex={currentIndex}
                    totalCards={flashcards.length}
                    dueDate={flashcards[currentIndex].next_review_at}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <SessionSummary
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        stats={sessionStats}
        onReviewCategory={handleReviewCategory}
      />
    </div>
  )
} 