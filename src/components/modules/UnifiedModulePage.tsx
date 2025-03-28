'use client'

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import {
  Layers as _Layers,
  ScrollText,
  Brain,
  Edit2,
  X,
  Trash2,
  FileUp as _FileUp,
  Loader2,
  BookOpen,
  Plus,
  Filter as _Filter,
  BarChart,
  SortAsc as _SortAsc,
  Sparkles,
  FileText,
  Crown as _Crown,
  Trash,
  Video,
  PenLine,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle as _AlertCircle,
  Bell,
  PlusCircle as _PlusCircle,
  Edit as _Edit,
  Settings as _Settings,
  ArrowRight as _ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription as _CardDescription, CardFooter as _CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import Flashcard from '@/components/flashcards/Flashcard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import FormulaStyles from '@/components/modules/FormulaStyles';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { cn as _cn } from "@/lib/utils";
import PracticeQuestions from './PracticeQuestions';
import GradeTracker from '@/components/grades/GradeTracker';
import ReminderList from '@/components/reminders/ReminderList';
import FlashcardsSection from '@/components/flashcards/FlashcardsSection';
import { TeachbackSection } from '@/components/teachback/TeachbackSection'
import { FormulasSection } from '@/components/formulas/FormulasSection'
import { VideosSection } from '@/components/videos/VideosSection'
import { NotesSection } from '@/components/notes/NotesSection'
import { Label } from "@/components/ui/label";
import { StudySession as ImportedStudySession } from '@/types/study';

interface Module {
  id: string;
  user_id?: string;  // Make user_id optional
  module_title: string;
  started_at: string;
  ended_at?: string;
  details: {
    description?: string;
    content?: string;
    [key: string]: unknown;
  };
}

interface NoteType {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  images?: NoteImageType[];
}

interface NoteImageType {
  url: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
}

interface UnifiedModulePageProps {
  module: Module;
  _allSessions: ImportedStudySession[];
  notes: NoteType[];
  isPremiumUser: boolean;
  userId: string;
  onSectionChange?: (section: string) => void;
  onEditModeChange?: (isEditing: boolean) => void;
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
  source_note_id: string;
  status: 'new' | 'learning' | 'known';
  last_recall_rating?: 'easy' | 'good' | 'hard' | 'forgot';
  next_review_at?: string;
  created_at: string;
  last_reviewed_at?: string;
  repetitions?: number;
  last_reviewed?: string;
  difficulty?: number;
  updated_at?: string;
  module_id?: string;
  user_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  due_date?: string;
  ease_factor?: number;
  review_interval?: number;
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

// Add interface for note flashcards
interface NoteFlashcard {
  id: string;
  question: string;
  answer: string;
  source_note_id: string;
  status: 'new' | 'learning' | 'known';
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
  next_review_at?: string;
  ease_factor?: number;
  review_interval?: number;
}

type _NoteFlashcards = {
  id: string;
  note_id: string;
  flashcards: NoteFlashcard[];
};

export default function UnifiedModulePage({ 
  module: initialModule,
  _allSessions,
  notes: initialNotes,
  isPremiumUser,
  userId,
  onSectionChange,
  onEditModeChange
}: UnifiedModulePageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  // State for module editing
  const [studySession, setStudySession] = useState<Module | null>(initialModule);
  const moduleId = studySession?.id;
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [moduleFormData, setModuleFormData] = useState({
    title: initialModule.module_title || '',
    description: initialModule.details?.description || ''
  });
  
  // State variables
  const [notes, setNotes] = useState<NoteType[]>(initialNotes || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(notes.length > 0 ? notes[0] : null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(selectedNote?.content || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'notes' | 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos' | 'practice' | 'noteFlashcards' | 'grades' | 'reminders'>('notes');
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
  const [_flashcardCount, setFlashcardCount] = useState(0);
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
  const [_showFlashcardStats, _setShowFlashcardStats] = useState(false);
  const [_showKeyboardShortcuts, _setShowKeyboardShortcuts] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Add state for AI flashcard generation
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [_generatedFlashcardsCount, _setGeneratedFlashcardsCount] = useState(0);
  const [_showGeneratedSuccess, _setShowGeneratedSuccess] = useState(false);
  
  // Add state for video finder functionality
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isSearchingVideos, setIsSearchingVideos] = useState(false);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);

  // Add state for formulas functionality
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
  const [formulaCategories, setFormulaCategories] = useState<string[]>([]);
  const [formulasByCategory, setFormulasByCategory] = useState<Record<string, Formula[]>>({});
  const [_activeFormulaTab, _setActiveFormulaTab] = useState<'categorized' | 'all'>('all');

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
  const [_isLoadingNoteFlashcards, _setIsLoadingNoteFlashcards] = useState(false);

  const [_uploadedImages, setUploadedImages] = useState<NoteImageType[]>([]);

  // State for sidebar minimization
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  // Add these handler functions after the state declarations, around line 265-270
  // Handler functions for edit mode that notify parent component
  const setEditModeWithNotify = (value: boolean) => {
    setEditMode(value);
    onEditModeChange?.(value);
  };

  // Handle note selection
  const handleNoteSelect = (note: NoteType) => {
    setSelectedNote(note);
    setEditedContent(note.content);
    setEditModeWithNotify(false);
    setActiveSection('notes'); // Add this line to switch to notes section
  };

  // Handle note creation
  const handleCreateNote = () => {
    const newNote: NoteType = {
      id: `temp-${Date.now()}`,
      title: 'New Note',
      content: '',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      images: []
    };
    setNotes([...notes, newNote]);
    setSelectedNote(newNote);
    setEditedContent('');
    setEditModeWithNotify(true);
    setActiveSection('notes'); // Switch to notes section
    if (onSectionChange) {
      onSectionChange('notes');
    }
  };

  // Handle note deletion
  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
      
      const updatedNotes = notes.filter(note => note.id !== selectedNote.id);
      setNotes(updatedNotes);
      
      // Close the delete confirmation dialog
      setIsDeleteDialogOpen(false);
      
      if (updatedNotes.length > 0) {
        setSelectedNote(updatedNotes[0]);
        setEditedContent(updatedNotes[0].content);
      } else {
        setSelectedNote(null);
        setEditedContent('');
      }
      
      // Switch back to notes section
      setActiveSection('notes');
      
      toast({
        title: "Success",
        description: "Note deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Ensure the dialog is closed even if there's an error
      setIsDeleteDialogOpen(false);
    }
  };

  // Handle note save
  const handleSaveNote = async () => {
    if (!selectedNote || !editedContent.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Check if this is a temporary note that needs to be created
      const isNewNote = selectedNote.id.startsWith('temp-');
      
      let response;
      
      if (isNewNote) {
        // Create a new note with a POST request
        response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: selectedNote.title,
            content: editedContent.trim(),
            tags: selectedNote.tags,
            study_session_id: module.id // Add module ID as study_session_id
          }),
        });
      } else {
        // Update an existing note with a PUT request
        response = await fetch(`/api/notes/${selectedNote.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: editedContent.trim(),
          }),
        });
      }
      
      if (!response.ok) {
        throw new Error(isNewNote ? 'Failed to create note' : 'Failed to update note');
      }
      
      const updatedNote = await response.json();
      
      // Replace temp note with real note in the notes array if it's a new note
      // Or update the existing note if it's an update
      const updatedNotes = isNewNote 
        ? notes.map(note => note.id === selectedNote.id ? updatedNote : note)
        : notes.map(note => note.id === selectedNote.id ? updatedNote : note);
      
      setNotes(updatedNotes);
      setSelectedNote(updatedNote);
      setEditModeWithNotify(false);
      toast({
        title: "Success",
        description: isNewNote ? "Note created successfully!" : "Note saved successfully!",
      });
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle note cancel
  const handleCancelEdit = () => {
    if (selectedNote) {
      setEditedContent(selectedNote.content);
    }
    setEditModeWithNotify(false);
  };

  // Handle tag addition
  const handleAddTag = async () => {
    if (!selectedNote || !tagInput.trim()) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notes/${selectedNote.id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag: tagInput.trim(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add tag');
      }
      
      const updatedNote = await response.json();
      const updatedNotes = notes.map(note => 
        note.id === selectedNote.id ? updatedNote : note
      );
      
      setNotes(updatedNotes);
      setSelectedNote(updatedNote);
      setTagInput('');
      toast({
        title: "Success",
        description: "Tag added successfully!",
      });
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Error",
        description: "Failed to add tag. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tag deletion
  const handleDeleteTag = async (tagToDelete: string) => {
    if (!selectedNote) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/notes/${selectedNote.id}/tags/${encodeURIComponent(tagToDelete)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }
      
      const updatedNote = await response.json();
      const updatedNotes = notes.map(note => 
        note.id === selectedNote.id ? updatedNote : note
      );
      
      setNotes(updatedNotes);
      setSelectedNote(updatedNote);
      toast({
        title: "Success",
        description: "Tag deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterByTag = (tag: string | null) => {
    setSelectedTag(tag === selectedTag ? null : tag);
  };

  // Update handleActivateStudyTool to accept an optional noteId parameter
  const handleActivateStudyTool = (tool: 'teachback' | 'flashcards' | 'module' | 'formulas' | 'videos' | 'practice' | 'notes' | 'grades' | 'noteFlashcards' | 'reminders', noteId?: string) => {
    if (!studySession) {
      toast({
        title: "Error",
        description: "No active study session found",
        variant: "destructive"
      });
      return;
    }

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

    // Handle module editing
    if (tool === 'module') {
      // Initialize form data with current module details
      setModuleFormData({
        title: studySession.module_title || '',
        description: studySession.details?.description || ''
      });
      setIsModuleDialogOpen(true);
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

    // If it's videos and a noteId is provided, search for videos
    if (tool === 'videos' && noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        generateSearchFromNote(note);
      }
    }
  };

  const renderLatex = (content: string) => {
    if (!content) return '';
    
    // First convert markdown to HTML (including images)
    let html = '';
    try {
      // Use a simple regex to handle image markdown
      html = content.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-md my-2" />');
    } catch (err: unknown) {
      console.error('Markdown parsing error:', err);
      html = content;
    }
    
    // Regular expression to find LaTeX expressions between $$ or $ symbols
    const latexRegex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
    
    return html.replace(latexRegex, (match, group1, group2) => {
      const formula = group1 || group2; // group1 for $$, group2 for $
      const displayMode = !!group1; // true for $$, false for $
      
      try {
        const renderedLatex = renderToString(formula, {
          displayMode: displayMode,
          throwOnError: false
        });
        
        // Wrap the rendered LaTeX in a div with a class for dark mode styling
        return `<div class="katex-wrapper dark:text-white">${renderedLatex}</div>`;
      } catch (err: unknown) {
        console.error('LaTeX rendering error:', err);
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
    if (!studySession?.id || !userId) return;
    
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
        .eq('study_session_id', studySession.id)
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
    if (!studySession?.id || !userId) return;
    
    try {
      const { count, error } = await supabase
        .from('teach_backs')
        .select('*', { count: 'exact', head: true })
        .eq('study_session_id', studySession.id)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      setTeachbackCount(count || 0);
    } catch (error) {
      console.error('Error fetching teachback count:', error);
    }
  };

  // New function to fetch flashcard count
  const fetchFlashcardCount = async () => {
    if (!studySession?.id || !userId) return;
    
    try {
      const { count, error } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('study_session_id', studySession.id)
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
    if (!newFlashcardQuestion.trim() || !newFlashcardAnswer.trim() || !studySession) {
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
          study_session_id: studySession.id,
          module_title: studySession.module_title,
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
  const _restartDeck = () => {
    setCurrentFlashcardIndex(0);
    setShowEndOfDeckDialog(false);
  };

  // New function to shuffle the flashcard deck
  const _shuffleDeck = () => {
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
  const _handleFilterChange = (value: 'all' | 'difficult' | 'easy' | 'new' | 'mastered') => {
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
  const _handleSortChange = (value: 'default' | 'newest' | 'oldest' | 'difficulty') => {
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
  const handleAIFlashcardsClick = async () => {
    if (!selectedNote || !studySession) {
      toast({
        title: "Error",
        description: "Please select a note first",
        variant: "destructive",
      });
      return;
    }

    const requestBody = {
      moduleId: studySession.id,
      moduleTitle: studySession.module_title,
      content: selectedNote.content,
      noteId: selectedNote.id
    };

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('API error response:', error);
        throw new Error(error.error || 'Failed to generate flashcards');
      }

      const data = await response.json();

      // Add the new flashcards to the existing ones
      setFlashcards(prev => {
        return [...prev, ...data.flashcards];
      });
      
      // Show success message
      toast({
        title: "Success",
        description: `Generated ${data.flashcards.length} new flashcards`,
      });

      // Switch to flashcards view
      handleActivateStudyTool('flashcards');
    } catch (err) {
      console.error('Error in handleAIFlashcardsClick:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate flashcards",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add function to handle upgrade navigation
  const _navigateToUpgrade = () => {
    router.push('/pricing');
  };
  
  // Add function to generate AI flashcards
  const _generateAIFlashcards = async () => {
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

    if (!studySession) {
      toast({
        title: "Error",
        description: "No study session found.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingFlashcards(true);
    
    try {
      const requestBody = {
        moduleId: studySession.id,
        moduleTitle: studySession.module_title,
        content: selectedNote.content,
        noteId: selectedNote.id
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
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }
      
      const data = await response.json();
      
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
  const _handleUpdateModuleContent = async () => {
    if (!studySession || !studySession.id) return;
    
    _setIsUpdatingModule(true);
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          details: {
            ...studySession.details,
            content: _editedModuleContent
          }
        })
        .eq('id', studySession.id);

      if (error) throw error;

      // Update local state
      setStudySession(prev => prev ? {
        ...prev,
        details: {
          ...prev.details,
          content: _editedModuleContent
        }
      } : null);
      
      _setIsEditingModule(false);
      
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
      _setIsUpdatingModule(false);
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
    if (!studySession?.id || !userId) return;
    
    setIsLoadingFormulas(true);
    try {
      const { data, error } = await supabase
        .from('formulas')
        .select('*')
        .eq('study_session_id', studySession.id)
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
    if (!hasFormulaAccess() || !studySession) {
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
          study_session_id: studySession.id, 
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
          description: `No mathematical formulas were detected in ${sourceDescription}. Try adding equations using LaTeX syntax ($...$).`,
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
    if (!studySession?.id) {
      console.error('No study session found');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('content')
        .eq('study_session_id', studySession.id);
      
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
    if (!newFormula.formula || !newFormula.latex || !studySession) {
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
            study_session_id: studySession.id,
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
    if (!userId || !studySession?.id) return;
    
    try {
      // Check if this video is already saved
      const { data: existingVideos, error: checkError } = await supabase
        .from('saved_videos')
        .select('*')
        .eq('video_id', video.id)
        .eq('user_id', userId)
        .eq('study_session_id', studySession.id);
        
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
            description: video.description || '',
            thumbnail: video.thumbnail || '',
            channel: video.channel || video.channelTitle || '',
            published_at: video.publishedAt || video.published_at || null,
            video_url: video.videoUrl || video.video_url || '',
            study_session_id: studySession.id,
            user_id: userId,
            note_id: selectedNote?.id || null,
            module_title: studySession.module_title
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
  
  const fetchSavedVideos = useCallback(async () => {
    if (!userId || !studySession?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_videos')
        .select('*')
        .eq('user_id', userId)
        .eq('study_session_id', studySession.id);
        
      if (error) throw error;
      
      setSavedVideos(data || []);
    } catch (error) {
      console.error('Error fetching saved videos:', error);
    }
  }, [userId, studySession?.id, supabase]); // Added supabase to dependencies

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
  const _handleNoteFlashcardsClick = async (note: NoteType) => {
    if (!studySession?.id) {
      toast({
        title: "Error",
        description: "No study session found. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // First, set loading state and clear previous flashcards
    _setIsLoadingNoteFlashcards(true);
    
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
        .eq('study_session_id', studySession.id)
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

      // Convert the data to Flashcard type
      const typedFlashcards: Flashcard[] = (data || []).map(card => ({
        id: card.id,
        question: card.question,
        answer: card.answer,
        source_note_id: card.source_note_id || note.id,
        status: card.status || 'new',
        last_recall_rating: card.last_recall_rating,
        next_review_at: card.next_review_at,
        created_at: card.created_at,
        last_reviewed_at: card.last_reviewed_at,
        repetitions: card.repetitions,
        last_reviewed: card.last_reviewed,
        difficulty: card.difficulty,
        updated_at: card.updated_at,
        module_id: card.module_id,
        user_id: card.user_id,
        tags: card.tags,
        metadata: card.metadata,
        due_date: card.due_date,
        ease_factor: card.ease_factor,
        review_interval: card.review_interval
      }));

      // Update state with fetched flashcards
      setActiveNoteFlashcards({
        noteId: note.id,
        noteTitle: note.title,
        flashcards: typedFlashcards
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
      _setIsLoadingNoteFlashcards(false);
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

  const handleImageUpload = (imageData: { url: string; name: string; size: number; type: string }) => {
    const newImage: NoteImageType = {
      url: imageData.url,
      name: imageData.name,
      size: imageData.size,
      type: imageData.type,
      created_at: new Date().toISOString()
    };
    
    setUploadedImages(prev => [...prev, newImage]);
  };

  useEffect(() => {
    onSectionChange?.(activeSection);
  }, [activeSection, onSectionChange]);

  // Add these handler functions somewhere in the component, near other state handlers

  // Helper functions for edit mode
  const handleNoteCardEdit = (e: React.MouseEvent, note: NoteType) => {
    e.stopPropagation();
    setSelectedNote(note);
    setEditMode(true);
    if (onEditModeChange) {
      onEditModeChange(true);
    }
    setEditedContent(note.content);
  };

  // Add the handler for updating module details
  const handleUpdateModule = async () => {
    if (!moduleId) return;

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('study_sessions')
        .update({
          module_title: moduleFormData.title,
          details: {
            ...studySession?.details,
            description: moduleFormData.description
          }
        })
        .eq('id', moduleId);

      if (error) throw error;

      // Update local state
      setStudySession(prev => prev ? {
        ...prev,
        module_title: moduleFormData.title,
        details: {
          ...prev.details,
          description: moduleFormData.description
        }
      } : null);

      toast({
        title: "Success",
        description: "Module details updated successfully",
      });

      setIsModuleDialogOpen(false);
    } catch (error) {
      console.error('Error updating module:', error);
      toast({
        title: "Error",
        description: "Failed to update module details",
        variant: "destructive"
      });
    }
  };

  // Add these state variables
  const [_isUpdatingModule, _setIsUpdatingModule] = useState(false);
  const [_isEditingModule, _setIsEditingModule] = useState(false);
  const [_editedModuleContent, _setEditedModuleContent] = useState('');

  return (
    <div className="flex flex-col min-h-screen" suppressHydrationWarning>
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Sidebar with note cards */}
        <div 
          className={`${isSidebarMinimized ? 'w-16' : 'w-1/4'} border-r border-border bg-card/50 backdrop-blur-sm p-4 flex flex-col h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out relative`} 
          suppressHydrationWarning
        >
          {/* Toggle button for sidebar */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-4 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            title={isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
          >
            {isSidebarMinimized ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
          </Button>

          {!isSidebarMinimized && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {studySession?.module_title || 'Untitled Module'}
                </h2>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleActivateStudyTool('module')}
              suppressHydrationWarning
                  className="px-2 py-1 h-8 text-xs hover:bg-accent/10 transition-colors"
            >
              <BookOpen className="h-3 w-3 mr-1" /> Module
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => handleActivateStudyTool('formulas')}
              suppressHydrationWarning
                  className="px-2 py-1 h-8 text-xs hover:bg-accent/10 transition-colors"
            >
              <FileText className="h-3 w-3 mr-1" /> Formula
            </Button>
            <Button 
              size="sm"
              variant="outline"
                  onClick={() => handleActivateStudyTool('practice')}
              suppressHydrationWarning
                  className="px-2 py-1 h-8 text-xs hover:bg-accent/10 transition-colors"
                >
                  <PenLine className="h-3 w-3 mr-1" /> Practice
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => handleActivateStudyTool('grades')}
                  suppressHydrationWarning
                  className="px-2 py-1 h-8 text-xs hover:bg-accent/10 transition-colors"
                >
                  <BarChart className="h-3 w-3 mr-1" /> Grades
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handlePdfImportClick}
                  title="Import notes from PDF or image"
                  suppressHydrationWarning
                  className="px-2 py-1 h-8 text-xs hover:bg-accent/10 transition-colors"
                >
                  <FileText className="h-3 w-3 mr-1" /> Import Document
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleActivateStudyTool('reminders')}
              suppressHydrationWarning
                  className="px-2 py-1 h-8 text-xs hover:bg-accent/10 transition-colors"
            >
              <Bell className="h-3 w-3 mr-1" /> Reminders
            </Button>
                <Button 
                  size="sm"
              onClick={handleCreateNote} 
                  suppressHydrationWarning
                  className="px-2 py-1 h-8 text-xs hover:bg-accent/10 transition-colors"
                >
              <Plus className="h-3 w-3 mr-1" /> New
            </Button>
          </div>
          
              {/* Tag filters */}
          {notes.length > 0 && (
            <div className="mb-4">
              <Select
                value={selectedTag || "all_tags"}
                onValueChange={(value) => handleFilterByTag(value === "all_tags" ? null : value)}
              >
                    <SelectTrigger className="w-full bg-background/50 border-border/50" suppressHydrationWarning>
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
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {filteredNotes.length > 0 ? (
              filteredNotes.map(note => (
                <Card 
                  key={note.id} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                        selectedNote?.id === note.id 
                          ? 'border-primary/50 bg-primary/5 shadow-md ring-1 ring-primary/20' 
                          : 'border-border/50 hover:border-border bg-card/50 backdrop-blur-sm'
                      }`}
                  onClick={() => handleNoteSelect(note)}
                >
                  <CardContent className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-medium text-foreground/90 line-clamp-1">{note.title}</h3>
                            <div className="flex flex-wrap justify-end gap-1 max-w-[40%]">
                              {note.tags.map(tag => (
                                <span 
                                  key={tag} 
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFilterByTag(tag);
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                            {stripLatex(note.content)}
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-border/30">
                            <div className="flex flex-wrap gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                                className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                                  setSelectedNote(note);
                                  handleActivateStudyTool('flashcards', note.id);
                          }}
                        >
                                <Brain className="h-3 w-3 mr-1" />
                                <span className="whitespace-nowrap">Flashcards</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                                className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                                  setSelectedNote(note);
                                  handleActivateStudyTool('teachback', note.id);
                          }}
                        >
                                <ScrollText className="h-3 w-3 mr-1" />
                                <span className="whitespace-nowrap">Teach</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                                className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                                  setSelectedNote(note);
                                  handleActivateStudyTool('videos', note.id);
                          }}
                        >
                                <Video className="h-3 w-3 mr-1" />
                                <span className="whitespace-nowrap">Videos</span>
                        </Button>
                      </div>
                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(note.updated_at).toLocaleDateString()}
                              </span>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNote(note);
                                    handleNoteCardEdit(e, note);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNote(note);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                    </div>
                      </div>
                          </div>
                        </div>
                  </CardContent>
                </Card>
              ))
            ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedTag ? 'No notes with this tag' : 'No notes yet'}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Minimized sidebar view */}
          {isSidebarMinimized && (
            <div className="flex flex-col items-center space-y-4 mt-8">
                <Button 
                size="icon" 
                variant="ghost"
                onClick={() => handleActivateStudyTool('module')}
                title="Module"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <BookOpen className="h-5 w-5" />
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                onClick={() => handleActivateStudyTool('formulas')}
                title="Formulas"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <FileText className="h-5 w-5" />
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                onClick={() => handleActivateStudyTool('practice')}
                title="Practice"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <PenLine className="h-5 w-5" />
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                onClick={() => handleActivateStudyTool('grades')}
                title="Grades"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <BarChart className="h-5 w-5" />
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                onClick={handlePdfImportClick}
                title="Import Document"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Upload className="h-5 w-5" />
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                  onClick={handleCreateNote}
                title="New Note"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Plus className="h-5 w-5" />
              </Button>
              
              <div className="border-t border-border/50 w-8 my-2"></div>
              
              {filteredNotes.length > 0 && (
                <div className="flex flex-col items-center space-y-2 overflow-y-auto max-h-[50vh]">
                  {filteredNotes.slice(0, 5).map(note => (
                    <div key={note.id} className="relative group">
                      <Button
                        size="icon"
                        variant={selectedNote?.id === note.id ? "default" : "ghost"}
                        onClick={() => handleNoteSelect(note)}
                        title={note.title}
                        className={`relative transition-all ${
                          selectedNote?.id === note.id 
                            ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                            : 'hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                        {note.tags.length > 0 && (
                          <span className="absolute top-0 right-0 h-2 w-2 bg-primary rounded-full"></span>
                        )}
                      </Button>
                      <div className="absolute left-full ml-2 bg-card rounded-lg shadow-lg p-2 invisible group-hover:visible flex flex-col gap-1 z-50 border border-border/50 backdrop-blur-sm">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNote(note);
                            handleActivateStudyTool('flashcards', note.id);
                          }}
                          title="Flashcards"
                          className="hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Brain className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNote(note);
                            handleActivateStudyTool('teachback', note.id);
                          }}
                          title="Teach"
                          className="hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <ScrollText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNote(note);
                            handleActivateStudyTool('videos', note.id);
                          }}
                          title="Videos"
                          className="hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Video className="h-4 w-4" />
                </Button>
              </div>
                    </div>
                  ))}
                  {filteredNotes.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{filteredNotes.length - 5} more</span>
            )}
          </div>
              )}
            </div>
          )}
        </div>
        
        {/* Main content area */}
        <div 
          className={`${isSidebarMinimized ? 'w-[calc(100%-4rem)]' : 'w-3/4'} overflow-auto transition-all duration-300 ease-in-out`}
          suppressHydrationWarning
        >
          {selectedNote && activeSection === 'notes' ? (
            <NotesSection
              selectedNote={selectedNote}
              editMode={editMode}
              tagInput={tagInput}
              editedContent={editedContent}
              setTagInput={setTagInput}
              setEditModeWithNotify={setEditModeWithNotify}
              setShowDeleteConfirm={setShowDeleteConfirm}
              handleCancelEdit={handleCancelEdit}
              handleSaveNote={handleSaveNote}
              handleDeleteTag={handleDeleteTag}
              handleAddTag={handleAddTag}
              setEditedContent={setEditedContent}
              handleImageUpload={handleImageUpload}
                    supabase={supabase}
                  />
          ) : activeSection === 'teachback' ? (
            <TeachbackSection
              selectedNote={selectedNote}
              teachbackCount={teachbackCount}
              teachbackLimit={teachbackLimit}
              isPremiumUser={isPremiumUser}
              setActiveSection={setActiveSection}
              teachbackText={teachbackText}
              setTeachbackText={setTeachbackText}
              isGrading={isGrading}
              gradeTeachback={gradeTeachback}
              renderLatex={renderLatex}
            />
          ) : activeSection === 'flashcards' ? (
            <FlashcardsSection
              flashcards={flashcards}
              selectedNote={selectedNote}
              filterFlashcardsByNoteId={filterFlashcardsByNoteId}
              setFilterFlashcardsByNoteId={setFilterFlashcardsByNoteId}
              fetchFlashcards={fetchFlashcards}
              isLoadingFlashcards={isLoadingFlashcards}
              isGeneratingFlashcards={isGeneratingFlashcards}
              handleAIFlashcardsClick={handleAIFlashcardsClick}
              handleCreateFlashcardClick={handleCreateFlashcardClick}
              setActiveSection={setActiveSection}
              isPremiumUser={isPremiumUser}
              setShowUpgradeDialog={setShowUpgradeDialog}
              setIsCreateFlashcardModalOpen={setIsCreateFlashcardModalOpen}
              activeNoteFlashcards={activeNoteFlashcards}
            />
          ) : activeSection === 'formulas' ? (
            <FormulasSection
              formulas={formulas}
              isLoadingFormulas={isLoadingFormulas}
              setActiveSection={setActiveSection}
              handleGenerateFormulas={handleGenerateFormulas}
              handleDeleteFormula={handleDeleteFormula}
              setIsAddFormulaModalOpen={setIsAddFormulaModalOpen}
              setEditingFormula={setEditingFormula}
              setNewFormula={setNewFormula}
              renderLatex={renderLatex}
            />
          ) : activeSection === 'videos' ? (
            <VideosSection
              videos={videos}
              savedVideos={savedVideos}
              selectedNote={selectedNote}
              isSearchingVideos={isSearchingVideos}
              videoSearchQuery={videoSearchQuery}
              setVideoSearchQuery={setVideoSearchQuery}
              setActiveSection={setActiveSection}
              handleSearchVideos={handleSearchVideos}
              generateSearchFromNote={generateSearchFromNote}
              handleSaveVideo={handleSaveVideo}
            />
          ) : activeSection === 'practice' && studySession ? (
            <PracticeQuestions 
              moduleId={studySession.id}
              userId={userId}
              isPremiumUser={isPremiumUser}
              selectedNoteId={selectedNote?.id}
              onNavigateToSection={handleActivateStudyTool}
            />
          ) : activeSection === 'grades' && studySession ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Grade Tracker</h1>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSection('notes')}
                  >
                    <X className="h-4 w-4 mr-1" /> Close
                  </Button>
                </div>
              </div>
              
              <GradeTracker 
                studySessionId={studySession.id}
                _userId={userId}
              />
            </div>
          ) : activeSection === 'reminders' && studySession ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Reminders</h1>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSection('notes')}
                  >
                    <X className="h-4 w-4 mr-1" /> Close
                  </Button>
                </div>
              </div>
              
              <ReminderList moduleId={studySession.id} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>Select a note or study tool to get started</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Upload PDF Modal */}
      {isPdfModalOpen && studySession && (
      <PdfUploadModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
          studySessionId={studySession.id}
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
      {/* Delete Note Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteNote}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Edit Dialog */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Study Module</DialogTitle>
            <DialogDescription>
              Update your study module's title and description.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="module-title">Title</Label>
              <Input
                id="module-title"
                value={moduleFormData.title}
                onChange={(e) => setModuleFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter module title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="module-description">Description</Label>
              <Textarea
                id="module-description"
                value={moduleFormData.description}
                onChange={(e) => setModuleFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter module description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateModule}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}