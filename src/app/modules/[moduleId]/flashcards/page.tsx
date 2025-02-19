'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, LogOut, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface Flashcard {
  id: string
  study_session_id: string
  question: string
  answer: string
  status: 'new' | 'learning' | 'known'
  last_reviewed_at?: string
  next_review_at?: string
}

export default function FlashcardsPage({ params }: PageProps) {
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const { moduleId } = use(params)
  const [moduleTitle, setModuleTitle] = useState('')
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCard, setNewCard] = useState({ question: '', answer: '' })
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      try {
        // First get the study session ID for this module
        const { data: moduleData, error: moduleError } = await supabase
          .from('study_sessions')
          .select('id, details')
          .eq('module_title', moduleId)
          .single()

        if (moduleError) throw moduleError
        
        setModuleTitle(moduleData.details.title)
        setStudySessionId(moduleData.id)

        // Then fetch flashcards using the study session ID
        const { data: cards, error: cardsError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('study_session_id', moduleData.id)
          .order('created_at', { ascending: true })

        if (cardsError) throw cardsError
        setFlashcards(cards || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [moduleId])

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
    if (!flashcards[currentCardIndex]) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({
          status,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: new Date(Date.now() + (status === 'known' ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', flashcards[currentCardIndex].id)

      if (error) throw error

      // Move to next card
      handleNext()
    } catch (error) {
      console.error('Error updating flashcard:', error)
    }
  }

  const handleNext = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
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
      {/* Header */}
      <header className="fixed top-0 w-full bg-background-card/80 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">Academiq</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/modules" className="text-text hover:text-primary">Modules</Link>
              <Button 
                variant="ghost" 
                className="text-text hover:text-primary flex items-center gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Link href={`/modules/${moduleId}`}>
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Module
                  </Button>
                </Link>
              </div>
              <h2 className="text-sm font-medium text-text-light mb-2">Flashcards</h2>
              <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
            </div>
            <Button onClick={() => setShowAddCard(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Flashcard
            </Button>
          </div>

          {showAddCard ? (
            <Card className="p-6 mb-8 bg-background-card border-border">
              <h2 className="text-xl font-semibold mb-4 text-text">Add New Flashcard</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text">Question</label>
                  <Textarea
                    value={newCard.question}
                    onChange={(e) => setNewCard(prev => ({ ...prev, question: e.target.value }))}
                    className="w-full text-text bg-background"
                    rows={3}
                    placeholder="Enter your question"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text">Answer</label>
                  <Textarea
                    value={newCard.answer}
                    onChange={(e) => setNewCard(prev => ({ ...prev, answer: e.target.value }))}
                    className="w-full text-text bg-background"
                    rows={3}
                    placeholder="Enter your answer"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddCard(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCard} disabled={!newCard.question || !newCard.answer}>
                    Add Card
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {flashcards.length > 0 ? (
            <div className="space-y-8">
              {/* Flashcard Display */}
              <Card className="p-8 shadow-lg bg-background-card border-border">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-text">Progress</span>
                    <span className="text-sm font-medium text-text">{currentCardIndex + 1} of {flashcards.length}</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Flashcard */}
                <div 
                  className="min-h-[300px] flex items-center justify-center p-8 bg-background rounded-xl shadow-md border border-border cursor-pointer transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="w-full max-w-2xl">
                    <div className="text-sm font-medium text-primary mb-4 text-center">
                      {isFlipped ? 'Answer' : 'Question'}
                    </div>
                    <div className="text-2xl font-medium text-white dark:text-white text-center leading-relaxed whitespace-pre-wrap">
                      {isFlipped ? flashcards[currentCardIndex].answer : flashcards[currentCardIndex].question}
                    </div>
                    <div className="text-sm text-text-light text-center mt-4">
                      Click to {isFlipped ? 'see question' : 'reveal answer'}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious} 
                    disabled={currentCardIndex === 0}
                    className="w-full sm:w-auto bg-background border-border text-text hover:bg-background/90 disabled:opacity-50 disabled:hover:bg-background font-medium text-base"
                  >
                    ← Previous
                  </Button>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => handleUpdateStatus('learning')}
                      className="flex-1 sm:flex-initial border-2 border-yellow-500/50 bg-yellow-50/50 hover:bg-yellow-100/50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20 dark:text-yellow-400 font-medium"
                    >
                      Still Learning
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleUpdateStatus('known')}
                      className="flex-1 sm:flex-initial border-2 border-green-500/50 bg-green-50/50 hover:bg-green-100/50 text-green-700 dark:border-green-500/20 dark:bg-green-900/10 dark:hover:bg-green-900/20 dark:text-green-400 font-medium"
                    >
                      Know It
                    </Button>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={handleNext} 
                    disabled={currentCardIndex === flashcards.length - 1}
                    className="w-full sm:w-auto bg-background border-border text-text hover:bg-background/90 disabled:opacity-50 disabled:hover:bg-background font-medium text-base"
                  >
                    Next →
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center shadow-lg bg-background-card border-border">
              <h2 className="text-2xl font-semibold mb-4 text-text">No Flashcards Yet</h2>
              <p className="text-text-light mb-6 text-lg">
                Create your first flashcard to start studying!
              </p>
              <Button onClick={() => setShowAddCard(true)} className="gap-2 text-lg px-6 py-3 h-auto">
                <Plus className="h-5 w-5" />
                Add Your First Card
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
} 