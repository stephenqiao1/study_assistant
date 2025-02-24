'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Edit, Trash, Clock, Tag, ArrowLeft, Plus, Search, Save, X, Trash2, Brain, ScrollText } from 'lucide-react'
import DraftEditor from '@/components/teach/DraftEditor'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useStudyDuration } from '@/hooks/useStudyDuration'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { initializeSpacedRepetition } from '@/utils/spaced-repetition'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface NoteType {
  id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

export default function NotesPage({ params }: PageProps) {
  const { moduleId } = use(params)
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [moduleTitle, setModuleTitle] = useState('')
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [notes, setNotes] = useState<NoteType[]>([])
  const [activeNote, setActiveNote] = useState<NoteType | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredNotes, setFilteredNotes] = useState<NoteType[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isCreatingFlashcard, setIsCreatingFlashcard] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  // Track study duration
  useStudyDuration(studySessionId || '', 'module')

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

        // Fetch existing notes for this module
        const { data: existingNotes, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('study_session_id', studySession.id)
          .order('created_at', { ascending: false })

        // Handle case where notes table doesn't exist yet
        if (notesError) {
          if (notesError.code === '42P01') { // undefined_table
            console.warn('Notes table does not exist yet. This is expected on first run.')
          } else {
            throw notesError
          }
        } else if (existingNotes && existingNotes.length > 0) {
          setNotes(existingNotes)
          setFilteredNotes(existingNotes)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [moduleId, session])

  // Filter notes based on search and tag filters
  useEffect(() => {
    let filtered = [...notes]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query)
      )
    }
    
    // Apply tag filter
    if (activeTag) {
      filtered = filtered.filter(note => 
        note.tags.includes(activeTag)
      )
    }
    
    setFilteredNotes(filtered)
  }, [notes, searchQuery, activeTag])

  const handleCreateNote = () => {
    const newNote: Omit<NoteType, 'id'> = {
      title: 'New Note',
      content: '',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
    setEditTags(newNote.tags)
    setActiveNote(null)
    setIsEditing(true)
  }

  const handleSaveNote = async () => {
    if (!session?.user?.id || !studySessionId) return
    
    const supabase = createClient()
    const now = new Date().toISOString()
    
    try {
      if (activeNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: editTitle,
            content: editContent,
            tags: editTags,
            updated_at: now
          })
          .eq('id', activeNote.id)
        
        if (error) {
          if (error.code === '42P01') { // undefined_table
            console.error('Notes table does not exist. Please run the migration script first.')
            alert('Notes feature is not fully set up. Please contact your administrator.')
            return
          }
          throw error
        }
        
        // Update local state
        setNotes(prev => prev.map(note => 
          note.id === activeNote.id 
            ? { ...note, title: editTitle, content: editContent, tags: editTags, updated_at: now }
            : note
        ))
        
        const updatedNote = { ...activeNote, title: editTitle, content: editContent, tags: editTags, updated_at: now }
        setActiveNote(updatedNote)
      } else {
        // Insert new note
        const { data: newNote, error } = await supabase
          .from('notes')
          .insert({
            study_session_id: studySessionId,
            user_id: session.user.id,
            title: editTitle,
            content: editContent,
            tags: editTags,
            created_at: now,
            updated_at: now
          })
          .select()
          .single()
        
        if (error) {
          if (error.code === '42P01') { // undefined_table
            console.error('Notes table does not exist. Please run the migration script first.')
            alert('Notes feature is not fully set up. Please contact your administrator.')
            return
          }
          throw error
        }
        
        // Update local state
        setNotes(prev => [newNote, ...prev])
        setActiveNote(newNote)
      }
      
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note. Please try again later.')
    }
  }

  const handleDeleteNote = async () => {
    if (!activeNote || !session?.user?.id) return
    
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', activeNote.id)
      
      if (error) {
        if (error.code === '42P01') { // undefined_table
          console.error('Notes table does not exist. Please run the migration script first.')
          alert('Notes feature is not fully set up. Please contact your administrator.')
          return
        }
        throw error
      }
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== activeNote.id))
      setActiveNote(null)
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note. Please try again later.')
    }
  }

  const handleAddTag = () => {
    if (!newTagInput.trim()) return
    if (!editTags.includes(newTagInput.trim())) {
      setEditTags([...editTags, newTagInput.trim()])
    }
    setNewTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove))
  }

  const handleSelectNote = (note: NoteType) => {
    setActiveNote(note)
    setIsEditing(false)
  }

  const handleEditNote = () => {
    if (!activeNote) return
    setEditTitle(activeNote.title)
    setEditContent(activeNote.content)
    setEditTags(activeNote.tags)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (!activeNote) {
      setEditTitle('')
      setEditContent('')
      setEditTags([])
    }
  }

  // Get all unique tags from all notes
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)))

  // Handler to create a flashcard from note content
  const handleCreateFlashcard = async () => {
    if (!studySessionId || !activeNote) return;
    
    // Get selected text or use the whole note
    const textToUse = selectedText || activeNote.content;
    
    if (!textToUse.trim()) {
      toast({
        title: "No content selected",
        description: "Please select text to create a flashcard or use the whole note.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingFlashcard(true);
    
    try {
      // Generate a question-answer pair from the selected content
      const response = await fetch('/api/openai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textToUse,
          prompt: "Create a single flashcard with a question and answer based on this content. Make the question challenging and the answer comprehensive."
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate flashcard');
      
      const data = await response.json();
      if (!data.flashcards || !data.flashcards.length) {
        throw new Error('No flashcards generated');
      }
      
      const flashcard = data.flashcards[0];
      
      // Save the flashcard to the database
      const supabase = createClient();
      const spacedRepParams = initializeSpacedRepetition();
      
      const { error } = await supabase
        .from('flashcards')
        .insert({
          study_session_id: studySessionId,
          question: flashcard.question,
          answer: flashcard.answer,
          status: 'new',
          source_note_id: activeNote.id,
          ...spacedRepParams
        });
      
      if (error) throw error;
      
      toast({
        title: "Flashcard created!",
        description: "Your flashcard has been created successfully.",
      });
      
      // Option to view flashcards
      if (confirm("Flashcard created! Would you like to go to the flashcards page?")) {
        router.push(`/modules/${moduleId}/flashcards`);
      }
    } catch (error) {
      console.error('Error creating flashcard:', error);
      toast({
        title: "Failed to create flashcard",
        description: "An error occurred while creating the flashcard.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingFlashcard(false);
      setSelectedText('');
    }
  };
  
  // Handler to use note content for teach back
  const handleUseForTeachBack = () => {
    if (!activeNote) return;
    
    // Store the note content in localStorage for teach back session
    const textToUse = selectedText || activeNote.content;
    
    if (!textToUse.trim()) {
      toast({
        title: "No content selected",
        description: "Please select text for teach back or use the whole note.",
        variant: "destructive"
      });
      return;
    }
    
    // Save to local storage for retrieval in teach back page
    localStorage.setItem('teachBackContent', textToUse);
    localStorage.setItem('teachBackSource', `Note: ${activeNote.title}`);
    
    // Navigate to teach back page
    router.push(`/modules/${moduleId}/teach`);
  };
  
  // Track text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
    }
  };
  
  // Add event listener for text selection
  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('touchend', handleTextSelection);
    };
  }, []);

  // Show loading state
  if (isLoadingAuth || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/modules/${moduleId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Module
                </Button>
              </Link>
            </div>
            <h2 className="text-sm font-medium text-text-light mb-2">Notes</h2>
            <h1 className="text-3xl font-bold text-text">{moduleTitle}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="space-y-4">
              {/* Search and create */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-light" />
                  <Input 
                    className="pl-9"
                    placeholder="Search notes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>

              {/* Tags filter */}
              <div className="bg-background-card rounded-lg p-4 border border-border">
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge 
                      key={tag}
                      variant={activeTag === tag ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {allTags.length === 0 && (
                    <p className="text-xs text-text-light">No tags yet</p>
                  )}
                </div>
              </div>

              {/* Notes list */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredNotes.length > 0 ? (
                  filteredNotes.map(note => (
                    <Card 
                      key={note.id}
                      className={`p-4 cursor-pointer hover:bg-primary/5 ${
                        activeNote?.id === note.id ? 'border-primary' : ''
                      }`}
                      onClick={() => handleSelectNote(note)}
                    >
                      <h3 className="font-medium mb-1 line-clamp-1">{note.title}</h3>
                      <p className="text-sm text-text-light line-clamp-2">{note.content}</p>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-text-light mt-2">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-text-light py-4">
                    {notes.length > 0 
                      ? 'No notes match your filters' 
                      : 'No notes yet. Create your first note!'}
                  </p>
                )}
              </div>
            </div>

            {/* Main content area */}
            <div className="lg:col-span-2">
              {isEditing ? (
                <div className="bg-background-card rounded-xl shadow-sm border border-border p-6">
                  <div className="mb-4">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Note title"
                      className="text-lg font-medium mb-2"
                    />
                    
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Tag className="h-4 w-4 text-text-light" />
                      {editTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="flex gap-1 items-center">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                      <div className="flex">
                        <Input
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Add tag"
                          className="text-sm w-28"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddTag()
                            }
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleAddTag}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  <DraftEditor
                    initialContent={editContent}
                    onChange={(content) => setEditContent(content)}
                  />

                  <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={handleCancelEdit} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveNote}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : activeNote ? (
                <div className="bg-background-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{activeNote.title}</h2>
                      {activeNote.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {activeNote.tags.map(tag => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-text-light mt-2">
                        Last updated: {new Date(activeNote.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              onClick={handleCreateFlashcard} 
                              variant="outline" 
                              size="sm"
                              disabled={isCreatingFlashcard}
                              className="gap-1"
                            >
                              <ScrollText className="h-4 w-4" />
                              {selectedText ? 'Selection to Flashcard' : 'Create Flashcard'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{selectedText ? 'Create flashcard from selected text' : 'Create flashcard from this note'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              onClick={handleUseForTeachBack} 
                              variant="outline" 
                              size="sm"
                              className="gap-1"
                            >
                              <Brain className="h-4 w-4" />
                              {selectedText ? 'Selection to Teach Back' : 'Use in Teach Back'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{selectedText ? 'Use selected text for teach back' : 'Use this note for teach back'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mb-4">
                    <Button onClick={handleEditNote} variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button 
                      onClick={handleDeleteNote} 
                      variant="outline" 
                      size="sm"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="prose prose-lg max-w-none dark:prose-invert">
                    <DraftEditor
                      initialContent={activeNote.content}
                      readOnly={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-background-card rounded-xl shadow-sm border border-border p-6 flex flex-col items-center justify-center h-[400px] text-center">
                  <p className="text-text-light mb-4">Select a note from the sidebar or create a new one</p>
                  <Button onClick={handleCreateNote}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Note
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
} 