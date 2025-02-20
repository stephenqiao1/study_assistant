'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { ArrowLeft, Plus, Wand2, X } from 'lucide-react'
import Flashcard from '@/components/flashcards/Flashcard'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface FlashcardType {
  id: string
  study_session_id: string
  question: string
  answer: string
  status: 'new' | 'learning' | 'known'
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

        if (cardsError) throw cardsError

        if (existingCards && existingCards.length > 0) {
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
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          study_session_id: studySessionId,
          question: newCard.question,
          answer: newCard.answer,
          status: 'new'
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

  const handleUpdateStatus = async (status: 'new' | 'learning' | 'known') => {
    if (!flashcards[currentIndex]) return

    const supabase = createClient()
    const flashcard = flashcards[currentIndex]

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ 
          status,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Next day
        })
        .eq('id', flashcard.id)

      if (error) throw error

      // Update local state
      setFlashcards(prev => prev.map(card => 
        card.id === flashcard.id ? { ...card, status } : card
      ))

      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    } catch (error) {
      console.error('Error updating flashcard status:', error)
    }
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
                  variant="outline"
                  onClick={() => setShowAddCard(true)}
                  className="gap-2"
                  disabled={showAddCard}
                >
                  <Plus className="h-4 w-4" />
                  Add Card
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

          <div className="bg-background-card rounded-xl shadow-sm border border-border p-8">
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
                <Flashcard
                  question={flashcards[currentIndex].question}
                  answer={flashcards[currentIndex].answer}
                  onUpdateStatus={handleUpdateStatus}
                  currentIndex={currentIndex}
                  totalCards={flashcards.length}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
} 