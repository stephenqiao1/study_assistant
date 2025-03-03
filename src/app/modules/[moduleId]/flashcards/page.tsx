'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { ArrowLeft, Plus, Wand2, X, PenLine, FlipHorizontal, BookOpen, CheckCircle, Pencil, Trash2 } from 'lucide-react'
import Flashcard from '@/components/flashcards/Flashcard'
import WriteMode from '@/components/flashcards/WriteMode'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { calculateNextReview, getNextReviewDate, initializeSpacedRepetition } from '@/utils/spaced-repetition'
import SessionSummary from '@/components/flashcards/SessionSummary'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useStudyDuration } from '@/hooks/useStudyDuration'
import { useSearchParams, useRouter } from 'next/navigation'
import { _NoteType as _NoteType } from '@/types'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import ReactMarkdown from 'react-markdown'
import remarkMathPlugin from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Pluggable } from 'unified'
import 'katex/dist/katex.min.css'

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
  source_note_id?: string
  source_note?: {
    id: string
    title: string
  } | null
}

// Properly type the import to fix the error
const remarkMath = remarkMathPlugin as Pluggable

// Add this utility function to safely process LaTeX in flashcard content
const prepareLatexContent = (content: string): string => {
  if (!content) return '';
  
  // Make sure we're working with a string
  const safeContent = String(content);
  
  // Look for existing LaTeX patterns and make sure they're properly formatted
  return safeContent
    // Make sure math delimiters have proper spacing
    .replace(/\$\$/g, '$ $')  // Add space between consecutive $ signs
    .replace(/\$ \$/g, '$$')  // Then convert back to double $ for block math
    // Ensure there's space around inline math
    .replace(/([^\s\\])\$/g, '$1 $')
    .replace(/\$([^\s\\])/g, '$ $1');
};

// Function to render text with LaTeX
const renderWithLatex = (content: string) => {
  try {
    // Check if content is empty or undefined
    if (!content) return <span>No content</span>;
    
    // Make sure we're working with a string
    const safeContent = String(content);
    
    // Make sure LaTeX delimiters are properly balanced
    const processedContent = safeContent
      // Replace any stray $ characters that might not be LaTeX with escaped ones
      .replace(/\$/g, '\\$')
      // Then restore actual LaTeX delimiters
      .replace(/\\\$\\\$(.*?)\\\$\\\$/g, '$$$$1$$')  // Block math
      .replace(/\\\$(.*?)\\\$/g, '$1');  // Inline math
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        className="prose dark:prose-invert max-w-none"
      >
        {processedContent}
      </ReactMarkdown>
    );
  } catch (error) {
    console.error('Error rendering LaTeX:', error);
    // Fallback to plain text if LaTeX rendering fails
    return <span>{content}</span>;
  }
};

// Add this new component for managing flashcards
const ManageFlashcardsSection = ({ 
  flashcards, 
  onEdit, 
  onDelete 
}: { 
  flashcards: FlashcardType[], 
  onEdit: (card: FlashcardType) => void,
  onDelete: (id: string) => void 
}) => {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-2xl font-semibold">Manage Flashcards</h2>
      {flashcards.length === 0 ? (
        <p className="text-gray-500">No flashcards available. Create some flashcards to see them here.</p>
      ) : (
        <div className="space-y-4">
          {flashcards.map(card => (
            <div key={card.id} className="border rounded-lg p-4 flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium mb-2">Question:</div>
                <div className="mb-4 prose dark:prose-invert">{renderWithLatex(card.question)}</div>
                <div className="font-medium mb-2">Answer:</div>
                <div className="prose dark:prose-invert">{renderWithLatex(card.answer)}</div>
                {card.status && (
                  <div className="mt-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      card.status === 'known' ? 'bg-green-100 text-green-800' :
                      card.status === 'learning' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {card.status}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(card)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => onDelete(card.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function FlashcardsPage({ params }: PageProps) {
  // Unwrap the params Promise with React.use()
  const resolvedParams = use(params);
  const { moduleId } = resolvedParams;
  
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const { auto_flashcards_enabled, isLoading: isLoadingUsage } = useUsageLimits()
  const router = useRouter();
  const searchParams = useSearchParams()
  const noteId = searchParams.get('noteId')
  
  // Set showForm directly from the URL
  const showForm = searchParams.get('showForm') === 'true'
  
  
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [moduleTitle, setModuleTitle] = useState('')
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [newCard, setNewCard] = useState<{
    question: string;
    answer: string;
    source_note_id: string | null;
  }>({ question: '', answer: '', source_note_id: null });
  const [showSummary, setShowSummary] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    totalCards: 0,
    knownCards: 0,
    learningCards: 0,
    newCards: 0
  })
  const [isWriteMode, setIsWriteMode] = useState(false)
  const [sourceNoteTitle, setSourceNoteTitle] = useState('')
  const [isAddSuccess, setIsAddSuccess] = useState(false)
  const [lastAddedCard, setLastAddedCard] = useState<{question: string, answer: string}>({question: '', answer: ''})
  const { toast } = useToast()

  // Add state for editing flashcards
  const [isEditing, setIsEditing] = useState(false)
  const [editingFlashcard, setEditingFlashcard] = useState<FlashcardType | null>(null)

  // Add study mode state
  const [isStudyMode, setIsStudyMode] = useState(false)

  // Function to explicitly show the form by updating the URL
  const showCardCreationForm = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('showForm', 'true')
    router.replace(`/modules/${moduleId}/flashcards?${params.toString()}`, { scroll: false })
  }, [moduleId, router, searchParams])

  // Function to explicitly hide the form by updating the URL
  const hideCardCreationForm = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('showForm')
    router.replace(`/modules/${moduleId}/flashcards?${params.toString()}`, { scroll: false })
    setNewCard({ question: '', answer: '', source_note_id: null })
  }, [moduleId, router, searchParams])

  // Function to toggle card creation form
  const toggleCardCreationForm = () => {
    showCardCreationForm();
  }

  // Track study duration
  useStudyDuration(studySessionId || '', 'flashcards')

  useEffect(() => {
    
    const fetchData = async () => {
      if (!session?.user?.id) return

      const supabase = await createClient()

      try {
        // Fetch study session and module details
        const { data: studySession, error: sessionError } = await supabase
          .from('study_sessions')
          .select('id, details, module_title')
          .eq('id', moduleId)
          .eq('user_id', session.user.id)
          .single()

        if (sessionError) throw sessionError

        setStudySessionId(studySession.id)
        setModuleTitle(studySession.details.title)

        // Fetch existing flashcards
        const { data: existingCards, error: cardsError } = await supabase
          .from('flashcards')
          .select(`
            *,
            source_note:source_note_id (
              id,
              title
            )
          `)
          .eq('study_session_id', moduleId)
          .order('next_review_at', { ascending: true, nullsFirst: true })

        if (cardsError) throw cardsError

        if (existingCards) {
          setFlashcards(existingCards)
        }

        // If a noteId is provided in the URL, fetch that note
        if (noteId) {
          const { data: note, error: noteError } = await supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .single()

          if (noteError) {
            console.error('Error fetching note:', noteError)
          } else if (note) {
            
            // Pre-populate the flashcard form with content from the note
            // Create a more natural question from the note title
            let question = note.title;
            
            // If the title is not a question already, transform it into one
            if (!question.endsWith('?')) {
              // Check if the title is very short (likely a concept or term)
              if (question.split(' ').length <= 3) {
                question = `What is ${question}?`;
              } else {
                // For longer titles, try to make it into a complete question
                question = `${question}?`;
              }
            }
            
            // If the content is very long, truncate it to a reasonable size
            let answer = note.content;
            if (answer.length > 500) {
              answer = answer.substring(0, 497) + '...';
            }
            
            // Update the card content
            setNewCard({
              question,
              answer,
              source_note_id: note.id
            });
            
            // Store note title
            setSourceNoteTitle(note.title);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [moduleId, session, noteId])

  // Add function to handle editing a flashcard
  const handleEditFlashcard = (flashcard: FlashcardType) => {
    setEditingFlashcard(flashcard)
    setNewCard({
      question: flashcard.question,
      answer: flashcard.answer,
      source_note_id: flashcard.source_note_id || null
    })
    setIsEditing(true)
    toggleCardCreationForm()
  }

  // Update saveFlashcard function to handle both editing and creating
  const saveFlashcard = async (flashcard: Partial<FlashcardType>) => {
    try {
      // Process LaTeX content if present
      if (flashcard.question) {
        flashcard.question = prepareLatexContent(flashcard.question);
      }
      if (flashcard.answer) {
        flashcard.answer = prepareLatexContent(flashcard.answer);
      }
      
      // Continue with the existing code...
      // ... rest of the function
    } catch (error) {
      console.error('Error processing LaTeX content:', error)
    }
  }

  // Modify handleAddCard to support editing existing cards
  const handleAddCard = async () => {
    if (!studySessionId || !newCard.question || !newCard.answer || !session?.user?.id) return

    const supabase = await createClient()
    try {
      // Process LaTeX content
      const processedCard = {
        ...newCard,
        question: prepareLatexContent(newCard.question),
        answer: prepareLatexContent(newCard.answer)
      };

      if (isEditing && editingFlashcard) {
        // Update existing flashcard
        const { data, error } = await supabase
          .from('flashcards')
          .update({
            question: processedCard.question,
            answer: processedCard.answer,
            source_note_id: processedCard.source_note_id || null,
          })
          .eq('id', editingFlashcard.id)
          .eq('user_id', session.user.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating flashcard:', error)
          toast({
            title: "Error",
            description: "Failed to update flashcard",
            variant: "destructive"
          })
          return
        }

        // Update the flashcards array with the updated card
        setFlashcards(flashcards.map(f => 
          f.id === editingFlashcard.id ? data : f
        ))

        // Reset editing state
        setIsEditing(false)
        setEditingFlashcard(null)

        toast({
          title: "Flashcard Updated",
          description: "Your flashcard has been updated successfully."
        })
      } else {
        // Initialize spaced repetition parameters for new card
        const spacedRepParams = initializeSpacedRepetition()

        // Insert new flashcard
        const { data, error } = await supabase
          .from('flashcards')
          .insert({
            module_title: moduleId,
            study_session_id: moduleId,
            user_id: session.user.id,
            question: processedCard.question,
            answer: processedCard.answer,
            status: 'new',
            source_note_id: processedCard.source_note_id || null,
            ...spacedRepParams
          })
          .select()
          .single()

        if (error) {
          console.error('Error adding flashcard:', error)
          toast({
            title: "Error",
            description: "Failed to add flashcard",
            variant: "destructive"
          })
          return
        }

        // Add newly created flashcard to the list
        setFlashcards([data, ...flashcards])
        toast({
          title: "Flashcard Added",
          description: "Your flashcard has been added successfully."
        })
      }
      
      // Reset form
      setNewCard({ question: '', answer: '', source_note_id: null })
      setSourceNoteTitle('')
      hideCardCreationForm()
      setIsAddSuccess(true)
      setLastAddedCard({
        question: processedCard.question, 
        answer: processedCard.answer
      })
    } catch (error) {
      console.error('Error saving flashcard:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the flashcard",
        variant: "destructive"
      })
    }
  }

  const generateFlashcards = async () => {
    if (!session?.user?.id || !studySessionId || !auto_flashcards_enabled) return

    setIsGenerating(true)

    try {
      // Generate flashcards using OpenAI
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          moduleTitle,
          moduleId,
          content: "Generate flashcards for " + moduleTitle
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate flashcards')
      }

      // Fetch the newly generated cards
      const supabase = await createClient()
      const { data: newCards, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('study_session_id', moduleId)
        .order('next_review_at', { ascending: true, nullsFirst: true })

      if (fetchError) throw fetchError

      if (newCards) {
        // Process cards with proper LaTeX formatting
        const processedCards = newCards.map(card => ({
          ...card,
          question: prepareLatexContent(card.question),
          answer: prepareLatexContent(card.answer)
        }));
        
        // Use the processed cards
        for (const card of processedCards) {
          // ... existing insertion code with processed cards
        }
      }
    } catch (error) {
      console.error('Error generating flashcards:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRecallRating = async (rating: 'easy' | 'good' | 'hard' | 'forgot') => {
    if (!flashcards[currentIndex]) return

    const supabase = await createClient()
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

  const handleReviewCategory = (category: 'new' | 'learning' | 'all' | 'due') => {
    // Filter cards based on category
    let cardsToReview = flashcards
    if (category === 'new') {
      cardsToReview = flashcards.filter(card => card.status === 'new')
    } else if (category === 'learning') {
      cardsToReview = flashcards.filter(card => card.status === 'learning')
    } else if (category === 'due') {
      cardsToReview = getDueFlashcards()
    }
    // For 'all' category, no filtering is needed - we show all cards
    // Note: Previous implementation was filtering out 'known' cards

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

  // Add a function to delete flashcards
  const handleDeleteFlashcard = async (id: string) => {
    if (!session?.user?.id) return;
    
    try {
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
        
      if (error) {
        console.error('Error deleting flashcard:', error);
        toast({
          title: "Error",
          description: "Failed to delete flashcard",
          variant: "destructive"
        });
        return;
      }
      
      // Remove the deleted flashcard from state
      setFlashcards(flashcards.filter(card => card.id !== id));
      
      toast({
        title: "Flashcard Deleted",
        description: "The flashcard has been successfully deleted."
      });
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoadingAuth || isLoadingUsage || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session) {
    return null // Will redirect in useRequireAuth
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Link href={`/modules/${moduleId}`} className="flex items-center text-text hover:text-primary mr-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Module
            </Link>
            <h1 className="text-2xl font-bold">Flashcards {moduleTitle ? `- ${moduleTitle}` : ''}</h1>
          </div>
          <div className="flex space-x-3">
            {!isStudyMode && !showSummary && (
              <Button onClick={() => showCardCreationForm()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Card
              </Button>
            )}
            {!isStudyMode && !showSummary && flashcards.length > 0 && (
              <Button 
                onClick={() => setIsStudyMode(true)}
                variant="default"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Study Mode
              </Button>
            )}
            {isStudyMode && (
              <Button 
                onClick={() => setIsStudyMode(false)}
                variant="outline"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Manage Cards
              </Button>
            )}
          </div>
        </div>

        {/* Add button to create from note when note content is loaded but form is hidden */}
        {noteId && !showForm && sourceNoteTitle && (
          <div className="mb-8 bg-primary/10 rounded-lg p-5 border border-primary/20 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-primary mt-0.5 bg-primary/10 p-2.5 rounded-full">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg mb-1">Content from Note: <span className="text-primary">{sourceNoteTitle}</span></h3>
                <p className="text-muted-foreground mb-4">
                  Note content is ready to be converted into a flashcard. Click below to create a flashcard based on this note.
                </p>
                <Button 
                  onClick={showCardCreationForm}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Flashcard from Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Show information when creating a flashcard from a note */}
        {noteId && showForm && sourceNoteTitle && (
          <div className="mb-8 bg-primary/10 rounded-lg p-5 border border-primary/20 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-primary mt-0.5 bg-primary/10 p-2.5 rounded-full">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-lg mb-1">Creating Flashcard from Note: <span className="text-primary">{sourceNoteTitle}</span></h3>
                <p className="text-muted-foreground">
                  You're creating a flashcard based on your note. The content has been pre-filled for you,
                  but feel free to edit it to make the perfect flashcard.
                </p>
              </div>
            </div>
          </div>
        )}

        {!auto_flashcards_enabled && (
          <Alert className="mb-8 shadow-sm border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Auto-generation of flashcards is a premium feature. 
              <Link href="/pricing" className="ml-2 underline font-medium">
                Upgrade your plan
              </Link> to unlock this feature.
            </AlertDescription>
          </Alert>
        )}

        {showForm && (
          <Card className="p-6 mb-8 border-primary/20 shadow-lg bg-background-card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Flashcard
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={hideCardCreationForm}
                className="hover:bg-destructive/10"
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {noteId && (
              <div className="mb-5 p-3 bg-primary/10 rounded-md border border-primary/20 flex items-center gap-2">
                <div className="text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Creating flashcard from note: <span className="text-primary">{sourceNoteTitle}</span></p>
                  <p className="text-xs text-muted-foreground">The content has been pre-filled from your selected note.</p>
                </div>
              </div>
            )}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-text">Question</label>
                <Textarea
                  value={newCard.question}
                  onChange={(e) => setNewCard(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter your question"
                  className="w-full min-h-[100px] focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text">Answer</label>
                <Textarea
                  value={newCard.answer}
                  onChange={(e) => setNewCard(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="Enter your answer"
                  className="w-full min-h-[150px] focus:border-primary"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleAddCard}
                  disabled={!newCard.question || !newCard.answer}
                  className="bg-primary hover:bg-primary/90 text-white px-6"
                >
                  Create Flashcard
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-8">
          {flashcards.length === 0 ? (
            <div className="text-center py-12 bg-background-card rounded-lg shadow-sm border border-border p-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <FlipHorizontal className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">No flashcards yet</h2>
              <p className="text-text-light mb-8 max-w-md mx-auto">
                Create flashcards manually or generate them automatically to help memorize key information from your module.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={showCardCreationForm}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Manually
                </Button>
                <Button
                  onClick={generateFlashcards}
                  disabled={isGenerating || !auto_flashcards_enabled}
                  size="lg"
                  className="gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Auto-Generate'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-background-card rounded-lg shadow-sm border border-border p-6">
              {/* Display source note if available */}
              {flashcards[currentIndex]?.source_note && (
                <div className="text-center mb-4 p-2 bg-primary/5 rounded-md">
                  <span className="text-sm text-primary flex items-center justify-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    From note: <span className="font-medium">{flashcards[currentIndex].source_note.title}</span>
                  </span>
                </div>
              )}
              
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
      </main>
      <Footer />
      {isStudyMode && showSummary && (
        <SessionSummary 
          isOpen={showSummary} 
          onClose={() => setShowSummary(false)} 
          stats={sessionStats}
          onReviewCategory={handleReviewCategory}
          onAddMoreFlashcards={() => {
            setIsStudyMode(false);
            setShowSummary(false);
            showCardCreationForm();
          }}
        />
      )}
      
      {/* Flashcard Created Success Dialog */}
      <Dialog open={isAddSuccess} onOpenChange={setIsAddSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Flashcard Created Successfully
            </DialogTitle>
            <DialogDescription>
              Your flashcard has been added to your deck and is ready for review.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-background/50 p-4 rounded-lg border border-border mb-4">
              <h3 className="font-medium text-sm text-text-light mb-1">Question:</h3>
              <p className="text-text">{lastAddedCard.question}</p>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h3 className="font-medium text-sm text-text-light mb-1">Answer:</h3>
              <p className="text-text">{lastAddedCard.answer}</p>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddSuccess(false);
                showCardCreationForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Another
            </Button>
            <Button
              onClick={() => {
                setIsAddSuccess(false);
                // If there are cards, set current index to 0 to start reviewing
                if (flashcards.length > 0) {
                  setCurrentIndex(0);
                }
              }}
              className="bg-primary"
            >
              Start Reviewing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Conditionally show the study interface or the management interface */}
      {isStudyMode ? (
        // Study interface (existing code)
        <div>
          {/* Your existing study mode UI */}
        </div>
      ) : (
        // Management interface
        <div>
          {/* Render the ManageFlashcardsSection when not in study mode */}
          {!showSummary && (
            <ManageFlashcardsSection 
              flashcards={flashcards} 
              onEdit={handleEditFlashcard} 
              onDelete={handleDeleteFlashcard} 
            />
          )}
        </div>
      )}
    </div>
  )
} 