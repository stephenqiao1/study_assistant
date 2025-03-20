"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import CreateFlashcardModal from "./CreateFlashcardModal";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  created_at?: string;
  updated_at?: string;
  difficulty?: number;
  last_reviewed?: string;
  last_reviewed_at?: string;
  review_count?: number;
  repetitions?: number;
  last_recall_rating?: 'easy' | 'good' | 'hard' | 'forgot';
  module_id?: string;
  user_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  due_date?: string;
}

interface FlashcardModuleProps {
  moduleId: string;
  userId: string;
  isPremiumUser: boolean;
  selectedNote?: any;
  isNoteSpecific?: boolean;
  onGenerateAIFlashcards: () => void;
  isGeneratingFlashcards: boolean;
}

export default function FlashcardModule({
  moduleId,
  userId,
  isPremiumUser,
  selectedNote,
  isNoteSpecific = false,
  onGenerateAIFlashcards,
  isGeneratingFlashcards
}: FlashcardModuleProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filter, setFilter] = useState<'all' | 'difficult' | 'easy' | 'new' | 'mastered'>('all');
  const [sort, setSort] = useState<'default' | 'newest' | 'oldest' | 'difficulty'>('default');
  const [isCreateFlashcardModalOpen, setIsCreateFlashcardModalOpen] = useState(false);

  useEffect(() => {
    fetchFlashcards();
    fetchFlashcardCount();
  }, [moduleId, filter, sort]);

  const fetchFlashcardCount = async () => {
    if (!moduleId || !userId) return;
    
    try {
      const { count, error } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('study_session_id', moduleId)
        .eq('user_id', userId)
        .not('last_reviewed_at', 'is', null); // Count only cards that have been reviewed
        
      if (error) throw error;
      
      setFlashcardCount(count || 0);
    } catch (error) {
      console.error('Error fetching flashcard count:', error);
    }
  };

  const fetchFlashcards = async () => {
    try {
      const response = await fetch(`/api/flashcards?moduleId=${moduleId}&filter=${filter}&sort=${sort}${selectedNote ? `&noteId=${selectedNote.id}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch flashcards');
      const data = await response.json();
      setFlashcards(data);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch flashcards",
        variant: "destructive",
      });
    }
  };

  const handleFilterChange = (value: 'all' | 'difficult' | 'easy' | 'new' | 'mastered') => {
    setFilter(value);
    setCurrentIndex(0);
  };

  const handleSortChange = (value: 'default' | 'newest' | 'oldest' | 'difficulty') => {
    setSort(value);
    setCurrentIndex(0);
  };

  const handleRecallRating = async (rating: 'easy' | 'good' | 'hard' | 'forgot') => {
    if (!flashcards[currentIndex]) return;

    try {
      const response = await fetch(`/api/flashcards/${flashcards[currentIndex].id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) throw new Error('Failed to update flashcard rating');

      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      }

      await fetchFlashcards(); // Refresh the list
    } catch (error) {
      console.error('Error updating flashcard rating:', error);
      toast({
        title: "Error",
        description: "Failed to update flashcard rating",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Flashcards</h1>
          {isNoteSpecific && selectedNote && (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              from note: {selectedNote.title}
            </span>
          )}
          <div className="flex flex-col">
            <Badge 
              variant="secondary"
              className="text-sm dark:bg-slate-700 dark:text-white"
            >
              {flashcardCount} Reviews
            </Badge>
          </div>
        </div>
      </div>

      <CreateFlashcardModal
        isOpen={isCreateFlashcardModalOpen}
        onClose={() => setIsCreateFlashcardModalOpen(false)}
        moduleId={moduleId}
        userId={userId}
        onFlashcardCreated={() => {
          fetchFlashcards();
          fetchFlashcardCount();
        }}
      />
      {flashcards.length > 0 ? (
        <div className="space-y-4">
          {/* Flashcard display and controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="space-x-2">
                <Button
                  variant={filter === 'all' ? "default" : "outline"}
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'difficult' ? "default" : "outline"}
                  onClick={() => handleFilterChange('difficult')}
                >
                  Difficult
                </Button>
                {/* Add other filter buttons */}
              </div>
              <div className="space-x-2">
                <Button
                  variant={sort === 'default' ? "default" : "outline"}
                  onClick={() => handleSortChange('default')}
                >
                  Default
                </Button>
                {/* Add other sort buttons */}
              </div>
            </div>

            {/* Current flashcard */}
            <div 
              className="min-h-[200px] p-6 border rounded-lg cursor-pointer mb-4"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {isFlipped ? flashcards[currentIndex].answer : flashcards[currentIndex].question}
            </div>

            {/* Rating buttons */}
            <div className="flex justify-center space-x-2">
              <Button onClick={() => handleRecallRating('forgot')} variant="outline">Forgot</Button>
              <Button onClick={() => handleRecallRating('hard')} variant="outline">Hard</Button>
              <Button onClick={() => handleRecallRating('good')}>Good</Button>
              <Button onClick={() => handleRecallRating('easy')} variant="outline">Easy</Button>
            </div>
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
                  if (selectedNote && isNoteSpecific) {
                    onGenerateAIFlashcards();
                  }
                }}
                disabled={isGeneratingFlashcards || !selectedNote || !isNoteSpecific}
              >
                {isGeneratingFlashcards ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  "Generate from Note"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 