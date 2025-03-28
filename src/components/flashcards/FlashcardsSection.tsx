import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import Flashcard from '@/components/flashcards/Flashcard'
import { X, Plus, ChevronLeft, ChevronRight, Shuffle, Keyboard, BarChart, Sparkles, Loader2 } from 'lucide-react'

type ActiveSection = 'module' | 'notes' | 'teachback' | 'flashcards' | 'formulas' | 'videos' | 'practice' | 'noteFlashcards' | 'grades' | 'reminders';

interface NoteType {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  images?: {
    url: string;
    name: string;
    size: number;
    type: string;
    created_at: string;
  }[];
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  source_note_id: string;
  status: 'new' | 'learning' | 'known';
  last_recall_rating?: 'easy' | 'good' | 'hard' | 'forgot';
  next_review_at?: string;
  created_at: string;
}

interface FlashcardsSectionProps {
  flashcards: Flashcard[];
  selectedNote: NoteType | null;
  filterFlashcardsByNoteId: string | null;
  setFilterFlashcardsByNoteId: (id: string | null) => void;
  fetchFlashcards: () => Promise<void>;
  isLoadingFlashcards: boolean;
  isGeneratingFlashcards: boolean;
  handleAIFlashcardsClick: () => Promise<void>;
  handleCreateFlashcardClick: () => void;
  setActiveSection: (section: ActiveSection) => void;
  isPremiumUser: boolean;
  setShowUpgradeDialog: (show: boolean) => void;
  setIsCreateFlashcardModalOpen: (show: boolean) => void;
  activeNoteFlashcards: {
    noteId: string;
    noteTitle: string;
    flashcards: Flashcard[];
  } | null;
}

export default function FlashcardsSection({
  flashcards,
  selectedNote,
  filterFlashcardsByNoteId,
  setFilterFlashcardsByNoteId,
  fetchFlashcards,
  isLoadingFlashcards,
  isGeneratingFlashcards,
  handleAIFlashcardsClick,
  handleCreateFlashcardClick,
  setActiveSection,
  isPremiumUser,
  setShowUpgradeDialog,
  setIsCreateFlashcardModalOpen,
  activeNoteFlashcards
}: FlashcardsSectionProps) {
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showFlashcardStats, setShowFlashcardStats] = useState(false)
  const [flashcardFilterType, setFlashcardFilterType] = useState<'all' | 'difficult' | 'easy' | 'new' | 'mastered'>('all')
  const [flashcardSortType, setFlashcardSortType] = useState<'default' | 'newest' | 'oldest' | 'difficulty'>('default')
  const [filteredFlashcards, setFilteredFlashcards] = useState(flashcards)

  const shuffleDeck = () => {
    const shuffled = [...filteredFlashcards]
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    setFilteredFlashcards(shuffled)
    setCurrentFlashcardIndex(0)
  }

  // Update filtered flashcards when filter type changes
  useEffect(() => {
    let filtered = [...flashcards]

    // Apply filter based on filterFlashcardsByNoteId
    if (filterFlashcardsByNoteId) {
      filtered = filtered.filter(card => card.source_note_id === filterFlashcardsByNoteId)
    }

    // Apply filter based on flashcardFilterType
    switch (flashcardFilterType) {
      case 'difficult':
        filtered = filtered.filter(card => 
          card.last_recall_rating === 'hard' || card.last_recall_rating === 'forgot'
        )
        break
      case 'easy':
        filtered = filtered.filter(card => 
          card.last_recall_rating === 'easy'
        )
        break
      case 'new':
        filtered = filtered.filter(card => 
          card.status === 'new'
        )
        break
      case 'mastered':
        filtered = filtered.filter(card => 
          card.status === 'known'
        )
        break
    }

    // Apply sorting
    switch (flashcardSortType) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'difficulty':
        filtered.sort((a, b) => {
          const getDifficultyScore = (card: Flashcard) => {
            switch (card.last_recall_rating) {
              case 'forgot': return 0
              case 'hard': return 1
              case 'good': return 2
              case 'easy': return 3
              default: return 0
            }
          }
          return getDifficultyScore(a) - getDifficultyScore(b)
        })
        break
      default:
        // Default sorting: due cards first, then by status (new > learning > known)
        filtered.sort((a, b) => {
          const now = new Date()
          const aDue = a.next_review_at ? new Date(a.next_review_at) <= now : true
          const bDue = b.next_review_at ? new Date(b.next_review_at) <= now : true
          
          if (aDue !== bDue) return bDue ? 1 : -1
          
          const getStatusScore = (card: Flashcard) => {
            switch (card.status) {
              case 'new': return 0
              case 'learning': return 1
              case 'known': return 2
              default: return 3
            }
          }
          return getStatusScore(a) - getStatusScore(b)
        })
    }

    setFilteredFlashcards(filtered)
    setCurrentFlashcardIndex(0)
  }, [flashcards, flashcardFilterType, flashcardSortType, filterFlashcardsByNoteId])

  const handleFilterChange = (value: 'all' | 'difficult' | 'easy' | 'new' | 'mastered') => {
    setFlashcardFilterType(value)
  }

  const handleSortChange = (value: 'default' | 'newest' | 'oldest' | 'difficulty') => {
    setFlashcardSortType(value)
  }

  const restartDeck = () => {
    setCurrentFlashcardIndex(0)
    // Reset to original order if we're in default sort mode
    if (flashcardSortType === 'default') {
      const originalOrder = [...flashcards]
      let filtered = originalOrder
      if (filterFlashcardsByNoteId) {
        filtered = filtered.filter(card => card.source_note_id === filterFlashcardsByNoteId)
      }
      // Apply current filter type
      switch (flashcardFilterType) {
        case 'difficult':
          filtered = filtered.filter(card => 
            card.last_recall_rating === 'hard' || card.last_recall_rating === 'forgot'
          )
          break
        case 'easy':
          filtered = filtered.filter(card => 
            card.last_recall_rating === 'easy'
          )
          break
        case 'new':
          filtered = filtered.filter(card => 
            card.status === 'new'
          )
          break
        case 'mastered':
          filtered = filtered.filter(card => 
            card.status === 'known'
          )
          break
      }
      setFilteredFlashcards(filtered)
    }
  }

  const handleRecallRating = (_rating: 'easy' | 'good' | 'hard' | 'forgot') => {
    // Implement recall rating logic
  }

  const _flashcardCount = flashcards.length

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Flashcards</h1>
          </div>
          {filterFlashcardsByNoteId && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs self-start"
              onClick={() => {
                setFilterFlashcardsByNoteId(null);
                fetchFlashcards();
              }}
            >
              <X className="h-3 w-3 mr-1" /> Clear note filter
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <HoverCard open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}>
                <Keyboard className="h-4 w-4" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent align="end" className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Keyboard Shortcuts</h4>
                  {!isPremiumUser && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-amber-900 dark:text-amber-300">
                      Basic Shortcuts
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Space</div><div>Flip card</div>
                    <div>→</div><div>Next card</div>
                    <div>←</div><div>Previous card</div>
                    <div>1</div><div>Rate as Forgot</div>
                    <div>2</div><div>Rate as Hard</div>
                    <div>3</div><div>Rate as Good</div>
                    <div>4</div><div>Rate as Easy</div>
                  </div>
                </div>
                {!isPremiumUser && (
                  <div className="text-xs mt-2 pt-2 border-t text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>Premium users get advanced shortcuts and custom key bindings</span>
                    </div>
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-xs text-amber-600 font-medium mt-1"
                      onClick={() => {
                        setShowKeyboardShortcuts(false);
                        setShowUpgradeDialog(true);
                      }}
                    >
                      Upgrade Now
                    </Button>
                  </div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowFlashcardStats(!showFlashcardStats)}
          >
            <BarChart className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              if (selectedNote && activeNoteFlashcards && activeNoteFlashcards.flashcards.some(card => card.source_note_id === selectedNote.id)) {
                handleAIFlashcardsClick();
              }
            }}
            disabled={isGeneratingFlashcards || !selectedNote}
          >
            {isGeneratingFlashcards ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Generate from Note
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCreateFlashcardClick}
          >
            <Plus className="h-4 w-4 mr-1" /> Create Card
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveSection('notes')}
          >
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </div>
      {isLoadingFlashcards ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Loading flashcards...</p>
        </div>
      ) : filteredFlashcards.length > 0 ? (
        <div className="space-y-4 relative">
          <div className="flex justify-between items-center z-10">
            <div className="flex space-x-2">
              <Select value={flashcardFilterType} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter cards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  <SelectItem value="difficult">Difficult</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="mastered">Mastered</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={flashcardSortType} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort cards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="difficulty">By Difficulty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2 relative z-20">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  shuffleDeck();
                }}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                style={{ position: 'relative', zIndex: 30 }}
              >
                <Shuffle className="h-4 w-4 mr-1" /> Shuffle
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={restartDeck}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                style={{ position: 'relative', zIndex: 30 }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Restart
              </Button>
            </div>
          </div>
          
          <div className="h-[450px] flex flex-col items-center justify-center relative z-0">
            {filteredFlashcards.length > currentFlashcardIndex ? (
              <>
                <Flashcard 
                  question={filteredFlashcards[currentFlashcardIndex].question}
                  answer={filteredFlashcards[currentFlashcardIndex].answer}
                  onRecallRating={handleRecallRating}
                  currentIndex={currentFlashcardIndex}
                  totalCards={filteredFlashcards.length}
                  dueDate={filteredFlashcards[currentFlashcardIndex].next_review_at}
                />
                
                <div className="flex justify-center space-x-4 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentFlashcardIndex(prev => (prev - 1 + filteredFlashcards.length) % filteredFlashcards.length)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentFlashcardIndex(prev => (prev + 1) % filteredFlashcards.length)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-lg font-medium mb-4">No flashcards match your filter</p>
                <Button variant="outline" onClick={() => handleFilterChange('all')}>Show All Cards</Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center py-10">
            <p className="text-xl font-medium mb-2">No flashcards yet</p>
            <p className="text-gray-500 mb-6">Create flashcards to test your knowledge</p>
            <div className="flex flex-col gap-3 items-center">
              <Button 
                onClick={() => setIsCreateFlashcardModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Create Manually
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  if (selectedNote && activeNoteFlashcards && activeNoteFlashcards.flashcards.some(card => card.source_note_id === selectedNote.id)) {
                    handleAIFlashcardsClick();
                  }
                }}
                disabled={isGeneratingFlashcards || !selectedNote}
              >
                {isGeneratingFlashcards ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Generate from Note
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Show active note flashcards if they exist */}
      {selectedNote && activeNoteFlashcards && activeNoteFlashcards.flashcards.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Flashcards for {selectedNote.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterFlashcardsByNoteId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeNoteFlashcards.flashcards.map((card) => (
              <Flashcard
                key={card.id}
                question={card.question}
                answer={card.answer}
                onRecallRating={handleRecallRating}
                currentIndex={0}
                totalCards={1}
                dueDate={card.next_review_at}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 