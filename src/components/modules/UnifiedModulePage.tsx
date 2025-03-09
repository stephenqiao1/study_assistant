'use client'

import React, { useState, useEffect, useCallback as _useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import {
  Layers as _Layers,
  ScrollText,
  Brain,
  Edit2,
  Save,
  X,
  Trash2,
  Tag,
  FileUp as _FileUp,
  Loader2,
  BookOpen,
  Plus,
  Shuffle,
  Filter as _Filter,
  BarChart,
  SortAsc as _SortAsc,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Sparkles,
  FileText,
  Crown as _Crown,
  Pencil,
  Trash,
  Search,
  CircleSlash,
  ExternalLink,
  Bookmark,
  Video,
  PenLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription as _CardDescription, CardHeader, CardTitle, CardFooter as _CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DraftEditor from "@/components/teach/DraftEditor";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger as _AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import PdfUploadModal from '@/components/modules/PdfUploadModal';
import Navbar from '@/components/layout/Navbar';
import 'katex/dist/katex.min.css';
import { renderToString } from 'katex';
import TextEditor from '@/components/teach/TextEditor';
import AudioRecorder from '@/components/teach/AudioRecorder';
import Flashcard from '@/components/flashcards/Flashcard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import FormulaStyles from '@/components/modules/FormulaStyles';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { cn } from "@/lib/utils";
import PracticeQuestions from './PracticeQuestions';

interface Module {
  id: string;
  module_title: string;
  started_at: string;
  details: {
    title: string;
    content: string;
    description?: string;
    available_tools?: string[];
  };
}

interface NoteType {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface UnifiedModulePageProps {
  module: Module;
  _allSessions: StudySession[];
  notes: NoteType[];
  isPremiumUser: boolean;
  userId: string;
}

interface StudySession {
  id: string;
  created_at: string;
  user_id: string;
  module_id: string;
  duration?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface _PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  studySessionId: string;
  onNotesCreated: (notes?: NoteType[]) => void;
}

// Add this interface near the top of the file with the other interfaces
interface TeachbackGrade {
  score: number;
  grade: number;
  feedback: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

// Add this interface near the top of the file with the other interfaces
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

// Add interfaces for videos and formulas
interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  channelTitle?: string;
  channel?: string;
  publishedAt?: string;
  published_at?: string;
  duration?: string;
  viewCount?: number;
  saved?: boolean;
  bookmarked?: boolean;
  videoUrl?: string;
  video_url?: string;
  video_id?: string;
}

interface Formula {
  id: string;
  latex: string;
  formula: string;
  description?: string;
  category: string;
  is_block: boolean;
  created_at?: string;
  user_id?: string;
  study_session_id?: string;
}

export default function UnifiedModulePage({ module, _allSessions, notes: initialNotes, isPremiumUser, userId }: UnifiedModulePageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  // Fix for hydration mismatch errors caused by fdprocessedid attributes
  useEffect(() => {
    // This suppresses the hydration warning for fdprocessedid attributes
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' && 
        (args[0].includes('Hydration failed because the initial UI does not match what was rendered on the server') ||
         args[0].includes('There was an error while hydrating') ||
         args[0].includes('Hydration completed but contains mismatches') ||
         args[0].includes('A tree hydrated but some attributes') ||
         args[0].includes('fdprocessedid'))
      ) {
        return;
      }
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  // State variables
  const [notes, setNotes] = useState<NoteType[]>(initialNotes || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(notes.length > 0 ? notes[0] : null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(selectedNote?.content || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'notes' | 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos' | 'practice' | 'noteFlashcards'>('notes');
  const [filteredNotes, setFilteredNotes] = useState<NoteType[]>(notes);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  // Add subscription tier state
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  
  // New state variables for integrated tools
  const [teachbackText, setTeachbackText] = useState('');
  const [teachbackGrade, setTeachbackGrade] = useState<TeachbackGrade | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  // Add state variables for usage counts
  const [teachbackCount, setTeachbackCount] = useState(0);
  const [flashcardCount, setFlashcardCount] = useState(0);
  // Add constants for usage limits based on account type
  const teachbackLimit = isPremiumUser ? 50 : 10;
  // Add state for creating flashcards
  const [isCreateFlashcardModalOpen, setIsCreateFlashcardModalOpen] = useState(false);
  const [newFlashcardQuestion, setNewFlashcardQuestion] = useState('');
  const [newFlashcardAnswer, setNewFlashcardAnswer] = useState('');
  const [isCreatingFlashcard, setIsCreatingFlashcard] = useState(false);
  // Add state for end of deck dialog
  const [showEndOfDeckDialog, setShowEndOfDeckDialog] = useState(false);
  const [difficultCards, setDifficultCards] = useState<Flashcard[]>([]);
  // Add state for flashcard filtering and stats
  const [flashcardFilterType, setFlashcardFilterType] = useState<'all' | 'difficult' | 'easy' | 'new'>('all');
  const [flashcardSortType, setFlashcardSortType] = useState<'default' | 'newest' | 'oldest'>('default');
  const [_flashcardStats, setFlashcardStats] = useState<{
    totalCards: number;
    reviewedToday: number;
    masteredCount: number;
    difficultCount: number;
    averageRecall: number;
  }>({
    totalCards: 0,
    reviewedToday: 0,
    masteredCount: 0,
    difficultCount: 0,
    averageRecall: 0
  });
  const [showFlashcardStats, setShowFlashcardStats] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Add state for AI flashcard generation
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [_generatedFlashcardsCount, setGeneratedFlashcardsCount] = useState(0);
  const [_showGeneratedSuccess, setShowGeneratedSuccess] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Add state for video finder functionality
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isSearchingVideos, setIsSearchingVideos] = useState(false);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  
  // Add state for module editing
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [editedModuleContent, setEditedModuleContent] = useState('');
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);

  // Add state for formulas functionality
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
  const [formulaCategories, setFormulaCategories] = useState<string[]>([]);
  const [formulasByCategory, setFormulasByCategory] = useState<Record<string, Formula[]>>({});
  const [activeFormulaTab, setActiveFormulaTab] = useState<'categorized' | 'all'>('all');

  // Add state for manual formula creation
  const [isAddFormulaModalOpen, setIsAddFormulaModalOpen] = useState(false);
  const [_newFormulaLatex, _setNewFormulaLatex] = useState('');
  const [_newFormulaDescription, _setNewFormulaDescription] = useState('');
  const [_newFormulaCategory, _setNewFormulaCategory] = useState('General');
  const [_newFormulaIsBlock, _setNewFormulaIsBlock] = useState(false);
  const [_isAddingFormula, _setIsAddingFormula] = useState(false);

  // Update the state to track the formula being edited
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);

  // Add the newFormula state
  const [newFormula, setNewFormula] = useState<{
    formula: string;
    latex: string;
    description: string;
    category: string;
    is_block: boolean;
  }>({
    formula: '',
    latex: '',
    description: '',
    category: 'General',
    is_block: false
  });

  // Add a new state variable to track filtering flashcards by note
  const [filterFlashcardsByNoteId, setFilterFlashcardsByNoteId] = useState<string | null>(null);

  // Add a new state variable for the note-specific flashcards view
  const [activeNoteFlashcards, setActiveNoteFlashcards] = useState<{
    noteId: string;
    noteTitle: string;
    flashcards: Flashcard[];
  } | null>(null);
  const [isLoadingNoteFlashcards, setIsLoadingNoteFlashcards] = useState(false);

  // Keep filteredNotes in sync with notes
  useEffect(() => {
    // Make sure notes are valid before filtering
    const validNotes = notes.filter(note => !!note && !!note.id && typeof note.content === 'string');
    
    if (validNotes.length !== notes.length) {
      console.warn(`Filtered out ${notes.length - validNotes.length} invalid notes`);
      setNotes(validNotes);
    }
    
    if (selectedTag) {
      setFilteredNotes(validNotes.filter(note => note.tags?.includes(selectedTag)));
    } else {
      setFilteredNotes(validNotes);
    }
    
    // Set a default selected note if none is selected
    if (!selectedNote && validNotes.length > 0) {
      setSelectedNote(validNotes[0]);
      setEditedContent(validNotes[0].content || '');
    }
  }, [notes, selectedTag, selectedNote]);

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          content: editedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedNote.id);

      if (error) throw error;

      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === selectedNote.id 
          ? { ...note, content: editedContent, updated_at: new Date().toISOString() } 
          : note
      ));
      
      setSelectedNote(prev => prev ? { ...prev, content: editedContent, updated_at: new Date().toISOString() } : null);
      setEditMode(false);
      
      toast({
        title: "Note saved successfully",
        variant: "default"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: "Error saving note",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewNote = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          study_session_id: module.id,
          title: `New Note ${notes.length + 1}`,
          content: '',
          tags: [],
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      const newNote = data as NoteType;
      setNotes(prev => [...prev, newNote]);
      setSelectedNote(newNote);
      setEditedContent(newNote.content);
      setEditMode(true);
      
      toast({
        title: "New note created",
        variant: "default"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: "Error creating note",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNote = (note: NoteType) => {
    setSelectedNote(note);
    setEditedContent(note.content);
    setEditMode(false);
    
    // If a study tool is active, update it to be associated with the newly selected note
    if (activeSection === 'flashcards') {
      // Switch to note-specific flashcards
      handleNoteFlashcardsClick(note);
    } else if (activeSection === 'noteFlashcards') {
      // If already in note-specific flashcards view, update to show the new note's flashcards
      handleNoteFlashcardsClick(note);
    } else if (activeSection === 'teachback') {
      // Keep teachback active but update the selected note
      // The teachback will use the newly selected note automatically
    } else if (activeSection === 'videos') {
      // Update video search based on the newly selected note
      generateSearchFromNote(note);
    }
    // For other sections like 'module' or 'formulas', we don't need to change anything
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', selectedNote.id);

      if (error) throw error;

      // Update local state
      const updatedNotes = notes.filter(note => note.id !== selectedNote.id);
      setNotes(updatedNotes);
      setSelectedNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
      setShowDeleteConfirm(false);
      
      toast({
        title: "Note deleted successfully",
        variant: "default"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: "Error deleting note",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!selectedNote || !tagInput.trim()) return;
    
    const newTag = tagInput.trim();
    if (selectedNote.tags.includes(newTag)) {
      toast({
        title: "Tag already exists",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedTags = [...selectedNote.tags, newTag];
      
      const { error } = await supabase
        .from('notes')
        .update({
          tags: updatedTags
        })
        .eq('id', selectedNote.id);

      if (error) throw error;

      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === selectedNote.id 
          ? { ...note, tags: updatedTags } 
          : note
      ));
      
      setSelectedNote(prev => prev ? { ...prev, tags: updatedTags } : null);
      setTagInput('');
      
      toast({
        title: "Tag added successfully",
        variant: "default"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: "Error adding tag",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedNote) return;

    setIsLoading(true);
    try {
      const updatedTags = selectedNote.tags.filter(tag => tag !== tagToRemove);
      
      const { error } = await supabase
        .from('notes')
        .update({
          tags: updatedTags
        })
        .eq('id', selectedNote.id);

      if (error) throw error;

      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === selectedNote.id 
          ? { ...note, tags: updatedTags } 
          : note
      ));
      
      setSelectedNote(prev => prev ? { ...prev, tags: updatedTags } : null);
      
      if (selectedTag === tagToRemove) {
        setSelectedTag(null);
      }
      
      toast({
        title: "Tag removed successfully",
        variant: "default"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: "Error removing tag",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterByTag = (tag: string | null) => {
    setSelectedTag(tag === selectedTag ? null : tag);
  };

  // Update handleActivateStudyTool to accept an optional noteId parameter
  const handleActivateStudyTool = (tool: 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos' | 'practice' | 'notes', noteId?: string) => {
    // The 'notes' tool type can be handled just like 'module', as it refers to returning to the notes view
    if (tool === 'notes') {
      // If a noteId is provided, set it as the selected note
      if (noteId) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          setSelectedNote(note);
        }
      }
      // Set the active section to 'notes' to show the notes view
      setActiveSection('notes');
      return;
    }
    
    // Check for premium access for formulas
    if (tool === 'formulas' && !hasFormulaAccess()) {
      setShowUpgradeDialog(true);
      return;
    }
    
    setActiveSection(tool);
    
    // If it's flashcards and a noteId is provided, set the filter
    if (tool === 'flashcards' && noteId) {
      setFilterFlashcardsByNoteId(noteId);
    } else if (tool === 'flashcards' && !noteId) {
      // Clear the filter when viewing all flashcards
      setFilterFlashcardsByNoteId(null);
    }
  };

  const renderLatex = (content: string) => {
    if (!content) return '';
    
    // Regular expression to find LaTeX expressions between $$ or $ symbols
    const latexRegex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
    
    return content.replace(latexRegex, (match, group1, group2) => {
      const formula = group1 || group2; // group1 for $$, group2 for $
      const displayMode = !!group1; // true for $$, false for $
      
      try {
        const renderedLatex = renderToString(formula, {
          displayMode: displayMode,
          throwOnError: false
        });
        
        // Wrap the rendered LaTeX in a div with a class for dark mode styling
        return `<div class="katex-wrapper dark:text-white">${renderedLatex}</div>`;
      } catch (error) {
        console.error('LaTeX rendering error:', error);
        return match; // Return the original match if rendering fails
      }
    });
  };

  const stripLatex = (content: string) => {
    if (!content) return '';
    // Replace LaTeX formulas with [MATH] for cleaner preview
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\$\$(.*?)\$\$|\$(.*?)\$/g, '[MATH]') // Replace LaTeX with [MATH]
      .substring(0, 100); // Limit length
  };

  // Load flashcards when active section changes to flashcards
  useEffect(() => {
    if (activeSection === 'flashcards') {
      fetchFlashcards();
      fetchFlashcardCount();
      // Debug: Inspect table structure
      inspectFlashcardTable();
    } else if (activeSection === 'teachback') {
      fetchTeachbackCount();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Debug function to inspect flashcard table
  const inspectFlashcardTable = async () => {
    try {
      const { data: _data, error } = await supabase
        .from('flashcards')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error("Error inspecting flashcard table:", error);
      }
    } catch (err) {
      console.error("Failed to inspect flashcard table:", err);
    }
  };

  // Enhanced function to fetch flashcards with filtering and sorting
  const fetchFlashcards = async () => {
    if (!module?.id || !userId) return;
    
    setIsLoadingFlashcards(true);
    try {
      let query = supabase
        .from('flashcards')
        .select(`
          *,
          source_note:source_note_id (
            id,
            title
          )
        `)
        .eq('study_session_id', module.id)
        .eq('user_id', userId);
      
      // Filter by note if a noteId is specified
      if (filterFlashcardsByNoteId) {
        query = query.eq('source_note_id', filterFlashcardsByNoteId);
      }
      
      // Apply additional filters if needed
      if (flashcardFilterType === 'difficult') {
        query = query.in('last_recall_rating', ['hard', 'forgot']);
      } else if (flashcardFilterType === 'easy') {
        query = query.in('last_recall_rating', ['easy', 'good']);
      } else if (flashcardFilterType === 'new') {
        query = query.is('last_reviewed_at', null);
      }
      
      // Apply sorting
      if (flashcardSortType === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (flashcardSortType === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else {
        // Default sort: next review date
        query = query.order('next_review_at', { ascending: true, nullsFirst: true });
      }
      
      const { data, error } = await query;
        
      if (error) throw error;
      
      setFlashcards(data || []);
      // Reset difficult cards and card index when loading new flashcards
      setDifficultCards([]);
      setCurrentFlashcardIndex(0);
      
      // Fetch statistics
      calculateFlashcardStats(data || []);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      toast({
        title: "Failed to load flashcards",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFlashcards(false);
    }
  };
  
  // New function to calculate flashcard statistics
  const calculateFlashcardStats = (cards: Flashcard[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reviewedToday = cards.filter(card => {
      if (!card.last_reviewed_at) return false;
      const reviewDate = new Date(card.last_reviewed_at);
      reviewDate.setHours(0, 0, 0, 0);
      return reviewDate.getTime() === today.getTime();
    }).length;
    
    const masteredCount = cards.filter(card => 
      card.last_recall_rating === 'easy' || (card.repetitions !== undefined && card.repetitions >= 5)
    ).length;
    
    const difficultCount = cards.filter(card => 
      card.last_recall_rating === 'hard' || card.last_recall_rating === 'forgot'
    ).length;
    
    // Calculate average recall (simplified)
    let recallScore = 0;
    let ratedCards = 0;
    
    cards.forEach(card => {
      if (card.last_recall_rating) {
        ratedCards++;
        switch(card.last_recall_rating) {
          case 'easy': recallScore += 1; break;
          case 'good': recallScore += 0.75; break;
          case 'hard': recallScore += 0.25; break;
          case 'forgot': recallScore += 0; break;
        }
      }
    });
    
    const averageRecall = ratedCards > 0 ? Math.round((recallScore / ratedCards) * 100) : 0;
    
    setFlashcardStats({
      totalCards: cards.length,
      reviewedToday,
      masteredCount,
      difficultCount,
      averageRecall
    });
  };

  // New function to grade teachback
  const gradeTeachback = async () => {
    if (!teachbackText || teachbackText.trim().length < 10) {
      toast({
        title: "Explanation too short",
        description: "Please provide a longer explanation to get meaningful feedback.",
        variant: "destructive"
      });
      return;
    }

    // Check if user has reached their teachback limit
    if (teachbackCount >= teachbackLimit) {
      toast({
        title: "Usage limit reached",
        description: isPremiumUser ? 
          "You've reached your monthly teachback limit." : 
          "You've reached your teachback limit. Upgrade to Premium for more submissions.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGrading(true);
    
    try {
      const response = await fetch('/api/grade-teachback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          explanation: teachbackText,
          moduleId: module.id,
          noteId: selectedNote?.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Grading failed');
      }
      
      const data = await response.json();
      setTeachbackGrade(data);
      
      // Show the feedback modal
      setShowFeedbackModal(true);
      
      // Save teachback to database with better error handling
      try {
        // Convert grade from 1-10 scale to 0-100 percentage
        const percentageGrade = Math.round((data.grade / 10) * 100);
        
        // Ensure feedback is stored as a JSON object
        const feedbackData = typeof data.feedback === 'string' 
          ? { html: data.feedback } 
          : data.feedback;
        
        const { error } = await supabase
          .from('teach_backs')
          .insert({
            user_id: userId,
            study_session_id: module.id,
            note_id: selectedNote?.id,
            content: teachbackText,
            grade: percentageGrade, // Use percentage scale (0-100)
            feedback: feedbackData, // Store as a JSON object
            created_at: new Date().toISOString()
          });
          
        if (error) {
          console.error('Error saving teachback to database:', error);
          // We'll still show the feedback even if saving fails
        } else {
          // Increment teachback count on successful submission
          setTeachbackCount(prev => prev + 1);
        }
      } catch (dbError) {
        console.error('Exception saving teachback to database:', dbError);
        // Continue to show feedback even if DB save fails
      }
        
      toast({
        title: "Teachback graded",
        description: `Your explanation received a grade of ${data.grade}/10`,
        variant: data.grade >= 7 ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error grading teachback:', error);
      toast({
        title: "Failed to grade teachback",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGrading(false);
    }
  };
  
  // New function to fetch teachback count
  const fetchTeachbackCount = async () => {
    if (!module?.id || !userId) return;
    
    try {
      const { count, error } = await supabase
        .from('teach_backs')
        .select('*', { count: 'exact', head: true })
        .eq('study_session_id', module.id)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      setTeachbackCount(count || 0);
    } catch (error) {
      console.error('Error fetching teachback count:', error);
    }
  };

  // New function to fetch flashcard count
  const fetchFlashcardCount = async () => {
    if (!module?.id || !userId) return;
    
    try {
      const { count, error } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('study_session_id', module.id)
        .eq('user_id', userId)
        .not('last_reviewed_at', 'is', null); // Count only cards that have been reviewed
        
      if (error) throw error;
      
      setFlashcardCount(count || 0);
    } catch (error) {
      console.error('Error fetching flashcard count:', error);
    }
  };
  
  // New function to create a flashcard
  const handleCreateFlashcard = async () => {
    if (!newFlashcardQuestion.trim() || !newFlashcardAnswer.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a question and an answer for your flashcard.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingFlashcard(true);

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          user_id: userId,
          study_session_id: module.id,
          module_title: module.module_title,
          source_note_id: selectedNote?.id,
          question: newFlashcardQuestion,
          answer: newFlashcardAnswer,
          status: 'new',
          created_at: new Date().toISOString(),
          last_reviewed_at: null,
          next_review_at: null,
          ease_factor: 2.5,
          review_interval: 0,
          repetitions: 0,
          last_recall_rating: null
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      // Add the new flashcard to the state
      setFlashcards(prev => [...prev, data]);
      
      // Reset form and close modal
      setNewFlashcardQuestion('');
      setNewFlashcardAnswer('');
      setIsCreateFlashcardModalOpen(false);
      
      toast({
        title: "Flashcard created",
        description: "Your new flashcard has been added to your deck.",
        variant: "default"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: "Error creating flashcard",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingFlashcard(false);
    }
  };

  // New function to restart the flashcard deck
  const restartDeck = () => {
    setCurrentFlashcardIndex(0);
    setShowEndOfDeckDialog(false);
  };

  // New function to shuffle the flashcard deck
  const shuffleDeck = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentFlashcardIndex(0);
    setShowEndOfDeckDialog(false);
  };

  // New function to review only difficult cards
  const _reviewDifficultCards = () => {
    if (difficultCards.length > 0) {
      setFlashcards(difficultCards);
      setCurrentFlashcardIndex(0);
      setDifficultCards([]); // Reset difficult cards for the new session
    } else {
      toast({
        title: "No difficult cards",
        description: "You didn't mark any cards as difficult in this session.",
      });
    }
    setShowEndOfDeckDialog(false);
  };

  // Add keyboard event handler for flashcard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSection !== 'flashcards' || showEndOfDeckDialog) return;
      
      switch(e.key) {
        case ' ':  // Space key to flip card
          document.querySelector('.perspective-1000')?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
          );
          break;
        case 'ArrowRight':  // Next card (if possible)
          if (currentFlashcardIndex < flashcards.length - 1) {
            setCurrentFlashcardIndex(currentFlashcardIndex + 1);
          }
          break;
        case 'ArrowLeft':  // Previous card (if possible)
          if (currentFlashcardIndex > 0) {
            setCurrentFlashcardIndex(currentFlashcardIndex - 1);
          }
          break;
        case '1':  // Rate as forgot
        case '2':  // Rate as hard
        case '3':  // Rate as good
        case '4':  // Rate as easy
          const cardFront = document.querySelector('.perspective-1000');
          const isFlipped = cardFront?.querySelector('[key="back"]') !== null;
          
          if (isFlipped && flashcards.length > 0) {
            const ratingMap: {[key: string]: 'forgot' | 'hard' | 'good' | 'easy'} = {
              '1': 'forgot',
              '2': 'hard',
              '3': 'good',
              '4': 'easy'
            };
            handleRecallRating(ratingMap[e.key]);
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, currentFlashcardIndex, flashcards, showEndOfDeckDialog]);

  // Function to handle filter change with premium check
  const handleFilterChange = (value: 'all' | 'difficult' | 'easy' | 'new' | 'mastered') => {
    // For premium-only filters, show upgrade dialog
    if ((value === 'mastered') && !isPremiumUser) {
      setShowUpgradeDialog(true);
      return;
    }
    
    setFlashcardFilterType(value as 'all' | 'difficult' | 'easy' | 'new');
    // Re-fetch with new filter
    fetchFlashcards();
  };

  // Function to handle sort change with premium check
  const handleSortChange = (value: 'default' | 'newest' | 'oldest' | 'difficulty') => {
    // For premium-only sorts, show upgrade dialog
    if ((value === 'difficulty') && !isPremiumUser) {
      setShowUpgradeDialog(true);
      return;
    }
    
    setFlashcardSortType(value as 'default' | 'newest' | 'oldest');
    // Re-fetch with new sort
    fetchFlashcards();
  };

  // New function to handle flashcard recall ratings
  const handleRecallRating = async (rating: 'easy' | 'good' | 'hard' | 'forgot') => {
    if (!flashcards.length || currentFlashcardIndex >= flashcards.length) return;
    
    const currentCard = flashcards[currentFlashcardIndex];
    
    // Track difficult cards
    if (rating === 'hard' || rating === 'forgot') {
      setDifficultCards(prev => [...prev.filter(card => card.id !== currentCard.id), currentCard]);
    }
    
    // Move to the next card
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
    } else {
      // End of deck - show dialog instead of toast
      setShowEndOfDeckDialog(true);
    }
    
    // Update the card in the database (simplified version)
    try {
      await supabase
        .from('flashcards')
        .update({
          last_recall_rating: rating,
          last_reviewed_at: new Date().toISOString()
        })
        .eq('id', currentCard.id);
      
      // Increment flashcard review count
      setFlashcardCount(prev => prev + 1);
    } catch (error) {
      console.error('Error updating flashcard:', error);
    }
  };

  // Add function to check if user has access to AI-generated flashcards
  // This feature is available only to basic and pro tier users
  const canAccessAIFlashcards = () => {
    return subscriptionTier === 'basic' || subscriptionTier === 'pro';
  };
  
  // Add function to check if user has access to create flashcards from notes
  // This feature is available only to basic and pro tier users
  const canCreateFlashcardsFromNotes = () => {
    return subscriptionTier === 'basic' || subscriptionTier === 'pro';
  };
  
  // Add function to handle creating flashcards from notes
  const handleCreateFlashcardClick = () => {
    if (!canCreateFlashcardsFromNotes()) {
      setShowUpgradeDialog(true);
    } else {
      setIsCreateFlashcardModalOpen(true);
    }
  };
  
  // Add function to prompt user to upgrade if they're not premium
  const handleAIFlashcardsClick = () => {
    if (!canAccessAIFlashcards()) {
      setShowUpgradeDialog(true);
    } else {
      generateAIFlashcards();
    }
  };
  
  // Add function to handle upgrade navigation
  const _navigateToUpgrade = () => {
    router.push('/pricing');
  };
  
  // Add function to generate AI flashcards
  const generateAIFlashcards = async () => {
    if (!canAccessAIFlashcards()) {
      setShowUpgradeDialog(true);
      return;
    }
    
    if (!selectedNote) {
      toast({
        title: "No note selected",
        description: "Please select a note to generate flashcards from.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingFlashcards(true);
    setGeneratedFlashcardsCount(0);
    
    try {
      const requestBody = {
        moduleId: module.id,
        moduleTitle: module.module_title,
        content: selectedNote.content,
        noteId: selectedNote.id  // Explicitly include the note ID
      };
      
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle subscription-related errors specifically
        if (response.status === 403 || response.status === 402) {
          setShowUpgradeDialog(true);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }
      
      const data = await response.json();
      setGeneratedFlashcardsCount(data.count || 0);
      
      // Show success message
      setShowGeneratedSuccess(true);
      setTimeout(() => setShowGeneratedSuccess(false), 5000);
      
      // Refresh flashcards based on current view
      if (activeSection === 'noteFlashcards' && selectedNote) {
        // If we're in the note-specific flashcards view, refresh those flashcards
        handleNoteFlashcardsClick(selectedNote);
      } else {
        // Otherwise refresh the general flashcards
        fetchFlashcards();
      }
      
      toast({
        title: "Flashcards Generated",
        description: `Successfully created ${data.count} new flashcards from your notes.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        title: "Failed to generate flashcards",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Add function to handle module content update
  const handleUpdateModuleContent = async () => {
    if (!module || !module.id) return;
    
    setIsUpdatingModule(true);
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...module.details,
            content: editedModuleContent
          }
        })
        .eq('id', module.id);

      if (error) throw error;

      // Update local module object
      module.details.content = editedModuleContent;
      
      setIsEditingModule(false);
      
      toast({
        title: "Module description updated",
        variant: "default"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: "Error updating module",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingModule(false);
    }
  };

  // Update the onNotesCreated function to handle new notes from PDF
  const handleNotesCreated = (newNotes?: { title: string; content: string; tags: string[]; id?: string }[]) => {
    if (newNotes && newNotes.length > 0) {
      // Add the new notes to the state
      setNotes(prev => [...newNotes as NoteType[], ...prev]);
      
      // Select the first new note
      setSelectedNote(newNotes[0] as NoteType);
      setEditedContent(newNotes[0].content);
      
      toast({
        title: "PDF import successful",
        description: `${newNotes.length} notes were created from your PDF.`,
        variant: "default"
      });
    }
  };

  // Add this to the document head section
  useEffect(() => {
    // Add a global style that hides the fdprocessedid attribute from React hydration
    const style = document.createElement('style');
    style.textContent = `[fdprocessedid] { visibility: inherit; }`;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Add this just before the return statement in your component
  useEffect(() => {
    // Function to add suppressHydrationWarning to all interactive elements
    const addSuppressHydrationWarning = () => {
      // Select all interactive elements that might get fdprocessedid attributes
      const interactiveElements = document.querySelectorAll('button, input, select, textarea, [role="button"]');
      
      interactiveElements.forEach(el => {
        // Use React's internal __REACT_DATA_ATTRIBUTES property to set suppressHydrationWarning
        if (el.hasAttribute('fdprocessedid')) {
          el.removeAttribute('fdprocessedid');
        }
        
        // For elements that already have React handlers, we can try to modify their props
        interface ReactElement extends HTMLElement {
          __REACT_DATA_ATTRIBUTES?: {
            suppressHydrationWarning: boolean;
          };
        }
        
        const reactEl = el as ReactElement;
        if (reactEl.__REACT_DATA_ATTRIBUTES) {
          reactEl.__REACT_DATA_ATTRIBUTES.suppressHydrationWarning = true;
        }
        
        // Also add the attribute directly (this may not work for React-controlled elements)
        el.setAttribute('suppressHydrationWarning', 'true');
      });
    };
    
    // Run immediately
    addSuppressHydrationWarning();
    
    // Also run after a short delay to catch elements added by React
    const timeoutId = setTimeout(addSuppressHydrationWarning, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Also create a React Context to automatically apply suppressHydrationWarning to children
  const _SuppressHydrationContext = React.createContext<null>(null);

  // Define proper types for children
  const _WithSuppressHydration = ({ children }: { children: React.ReactNode }) => {
    return React.Children.map(children, child => {
      // Only add props to valid elements that accept suppressHydrationWarning
      if (React.isValidElement(child) && typeof child.type !== 'string') {
        // Use a more specific type that includes the suppressHydrationWarning property
        return React.cloneElement(
          child as React.ReactElement<React.JSX.IntrinsicAttributes & { suppressHydrationWarning?: boolean }>, 
          { suppressHydrationWarning: true }
        );
      }
      return child;
    });
  };

  // First, add a function to check for flashcard feature access
  const _hasFlashcardAccess = () => {
    return true; // Basic flashcard functionality is available to all users
  };

  // Add function to check for PDF import access
  const _hasPdfAccess = () => {
    return subscriptionTier === 'basic' || subscriptionTier === 'pro';
  };

  // Add useEffect to fetch subscription tier
  useEffect(() => {
    const fetchSubscriptionTier = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching subscription tier:', error);
          return;
        }
        
        if (data) {
          setSubscriptionTier(data.tier);
        }
      } catch (error) {
        console.error('Failed to fetch subscription tier:', error);
      }
    };
    
    fetchSubscriptionTier();
  }, [userId, supabase]);

  // Add fetchFormulas function to load formulas data
  const fetchFormulas = async () => {
    if (!module?.id || !userId) return;
    
    setIsLoadingFormulas(true);
    try {
      const { data, error } = await supabase
        .from('formulas')
        .select('*')
        .eq('study_session_id', module.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get unique formulas
      const uniqueFormulas = Array.from(
        new Map(data.map((formula: Formula) => [formula.latex, formula])).values()
      );
      
      setFormulas(uniqueFormulas);
      
      // Process categories
      const categories = [...new Set(uniqueFormulas.map((f: Formula) => f.category))].sort();
      setFormulaCategories(categories);
      
      // Group formulas by category
      const categorized: Record<string, Formula[]> = {};
      categories.forEach(category => {
        categorized[category] = uniqueFormulas.filter((f: Formula) => f.category === category);
      });
      setFormulasByCategory(categorized);
      
    } catch (error) {
      console.error('Error fetching formulas:', error);
      toast({
        title: "Failed to load formulas",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFormulas(false);
    }
  };

  // Add useEffect to load formulas when active section changes to formulas
  useEffect(() => {
    if (activeSection === 'flashcards') {
      fetchFlashcards();
      fetchFlashcardCount();
      // Debug: Inspect table structure
      inspectFlashcardTable();
    } else if (activeSection === 'teachback') {
      fetchTeachbackCount();
    } else if (activeSection === 'formulas') {
      fetchFormulas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Add function to generate formulas
  const handleGenerateFormulas = async (analyzeAllNotes = false) => {
    if (!hasFormulaAccess()) {
      setShowUpgradeDialog(true);
      return;
    }
    
    // Get content to analyze - either selected note or all notes combined
    let contentToAnalyze = "";
    let sourceDescription = "";
    
    // Force analyze all notes if the parameter is true
    if (!analyzeAllNotes && selectedNote) {
      // Use the selected note's content
      contentToAnalyze = selectedNote.content;
      sourceDescription = `note "${selectedNote.title}"`;
    } else {
      // If no note is selected or analyzeAllNotes=true, use all notes
      if (filteredNotes.length === 0) {
        toast({
          title: "No notes available",
          description: "Please create notes before generating formulas.",
          variant: "destructive"
        });
        return;
      }
      
      // Combine content from all notes
      contentToAnalyze = filteredNotes.map(note => 
        `### ${note.title} ###\n${note.content}\n\n`
      ).join("");
      sourceDescription = "all notes";
    }
    
    if (!contentToAnalyze.trim()) {
      toast({
        title: "Empty content",
        description: "There is no content to analyze for formulas.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingFormulas(true);
    
    try {
      toast({
        title: "Analyzing notes",
        description: `Extracting formulas from ${sourceDescription}...`,
        variant: "default"
      });
      
      // Extract formulas using AI
      const response = await fetch('/api/ai/extract-formulas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          study_session_id: module.id,
          moduleContent: contentToAnalyze
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle subscription-related errors specifically
        if (response.status === 403 || response.status === 402) {
          setShowUpgradeDialog(true);
          return;
        }
        
        throw new Error(errorData.error || errorData.details || `Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Refresh formulas
      await fetchFormulas();
      
      if (data.count > 0) {
        toast({
          title: "Formulas Generated",
          description: `Successfully extracted ${data.count} formulas from ${sourceDescription}.`,
          variant: "default"
        });
      } else {
        toast({
          title: "No Formulas Found",
          description: `No mathematical formulas were detected in ${sourceDescription}. Try notes with LaTeX formulas or mathematical content.`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error generating formulas:', error);
      toast({
        title: "Failed to generate formulas",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFormulas(false);
    }
  };

  // Add function to get notes content for formula generation
  const _getModuleNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('content')
        .eq('study_session_id', module.id);
      
      if (error) {
        console.error('Error fetching module notes:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getModuleNotes:', error);
      return [];
    }
  };

  // Handle adding a new formula
  const handleAddFormula = async () => {
    if (!newFormula.formula || !newFormula.latex) {
      toast({
        title: "Missing information",
        description: "Please provide both the formula and LaTeX representation.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const supabase = createClientComponentClient();
      
      if (editingFormula) {
        // Update existing formula
        const { error } = await supabase
          .from('formulas')
          .update({
            formula: newFormula.formula,
            latex: newFormula.latex,
            description: newFormula.description || null,
            category: newFormula.category || 'General',
            is_block: newFormula.is_block || false
          })
          .eq('id', editingFormula.id);
          
        if (error) throw new Error(error.message);
        
        toast({
          title: "Formula updated",
          description: "Your formula has been updated successfully.",
          variant: "default"
        });
      } else {
        // Add new formula
        const { error } = await supabase
          .from('formulas')
          .insert({
            study_session_id: module.id,
            formula: newFormula.formula,
            latex: newFormula.latex,
            description: newFormula.description || null,
            category: newFormula.category || 'General',
            is_block: newFormula.is_block || false
          });
          
        if (error) throw new Error(error.message);
        
        toast({
          title: "Formula added",
          description: "Your formula has been added to the formula sheet.",
          variant: "default"
        });
      }
      
      // Reset form and close modal
      setNewFormula({
        formula: '',
        latex: '',
        description: '',
        category: 'General',
        is_block: false
      });
      setIsAddFormulaModalOpen(false);
      setEditingFormula(null);
      
      // Refresh formulas
      fetchFormulas();
    } catch (error) {
      console.error('Error adding formula:', error);
      toast({
        title: "Failed to save formula",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Handle deleting a formula
  const handleDeleteFormula = async (formulaId: string) => {
    try {
      setIsLoading(true);
      
      // Delete from database
      const { error } = await supabase
        .from('formulas')
        .delete()
        .eq('id', formulaId);
        
      if (error) throw error;
      
      // Update local state
      setFormulas(formulas.filter(f => f.id !== formulaId));
      
      // Update categorized formulas
      const updatedFormulasByCategory = { ...formulasByCategory };
      
      for (const category in updatedFormulasByCategory) {
        updatedFormulasByCategory[category] = updatedFormulasByCategory[category].filter(
          f => f.id !== formulaId
        );
      }
      
      setFormulasByCategory(updatedFormulasByCategory);
      
      toast({
        title: "Formula deleted",
        description: "The formula has been removed from your formula sheet.",
      });
    } catch (error) {
      console.error("Error deleting formula:", error);
      toast({
        title: "Error",
        description: "Failed to delete the formula. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate if user has formula generation access
  const hasFormulaAccess = () => {
    return subscriptionTier === 'basic' || subscriptionTier === 'pro' || isPremiumUser;
  };

  // Add useEffect to initialize the form when editing
  useEffect(() => {
    if (editingFormula) {
      setNewFormula({
        formula: editingFormula.formula || '',
        latex: editingFormula.latex || '',
        description: editingFormula.description || '',
        category: editingFormula.category || 'General',
        is_block: editingFormula.is_block || false
      });
    }
  }, [editingFormula]);

  const _handleFormulaAccess = () => {
    if (!hasFormulaAccess()) {
      setShowUpgradeDialog(true);
    }
  };
  
  // Video finder functions
  const handleSearchVideos = async () => {
    if (!videoSearchQuery.trim()) return;
    
    setIsSearchingVideos(true);
    
    try {
      const response = await fetch(`/api/youtube/search?query=${encodeURIComponent(videoSearchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Error searching videos: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process videos and check if they're already saved
      const processedVideos = data.videos.map((video: Video) => ({
        ...video,
        bookmarked: savedVideos.some(saved => saved.video_id === video.id)
      }));
      
      setVideos(processedVideos);
    } catch (error) {
      console.error('Error searching videos:', error);
      toast({
        title: "Error Searching Videos",
        description: "There was a problem finding videos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingVideos(false);
    }
  };
  
  const generateSearchFromNote = async (note: NoteType) => {
    if (!note || !note.title) return;
    
    setIsSearchingVideos(true);
    
    try {
      // Use the note title directly as the search query
      const query = note.title;
      setVideoSearchQuery(query);
      
      // Search for videos with this query
      const searchResponse = await fetch(`/api/youtube/search?query=${encodeURIComponent(query)}`);
      
      if (!searchResponse.ok) {
        throw new Error(`Error searching videos: ${searchResponse.status}`);
      }
      
      const data = await searchResponse.json();
      
      // Process videos and check if they're already saved
      const processedVideos = data.videos.map((video: Video) => ({
        ...video,
        bookmarked: savedVideos.some(saved => saved.video_id === video.id)
      }));
      
      setVideos(processedVideos);
      
      toast({
        title: "Videos Found",
        description: `Found educational videos related to: "${query}"`,
      });
    } catch (error) {
      console.error('Error finding videos:', error);
      toast({
        title: "Error Finding Videos",
        description: "There was a problem finding videos related to your note.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingVideos(false);
    }
  };
  
  const handleSaveVideo = async (video: Partial<Video> & { id: string; title: string }) => {
    if (!userId) return;
    
    const supabase = createClient();
    
    try {
      // Check if this video is already saved
      const { data: existingVideos, error: checkError } = await supabase
        .from('saved_videos')
        .select('*')
        .eq('video_id', video.id)
        .eq('user_id', userId);
        
      if (checkError) throw checkError;
      
      // If video exists, remove it (toggle bookmarking)
      if (existingVideos && existingVideos.length > 0) {
        const existingVideo = existingVideos[0];
        
        const { error: deleteError } = await supabase
          .from('saved_videos')
          .delete()
          .eq('id', existingVideo.id);
          
        if (deleteError) throw deleteError;
        
        // Update local state
        setSavedVideos(prev => prev.filter(v => v.id !== existingVideo.id));
        setVideos(prev => 
          prev.map(v => 
            v.id === video.id ? { ...v, bookmarked: false } : v
          )
        );
        
        toast({
          title: "Video Removed",
          description: "The video has been removed from your saved videos.",
        });
      } else {
        // Add the video
        const { data: newVideo, error: insertError } = await supabase
          .from('saved_videos')
          .insert({
            video_id: video.id,
            title: video.title,
            description: video.description,
            thumbnail: video.thumbnail,
            channel: video.channel,
            published_at: video.publishedAt,
            video_url: video.videoUrl,
            study_session_id: module.id,
            user_id: userId,
            note_id: selectedNote?.id || null
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        
        // Update local state
        setSavedVideos(prev => [...prev, newVideo]);
        setVideos(prev => 
          prev.map(v => 
            v.id === video.id ? { ...v, bookmarked: true } : v
          )
        );
        
        toast({
          title: "Video Saved",
          description: "The video has been saved to your study materials.",
        });
      }
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: "Error Saving Video",
        description: "There was a problem saving this video. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const fetchSavedVideos = _useCallback(async () => {
    if (!userId) return;
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('saved_videos')
        .select('*')
        .eq('user_id', userId)
        .eq('study_session_id', module.id);
        
      if (error) throw error;
      
      setSavedVideos(data || []);
    } catch (error) {
      console.error('Error fetching saved videos:', error);
    }
  }, [userId, module.id]);

  useEffect(() => {
    fetchSavedVideos();
  }, [fetchSavedVideos]);

  // Add an effect to fetch flashcards when the note filter changes
  useEffect(() => {
    if (activeSection === 'flashcards') {
      fetchFlashcards();
    }
  }, [filterFlashcardsByNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add a function to fetch and display flashcards for a specific note
  const handleNoteFlashcardsClick = async (note: NoteType) => {
    
    // First, set loading state and clear previous flashcards
    setIsLoadingNoteFlashcards(true);
    
    // Reset the current flashcard index when switching to a new note's flashcards
    setCurrentFlashcardIndex(0);
    
    // Set active section before fetching to ensure UI updates immediately
    setActiveSection('noteFlashcards');
    
    try {
      // Initialize with empty flashcards array while loading
      setActiveNoteFlashcards({
        noteId: note.id,
        noteTitle: note.title,
        flashcards: []
      });

      const { data, error } = await supabase
        .from('flashcards')
        .select(`
          *,
          source_note:source_note_id (
            id,
            title
          )
        `)
        .eq('study_session_id', module.id)
        .eq('user_id', userId)
        .eq('source_note_id', note.id);
      
      if (error) {
        console.error('Error fetching note flashcards:', error);
        toast({
          title: "Error",
          description: "Failed to load flashcards for this note",
          variant: "destructive"
        });
        setActiveNoteFlashcards(null);
        setActiveSection('notes');
        return;
      }

      // Update state with fetched flashcards
      setActiveNoteFlashcards({
        noteId: note.id,
        noteTitle: note.title,
        flashcards: data || []
      });
    } catch (error) {
      console.error('Error in handleNoteFlashcardsClick:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      setActiveNoteFlashcards(null);
      setActiveSection('notes');
    } finally {
      setIsLoadingNoteFlashcards(false);
    }
  };

  // Add function to handle PDF import click
  const handlePdfImportClick = () => {
    if (_hasPdfAccess()) {
      setIsPdfModalOpen(true);
    } else {
      setShowUpgradeDialog(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen" suppressHydrationWarning>
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Sidebar with note cards */}
        <div className="w-1/4 border-r p-4 flex flex-col h-[calc(100vh-4rem)]" suppressHydrationWarning>
          <div className="mb-2">
            <h2 className="text-xl font-bold">{module.details?.title || module.module_title || 'Untitled Module'}</h2>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleActivateStudyTool('module')}
              suppressHydrationWarning
              className="px-2 py-1 h-8 text-xs"
            >
              <BookOpen className="h-3 w-3 mr-1" /> Module
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => handleActivateStudyTool('formulas')}
              suppressHydrationWarning
              className="px-2 py-1 h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1" /> Formula
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => handleActivateStudyTool('practice')}
              suppressHydrationWarning
              className="px-2 py-1 h-8 text-xs"
            >
              <PenLine className="h-3 w-3 mr-1" /> Practice
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={handlePdfImportClick}
              title="Import notes from PDF or image"
              suppressHydrationWarning
              className="px-2 py-1 h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1" /> Import Document
            </Button>
            <Button 
              size="sm" 
              onClick={handleCreateNewNote} 
              suppressHydrationWarning
              className="px-2 py-1 h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> New
            </Button>
          </div>
          
          {/* Tag filters - Replace with dropdown */}
          {notes.length > 0 && (
            <div className="mb-4">
              <Select
                value={selectedTag || "all_tags"}
                onValueChange={(value) => handleFilterByTag(value === "all_tags" ? null : value)}
              >
                <SelectTrigger className="w-full" suppressHydrationWarning>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_tags">All tags</SelectItem>
                  {Array.from(new Set(notes.flatMap(note => note.tags))).map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Note cards */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {filteredNotes.length > 0 ? (
              filteredNotes.map(note => (
                <Card 
                  key={note.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${selectedNote?.id === note.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => handleSelectNote(note)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900 dark:text-white">{note.title}</h3>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2 text-xs text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show only flashcards for this specific note
                            handleNoteFlashcardsClick(note);
                          }}
                        >
                          <ScrollText className="h-3 w-3 mr-1" /> Cards
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2 text-xs text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateStudyTool('teachback');
                          }}
                        >
                          <Brain className="h-3 w-3 mr-1" /> Teach
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2 text-xs text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectNote(note);
                            handleActivateStudyTool('videos');
                            generateSearchFromNote(note);
                          }}
                        >
                          <Video className="h-3 w-3 mr-1" /> Videos
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-100 line-clamp-2">
                      {stripLatex(note.content || '')}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No notes found</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={handleCreateNewNote}
                  suppressHydrationWarning
                >
                  Create your first note
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Main content area */}
        <div className="w-3/4 overflow-auto" suppressHydrationWarning>
          {selectedNote && activeSection === 'notes' ? (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{editMode ? "Edit Note" : selectedNote?.title || "Note"}</h2>
                  </div>
                  <div className="flex space-x-2">
                    {editMode ? (
                      <>
                        <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                        <Button onClick={handleSaveNote}>Save</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
                        <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 flex space-x-2">
                  {selectedNote.tags && selectedNote.tags.map(tag => (
                    <Badge key={tag} className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                      />
                    </Badge>
                  ))}
                  <div className="flex space-x-1">
                    <Input
                      className="h-6 w-24 text-xs"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag();
                        }
                      }}
                      suppressHydrationWarning
                    />
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={handleAddTag}
                      suppressHydrationWarning
                    >
                      <Tag className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex-1">
                {editMode ? (
                  <DraftEditor
                    initialContent={editedContent}
                    onChange={setEditedContent}
                  />
                ) : (
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: renderLatex(selectedNote.content || '') 
                    }} 
                  />
                )}
              </div>
            </>
          ) : activeSection === 'teachback' ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Teach Back</h1>
                  <div className="flex flex-col">
                    <Badge 
                      variant={teachbackCount >= teachbackLimit ? "destructive" : 
                             teachbackCount >= teachbackLimit * 0.8 ? "outline" : "secondary"}
                      className="text-sm dark:bg-slate-700 dark:text-white"
                    >
                      {teachbackCount} / {teachbackLimit} submissions
                    </Badge>
                    {!isPremiumUser && teachbackCount >= teachbackLimit * 0.7 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Upgrade for more submissions
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveSection('notes')}
                >
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Explain this concept in your own words</h2>
                  {selectedNote && (
                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle>{selectedNote.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div dangerouslySetInnerHTML={{ __html: renderLatex(selectedNote.content || '') }} />
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <div>
                  <h3 className="text-md font-medium mb-2">Your explanation:</h3>
                  <TextEditor 
                    value={teachbackText}
                    onChange={setTeachbackText}
                    disabled={isGrading}
                  />
                </div>
                
                <div>
                  <h3 className="text-md font-medium mb-2">Or record your explanation:</h3>
                  <AudioRecorder 
                    onTranscriptionComplete={(text) => setTeachbackText(text)}
                    disabled={isGrading}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={gradeTeachback}
                    disabled={isGrading || !teachbackText.trim()}
                  >
                    {isGrading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Grading...
                      </>
                    ) : (
                      <>Submit</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : activeSection === 'flashcards' ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">Flashcards</h1>
                    {filterFlashcardsByNoteId && (
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        from note: {notes.find(n => n.id === filterFlashcardsByNoteId)?.title || 'Selected Note'}
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
                      if (selectedNote && selectedNote.id === activeNoteFlashcards?.noteId) {
                        handleAIFlashcardsClick();
                      }
                    }}
                    disabled={isGeneratingFlashcards || !selectedNote}
                  >
                    {isGeneratingFlashcards ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" /> Generate AI Cards
                      </>
                    )}
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
              
              {/* Flashcard content continues... */}
              {isLoadingFlashcards ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Loading flashcards...</p>
                </div>
              ) : flashcards.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Select value={flashcardFilterType} onValueChange={(value) => handleFilterChange(value as 'all' | 'difficult' | 'easy' | 'new' | 'mastered')}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Filter cards" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cards</SelectItem>
                          <SelectItem value="difficult">Difficult</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={flashcardSortType} onValueChange={(value) => handleSortChange(value as 'default' | 'newest' | 'oldest' | 'difficulty')}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Sort cards" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={shuffleDeck}>
                        <Shuffle className="h-4 w-4 mr-1" /> Shuffle
                      </Button>
                      <Button variant="outline" size="sm" onClick={restartDeck}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Restart
                      </Button>
                    </div>
                  </div>
                  
                  <div className="h-[450px] flex flex-col items-center justify-center">
                    {flashcards.length > currentFlashcardIndex ? (
                      <>
                        <Flashcard 
                          question={flashcards[currentFlashcardIndex].question}
                          answer={flashcards[currentFlashcardIndex].answer}
                          onRecallRating={handleRecallRating}
                          currentIndex={currentFlashcardIndex}
                          totalCards={flashcards.length}
                          dueDate={flashcards[currentFlashcardIndex].due_date}
                        />
                        
                        <div className="flex justify-center space-x-4 mt-6">
                          <Button 
                            variant="outline" 
                            onClick={() => setCurrentFlashcardIndex(prev => (prev - 1 + flashcards.length) % flashcards.length)}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setCurrentFlashcardIndex(prev => (prev + 1) % flashcards.length)}
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
                          if (selectedNote && selectedNote.id === activeNoteFlashcards?.noteId) {
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
            </div>
          ) : activeSection === 'formulas' ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Formula Sheet</h1>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setIsAddFormulaModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Formula
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleGenerateFormulas()}
                    disabled={isLoadingFormulas}
                  >
                    {isLoadingFormulas ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Generate Formulas
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSection('notes')}
                  >
                    <X className="h-4 w-4 mr-1" /> Close
                  </Button>
                </div>
              </div>
              
              {isLoadingFormulas ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Generating formulas...</p>
                  <p className="text-sm text-muted-foreground">Finding relevant formulas for your study materials</p>
                </div>
              ) : formulas.length > 0 ? (
                <div className="space-y-4">
                  <Tabs defaultValue={activeFormulaTab} onValueChange={(value) => setActiveFormulaTab(value as 'categorized' | 'all')}>
                    <TabsList>
                      <TabsTrigger value="all">All Formulas</TabsTrigger>
                      <TabsTrigger value="categorized">By Category</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all" className="space-y-4 mt-4">
                      {formulas.map((formula, index) => (
                        <Card key={formula.id || index} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex justify-between">
                              <div className="formula-display w-full">
                                <div className="mb-2" dangerouslySetInnerHTML={{
                                  __html: renderLatex(formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`)
                                }} />
                                {formula.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{formula.description}</p>
                                )}
                              </div>
                              <div className="flex flex-col space-y-2 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setEditingFormula(formula);
                                    setNewFormula({
                                      formula: formula.formula || '',
                                      latex: formula.latex || '',
                                      description: formula.description || '',
                                      category: formula.category || 'General',
                                      is_block: formula.is_block || false
                                    });
                                    setIsAddFormulaModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDeleteFormula(formula.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {formula.category && (
                              <Badge variant="outline" className="mt-2">
                                {formula.category}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="categorized" className="space-y-6 mt-4">
                      {formulaCategories.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                          {formulaCategories.map((category) => (
                            <AccordionItem key={category} value={category}>
                              <AccordionTrigger className="font-medium text-lg">
                                {category} ({formulasByCategory[category]?.length || 0})
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4">
                                {formulasByCategory[category]?.map((formula, index) => (
                                  <Card key={formula.id || index} className="overflow-hidden">
                                    <CardContent className="p-4">
                                      <div className="flex justify-between">
                                        <div className="formula-display w-full">
                                          <div className="mb-2" dangerouslySetInnerHTML={{
                                            __html: renderLatex(formula.is_block ? `$$${formula.latex}$$` : `$${formula.latex}$`)
                                          }} />
                                          {formula.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{formula.description}</p>
                                          )}
                                        </div>
                                        <div className="flex flex-col space-y-2 ml-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                              setEditingFormula(formula);
                                              setNewFormula({
                                                formula: formula.formula || '',
                                                latex: formula.latex || '',
                                                description: formula.description || '',
                                                category: formula.category || 'General',
                                                is_block: formula.is_block || false
                                              });
                                              setIsAddFormulaModalOpen(true);
                                            }}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleDeleteFormula(formula.id)}
                                          >
                                            <Trash className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <p className="text-center py-10 text-gray-500">No categories found</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="text-center py-10">
                    <p className="text-gray-500">No formulas found</p>
                    <div className="mt-4 flex gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddFormulaModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Manually
                      </Button>
                      <Button 
                        onClick={() => handleGenerateFormulas()}
                        disabled={isLoadingFormulas}
                      >
                        {isLoadingFormulas ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        Generate Formulas
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeSection === 'videos' ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Educational Videos</h1>
                </div>
                <div className="flex space-x-2">
                  {selectedNote && (
                    <Button 
                      onClick={() => generateSearchFromNote(selectedNote)}
                      disabled={isSearchingVideos}
                      variant="outline"
                    >
                      <Sparkles className="h-4 w-4 mr-1" /> Find Videos for This Note
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSection('notes')}
                  >
                    <X className="h-4 w-4 mr-1" /> Close
                  </Button>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search for educational videos..."
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchVideos();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleSearchVideos} disabled={isSearchingVideos}>
                    {isSearchingVideos ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Search</span>
                  </Button>
                </div>
              </div>
              
              {isSearchingVideos ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Searching for educational videos...</p>
                  <p className="text-sm text-muted-foreground">Finding the most relevant content for your studies</p>
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      <div className="aspect-video relative">
                        <Image 
                          src={video.thumbnail} 
                          alt={video.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                          priority={false}
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between">
                          <h3 className="font-bold line-clamp-2">{video.title}</h3>
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveVideo(video)}
                            >
                              <Bookmark 
                                className={`h-4 w-4 ${video.bookmarked ? 'fill-current' : ''}`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              asChild
                            >
                              <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {video.description}
                        </p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            {video.channelTitle}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'Unknown date'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : videoSearchQuery ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <CircleSlash className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No videos found</p>
                  <p className="text-sm text-muted-foreground">Try searching for different terms</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <Search className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Search for educational videos</p>
                  <p className="text-sm text-muted-foreground">Find videos related to your study materials</p>
                </div>
              )}
              
              {savedVideos.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold mb-4">Saved Videos</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedVideos.map((video) => (
                      <Card key={video.id} className="overflow-hidden">
                        <div className="aspect-video relative">
                          <Image 
                            src={video.thumbnail} 
                            alt={video.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority={false}
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex justify-between">
                            <h3 className="font-bold line-clamp-2">{video.title}</h3>
                            <div className="flex">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleSaveVideo({
                                  id: video.video_id || video.id || '',
                                  title: video.title,
                                  bookmarked: true
                                })}
                              >
                                <Bookmark className="h-4 w-4 fill-current" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                asChild
                              >
                                <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {video.description}
                          </p>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              {video.channelTitle}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {video.published_at ? new Date(video.published_at).toLocaleDateString() : 'Unknown date'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeSection === 'module' ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Module Description</h1>
                <div className="flex space-x-2">
                  {!isEditingModule && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditedModuleContent(module.details?.content || '');
                        setIsEditingModule(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (isEditingModule) {
                        setIsEditingModule(false);
                      } else {
                        setActiveSection('notes');
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> {isEditingModule ? 'Cancel' : 'Close'}
                  </Button>
                </div>
              </div>
              
              {isEditingModule ? (
                <div className="space-y-4">
                  <DraftEditor
                    initialContent={editedModuleContent}
                    onChange={setEditedModuleContent}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleUpdateModuleContent}
                      disabled={isUpdatingModule}
                    >
                      {isUpdatingModule ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Description
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  {module.details && module.details.content ? (
                    <div dangerouslySetInnerHTML={{ __html: module.details.content }} />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">This module has no description yet. Click Edit to add one.</p>
                  )}
                </div>
              )}
            </div>
          ) : activeSection === 'noteFlashcards' ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Flashcards for "{activeNoteFlashcards?.noteTitle}"</h1>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (selectedNote && selectedNote.id === activeNoteFlashcards?.noteId) {
                        handleAIFlashcardsClick();
                      }
                    }}
                    disabled={isGeneratingFlashcards || !selectedNote}
                  >
                    {isGeneratingFlashcards ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" /> Generate AI Cards
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSection('notes')}
                  >
                    <X className="h-4 w-4 mr-1" /> Close
                  </Button>
                </div>
              </div>
              
              {isLoadingNoteFlashcards ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Loading flashcards...</p>
                </div>
              ) : activeNoteFlashcards && activeNoteFlashcards.flashcards && activeNoteFlashcards.flashcards.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Select value={flashcardFilterType} onValueChange={(value) => handleFilterChange(value as 'all' | 'difficult' | 'easy' | 'new' | 'mastered')}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Filter cards" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cards</SelectItem>
                          <SelectItem value="difficult">Difficult</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={flashcardSortType} onValueChange={(value) => handleSortChange(value as 'default' | 'newest' | 'oldest' | 'difficulty')}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Sort cards" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={shuffleDeck}>
                        <Shuffle className="h-4 w-4 mr-1" /> Shuffle
                      </Button>
                      <Button variant="outline" size="sm" onClick={restartDeck}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Restart
                      </Button>
                    </div>
                  </div>
                  
                  <div className="h-[450px] flex flex-col items-center justify-center">
                    {activeNoteFlashcards && activeNoteFlashcards.flashcards && activeNoteFlashcards.flashcards.length > currentFlashcardIndex ? (
                      <>
                        <Flashcard 
                          question={activeNoteFlashcards.flashcards[currentFlashcardIndex].question}
                          answer={activeNoteFlashcards.flashcards[currentFlashcardIndex].answer}
                          onRecallRating={handleRecallRating}
                          currentIndex={currentFlashcardIndex}
                          totalCards={activeNoteFlashcards.flashcards.length}
                          dueDate={activeNoteFlashcards.flashcards[currentFlashcardIndex].due_date}
                        />
                        
                        <div className="flex justify-center space-x-4 mt-6">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              if (activeNoteFlashcards && activeNoteFlashcards.flashcards) {
                                setCurrentFlashcardIndex(prev => 
                                  (prev - 1 + activeNoteFlashcards.flashcards.length) % activeNoteFlashcards.flashcards.length
                                );
                              }
                            }}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              if (activeNoteFlashcards && activeNoteFlashcards.flashcards) {
                                setCurrentFlashcardIndex(prev => 
                                  (prev + 1) % activeNoteFlashcards.flashcards.length
                                );
                              }
                            }}
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
                          if (selectedNote && activeNoteFlashcards) {
                            handleAIFlashcardsClick();
                          }
                        }}
                        disabled={isGeneratingFlashcards || !selectedNote || !activeNoteFlashcards}
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
            </div>
          ) : activeSection === 'practice' ? (
            <PracticeQuestions 
              moduleId={module.id}
              userId={userId}
              isPremiumUser={isPremiumUser}
              selectedNoteId={selectedNote?.id}
              onNavigateToSection={handleActivateStudyTool}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>Select a note or study tool to get started</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Upload PDF Modal */}
      {isPdfModalOpen && (
      <PdfUploadModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        studySessionId={module.id}
        onNotesCreated={handleNotesCreated}
      />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Other dialogs and modals */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              Teachback Feedback
              {teachbackGrade && (
                <Badge className="ml-2" variant={teachbackGrade.grade >= 7 ? "default" : "outline"}>
                  Grade: {teachbackGrade.grade}/10
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {teachbackGrade && (
            <div className="prose dark:prose-invert max-w-none mt-4">
              <div dangerouslySetInnerHTML={{ __html: teachbackGrade.feedback }} />
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button onClick={() => setShowFeedbackModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCreateFlashcardModalOpen} onOpenChange={setIsCreateFlashcardModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Flashcard</DialogTitle>
            <DialogDescription>
              {selectedNote ? 
                `Create a flashcard for "${selectedNote.title}"` : 
                "Create a flashcard for this module"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="question" className="text-sm font-medium">
                Question
              </label>
              <Textarea
                id="question"
                placeholder="Enter the question or front side of the flashcard"
                value={newFlashcardQuestion}
                onChange={(e) => setNewFlashcardQuestion(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="answer" className="text-sm font-medium">
                Answer
              </label>
              <Textarea
                id="answer"
                placeholder="Enter the answer or back side of the flashcard"
                value={newFlashcardAnswer}
                onChange={(e) => setNewFlashcardAnswer(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFlashcardModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFlashcard}
              disabled={isCreatingFlashcard || !newFlashcardQuestion.trim() || !newFlashcardAnswer.trim()}
            >
              {isCreatingFlashcard ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Create Flashcard</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEndOfDeckDialog} onOpenChange={setShowEndOfDeckDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Flashcard Session Complete</DialogTitle>
            <DialogDescription>
              You've gone through all the flashcards. What would you like to do next?
            </DialogDescription>
          </DialogHeader>
          
          {/* End of deck dialog content... */}
        </DialogContent>
      </Dialog>
      
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Upgrade to Premium</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              This feature is only available on Basic and Pro plans. Upgrade to access premium features that help you master your study material faster.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-lg border border-amber-200 dark:border-amber-800/50">
              <h3 className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" /> Premium Features Include:
              </h3>
              <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">•</div>
                  <div>PDF import for easy note creation</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">•</div>
                  <div>AI-generated flashcards from your notes</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">•</div>
                  <div>Formula extraction and organization</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">•</div>
                  <div>More teach-back sessions per month</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">•</div>
                  <div>Enhanced YouTube video search</div>
                </li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} 
                    className="border-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Maybe Later
            </Button>
            <Button onClick={_navigateToUpgrade} className="bg-amber-600 hover:bg-amber-700 text-white">
              View Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Formula Dialog */}
      <Dialog open={isAddFormulaModalOpen} onOpenChange={(open) => {
        setIsAddFormulaModalOpen(open);
        if (!open) {
          setEditingFormula(null);
          setNewFormula({
            formula: '',
            latex: '',
            description: '',
            category: 'General',
            is_block: false
          });
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingFormula ? 'Edit Formula' : 'Add Formula'}</DialogTitle>
            <DialogDescription>
              {editingFormula 
                ? 'Update the details of your formula below.' 
                : 'Add a new formula to your formula sheet.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="latex" className="text-sm font-medium">
                LaTeX Formula
              </label>
              <Input
                id="latex"
                value={newFormula.latex}
                onChange={(e) => setNewFormula({ ...newFormula, latex: e.target.value })}
                placeholder="e.g. E=mc^2"
              />
              <p className="text-xs text-gray-500">
                Enter the formula in LaTeX format without the $ symbols. The system will add them.
              </p>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="preview" className="text-sm font-medium">
                Preview
              </label>
              <div 
                id="preview" 
                className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 min-h-[60px] flex items-center justify-center dark:text-white"
              >
                {newFormula.latex ? (
                  <div dangerouslySetInnerHTML={{
                    __html: renderLatex(newFormula.is_block ? `$$${newFormula.latex}$$` : `$${newFormula.latex}$`)
                  }} />
                ) : (
                  <span className="text-gray-400 italic">Formula preview will appear here</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="displayMode" 
                checked={newFormula.is_block} 
                onCheckedChange={(checked) => 
                  setNewFormula({ ...newFormula, is_block: checked === true })
                }
              />
              <label
                htmlFor="displayMode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Display mode (centered, larger formula)
              </label>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Select
                value={newFormula.category}
                onValueChange={(value) => setNewFormula({ ...newFormula, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select or create a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {formulaCategories
                    .filter(cat => cat !== 'General')
                    .map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                  ))}
                  <SelectItem value="custom">Create new category...</SelectItem>
                </SelectContent>
              </Select>
              {newFormula.category === 'custom' && (
                <Input
                  placeholder="Enter new category name"
                  value=""
                  onChange={(e) => setNewFormula({ ...newFormula, category: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                id="description"
                value={newFormula.description}
                onChange={(e) => setNewFormula({ ...newFormula, description: e.target.value })}
                placeholder="Add an explanation or context for this formula"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleAddFormula}>
              {editingFormula ? 'Update Formula' : 'Add Formula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FormulaStyles />
    </div>
  );
} 